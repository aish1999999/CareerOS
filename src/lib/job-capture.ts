import type { JobAts, JobInsert, JobSource, JobWorkType } from '@contract/entities'
import { ENTITY_COLUMNS } from '@contract/entities'
import { splitTitle } from '@/content/context'
import { classifyPosting, type FrameRef } from '@/content/adapters/postings/index'
import {
  blockText,
  blockTextExcluding,
  cleanCompany,
  metaContent,
  oneLine,
  parsePostedAge,
  tenantSlug,
} from '@/content/adapters/postings/dom'
import type { MatchedBy, PartialPosting } from '@/content/adapters/postings/types'
import { atsReqIdFromUrl, dedupeKey, normText, pyDate, pyInt, pyWorkType, urlKey } from '@/lib/job-dedupe'
import { flushHubOutbox, getHubDeadLetters, getHubOutbox, hubUpsert } from '@/lib/hub'

// ---------------------------------------------------------------------------
// Job-posting capture → `jobs` row (Stage 4 part 2).
//
// One button press (D13 — never on page open) reads the active tab through
// chrome.scripting, classifies the source, layers JSON-LD → microdata → posting
// adapter → meta → title heuristics into a JobCapture, derives what the mapper
// derives (sponsorship, citizenship — the same regexes as jobs_import.py), and
// upserts the row through the outbox (lib/hub.ts). The dedupe key is the
// mapper's own (lib/job-dedupe.ts), so a CSV import of the same posting merges.
//
// Everything before the outbox is pure and runs on a DOMParser document — the
// injected function only returns HTML. jd-capture.ts (the Tailor form's JD
// grab) is untouched and keeps its own path.
// ---------------------------------------------------------------------------

export type CaptureOrigin = 'page' | 'tailor-form'

export interface JobCapture {
  origin: CaptureOrigin
  source: JobSource
  ats: JobAts
  matchedBy: MatchedBy
  adapter: string
  sourceUrl: string | null
  canonicalUrl: string | null
  companyDomain: string | null
  pageTitle: string | null
  title: string | null
  company: string | null
  location: string | null
  description: string | null
  postedAt: string | null
  postedAgeText: string | null
  applicantCount: number | null
  applicantText: string | null
  experienceLevel: string | null
  employmentType: string | null
  workType: JobWorkType | null
  workTypeText: string | null
  sector: string | null
  /** What the page or its URL exposes; the KEY and the column only ever use the URL's (see buildJobRow). */
  atsReqId: string | null
  linkedinJobId: string | null
  /** The Tailor form's title / company when they differ from the page's — recorded, never the identity. */
  formTitle: string | null
  formCompany: string | null
  /** The JSON-LD JobPosting minus its description, strings capped — goes to raw._posting. */
  posting: Record<string, unknown> | null
  /** Which layer supplied each field — goes to raw._layers. */
  layers: Record<string, string>
  truncated: boolean
  descriptionFrame: string | null
}

/** The mapper's CAPTURE_MATRIX, same order (jobs_import.py). */
export const CAPTURE_MATRIX = [
  'title', 'company', 'description', 'experience_level', 'sponsorship',
  'posted_at', 'posted_age_text', 'source_url', 'work_type', 'sector', 'location',
  'applicant_count',
] as const

export type Presence = 'captured' | 'derived' | 'missing'

const DESCRIPTION_MIN = 200
const DESCRIPTION_MAX = 60000

// -- small helpers ----------------------------------------------------------------

function clean(value: unknown, max = 300): string | null {
  const text = normText(value)
  return text.length > 0 && text.length < max ? text : null
}

/** slice() that never leaves a lone high surrogate at the cut (Postgres rejects the JSON). */
function capChars(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut
}

const APPLICANTS_RE = /^(?:over\s+|more than\s+)?\d[\d,]*\+?\s+(?:applicants?|people clicked apply)$/i
const FIRST_N_RE = /\bfirst\s+\d+\s+applicants?\b/i

/** One grammar for every source of applicant text: a count, or the text alone when it is a ceiling. */
export function parseApplicants(value: string | null | undefined): { count: number | null; text: string | null } {
  const text = normText(value)
  if (!text) return { count: null, text: null }
  if (FIRST_N_RE.test(text)) return { count: null, text }
  if (APPLICANTS_RE.test(text)) return { count: pyInt(text), text }
  return { count: null, text: null }
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

/** JSON-LD descriptions are HTML (sometimes double-encoded). */
function htmlToText(html: string): string {
  let text = blockText(parseHtml(html).body)
  if (/&lt;|<\/?(?:p|br|li|ul|ol|div|strong|b)\b/i.test(text)) text = blockText(parseHtml(text).body)
  return text
}

function hostOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function precedes(el: Element, descEl: Element | null): boolean {
  if (!descEl) return true
  return (el.compareDocumentPosition(descEl) & 4) !== 0 // DOCUMENT_POSITION_FOLLOWING
}

// -- 1. JSON-LD ----------------------------------------------------------------------

interface JsonLd {
  title: string | null
  company: string | null
  location: string | null
  description: string | null
  postedAt: string | null
  industry: string | null
  remote: boolean
  identifier: string | null
  url: string | null
  employmentType: string | null
  posting: Record<string, unknown>
}

function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object' || node === null) return null
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return obj
  if (obj['@graph']) return findJobPosting(obj['@graph'])
  return null
}

function joinStrings(value: unknown): string | null {
  if (typeof value === 'string') return clean(value)
  if (Array.isArray(value)) return clean(value.filter((v) => typeof v === 'string').join(', '))
  return null
}

function capPosting(posting: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(posting)) {
    if (key === 'description' || key === '@context') continue
    if (typeof value === 'string') out[key] = value.length > 2000 ? capChars(value, 2000) + '…' : value
    else if (value !== null && typeof value === 'object') {
      const json = JSON.stringify(value)
      out[key] = json.length > 2000 ? capChars(json, 2000) + '…' : value
    } else out[key] = value
  }
  return out
}

