import { reportError, run } from './main.mjs'

try {
  await run({
    root: process.env.GITHUB_WORKSPACE || process.cwd(),
    username: process.env.INPUT_USERNAME?.trim(),
    locale: process.env.INPUT_LOCALE?.trim() || undefined,
    fallback: process.env.GITHUB_REPOSITORY_OWNER,
    token: process.env.INPUT_TOKEN?.trim() || process.env.GITHUB_TOKEN,
    wakaTimeKey: process.env.INPUT_WAKATIME_KEY?.trim() || process.env.WAKATIME_API_KEY
  })
} catch (error) {
  reportError(error)
}
