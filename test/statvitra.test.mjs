import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { parseConfig } from '../src/config.mjs'
import { demo } from '../src/demo.mjs'
import { generate } from '../src/generate.mjs'
import { collect } from '../src/github.mjs'
import { embedEnd, embedStart, renderCard, renderEmbed, renderReport, xml } from '../src/render.mjs'

const repo = (id, name, options = {}) => ({
  id, name, full_name: `demo/${name}`, owner: { login: 'demo' }, private: false,
  archived: false, fork: false, stargazers_count: id, forks_count: id,
  language: 'JavaScript', pushed_at: `2025-01-0${id}T15:00:00Z`, ...options
})
const json = (data, headers) => Response.json(data, { headers })

test('paginates, scopes public repositories, reports coverage and ranks projects', async () => {
  const config = parseConfig({ username: 'demo', excludeRepositories: ['ignored'],
    excludeLanguages: ['html'], languageRepositoryLimit: 2 })
  const event = { id: '1', public: true, created_at: new Date().toISOString() }
  const requests = []
  const fetcher = async (url, options) => {
    assert.equal(url.origin, 'https://api.github.com')
    assert.equal(options.headers.Authorization, 'Bearer fixture')
    requests.push(url.pathname)
    switch (url.pathname) {
      case '/users/demo': return json({ login: 'demo', type: 'User', followers: 19, following: 5, public_gists: 2 })
      case '/users/demo/repos':
        if (url.searchParams.get('page') === '2') return json([repo(7, 'newest'), repo(2, 'middle')])
        return json([repo(1, 'older'), repo(2, 'middle'), repo(3, 'ignored'), repo(4, 'archived', { archived: true }),
          repo(5, 'forked', { fork: true }), repo(6, 'private', { private: true, fork: true }),
          repo(8, 'archived-fork', { archived: true, fork: true })],
        { link: '<https://api.github.com/users/demo/repos?page=2>; rel="next"' })
      case '/repos/demo/newest/languages': return json({ JavaScript: 90, HTML: 15 })
      case '/repos/demo/middle/languages': return json({ CSS: 30, JavaScript: 10 })
      case '/users/demo/events/public':
        return json([event, event, { ...event, id: '2', public: false },
          { ...event, id: '3', created_at: '2020-01-01T00:00:00Z' }])
      default: assert.fail(`Unexpected route ${url.pathname}`)
    }
  }
  const snapshot = await collect(config, { token: 'fixture', fetcher })
  assert.deepEqual(snapshot.overview, { repos: 3, stars: 10, forks: 10, followers: 19, following: 5,
    publicGists: 2, forksMade: 2 })
  assert.deepEqual(snapshot.languages, { scanned: 2, eligible: 3, rows: [['JavaScript', 100], ['CSS', 30]] })
  assert.deepEqual(snapshot.projects.map(project => project.name), ['newest', 'middle', 'older'])
  assert.equal(snapshot.activity.days.at(-1), 1)
  assert.equal(snapshot.activity.days.reduce((a, b) => a + b), 1)
  assert.equal(requests.length, 6)
})

test('orders configurable overview metrics and skips repo calls for profile-only stats', async () => {
  const config = parseConfig({ username: 'demo', cards: ['overview'], locale: 'pt-BR',
    overviewMetrics: ['publicGists', 'following'] })
  const snapshot = await collect(config, { fetcher: async url => {
    assert.equal(url.pathname, '/users/demo')
    return json({ login: 'demo', type: 'User', followers: 19, following: 5, public_gists: 2 })
  } })
  assert.match(renderReport(snapshot, config), /Gists públicos — 2\n- Seguindo — 5/)
  const one = renderCard('overview', snapshot, config.locale, 'light', {}, { overviewMetrics: ['following'] })
  assert.match(one, /width="376" height="61"/)
  assert.doesNotMatch(one, /Gists públicos|Seguidores/)
  assert.throws(() => parseConfig({ ...config, overviewMetrics: [] }), /overviewMetrics must select/)
  assert.throws(() => parseConfig({ ...config, overviewMetrics: ['privateRepos'] }), /overviewMetrics must select/)
})

test('skips deleted repositories in language coverage and avoids unused endpoints', async () => {
  const config = parseConfig({ username: 'demo', cards: ['languages'] })
  const snapshot = await collect(config, { fetcher: async url => {
    if (url.pathname === '/users/demo') return json({ login: 'demo', type: 'User' })
    if (url.pathname === '/users/demo/repos') return json([repo(1, 'missing')])
    assert.equal(url.pathname, '/repos/demo/missing/languages')
    return new Response(null, { status: 404 })
  } })
  assert.deepEqual(snapshot, { login: 'demo', languages: { scanned: 0, eligible: 1, rows: [] } })
})

