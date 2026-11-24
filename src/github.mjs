import { collectContributions } from './contributions.mjs'
import { collectCoding, collectGists, collectInsights, contributedRepositories, excludes, featuredProjects } from './extras.mjs'

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
  async function get(path, allowed = [], body) {
    const url = new URL(path, API)
    let response
    try {
      const options = { headers: requestHeaders, redirect: 'error', signal: AbortSignal.timeout(15_000) }
      if (body) Object.assign(options, { method: 'POST', body: JSON.stringify(body),
        headers: { ...requestHeaders, 'Content-Type': 'application/json' } })
      response = await fetcher(url, options)
    } catch {
      throw new Error('Could not reach the GitHub API. Try again later.')
    }
    if (!response.ok) {
      if (response.status === 429 || response.headers.get('x-ratelimit-remaining') === '0' ||
          response.headers.has('retry-after')) {
        throw new Error('GitHub API rate limit reached. Wait for the limit to reset and rerun.')
      }
      if (allowed.includes(response.status)) return { data: null, next: null }
      const hint = response.status === 401 || response.status === 403 ? ' Check token permissions.' : ''
      const endpoint = url.pathname === '/graphql' || url.pathname.startsWith('/search/') ? ` at ${url.pathname}` : ''
      throw new Error(`GitHub API returned HTTP ${response.status}${endpoint}.${hint}`)
    }
    if (allowed.includes(response.status)) return { data: null, next: null }
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
  async function graphql(query, variables) {
    if (!token) throw new Error('This selection needs a GitHub token for GraphQL.')
    const { data: result } = await get('/graphql', [], { query, variables })
    if (!result?.data || result.errors?.length) {
      throw new Error('GitHub GraphQL could not load the selected data. Check token access or try again.')
    }
    return result.data
  }
  return { get, list, graphql }
}

function publicOwnedRepositories(raw, config) {
  return [...new Map(raw.filter(repo => repo.private === false &&
    (!repo.visibility || repo.visibility === 'public') &&
    repo.owner?.login?.toLowerCase() === config.username.toLowerCase() &&
    !excludes(config.excludeRepositories, repo.name, repo.full_name))
    .map(repo => [repo.id, repo])).values()]
}

export async function collect(config, { token, wakaTimeKey, fetcher = globalThis.fetch, now = new Date() } = {}) {
  if (!token && config.cards.includes('contributions') && config.includePrivateContributions) {
    throw new Error('Private contribution totals need an explicitly supplied GitHub token.')
  }
  const client = githubClient(token, fetcher)
  const login = pathPart(config.username)
  const { data: profile } = await client.get(`/users/${login}`)
  if (profile.type !== 'User') throw new Error('StatVitra requires a personal GitHub profile.')
  const snapshot = { login: profile.login }
  const overview = config.cards.includes('overview')
  if (overview) {
    snapshot.overview = { followers: profile.followers, following: profile.following, publicGists: profile.public_gists }
  }
  const repositoryMetrics = ['repos', 'stars', 'forks', 'forksMade']
  const projects = config.cards.includes('projects')
  const topProjects = projects && config.projectSelection === 'top' && !config.featuredRepositories.length
  const needsRepositories = config.cards.includes('languages') || topProjects || config.cards.includes('insights') || config.exportJson ||
    (overview && config.overviewMetrics.some(metric => repositoryMetrics.includes(metric)))
  if (needsRepositories) {
    const { data } = await client.list(`/users/${login}/repos?type=owner&sort=full_name&per_page=100`)
    const owned = publicOwnedRepositories(data, config)
    const repos = owned.filter(repo => (config.includeForks || !repo.fork) && (config.includeArchived || !repo.archived))
    const exported = new Map()
    if (config.exportJson) {
      for (const repo of repos) {
        exported.set(repo.full_name, { name: repo.full_name, stars: repo.stargazers_count, forks: repo.forks_count,
          language: repo.language, archived: Boolean(repo.archived), fork: Boolean(repo.fork) })
      }
    }
    if (overview) {
      Object.assign(snapshot.overview, {
        repos: repos.length,
        stars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
        forks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
        forksMade: owned.filter(repo => repo.fork === true).length
      })
    }

    if (config.cards.includes('languages')) {
      const contributed = config.languageScope === 'owned-and-contributed' ? await contributedRepositories(client, config) : []
      const eligible = [...new Map([...contributed, ...repos].map(repo => [repo.full_name.toLowerCase(), repo])).values()]
      const selected = eligible.toSorted((a, b) =>
        codeOrder(b.pushed_at ?? '', a.pushed_at ?? '') || codeOrder(a.full_name, b.full_name))
        .slice(0, config.languageRepositoryLimit)
      const bytes = new Map()
      const occurrences = new Map()
      let scanned = 0
      for (const repo of selected) {
        const { data: breakdown } = await client.get(`/repos/${pathPart(repo.owner.login)}/${pathPart(repo.name)}/languages`, [404])
        if (!breakdown) continue
        scanned += 1
        const analyzed = Object.entries(breakdown).filter(([name, size]) =>
          !excludes(config.excludeLanguages, name) && Number.isSafeInteger(size) && size > 0)
        for (const [name, size] of analyzed) {
          bytes.set(name, (bytes.get(name) ?? 0) + size)
          occurrences.set(name, (occurrences.get(name) ?? 0) + 1)
        }
        if (config.exportJson) {
          const record = exported.get(repo.full_name) ?? { name: repo.full_name }
          exported.set(repo.full_name, { ...record, analyzedLanguages: Object.fromEntries(analyzed) })
        }
      }
      snapshot.languages = { scanned, eligible: eligible.length,
        rows: [...bytes].sort(([a, left], [b, right]) => right - left || codeOrder(a, b)),
        repositoryCounts: Object.fromEntries(occurrences) }
    }

    if (topProjects) {
      snapshot.projects = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count ||
        b.forks_count - a.forks_count || codeOrder(b.pushed_at ?? '', a.pushed_at ?? '') ||
        codeOrder(a.full_name, b.full_name)).slice(0, config.projectCount).map(repo => ({
        name: repo.name, language: repo.language, stars: repo.stargazers_count, forks: repo.forks_count,
        description: repo.description || ''
      }))
    }
    if (config.cards.includes('insights')) snapshot.insights = await collectInsights(client, config, repos)
    if (config.exportJson) snapshot.repositoryDetails = [...exported.values()]
  }

  if (projects && !topProjects) snapshot.projects = await featuredProjects(client, config)
  if (config.cards.includes('contributions')) snapshot.contributions = await collectContributions(client, config, now, profile.created_at)
  if (config.cards.includes('gists')) snapshot.gists = await collectGists(client, config)
  if (config.cards.includes('coding')) snapshot.coding = await collectCoding(config, fetcher, wakaTimeKey)

  if (config.cards.includes('activity')) {
    const { data, more } = await client.list(`/users/${login}/events/public?per_page=100`, 3)
    const events = [...new Map(data.filter(event => event.public === true).map(event => [event.id, event])).values()]
    const instant = now.getTime()
    const start = Math.floor(instant / day) * day - 29 * day
    const days = Array(30).fill(0)
    for (const event of events) {
      const time = Date.parse(event.created_at)
      const index = Math.floor((time - start) / day)
      if (index >= 0 && index < days.length && time <= instant) days[index] += 1
    }
    snapshot.activity = { days, limited: more || data.length >= 300 }
  }
  return snapshot
}