function jsonLdLocation(posting: Record<string, unknown>): string | null {
  const jobLocation = posting.jobLocation
  const first = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation
  if (typeof first === 'string') return clean(first)
  if (!first || typeof first !== 'object') return null
  const address = (first as Record<string, unknown>).address
  if (address && typeof address === 'object') {
    const a = address as Record<string, unknown>
    const parts = [clean(a.addressLocality), clean(a.addressRegion)].filter(Boolean)
    if (parts.length) return parts.join(', ')
    return clean(a.addressCountry) ?? (typeof a.addressCountry === 'object' && a.addressCountry ? clean((a.addressCountry as Record<string, unknown>).name) : null)
  }
  if (typeof address === 'string') return clean(address)
  return clean((first as Record<string, unknown>).name)
}

function extractJsonLd(doc: Document): JsonLd | null {
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    let parsed: unknown
    try {
      parsed = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    const posting = findJobPosting(parsed)
    if (!posting) continue
    const org = posting.hiringOrganization as Record<string, unknown> | string | undefined
    const identifier = posting.identifier as Record<string, unknown> | string | undefined
    const locationType = posting.jobLocationType
    const description = typeof posting.description === 'string' ? htmlToText(posting.description) : null
    return {
      title: clean(posting.title),
      company: typeof org === 'string' ? clean(org) : clean(org?.name),
      location: jsonLdLocation(posting),
      description: description && description.length >= DESCRIPTION_MIN ? description : null,
      postedAt: pyDate(posting.datePosted),
      industry: joinStrings(posting.industry),
      remote: locationType === 'TELECOMMUTE' || (Array.isArray(locationType) && locationType.includes('TELECOMMUTE')),
      identifier: typeof identifier === 'string' ? clean(identifier, 80) : clean(identifier?.value, 80),
      url: typeof posting.url === 'string' ? posting.url : null,
      employmentType: joinStrings(posting.employmentType),
      posting: capPosting(posting),
    }
  }
  return null
}

// -- 2. schema.org microdata (SuccessFactors CSB, SmartRecruiters) ---------------------

interface Microdata {
  title: string | null
  company: string | null
  location: string | null
  description: string | null
  descriptionEl: Element | null
  postedAt: string | null
  industry: string | null
  employmentType: string | null
}

function extractMicrodata(doc: Document): Microdata | null {
  const scope = doc.querySelector('[itemtype*="JobPosting"]')
  if (!scope) return null
  const org = scope.querySelector('[itemprop="hiringOrganization"]')
  const loc = scope.querySelector('[itemprop="jobLocation"]')
  const locality = oneLine(loc?.querySelector('[itemprop="addressLocality"]'))
  const region = oneLine(loc?.querySelector('[itemprop="addressRegion"]'))
  const descriptionEl = scope.querySelector('[itemprop="description"]')
  const description = descriptionEl ? blockText(descriptionEl) : null
  const posted = scope.querySelector('[itemprop="datePosted"]')
  return {
    title: oneLine(scope.querySelector('[itemprop="title"]')),
    company: oneLine(org?.querySelector('[itemprop="name"]') ?? org),
    location: [locality, region].filter(Boolean).join(', ') || oneLine(loc),
    description: description && description.length >= DESCRIPTION_MIN ? description : null,
    descriptionEl,
    postedAt: pyDate(posted?.getAttribute('content') ?? posted?.getAttribute('datetime') ?? oneLine(posted)),
    industry: oneLine(scope.querySelector('[itemprop="industry"]')),
    employmentType: oneLine(scope.querySelector('[itemprop="employmentType"]')),
  }
}

// -- 3. page-title parsers (before splitTitle, which mislabels these) -------------------

interface TitleParts {
  role?: string | null
  company?: string | null
  location?: string | null
}

function parseSiteTitle(title: string | null, source: JobSource, ats: JobAts): TitleParts {
  if (!title) return {}
  if (source === 'linkedin') {
    let m = /^(?:\(\d+\)\s*)?(.+?)\s+\|\s+(.+?)\s+\|\s+LinkedIn$/i.exec(title)
    if (m) return { role: clean(m[1]), company: clean(m[2]) }
    m = /^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)\s+\|\s+LinkedIn$/i.exec(title)
    if (m) return { company: clean(m[1]), role: clean(m[2]), location: clean(m[3]) }
    return {}
  }
  if (ats === 'greenhouse') {
    const m = /^Job Application for (.+?) at (.+)$/i.exec(title)
    if (m) return { role: clean(m[1]), company: clean(m[2]) }
  }
  return {}
}

// -- 4. the description ladder --------------------------------------------------------

const SEMANTIC: [string, string][] = [
  ['[data-automation-id="jobPostingDescription"]', 'main'],
  ['#job-details', 'main'],
  ['.job-description', 'main'],
  ['[class*="jobDescription"]', 'main'],
  ['[class*="job-description"]', 'main'],
  ['article', 'article'],
  ['main', 'main'],
]
const DESCRIPTION_JUNK = ['nav', 'header', 'footer', 'form', 'script', 'style', 'button']
const SEE_MORE = /\n?\s*(?:…\s*)?(?:see|show)\s+(?:more|less)\s*$/i

interface DescriptionPick {
  text: string
  el: Element | null
  layer: string
  truncated: boolean
}

function stripSeeMore(text: string): string {
  return text.replace(SEE_MORE, '').replace(SEE_MORE, '').trim()
}

/** Elements that contain page chrome — computed once, bottom-up from the chrome itself. */
function chromeAncestors(doc: Document): Set<Element> {
  const out = new Set<Element>()
  for (const chrome of Array.from(doc.querySelectorAll('nav, header, footer'))) {
    let node: Element | null = chrome
    while (node) {
      if (out.has(node)) break
      out.add(node)
      node = node.parentElement
    }
  }
  return out
}