test('fails safely on rate limits or untrusted pagination URLs', async () => {
  const config = parseConfig({ username: 'demo', cards: ['overview'] })
  await assert.rejects(() => collect(config, { fetcher: async () =>
    new Response(null, { status: 403, headers: { 'x-ratelimit-remaining': '0' } }) }), /rate limit/)
  await assert.rejects(() => collect(config, { fetcher: async url =>
    url.pathname === '/users/demo' ? json({ login: 'demo', type: 'User' }) :
      json([], { link: '<https://example.net/page=2>; rel="next"' }) }), /pagination URL/)
})

test('renders both locales, official language colors, and an accessible README report', () => {
  const config = parseConfig({ username: 'demo', locale: 'pt-BR' })
  const card = renderCard('languages', demo, config.locale, 'dark')
  assert.match(card, /viewBox="0 0 432 \d+"/)
  assert.match(card, /Linguagens principais/)
  assert.match(card, /#3178c6/i)
  assert.match(card, /<desc id="description">/)
  assert.match(renderCard('overview', demo, config.locale, 'dark'), />Estrelas recebidas<\/text>/)
  assert.match(renderCard('projects', demo, config.locale, 'dark'), />Repositórios públicos ordenados por estrelas<\/text>/)
  assert.match(renderEmbed(config), /<source media="\(prefers-color-scheme: dark\)"/)
  assert.match(renderReport(demo, config), /https:\/\/github\.com\/demo\/atlas-ui/)
  assert.equal(xml('<svg>&"\u0000'), '&lt;svg&gt;&amp;&quot;')
})

test('localizes regional variants and safely renders custom catalogs', () => {
  const config = parseConfig({ username: 'demo' })
  assert.equal(config.locale, 'en')
  assert.match(renderCard('projects', demo, 'en', 'light'), /Featured projects/)
  assert.match(renderCard('overview', demo, 'es-MX', 'light'), /Resumen del perfil/)
  assert.match(renderCard('overview', demo, 'fr-CA', 'dark'), /Aperçu du profil/)
  const custom = parseConfig({ username: 'demo', locale: 'ja-jp', messages: {
    languages: '使用言語 <主要> "統計"',
    scanned: '{total} 件中 {count} 件を分析',
    textReport: 'レポート [本文]'
  } })
  assert.equal(custom.locale, 'ja-JP')
  const card = renderCard('languages', demo, custom.locale, 'dark', custom.messages)
  assert.match(card, /24 件中 24 件を分析/)
  assert.match(card, /使用言語 &lt;主要&gt; &quot;統計&quot;/)
  assert.match(renderEmbed(custom), /alt="使用言語 &lt;主要&gt; &quot;統計&quot;"/)
  assert.ok(renderEmbed(custom).includes('レポート \\[本文\\]'))
  assert.match(renderReport(demo, custom), /24 件中 24 件を分析/)
  assert.throws(() => parseConfig({ username: 'demo', locale: 'pt_BR' }), /BCP 47/)
  assert.throws(() => parseConfig({ ...custom, messages: { scanned: '{count}' } }), /\{total\}/)
  assert.throws(() => parseConfig({ ...custom, messages: { overview: 'line\nline' } }), /single-line/)
})

test('embeds any selected number of cards in order, with optional two-column rows', () => {
  const names = ['activity', 'projects', 'languages', 'overview']
  for (const layout of ['stacked', 'columns']) {
    for (let size = 1; size <= names.length; size += 1) {
      const cards = names.slice(0, size)
      const embed = renderEmbed(parseConfig({ username: 'demo', cards, layout }))
      const twoColumns = layout === 'columns' && size > 1
      assert.deepEqual([...embed.matchAll(/src="\.\/statvitra-cards\/(\w+)-light\.svg"/g)]
        .map(match => match[1]), cards)
      assert.equal(embed.match(/<p>/g).length, twoColumns ? 1 : size)
      assert.equal([...embed.matchAll(/<br>/g)].length, twoColumns ? Math.ceil(size / 2) - 1 : 0)
      assert.equal(embed.match(/width="(?:320|432)"/g).length, size)
      assert.ok(embed.includes(`width="${twoColumns ? 320 : 432}"`))
      assert.equal([...embed.matchAll(/align="top"/g)].length, twoColumns ? size : 0)
    }
  }
})

test('renders optional branding and three motion effects with reduced-motion support', () => {
  const config = parseConfig({ username: 'demo' })
  assert.doesNotMatch(renderCard('overview', demo, 'en', 'light'), /StatVitra|<style>/)
  assert.doesNotMatch(renderEmbed(config), /href="https:/)
  const top = parseConfig({ ...config, branding: { position: 'top-left' } })
  assert.match(renderCard('overview', demo, 'en', 'light', {}, top), /x="67" y="39"[^>]*>StatVitra/)
  assert.doesNotMatch(renderEmbed(top), /href="https:/)
  const bottom = parseConfig({ ...config, branding: { position: 'bottom-right', link: true } })
  assert.match(renderCard('overview', demo, 'en', 'light', {}, bottom), /x="404" y="260"[^>]*>StatVitra/)
  assert.match(renderEmbed(bottom), /<a href="https:\/\/github\.com\/alexbritodev\/statvitra"><picture>/)
  const hidden = parseConfig({ ...config, branding: { position: 'hidden', link: true } })
  assert.doesNotMatch(renderEmbed(hidden), /href="https:/)
  for (const animation of ['fade', 'rise', 'sweep']) {
    const valid = parseConfig({ ...config, animation })
    const card = renderCard('overview', demo, 'en', 'dark', {}, valid)
    assert.ok(card.includes(`@keyframes ${animation}`))
    assert.match(renderEmbed(valid), /prefers-reduced-motion: no-preference.*overview-dark-motion\.svg/)
  }
  assert.throws(() => parseConfig({ ...config, animation: 'bounce' }), /animation must/)
  assert.throws(() => parseConfig({ ...config, cardAnimations: { other: 'fade' } }), /cardAnimations must/)
  assert.throws(() => parseConfig({ ...config, branding: { link: 'yes' } }), /must be true or false/)
  assert.throws(() => parseConfig({ ...config, layout: 2 }), /layout must/)
})

test('updates generated files deterministically and removes only obsolete cards', async t => {
  const root = await mkdtemp(join(tmpdir(), 'statvitra-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const config = parseConfig({ username: 'demo' })
  const directory = join(root, 'statvitra-cards')
  assert.equal(await generate(root, demo, config), 10)
  const card = await readFile(join(directory, 'overview-light.svg'), 'utf8')
  await writeFile(join(directory, 'notes.txt'), 'keep')
  assert.equal(await generate(root, demo, { ...config, cards: ['overview'] }), 4)
  assert.equal(await readFile(join(directory, 'overview-light.svg'), 'utf8'), card)
  assert.deepEqual((await readdir(directory)).sort(), ['EMBED.md', 'REPORT.md', 'notes.txt',
    'overview-dark.svg', 'overview-light.svg'])
})

test('refreshes only the opt-in README block and respects per-card animation overrides', async t => {
  const root = await mkdtemp(join(tmpdir(), 'statvitra-readme-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const path = join(root, 'README.md')
  const before = '\uFEFF# My profile\r\n\r\n'
  const after = '\r\n\r\nMy other projects.\r\n'
  await writeFile(path, before + after)
  const config = parseConfig({ username: 'demo', cards: ['activity', 'overview'], layout: 'columns',
    animation: 'fade', cardAnimations: { overview: 'none' } })
  await generate(root, demo, config)
  assert.equal(await readFile(path, 'utf8'), before + after)
  await writeFile(path, before + `${embedStart}\r\nOld cards\r\n${embedEnd}` + after)
  await generate(root, demo, config)
  const updated = before + renderEmbed(config).trimEnd().replaceAll('\n', '\r\n') + after
  assert.equal(await readFile(path, 'utf8'), updated)
  await generate(root, demo, config)
  assert.equal(await readFile(path, 'utf8'), updated)
  const card = suffix => readFile(join(root, 'statvitra-cards', suffix + '.svg'), 'utf8')
  assert.match(await card('activity-dark-motion'), /@keyframes fade/)
  assert.match(await card('activity-dark-motion'), /viewBox="-14 -14 460 \d+"/)
  assert.match(await card('activity-dark'), /viewBox="-14 -14 460 \d+"/)
  assert.doesNotMatch(await card('activity-dark'), /<style>/)
  assert.doesNotMatch(await card('overview-dark'), /<style>/)
  await generate(root, demo, { ...config, animation: 'none' })
  await assert.rejects(card('activity-dark-motion'), { code: 'ENOENT' })
  await writeFile(path, before + embedStart + after)
  await assert.rejects(() => generate(root, demo, config), /exactly one ordered pair/)
})

test('refuses to publish to a symlink and validates config before network use', async t => {
  const root = await mkdtemp(join(tmpdir(), 'statvitra-symlink-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await symlink(root, join(root, 'statvitra-cards'), process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(() => generate(root, demo, parseConfig({ username: 'demo' })), /real directory/)
  assert.throws(() => parseConfig({ username: '../user' }), /valid GitHub user/)
  assert.throws(() => parseConfig({ username: 'demo', cards: ['other'] }), /cards must select/)
})
