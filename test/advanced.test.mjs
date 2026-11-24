import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { cardNames, parseConfig } from '../src/config.mjs'
import { demo } from '../src/demo.mjs'
import { generate } from '../src/generate.mjs'
import { collect } from '../src/github.mjs'
import { renderCard, renderEmbed, renderReport } from '../src/render.mjs'

const profile = () => Response.json({ login: 'demo', type: 'User' })
const repo = (id, name, login = 'demo') => ({
  id, name, full_name: login + '/' + name, owner: { login }, private: false, visibility: 'public',
  stargazers_count: 3, forks_count: 2, language: 'TypeScript', description: 'Example project'
})

test('scopes contribution searches and paginated reviews to public data by default', async () => {
  const config = parseConfig({ username: 'demo', cards: ['contributions'], contributionYear: 2024,
    contributionMetrics: ['commits', 'mergeRate', 'issues', 'reviews', 'discussions', 'answers', 'contributedRepos', 'activityScore'] })
  const snapshot = await collect(config, { token: 'fixture', now: new Date('2025-05-10T10:00:00Z'), fetcher: async (url, options) => {
    if (url.pathname === '/users/demo') return profile()
    if (url.pathname.startsWith('/search/')) {
      const q = url.searchParams.get('q')
      assert.match(q, /author:demo is:public .*2024-01-01\.\.2024-12-31/)
      const n = q.includes('is:merged') ? 2 : q.includes('is:pr') ? 4 : q.includes('is:issue') ? 8 : 12
      return Response.json({ total_count: n, incomplete_results: false })
    }
    assert.equal(url.pathname, '/graphql')
    assert.equal(options.method, 'POST')
    const { query, variables } = JSON.parse(options.body)
    if (query.includes('StatVitraRepositories')) {
      assert.equal(variables.privacy, 'PUBLIC')
      return Response.json({ data: { user: { repositoriesContributedTo: { totalCount: 5 } } } })
    }
    if (query.includes('StatVitraDiscussions')) {
      assert.match(variables.query, /is:public created:2024-01-01\.\.2024-12-31/)
      return Response.json({ data: { search: { discussionCount: variables.query.startsWith('answered-by') ? 6 : 3 } } })
    }
    assert.equal(variables.to, '2024-12-31T23:59:59Z')
    const node = (id, visibility) => ({ pullRequest: { id, repository: { visibility } } })
    const nodes = variables.after ? [node('one', 'PUBLIC'), node('two', 'PUBLIC')] :
      [node('one', 'PUBLIC'), node('private', 'PRIVATE'), node('internal', 'INTERNAL')]
    return Response.json({ data: { user: { contributionsCollection: { pullRequestReviewContributions: {
      nodes, pageInfo: { hasNextPage: !variables.after, endCursor: variables.after ? null : 'next' }
    } } } } })
  } })
  assert.deepEqual(snapshot.contributions, { from: '2024-01-01', until: '2024-12-31', includesPrivate: false,
    values: { commits: 12, mergeRate: .5, issues: 8, reviews: 2, discussions: 3, answers: 6,
      contributedRepos: 5, activityScore: 13 } })
  await assert.rejects(() => collect({ ...config, includePrivateContributions: true }), /explicitly supplied/)
})

test('keeps curated pins and gists public and labels unavailable insight totals', async () => {
  const config = parseConfig({ username: 'demo', cards: ['projects', 'gists', 'insights'], excludeRepositories: ['*/exclude-*'],
    featuredRepositories: ['demo/exclude-test', 'demo/secret', 'friend/shared'], featuredGists: ['abcde', '123456'] })
  const snapshot = await collect(config, { fetcher: async url => {
    switch (url.pathname) {
      case '/users/demo': return profile()
      case '/users/demo/repos': return Response.json([repo(1, 'notes'), repo(2, 'exclude-local')])
      case '/repos/demo/notes/traffic/views': return new Response(null, { status: 403 })
      case '/repos/demo/notes/stats/contributors': return Response.json([{ author: { login: 'DEMO' }, weeks: [{ a: 8, d: 3 }] }])
      case '/repos/demo/secret': return Response.json({ ...repo(3, 'secret'), private: true })
      case '/repos/friend/shared': return Response.json(repo(4, 'shared', 'friend'))
      case '/gists/abcde': return Response.json({ id: 'abcde', public: false, description: 'secret text' })
      case '/gists/123456': return Response.json({ id: '123456', public: true, description: 'public sample',
        files: { 'x.js': { filename: 'x.js', language: 'JavaScript', size: 123 } }, comments: 2 })
      default: throw Error('Unexpected request')
    }
  } })
  assert.deepEqual(snapshot.projects.map(item => item.owner + '/' + item.name), ['friend/shared'])
  assert.deepEqual(snapshot.gists.map(item => item.id), ['123456'])
  assert.deepEqual(snapshot.insights, { repos: 1, trafficCovered: 0, linesCovered: 1,
    values: { views: null, uniqueViews: null, additions: 8, deletions: 3 } })
  const report = renderReport(snapshot, config)
  assert.match(report, /github\.com\/friend\/shared/)
  assert.match(report, /gist\.github\.com\/123456/)
  assert.doesNotMatch(report, /secret/)
  assert.match(report, /Unavailable/)
})

