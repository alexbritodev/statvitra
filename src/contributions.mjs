const searchMetrics = {
  commits: ['commits', '', 'author-date'],
  pullRequests: ['issues', 'is:pr', 'created'],
  mergedPullRequests: ['issues', 'is:pr is:merged', 'created'],
  issues: ['issues', 'is:issue', 'created']
}

const day = 86_400_000
const isoDay = date => date.toISOString().slice(0, 10)
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null

function period(year, now, createdAt) {
  const until = isoDay(now)
  if (year === 'all') {
    const created = typeof createdAt === 'string' ? createdAt.slice(0, 10) : ''
    return { from: /^\d{4}-\d{2}-\d{2}$/.test(created) && created < until ? created : '2008-01-01', until }
  }
  if (!year) return { from: isoDay(new Date(now.getTime() - 364 * day)), until }
  return { from: `${year}-01-01`, until: year === now.getUTCFullYear() ? until : `${year}-12-31` }
}

async function reviews(client, login, dates, includePrivate, keys) {
  const query = `query StatVitraReviews($login: String!, $from: DateTime!, $to: DateTime!, $after: String) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        pullRequestReviewContributions(first: 100, after: $after) {
          nodes { pullRequest { id repository { visibility } } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }`
  const cursors = new Set()
  let after = null
  do {
    const data = await client.graphql(query, { login, from: dates.from + 'T00:00:00Z',
      to: dates.until + 'T23:59:59Z', after })
    const page = data.user?.contributionsCollection?.pullRequestReviewContributions
    if (!Array.isArray(page?.nodes) || !page.pageInfo) throw new Error('GitHub returned an unexpected review response.')
    for (const item of page.nodes) {
      const request = item?.pullRequest
      if (request?.id && (includePrivate || request.repository?.visibility === 'PUBLIC')) keys.add(request.id)
    }
    if (!page.pageInfo.hasNextPage) return true
    after = page.pageInfo.endCursor
    if (!after || cursors.has(after)) throw new Error('GitHub returned an invalid review cursor.')
    cursors.add(after)
  } while (cursors.size < 25)
  return false
}

export async function collectContributions(client, config, now, createdAt) {
  const login = config.username
  const dates = period(config.contributionYear, now, createdAt)
  const allTime = config.contributionYear === 'all'
  const visibility = config.includePrivateContributions ? '' : ' is:public'
  const selected = new Set(config.contributionMetrics)
  if (selected.has('mergeRate')) {
    selected.add('pullRequests')
    selected.add('mergedPullRequests')
  }
  if (selected.has('activityScore')) {
    for (const key of ['commits', 'mergedPullRequests', 'issues', 'reviews']) selected.add(key)
  }
  const values = {}
  for (const [key, [endpoint, kind, date]] of Object.entries(searchMetrics)) {
    if (!selected.has(key)) continue
    const filter = allTime ? '' : ` ${date}:${dates.from}..${dates.until}`
    const query = `author:${login}${visibility}${filter} ${kind}`.trim()
    const { data } = await client.get(`/search/${endpoint}?${new URLSearchParams({ q: query, per_page: '1' })}`)
    values[key] = data?.incomplete_results ? null : count(data?.total_count)
  }
  if (selected.has('reviews')) {
    const ids = new Set()
    const windows = []
    if (allTime) {
      const firstYear = Number(dates.from.slice(0, 4))
      const lastYear = now.getUTCFullYear()
      for (let year = firstYear; year <= lastYear; year += 1) {
        windows.push({ from: year === firstYear ? dates.from : `${year}-01-01`,
          until: year === lastYear ? dates.until : `${year}-12-31` })
      }
    } else windows.push(dates)
    let complete = true
    for (const window of windows) {
      if (await reviews(client, login, window, config.includePrivateContributions, ids)) continue
      complete = false
      break
    }
    values.reviews = complete ? ids.size : null
  }
  if (selected.has('contributedRepos')) {
    const data = await client.graphql(`query StatVitraRepositories($login: String!, $privacy: RepositoryPrivacy) {
      user(login: $login) { repositoriesContributedTo(first: 1, includeUserRepositories: true, privacy: $privacy) { totalCount } }
    }`, { login, privacy: config.includePrivateContributions ? null : 'PUBLIC' })
    values.contributedRepos = count(data.user?.repositoriesContributedTo?.totalCount)
  }
  for (const [key, qualifier] of [['discussions', 'author'], ['answers', 'answered-by']]) {
    if (!selected.has(key)) continue
    const data = await client.graphql(`query StatVitraDiscussions($query: String!) {
      search(query: $query, type: DISCUSSION, first: 1) { discussionCount }
    }`, { query: `${qualifier}:${login}${visibility}${allTime ? '' : ` created:${dates.from}..${dates.until}`}` })
    values[key] = count(data.search?.discussionCount)
  }
  if (selected.has('mergeRate')) {
    values.mergeRate = Number.isFinite(values.pullRequests) && Number.isFinite(values.mergedPullRequests) &&
      values.pullRequests > 0 && values.mergedPullRequests <= values.pullRequests ?
      values.mergedPullRequests / values.pullRequests : null
  }
  if (selected.has('activityScore')) {
    const metrics = ['commits', 'mergedPullRequests', 'issues', 'reviews']
    const weights = [1, 6, 2, 3]
    const total = metrics.reduce((sum, key, i) => sum + weights[i] * values[key], 0)
    values.activityScore = metrics.every(key => values[key] !== null) ?
      Math.round(100 * total / (total + 300)) : null
  }
  return { ...dates, includesPrivate: config.includePrivateContributions,
    values: Object.fromEntries(config.contributionMetrics.map(key => [key, values[key]])) }
}
