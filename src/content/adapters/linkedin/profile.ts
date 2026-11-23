import type { LeadAgeBracket, LeadGender } from '@contract/entities'
import { blockText, blockTextExcluding, companyDomain as domainOf } from '@/content/adapters/postings/dom'
import { normText } from '@/lib/job-dedupe'

// ---------------------------------------------------------------------------
// LinkedIn profile parser (Stage 8 — outreach).
//
// PURE, and the same contract as content/adapters/postings/*: a function of a
// parsed Document (DOMParser — never the live DOM, never `doc.location`, which
// a parsed document does not have) plus the tab URL. Like postings/, this lives
// under content/adapters/ but is imported by a lib/ module, so it never enters
// the content-script bundle and the extension's blast radius does not widen.
//
// Nothing here touches LinkedIn. It reads a page already in hand and reports
// what that page STATES. Class names churn every few months, so every field is
// selector hints first, then a bounded text scan, then null — never a guess.
//
// The two suggest* functions exist because `leads.age_bracket` and
// `leads.gender` pick the message template (outreach.py: `<bracket>_<gender>_
// <tone>`), and neither is ever stated outright on a profile. They are
// SUGGESTIONS the human confirms or flips (`leads.age_gender_confirmed`), and
// each one hands back the arithmetic in `why` so the human can judge it.
// A name is never evidence of gender: no pronouns means unknown.
//
// The stand-out skill is NOT here and is not inferred anywhere (Bob, 2026-09-07)
// — the human types it.
// ---------------------------------------------------------------------------

export interface LinkedInProfile {
  /** The profile's canonical URL when the page states one, else the tab URL, query and hash stripped. The lead's identity. */
  url: string
  fullName: string | null
  firstName: string | null
  lastName: string | null
  headline: string | null
  /** The current employer — the first experience entry with no end date. */
  company: string | null
  /** Only from a website the profile itself labels "Company" in contact info. Usually null; SalesQL is the real source. */
  companyDomain: string | null
  /** The current role title, from that same experience entry. */
  roleTitle: string | null
  location: string | null
  about: string | null
  /** Every year shown in the experience date ranges (starts and ends), ascending and deduped, so the first is the earliest start. */
  experienceYears: number[] | null
  /** Graduation years — the END year of each education range, ascending and deduped. A course still running contributes nothing. */
  educationEndYears: number[] | null
  /** As LinkedIn renders them beside the name, lowercased ("she/her"). Null when the profile states none. */
  pronouns: string | null
}

export interface AgeSuggestion {
  bracket: LeadAgeBracket
  /** The arithmetic, in words. This is what makes the suggestion confirmable. */
  why: string
}

export interface GenderSuggestion {
  gender: LeadGender
  /** What the profile stated, or that it stated nothing. */
  why: string
}

// -- text shapes --------------------------------------------------------------------

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?'
const YEAR = '(?:19|20)\\d{2}'
const POINT = `(?:${MONTH}\\s+)?${YEAR}`
/** "Mar 2021 - Present · 4 yrs 6 mos", "Jun 2016 – Feb 2021", "2010 - 2012", "2019 to 2021". */
const RANGE_RE = new RegExp(`^(${POINT})\\s*(?:[-–—]|to)\\s*(present|current|${POINT})(?:\\s*[·•|].*)?$`, 'i')
const LONE_YEAR_RE = new RegExp(`^${YEAR}$`)
const YEARS_RE = /(?:19|20)\d{2}/g

/** "she/her", "(He/Him)", "they/them", "ze/zir". */
const PRONOUN_RE = /^\(?\s*(she|he|they|ze|xe|per|ey|fae)\s*\/\s*(her|hers|him|his|them|their|zir|hir|xem|per|em|faer)(?:\s*\/\s*[a-z]+)?\s*\)?$/i
const PRONOUN_IN_NAME_RE = /\s*\((she|he|they|ze|xe)\s*\/\s*[a-z/]+\)\s*$/i