function pickDescription(doc: Document, adapter: PartialPosting, ld: JsonLd | null, md: Microdata | null): DescriptionPick | null {
  const container = adapter.description ? stripSeeMore(adapter.description) : ''
  const containerClamped = !!adapter.description && (SEE_MORE.test(adapter.description) || !!doc.querySelector('[class*="show-more"], [class*="see-more"]'))
  const fromLd = ld?.description ? stripSeeMore(ld.description) : ''
  // the region the scans use even when the structured text wins
  const anchor = adapter.descriptionEl ?? md?.descriptionEl ?? null
  if (container.length >= DESCRIPTION_MIN) {
    if (fromLd.length >= DESCRIPTION_MIN && container.length < 0.6 * fromLd.length) {
      return { text: fromLd, el: anchor, layer: 'jsonld', truncated: false }
    }
    return { text: container, el: anchor, layer: 'adapter', truncated: containerClamped && container.length < 400 }
  }
  if (fromLd.length >= DESCRIPTION_MIN) {
    const fallback = anchor ?? SEMANTIC.map(([selector]) => doc.querySelector(selector)).find((el) => el && (el.textContent ?? '').length > 400) ?? null
    return { text: fromLd, el: fallback, layer: 'jsonld', truncated: false }
  }
  if (md?.description && md.description.length >= DESCRIPTION_MIN) {
    return { text: stripSeeMore(md.description), el: md.descriptionEl, layer: 'microdata', truncated: false }
  }
  for (const [selector, layer] of SEMANTIC) {
    const el = doc.querySelector(selector)
    if (!el || (el.textContent ?? '').length <= 400) continue // no clone for a rung that cannot win
    const text = stripSeeMore(blockTextExcluding(el, DESCRIPTION_JUNK))
    if (text.length > 400) return { text, el, layer, truncated: false }
  }
  const chrome = chromeAncestors(doc)
  let best: Element | null = null
  let bestLength = 0
  for (const el of Array.from(doc.querySelectorAll('div, section, td'))) {
    if (chrome.has(el)) continue
    const length = (el.textContent ?? '').length
    if (length > bestLength && length < 40000) {
      best = el
      bestLength = length
    }
  }
  if (best) {
    const text = stripSeeMore(blockTextExcluding(best, DESCRIPTION_JUNK))
    if (text.length > 400) return { text, el: best, layer: 'largest-block', truncated: false }
  }
  const body = stripSeeMore(blockTextExcluding(doc.body, DESCRIPTION_JUNK))
  if (body.length > 400) return { text: body, el: doc.body, layer: 'body', truncated: false }
  return null
}

// -- 5. region scans (selector-free, anchored, before the description) ------------------

const EXCLUDE_SEL = [
  'nav', 'aside', 'footer', '[role="navigation"]', '[role="contentinfo"]', 'select', 'option', 'label', 'input',
  'textarea', '[role="option"]', '[role="checkbox"]', '[role="radio"]', '[role="tab"]', '[aria-pressed]',
  '[aria-haspopup]', '[role="menu"]', '[role="listbox"]', 'script', 'style', 'noscript', 'template',
].join(', ')

interface Piece {
  text: string
  el: Element
  inLink: boolean
}

function scanPieces(region: Element, descEl: Element | null): Piece[] {
  const doc = region.ownerDocument
  const walker = doc.createTreeWalker(region, 4) // SHOW_TEXT
  const pieces: Piece[] = []
  const seenParents = new Set<Element>()
  const excluded = new Map<Element, boolean>()
  // memoised up the ancestor chain: siblings and cousins share the verdict, so this is O(n), not O(n × depth)
  const isExcluded = (el: Element): boolean => {
    const chain: Element[] = []
    let node: Element | null = el
    let verdict = false
    while (node && node !== region.parentElement) {
      const known = excluded.get(node)
      if (known !== undefined) {
        verdict = known
        break
      }
      chain.push(node)
      if (node.matches(EXCLUDE_SEL)) {
        verdict = true
        break
      }
      node = node.parentElement
    }
    for (const seen of chain) excluded.set(seen, verdict)
    return verdict
  }
  const push = (text: string, el: Element): void => {
    for (const part of text.split(/\s*[·•|]\s*/)) {
      const piece = part.trim()
      if (piece.length >= 2 && piece.length <= 120) pieces.push({ text: piece, el, inLink: !!el.closest('a[href]') })
    }
  }
  let node: Node | null = walker.nextNode()
  let guard = 0
  while (node && guard++ < 20000) {
    const parent = node.parentElement
    if (parent && !(descEl && descEl.contains(node)) && !isExcluded(parent)) {
      const own = normText(node.nodeValue)
      if (own.length >= 2 && own.length <= 120) push(own, parent)
      if (!seenParents.has(parent) && parent.childNodes.length <= 8) {
        seenParents.add(parent)
        const whole = normText(parent.textContent)
        if (whole !== own && whole.length >= 2 && whole.length <= 160) push(whole, parent)
      }
    }
    node = walker.nextNode()
  }
  return pieces
}

function regionOf(doc: Document, titleEl: Element | null, descEl: Element | null): Element {
  if (!titleEl || !descEl) return doc.body ?? doc.documentElement
  let node: Element | null = titleEl
  while (node && !node.contains(descEl)) node = node.parentElement
  return node ?? doc.body ?? doc.documentElement
}

