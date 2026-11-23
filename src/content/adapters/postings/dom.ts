import { normText } from '@/lib/job-dedupe'

// ---------------------------------------------------------------------------
// DOM helpers shared by the posting adapters and lib/job-capture.ts. Everything
// here works on a DOMParser document: no layout, no innerText, no location.
// ---------------------------------------------------------------------------

/** Blocks that read as paragraphs — a blank line around them. */
const PARAGRAPH_TAGS = new Set([
  'P', 'UL', 'OL', 'DL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'PRE', 'TABLE',
  'HEADER', 'FOOTER', 'ASIDE', 'MAIN', 'NAV', 'FIELDSET', 'FORM', 'HR', 'ADDRESS', 'FIGURE', 'DETAILS',
])
/** Blocks that read as lines — one newline. */
const LINE_TAGS = new Set(['DIV', 'LI', 'TR', 'TD', 'TH', 'DD', 'DT', 'FIGCAPTION', 'SUMMARY'])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SELECT', 'OPTION', 'SVG', 'IFRAME', 'HEAD', 'TITLE'])

/** jd-capture's tidy(): collapse runs, keep paragraph breaks, trim every line. */
export function tidy(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** textContent with a newline at every block boundary — "Responsibilities:\nOwn…", not "Responsibilities:Own…". */
export function blockText(node: Node | null | undefined): string {
  if (!node) return ''
  const out: string[] = []
  let trailing = 2 // newlines already at the end of `out` — boundaries never stack
  const newline = (count: number): void => {
    while (trailing < count) {
      out.push('\n')
      trailing++
    }
  }
  const text = (value: string): void => {
    if (!value) return
    if (!value.trim()) {
      if (trailing === 0) out.push(' ')
      return
    }
    out.push(value)
    trailing = 0
  }
  const walk = (n: Node): void => {
    if (n.nodeType === 3) {
      text(n.nodeValue ?? '')
      return
    }
    if (n.nodeType !== 1) return
    const el = n as Element
    const tag = el.tagName.toUpperCase()
    if (SKIP_TAGS.has(tag)) return
    if (tag === 'BR') {
      newline(1)
      return
    }
    const boundary = PARAGRAPH_TAGS.has(tag) ? 2 : LINE_TAGS.has(tag) ? 1 : 0
    if (boundary) newline(boundary)
    if (tag === 'LI') text('• ')
    for (const child of Array.from(el.childNodes)) walk(child)
    if (boundary) newline(boundary)
  }
  walk(node)
  return tidy(out.join(''))
}

/** blockText of a clone with the excluded subtrees removed (forms, headers, "similar jobs"). */
export function blockTextExcluding(el: Element | null | undefined, exclude: string[]): string {
  if (!el) return ''
  const clone = el.cloneNode(true) as Element
  for (const selector of exclude) {
    for (const junk of Array.from(clone.querySelectorAll(selector))) junk.remove()
  }
  return blockText(clone)
}

/** One-line text of an element, or null when empty / implausibly long. */
export function oneLine(el: Element | null | undefined, max = 300): string | null {
  if (!el) return null
  const text = normText(blockText(el))
  return text.length > 0 && text.length < max ? text : null
}

export function firstEl(root: ParentNode | null | undefined, selectors: string[]): Element | null {
  if (!root) return null
  for (const selector of selectors) {
    let el: Element | null = null
    try {
      el = root.querySelector(selector)
    } catch {
      el = null
    }
    if (el) return el
  }
  return null
}

/** The first selector whose element has one-line text. */
export function firstText(root: ParentNode | null | undefined, selectors: string[], max = 300): string | null {
  if (!root) return null
  for (const selector of selectors) {
    let els: Element[] = []
    try {
      els = Array.from(root.querySelectorAll(selector))
    } catch {
      els = []
    }
    for (const el of els) {
      const text = oneLine(el, max)
      if (text) return text
    }
  }
  return null
}

export function metaContent(doc: Document, property: string): string | null {
  const el = doc.querySelector(`meta[property="${property}"]`) ?? doc.querySelector(`meta[name="${property}"]`)
  const text = normText(el?.getAttribute('content'))
  return text.length > 0 && text.length < 300 ? text : null
}

const COMPANY_NOISE = /\s*[-–—|:·]?\s*\b(careers?|jobs?|job opportunities|job openings|talent acquisition|talent|hiring|career site|careers site|recruiting|employment|opportunities)\b\s*$/i

/** "at Hooli" → "Hooli"; "Honeywell Careers" → "Honeywell"; "Acme, Inc. | Jobs" → "Acme, Inc.". */
export function cleanCompany(value: string | null | undefined): string | null {
  let text = normText(value)
  if (!text) return null
  text = text.replace(/^(?:(?:jobs|careers|work|join us)\s+)?(at|by|with)\s+/i, '')
  for (let i = 0; i < 3; i++) {
    const next = text.replace(COMPANY_NOISE, '').trim()
    if (next === text) break
    if (next.length < 2) return null // the whole string was furniture ("Careers")
    text = next
  }
  text = text.replace(/[\s|·:–—-]+$/g, '').trim()
  return text.length > 0 && text.length < 200 ? text : null
}

export const AGE_RE = /^(today|yesterday|just now|(?:\d+\+?|an?)\s+(?:minute|hour|day|week|month|year)s?\s+ago)$/i

/** "Posted 3 Days Ago" → "3 Days Ago"; "Reposted 2 weeks ago" → "2 weeks ago"; "2 days ago" → itself; else null. */
export function parsePostedAge(value: string | null | undefined): string | null {
  const text = normText(value)
  if (!text || text.length > 60) return null
  const stripped = text.replace(/^(?:re)?posted\s+(?:on\s+)?/i, '').replace(/[.]+$/, '').trim()
  return AGE_RE.test(stripped) ? stripped : null
}

/** acme.wd5.myworkdayjobs.com → acme; careers-acme.icims.com → acme; else null. */
export function tenantSlug(hostname: string, ats: string): string | null {
  const host = hostname.toLowerCase()
  if (ats === 'workday') {
    const m = /^([a-z0-9-]+)\.wd\d+\.myworkday(?:jobs|site)\.com$/.exec(host)
    return m ? m[1] : null
  }
  if (ats === 'icims') {
    const m = /^(?:careers|jobs|careers-|jobs-)?-?([a-z0-9-]+)\.icims\.com$/.exec(host)
    return m ? m[1].replace(/^(careers|jobs)-/, '') : null
  }
  return null
}

/** careers.example-mfg.com → example-mfg.com; www.acme.com → acme.com. */
export function companyDomain(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^(www|careers?|jobs?|apply|recruiting|talent|hire|join|work)\./, '')
  return host.includes('.') ? host : null
}
