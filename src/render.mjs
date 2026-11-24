import { copyFor } from './copy.mjs'
import { animationFor, defaults, usesColumns } from './config.mjs'
import languageColors from './linguist-colors.json' with { type: 'json' }

const palettes = {
  light: { bg: '#f8f8ff', panel: '#fff', line: '#dbdef0', text: '#141a32', muted: '#4c556f',
    accent: '#5137be', wash: '#ede8ff', track: '#e1e4f4', chart: ['#7559e8', '#00897f', '#db6b30', '#2e74d1', '#a33c76', '#7890ac'] },
  dark: { bg: '#111426', panel: '#1b2038', line: '#343d5c', text: '#f4f4ff', muted: '#b9c2dd',
    accent: '#c6b6ff', wash: '#29214b', track: '#2a324d', chart: ['#a58cff', '#49c7b3', '#ffa373', '#73b0ff', '#ed8bc1', '#8499b5'] }
}
const themeAccents = {
  ocean: ['#075e96', '#84d3ff', '#e5f4ff', '#17364d', '#007fc3', '#67c5ff'],
  forest: ['#19643a', '#85e5ae', '#e2f5e9', '#183d2a', '#248b50', '#67d195'],
  slate: ['#354667', '#c9dbff', '#e9eef9', '#293750', '#56729b', '#a0b9e5'],
  contrast: ['#222', '#fff', '#eee', '#333', '#222', '#fff']
}
const themeSurfaces = {
  ocean: [['#eff8ff', '#f9fcff', '#cce1ef'], ['#101b2b', '#18283e', '#304967']],
  forest: [['#f0f8f2', '#fafffb', '#ccdfd3'], ['#13231b', '#1b3225', '#375646']],
  slate: [['#f1f4fa', '#fbfcfe', '#d2dbe9'], ['#171b25', '#212736', '#3e4961']],
  contrast: [['#fff', '#fff', '#626262'], ['#0a0a0a', '#191919', '#a1a1a1']]
}

