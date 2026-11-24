import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { validateMessages } from './copy.mjs'

const defaultCards = ['overview', 'languages', 'projects', 'activity']
export const cardNames = [...defaultCards, 'contributions', 'gists', 'insights', 'coding']
const coreContributions = ['commits', 'pullRequests', 'mergedPullRequests', 'issues', 'reviews', 'mergeRate']
export const contributionKeys = [...coreContributions, 'contributedRepos', 'discussions', 'answers', 'activityScore']
export const themes = ['violet', 'ocean', 'forest', 'slate', 'contrast']

export const defaults = {
  username: '',
  locale: 'en',
  messages: {},
  includeArchived: false,
  includeForks: false,
  excludeRepositories: [],
  excludeLanguages: [],
  languageRepositoryLimit: 30,
  languageCount: 6,
  languageScope: 'owned',
  languageLayout: 'bar',
  languageFormat: 'percent',
  languageWeights: { bytes: 1, repositories: 0 },
  languageOther: true,
  projectCount: 3,
  projectSelection: 'top',
  featuredRepositories: [],
  gistCount: 3,
  featuredGists: [],
  gistEngagement: false,
  linkFeaturedCards: false,
  cards: defaultCards,
  overviewMetrics: ['repos', 'stars', 'forks', 'followers'],
  showReportLink: false,
  exportJson: false,
  contributionYear: null,
  contributionMetrics: coreContributions,
  includePrivateContributions: false,
  insightRepositoryLimit: 5,
  wakaTimeUser: '',
  wakaTimeRange: 'last_7_days',
  theme: 'violet',
  cardThemes: {},
  cardStyle: { radius: 22, border: true, transparent: false, icons: false, showTitle: true, colors: {} },
  layout: 'stacked',
  branding: { position: 'hidden', link: false },
  animation: 'none',
  cardAnimations: {}
}

const loginPattern = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
const animations = ['none', 'fade', 'rise', 'sweep']
const availableMetrics = [...defaults.overviewMetrics, 'forksMade', 'following', 'publicGists']

function validateOptions(config) {
  if (!['stacked', 'columns'].includes(config.layout)) throw new Error('layout must be stacked or columns.')
  const branding = config.branding
  if (!branding || typeof branding !== 'object' || Array.isArray(branding) ||
      Object.keys(branding).some(key => !Object.hasOwn(defaults.branding, key))) {
    throw new Error('branding must be an object with position and link options.')
  }
  config.branding = { ...defaults.branding, ...branding }
  if (!['hidden', 'top-left', 'bottom-right'].includes(config.branding.position) ||
      typeof config.branding.link !== 'boolean') {
    throw new Error('branding.position must be hidden, top-left, or bottom-right. branding.link must be true or false.')
  }
  if (!animations.includes(config.animation)) throw new Error('animation must be none, fade, rise, or sweep.')
  const overrides = config.cardAnimations
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides) ||
      Object.entries(overrides).some(([card, animation]) => !cardNames.includes(card) || !animations.includes(animation))) {
    throw new Error('cardAnimations must map card names to none, fade, rise, or sweep.')
  }
  if (!config.cardThemes || typeof config.cardThemes !== 'object' || Array.isArray(config.cardThemes) ||
      Object.entries(config.cardThemes).some(([card, theme]) => !cardNames.includes(card) || !themes.includes(theme))) {
    throw new Error('cardThemes must map card names to theme presets.')
  }
  for (const [key, options] of [
    ['languageLayout', ['bar', 'compact', 'donut', 'donut-vertical', 'pie']],
    ['languageScope', ['owned', 'owned-and-contributed']],
    ['languageFormat', ['percent', 'bytes', 'repositories']],
    ['projectSelection', ['top', 'pinned']],
    ['wakaTimeRange', ['last_7_days', 'last_30_days', 'last_6_months', 'last_year', 'all_time']],
    ['theme', themes]
  ]) {
    if (!options.includes(config[key])) throw new Error(`${key} must be one of ${options.join(', ')}.`)
  }
  for (const key of ['languageWeights', 'cardStyle']) {
    const value = config[key]
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).some(option => !Object.hasOwn(defaults[key], option))) {
      throw new Error(`${key} has invalid options.`)
    }
    config[key] = { ...defaults[key], ...value }
  }
  const { bytes, repositories } = config.languageWeights
  if ([bytes, repositories].some(weight => !Number.isFinite(weight) || weight < 0 || weight > 2) ||
      bytes + repositories === 0) throw new Error('Language weights must be between 0 and 2 with at least one positive weight.')
  const { radius, border, transparent, icons, showTitle, colors } = config.cardStyle
  if (!Number.isInteger(radius) || radius < 0 || radius > 32 ||
      [border, transparent, icons, showTitle].some(option => typeof option !== 'boolean')) {
    throw new Error('cardStyle requires a radius from 0 to 32 and boolean display options.')
  }
  if (!colors || typeof colors !== 'object' || Array.isArray(colors) ||
      Object.entries(colors).some(([mode, palette]) => !['light', 'dark'].includes(mode) ||
        !palette || typeof palette !== 'object' || Array.isArray(palette) ||
        Object.entries(palette).some(([key, color]) => !['bg', 'panel', 'line', 'text', 'muted', 'accent'].includes(key) ||
          typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)))) {
    throw new Error('cardStyle.colors accepts #RRGGBB colors for light and dark modes.')
  }
  if (config.contributionYear !== null && config.contributionYear !== 'all' &&
      (!Number.isInteger(config.contributionYear) || config.contributionYear < 2008 ||
       config.contributionYear > new Date().getUTCFullYear())) throw new Error('Invalid contributionYear.')
  if (typeof config.wakaTimeUser !== 'string' || (config.wakaTimeUser && !/^[a-z\d_@-]{1,80}$/i.test(config.wakaTimeUser))) {
    throw new Error('Invalid wakaTimeUser.')
  }
}