const LEVEL_LABEL_RE = /^(?:seniority|experience)\s+level\s*[:\-]?\s*(.*)$/i
const LEVEL_PILLS = new Set(['internship', 'entry level', 'mid-senior level', 'not applicable'])
const LEVEL_VALUES = new Set([...LEVEL_PILLS, 'associate', 'director', 'executive'])
const WORK_LABEL_RE = /^(?:workplace type|work arrangement|remote type|location type|work location|workplace)\s*[:\-]?\s*(.*)$/i
const WORK_SENTENCE_RE = /workplace type is (remote|hybrid|on-?site)/i
const WORK_PILL_RE = /^(remote|hybrid|on-?site|in[- ]office)$/i
const EMPLOYMENT_RE = /^(full[- ]time|part[- ]time|contract|temporary|internship|volunteer|freelance)$/i
const REQ_WORD = '(?:(?:job|posting|position|vacancy)\\s*(?:id|identification|#|no\\.?|number|reference|ref\\.?)|req(?:uisition)?\\s*(?:id|identification|#|no\\.?|number|reference|ref\\.?)?)'
const REQ_VALUE = '([A-Za-z]{0,4}-?\\d{3,}[\\w-]*|\\d{4}-\\d{3,})'
const REQ_INLINE_RE = new RegExp(`^${REQ_WORD}\\s*[:#]?\\s*${REQ_VALUE}$`, 'i')
const REQ_LABEL_RE = new RegExp(`^${REQ_WORD}\\s*[:#]?$`, 'i')
const REQ_VALUE_RE = new RegExp(`^${REQ_VALUE}$`)
const POSTED_DATE_RE = /^posted(?:\s+on|\s+date)?\s*[:\-]?\s*(.+)$/i
const POSTED_LABEL_RE = /^(?:posted(?:\s+on|\s+date)?|posting date|date posted)\s*[:\-]?$/i

interface Scans {
  postedAgeText: string | null
  postedAt: string | null
  applicantCount: number | null
  applicantText: string | null
  experienceLevel: string | null
  employmentType: string | null
  workType: JobWorkType | null
  workTypeText: string | null
  sector: string | null
  atsReqId: string | null
}

function scanRegion(region: Element, descEl: Element | null): Scans {
  const pieces = scanPieces(region, descEl)
  const out: Scans = {
    postedAgeText: null, postedAt: null, applicantCount: null, applicantText: null,
    experienceLevel: null, employmentType: null, workType: null, workTypeText: null, sector: null, atsReqId: null,
  }
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]
    const next = pieces[i + 1]
    const before = precedes(piece.el, descEl)
    if (before) {
      if (!out.postedAgeText) out.postedAgeText = parsePostedAge(piece.text)
      if (!out.postedAt) {
        const m = POSTED_DATE_RE.exec(piece.text)
        const date = (m ? pyDate(m[1]) : null) ?? (POSTED_LABEL_RE.test(piece.text) && next ? pyDate(next.text) : null)
        if (date) out.postedAt = date
      }
      if (!out.applicantText) {
        const applicants = parseApplicants(piece.text)
        if (applicants.text) {
          out.applicantText = applicants.text
          out.applicantCount = applicants.count
        }
      }
      if (!out.experienceLevel) {
        const m = LEVEL_LABEL_RE.exec(piece.text)
        if (m) {
          const value = clean(m[1], 40) ?? (next && next.text.length <= 40 ? next.text : null)
          if (value && !LEVEL_LABEL_RE.test(value)) out.experienceLevel = value
        } else if (LEVEL_PILLS.has(piece.text.toLowerCase()) && !piece.inLink) {
          out.experienceLevel = piece.text
        }
      }
      if (!out.employmentType && EMPLOYMENT_RE.test(piece.text) && !piece.inLink) out.employmentType = piece.text
      if (!out.workType) {
        const label = WORK_LABEL_RE.exec(piece.text)
        const sentence = WORK_SENTENCE_RE.exec(piece.text)
        if (label) {
          const value = clean(label[1], 40) ?? (next ? next.text : null)
          const type = pyWorkType(value)
          if (type) {
            out.workType = type
            out.workTypeText = value
          }
        } else if (sentence) {
          out.workType = pyWorkType(sentence[1])
          out.workTypeText = sentence[1]
        } else if (WORK_PILL_RE.test(piece.text) && !piece.inLink) {
          out.workType = pyWorkType(piece.text)
          out.workTypeText = piece.text
        }
      }
    }
    if (!out.sector) {
      if (/^industr(?:y|ies)\s*[:\-]?$/i.test(piece.text) && next && next.text.length <= 80 && !LEVEL_VALUES.has(next.text.toLowerCase())) out.sector = next.text
      else {
        const m = /^industr(?:y|ies)\s*[:\-]\s*(.+)$/i.exec(piece.text)
        if (m) out.sector = clean(m[1], 80)
      }
    }
    if (!out.atsReqId) {
      const inline = REQ_INLINE_RE.exec(piece.text)
      if (inline) out.atsReqId = inline[1]
      else if (REQ_LABEL_RE.test(piece.text) && next && REQ_VALUE_RE.test(next.text)) out.atsReqId = next.text
    }
  }
  return out
}

// -- 6. derived fields (the mapper's own rules, jobs_import.py:264-273) -----------------

export type DerivedSponsorship = 'available' | 'not_available' | null

export function deriveSponsorship(description: string): DerivedSponsorship {
  const low = description.toLowerCase()
  if (/(no|not|unable to|will not|cannot|do not)\s+(offer|provide|sponsor)[^.]{0,40}(sponsorship|visa)/.test(low)
    || low.includes('without sponsorship') || low.includes('sponsorship is not available')) return 'not_available'
  if (/(sponsorship (is )?available|will sponsor|able to sponsor)/.test(low)) return 'available'
  return null
}

export function deriveCitizenRequired(description: string): boolean {
  return /\bu\.?s\.?\s+citizen(ship)?\s+(is\s+)?required\b|must be a u\.?s\.? citizen/.test(description.toLowerCase())
}

