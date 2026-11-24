const API = 'https://api.github.com'
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
  'User-Agent': 'StatVitra/1.0'
}
const day = 24 * 60 * 60 * 1000
const codeOrder = (a, b) => a < b ? -1 : a > b ? 1 : 0
const pathPart = encodeURIComponent

function nextPage(link) {
  for (const piece of (link ?? '').split(',')) {
    const match = piece.match(/<([^>]+)>;\s*rel="next"/)
    if (!match) continue
    const url = new URL(match[1])
    if (url.origin !== API || url.username || url.password) throw new Error('Invalid GitHub pagination URL.')
    return url
  }
  return null
}

function githubClient(token, fetcher) {
  const requestHeaders = token ? { ...headers, Authorization: `Bearer ${token}` } : headers
  async function get(path, missingAllowed = false) {
    const url = new URL(path, API)
    let response
    try {
      response = await fetcher(url, { headers: requestHeaders, redirect: 'error', signal: AbortSignal.timeout(15_000) })
    } catch {
      throw new Error('Could not reach the GitHub API. Try again later.')
    }
    if (missingAllowed && response.status === 404) return { data: null, next: null }
    if (!response.ok) {
      if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0' ||
          response.headers.has('retry-after')) {
        throw new Error('GitHub API rate limit reached. Wait for the limit to reset and rerun.')
      }
      const hint = response.status === 401 || response.status === 403 ? ' Check token permissions.' : ''
      throw new Error(`GitHub REST API returned HTTP ${response.status}.${hint}`)
    }
    return { data: await response.json(), next: nextPage(response.headers.get('link')) }
  }

  async function list(path, maxPages = Infinity) {
    const data = []
    let next = path
    const visited = new Set()
    while (next && visited.size < maxPages) {
      const url = new URL(next, API).href
      if (visited.has(url)) throw new Error('GitHub returned a repeated pagination URL.')
      visited.add(url)
      const page = await get(url)
      if (!Array.isArray(page.data)) throw new Error('GitHub returned an unexpected list response.')
      data.push(...page.data)
      next = page.next
    }
    return { data, more: Boolean(next) }
  }
  return { get, list }
}

function selectRepositories(raw, config) {
  const excluded = new Set(config.excludeRepositories.map(name => name.toLowerCase()))
  return [...new Map(raw.filter(repo => repo.private === false &&
    repo.owner?.login?.toLowerCase() === config.username.toLowerCase() &&
    (config.includeForks || !repo.fork) && (config.includeArchived || !repo.archived) &&
    !excluded.has(repo.name.toLowerCase()) && !excluded.has(repo.full_name.toLowerCase()))
    .map(repo => [repo.id, repo])).values()]
}

export async function collect(config, { token, fetcher = globalThis.fetch } = {}) {
  const client = githubClient(token, fetcher)
  const login = pathPart(config.username)
  const { data: profile } = await client.get(`/users/${login}`)
  if (profile.type !== 'User') throw new Error('StatVitra requires a personal GitHub profile.')
  const snapshot = { login: profile.login }
  if (config.cards.some(card => card !== 'activity')) {
    const { data } = await client.list(`/users/${login}/repos?type=owner&sort=full_name&per_page=100`)
    const repos = selectRepositories(data, config)
    if (config.cards.includes('overview')) {
      snapshot.overview = {
        repos: repos.length,
        stars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
        forks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
        followers: profile.followers
      }
    }

    if (config.cards.includes('languages')) {
      const excluded = new Set(config.excludeLanguages.map(name => name.toLowerCase()))
      const selected = [...repos].sort((a, b) =>
        codeOrder(b.pushed_at ?? '', a.pushed_at ?? '') || codeOrder(a.full_name, b.full_name))
        .slice(0, config.languageRepositoryLimit)
      const bytes = new Map()
      let scanned = 0
      for (const repo of selected) {
        const { data: breakdown } = await client.get(`/repos/${pathPart(repo.owner.login)}/${pathPart(repo.name)}/languages`, true)
        if (!breakdown) continue
        scanned += 1
        for (const [name, size] of Object.entries(breakdown)) {
          if (!excluded.has(name.toLowerCase()) && Number.isFinite(size) && size > 0) {
            bytes.set(name, (bytes.get(name) ?? 0) + size)
          }
        }
      }
      snapshot.languages = { scanned, eligible: repos.length,
        rows: [...bytes].sort(([a, left], [b, right]) => right - left || codeOrder(a, b)) }
    }

    if (config.cards.includes('projects')) {
      snapshot.projects = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count ||
        b.forks_count - a.forks_count || codeOrder(b.pushed_at ?? '', a.pushed_at ?? '') ||
        codeOrder(a.full_name, b.full_name)).slice(0, config.projectCount).map(repo => ({
        name: repo.name, language: repo.language, stars: repo.stargazers_count, forks: repo.forks_count
      }))
    }
  }

  if (config.cards.includes('activity')) {
    const { data, more } = await client.list(`/users/${login}/events/public?per_page=100`, 3)
    const events = [...new Map(data.filter(event => event.public === true).map(event => [event.id, event])).values()]
    const now = Date.now()
    const start = Math.floor(now / day) * day - 29 * day
    const days = Array(30).fill(0)
    for (const event of events) {
      const time = Date.parse(event.created_at)
      const index = Math.floor((time - start) / day)
      if (index >= 0 && index < days.length && time <= now) days[index] += 1
    }
    snapshot.activity = { days, limited: more || data.length >= 300 }
  }
  return snapshot
}