export function animationFor(config, card) {
  return config.cardAnimations?.[card] ?? config.animation ?? defaults.animation
}

export function usesColumns(config) {
  return config.layout === 'columns' && config.cards.length > 1
}

export function parseConfig(input, username, locale) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('statvitra.json must contain a JSON object.')
  }
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(defaults, key)) throw new Error('Unknown StatVitra configuration key.')
  }
  const config = { ...defaults, ...input }
  if (typeof config.username !== 'string') throw new Error('username must be a string.')
  config.username = username || config.username
  if (typeof config.username !== 'string' || !loginPattern.test(config.username)) {
    throw new Error('Set a valid GitHub user login in statvitra.json, via --user, or use a personal repository owner.')
  }
  const requestedLocale = locale ?? config.locale
  if (typeof requestedLocale !== 'string') throw new Error('locale must be a BCP 47 language tag.')
  try {
    config.locale = Intl.getCanonicalLocales(requestedLocale)[0]
  } catch {
    throw new Error('locale must be a BCP 47 language tag.')
  }
  config.messages = validateMessages(config.messages)
  for (const key of ['includeArchived', 'includeForks', 'showReportLink', 'exportJson', 'languageOther',
    'includePrivateContributions', 'gistEngagement', 'linkFeaturedCards']) {
    if (typeof config[key] !== 'boolean') throw new Error(`${key} must be true or false.`)
  }
  for (const key of ['excludeRepositories', 'excludeLanguages', 'cards', 'overviewMetrics', 'contributionMetrics',
    'featuredRepositories', 'featuredGists']) {
    if (!Array.isArray(config[key]) || config[key].some(item => typeof item !== 'string' || !item.trim())) {
      throw new Error(`${key} must be an array of nonempty strings.`)
    }
    config[key] = [...new Set(config[key].map(item => item.trim()))]
  }
  if (!config.cards.length || config.cards.some(card => !cardNames.includes(card))) {
    throw new Error(`cards must select from ${cardNames.join(', ')}.`)
  }
  if (!config.overviewMetrics.length || config.overviewMetrics.some(metric => !availableMetrics.includes(metric))) {
    throw new Error(`overviewMetrics must select from ${availableMetrics.join(', ')}.`)
  }
  if (!config.contributionMetrics.length || config.contributionMetrics.some(metric => !contributionKeys.includes(metric))) {
    throw new Error(`contributionMetrics must select from ${contributionKeys.join(', ')}.`)
  }
  if (config.featuredRepositories.length > 10 || config.featuredRepositories.some(name => {
    const [owner, repo, extra] = name.split('/')
    return extra !== undefined || !loginPattern.test(owner) || !repo || !/^[a-z\d_.-]{1,100}$/i.test(repo) ||
      repo === '.' || repo === '..'
  })) throw new Error('featuredRepositories accepts up to 10 owner/repository names.')
  if (config.featuredGists.length > 10 || config.featuredGists.some(id => !/^[a-f\d]{5,64}$/i.test(id))) {
    throw new Error('featuredGists accepts up to 10 public gist IDs.')
  }
  validateOptions(config)
  for (const [key, limit] of [['languageRepositoryLimit', 100], ['projectCount', 5], ['languageCount', 10],
    ['gistCount', 5], ['insightRepositoryLimit', 15]]) {
    if (!Number.isInteger(config[key]) || config[key] < 1 || config[key] > limit) {
      throw new Error(`${key} must be an integer from 1 to ${limit}.`)
    }
  }
  return config
}

export async function loadConfig(root, username = '', fallback = '', locale) {
  let input
  try {
    input = JSON.parse(await readFile(join(root, 'statvitra.json'), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    input = {}
  }
  return parseConfig(input, username || (input?.username === '' || input?.username === undefined ? fallback : ''), locale)
}