export function deriveYearsMin(description: string): number | null {
  const re = /\b(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?)?\s*(?:years?|yrs?)\b/gi
  let best: number | null = null
  for (const m of description.matchAll(re)) {
    const index = m.index ?? 0
    const after = description.slice(index + m[0].length, index + m[0].length + 60)
    const before = description.slice(Math.max(0, index - 30), index)
    if (!/experience|\bexp\b/i.test(after) && !/experience/i.test(before)) continue
    if (/\b(age|old)\b/i.test(before)) continue
    const n = Number(m[1])
    if (n > 0 && n <= 30) best = best === null ? n : Math.min(best, n)
  }
  return best
}

// -- 7. the capture ---------------------------------------------------------------------

export interface ExtractOptions {
  frames?: FrameRef[]
  pageTitle?: string | null
}

function pick<T>(layers: Record<string, string>, field: string, candidates: [T | null | undefined, string][]): T | null {
  for (const [value, layer] of candidates) {
    if (value !== null && value !== undefined && value !== '') {
      layers[field] = layer
      return value
    }
  }
  return null
}

function slugCompany(url: URL, ats: JobAts): string | null {
  const tenant = tenantSlug(url.hostname, ats)
  if (tenant) return tenant
  if (ats === 'greenhouse' || ats === 'lever' || ats === 'ashby') {
    const first = url.pathname.split('/').filter(Boolean)[0]
    return first && !/^(jobs?|embed)$/i.test(first) ? first : null
  }
  return null
}

export function extractJobCapture(doc: Document, url: string, opts: ExtractOptions = {}): JobCapture {
  const layers: Record<string, string> = {}
  let urlObj: URL
  try {
    urlObj = new URL(url)
  } catch {
    urlObj = new URL('https://invalid.local/')
  }
  const frames = opts.frames ?? []
  const cls = classifyPosting(urlObj, doc, frames)
  const pageTitle = clean(opts.pageTitle || doc.title, 400)

  let ld = extractJsonLd(doc)
  const md = extractMicrodata(doc)
  let ad = cls.adapter.extract(doc, urlObj)
  let picked = pickDescription(doc, ad, ld, md)
  let sourceDoc = doc
  let descriptionFrame: string | null = null

  // iCIMS / embedded Greenhouse render the posting in a frame; the top frame is a shell.
  if ((!picked || picked.text.length < 400) && frames.length) {
    for (const frame of frames.slice(0, 10)) {
      let frameUrl: URL
      try {
        frameUrl = new URL(frame.url)
      } catch {
        continue
      }
      const frameLd = extractJsonLd(frame.doc)
      const frameAd = cls.adapter.extract(frame.doc, frameUrl)
      const framePick = pickDescription(frame.doc, frameAd, frameLd, extractMicrodata(frame.doc))
      if (framePick && framePick.text.length >= 400) {
        picked = framePick
        sourceDoc = frame.doc
        descriptionFrame = frame.url
        ad = { ...frameAd, ...Object.fromEntries(Object.entries(ad).filter(([, v]) => v !== null && v !== undefined)) }
        ld = ld ?? frameLd
        break
      }
    }
  }

  const siteTitle = parseSiteTitle(pageTitle, cls.source, cls.ats)
  const ogTitle = metaContent(doc, 'og:title')
  const ogSplit = ogTitle ? splitTitle(ogTitle) : {}
  const titleSplit = pageTitle ? splitTitle(pageTitle) : {}

  const title = pick<string>(layers, 'title', [
    [ld?.title, 'jsonld'], [md?.title, 'microdata'], [ad.title, 'adapter'], [siteTitle.role, 'title'],
    [ogSplit.role, 'meta'], [titleSplit.role, 'title'],
  ])
  const company = pick<string>(layers, 'company', [
    [ld?.company, 'jsonld'], [md?.company, 'microdata'], [ad.company, 'adapter'], [siteTitle.company, 'title'],
    [cleanCompany(metaContent(doc, 'og:site_name')), 'meta'], [cleanCompany(ogSplit.company), 'meta'],
    [cleanCompany(titleSplit.company), 'title'], [slugCompany(urlObj, cls.ats), 'url'],
  ])
  const location = pick<string>(layers, 'location', [
    [ld?.location, 'jsonld'], [md?.location, 'microdata'], [ad.location, 'adapter'], [siteTitle.location, 'title'],
  ])

  const description = picked ? capChars(picked.text, DESCRIPTION_MAX) : null
  if (picked) layers.description = picked.layer
  const descEl = picked?.el ?? null
  const titleEl = ad.titleEl ?? Array.from(sourceDoc.querySelectorAll('h1')).find((h) => !h.closest('nav, footer, [role="navigation"]')) ?? null
  const scans = scanRegion(regionOf(sourceDoc, titleEl, descEl), descEl)

  const postedAt = pick<string>(layers, 'posted_at', [[ld?.postedAt, 'jsonld'], [md?.postedAt, 'microdata'], [ad.postedAt, 'adapter'], [scans.postedAt, 'text']])
  const postedAgeText = pick<string>(layers, 'posted_age_text', [[ad.postedAgeText, 'adapter'], [scans.postedAgeText, 'text']])
  const adapterApplicants = parseApplicants(ad.applicantText)
  const applicantText = adapterApplicants.text ?? scans.applicantText ?? null
  const applicantCount = pick<number>(layers, 'applicant_count', [
    [ad.applicantCount, 'adapter'], [adapterApplicants.count, 'adapter'], [scans.applicantCount, 'text'],
  ])
  const experienceLevel = pick<string>(layers, 'experience_level', [[ad.experienceLevel, 'adapter'], [scans.experienceLevel, 'text']])
  const employmentType = pick<string>(layers, 'employment_type', [[ld?.employmentType, 'jsonld'], [md?.employmentType, 'microdata'], [ad.employmentType, 'adapter'], [scans.employmentType, 'text']])
  const workTypeText = ad.workTypeText ?? scans.workTypeText ?? null
  const workType = pick<JobWorkType>(layers, 'work_type', [
    [ld?.remote ? 'remote' : null, 'jsonld'], [ad.workType, 'adapter'], [ad.workTypeText ? pyWorkType(ad.workTypeText) : null, 'adapter'],
    [scans.workType, 'text'], [location && /\b(remote|hybrid|on-?site)\b/i.test(location) ? pyWorkType(location) : null, 'location'],
  ])
  const sector = pick<string>(layers, 'sector', [[ld?.industry, 'jsonld'], [md?.industry, 'microdata'], [ad.sector, 'adapter'], [scans.sector, 'text']])

  const atsReqId = cls.source === 'linkedin'
    ? null
    : pick<string>(layers, 'ats_req_id', [
      [ad.atsReqId, 'adapter'],
      [ld?.identifier && /^[A-Za-z]{0,4}-?\d{3,}[\w-]*$/.test(ld.identifier) ? ld.identifier : null, 'jsonld'],
      [scans.atsReqId, 'text'],
    ])
  const linkedinJobId = cls.source === 'linkedin'
    ? pick<string>(layers, 'linkedin_job_id', [[ad.linkedinJobId, 'adapter'], [ld?.identifier && /^\d{6,}$/.test(ld.identifier) ? ld.identifier : null, 'jsonld']])
    : null

  const ldHost = hostOf(ld?.url ?? null)
  const canonicalUrl = pick<string>(layers, 'canonical_url', [
    [ad.canonicalUrl, 'adapter'], [ld?.url && ldHost && ldHost !== urlObj.hostname.toLowerCase() ? ld.url : null, 'jsonld'],
  ])

  return {
    origin: 'page',
    source: cls.source,
    ats: cls.ats,
    matchedBy: cls.matchedBy,
    adapter: cls.adapter.name,
    sourceUrl: url,
    canonicalUrl,
    companyDomain: cls.companyDomain,
    pageTitle,
    title,
    company,
    location,
    description,
    postedAt,
    postedAgeText,
    applicantCount,
    applicantText,
    experienceLevel,
    employmentType,
    workType,
    workTypeText,
    sector,
    atsReqId,
    linkedinJobId,
    formTitle: null,
    formCompany: null,
    posting: ld?.posting ?? null,
    layers,
    truncated: picked?.truncated ?? false,
    descriptionFrame,
  }
}

