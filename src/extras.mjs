import { posix } from 'node:path'

export function excludes(patterns, ...names) {
  return names.some(name => patterns.some(pattern => {
    const normalized = pattern.toLowerCase()
    const candidate = name.toLowerCase()
    return candidate === normalized || posix.matchesGlob(candidate, normalized)
  }))
}

const safeCount = n => Number.isSafeInteger(n) && n >= 0
const byMostRecent = (a, b) => (b.pushed_at ?? '').localeCompare(a.pushed_at ?? '') || a.full_name.localeCompare(b.full_name)
const repoPath = name => name.split('/').map(encodeURIComponent).join('/')

function project(repo) {
  return { name: repo.name, owner: repo.owner.login, language: repo.language,
    description: repo.description || '', stars: repo.stargazers_count, forks: repo.forks_count }
}

export async function featuredProjects(client, config) {
  const items = []
  if (config.featuredRepositories.length) {
    const seen = new Set()
    for (const name of config.featuredRepositories) {
      if (excludes(config.excludeRepositories, name, name.split('/')[1])) continue
      const { data } = await client.get(`/repos/${repoPath(name)}`, [404])
      if (data?.private !== false || (data.visibility && data.visibility !== 'public') || seen.has(data.id)) continue
      seen.add(data.id)
      items.push(project(data))
      if (items.length >= config.projectCount) break
    }
    return items
  }
  const data = await client.graphql(`query StatVitraPins($login: String!) {
    user(login: $login) {
      pinnedItems(first: 6, types: REPOSITORY) {
        nodes { ... on Repository {
          name nameWithOwner description visibility owner { login } primaryLanguage { name }
          stargazerCount forkCount
        } }
      }
    }
  }`, { login: config.username })
  for (const repo of data.user?.pinnedItems?.nodes ?? []) {
    if (repo?.visibility !== 'PUBLIC' || excludes(config.excludeRepositories, repo.name, repo.nameWithOwner)) continue
    items.push({ name: repo.name, owner: repo.owner.login, language: repo.primaryLanguage?.name ?? null,
      description: repo.description || '', stars: repo.stargazerCount, forks: repo.forkCount })
  }
  return items.slice(0, config.projectCount)
}

export async function contributedRepositories(client, config) {
  const repos = []
  const cursors = new Set()
  let after = null
  do {
    const data = await client.graphql(`query StatVitraLanguageRepositories($login: String!, $after: String) {
      user(login: $login) {
        repositoriesContributedTo(first: 100, after: $after, includeUserRepositories: false, privacy: PUBLIC) {
          nodes { name nameWithOwner owner { login } visibility isArchived isFork pushedAt }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`, { login: config.username, after })
    const page = data.user?.repositoriesContributedTo
    if (!Array.isArray(page?.nodes) || !page.pageInfo) throw new Error('Unexpected GitHub repository contribution response.')
    repos.push(...page.nodes.filter(repo => repo?.visibility === 'PUBLIC' &&
      (config.includeArchived || !repo.isArchived) && (config.includeForks || !repo.isFork) &&
      !excludes(config.excludeRepositories, repo.name, repo.nameWithOwner))
      .map(repo => ({ name: repo.name, full_name: repo.nameWithOwner, owner: repo.owner, pushed_at: repo.pushedAt })))
    if (!page.pageInfo.hasNextPage) return repos
    after = page.pageInfo.endCursor
    if (!after || cursors.has(after)) throw new Error('GitHub returned an invalid contributions cursor.')
    cursors.add(after)
  } while (cursors.size < 25)
  throw new Error('Too many contributed repositories to analyze in one run. Use the owned language scope.')
}

