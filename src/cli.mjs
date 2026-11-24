#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { reportError, run } from './main.mjs'

try {
  const { values } = parseArgs({
    options: { user: { type: 'string' }, locale: { type: 'string' }, demo: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' } }
  })
  if (values.help) {
    console.log('Usage: node src/cli.mjs [--user LOGIN | --demo] [--locale TAG]\nWrites statvitra-cards/ under the current directory.')
  } else {
    if (values.user !== undefined && (!values.user || values.demo)) {
      throw new Error('--user expects a login and cannot be used with --demo.')
    }
    await run({ username: values.user, locale: values.locale,
      token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN, wakaTimeKey: process.env.WAKATIME_API_KEY, useDemo: values.demo })
  }
} catch (error) {
  reportError(error)
}