export function manualCapture(): JobCapture {
  return {
    origin: 'tailor-form', source: 'manual', ats: 'unknown', matchedBy: 'none', adapter: 'form',
    sourceUrl: null, canonicalUrl: null, companyDomain: null, pageTitle: null,
    title: null, company: null, location: null, description: null, postedAt: null, postedAgeText: null,
    applicantCount: null, applicantText: null, experienceLevel: null, employmentType: null, workType: null,
    workTypeText: null, sector: null, atsReqId: null, linkedinJobId: null, formTitle: null, formCompany: null,
    posting: null, layers: {}, truncated: false, descriptionFrame: null,
  }
}

// -- 8. the row -------------------------------------------------------------------------

export interface BuiltRow {
  row: JobInsert
  present: Record<(typeof CAPTURE_MATRIX)[number], Presence>
}

export function fieldsPresent(row: Record<string, unknown>): Record<(typeof CAPTURE_MATRIX)[number], Presence> {
  const out = {} as Record<(typeof CAPTURE_MATRIX)[number], Presence>
  for (const field of CAPTURE_MATRIX) {
    const value = row[field]
    if (field === 'sponsorship') out[field] = value ? 'derived' : 'missing' // a page never states it; the mapper's 'captured' is the filter's
    else if (field === 'posted_at') out[field] = value ? 'captured' : row.posted_age_text ? 'derived' : 'missing'
    else out[field] = value !== null && value !== undefined && value !== '' ? 'captured' : 'missing'
  }
  return out
}