/** Top-card furniture that is never a headline or a location. */
const TOP_NOISE_RE = new RegExp([
  '^contact info$', '^show all.*', '^see more$', '^…?\\s*see more$', '^open to work$', '^providing services.*',
  '^\\d[\\d,]*\\+?\\s*(connections?|followers?)$', '.*\\bmutual connections?\\b.*', '^linkedin member$',
  '^\\d+(st|nd|rd|th)\\+?(\\s*degree)?(\\s*connection)?$', '^message$', '^connect$', '^follow$', '^more$',
  '^talks about.*', '^he/him$', '^she/her$', '^they/them$',
].join('|'), 'i')

/** Lines inside an experience / education entry that are neither company nor location. */
const ENTRY_NOISE_RE = new RegExp([
  '^(full|part)[- ]time$', '^self[- ]employed$', '^freelance$', '^contract$', '^internship$', '^apprenticeship$',
  '^seasonal$', '^permanent$', '^temporary$', '^\\d+\\s*(yrs?|mos?)(\\s+\\d+\\s*mos?)?$', '^skills?:.*',
  '^show all.*', '^…?\\s*see more$', '^see more$', '^grade:.*', '^activities and societies:.*', '^issued.*',
].join('|'), 'i')

/** Credentials people append to their name: "Priya Raman, PhD, PMP". */
const CREDENTIAL_RE = /^(?:ph\.?d|m\.?b\.?a|m\.?s\.?c?|b\.?s\.?c?|b\.?tech|m\.?tech|b\.?e|m\.?e|m\.?eng|p\.?e|p\.?eng|pmp|cpa|cfa|md|do|rn|jd|esq|eit|csm|cissp|pmi-acp|six sigma[a-z ]*|sr|jr|ii|iii|iv)\.?$/i

/** A credential, or an all-caps designation (SHRM-CP, CSCP). Case matters here: "Jane" is a name, "PMP" is not. */
function isCredential(part: string): boolean {
  return CREDENTIAL_RE.test(part) || /^[A-Z][A-Z.\-]{1,7}$/.test(part)
}

/** Hosts that are never a company's own site. */
const NOT_COMPANY_HOST = /(?:^|\.)(?:linkedin\.com|licdn\.com|lnkd\.in|twitter\.com|x\.com|facebook\.com|instagram\.com|threads\.net|youtube\.com|github\.com|gitlab\.com|medium\.com|substack\.com|calendly\.com|bit\.ly|t\.co|goo\.gl|behance\.net|dribbble\.com)$/i

const SEE_MORE_RE = /\s*(?:…|\.\.\.)?\s*(?:see|show)\s+(?:more|less)\s*$/i

// -- small helpers ------------------------------------------------------------------

function clean(value: unknown, max = 300): string | null {
  const text = normText(value).replace(/^[•·]\s*/, '').trim()
  return text.length > 0 && text.length <= max ? text : null
}

/** "Nordwind Energy · Full-time" → "Nordwind Energy"; "Houston, TX · Hybrid" → "Houston, TX". */
function beforeDot(value: string | null): string | null {
  if (!value) return null
  return clean(value.split(/\s+[·•]\s+/)[0])
}

function uniqueAscending(years: number[]): number[] {
  return Array.from(new Set(years)).sort((a, b) => a - b)
}

interface DateRange {
  start: number | null
  /** null when the entry is still running ("Present"). */
  end: number | null
  present: boolean
}

function yearIn(text: string, last = false): number | null {
  const found = text.match(YEARS_RE)
  if (!found || !found.length) return null
  return Number(last ? found[found.length - 1] : found[0])
}

