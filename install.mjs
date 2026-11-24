#!/usr/bin/env node
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reportError } from './src/main.mjs'

try {
  if (process.argv.length !== 3 || process.argv[2] === '--help') {
    console.log('Usage: node install.mjs PATH_TO_PROFILE_REPOSITORY')
    process.exitCode = process.argv[2] === '--help' ? 0 : 1
  } else {
    const source = dirname(fileURLToPath(import.meta.url))
    const target = resolve(process.argv[2])
    const git = await stat(join(target, '.git'))
    if (!git.isDirectory() && !git.isFile()) {
      throw new Error('Pass the root of a local Git checkout.')
    }
    const code = (await readdir(join(source, 'src'))).filter(name => name !== 'cli.mjs')
    const files = new Map([
      ['action.yml', '.github/statvitra/action.yml'],
      ['LICENSE', '.github/statvitra/LICENSE'],
      ['examples/statvitra-update.yml', '.github/workflows/statvitra-update.yml'],
      ['statvitra.json', 'statvitra.json'],
      ...code.map(name => [`src/${name}`, `.github/statvitra/src/${name}`])
    ])
    const pending = []
    for (const [from, to] of files) {
      const bytes = await readFile(join(source, from))
      const destination = join(target, to)
      try {
        const existing = await readFile(destination)
        if (!existing.equals(bytes) && from !== 'statvitra.json') {
          throw new Error(`Existing file differs: ${to}. Installation stopped before copying any files.`)
        }
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
        pending.push([destination, bytes])
      }
    }
    for (const [path, bytes] of pending) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, bytes, { flag: 'wx' })
    }
    console.log('StatVitra installed. Commit the new files, push, and run Update StatVitra cards in Actions.')
  }
} catch (error) {
  if (error.code === 'ENOENT') reportError(new Error('Pass the root of an existing local Git checkout.'))
  else reportError(error)
}