export function buildJobRow(capture: JobCapture): BuiltRow | { problem: string } {
  const title = normText(capture.title)
  const company = normText(capture.company)
  if (!title) return { problem: 'missing title' }
  if (!company) return { problem: 'missing company' }
  const description = capChars((capture.description ?? '').trim(), DESCRIPTION_MAX)
  if (description.length < DESCRIPTION_MIN) {
    return {
      problem: description.length
        ? `only ${description.length} characters of description — paste the full posting into the Tailor tab`
        : 'no job description found on the page — paste it into the Tailor tab',
    }
  }

  const sourceUrl = capture.sourceUrl
  const sourceHost = hostOf(sourceUrl)
  const urlIsLinkedinId = !!sourceUrl && (urlKey(sourceUrl) ?? '').startsWith('li:')
  const linkedinJobId = capture.source === 'linkedin' && !urlIsLinkedinId ? capture.linkedinJobId : null
  // The key's requisition id comes from the URL alone — what a CSV of the same posting can also
  // derive (the mapper's rule). A page-only id (a "Job ID" label, JSON-LD identifier) is kept in raw.
  const atsReqId = capture.source === 'linkedin' ? null : atsReqIdFromUrl(sourceUrl)
  const pageReqId = capture.source !== 'linkedin' && capture.atsReqId && capture.atsReqId !== atsReqId ? capture.atsReqId : null
  const sponsorship = deriveSponsorship(description)
  const citizenRequired = deriveCitizenRequired(description)
  const yearsMin = deriveYearsMin(description)
  const canonical = capture.canonicalUrl && hostOf(capture.canonicalUrl) !== sourceHost ? capture.canonicalUrl : null

  const raw: Record<string, unknown> = {
    _capture: 'stage4b',
    _origin: capture.origin,
    _adapter: capture.adapter,
    _matched_by: capture.matchedBy,
    _page_title: capture.pageTitle,
    _layers: { ...capture.layers, ...(sponsorship ? { sponsorship: 'derived' } : {}), ...(citizenRequired ? { citizen_required: 'derived' } : {}), ...(yearsMin !== null ? { experience_years_min: 'derived' } : {}) },
    _employment_type: capture.employmentType,
    _posting: capture.posting,
    _applicants_text: capture.applicantText,
    _posted_text: capture.postedAgeText,
    _work_type_text: capture.workTypeText,
    _url_key: sourceUrl ? urlKey(sourceUrl) : null,
    _linkedin_job_id: linkedinJobId,
    _page_req_id: pageReqId,
    _form_title: capture.formTitle,
    _form_company: capture.formCompany,
    _truncated: capture.truncated || null,
    _description_frame: capture.descriptionFrame,
  }
  for (const key of Object.keys(raw)) if (raw[key] === null || raw[key] === undefined) delete raw[key]

  const draft: Record<string, unknown> = {
    source: capture.source,
    ats: capture.ats,
    ats_req_id: atsReqId,
    source_url: sourceUrl,
    canonical_url: canonical,
    title,
    company,
    company_domain: capture.source === 'company_site' ? capture.companyDomain : null,
    location: clean(capture.location),
    work_type: capture.workType,
    sector: clean(capture.sector),
    description,
    posted_at: capture.postedAt,
    posted_age_text: clean(capture.postedAgeText, 60),
    applicant_count: capture.applicantCount,
    experience_level: clean(capture.experienceLevel, 80),
    experience_years_min: yearsMin,
    sponsorship,
    citizen_required: citizenRequired ? true : null,
    captured_by: 'extension',
    raw,
    dedupe_key: dedupeKey(company, title, { atsReqId, url: sourceUrl, description, linkedinJobId }),
  }
  const present = fieldsPresent(draft)
  draft.fields_present = present

  const allowed = new Set<string>(ENTITY_COLUMNS.jobs)
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(draft)) {
    if (value === null || value === undefined || value === '') continue
    if (!allowed.has(key)) continue
    row[key] = value
  }
  return { row: row as unknown as JobInsert, present }
}

// -- 9. the active tab, through chrome.scripting ---------------------------------------

export interface GrabbedPage {
  html: string
  url: string
  title: string
  top: boolean
}

/** Runs INSIDE the page (every frame). Self-contained by necessity — chrome.scripting
 *  serialises it. Returns a trimmed HTML snapshot; all reading happens on our side. */
export function grabPage(): GrabbedPage | null {
  try {
    const top = window === window.top
    const bodyText = ((document.body && document.body.textContent) || '').replace(/\s+/g, ' ').trim()
    if (!top && bodyText.length < 200) return null
    const clone = document.documentElement.cloneNode(true) as HTMLElement
    try {
      // descendants of <html> on both sides — the clone's list does not include the root itself;
      // the clone is only enumerated when the live tree actually has open shadow roots
      const live = document.documentElement.querySelectorAll('*')
      const withRoots: number[] = []
      for (let i = 0; i < live.length; i++) if ((live[i] as Element).shadowRoot) withRoots.push(i)
      if (withRoots.length) {
        const cloned = clone.querySelectorAll('*')
        if (live.length === cloned.length) {
          for (const i of withRoots) cloned[i].insertAdjacentHTML('beforeend', (live[i] as Element).shadowRoot?.innerHTML ?? '')
        }
      }
    } catch {
      /* closed roots, cross-origin quirks — the light DOM is enough */
    }
    for (const el of Array.from(clone.querySelectorAll('script:not([src]):not([type="application/ld+json"]), style, svg, noscript, template, video, audio, canvas, object, embed'))) el.remove()
    for (const el of Array.from(clone.querySelectorAll('.visually-hidden, .sr-only, .a11y-text'))) el.remove()
    for (const el of Array.from(clone.querySelectorAll('img[src^="data:"]'))) el.removeAttribute('src')
    for (const el of Array.from(clone.querySelectorAll('[style]'))) el.removeAttribute('style')
    let html = clone.outerHTML
    if (html.length > 3000000) html = html.slice(0, 3000000)
    return { html, url: location.href, title: document.title, top }
  } catch {
    return null
  }
}

export async function captureActiveTabJob(): Promise<JobCapture> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) {
    throw new Error('Open the job posting in the active tab first.')
  }
  const injections = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: grabPage,
  })
  const pages = injections
    .map((i) => ({ frameId: i.frameId, page: i.result as GrabbedPage | null | undefined }))
    .filter((p): p is { frameId: number; page: GrabbedPage } => !!p.page && typeof p.page.html === 'string' && p.page.html.length > 0)
  const top = pages.find((p) => p.frameId === 0 || p.page.top) ?? pages[0]
  if (!top) throw new Error('Could not read that page.')
  let budget = 8000000 - top.page.html.length
  const frames: FrameRef[] = []
  for (const p of pages) {
    if (p === top || budget <= 0) continue
    budget -= p.page.html.length
    frames.push({ url: p.page.url, doc: parseHtml(p.page.html) })
  }
  return extractJobCapture(parseHtml(top.page.html), top.page.url, { frames, pageTitle: top.page.title })
}

// -- 10. recording through the outbox ---------------------------------------------------

export type RecordStatus = 'sent' | 'queued' | 'dead' | 'refused' | 'error'

export interface JobRecordOutcome {
  status: RecordStatus
  /** One sentence for the status line. */
  note: string
  ref?: string
  row?: JobInsert
  capture?: JobCapture
  /** Stage 5: the stored jobs row's id when the hub accepted the row in this flush — the Tailor request carries it. */
  jobId?: string | null
}

function describe(capture: JobCapture, present: Record<string, Presence>): string {
  const filled = Object.values(present).filter((p) => p !== 'missing').length
  const where = capture.source === 'manual' ? 'manual' : capture.ats !== 'unknown' ? `${capture.source}/${capture.ats}` : capture.source
  return `${where}, ${filled}/${CAPTURE_MATRIX.length} fields`
}

