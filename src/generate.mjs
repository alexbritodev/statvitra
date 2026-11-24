import { lstat, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defaults } from './config.mjs'
import { renderCard, renderEmbed, renderReport } from './render.mjs'

export const outputName = 'statvitra-cards'
const themes = ['light', 'dark']

export async function generate(root, snapshot, config) {
  const output = join(root, outputName)
  try {
    if (!(await lstat(output)).isDirectory()) throw new Error(`${outputName} must be a real directory.`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const files = new Map([
    ['REPORT.md', renderReport(snapshot, config)],
    ['EMBED.md', renderEmbed(config)]
  ])
  const obsolete = []
  for (const card of defaults.cards) {
    for (const theme of themes) {
      const name = `${card}-${theme}.svg`
      if (config.cards.includes(card)) files.set(name, renderCard(card, snapshot, config.locale, theme, config.messages))
      else obsolete.push(name)
    }
  }

  const temporary = await mkdtemp(join(root, '.statvitra-'))
  try {
    for (const [name, content] of files) await writeFile(join(temporary, name), content)
    await mkdir(output, { recursive: true })
    for (const name of files.keys()) await rename(join(temporary, name), join(output, name))
    for (const name of obsolete) await rm(join(output, name), { force: true })
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
  return files.size
}
