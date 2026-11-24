import { copyFor } from './copy.mjs'
import { animationFor, defaults } from './config.mjs'
import languageColors from './linguist-colors.json' with { type: 'json' }

const palettes = {
  light: { bg: '#f8f8ff', panel: '#fff', line: '#dbdef0', text: '#141a32', muted: '#4c556f',
    accent: '#5137be', wash: '#ede8ff', track: '#e1e4f4', chart: ['#7559e8', '#00897f', '#db6b30', '#2e74d1', '#a33c76', '#7890ac'] },
  dark: { bg: '#111426', panel: '#1b2038', line: '#343d5c', text: '#f4f4ff', muted: '#b9c2dd',
    accent: '#c6b6ff', wash: '#29214b', track: '#2a324d', chart: ['#a58cff', '#49c7b3', '#ffa373', '#73b0ff', '#ed8bc1', '#8499b5'] }
}
const xmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
export function xml(value) {
  return String(value).replace(/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/gu, '')
    .replace(/[&<>"']/g, char => xmlEntities[char])
}

const width = 432
const projectUrl = 'https://github.com/alexbritodev/statvitra'
export const embedStart = '<!-- statvitra:start -->'
export const embedEnd = '<!-- statvitra:end -->'
const effects = {
  fade: '.content { animation: fade 1.25s ease-out } @keyframes fade { from { opacity: .22 } }',
  rise: '.content { animation: rise 1.1s cubic-bezier(.2,.7,.25,1) } @keyframes rise { from { transform: translateY(10px); opacity: .45 } }',
  sweep: '.sweep { animation: sweep 1.4s ease-out } @keyframes sweep { 0% { opacity: .9; transform: scaleX(0) } 65% { opacity: .8; transform: scaleX(1) } 100% { opacity: 0; transform: scaleX(1) } }'
}
const sum = numbers => numbers.reduce((total, value) => total + value, 0)
const graphemes = new Intl.Segmenter()
const wide = /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Extended_Pictographic}]/u
const wideLatin = /[WMmw@%&]/
const narrowLatin = /[ilIj.,: ']/
const uppercase = /\p{Lu}/u
const number = (n, locale) => new Intl.NumberFormat(locale).format(n)
const compact = (n, locale) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
const percent = (n, locale) => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(n)

function rect(x, y, w, h, fill, radius = 0, stroke = 'none') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`
}
function label(x, y, value, fill, size = 16, weight = 500, anchor = 'start', max = 376) {
  const pieces = []
  let estimated = 0
  for (const { segment } of graphemes.segment(value)) {
    let em = .65
    if (wide.test(segment)) em = 1.12
    else if (wideLatin.test(segment)) em = .99
    else if (narrowLatin.test(segment)) em = .37
    else if (uppercase.test(segment)) em = .77
    else if (/^[\p{Script=Latin}0-9]/u.test(segment)) em = .59
    const advance = em * size
    if (estimated + advance > max) {
      while (pieces.length && estimated + size > max) estimated -= pieces.pop().advance
      pieces.push({ segment: '…' })
      break
    }
    pieces.push({ segment, advance })
    estimated += advance
  }
  const fitted = pieces.map(piece => piece.segment).join('')
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}" unicode-bidi="plaintext">${xml(fitted)}</text>`
}

function dot(x, y, color, p) {
  return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" stroke="${p.muted}" stroke-opacity=".55"/>`
}

function brandMark(p, position, height) {
  if (position === 'top-left') {
    return `${rect(28, 18, 30, 30, p.wash, 9)}
<path d="M36 32h3v8h-3zm5-4h3v12h-3zm5-4h3v16h-3z" fill="${p.accent}"/>
${label(67, 39, 'StatVitra', p.accent, 16, 750)}`
  }
  return label(404, height - 17, 'StatVitra', p.accent, 13, 700, 'end', 90)
}