/** A LinkedIn date line, or null when the line is not one. */
function parseDateRange(value: string | null | undefined): DateRange | null {
  const text = clean(value, 120)
  if (!text) return null
  const m = RANGE_RE.exec(text)
  if (m) {
    const present = /^(?:present|current)$/i.test(m[2])
    return { start: yearIn(m[1]), end: present ? null : yearIn(m[2], true), present }
  }
  if (LONE_YEAR_RE.test(text)) {
    const year = Number(text)
    return { start: year, end: year, present: false }
  }
  return null
}

// -- entries ------------------------------------------------------------------------

/**
 * The visible lines of one entry. LinkedIn prints every string twice — once in a
 * `span[aria-hidden]` for sighted readers and once in a `.visually-hidden` span for
 * screen readers — so the aria-hidden spans ARE the entry, in order, deduped.
 */
function entryLines(el: Element | null): string[] {
  if (!el) return []
  const out: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | null | undefined): void => {
    const text = clean(raw, 400)
    if (!text) return
    const key = text.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(text)
  }
  const spans = Array.from(el.querySelectorAll('span[aria-hidden="true"]'))
  const outer = spans.filter((span) => !spans.some((other) => other !== span && other.contains(span)))
  for (const span of outer) push(blockText(span))
  if (out.length) return out
  for (const line of blockTextExcluding(el, ['button', '.visually-hidden', '.sr-only', 'svg']).split('\n')) push(line)
  return out
}

/** The `li`s directly under `root` — never one nested inside another (a description bullet list). */
function topLevelItems(root: ParentNode | null): Element[] {
  if (!root) return []
  const items = Array.from(root.querySelectorAll('li'))
  return items.filter((li) => !items.some((other) => other !== li && other.contains(li)))
}

/** An entry's own lines, with any nested list (bullets, grouped roles) removed. */
function ownLines(el: Element): string[] {
  const clone = el.cloneNode(true) as Element
  for (const nested of Array.from(clone.querySelectorAll('li'))) nested.remove()
  return entryLines(clone)
}

interface Entry {
  title: string | null
  company: string | null
  location: string | null
  range: DateRange | null
}

function looksLikeLocation(text: string): boolean {
  return text.length <= 90 && (/,/.test(text) || /\b(remote|on-?site|hybrid|area|region|greater|metropolitan)\b/i.test(text))
}

function parseEntry(lines: string[], groupCompany: string | null): Entry | null {
  if (!lines.length) return null
  const entry: Entry = { title: beforeDot(lines[0]), company: groupCompany, location: null, range: null }
  for (const line of lines.slice(1)) {
    const range = parseDateRange(line)
    if (range) {
      if (!entry.range) entry.range = range
      continue
    }
    if (line.length > 140 || ENTRY_NOISE_RE.test(line)) continue // a description paragraph or a pill
    if (!entry.company) {
      entry.company = beforeDot(line)
      continue
    }
    if (!entry.location && looksLikeLocation(line)) entry.location = beforeDot(line)
  }
  return entry
}

/**
 * One entry per position. A LinkedIn entry that groups several roles at one employer
 * nests them as `li`s WITH their own date ranges; a plain entry's nested `li`s are
 * description bullets and carry none — that difference is how the two are told apart.
 */
function parseEntries(section: Element | null): Entry[] {
  const out: Entry[] = []
  for (const item of topLevelItems(section)) {
    const nested = topLevelItems(item)
    const positions = nested.filter((li) => ownLines(li).some((line) => parseDateRange(line)))
    const own = ownLines(item)
    if (positions.length) {
      const company = beforeDot(own[0] ?? null)
      for (const position of positions) {
        const entry = parseEntry(ownLines(position), company)
        if (entry) out.push(entry)
      }
      continue
    }
    const entry = parseEntry(own, null)
    if (entry) out.push(entry)
  }
  return out
}

// -- sections -----------------------------------------------------------------------

/**
 * LinkedIn anchors each profile card with an empty `<div id="experience">` inside the
 * card's `<section>`; public profiles use a class instead. Both are tried.
 */
