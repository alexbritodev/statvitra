import { loadConfig } from './config.mjs'
import { demo } from './demo.mjs'
import { generate, outputName } from './generate.mjs'
import { collect } from './github.mjs'

export async function run({ root = process.cwd(), username, fallback, locale, token, wakaTimeKey, useDemo = false } = {}) {
  const config = await loadConfig(root, useDemo ? 'demo' : username, fallback, locale)
  const snapshot = useDemo ? demo : await collect(config, { token, wakaTimeKey })
  const count = await generate(root, snapshot, config)
  console.log(`StatVitra wrote ${count} files to ${outputName}/ for @${snapshot.login}.`)
}

export function reportError(error) {
  console.error(`StatVitra: ${String(error?.message || error).replace(/[\r\n]/g, ' ')}`)
  process.exitCode = 1
}