function artboard(height, title, subtitle, description, footer, theme, locale, body, demoLabel, brand, animation) {
  const p = palettes[theme]
  const top = brand.position === 'top-left'
  const bottom = brand.position === 'bottom-right'
  const shift = top ? 0 : 33
  const style = animation === 'none' ? '' : `<style>${effects[animation]}</style>`
  const mark = brand.position === 'hidden' ? '' : brandMark(p, brand.position, height)
  const branding = mark && brand.link ? `<a href="${projectUrl}" aria-label="StatVitra">${mark}</a>` : mark
  const sweep = animation === 'sweep' ?
    `<g transform="translate(28 ${116 - shift})"><path class="sweep" d="M0 0h376" stroke="${p.accent}" stroke-width="2" stroke-linecap="round" opacity="0"/></g>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title description" xml:lang="${locale}">
<title id="title">${xml(title)}</title>
<desc id="description">${xml(description)}</desc>
${style}
<g font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-variant-numeric="tabular-nums">
${rect(.5, .5, width - 1, height - 1, p.bg, 22, p.line)}
${branding}
${demoLabel ? label(404, top ? 38 : 24, demoLabel, p.muted, 12, 600, 'end', 205) : ''}
${label(28, 82 - shift, title, p.text, 28, 750)}
${label(28, 108 - shift, subtitle, p.muted, 15)}
${sweep}
<g transform="translate(0 ${-shift})"><g class="content">${body(p)}</g></g>
${rect(28, height - 41, 376, 1, p.line)}
${label(28, height - 17, footer, p.muted, 13, 500, 'start', bottom ? 279 : 376)}
</g>
</svg>
`
}

function languageRows(snapshot, t) {
  const rows = snapshot.languages.rows
  if (rows.length <= 6) return rows
  return [...rows.slice(0, 5), [t.other, sum(rows.slice(5).map(([, size]) => size))]]
}

function cardContent(card, s, t, locale) {
  if (card === 'overview') {
    const rows = ['repos', 'stars', 'forks', 'followers'].map(key => [t[key], s.overview[key]])
    const description = rows.map(([name, count]) => `${name} — ${number(count, locale)}`).join('. ')
    return [310, '@' + s.login, description, t.scope, p => rows.map(([name, count], i) => {
      const x = 28 + (i % 2) * 192
      const y = 126 + Math.floor(i / 2) * 68
      return rect(x, y, 184, 61, p.panel, 11, p.line) +
        label(x + 13, y + 27, compact(count, locale), p.text, 24, 750, 'start', 158) +
        label(x + 13, y + 48, name, p.muted, 14, 500, 'start', 158)
    }).join('')]
  }

  if (card === 'languages') {
    const rows = languageRows(s, t)
    const total = sum(rows.map(([, size]) => size))
    const counts = { count: s.languages.scanned, total: s.languages.eligible }
    const coverage = t.scanned.replace(/\{(count|total)\}/g, (_, key) => number(counts[key], locale))
    const description = rows.map(([name, size]) => `${name} — ${percent(size / total, locale)}`).join('. ')
    return [Math.max(205, 202 + rows.length * 24), t.bytes, `${description ? description + '.' : t.emptyLanguages} ${coverage}`, coverage, p => {
      if (!rows.length) return label(28, 145, t.emptyLanguages, p.text, 15)
      const colors = rows.map(([name], i) =>
        Object.hasOwn(languageColors, name) ? languageColors[name] : p.chart[i])
      let x = 28
      const segments = rows.map(([, size], i) => {
        const segment = 376 * size / total
        const block = rect(x, 126, segment, 12, colors[i])
        x += segment
        return block
      }).join('')
      const legend = rows.map(([name, size], i) => {
        const y = 166 + i * 24
        return dot(33, y - 5, colors[i], p) + label(47, y, name, p.text, 15, 550, 'start', 258) +
          label(404, y, percent(size / total, locale), p.muted, 15, 650, 'end', 90)
      }).join('')
      return `<defs><clipPath id="bar"><rect x="28" y="126" width="376" height="12" rx="6"/></clipPath></defs><g clip-path="url(#bar)">${segments}</g>${legend}`
    }]
  }

  if (card === 'projects') {
    const rows = s.projects
    const description = rows.map(row =>
      `${row.name} · ${row.language || t.unknown} · ${t.stars} ${number(row.stars, locale)} · ${t.forks} ${number(row.forks, locale)}`).join('. ')
    return [Math.max(205, 177 + rows.length * 59), t.projectsOrder,
      description || t.emptyProjects, '@' + s.login, p => {
        if (!rows.length) return label(28, 145, t.emptyProjects, p.text, 15)
        return rows.map((row, i) => {
          const y = 124 + i * 59
          const color = Object.hasOwn(languageColors, row.language) ? languageColors[row.language] : p.chart[5]
          return rect(28, y, 376, 51, p.panel, 11, p.line) +
            label(41, y + 21, row.name, p.text, 16, 700, 'start', 223) +
            dot(46, y + 37, color, p) +
            label(58, y + 41, row.language || t.unknown, p.muted, 13, 500, 'start', 206) +
            `<path d="m275 16 1.6 4.2 4.5.2-3.5 2.8 1.2 4.3-3.8-2.5-3.8 2.5 1.2-4.3-3.5-2.8 4.5-.2z" transform="translate(0 ${y + 3})" fill="${p.accent}"/>` +
            label(332, y + 31, compact(row.stars, locale), p.text, 13, 650, 'end', 47) +
            `<path d="M345 21v12m9-12v4a3 3 0 0 1-3 3h-6m0-7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-9 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" transform="translate(-6 ${y})" stroke="${p.accent}" stroke-width="1.4" fill="none"/>` +
            label(391, y + 31, compact(row.forks, locale), p.text, 13, 650, 'end', 38)
        }).join('')
      }]
  }

  const activity = s.activity
  const count = `${number(sum(activity.days), locale)} ${t.events}`
  return [270, t.eventPeriod, [count, activity.limited ? t.partial : ''].filter(Boolean).join('. '),
    activity.limited ? t.partial : '@' + s.login, p => {
      const max = Math.max(1, ...activity.days)
      const columns = activity.days.map((n, i) => {
        const h = n ? Math.max(3, n / max * 41) : 3
        return rect(28 + (377 / 30) * i, 190 - h, 8, h, n ? p.chart[0] : p.track, 2)
      }).join('')
      return label(28, 140, count, p.text, 22, 750) + columns +
        label(404, 210, t.today, p.muted, 13, 500, 'end')
    }]
}