function sectionFor(doc: Document, id: string, hints: string[]): Element | null {
  const anchor = doc.getElementById(id)
  if (anchor) return anchor.closest('section') ?? anchor.parentElement
  for (const hint of hints) {
    let el: Element | null = null
    try {
      el = doc.querySelector(hint)
    } catch {
      el = null
    }
    if (el) return el
  }
  return null
}

// -- the top card -------------------------------------------------------------------

function topCardName(doc: Document): Element | null {
  const hints = [
    '.pv-text-details__left-panel h1',
    'h1.text-heading-xlarge',
    'h1.top-card-layout__title',
    'main h1',
    'h1',
  ]
  for (const hint of hints) {
    let els: Element[] = []
    try {
      els = Array.from(doc.querySelectorAll(hint))
    } catch {
      els = []
    }
    for (const el of els) {
      if (el.closest('nav, header, footer, [role="navigation"], [role="banner"]')) continue
      if (clean(blockText(el), 120)) return el
    }
  }
  return null
}

/** The card the name sits in — the bound on every top-card scan. */
function topCard(nameEl: Element | null): Element | null {
  if (!nameEl) return null
  const section = nameEl.closest('section')
  if (section) return section
  let node: Element | null = nameEl.parentElement
  for (let i = 0; i < 3 && node?.parentElement; i++) node = node.parentElement
  return node ?? nameEl.parentElement
}