// Records never overlap: an enqueue during an in-flight flush would be lost to the
// flush's write-back (lib/hub.ts) and then reported as sent because it is in no list.
let recordChain: Promise<unknown> = Promise.resolve()

/** Upsert one row through the outbox and say what happened. Never throws; serialised. */
export function recordJob(row: JobInsert, label: string): Promise<JobRecordOutcome> {
  const run = recordChain.then(() => recordJobNow(row, label))
  recordChain = run.catch(() => undefined)
  return run
}

async function recordJobNow(row: JobInsert, label: string): Promise<JobRecordOutcome> {
  try {
    const ref = await hubUpsert('jobs', row as unknown as Record<string, unknown>, undefined, { flush: false })
    const report = await flushHubOutbox()
    const dead = (await getHubDeadLetters()).find((d) => d.ref === ref)
    if (dead) return { status: 'dead', note: `Job refused by the hub — ${dead.lastError ?? `HTTP ${dead.status}`}.`, ref, row, jobId: null }
    const queued = (await getHubOutbox()).some((e) => e.ref === ref)
    if (queued) return { status: 'queued', note: `Job queued for the hub — ${report.reason ?? 'not sent yet'}`, ref, row, jobId: null }
    const stored = report.rows?.[ref]
    const jobId = stored && typeof stored.id === 'string' ? stored.id : null
    return { status: 'sent', note: `Job saved (${label}).`, ref, row, jobId }
  } catch (e) {
    return { status: 'error', note: `Job not saved: ${e instanceof Error ? e.message : String(e)}`, row }
  }
}

/** The Read this page press: capture → row → outbox. Never throws. */
export async function recordActiveTabJob(): Promise<JobRecordOutcome> {
  let capture: JobCapture
  try {
    capture = await captureActiveTabJob()
  } catch (e) {
    return { status: 'error', note: `Job not saved: ${e instanceof Error ? e.message : String(e)}` }
  }
  const built = buildJobRow(capture)
  if ('problem' in built) return { status: 'refused', note: `Job not saved: ${built.problem}.`, capture }
  const out = await recordJob(built.row, describe(capture, built.present))
  if (capture.truncated && out.status === 'sent') out.note += ' The description looked clamped — expand "see more" and read again for the full text.'
  return { ...out, capture }
}

export interface FormValues {
  title: string
  company: string
  description: string
  /** The Tailor tab's Posting URL box. Absent on a caller that has no box. */
  url?: string | null
}

/** The Posting URL box as a URL, or null when it is empty or not an http(s) address. */
function formUrl(value: string | null | undefined): string | null {
  const text = normText(value ?? '')
  if (!text) return null
  try {
    return /^https?:$/.test(new URL(text).protocol) ? text : null
  } catch {
    return null
  }
}

/** The form still describes the page's posting: its JD is the page's (or the page had none). */
function sameposting(capture: JobCapture, form: FormValues): boolean {
  const page = normText(capture.description).toLowerCase()
  if (!page) {
    // the page read found no JD: what the user pasted is that posting only while the form still
    // names it — a different title or company is another posting, never bound to this page's URL
    const same = (a: string | null | undefined, b: string) => normText(a ?? '').toLowerCase() === normText(b).toLowerCase()
    return same(capture.title, form.title) && same(capture.company, form.company)
  }
  // the form's JD (textContent) and the capture's (blockText: "• " before items, breaks at blocks)
  // render one DOM differently — compare letters and digits only, so the same posting always matches
  const squeeze = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
  const p = squeeze(page)
  const desc = squeeze(form.description)
  const head = p.slice(0, 240)
  return desc.startsWith(head) || desc.includes(head) || p.includes(desc.slice(0, 240))
}

/**
 * Preflight / Generate. With a page read of the SAME posting the row keeps the page's
 * identity (title, company, URL — so it merges onto the page's row) and takes the
 * form's description; title / company edits ride along in raw. A different JD
 * (the popup reused for another posting), or no page read, is a manual row.
 */
export async function recordFormJob(capture: JobCapture | null, form: FormValues): Promise<JobRecordOutcome> {
  const onPage = capture && capture.origin === 'page' && sameposting(capture, form)
  const base = onPage ? capture : manualCapture()
  const title = onPage && capture.title ? capture.title : form.title
  const company = onPage && capture.company ? capture.company : form.company
  // The Posting URL box. A page read fills it, so it is the user's own word only when it differs
  // from what that read put there: a box still holding THIS page's URL under a JD pasted from
  // somewhere else would bind the wrong posting to the wrong address — the same trap `sameposting`
  // closes for the description, and the reason a stale box is dropped rather than trusted.
  const typed = formUrl(form.url)
  const stale = !onPage && typed !== null && typed === normText(capture?.sourceUrl ?? '')
  const sourceUrl = stale ? base.sourceUrl : (typed ?? base.sourceUrl)
  const merged: JobCapture = {
    ...base,
    origin: 'tailor-form',
    title,
    company,
    description: form.description,
    sourceUrl,
    formTitle: normText(form.title) !== normText(title) ? form.title : null,
    formCompany: normText(form.company) !== normText(company) ? form.company : null,
    layers: {
      ...base.layers,
      description: 'form',
      ...(title === form.title ? { title: 'form' } : {}),
      ...(company === form.company ? { company: 'form' } : {}),
      ...(sourceUrl && sourceUrl !== base.sourceUrl ? { source_url: 'form' } : {}),
    },
  }
  const built = buildJobRow(merged)
  if ('problem' in built) return { status: 'refused', note: `Job not saved: ${built.problem}.`, capture: merged }
  const out = await recordJob(built.row, describe(merged, built.present))
  return { ...out, capture: merged }
}