export function renderCard(card, snapshot, locale, theme, messages, { branding = defaults.branding,
  animation = defaults.animation } = {}) {
  const t = copyFor(locale, messages)
  const [height, subtitle, description, footer, body] = cardContent(card, snapshot, t, locale)
  const resolvedHeight = branding.position === 'top-left' ? height : height - 33
  return artboard(resolvedHeight, t[card], subtitle, description, footer, theme, locale, body,
    snapshot.demo ? t.demo : '', branding, animation)
}

const markdown = value => xml(value).replace(/[\\*_\x60\[\]~|#!()+.\-]/g, '\\$&')
export function renderReport(snapshot, config) {
  const t = copyFor(config.locale, config.messages)
  const lines = [`# @${snapshot.login}`]
  if (snapshot.demo) lines.push('', markdown(t.demo))
  for (const card of config.cards) {
    lines.push('', `## ${markdown(t[card])}`, '')
    if (card === 'projects') {
      const rows = snapshot.projects.map(project => {
        const url = `https://github.com/${encodeURIComponent(snapshot.login)}/${encodeURIComponent(project.name)}`
        return `- [${markdown(project.name)}](${url}) · ${markdown(project.language || t.unknown)} · ${markdown(t.stars)} ${number(project.stars, config.locale)} · ${markdown(t.forks)} ${number(project.forks, config.locale)}`
      })
      lines.push(...(rows.length ? rows : [markdown(t.emptyProjects)]))
    } else {
      const [, subtitle, description, footer] = cardContent(card, snapshot, t, config.locale)
      lines.push(markdown(subtitle), '', markdown(description))
      if (card === 'overview') lines.push('', markdown(footer))
    }
  }
  return lines.join('\n') + '\n'
}

export function renderEmbed(config) {
  const t = copyFor(config.locale, config.messages)
  const columns = config.layout === 'columns' && config.cards.length > 1
  const linked = config.branding?.position !== 'hidden' && config.branding?.link
  const pictures = config.cards.map(card => {
    const motionSources = animationFor(config, card) === 'none' ? '' : `
  <source media="(prefers-reduced-motion: no-preference) and (prefers-color-scheme: dark)" srcset="./statvitra-cards/${card}-dark-motion.svg">
  <source media="(prefers-reduced-motion: no-preference) and (prefers-color-scheme: light)" srcset="./statvitra-cards/${card}-light-motion.svg">`
    const picture = `<picture>${motionSources}
  <source media="(prefers-color-scheme: dark)" srcset="./statvitra-cards/${card}-dark.svg">
  <img alt="${xml(t[card])}" src="./statvitra-cards/${card}-light.svg" width="${columns ? 320 : width}">
</picture>`
    return linked ? `<a href="${projectUrl}">${picture}</a>` : picture
  })
  const rows = []
  const rowSize = columns ? 2 : 1
  for (let i = 0; i < pictures.length; i += rowSize) {
    rows.push(`<p>\n${pictures.slice(i, i + rowSize).join('\n')}\n</p>`)
  }
  return [embedStart, ...rows, `[${markdown(t.textReport)}](./statvitra-cards/REPORT.md)`, embedEnd].join('\n\n') + '\n'
}