/** Short lines of the top card, in order, with any nested profile card removed. */
function topCardLines(card: Element | null): string[] {
  if (!card) return []
  const clone = card.cloneNode(true) as Element
  for (const nested of Array.from(clone.querySelectorAll('section, [id="about"], [id="experience"], [id="education"]'))) nested.remove()
  const out: string[] = []
  const seen = new Set<string>()
  for (const line of blockTextExcluding(clone, ['button', '.visually-hidden', '.sr-only', 'svg']).split('\n')) {
    const text = clean(line, 260)
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

/** The first candidate a selector list yields that survives `reject`. */
function pickLine(card: Element | null, selectors: string[], reject: (text: string) => boolean, max = 260): string | null {
  if (!card) return null
  for (const selector of selectors) {
    let els: Element[] = []
    try {
      els = Array.from(card.querySelectorAll(selector))
    } catch {
      els = []
    }
    for (const el of els) {
      const text = clean(blockText(el), max)
      if (text && !reject(text)) return text
    }
  }
  return null
}

function cleanName(raw: string | null): string | null {
  let text = clean(raw, 120)
  if (!text) return null
  text = text.replace(PRONOUN_IN_NAME_RE, '')
  text = text.replace(/\s*[·•]\s*\d+(?:st|nd|rd|th)\+?(?:\s*degree)?(?:\s*connection)?\s*$/i, '')
  text = text.replace(/\s*\b(?:is\s+)?verified\b\s*$/i, '')
  const parts = text.split(',')
  if (parts.length > 1) {
    const tail = parts.slice(1).map((p) => p.trim()).filter(Boolean)
    if (tail.length && tail.every(isCredential)) text = parts[0]
  }
  return clean(text.replace(/[\s,]+$/, ''), 120)
}

function findPronouns(doc: Document, card: Element | null, nameRaw: string | null): string | null {
  const inName = nameRaw ? PRONOUN_IN_NAME_RE.exec(nameRaw) : null
  if (inName) return clean(inName[0].replace(/[()]/g, ''), 40)?.toLowerCase() ?? null
  const labelled = pickLine(card ?? doc.body, ['[class*="pronoun"]', '[data-pronouns]'], (t) => !PRONOUN_RE.test(t), 40)
  if (labelled) return labelled.replace(/[()]/g, '').trim().toLowerCase()
  for (const line of topCardLines(card)) {
    if (PRONOUN_RE.test(line)) return line.replace(/[()]/g, '').trim().toLowerCase()
  }
  return null
}

// -- contact info -------------------------------------------------------------------

function externalHost(href: string | null | undefined, base: string): string | null {
  const raw = normText(href)
  if (!raw || !/^https?:/i.test(raw)) return null
  let host: string
  try {
    // an invalid base throws even for an absolute href, so only a real one is passed
    host = new URL(raw, /^https?:/i.test(base) ? base : 'https://www.linkedin.com/').hostname.toLowerCase()
  } catch {
    return null
  }
  if (!host.includes('.') || NOT_COMPANY_HOST.test(host)) return null
  return host
}

/**
 * The company's own domain, ONLY from a contact-info website the profile itself labels
 * "Company" (LinkedIn's own website types are Personal / Company / Blog / Portfolio /
 * Other). An unlabelled website is as likely to be personal, so it is not used: the
 * hub's SalesQL lookup is the real source of a lead's domain.
 */
function contactCompanyDomain(doc: Document, base: string): string | null {
  let roots: Element[] = []
  try {
    roots = Array.from(doc.querySelectorAll('#contact-info, [class*="contact-info"], [class*="ci-websites"]'))
  } catch {
    roots = []
  }
  for (const root of roots) {
    for (const link of Array.from(root.querySelectorAll('a[href]'))) {
      const host = externalHost(link.getAttribute('href'), base)
      if (!host) continue
      const context = normText((link.closest('li') ?? link.parentElement ?? link).textContent).toLowerCase()
      if (!/\bcompany\b/.test(context)) continue
      const domain = domainOf(host)
      if (domain) return domain
    }
  }
  return null
}

// -- the URL ------------------------------------------------------------------------

const LINKEDIN_HOST_RE = /(?:^|\.)linkedin\.com$/

/** No query, no hash, no trailing slash; a linkedin.com path lowercased, since vanity slugs are. */
function tidyUrl(parsed: URL): string {
  const host = parsed.hostname.toLowerCase()
  const path = LINKEDIN_HOST_RE.test(host) ? parsed.pathname.toLowerCase() : parsed.pathname
  return `${parsed.protocol}//${host}${path}`.replace(/\/+$/, '')
}

/**
 * The identity of the lead: the page's own canonical /in/ URL when it states one, else the tab
 * URL. A tab URL that is not an absolute http(s) URL is handed back exactly as given — resolving
 * it against a guessed base would invent a profile that does not exist.
 */
function profileUrl(doc: Document, url: string): string {
  const raw = normText(url)
  const absolute = /^https?:/i.test(raw)
  const stated = normText(doc.querySelector('link[rel="canonical"]')?.getAttribute('href'))
    || normText(doc.querySelector('meta[property="og:url"]')?.getAttribute('content'))
  if (stated) {
    try {
      const parsed = new URL(stated, absolute ? raw : 'https://www.linkedin.com/')
      if (LINKEDIN_HOST_RE.test(parsed.hostname.toLowerCase())) return tidyUrl(parsed)
    } catch {
      /* a canonical the page got wrong is not the tab's fault */
    }
  }
  if (absolute) {
    try {
      return tidyUrl(new URL(raw))
    } catch {
      return raw
    }
  }
  return raw
}

// -- the parse ----------------------------------------------------------------------

const NOTHING: Omit<LinkedInProfile, 'url'> = {
  fullName: null, firstName: null, lastName: null, headline: null, company: null, companyDomain: null,
  roleTitle: null, location: null, about: null, experienceYears: null, educationEndYears: null, pronouns: null,
}

/** A saved LinkedIn profile page → what it states. Never throws; an empty document gives all nulls. */
export function parseLinkedInProfile(doc: Document, url: string): LinkedInProfile {
  if (!doc || typeof doc.querySelector !== 'function') return { url: normText(url), ...NOTHING }
  const base = profileUrl(doc, url)
  const profile: LinkedInProfile = { url: base, ...NOTHING }

  // -- name, pronouns
  const nameEl = topCardName(doc)
  const card = topCard(nameEl)
  const nameRaw = nameEl ? clean(blockText(nameEl), 120) : null
  profile.pronouns = findPronouns(doc, card, nameRaw)
  profile.fullName = cleanName(nameRaw)
  if (profile.fullName) {
    const words = profile.fullName.split(/\s+/).filter(Boolean)
    profile.firstName = words[0] ?? null
    profile.lastName = words.length > 1 ? words.slice(1).join(' ') : null
  }

  // -- headline and location: selector hints, then the top card's own lines
  const nameKey = (profile.fullName ?? nameRaw ?? '').toLowerCase()
  const isName = (text: string): boolean => text.toLowerCase() === nameKey || (!!nameRaw && text.toLowerCase() === nameRaw.toLowerCase())
  const rejectCommon = (text: string): boolean => isName(text) || PRONOUN_RE.test(text) || TOP_NOISE_RE.test(text)
  profile.headline = pickLine(card, [
    '.text-body-medium.break-words',
    '.pv-text-details__left-panel .text-body-medium',
    'h2.top-card-layout__headline',
    '.top-card-layout__headline',
    '[data-generated-suggestion-target] .text-body-medium',
  ], (text) => rejectCommon(text) || text.length < 3)
  const headlineKey = (profile.headline ?? '').toLowerCase()
  profile.location = pickLine(card, [
    'span.text-body-small.inline.t-black--light',
    '.pv-text-details__left-panel span.text-body-small',
    '.top-card-layout__first-subline',
    '.top-card__subline-item',
    '[class*="profile-info-subheader"] span',
  ], (text) => rejectCommon(text) || text.toLowerCase() === headlineKey || !looksLikeLocation(text), 90)

  if (!profile.headline || !profile.location) {
    for (const line of topCardLines(card)) {
      if (rejectCommon(line)) continue
      if (!profile.headline && line.length >= 3 && line.length <= 250 && !looksLikeLocation(line)) {
        profile.headline = line
        continue
      }
      if (!profile.location && line.toLowerCase() !== (profile.headline ?? '').toLowerCase() && looksLikeLocation(line)) {
        profile.location = beforeDot(line)
      }
    }
  }

  // -- about
  const aboutSection = sectionFor(doc, 'about', ['.pv-about__summary-text', '.core-section-container__content', '[data-section="summary"]', 'section.summary'])
  if (aboutSection) {
    const text = blockTextExcluding(aboutSection, ['h2', 'h3', 'button', '.visually-hidden', '.sr-only', '[class*="show-more-less"]'])
      .replace(/^about\s*\n+/i, '')
      .replace(SEE_MORE_RE, '')
      .trim()
    profile.about = text.length > 0 ? text.slice(0, 4000) : null
  }

  // -- experience: the current role is the first entry with no end date
  const experience = parseEntries(sectionFor(doc, 'experience', ['section.experience', '.experience__list', '[data-section="experience"]']))
  const years: number[] = []
  for (const entry of experience) {
    if (entry.range?.start) years.push(entry.range.start)
    if (entry.range?.end) years.push(entry.range.end)
  }
  profile.experienceYears = years.length ? uniqueAscending(years) : null

  const current = experience.find((entry) => entry.range?.present === true) ?? null
  if (current) {
    profile.roleTitle = current.title
    profile.company = current.company
    if (!profile.location && current.location) profile.location = current.location
  } else if (profile.headline) {
    // no dated current entry: the top card's own sentence is what the page states
    const m = /^(.+?)\s+(?:at|@)\s+(.+)$/i.exec(profile.headline)
    if (m) {
      profile.roleTitle = clean(m[1], 140)
      profile.company = clean(m[2].split(/\s*[|·•]\s*/)[0], 140)
    }
  }

  // -- education: graduation years
  const education = parseEntries(sectionFor(doc, 'education', ['section.education', '.education__list', '[data-section="educationsDetails"]']))
  const ends: number[] = []
  for (const entry of education) {
    if (entry.range && !entry.range.present && entry.range.end) ends.push(entry.range.end)
  }
  profile.educationEndYears = ends.length ? uniqueAscending(ends) : null

  profile.companyDomain = contactCompanyDomain(doc, base)
  return profile
}

// -- suggestions --------------------------------------------------------------------

/** Age at the earliest graduation, and at a first full-time role. Both are assumptions, and both are said out loud. */
const GRAD_AGE = 22
const FIRST_ROLE_AGE = 22
const OLDEST_YEAR = 1950

function bracketOf(age: number): LeadAgeBracket | null {
  if (age < 20) return null
  if (age < 30) return '20s'
  if (age < 40) return '30s'
  if (age < 50) return '40s'
  if (age < 60) return '50s'
  if (age < 70) return '60s'
  return null
}

/**
 * A SUGGESTED age bracket, from the earliest education end year, or failing that the
 * earliest experience year (which is the earliest start — an entry's end is never before
 * its start). Nothing here is stated on the profile, so `why` carries the whole
 * calculation and the human confirms or flips it before a template is picked.
 *
 * `nowYear` is a parameter so the function stays pure and the tests stay fixed.
 */
export function suggestAgeBracket(profile: LinkedInProfile, nowYear: number = new Date().getUTCFullYear()): AgeSuggestion {
  const grads = profile.educationEndYears ?? []
  const works = profile.experienceYears ?? []
  const fromEducation = grads.length > 0
  const year = fromEducation ? grads[0] : works.length > 0 ? works[0] : null
  if (year === null) {
    return { bracket: 'unknown', why: 'the profile shows no education end years and no experience years — there is nothing to count from' }
  }
  if (year < OLDEST_YEAR || year > nowYear) {
    return { bracket: 'unknown', why: `the earliest year on the profile is ${year}, outside ${OLDEST_YEAR}-${nowYear}, so it is not usable` }
  }
  const startAge = fromEducation ? GRAD_AGE : FIRST_ROLE_AGE
  const age = startAge + (nowYear - year)
  const source = fromEducation
    ? `earliest education end year ${year}${grads.length > 1 ? ` (of ${grads.join(', ')})` : ''}; assume ${GRAD_AGE} at that graduation`
    : `no education years on the profile; earliest experience year ${year}${works.length > 1 ? ` (of ${works.join(', ')})` : ''}; assume ${FIRST_ROLE_AGE} at the first role`
  const arithmetic = `${startAge} + (${nowYear} - ${year}) = about ${age}`
  const bracket = bracketOf(age)
  if (!bracket) {
    return { bracket: 'unknown', why: `${source}, so ${arithmetic}, which is outside the 20s-60s brackets` }
  }
  return { bracket, why: `${source}, so ${arithmetic} → ${bracket}` }
}

/**
 * A SUGGESTED gender, from stated pronouns and nothing else. A name is never evidence:
 * no pronouns on the profile means unknown, and the human sets it. Pronouns that name no
 * gender (they/them) stay unknown too.
 */
export function suggestGender(profile: LinkedInProfile): GenderSuggestion {
  const pronouns = normText(profile.pronouns).toLowerCase().replace(/[()]/g, '').trim()
  if (!pronouns) {
    return { gender: 'unknown', why: 'the profile states no pronouns, and a name is never evidence of gender — set it by hand' }
  }
  const first = pronouns.split('/')[0].trim()
  if (first === 'she') return { gender: 'f', why: `the profile states pronouns "${pronouns}"` }
  if (first === 'he') return { gender: 'm', why: `the profile states pronouns "${pronouns}"` }
  return { gender: 'unknown', why: `the profile states pronouns "${pronouns}", which name no gender — set it by hand` }
}
