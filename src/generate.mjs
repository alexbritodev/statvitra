import { lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { animationFor, defaults } from './config.mjs'
import { embedEnd, embedStart, renderCard, renderEmbed, renderReport } from './render.mjs'

export const outputName = 'statvitra-cards'
const themes = ['light', 'dark']

async function readmeUpdate(path, embed) {
  let info
  try {
    info = await lstat(path)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
  if (!info.isFile()) return null
  const original = await readFile(path, 'utf8')
  const offset = original.startsWith('\uFEFF') ? 1 : 0
  const content = original.slice(offset)
  const markers = [...content.matchAll(/^<!-- statvitra:(?:start|end) -->(?=\r?$)/gm)]
  if (!markers.length) return null
  const [start, end] = markers
  if (markers.length !== 2 || start[0] !== embedStart || end[0] !== embedEnd) {
    throw new Error('README.md must have exactly one ordered pair of StatVitra markers.')
  }
  const lineBreak = content.includes('\r\n') ? '\r\n' : '\n'
  const replacement = embed.trimEnd().replaceAll('\n', lineBreak)
  const updated = original.slice(0, offset + start.index) + replacement +
    content.slice(end.index + end[0].length)
  return original === updated ? null : { original, updated, mode: info.mode }
}

export async function generate(root, snapshot, config) {
  const output = join(root, outputName)
  try {
    if (!(await lstat(output)).isDirectory()) throw new Error(`${outputName} must be a real directory.`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const embed = renderEmbed(config)
  const readmePath = join(root, 'README.md')
  const readme = await readmeUpdate(readmePath, embed)
  const files = new Map([
    ['REPORT.md', renderReport(snapshot, config)],
    ['EMBED.md', embed]
  ])
  const obsolete = []
  for (const card of defaults.cards) {
    for (const theme of themes) {
      const name = `${card}-${theme}.svg`
      const motion = `${card}-${theme}-motion.svg`
      if (!config.cards.includes(card)) {
        obsolete.push(name, motion)
        continue
      }
      const { branding } = config
      files.set(name, renderCard(card, snapshot, config.locale, theme, config.messages, { branding }))
      const animation = animationFor(config, card)
      if (animation === 'none') obsolete.push(motion)
      else files.set(motion, renderCard(card, snapshot, config.locale, theme, config.messages, { branding, animation }))
    }
  }

  const temporary = await mkdtemp(join(root, '.statvitra-'))
  try {
    for (const [name, content] of files) await writeFile(join(temporary, name), content)
    const stagedReadme = join(temporary, 'README.md')
    if (readme) await writeFile(stagedReadme, readme.updated, { mode: readme.mode })
    await mkdir(output, { recursive: true })
    for (const name of files.keys()) await rename(join(temporary, name), join(output, name))
    if (readme) {
      if (!(await lstat(readmePath)).isFile() || await readFile(readmePath, 'utf8') !== readme.original) {
        throw new Error('README.md changed during generation. Run StatVitra again to update its cards.')
      }
      await rename(stagedReadme, readmePath)
    }
    for (const name of obsolete) await rm(join(output, name), { force: true })
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
  return files.size
}
