import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { validateMessages } from './copy.mjs'

export const defaults = {
  username: '',
  locale: 'en',
  messages: {},
  includeArchived: false,
  includeForks: false,
  excludeRepositories: [],
  excludeLanguages: [],
  languageRepositoryLimit: 30,
  projectCount: 3,
  cards: ['overview', 'languages', 'projects', 'activity'],
  overviewMetrics: ['repos', 'stars', 'forks', 'followers'],
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
      Object.entries(overrides).some(([card, animation]) => !defaults.cards.includes(card) || !animations.includes(animation))) {
    throw new Error('cardAnimations must map card names to none, fade, rise, or sweep.')
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
  for (const key of ['includeArchived', 'includeForks']) {
    if (typeof config[key] !== 'boolean') throw new Error(`${key} must be true or false.`)
  }
  for (const key of ['excludeRepositories', 'excludeLanguages', 'cards', 'overviewMetrics']) {
    if (!Array.isArray(config[key]) || config[key].some(item => typeof item !== 'string' || !item.trim())) {
      throw new Error(`${key} must be an array of nonempty strings.`)
    }
    config[key] = [...new Set(config[key].map(item => item.trim()))]
  }
  if (!config.cards.length || config.cards.some(card => !defaults.cards.includes(card))) {
    throw new Error('cards must select overview, languages, projects, or activity.')
  }
  if (!config.overviewMetrics.length || config.overviewMetrics.some(metric => !availableMetrics.includes(metric))) {
    throw new Error(`overviewMetrics must select from ${availableMetrics.join(', ')}.`)
  }
  validateOptions(config)
  for (const [key, limit] of [['languageRepositoryLimit', 100], ['projectCount', 5]]) {
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