test('isolates WakaTime credentials and keeps only totals and language durations', async () => {
  const config = parseConfig({ username: 'demo', cards: ['coding'], wakaTimeRange: 'last_30_days' })
  const snapshot = await collect(config, { token: 'github-fixture', wakaTimeKey: 'waka-fixture', fetcher: async (url, options) => {
    assert.equal(options.redirect, 'error')
    if (url.hostname === 'api.github.com') {
      assert.equal(options.headers.Authorization, 'Bearer github-fixture')
      return profile()
    }
    assert.equal(url.href, 'https://wakatime.com/api/v1/users/current/stats/last_30_days')
    assert.equal(options.headers.Authorization, 'Basic ' + Buffer.from('waka-fixture:').toString('base64'))
    return Response.json({ data: { total_seconds: 3600, projects: [{ name: 'private project' }],
      start: '2025-01-01T00:00:00Z', end: '2025-01-30T23:59:59Z',
      languages: [{ name: 'CSS', total_seconds: 1500 }, { name: 'Python', total_seconds: 2100 }] } })
  } })
  assert.deepEqual(snapshot.coding.rows, [['Python', 2100], ['CSS', 1500]])
  assert.doesNotMatch(JSON.stringify(snapshot), /fixture|private project/)
  assert.match(renderCard('coding', snapshot, config.locale, 'dark', {}, config), /Python/)
})

test('exports public contributed languages without including unselected or private data', async () => {
  const config = parseConfig({ username: 'demo', cards: ['languages'], exportJson: true, languageScope: 'owned-and-contributed',
    excludeLanguages: ['fixture*'] })
  const snapshot = await collect(config, { token: 'fixture', fetcher: async url => {
    switch (url.pathname) {
      case '/users/demo': return profile()
      case '/users/demo/repos': return Response.json([repo(1, 'demo-project'), { ...repo(2, 'private'), private: true }])
      case '/graphql': return Response.json({ data: { user: { repositoriesContributedTo: {
        nodes: [
          { name: 'shared', nameWithOwner: 'friend/shared', owner: { login: 'friend' }, visibility: 'PUBLIC' },
          { name: 'private', nameWithOwner: 'friend/private', owner: { login: 'friend' }, visibility: 'PRIVATE' }
        ], pageInfo: { hasNextPage: false }
      } } } })
      case '/repos/demo/demo-project/languages': return Response.json({ JavaScript: 123, fixtureTmp: 512 })
      case '/repos/friend/shared/languages': return Response.json({ CSS: 51 })
      default: throw Error('Unexpected request')
    }
  } })
  assert.equal(snapshot.languages.eligible, 2)
  assert.deepEqual(snapshot.repositoryDetails.map(record => record.analyzedLanguages), [{ JavaScript: 123 }, { CSS: 51 }])
  assert.doesNotMatch(JSON.stringify(snapshot), /fixture|private/)
  const pinned = parseConfig({ username: 'demo', cards: ['projects', 'gists'], linkFeaturedCards: true })
  const embed = renderEmbed(pinned, { projects: [{ owner: 'friend', name: 'shared' }], gists: [{ id: 'abcde' }] })
  assert.match(embed, /href="https:\/\/github\.com\/friend\/shared"/)
  assert.match(embed, /href="https:\/\/gist\.github\.com\/abcde"/)
})

test('generates all cards in both modes, weights language shares, and cleans optional exports', async t => {
  const root = await mkdtemp(join(tmpdir(), 'statvitra-advanced-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const config = parseConfig({ username: 'demo', cards: cardNames, layout: 'columns', animation: 'rise',
    exportJson: true, theme: 'ocean', cardStyle: { radius: 6, border: false, icons: true },
    languageCount: 3, languageWeights: { bytes: 0, repositories: 1 } })
  const path = name => join(root, 'statvitra-cards', name)
  assert.equal(await generate(root, demo, config), 35)
  const exported = JSON.parse(await readFile(path('STATS.json'), 'utf8'))
  assert.equal(exported.schemaVersion, 1)
  for (const card of cardNames) {
    for (const mode of ['light', 'dark']) {
      assert.match(await readFile(path(card + '-' + mode + '.svg'), 'utf8'), /viewBox="-14 -14 460/)
      assert.match(await readFile(path(card + '-' + mode + '-motion.svg'), 'utf8'), /@keyframes rise/)
    }
  }
  for (const layout of ['bar', 'compact', 'donut', 'donut-vertical', 'pie']) {
    const svg = renderCard('languages', demo, 'en', 'light', {}, { ...config, languageLayout: layout })
    assert.match(svg, />CSS<\/text>/)
    assert.match(svg, />Other<\/text>/)
    assert.doesNotMatch(svg, /NaN|Infinity/)
    if (layout === 'compact') assert.doesNotMatch(svg, /clipPath|stroke-dasharray/)
    else if (layout !== 'bar') assert.match(svg, /stroke-dasharray/)
  }
  await generate(root, demo, parseConfig({ username: 'demo', cards: ['overview'] }))
  for (const name of ['STATS.json', 'gists-dark.svg', 'coding-light-motion.svg']) {
    await assert.rejects(readFile(path(name)), { code: 'ENOENT' })
  }
})