function palette(mode, theme, { transparent, colors }) {
  const base = palettes[mode]
  const preset = themeAccents[theme]
  const custom = colors?.[mode]
  if (!preset && !transparent && !custom) return base
  const i = mode === 'light' ? 0 : 1
  const [bg, panel, line] = themeSurfaces[theme]?.[i] ?? [base.bg, base.panel, base.line]
  return { ...base, panel, line,
    accent: preset?.[i] ?? base.accent, wash: preset?.[2 + i] ?? base.wash,
    chart: [custom?.accent ?? preset?.[4 + i] ?? base.chart[0], ...base.chart.slice(1)], ...custom,
    bg: transparent ? 'none' : custom?.bg ?? bg }
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
const languageColor = (name, fallback) => Object.hasOwn(languageColors, name) ? languageColors[name] : fallback
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

function artboard(bodyHeight, title, subtitle, description, footer, p, locale, body, demoLabel, appearance) {
  const { branding: brand, animation, gutter, cardStyle } = appearance
  const top = brand.position === 'top-left'
  const bottom = brand.position === 'bottom-right'
  const shift = (top ? 0 : 33) + (cardStyle.showTitle === false ? 31 : 0)
  const height = bodyHeight - shift
  const style = animation === 'none' ? '' : `<style>${effects[animation]}</style>`
  const mark = brand.position === 'hidden' ? '' : brandMark(p, brand.position, height)
  const branding = mark && brand.link ? `<a href="${projectUrl}" aria-label="StatVitra">${mark}</a>` : mark
  const sweep = animation === 'sweep' ?
    `<g transform="translate(28 ${116 - shift})"><path class="sweep" d="M0 0h376" stroke="${p.accent}" stroke-width="2" stroke-linecap="round" opacity="0"/></g>` : ''
  const canvasWidth = width + 2 * gutter
  const canvasHeight = height + 2 * gutter
  const origin = gutter ? -gutter : 0
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="${origin} ${origin} ${canvasWidth} ${canvasHeight}" role="img" aria-labelledby="title description" xml:lang="${locale}">
<title id="title">${xml(title)}</title>
<desc id="description">${xml(description)}</desc>
${style}
<g font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-variant-numeric="tabular-nums">
${rect(.5, .5, width - 1, height - 1, p.bg, cardStyle.radius, cardStyle.border ? p.line : 'none')}
${branding}
${demoLabel ? label(404, top ? 38 : 24, demoLabel, p.muted, 12, 600, 'end', 205) : ''}
${cardStyle.showTitle === false ? '' : label(28, 82 - shift, title, p.text, 28, 750)}
${label(28, 108 - shift, subtitle, p.muted, 15)}
${sweep}
<g transform="translate(0 ${-shift})"><g class="content">${body(p)}</g></g>
${rect(28, height - 41, 376, 1, p.line)}
${label(28, height - 17, footer, p.muted, 13, 500, 'start', bottom ? 279 : 376)}
</g>
</svg>
`
}

function metricCard(metrics, subtitle, footer, locale, t, icons) {
  const description = metrics.map(([name, value, format]) =>
    `${name} — ${value === null ? t.unavailable : format ? format(value, locale) : number(value, locale)}`).join('. ')
  return [174 + Math.ceil(metrics.length / 2) * 68, subtitle, description, footer, p => metrics.map(([name, value, format], i) => {
    const x = 28 + (i % 2) * 192
    const y = 126 + Math.floor(i / 2) * 68
    const tileWidth = i % 2 === 0 && i === metrics.length - 1 ? 376 : 184
    const mark = icons ? `<path d="M0 8h3V4H0zm5 0h3V1H5zm5 0h3V-3h-3z" transform="translate(${x + tileWidth - 27} ${y + 18})" fill="${p.accent}"/>` : ''
    return rect(x, y, tileWidth, 61, p.panel, 11, p.line) + mark +
      label(x + 13, y + 27, value === null ? '—' : (format ?? compact)(value, locale), p.text, 24, 750, 'start', icons ? 130 : 158) +
      label(x + 13, y + 48, name, p.muted, 14, 500, 'start', tileWidth - 26)
  }).join('')]
}

function overviewRows(snapshot, t, metrics) {
  return metrics.map(key => [t[key], snapshot.overview[key] ?? null])
}

function languageCard(s, t, locale, config) {
  const weights = config.languageWeights
  const all = s.languages.rows.map(([name, bytes]) => {
    const repos = s.languages.repositoryCounts?.[name] ?? 1
    return { name, bytes, repos, score: bytes ** weights.bytes * repos ** weights.repositories }
  }).sort((a, b) => b.score - a.score)
  const total = sum(all.map(row => row.score))
  const count = config.languageCount
  const aggregate = config.languageOther && all.length > count
  const rows = all.slice(0, aggregate ? count - 1 : count)
  if (aggregate) {
    const rest = all.slice(rows.length)
    rows.push({ name: t.other, other: true, score: sum(rest.map(row => row.score)),
      bytes: sum(rest.map(row => row.bytes)), repos: sum(rest.map(row => row.repos)) })
  }
  const coverageCounts = { count: s.languages.scanned, total: s.languages.eligible }
  const coverage = t.scanned.replace(/\{(count|total)\}/g, (_, key) => number(coverageCounts[key], locale))
  const format = row => {
    if (config.languageFormat === 'bytes') {
      return new Intl.NumberFormat(locale, { style: 'unit', unit: 'byte', notation: 'compact' }).format(row.bytes)
    }
    if (config.languageFormat === 'repositories') return number(row.repos, locale)
    return percent(row.score / total, locale)
  }
  const subtitle = config.languageFormat === 'bytes' ? t.languageBytes : config.languageFormat === 'repositories' ?
    t.languageRepos : weights.bytes !== 1 || weights.repositories !== 0 ? t.weightedLanguages : t.bytes
  const description = rows.map(row => `${row.name} — ${format(row)}`).join('. ')
  const layout = config.languageLayout
  const side = layout === 'donut' || layout === 'pie'
  const vertical = layout === 'donut-vertical'
  const legendY = vertical ? 265 : layout === 'bar' ? 166 : 145
  const height = rows.length ? Math.max(side ? 294 : 205, legendY + rows.length * 24 + 36) : 205
  return [height, subtitle, `${description || t.emptyLanguages}. ${coverage}`, coverage, p => {
    if (!rows.length) return label(28, 145, t.emptyLanguages, p.text, 15)
    const colors = rows.map(({ name, other }, i) =>
      other ? p.chart[i % p.chart.length] : languageColor(name, p.chart[i % p.chart.length]))
    let offset = 0
    const legendX = side ? 160 : 33
    const legend = rows.map((row, i) => {
      const y = legendY + i * 24
      return dot(legendX, y - 5, colors[i], p) + label(legendX + 14, y, row.name, p.text, 15, 550, 'start', side ? 139 : 258) +
        label(404, y, format(row), p.muted, 15, 650, 'end', 90)
    }).join('')
    if (layout === 'compact') return legend
    if (layout === 'bar') {
      const segments = rows.map((row, i) => {
        const length = 376 * row.score / total
        const segment = rect(28 + offset, 126, length, 12, colors[i])
        offset += length
        return segment
      }).join('')
      return `<defs><clipPath id="bar"><rect x="28" y="126" width="376" height="12" rx="6"/></clipPath></defs><g clip-path="url(#bar)">${rect(28, 126, 376, 12, p.track)}${segments}</g>${legend}`
    }
    const x = vertical ? 216 : 86
    const y = vertical ? 183 : 181
    const pie = layout === 'pie'
    const ring = (stroke, attrs = '') => `<circle cx="${x}" cy="${y}" r="${pie ? 26 : 46}" fill="none" stroke="${stroke}" stroke-width="${pie ? 52 : 13}" pathLength="100" transform="rotate(-90 ${x} ${y})" ${attrs}/>`
    const segments = rows.map((row, i) => {
      const length = Math.min(100, 100 * row.score / total)
      const segment = ring(colors[i], `stroke-dasharray="${length} ${100 - length}" stroke-dashoffset="${-offset}"`)
      offset += length
      return segment
    }).join('')
    return ring(p.track) + segments + legend
  }]
}

function dateLabel(value, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}

function elapsed(seconds, locale) {
  const minutes = Math.floor(seconds / 60)
  const duration = new Intl.DurationFormat(locale, { style: 'short', minutesDisplay: minutes ? 'auto' : 'always' })
  return duration.format({ hours: Math.floor(minutes / 60), minutes: minutes % 60 })
}

function cardContent(card, s, t, locale, config) {
  if (card === 'overview') {
    return metricCard(overviewRows(s, t, config.overviewMetrics), '@' + s.login, t.scope, locale, t, config.cardStyle.icons)
  }

  if (card === 'languages') return languageCard(s, t, locale, config)

  if (card === 'contributions') {
    const { from, until, includesPrivate, values } = s.contributions
    const metrics = config.contributionMetrics.map(key => [t[key], values[key] ?? null,
      key === 'mergeRate' ? percent : key === 'activityScore' ? (score, tag) => number(score, tag) + '/100' : undefined])
    return metricCard(metrics, `${dateLabel(from, locale)} – ${dateLabel(until, locale)}`,
      includesPrivate ? t.visibleContributions : t.publicContributions, locale, t, config.cardStyle.icons)
  }

  if (card === 'insights') {
    const { values, repos, trafficCovered, linesCovered } = s.insights
    const coverage = { traffic: trafficCovered, lines: linesCovered, total: repos }
    const footer = t.insightCoverage.replace(/\{(traffic|lines|total)\}/g, (_, key) => number(coverage[key], locale))
    return metricCard(Object.entries(values).map(([key, value]) => [t[key], value]), t.insightSubtitle, footer,
      locale, t, config.cardStyle.icons)
  }

  if (card === 'gists') {
    const rows = s.gists
    const description = rows.map(row => {
      const engagement = row.stars === undefined ? '' : ` · ${t.stars} ${number(row.stars, locale)} · ${t.forks} ${number(row.forks, locale)}`
      return `${row.name} · ${row.description || row.language || t.unknown} · ${t.files} ${number(row.files, locale)}${engagement}`
    }).join('. ')
    return [Math.max(205, 176 + rows.length * 64), t.gistSubtitle, description || t.emptyGists, '@' + s.login, p => {
      if (!rows.length) return label(28, 145, t.emptyGists, p.text, 15)
      return rows.map((row, i) => {
        const y = 124 + i * 64
        const color = languageColor(row.language, p.chart[0])
        const details = row.stars === undefined ? `${t.files} · ${number(row.files, locale)}` :
          `★ ${compact(row.stars, locale)} · ${t.forks} ${compact(row.forks, locale)}`
        return rect(28, y, 376, 56, p.panel, 11, p.line) +
          label(41, y + 23, row.name, p.text, 16, 700, 'start', 196) +
          label(391, y + 22, details, p.muted, 12, 600, 'end', 148) +
          dot(46, y + 42, color, p) + label(58, y + 46, row.description || row.language || t.unknown, p.muted, 13, 500, 'start', 323)
      }).join('')
    }]
  }

  if (card === 'coding') {
    const { rows, seconds } = s.coding
    const dates = s.coding.from && s.coding.until ?
      `${dateLabel(s.coding.from, locale)} – ${dateLabel(s.coding.until, locale)}` : t.languageTime
    const description = seconds === null ? t.emptyCoding :
      [elapsed(seconds, locale), ...rows.map(([name, time]) => `${name} — ${elapsed(time, locale)}`)].join('. ')
    return [Math.max(223, 220 + rows.length * 28), dates, description, 'WakaTime', p => {
      if (seconds === null) return label(28, 145, t.emptyCoding, p.text, 15)
      const max = Math.max(1, ...rows.map(([, n]) => n))
      return label(28, 146, elapsed(seconds, locale), p.text, 24, 750) + rows.map(([name, time], i) => {
        const y = 174 + i * 28
        const color = languageColor(name, p.chart[i % p.chart.length])
        return dot(33, y - 5, color, p) + label(47, y, name, p.text, 14, 550, 'start', 120) +
          rect(177, y - 9, 127, 5, p.track, 2) + rect(177, y - 9, 127 * time / max, 5, color, 2) +
          label(404, y, elapsed(time, locale), p.muted, 13, 600, 'end', 90)
      }).join('')
    }]
  }

  if (card === 'projects') {
    const rows = s.projects
    const description = rows.map(row =>
      [row.name, row.language || t.unknown, `${t.stars} ${number(row.stars, locale)}`,
        `${t.forks} ${number(row.forks, locale)}`, row.description].filter(Boolean).join(' · ')).join('. ')
    const subtitle = config.featuredRepositories.length ? t.selectedProjects :
      config.projectSelection === 'pinned' ? t.pinnedProjects : t.projectsOrder
    const withDescriptions = rows.some(row => row.description)
    const rowHeight = withDescriptions ? 74 : 59
    return [Math.max(205, 177 + rows.length * rowHeight), subtitle,
      description || t.emptyProjects, '@' + s.login, p => {
        if (!rows.length) return label(28, 145, t.emptyProjects, p.text, 15)
        return rows.map((row, i) => {
          const y = 124 + i * rowHeight
          const color = languageColor(row.language, p.chart[5])
          return rect(28, y, 376, rowHeight - 8, p.panel, 11, p.line) +
            label(41, y + 21, row.name, p.text, 16, 700, 'start', 223) +
            dot(46, y + 37, color, p) +
            label(58, y + 41, row.language || t.unknown, p.muted, 13, 500, 'start', 206) +
            `<path d="m275 16 1.6 4.2 4.5.2-3.5 2.8 1.2 4.3-3.8-2.5-3.8 2.5 1.2-4.3-3.5-2.8 4.5-.2z" transform="translate(0 ${y + 3})" fill="${p.accent}"/>` +
            label(332, y + 31, compact(row.stars, locale), p.text, 13, 650, 'end', 47) +
            `<path d="M345 21v12m9-12v4a3 3 0 0 1-3 3h-6m0-7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm9 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-9 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" transform="translate(-6 ${y})" stroke="${p.accent}" stroke-width="1.4" fill="none"/>` +
            label(391, y + 31, compact(row.forks, locale), p.text, 13, 650, 'end', 38) +
            (row.description ? label(41, y + 58, row.description, p.muted, 12, 500, 'start', 350) : '')
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

export function renderCard(card, snapshot, locale, theme, messages, options = {}) {
  const t = copyFor(locale, messages)
  const appearance = { ...defaults, gutter: 0, ...options }
  const [height, subtitle, description, footer, body] = cardContent(card, snapshot, t, locale, appearance)
  return artboard(height, t[card], subtitle, description, footer,
    palette(theme, appearance.cardThemes[card] ?? appearance.theme, appearance.cardStyle), locale, body,
    snapshot.demo ? t.demo : '', appearance)
}

const markdown = value => xml(value).replace(/[\r\n]+/g, ' ').replace(/[\\*_\x60\[\]~|#!()+.\-]/g, '\\$&')
export function renderReport(snapshot, config) {
  const t = copyFor(config.locale, config.messages)
  const lines = [`# @${snapshot.login}`]
  if (snapshot.demo) lines.push('', markdown(t.demo))
  for (const card of config.cards) {
    lines.push('', `## ${markdown(t[card])}`, '')
    if (card === 'overview') {
      const rows = overviewRows(snapshot, t, config.overviewMetrics ?? defaults.overviewMetrics)
      lines.push(...rows.map(([name, count]) => `- ${markdown(name)} — ${number(count, config.locale)}`))
      lines.push('', markdown(t.scope))
    } else if (card === 'projects') {
      const rows = snapshot.projects.map(project => {
        const url = `https://github.com/${encodeURIComponent(project.owner || snapshot.login)}/${encodeURIComponent(project.name)}`
        const details = project.description ? ` · ${markdown(project.description)}` : ''
        return `- [${markdown(project.name)}](${url}) · ${markdown(project.language || t.unknown)} · ${markdown(t.stars)} ${number(project.stars, config.locale)} · ${markdown(t.forks)} ${number(project.forks, config.locale)}${details}`
      })
      lines.push(...(rows.length ? rows : [markdown(t.emptyProjects)]))
    } else if (card === 'gists') {
      const rows = snapshot.gists.map(row => {
        const engagement = row.stars === undefined ? '' :
          ` · ${markdown(t.stars)} ${number(row.stars, config.locale)} · ${markdown(t.forks)} ${number(row.forks, config.locale)}`
        return `- [${markdown(row.name)}](https://gist.github.com/${encodeURIComponent(row.id)}) · ${markdown(row.description || row.language || t.unknown)} · ${markdown(t.files)} ${number(row.files, config.locale)} · ${markdown(t.comments)} ${number(row.comments, config.locale)}${engagement}`
      })
      lines.push(...(rows.length ? rows : [markdown(t.emptyGists)]))
    } else {
      const [, subtitle, description, footer] = cardContent(card, snapshot, t, config.locale, { ...defaults, ...config })
      lines.push(markdown(subtitle), '', markdown(description))
      if (card === 'contributions' || card === 'insights') lines.push('', markdown(footer))
    }
  }
  return lines.join('\n') + '\n'
}

export function renderEmbed(config, snapshot) {
  const t = copyFor(config.locale, config.messages)
  const columns = usesColumns(config)
  const linked = config.branding?.position !== 'hidden' && config.branding?.link
  const pictures = config.cards.map(card => {
    const motionSources = animationFor(config, card) === 'none' ? '' : `
  <source media="(prefers-reduced-motion: no-preference) and (prefers-color-scheme: dark)" srcset="./statvitra-cards/${card}-dark-motion.svg">
  <source media="(prefers-reduced-motion: no-preference) and (prefers-color-scheme: light)" srcset="./statvitra-cards/${card}-light-motion.svg">`
    const picture = `<picture>${motionSources}
  <source media="(prefers-color-scheme: dark)" srcset="./statvitra-cards/${card}-dark.svg">
  <img alt="${xml(t[card])}" src="./statvitra-cards/${card}-light.svg" width="${columns ? 320 : width}"${columns ? ' align="top"' : ''}>
</picture>`
    let href = linked ? projectUrl : ''
    if (!href && config.linkFeaturedCards && card === 'projects' && snapshot?.projects?.length === 1) {
      const [repo] = snapshot.projects
      href = `https://github.com/${encodeURIComponent(repo.owner || snapshot.login)}/${encodeURIComponent(repo.name)}`
    }
    if (!href && config.linkFeaturedCards && card === 'gists' && snapshot?.gists?.length === 1) {
      href = `https://gist.github.com/${encodeURIComponent(snapshot.gists[0].id)}`
    }
    return href ? `<a href="${xml(href)}">${picture}</a>` : picture
  })
  const rows = []
  const rowSize = columns ? 2 : 1
  for (let i = 0; i < pictures.length; i += rowSize) {
    rows.push(pictures.slice(i, i + rowSize).join('\n'))
  }
  // Explicit row breaks pair cards without introducing extra gaps between wrapped rows.
  const blocks = columns ? [rows.join('\n<br>\n')] : rows
  const paragraphs = blocks.map(row => `<p>\n${row}\n</p>`)
  if (config.showReportLink) paragraphs.push(`[${markdown(t.textReport)}](./statvitra-cards/REPORT.md)`)
  return [embedStart, ...paragraphs, embedEnd].join('\n\n') + '\n'
}
