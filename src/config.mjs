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
  cards: ['overview', 'languages', 'projects', 'activity']
}

const loginPattern = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

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
  for (const key of ['excludeRepositories', 'excludeLanguages', 'cards']) {
    if (!Array.isArray(config[key]) || config[key].some(item => typeof item !== 'string' || !item.trim())) {
      throw new Error(`${key} must be an array of nonempty strings.`)
    }
    config[key] = [...new Set(config[key].map(item => item.trim()))]
  }
  if (!config.cards.length || config.cards.some(card => !defaults.cards.includes(card))) {
    throw new Error('cards must select overview, languages, projects, or activity.')
  }
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