export async function collectGists(client, config, publicClient) {
  async function getGist(path, allowMissing) {
    const allowed = allowMissing ? [404] : []
    if (client === publicClient) return (await client.get(path, allowed)).data
    const result = await client.get(path, [...allowed, 403])
    if (result.status !== 403) return result.data
    return (await publicClient.get(path, allowed)).data
  }
  const items = []
  if (config.featuredGists.length) {
    for (const id of config.featuredGists) {
      const data = await getGist(`/gists/${encodeURIComponent(id)}`, true)
      if (data?.public === true && !items.some(gist => gist.id === data.id)) items.push(data)
      if (items.length >= config.gistCount) break
    }
  } else {
    const data = await getGist(`/users/${encodeURIComponent(config.username)}/gists?per_page=${config.gistCount}`, false)
    if (!Array.isArray(data)) throw new Error('GitHub returned an unexpected gist list.')
    items.push(...data.filter(gist => gist.public === true))
  }
  const selected = items.slice(0, config.gistCount)
  const engagement = new Map()
  if (config.gistEngagement && selected.some(gist => gist.node_id)) {
    const data = await client.graphql(`query StatVitraGists($ids: [ID!]!) {
      nodes(ids: $ids) { ... on Gist { id isPublic stargazerCount forks(first: 1) { totalCount } } }
    }`, { ids: selected.map(gist => gist.node_id).filter(Boolean) })
    for (const gist of data.nodes ?? []) {
      if (gist?.isPublic === true) engagement.set(gist.id, { stars: gist.stargazerCount, forks: gist.forks.totalCount })
    }
  }
  return selected.map(gist => {
    const files = Object.values(gist.files ?? {})
    const sizes = new Map()
    for (const file of files) {
      if (file.language && safeCount(file.size)) sizes.set(file.language, (sizes.get(file.language) ?? 0) + file.size)
    }
    const language = [...sizes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    return { id: gist.id, name: files[0]?.filename || gist.id, description: gist.description || '',
      language, files: files.length, comments: gist.comments ?? 0, ...engagement.get(gist.node_id) }
  })
}

export async function collectInsights(client, config, repos) {
  const selected = [...repos].sort(byMostRecent).slice(0, config.insightRepositoryLimit)
  const result = { repos: selected.length, trafficCovered: 0, linesCovered: 0,
    values: { views: null, uniqueViews: null, additions: null, deletions: null } }
  for (const repo of selected) {
    const endpoint = `/repos/${repoPath(repo.full_name)}`
    const { data: views } = await client.get(endpoint + '/traffic/views', [403, 404])
    if (safeCount(views?.count) && safeCount(views.uniques)) {
      result.trafficCovered += 1
      result.values.views = (result.values.views ?? 0) + views.count
      result.values.uniqueViews = (result.values.uniqueViews ?? 0) + views.uniques
    }
    const { data: contributors } = await client.get(endpoint + '/stats/contributors', [202, 204, 403, 404, 422])
    if (!Array.isArray(contributors)) continue
    const row = contributors.find(entry => entry.author?.login?.toLowerCase() === config.username.toLowerCase())
    const weeks = row ? row.weeks : []
    if (!Array.isArray(weeks) || weeks.some(week => !safeCount(week.a) || !safeCount(week.d))) continue
    const counted = contributors.reduce((total, item) => total + (item.total ?? 0), 0)
    if (counted >= 10_000 || (row?.total > 0 && weeks.every(week => week.a === 0 && week.d === 0))) continue
    result.linesCovered += 1
    for (const week of weeks) {
      result.values.additions = (result.values.additions ?? 0) + week.a
      result.values.deletions = (result.values.deletions ?? 0) + week.d
    }
    result.values.additions ??= 0
    result.values.deletions ??= 0
  }
  return result
}

export async function collectCoding(config, fetcher, key) {
  const user = config.wakaTimeUser || (key ? 'current' : config.username)
  const url = new URL(`https://wakatime.com/api/v1/users/${encodeURIComponent(user)}/stats/${config.wakaTimeRange}`)
  const headers = key ? { Authorization: `Basic ${Buffer.from(key + ':').toString('base64')}` } : {}
  let response
  try {
    response = await fetcher(url, { headers, redirect: 'error', signal: AbortSignal.timeout(15_000) })
  } catch {
    throw new Error('Could not reach the WakaTime API.')
  }
  if (!response.ok) throw new Error(`WakaTime returned HTTP ${response.status}. Check the profile or API key.`)
  const { data } = await response.json()
  const available = data?.is_up_to_date !== false
  const rows = available && Array.isArray(data?.languages) ? data.languages
    .filter(row => typeof row.name === 'string' && Number.isFinite(row.total_seconds) && row.total_seconds > 0)
    .sort((a, b) => b.total_seconds - a.total_seconds).slice(0, config.languageCount)
    .map(row => [row.name, row.total_seconds]) : []
  const dates = [data?.start, data?.end].map(value =>
    typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null)
  return { range: config.wakaTimeRange, rows, from: dates[0], until: dates[1],
    seconds: available && Number.isFinite(data?.total_seconds) && data.total_seconds >= 0 ? data.total_seconds : null }
}
