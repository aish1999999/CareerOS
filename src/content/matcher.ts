import type {
  CascadeCategory,
  FieldOption,
  MatchAction,
  MatchResult,
  OptionSet,
  PageContext,
  Profile,
  QAEntry,
  QASource,
  SeedQuestion,
  Settings,
  SignalBundle,
} from '@/types'
import { classifyIntent, stripParentheticals } from '@/lib/intent'
import { hostMatchesDomain } from '@/lib/domains'
import { pickDocument, type DocumentMeta } from '@/lib/documents'
import { canonical, canonicalAnswer, humanizeIdentifier, tokenizeAnswer } from '@/lib/normalize'
import { crossesEeoTopic } from '@/lib/eeo'
import { lexicalAnswerScore, lexicalScore } from '@/lib/scorers/lexical'
import { readProfilePath } from '@/lib/seed'
import { brandTokens } from '@/content/capture'
import { renderComposite } from '@/content/composer'
import { detectVariables } from '@/content/variables'

// ---------------------------------------------------------------------------
// Matching engine (Section 6). Pure — no DOM access, unit-testable.
// Tier 1: deterministic profile mapping via autocomplete tokens + name/id
//         regex patterns.
// Tier 2: scored matching against (a) the user's qa store and (b) the seed
//         catalog's profile/composite questions resolved from the profile.
//         freeText seeds are NEVER candidates — only answered questions fill.
// ---------------------------------------------------------------------------

export interface MatcherContext {
  profile: Profile
  qa: QAEntry[]
  seeds: SeedQuestion[]
  /** User-classified option equivalence sets (Options tab). */
  optionSets?: OptionSet[]
  settings: Settings
  /** Effective persona (explicit or inferred). null = universal only. */
  activePersona: string | null
  /** When provided, page-specific literals in the question ("…work at Hooli?")
   *  are normalized to their generic tokens before scoring, so the stored
   *  "…work at this company?" still matches. */
  pageContext?: PageContext
  /** Page hostname — with pageContext it identifies THIS company's brand
   *  tokens ("amgen" in careers.amgen.com) for brand-agnostic questions. */
  hostname?: string
  /** Pluggable scorer (Section 6); defaults to the offline lexical scorer. */
  score?: (a: string, b: string) => number | Promise<number>
  usageCounts?: Record<string, number>
  /** Page-wide tally of tier-1 matched keys (matchAll prepass). ≥2 fields
   *  landing on the SAME education/work entry key means the page repeats
   *  entry blocks even when the detector found no section index (Oracle CX
   *  has no Workday-style numbered ids) — matchField then prefers the
   *  rotating entry getter over global tier-2 answers. */
  tier1KeyCounts?: Record<string, number>
  /** Stored document metadata (resume/cover letter) — file-input matching.
   *  Bytes are NOT here; fill fetches them by id (getDocumentBytes). */
  documents?: DocumentMeta[]
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Replace canonicalized page-context literals with generic tokens. Brand
 *  tokens from the hostname cover pages whose context extraction missed the
 *  company name — "have you worked for amgen" on site A then matches the
 *  same question about any other company on site B. */
function decontextualize(
  canonicalText: string,
  pageContext?: PageContext,
  hostname?: string,
): string {
  if (!pageContext && !hostname) return canonicalText
  let text = canonicalText
  const swaps: [string | null, string][] = [
    [pageContext?.company ?? null, 'company'],
    [pageContext?.role ?? null, 'position'],
    [pageContext?.location ?? null, 'location'],
  ]
  for (const [literal, generic] of swaps) {
    if (!literal) continue
    const c = canonical(literal)
    if (c.length < 3) continue
    text = text.replace(new RegExp(`(?<!\\S)${escapeRegExp(c)}(?!\\S)`, 'g'), generic)
  }
  for (const token of brandTokens(pageContext, hostname ?? '')) {
    if (token.length < 3) continue
    text = text.replace(new RegExp(`(?<!\\S)${escapeRegExp(token)}(?!\\S)`, 'gi'), 'company')
  }
  // Token swaps can stack duplicates ("company company subsidiaries")
  return text.replace(/\b(company)(\s+\1)+\b/g, '$1')
}

// ---- Tier 1: deterministic profile mapping -----------------------------------

interface ProfileGetter {
  (p: Profile, ctx?: MatcherContext, signal?: SignalBundle): string
  matchedKey?: string
  /** Alternate phrasings of the value, tried in order wherever the primary
   *  answer places on no option — match-time AND live dropdown lists. */
  fallbacksFor?: (value: string) => string[]
}

const fullName: ProfileGetter = (p) =>
  [p.firstName, p.lastName].filter(Boolean).join(' ')

const yesNo = (b: boolean) => (b ? 'Yes' : 'No')

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "2026-09-01" → "September 1, 2026" for text inputs. */
function formatLongDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/)
  if (!m) return iso
  const month = MONTH_NAMES[parseInt(m[2], 10) - 1]
  if (!month) return iso
  return `${month} ${parseInt(m[3] ?? '1', 10)}, ${m[1]}`
}

/** "What is your earliest available start date?" — date inputs get the ISO
 *  value (the date machinery reformats per input type), text gets long form.
 *  Work-history "Start date" labels never reach this getter (their pattern
 *  is ordered first and this one requires an availability cue). */
const startDateGetter: ProfileGetter = (p, _ctx, signal) => {
  if (!p.earliestStartDate) return ''
  return signal?.kind === 'date' ? p.earliestStartDate : formatLongDate(p.earliestStartDate)
}
startDateGetter.matchedKey = 'earliestStartDate'

/** "Do you have 3+ years of experience in …?" → Yes. Phrased as how-many
 *  ("How many years of experience …") it yields nothing — a number belongs
 *  to tier 2 / the user, not a blind Yes. */
const yearsExperienceGetter: ProfileGetter = (_p, _ctx, signal) => {
  const label = signal?.label ?? ''
  const asksYesNo = /^\s*(do|does|have|has|are|is|can|did|will)\b/i.test(label)
  return asksYesNo ? 'Yes' : ''
}

/** "Have you (ever|previously) worked for (this company|us|<brand>)?" —
 *  brand-agnostic: the this-company cue may be the page's own company name.
 *  Deliberately requires a PAST cue so "Are you currently employed?" (a
 *  different question with a different answer) never lands here. */
const previouslyEmployedGetter: ProfileGetter = (p, ctx, signal) => {
  const label = signal?.label ?? ''
  // "partnered with … as a contractor" is the same question in vendor clothes
  if (!/\b(work|employ|partner|contract)/i.test(label)) return ''
  if (!/\b(previously|ever|formerly|before|prior|in the past)\b/i.test(label)) return ''
  const genericCue =
    /\bthis (company|organi[sz]ation|employer|firm)\b|\b(for|with|by|at) us\b|\bour (company|organi[sz]ation|subsidiaries)\b/i.test(
      label,
    )
  const brand = brandTokens(ctx?.pageContext, ctx?.hostname ?? '')
  const brandCue = [...brand].some(
    (t) => t.length > 2 && new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(label),
  )
  if (!genericCue && !brandCue) return ''
  return yesNo(p.previouslyEmployedHere)
}
previouslyEmployedGetter.matchedKey = 'previouslyEmployedHere'
/** Companies word this question's options their own way ("I have never
 *  worked for Novonesis, its affiliates or subsidiaries" / "Not applicable" /
 *  "Former employee") — a bare Yes/No often places on none of them. These
 *  alternate phrasings run through the same chooseOption cascade (match time
 *  AND live dropdown lists) so the option MEANING the answer gets picked:
 *  intent polarity + lexical overlap do the per-company work. Most literal
 *  wordings first; "Not applicable" last (the loosest No-equivalent, only
 *  right when nothing negative is offered at all). */
/** "Are you a current <brand> employee?" — the COMPLEMENT of the previous-
 *  employment question (live NOV miss 2026-07-17: it fell through to the
 *  current-employer SEED and suggested the user's employer name on a Yes/No
 *  pill). Derivable in one direction only: never having worked for the
 *  company implies not being a current employee; a past stint says nothing
 *  about today, so that case honestly skips. */
const currentEmployeeGetter: ProfileGetter = (p, ctx, signal) => {
  const label = signal?.label ?? ''
  if (!/\bemployee\b|\bemployed\b|\bworking\b/i.test(label)) return ''
  if (!/\bcurrent(ly)?\b/i.test(label)) return ''
  const genericCue =
    /\bthis (company|organi[sz]ation|employer|firm)\b|\b(for|with|by|at) us\b|\bour (company|organi[sz]ation|subsidiaries)\b/i.test(
      label,
    )
  const brand = brandTokens(ctx?.pageContext, ctx?.hostname ?? '')
  const brandCue = [...brand].some(
    (t) => t.length > 2 && new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i').test(label),
  )
  if (!genericCue && !brandCue) return ''
  return p.previouslyEmployedHere ? '' : 'No'
}
currentEmployeeGetter.matchedKey = 'currentEmployeeHere'
currentEmployeeGetter.fallbacksFor = (value) =>
  value === 'No' ? ['I am not a current employee', 'Not a current employee'] : []

previouslyEmployedGetter.fallbacksFor = (value) =>
  value === 'No'
    ? [
      'I have never worked for this company',
      'I have never been employed by this company',
      'No prior employment',
      'No experience',
      'Not applicable',
    ]
    : [
      'I have previously worked for this company',
      'I was previously employed by this company',
      'I am a former employee',
    ]

function sortByEndDateDesc<T extends { startDate: string; endDate: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    // Empty endDate means "Present" -> goes first.
    if (!a.endDate && b.endDate) return -1
    if (a.endDate && !b.endDate) return 1
    if (!a.endDate && !b.endDate) {
      // Both present, fallback to startDate descending
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0
      return startB - startA
    }
    const endA = new Date(a.endDate).getTime()
    const endB = new Date(b.endDate).getTime()
    return endB - endA
  })
}

export function getSortedWorkHistory(profile: Profile) {
  return sortByEndDateDesc(profile.workHistory)
}

export function getSortedEducation(profile: Profile) {
  return sortByEndDateDesc(profile.education)
}

function workHistoryGetter(key: keyof Profile['workHistory'][0]): ProfileGetter {
  const getter: ProfileGetter = (p, ctx, signal) => {
    // Never bleed employment data into an education block ("From"/"To"
    // date widgets exist in both) — yield so education patterns can match.
    if (signal?.sectionKind === 'education') return ''
    const sorted = getSortedWorkHistory(p)
    // Repeated-section fields (Workday "Work Experience 2") carry a
    // deterministic 0-based index; otherwise rotate by how many fields of
    // this key were already matched this pass.
    const index = signal?.sectionIndex ?? ctx?.usageCounts?.[key] ?? 0
    return sorted[index]?.[key] ?? ''
  }
  getter.matchedKey = key
  return getter
}

/** workHistoryGetter matchedKeys — the tier-1 hits that mean "this answer
 *  came from the section's own work entry" (education uses `education.*`). */
const WORK_SECTION_KEYS = new Set<string>([
  'company',
  'title',
  'startDate',
  'endDate',
  'location',
  'description',
])

function educationGetter(key: keyof Profile['education'][0]): ProfileGetter {
  const matchedKey = `education.${key}`
  const getter: ProfileGetter = (p, ctx, signal) => {
    if (signal?.sectionKind === 'work') return ''
    // Date labels ("From"/"To") exist in BOTH block kinds. When a work
    // entry's end date is empty (current job), the To field must stay empty
    // for the user — never fall through to an education date.
    if ((key === 'startDate' || key === 'endDate') && signal?.sectionKind !== 'education')
      return ''
    const sorted = getSortedEducation(p)
    const index = signal?.sectionIndex ?? ctx?.usageCounts?.[matchedKey] ?? 0
    return sorted[index]?.[key] ?? ''
  }
  getter.matchedKey = matchedKey
  return getter
}

/** "Do you have a bachelor's degree in engineering or a related field?" —
 *  screening yes/no derivable from the education entries. Deliberately
 *  Yes-only: it answers when the asked level exists AND (no discipline is
 *  named, or a named discipline token overlaps the entry's degree/field
 *  text). Anything short of that certainty skips — a wrong "No" on a
 *  required screening question is disqualifying, and near-miss disciplines
 *  ("related field") are the judge's call, not a lexical one. */
const DEGREE_LEVEL_RES: [RegExp, RegExp][] = [
  [/\bbachelor/i, /\bbachelor|\bb\.?\s?(s|sc|a|e|eng|tech)\b/i],
  [/\bmaster/i, /\bmaster|\bm\.?\s?(s|sc|a|e|eng|tech|ba)\b/i],
  [/\b(doctor|ph\.?d)/i, /\bdoctor|\bph\.?d/i],
  [/\bassociate/i, /\bassociate/i],
]
const degreeQuestionGetter: ProfileGetter = (p, _ctx, signal) => {
  const label = signal?.label ?? ''
  if (!/\bdegree\b/i.test(label) || !/^(do you|have you|are you)/i.test(label.trim())) return ''
  const level = DEGREE_LEVEL_RES.find(([ask]) => ask.test(label))
  if (!level) return ''
  const holders = p.education.filter((e) => level[1].test(e.degree))
  if (holders.length === 0) return '' // Yes-only: absence is the judge's call
  // "…degree in X( or Y or a related field)": require a token bridge to X/Y
  const inClause = label.match(/degree\s+in\s+([^?.]*)/i)?.[1] ?? ''
  const disciplineTokens = inClause
    .split(/[^a-z]+/i)
    .filter((t) => t.length >= 4 && !/related|field|similar|equivalent|discipline|area|another|other/i.test(t))
  if (disciplineTokens.length === 0) return 'Yes' // level asked, level held
  const haystack = holders.map((e) => `${e.degree} ${e.field}`.toLowerCase()).join(' ')
  return disciplineTokens.some((t) => haystack.includes(t.toLowerCase())) ? 'Yes' : ''
}
degreeQuestionGetter.matchedKey = 'educationDegreeQuestion'

/** "Are/Do/Will you … authorized/eligible …?" wants the Yes/No boolean; a
 *  bare "Work authorization" field wants the status text ("F-1 OPT …"). */
const authorizedToWorkGetter: ProfileGetter = (p, _ctx, signal) =>
  /^\s*(are|do|will)\s+you\b/i.test(signal?.label ?? '')
    ? yesNo(p.authorizedToWork)
    : p.workAuthorization
authorizedToWorkGetter.matchedKey = 'authorizedToWork'
/** Some forms answer this with EMPLOYER-SCOPE options instead of Yes/No
 *  (live NOV: "Authorized to work for all United States employers" /
 *  "…only my current United States employer" / "Not Authorized…") — a bare
 *  "Yes" rightly refuses to pick between two affirmatives. The all-employers
 *  phrasing is correct for unrestricted authorization (citizen, green card,
 *  EAD/OPT — this user). A CURRENT visa-bound worker (H-1B/L-1 holder tied
 *  to their sponsor) would need "current employer only" — revisit if the
 *  profile ever models that distinction. */
authorizedToWorkGetter.fallbacksFor = (value) =>
  value === 'Yes'
    ? ['Authorized to work for all United States employers', 'I am authorized to work for all employers']
    : ['Not authorized to work in the United States']

/** Auth forms get the dedicated account email; applications the contact one. */
const emailGetter: ProfileGetter = (p, _ctx, signal) =>
  signal?.authContext && p.accountEmail ? p.accountEmail : p.email

/** Sign-in/sign-up password (incl. confirm/verify fields) — ONLY ever on
 *  kind:'password' inputs, so a "Password hint" text box can't leak it. */
const passwordGetter: ProfileGetter = (p, _ctx, signal) =>
  signal?.kind === 'password' ? p.accountPassword : ''
passwordGetter.matchedKey = 'accountPassword'

/** "Username" on an auth form = the account email on every major ATS. */
const usernameGetter: ProfileGetter = (p, _ctx, signal) =>
  signal?.authContext ? p.accountEmail || p.email : ''

/** Bare "From"/"To" only means a DATE when the field itself looks like one —
 *  an unlabeled ADDRESS input can inherit a neighboring "From" caption as its
 *  label (labelFromPrecedingText), or carry "from" inside its name/id
 *  ("addressFrom"), and got filled with a work start date (live bug
 *  2026-07-15). Date context = date kind, a date-format hint, or a
 *  work/education repeated block — and never anything address-flavored. */
const ADDRESSY_RE = /\baddress\b|street|city|zip|postal|\bapt\b|suite|\bunit\b/i
const DATE_HINT_RE = /\b(date|mm|dd|yy+)\b|\d{1,2}\s*\/\s*\d{2,4}/i

function dateContextGate(getter: ProfileGetter): ProfileGetter {
  const gated: ProfileGetter = (p, ctx, signal) => {
    if (!signal) return ''
    // Humanized so camelCase identifiers expose their words ("workAddressLine")
    const identityText = `${signal.label} ${humanizeIdentifier(signal.name)} ${humanizeIdentifier(signal.id)} ${signal.sectionContext}`
    if (ADDRESSY_RE.test(identityText)) return ''
    // Humanized name/id keeps identifier-named date fields alive ("dateFrom"
    // → "date From" carries the hint; "addressFrom" does not)
    const hintText = `${signal.placeholder} ${signal.label} ${humanizeIdentifier(signal.name)} ${humanizeIdentifier(signal.id)}`
    const dateish =
      signal.kind === 'date' || DATE_HINT_RE.test(hintText) || signal.sectionKind !== undefined
    if (!dateish) return ''
    return getter(p, ctx, signal)
  }
  gated.matchedKey = getter.matchedKey // usageCounts rotation keys off this
  return gated
}

const AUTOCOMPLETE_MAP: Record<string, ProfileGetter> = {
  'given-name': (p) => p.firstName,
  'additional-name': () => '',
  'family-name': (p) => p.lastName,
  name: fullName,
  email: emailGetter,
  username: usernameGetter,
  'new-password': passwordGetter,
  'current-password': passwordGetter,
  tel: (p) => p.phone,
  'tel-national': (p) => p.phone,
  'street-address': (p) => [p.address.line1, p.address.line2].filter(Boolean).join(', '),
  'address-line1': (p) => p.address.line1,
  'address-line2': (p) => p.address.line2,
  'address-level1': (p) => p.address.state,
  'address-level2': (p) => p.address.city,
  'postal-code': (p) => p.address.postalCode,
  country: (p) => p.address.country,
  'country-name': (p) => p.address.country,
  organization: workHistoryGetter('company'),
  'organization-title': workHistoryGetter('title'),
  url: (p) => p.links.website || p.links.portfolio,
}

/** 'short-label': ambiguous everyday words ("to", "from", "title", "country")
 *  that only mean a form field when the label is identifier-like ("From*",
 *  "Job Title") — sentence-length questions ("…this applies to interviews…",
 *  "…the country in which you are applying?") must NEVER keyword-match these;
 *  they belong to tier-2 semantic matching. */
type PatternScope = 'always' | 'short-label'

const NAME_PATTERNS: [RegExp, ProfileGetter, PatternScope][] = [
  // Credentials first: "Confirm Password" must never fall through to
  // anything else, and the getters are hard-gated (kind/authContext).
  [/pass.?word|passcode/i, passwordGetter, 'always'],
  [/user.?name|user.?id|login.?id/i, usernameGetter, 'always'],
  [/first.?name|given.?name|fname/i, (p) => p.firstName, 'always'],
  [/last.?name|family.?name|surname|lname/i, (p) => p.lastName, 'always'],
  [
    /full.?name|your.?name|^name$|candidate.?name|legal.?name/i,
    // Workday nests ids as "legalName--middleName": the humanized identifier
    // matches /legal.?name/, but a middle-name field must never receive the
    // full name (live Novonesis catch 2026-07-16). No stored middle name →
    // the field stays empty.
    (p, _ctx, signal) =>
      /\bmiddle\b|\bmname\b/i.test(
        `${signal?.label ?? ''} ${humanizeIdentifier(signal?.name ?? '')} ${humanizeIdentifier(signal?.id ?? '')}`,
      )
        ? ''
        : fullName(p),
    'always',
  ],
  [/e.?mail/i, emailGetter, 'always'],
  // Before the phone pattern: "Country Phone Code" contains "phone" but wants
  // the dialing code, not the number (live Novonesis catch 2026-07-16). The
  // phone cue keeps ISO address "Country Code" fields out.
  [
    /\b(country|dial(?:l?ing)?)\b[^?]{0,15}\bcode\b|\bcode\b[^?]{0,10}\b(country|dial)/i,
    (_p, _ctx, signal) =>
      /phone|mobile|cell|telephone|dial/i.test(
        `${signal?.label ?? ''} ${signal?.name ?? ''} ${signal?.id ?? ''} ${signal?.sectionContext ?? ''}`,
      )
        ? '+1'
        : '',
    'always',
  ],
  [
    /phone|mobile|cell|telephone/i,
    // "Phone Extension" fields must stay empty — caught live by the harness
    (p, _ctx, signal) =>
      /\bext(ension)?\b/i.test(`${signal?.label ?? ''} ${signal?.name ?? ''} ${signal?.id ?? ''}`)
        ? ''
        : p.phone,
    'always',
  ],
  // "Phone Device Type" (Workday/ATS: Mobile/Landline/Fax) — the stored
  // number is a cell, answer instantly without any judge call. Requires the
  // phone cue so IT-style "Primary device type" (Laptop…) never hits.
  [
    /\b(phone|telephone|cell)\b[^?]{0,12}\b(device\s*)?type\b|\b(device\s*)?type\b[^?]{0,12}\b(phone|telephone)\b/i,
    () => 'Mobile',
    'always',
  ],
  [/linked.?in/i, (p) => p.links.linkedin, 'always'],
  [/git.?hub/i, (p) => p.links.github, 'always'],
  [/portfolio/i, (p) => p.links.portfolio, 'always'],
  [/website|personal.?site|home.?page/i, (p) => p.links.website || p.links.portfolio, 'always'],
  [/address.?(line.?)?1|street/i, (p) => p.address.line1, 'always'],
  [/address.?line.?2|apt|suite|unit/i, (p) => p.address.line2, 'always'],
  [/city|town|locality/i, (p) => p.address.city, 'short-label'],
  [/state|province|region/i, (p) => p.address.state, 'short-label'],
  [/postal|zip/i, (p) => p.address.postalCode, 'always'],
  [/country/i, (p) => p.address.country, 'short-label'],
  [/sponsor(ship)?/i, (p) => yesNo(p.requiresSponsorship), 'always'],
  [
    /authoriz(e|ed|ation)|work.?permit|right.?to.?work|(legally\s+)?eligible\s+to\s+work/i,
    authorizedToWorkGetter,
    'always',
  ],
  // "Are you at least 18 years of age?" — inherently Yes for this user (24);
  // pattern is age-specific so ordinary age questions never hit it.
  [
    /\bat least (18|eighteen)\b|\b1[68] years (of age|or older)\b|\bminimum age\b/i,
    () => 'Yes',
    'always',
  ],
  [/relocat/i, (p) => yesNo(p.willingToRelocate), 'always'],
  // Employment-start questions (before the notice/availability catch-all):
  // needs an availability cue so bare work-history "Start date" labels
  // (short-label pattern below) keep their own getter.
  [
    /\b(earliest|soonest)\b[^?]*\bstart|when (can|could) you (start|begin|join)|available to (start|begin)|\bdate\b[^?]{0,25}\bavailable\b|start.?date.{0,12}availab|availab\w*.{0,12}start.?date/i,
    startDateGetter,
    'always',
  ],
  // Prior-employment-here — before authoriz/work patterns so its distinctive
  // phrasing wins ("Have you previously worked for Amgen?")
  [/\b(previously|ever|formerly|before|prior|in the past)\b.{0,40}\b(work|employ|partner|contract)|\b(work|employ|partner)\w*.{0,40}\b(previously|before|in the past)\b/i, previouslyEmployedGetter, 'always'],
  // Current-employment-here ("Are you a current NOV employee?") — the getter
  // itself gates on the current cue + a this-company/brand cue.
  [/\bcurrent(ly)?\b.{0,30}\b(employee|employed|working)\b|\b(employee|employed|working)\b.{0,20}\bcurrently\b/i, currentEmployeeGetter, 'always'],
  // "[X]+ years of experience in …?" screening questions
  [/\b\d+\s*\+?\s*(or more\s+)?years?\b[^?]*\bexperience\b|\bexperience\b[^?]*\b\d+\s*\+?\s*years?\b/i, yearsExperienceGetter, 'always'],
  [
    /notice.?period|start.?date.?availab|availability/i,
    // "Interview availability" is scheduling, not a notice period
    (p, _ctx, signal) => (/\binterview\b/i.test(signal?.label ?? '') ? '' : p.noticePeriod),
    'always',
  ],
  [/salary|compensation|pay.?expectation/i, (p) => p.desiredSalary, 'always'],
  [/pronoun/i, (p) => p.pronouns, 'always'],
  [/company|employer|organization/i, workHistoryGetter('company'), 'short-label'],
  // Before title: "Role Description" must not fill the job title.
  // short-label: screening questions QUOTE the phrase ("After reviewing this
  // job description, are you able to perform the essential functions…") and
  // must never receive a work-history description (live bug 2026-07-15);
  // identifier matching stays loose, so named description fields still hit.
  [
    // \w* extensions matter: short-label matches must END on a word boundary
    /(?:role|job|position|work)\W*descri\w*|descri\w*\W*(?:role|job|position)\w*|responsibilit\w*|duties/i,
    workHistoryGetter('description'),
    'short-label',
  ],
  [/title|role|position/i, workHistoryGetter('title'), 'short-label'],
  // "Start date"/"End date" are distinctive; bare "From"/"To" is not — an
  // unlabeled address input can inherit a neighboring "From" caption or carry
  // "from" in its name, so the bare words are date-context gated.
  [/start.?date/i, workHistoryGetter('startDate'), 'short-label'],
  [/\bfrom\b/i, dateContextGate(workHistoryGetter('startDate')), 'short-label'],
  [/end.?date/i, workHistoryGetter('endDate'), 'short-label'],
  [/\bto\b/i, dateContextGate(workHistoryGetter('endDate')), 'short-label'],
  // Education — after the work patterns: the same "From"/"To" labels appear
  // in both block kinds, and each getter yields '' outside its own kind.
  [/school|universit|college|institution/i, educationGetter('institution'), 'always'],
  // "Do you have a bachelor's degree in …?" BEFORE the plain degree-name
  // getter — a yes/no screening question must never fill the degree NAME.
  [/\b(do you|have you)\b[^?]*\bdegree\b/i, degreeQuestionGetter, 'always'],
  [/degree|qualification/i, educationGetter('degree'), 'always'],
  [/field.?of.?study|major|discipline|area.?of.?study/i, educationGetter('field'), 'always'],
  [/graduat/i, educationGetter('endDate'), 'always'],
  [/start.?date/i, educationGetter('startDate'), 'short-label'],
  [/\bfrom\b/i, dateContextGate(educationGetter('startDate')), 'short-label'],
  [/end.?date/i, educationGetter('endDate'), 'short-label'],
  [/\bto\b/i, dateContextGate(educationGetter('endDate')), 'short-label'],
]

interface Tier1Hit {
  value: string
  confidence: number
  matchedKey?: string
  fallbacks?: string[]
}

/** Substring hit in a natural-language label counts only when word-bounded:
 *  "To*" and "End date" match /to|end.?date/, "Total years" must not. */
function labelMatches(re: RegExp, label: string): boolean {
  const m = label.match(re)
  if (!m || m.index === undefined) return false
  const isWordChar = (ch: string | undefined) => !!ch && /[a-z0-9]/i.test(ch)
  return !isWordChar(label[m.index - 1]) && !isWordChar(label[m.index + m[0].length])
}

const GENERIC_LABEL_MAX_WORDS = 6

/** Identity-style short labels (name/email/phone/date/salary…) — never worth
 *  DRAFTING free text for: they're tier-1 territory, and a generated "my
 *  email" is noise. Shared by the inference branch and the AI Fill pass. */
export function isIdentityLabel(label: string): boolean {
  const words = label.trim().split(/\s+/).filter(Boolean).length
  return (
    words <= GENERIC_LABEL_MAX_WORDS &&
    /\b(name|e.?mail|phone|address|city|state|zip|postal|country|date|salary|linked.?in|git.?hub|website|url)\b/i.test(
      label,
    )
  )
}

function tier1Match(signal: SignalBundle, ctx: MatcherContext): Tier1Hit | null {
  // Deliberately NOT gated on eeoLike: that flag reads label+name+id+
  // sectionContext, and a school field whose label resolution picked up
  // neighboring EEO text gets flagged too — gating here handed such a field
  // to a stored disability answer at tier 2 (live bug 2026-07-16) while its
  // identifier ("education-N--school") tier-1 fill was the right one. Real
  // EEO questions are safe without the gate: no pattern getter maps their
  // vocabulary, and the word-boundary identifier check below keeps words
  // hiding inside words ("ethnicity" carries "city") from matching.
  // A password INPUT is unambiguous whatever its label ("Password",
  // "Create password", "Verify New Password") — the account password, always.
  if (signal.kind === 'password') {
    const value = ctx.profile.accountPassword
    return value ? { value, confidence: 0.95, matchedKey: 'accountPassword' } : null
  }
  // autocomplete tokens are standardized and highly reliable
  const tokens = signal.autocomplete.split(/\s+/).filter((t) => t && t !== 'on' && t !== 'off')
  for (const token of tokens) {
    const getter = AUTOCOMPLETE_MAP[token]
    if (getter) {
      const value = getter(ctx.profile, ctx, signal)
      if (value) return { value, confidence: 0.98, matchedKey: getter.matchedKey }
    }
  }
  // Known patterns: identifiers (name/id) are matched HUMANIZED ("schoolName"
  // → "school Name") — raw substring matching let /lname/ hit the "lName"
  // inside "schoolName" and fill a last name into a school field (caught by
  // the live harness). Labels: 'always' patterns are distinctive stems
  // ("sponsor", "authoriz", "relocat") and match anywhere, even inside
  // sentences; 'short-label' patterns are everyday words ("to", "country")
  // and only count word-bounded — in labels AND identifiers: humanizing
  // can't expose a word hiding inside another word ("ethnicity" carries
  // "city"; live bug filled Houston into an Ethnicity field).
  const identifiers = [signal.name, signal.id].filter(Boolean).map(humanizeIdentifier)
  const label = signal.label
  const labelWordCount = label.trim().split(/\s+/).filter(Boolean).length
  const sentenceLike =
    label.includes('?') ||
    /^\s*(am|are|is|do|does|did|will|would|can|could|have|has|what|when|where|which|who|why|how|please)\b/i.test(
      label,
    )
  for (const [re, getter, scope] of NAME_PATTERNS) {
    const identifierHit = identifiers.some((h) =>
      scope === 'always' ? re.test(h) : labelMatches(re, h),
    )
    const labelHit = label
      ? scope === 'always'
        ? re.test(label)
        : !sentenceLike && labelWordCount <= GENERIC_LABEL_MAX_WORDS && labelMatches(re, label)
      : false
    if (identifierHit || labelHit) {
      const value = getter(ctx.profile, ctx, signal)
      if (value)
        return {
          value,
          confidence: 0.9,
          matchedKey: getter.matchedKey,
          fallbacks: getter.fallbacksFor?.(value),
        }
    }
  }
  return null
}

// ---- Option choosing (select / radio / checkbox) ------------------------------

export interface OptionChoice {
  value: string
  /** Position in the options array — radio/custom-dropdown fills select by
   *  index because option values are often empty or duplicated. */
  index: number
  /** Matched option's text — lets fillSelect handle empty-value options. */
  text: string
  score: number
}

/** One string's tokens are a subset of the other's (either direction).
 *  Token-granular replacement for raw substring inclusion, so "no" doesn't
 *  match inside "norway" but "yes" still matches "Yes, immediately". */
function tokenSubset(a: string, b: string): boolean {
  const ta = tokenizeAnswer(a)
  const tb = tokenizeAnswer(b)
  if (ta.length === 0 || tb.length === 0) return false
  const [small, large] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
  const pool = new Set(large)
  return small.every((t) => pool.has(t))
}

/** Ids of every option set a canonicalized text belongs to. */
function setMembership(canonicalText: string, optionSets: OptionSet[]): Set<string> {
  const ids = new Set<string>()
  for (const set of optionSets) {
    if (set.options.some((o) => canonicalAnswer(stripParentheticals(o)) === canonicalText))
      ids.add(set.id)
  }
  return ids
}

// ---- Numeric ranges ("25–50%", "up to 25%", "18-24", "75%+") -------------------
// Sites slice the same quantity differently (travel % as ranges on one form,
// bare integers on another; age brackets). When the ANSWER is essentially a
// number, pick the option whose range contains it — deterministic, no judge.

interface NumericRange {
  lo: number
  hi: number
}

/** Range an option text describes, or null when it isn't numeric. */
export function parseNumericRange(text: string): NumericRange | null {
  const t = text.trim().toLowerCase()
  if (!t || !/\d/.test(t)) return null
  // "25-50%", "25 – 50", "25 to 50"
  let m = t.match(/^[^\d]*(\d+(?:\.\d+)?)\s*(?:%|percent)?\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?[^\d]*$/)
  if (m) return { lo: parseFloat(m[1]), hi: parseFloat(m[2]) }
  // "up to 25%", "less than 25", "under 25"
  m = t.match(/^(?:up to|less than|under|at most|no more than|fewer than)\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?$/)
  if (m) return { lo: 0, hi: parseFloat(m[1]) }
  // "75%+", "75+", "more than 75", "over 75", "75 or more"
  m =
    t.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)?\s*(?:\+|or (?:more|above|over))$/) ??
    t.match(/^(?:more than|over|at least|minimum(?: of)?)\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?$/)
  if (m) return { lo: parseFloat(m[1]), hi: Infinity }
  // bare "50", "50%"
  m = t.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)?$/)
  if (m) return { lo: parseFloat(m[1]), hi: parseFloat(m[1]) }
  return null
}

/** The answer must be essentially just a number/range ("50%", "24",
 *  "25-50%") — "2 weeks" or "Section 8" must never trigger range picking. */
const NUMERIC_ANSWER_RE = /^\s*\d{1,3}(?:\.\d+)?\s*%?\s*(?:(?:-|–|to)\s*\d{1,3}(?:\.\d+)?\s*%?)?\s*$/

function chooseNumericRange(options: FieldOption[], answer: string): OptionChoice | null {
  if (!NUMERIC_ANSWER_RE.test(answer)) return null
  const target = parseNumericRange(answer)
  if (!target) return null
  const mid = target.hi === Infinity ? target.lo : (target.lo + target.hi) / 2
  interface RangedOption {
    index: number
    option: FieldOption
    range: NumericRange
  }
  const ranged: RangedOption[] = []
  for (let index = 0; index < options.length; index++) {
    const range = parseNumericRange(options[index].text)
    if (range) ranged.push({ index, option: options[index], range })
  }
  // Need a numeric option SET, not one stray number in prose
  if (ranged.length < 2) return null
  const containing = ranged.filter((r) => r.range.lo <= mid && mid <= r.range.hi)
  if (containing.length === 0) return null
  // Tightest range wins ("25-50%" over "0-100%"); ties → lower bracket
  containing.sort(
    (a, b) => (a.range.hi - a.range.lo) - (b.range.hi - b.range.lo) || a.range.lo - b.range.lo,
  )
  const best = containing[0]
  return { value: best.option.value, index: best.index, text: best.option.text, score: 0.9 }
}

// ---- Geographic answer variants -------------------------------------------------
// Sites disagree on state/country wording: the profile stores "TX" but the
// dropdown lists "Texas"; "United States" appears as "USA" or "United States
// of America". Expand the answer into its known equivalents so lexical
// placement works in BOTH directions (live gap 2026-07-15).

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
}
const US_STATE_NAMES = new Map(Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code]))

const COUNTRY_VARIANTS: string[][] = [
  ['United States', 'United States of America', 'USA', 'US'],
  ['United Kingdom', 'UK', 'Great Britain'],
]

/** One-directional: a dialing-code answer expands to its country names so
 *  "+1" places on "United States of America (+1)" — but country answers never
 *  emit "+1" (canonical "1" could exact-match a numeric rating option). */
const DIALING_CODE_COUNTRIES: Record<string, string[]> = {
  '+1': ['United States', 'United States of America', 'USA'],
}

/** Degree-level wording: the profile stores the diploma NAME ("Master of
 *  Science", "Bachelor of Engineering") while degree dropdowns list the LEVEL
 *  ("Master's Degree", "Masters", "Graduate Degree") — live gap on the Oracle
 *  CX education section (2026-07-17): "Master of Science" vs "Master's
 *  Degree" scores ~0.48, under the 0.55 placement floor. `detect` reads the
 *  level out of any phrasing; `whole` accepts bare abbreviations ("MS",
 *  "BSc") only as the ENTIRE answer — abbreviations are never EMITTED as
 *  variants (two-letter strings could exact-match unrelated options). */
const DEGREE_LEVELS: { detect: RegExp; whole?: RegExp; variants: string[] }[] = [
  {
    detect: /\bmaster/i,
    whole: /^m\.?\s?(s|sc|a|eng|ba)\.?$|^mba$/i,
    variants: ["Master's Degree", 'Masters', "Master's", 'Master Degree', 'Graduate Degree'],
  },
  {
    detect: /\bbachelor/i,
    whole: /^b\.?\s?(s|sc|a|e|eng|tech)\.?$/i,
    variants: ["Bachelor's Degree", 'Bachelors', "Bachelor's", 'Bachelor Degree', 'Undergraduate Degree'],
  },
  {
    detect: /\bdoctor|\bph\.?\s?d/i,
    variants: ['Doctorate', 'Doctoral Degree', 'PhD', 'Doctorate Degree', 'Graduate Degree'],
  },
  {
    detect: /\bassociate/i,
    variants: ["Associate's Degree", 'Associates', 'Associate Degree'],
  },
  {
    detect: /\bhigh school\b|\bged\b/i,
    variants: ['High School Diploma', 'High School or Equivalent', 'High School Diploma or GED', 'High School'],
  },
]

/** The answer plus its known geographic equivalents, primary first. */
export function answerVariants(answer: string): string[] {
  const trimmed = answer.trim()
  const variants = [trimmed]
  const upper = trimmed.toUpperCase()
  if (US_STATES[upper]) variants.push(US_STATES[upper])
  const code = US_STATE_NAMES.get(trimmed.toLowerCase())
  if (code) variants.push(code)
  for (const group of COUNTRY_VARIANTS) {
    if (group.some((g) => g.toLowerCase() === trimmed.toLowerCase()))
      variants.push(...group.filter((g) => g.toLowerCase() !== trimmed.toLowerCase()))
  }
  const dialing = DIALING_CODE_COUNTRIES[trimmed]
  if (dialing) variants.push(...dialing)
  for (const level of DEGREE_LEVELS) {
    if (level.detect.test(trimmed) || level.whole?.test(trimmed)) {
      variants.push(...level.variants)
      break
    }
  }
  // First occurrence wins so the literal answer stays primary
  return [...new Map(variants.map((v) => [v.toLowerCase(), v])).values()]
}

const SET_EQUIVALENCE_SCORE = 0.95

/** Pick the option whose text (or value) best matches the answer.
 *  Sites phrase the same choice differently ("No" vs "I am not a protected
 *  veteran"), so beyond exact/subset text matching the answer's polarity
 *  (affirm/negate/decline) selects the option with the same intent — and an
 *  option with the OPPOSITE intent is never chosen, no matter its lexical
 *  score: a wrong fill is worse than a suggestion chip.
 *  User-classified option sets (Options tab) declare texts equivalent across
 *  wordings; an explicit classification outranks both the lexical score and
 *  the heuristic polarity veto. */
export function chooseOption(
  options: FieldOption[],
  answer: string,
  optionSets: OptionSet[] = [],
): OptionChoice | null {
  const answerStripped = stripParentheticals(answer)
  const target = canonicalAnswer(answerStripped)
  if (!target) return null
  // Numeric answers on numeric option sets: contained-range beats wording
  const numeric = chooseNumericRange(options, answer)
  if (numeric) return numeric
  const answerIntent = classifyIntent(answer)
  const answerSets = setMembership(target, optionSets)
  // Geographic equivalents ("TX" ↔ "Texas", "United States (of America)")
  // score alongside the literal answer
  const targets = answerVariants(answerStripped)
    .map((v) => ({ stripped: v, canon: canonicalAnswer(v) }))
    .filter((t) => t.canon !== '')

  interface ScoredOption extends OptionChoice {
    intent: ReturnType<typeof classifyIntent>
  }
  // Veto softening (2026-07-16): the polarity veto exists to keep "Yes" off
  // "No" — it only makes sense when a same-polarity home EXISTS among the
  // options. When classifyIntent misreads and no option shares the answer's
  // polarity, a hard veto strands a correct answer; score normally instead.
  const anySameIntent =
    answerIntent !== 'unknown' &&
    options.some((o) => classifyIntent(o.text) === answerIntent)
  const scored: ScoredOption[] = []
  for (let index = 0; index < options.length; index++) {
    const option = options[index]
    const stripped = stripParentheticals(option.text)
    const text = canonicalAnswer(stripped) || canonicalAnswer(option.value)
    if (!text) continue
    const intent = classifyIntent(option.text)
    const sameSet =
      answerSets.size > 0 &&
      [...setMembership(text, optionSets)].some((id) => answerSets.has(id))
    // Polarity veto: both intents known and different → never this option —
    // unless the user explicitly grouped the two texts as equivalent, or no
    // option shares the answer's polarity at all (veto softening above).
    // (anySameIntent already implies the answer's intent is known)
    if (!sameSet && anySameIntent && intent !== 'unknown' && intent !== answerIntent) continue
    let score = sameSet ? SET_EQUIVALENCE_SCORE : 0
    for (const t of targets) {
      if (text === t.canon) {
        score = 1
        break
      }
      if (tokenSubset(text, t.canon)) score = Math.max(score, 0.85)
      else score = Math.max(score, lexicalAnswerScore(stripped, t.stripped))
    }
    scored.push({ value: option.value, index, text: option.text, score, intent })
  }

  // Intent tier: a lone option sharing the answer's polarity is the answer,
  // however differently it is phrased. Several sharing it → lexical decides.
  if (answerIntent !== 'unknown') {
    const sameIntent = scored.filter((s) => s.intent === answerIntent)
    if (sameIntent.length === 1) sameIntent[0].score = Math.max(sameIntent[0].score, 0.85)
  }

  let best: ScoredOption | null = null
  for (const s of scored) if (!best || s.score > best.score) best = s
  if (!best || best.score < 0.55) return null
  return { value: best.value, index: best.index, text: best.text, score: best.score }
}

/** Multi-select placement (checkbox groups): a compound answer ("Morning,
 *  Night" / "Evenings and weekends") places EACH part on the options. The
 *  whole answer is also tried as-is so single long answers still land. */
export function chooseOptions(
  options: FieldOption[],
  answer: string,
  optionSets: OptionSet[] = [],
): OptionChoice[] {
  const chosen = new Map<number, OptionChoice>()
  const whole = chooseOption(options, answer, optionSets)
  if (whole) chosen.set(whole.index, whole)
  const parts = answer
    .split(/[,;\n/]|\band\b|&/i)
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length > 1) {
    for (const part of parts) {
      const choice = chooseOption(options, part, optionSets)
      if (choice && !chosen.has(choice.index)) chosen.set(choice.index, choice)
    }
  }
  return [...chosen.values()].sort((a, b) => a.index - b.index)
}

// ---- Semantic option placement (meaning over wording) ---------------------------

/** Pluggable judge: given an answer and option texts, return the index of the
 *  option with the same MEANING, or null to decline. The content bootstrap
 *  wires this to the user-configured OpenAI judge (via the service worker);
 *  when unconfigured (default, tests) behavior stays lexical-only. */
export type SemanticChooser = (answer: string, optionTexts: string[]) => Promise<number | null>

let semanticChooser: SemanticChooser | null = null

export function setSemanticChooser(fn: SemanticChooser | null): void {
  semanticChooser = fn
}

/** Meaning-similarity of two strings in [0,1] from the LOCAL embedding cache
 *  (src/lib/embed-cache) — null when embeddings are unconfigured. Unlike the
 *  judge hooks this costs no LLM call per use; only never-seen strings hit
 *  the API once. */
export type SemanticSimilarity = (a: string, b: string) => Promise<number | null>

let semanticSimilarity: SemanticSimilarity | null = null

export function setSemanticSimilarity(fn: SemanticSimilarity | null): void {
  semanticSimilarity = fn
}

/** Embedding cosine at/above this = "the same question, reworded". */
const EMBED_SAME_QUESTION = 0.9
/** Winner must beat the best differently-answered rival by this much —
 *  an ambiguous semantic neighborhood must not autofill. */
const EMBED_MARGIN = 0.08
/** Embedding cosine for OPTION placement ("Bachelor's Degree" ↔ "BS —
 *  Bachelor of Science"). Options are shorter/noisier than questions. */
const EMBED_OPTION_MIN = 0.62

/** Which stored question (by index) asks the same thing as this form
 *  question? Fixes wording drift the lexical scorer can't bridge. */
export type SemanticQuestionMatcher = (
  question: string,
  candidateQuestions: string[],
) => Promise<number | null>

let semanticQuestionMatcher: SemanticQuestionMatcher | null = null

export function setSemanticQuestionMatcher(fn: SemanticQuestionMatcher | null): void {
  semanticQuestionMatcher = fn
}

/** No stored answer at all: infer the option from the applicant's facts. */
export type SemanticAnswerer = (
  question: string,
  optionTexts: string[],
  facts: string,
) => Promise<number | null>

let semanticAnswerer: SemanticAnswerer | null = null

export function setSemanticAnswerer(fn: SemanticAnswerer | null): void {
  semanticAnswerer = fn
}

/** Hierarchical dropdown: pick the (category, sub-option) pair from the full
 *  harvested tree in ONE call. Anchored to the saved answer when present,
 *  else the fact sheet; null = decline. */
export type SemanticCascader = (
  question: string,
  answer: string,
  facts: string,
  categories: CascadeCategory[],
) => Promise<{ category: number; option: number } | null>

let semanticCascader: SemanticCascader | null = null

export function setSemanticCascader(fn: SemanticCascader | null): void {
  semanticCascader = fn
}

/** Harvesting a hierarchy costs real popup clicks — skip it when no judge is
 *  configured to consume the tree (and no stored answer wants exploring). */
export function semanticCascadeAvailable(): boolean {
  return semanticCascader !== null
}

/** No stored answer, free-TEXT field: draft a short answer from the
 *  applicant's facts. Suggestion chip only, never a silent fill. */
export type SemanticTextAnswerer = (
  question: string,
  facts: string,
  kind: 'text' | 'textarea',
) => Promise<string | null>

let semanticTextAnswerer: SemanticTextAnswerer | null = null

export function setSemanticTextAnswerer(fn: SemanticTextAnswerer | null): void {
  semanticTextAnswerer = fn
}

const FACT_SHEET_BUDGET = 4000
const FACT_LINE_CLAMP = 300

/** Fact sheet handed to the judge — profile essentials always, then stored
 *  Q→As most-relevant-first (lexical score vs the current question) within a
 *  whole-line character budget, so a growing store can't crowd out the facts
 *  that answer THIS question. */
export function buildFactSheet(ctx: MatcherContext, question?: string): string {
  const p = ctx.profile
  const lines = [
    `Name: ${[p.firstName, p.lastName].filter(Boolean).join(' ')}`,
    p.address.city && `Location: ${p.address.city}, ${p.address.state} ${p.address.country}`,
    p.workAuthorization && `Work authorization: ${p.workAuthorization}`,
    `Legally authorized to work: ${p.authorizedToWork ? 'Yes' : 'No'}`,
    `Requires visa sponsorship: ${p.requiresSponsorship ? 'Yes' : 'No'}`,
    `Willing to relocate: ${p.willingToRelocate ? 'Yes' : 'No'}`,
    p.earliestStartDate && `Earliest start date: ${p.earliestStartDate}`,
    p.noticePeriod && `Notice period: ${p.noticePeriod}`,
    p.desiredSalary && `Desired salary: ${p.desiredSalary}`,
    p.workHistory[0] && `Current/most recent role: ${p.workHistory[0].title} at ${p.workHistory[0].company}`,
    p.education[0] && `Education: ${p.education[0].degree} in ${p.education[0].field}, ${p.education[0].institution}`,
  ].filter(Boolean) as string[]

  const clamp = (s: string) => (s.length > FACT_LINE_CLAMP ? `${s.slice(0, FACT_LINE_CLAMP)}…` : s)
  const qaLines = ctx.qa
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.answerType === 'text' && entry.answer.trim() !== '')
  if (question) {
    const relevance = new Map<number, number>()
    for (const { entry, index } of qaLines) {
      let best = 0
      for (const text of [entry.question, ...entry.aliases]) {
        const s = lexicalScore(question, text)
        if (s > best) best = s
      }
      relevance.set(index, best)
    }
    // Deterministic: score desc, then original order
    qaLines.sort((a, b) => (relevance.get(b.index)! - relevance.get(a.index)!) || a.index - b.index)
  }

  let used = lines.reduce((n, l) => n + l.length + 1, 0)
  for (const { entry } of qaLines) {
    const line = clamp(`Q: ${entry.question} → A: ${entry.answer}`)
    if (used + line.length + 1 > FACT_SHEET_BUDGET) break
    lines.push(line)
    used += line.length + 1
  }
  return lines.join('\n')
}

const SEMANTIC_SCORE = 0.9
const INFERENCE_SCORE = 0.86

/** Meaning-level placement when lexical matching can't place the answer.
 *  Two tiers (2026-07-16): the LOCAL embedding cache first — free after the
 *  first encounter, and it bridges rewordings like "Bachelor's Degree" ↔
 *  "BS — Bachelor of Science" — then the LLM judge, anchored to the stored
 *  answer (same meaning first, closest professional equivalent second),
 *  declining rather than inventing. The polarity veto applies to both tiers.
 *  Validated successes are distilled into option-equivalence sets
 *  (recordOptionEquivalence), so the next encounter is offline-exact. */
export async function semanticChooseOption(
  options: FieldOption[],
  answer: string,
): Promise<OptionChoice | null> {
  if (options.length === 0 || !answer.trim()) return null
  const answerIntent = classifyIntent(answer)
  const anySameIntent =
    answerIntent !== 'unknown' && options.some((o) => classifyIntent(o.text) === answerIntent)

  // Tier 1: embedding cosine over the option texts (no LLM call)
  if (semanticSimilarity) {
    const strippedAnswer = stripParentheticals(answer)
    let bestIndex = -1
    let bestSim = 0
    let secondSim = 0
    for (let index = 0; index < options.length; index++) {
      const option = options[index]
      if (!option.text.trim()) continue
      const intent = classifyIntent(option.text)
      if (anySameIntent && intent !== 'unknown' && intent !== answerIntent) continue // veto
      if (isPlaceholderOptionText(option.text)) continue
      const sim = await semanticSimilarity(strippedAnswer, stripParentheticals(option.text))
      if (sim === null) {
        bestIndex = -1
        break // embeddings unavailable — fall to the judge
      }
      if (sim > bestSim) {
        secondSim = bestSim
        bestSim = sim
        bestIndex = index
      } else if (sim > secondSim) {
        secondSim = sim
      }
    }
    if (bestIndex >= 0 && bestSim >= EMBED_OPTION_MIN && bestSim - secondSim >= EMBED_MARGIN) {
      const option = options[bestIndex]
      return {
        value: option.value,
        index: bestIndex,
        text: option.text,
        score: Math.min(0.9, Math.max(0.7, bestSim)),
      }
    }
  }

  // Tier 2: the LLM judge
  if (!semanticChooser) return null
  try {
    const index = await semanticChooser(answer, options.map((o) => o.text))
    if (index === null || index < 0 || index >= options.length) return null
    const option = options[index]
    return { value: option.value, index, text: option.text, score: SEMANTIC_SCORE }
  } catch {
    return null
  }
}

/** "Select One"-style text, on a bare string (for the embedding tier). */
function isPlaceholderOptionText(text: string): boolean {
  const t = text.trim().replace(/^[-–—.\s]+|[-–—.\s]+$/g, '')
  return t === '' || PLACEHOLDER_OPTION_RE.test(t)
}

/** Distillation: a semantic bridge (embedding or judge) that VALIDATED ok
 *  becomes a stored equivalence, so the next site places offline at
 *  SET_EQUIVALENCE_SCORE. Returns the option set to upsert — an existing set
 *  containing either text grows, else a new auto-labeled set is born — or
 *  null when the pair is already covered (or trivially identical). */
export function recordOptionEquivalence(
  optionSets: OptionSet[],
  answerText: string,
  optionText: string,
  newId: () => string,
): OptionSet | null {
  const a = canonicalAnswer(stripParentheticals(answerText))
  const b = canonicalAnswer(stripParentheticals(optionText))
  if (!a || !b || a === b) return null
  const inBoth = (set: OptionSet, canon: string) =>
    set.options.some((o) => canonicalAnswer(stripParentheticals(o)) === canon)
  for (const set of optionSets) {
    const hasA = inBoth(set, a)
    const hasB = inBoth(set, b)
    if (hasA && hasB) return null // already equivalent
    if (hasA) return { ...set, options: [...set.options, optionText.trim()] }
    if (hasB) return { ...set, options: [...set.options, answerText.trim()] }
  }
  return {
    id: newId(),
    label: `auto: ${answerText.trim().slice(0, 40)}`,
    options: [answerText.trim(), optionText.trim()],
  }
}

/** Fill-time inference for custom dropdowns (their options only exist once
 *  the popup opens): the judge picks the option the facts determine, or
 *  declines. Exported for autofill.ts. */
export async function semanticAnswerOption(
  question: string,
  options: FieldOption[],
  facts: string,
): Promise<OptionChoice | null> {
  if (!semanticAnswerer || options.length === 0 || !question.trim()) return null
  try {
    const index = await semanticAnswerer(question, options.map((o) => o.text), facts)
    if (index === null || index < 0 || index >= options.length) return null
    const option = options[index]
    return { value: option.value, index, text: option.text, score: INFERENCE_SCORE }
  } catch {
    return null
  }
}

/** Hierarchical dropdowns ("How did you hear about us?"): one judge call over
 *  the harvested category → sub-option tree picks the primary + sub-option
 *  COMBINATION — the model weighs both levels together, where per-level
 *  matching had to commit to a category blind. The reply is validated against
 *  the tree (in-range, non-placeholder leaf) and returned as TEXTS so the
 *  caller can navigate by content even if the popup re-renders. Exported for
 *  autofill.ts. */
export async function semanticCascadePath(
  question: string,
  answer: string,
  facts: string,
  categories: CascadeCategory[],
): Promise<{ categoryText: string; optionText: string } | null> {
  if (!semanticCascader || categories.length === 0 || !question.trim()) return null
  if (!answer.trim() && !facts.trim()) return null // nothing to anchor the judge
  try {
    const path = await semanticCascader(question, answer, facts, categories)
    if (!path) return null
    const branch = categories[path.category]
    const optionText = branch?.options[path.option]
    if (optionText === undefined || isPlaceholderOptionText(optionText)) return null
    return { categoryText: branch.label, optionText }
  } catch {
    return null
  }
}

const YES_RE = /^(yes|y|true|1)$/i
const NO_RE = /^(no|n|false|0)$/i

/** Options that are real choices, not the "- Select -" placeholder row. */
const PLACEHOLDER_OPTION_RE = /^(please\s+)?(select|choose|pick)\b/i

function isPlaceholderOption(o: FieldOption): boolean {
  if (o.value !== '') return false
  // "- Select -", "-- Choose one --": strip the dash/dot dressing first
  const text = o.text.trim().replace(/^[-–—.\s]+|[-–—.\s]+$/g, '')
  return text === '' || PLACEHOLDER_OPTION_RE.test(text)
}

export function realOptionCount(options: FieldOption[]): number {
  return options.filter((o) => !isPlaceholderOption(o)).length
}

// ---- Tier 2 candidates ----------------------------------------------------------

interface Candidate {
  questionTexts: string[]
  answerTemplate: string
  source: MatchResult['source']
  personaSpecific: boolean
  persona?: string
  needsReview: boolean
  composite: boolean
  /** e.g. EEO seeds ship autofillByDefault=false — never auto-filled. */
  capSuggest: boolean
  /** Guidance-only: chip tells the user, never fills (Section: notify). */
  notify?: boolean
  /** Alternate answers tried in order when the primary places on no option. */
  fallbacks?: string[]
  /** Where the backing entry came from — learned sources (captured/inferred)
   *  face the higher CAPTURED_AUTOFILL_MIN question-score bar. */
  sourceKind?: QASource
  /** Graduated learned entry (okCount ≥ 3, no wrongs since approval) —
   *  earned back the normal thresholds. */
  trusted?: boolean
  /** answerMode 'judge': this question routes option placement to the OpenAI
   *  judge alone — a per-question rule, honored whatever tier wins. */
  judgeOnly?: boolean
}

function qaCandidates(ctx: MatcherContext): Candidate[] {
  const out: Candidate[] = []
  // Stored copies of SEED questions freeze their aliases at answer/import
  // time, so catalog alias improvements never reach them (live NOV
  // 2026-07-17: seed-drug-screen kept scoring 0.44 against a wording the
  // catalog had learned). Union the live catalog's aliases in by seed id —
  // stored entries carry the "seed-" prefix ("seed-relatives"), the catalog
  // may not ("relatives"), so index BOTH forms.
  const catalogAliases = new Map(
    ctx.seeds.flatMap((s) => {
      const bare = s.id.replace(/^seed-/, '')
      return [[bare, s.aliases], [`seed-${bare}`, s.aliases]] as [string, string[]][]
    }),
  )
  for (const entry of ctx.qa) {
    const personaSpecific = entry.personas.length > 0
    if (personaSpecific && (!ctx.activePersona || !entry.personas.includes(ctx.activePersona)))
      continue
    // Site-scoped entries (branded answers like "mcwane.com") never match on
    // foreign hosts — they aren't wrong, they're just THAT site's answer.
    if (entry.siteScope && (!ctx.hostname || !hostMatchesDomain(ctx.hostname, entry.siteScope)))
      continue

    let template: string
    let composite = false
    if (entry.answerType === 'profile' && entry.mapsTo) {
      template = readProfilePath(ctx.profile, entry.mapsTo)
    } else if (entry.answerType === 'composite' && entry.answerTemplate) {
      const rendered = renderComposite(entry.answerTemplate, ctx.profile)
      if (rendered.empty) continue
      template = rendered.text
      composite = true
    } else {
      template = entry.answer
    }
    if (!template.trim()) continue // never fill from a blank answer (Section 2)

    const notify = entry.answerType === 'notify'
    const aliasUnion = [...new Set([...entry.aliases, ...(catalogAliases.get(entry.id) ?? [])])]
    out.push({
      questionTexts: [entry.question, ...aliasUnion],
      answerTemplate: template,
      source: `qa:${entry.id}`,
      personaSpecific,
      persona: personaSpecific ? ctx.activePersona ?? undefined : undefined,
      needsReview: entry.status === 'needs_review',
      composite,
      capSuggest: notify,
      notify,
      fallbacks: entry.fallbacks,
      sourceKind: entry.source,
      trusted: (entry.okCount ?? 0) >= TRUSTED_OK_COUNT && (entry.wrongCount ?? 0) === 0,
      judgeOnly: entry.answerMode === 'judge' || undefined,
    })
  }
  return out
}

/** Profile/composite seed questions become candidates resolved from the
 *  profile at match time; the read-only catalog itself is never mutated and
 *  seeds that resolve empty are skipped (Section 2). */
function seedCandidates(ctx: MatcherContext): Candidate[] {
  const out: Candidate[] = []
  for (const seed of ctx.seeds) {
    if (seed.answerType === 'freeText') continue
    let template: string
    let composite = false
    let notify = false
    if (seed.answerType === 'profile' && seed.mapsTo) {
      template = readProfilePath(ctx.profile, seed.mapsTo)
    } else if (seed.answerType === 'composite' && seed.answerTemplate) {
      const rendered = renderComposite(seed.answerTemplate, ctx.profile)
      if (rendered.empty) continue
      template = rendered.text
      composite = true
    } else if (seed.answerType === 'notify') {
      // Guidance-only seeds ("Preferred locations: … — pick per posting"):
      // the chip surfaces the guidance, nothing is ever filled.
      template = seed.guidance ?? ''
      notify = true
    } else {
      continue
    }
    if (!template.trim()) continue

    out.push({
      questionTexts: [seed.question, ...seed.aliases],
      answerTemplate: template,
      source: 'profile',
      personaSpecific: false,
      needsReview: false,
      composite,
      capSuggest: !seed.autofillByDefault || notify,
      notify,
      fallbacks: seed.fallbacks,
    })
  }
  return out
}

// ---- Persona inference (Section 6) -----------------------------------------------

export function inferPersona(roleText: string | null, personas: string[]): string | null {
  if (!roleText) return null
  const role = canonical(roleText)
  for (const persona of personas) {
    const p = canonical(persona)
    if (p && role.includes(p)) return persona
  }
  return null
}

// ---- Main ---------------------------------------------------------------------------

const PERSONA_BOOST = 0.07

/** Learned entries (captured/inferred) autofill only on exact/near-exact
 *  question or alias wording; anything fuzzier is a suggestion chip. The
 *  pre-clamp QUESTION score is compared — option-placement scores must not
 *  demote a legitimately exact question match. Graduated (trusted) entries
 *  are exempt: three validated fills with no wrongs earn normal thresholds. */
export const CAPTURED_AUTOFILL_MIN = 0.95
/** Validation-ok fills needed (with zero wrongs) for a learned entry to
 *  graduate back to normal thresholds. */
export const TRUSTED_OK_COUNT = 3

// ---- Qualifier guard --------------------------------------------------------------
// Lexical (and embedding) similarity cannot tell a PARAPHRASE from a
// NEAR-NEIGHBOR DIFFERENT QUESTION: "current salary" vs "desired salary"
// score high on both. Qualifier families make that distinction deterministic:
// when the field's question and the stored question carry members of
// DIFFERENT sets within the same family, they ask different things — cap to
// suggest no matter the score.

// Stem-prefixed (≥4 chars match as prefixes) so both raw labels ("Desired")
// and canonicalized stored questions ("desire") hit the same set.
const QUALIFIER_FAMILIES: string[][][] = [
  [
    ['current', 'present', 'existing', 'today'],
    ['desire', 'expect', 'prefer', 'target', 'ideal', 'request'],
  ],
  [
    ['previous', 'previou', 'prior', 'former', 'past', 'last'],
    ['future', 'next', 'upcoming'],
  ],
  [
    ['start', 'begin', 'earliest', 'first'],
    ['end', 'finish', 'latest', 'final'],
  ],
  [
    ['minimum', 'min', 'lowest'],
    ['maximum', 'max', 'highest'],
  ],
]

function qualifierSet(text: string, family: string[][]): number | null {
  for (let i = 0; i < family.length; i++) {
    const hit = family[i].some((w) =>
      w.length >= 4
        ? new RegExp(`\\b${w}\\w*\\b`, 'i').test(text) // prefix: desire(d), expect(ed)
        : new RegExp(`\\b${w}\\b`, 'i').test(text), // exact: min, max, end
    )
    if (hit) return i
  }
  return null
}

/** True when the two question texts carry CONFLICTING qualifiers — same
 *  family, different set ("current …" vs "desired …"). */
export function conflictingQualifiers(a: string, b: string): boolean {
  for (const family of QUALIFIER_FAMILIES) {
    const sa = qualifierSet(a, family)
    const sb = qualifierSet(b, family)
    if (sa !== null && sb !== null && sa !== sb) return true
  }
  return false
}

interface Scored {
  candidate: Candidate
  score: number
}

async function scoreCandidate(
  questionText: string,
  rawText: string,
  candidate: Candidate,
  score: NonNullable<MatcherContext['score']>,
): Promise<number> {
  let best = 0
  for (const question of candidate.questionTexts) {
    const s = await score(questionText, question)
    if (s > best) best = s
    if (rawText && rawText !== questionText) {
      const sRaw = 0.95 * (await score(rawText, question))
      if (sRaw > best) best = sRaw
    }
  }
  if (candidate.personaSpecific) best = Math.min(1, best + PERSONA_BOOST)
  return best
}

function decideAction(
  confidence: number,
  settings: Settings,
  caps: { suggestOnly: boolean },
): MatchAction {
  if (confidence < settings.suggestThreshold) return 'ignore'
  if (confidence >= settings.autoFillThreshold && !caps.suggestOnly) return 'autofill'
  return 'suggest'
}

/**
 * Match one field. Returns null for fields we must never touch
 * (consent checkboxes, file inputs) so they can only be flagged in the UI.
 */
export async function matchField(
  signal: SignalBundle,
  ctx: MatcherContext,
): Promise<MatchResult | null> {
  // File inputs: route to document matching (resume feature, 2026-07-17 —
  // supersedes the old unconditional null). pickDocument is honest: a
  // cover-letter zone with no stored cover letter returns null → the flag
  // chip stays the fallback. Suggest-only via settings.autoAttachDocuments.
  if (signal.kind === 'file') {
    const doc = pickDocument(ctx.documents ?? [], {
      docCue: signal.docCue,
      accept: signal.accept,
      persona: ctx.activePersona,
    })
    if (!doc) return null
    const DOCUMENT_SCORE = 0.92
    return {
      fieldId: signal.fieldId,
      resolvedAnswer: null,
      rawAnswerTemplate: doc.name,
      confidence: DOCUMENT_SCORE,
      source: `document:${doc.id}`,
      unresolvedVars: [],
      action: decideAction(DOCUMENT_SCORE, ctx.settings, {
        suggestOnly: !ctx.settings.autoAttachDocuments,
      }),
      needsReview: false,
      composite: false,
    }
  }
  // Consent boxes (user decision 2026-07-14, superseding the chip split):
  // fill from stored curated answers like any field. They only ever match a
  // STORED answer — inference below explicitly skips consentLike, so an
  // unanswered consent box still just gets the manual-review flag.

  const score = ctx.score ?? lexicalScore
  const tier1 = signal.kind === 'checkbox' ? null : tier1Match(signal, ctx)

  // -- Tier 2
  const questionText = decontextualize(signal.normalizedQuestion, ctx.pageContext, ctx.hostname)
  const rawText = decontextualize(canonical(signal.rawText), ctx.pageContext, ctx.hostname)
  const candidates = [...qaCandidates(ctx), ...seedCandidates(ctx)]
  const fieldTopicText = signal.label || signal.normalizedQuestion
  const scored: Scored[] = []
  for (const candidate of candidates) {
    // EEO asymmetry: a LEARNED entry whose primary question is demographic
    // never competes for a non-EEO field, and vice versa — a poisoned alias
    // from a misattributed capture otherwise rides an exact-question score
    // past every gate (live 2026-07-16: "School or University*" alias on a
    // captured disability answer beat the school seed at 1.0). Curated
    // entries and seeds are exempt: their questions are user-authored.
    if (
      (candidate.sourceKind === 'captured' || candidate.sourceKind === 'inferred') &&
      crossesEeoTopic(fieldTopicText, candidate.questionTexts[0])
    )
      continue
    const s = await scoreCandidate(questionText, rawText, candidate, score)
    if (s > 0) scored.push({ candidate, score: s })
  }

  const clearing = scored.filter((s) => s.score >= ctx.settings.suggestThreshold)
  // Equal scores: curated beats learned. A captured fragment ("study" →
  // "industrial") must not out-rank the curated entry it shadows just by
  // sitting earlier in the store (live tie: both hit 1.0 on "Field of Study").
  const curatedRank = (s: Scored) =>
    s.candidate.sourceKind === 'captured' || s.candidate.sourceKind === 'inferred' ? 0 : 1
  const pickBest = (pool: Scored[]): Scored | null =>
    pool.reduce<Scored | null>((best, s) => {
      if (!best) return s
      if (s.score > best.score) return s
      if (s.score === best.score && curatedRank(s) > curatedRank(best)) return s
      return best
    }, null)
  // Per-question judge routing (user setting, answerMode 'judge'): when a
  // judge-mode entry IS this question, option placement belongs to the
  // OpenAI judge ALONE — whatever tier wins the answer (tier-1 outranks the
  // entry inside education blocks, but the routing rule still applies).
  // "IS this question" = the judge entry tops the clearing pool with a
  // strong score. `clearing.some(judgeOnly)` disabled lexical placement on
  // UNRELATED questions the entry weakly cleared against — live NOV
  // 2026-07-17: "authorized to work for NOV?" had a placeable tier-1 "Yes"
  // but suggested placement-less because Field of Study cleared at ~0.6.
  const bestClearing = pickBest(clearing)
  const judgeOnlyRule = !!bestClearing?.candidate.judgeOnly && bestClearing.score >= 0.8

  // Preference order among threshold-clearing candidates (Section 6):
  // composite when the field wants multiple parts, then persona-specific,
  // then raw score.
  let best: Scored | null = null
  if (signal.multiplicityCue) best = pickBest(clearing.filter((s) => s.candidate.composite))
  if (!best) {
    const personaPool = clearing.filter((s) => s.candidate.personaSpecific)
    best = pickBest(personaPool) ?? pickBest(scored)
  }

  // Wording drift the lexical scorer can't bridge ("How should recruiters
  // get in touch?" ↔ stored "Preferred contact method"): ask the judge which
  // stored question MEANS the same thing. Option-bearing kinds only — that's
  // where an unplaced answer means a dead field.
  const optionKind =
    signal.kind === 'select' || signal.kind === 'radio' || signal.kind === 'custom-dropdown'
  let driftHit = false
  if (
    (!best || best.score < ctx.settings.suggestThreshold) &&
    optionKind &&
    semanticQuestionMatcher &&
    candidates.length > 0
  ) {
    const pool = candidates.slice(0, 40)
    const index = await semanticQuestionMatcher(
      signal.label || questionText,
      pool.map((c) => c.questionTexts[0]),
    )
    if (index !== null && pool[index]) {
      best = { candidate: pool[index], score: 0.87 }
      // Alias-learnable only for qa-backed entries (seeds aren't mutable)
      driftHit = pool[index].source.startsWith('qa:')
    }
  }

  // -- Rank results across tiers, highest confidence first
  const tier2Confidence = best?.score ?? 0
  // Inside an INDEXED repeated section, the only correct answer is THAT
  // entry's — tier-2 answers are global by construction (persistLearning
  // never saves sectionIndex answers) and can't be section-correct. Live
  // bug: the seed catalog's exact "Degree" alias (1.0) beat the
  // section-aware getter (0.9) on education block 2, so the PSG degree
  // field got the "highest degree" answer (Masters) instead of Bachelors.
  const entryKey = tier1?.matchedKey ?? ''
  const educationEntryKey = entryKey.startsWith('education.')
  const workEntryKey = WORK_SECTION_KEYS.has(entryKey)
  const indexedSectionEntry =
    tier1 !== null &&
    signal.sectionIndex !== undefined &&
    ((signal.sectionKind === 'education' && educationEntryKey) ||
      (signal.sectionKind === 'work' && workEntryKey))
  // UN-indexed repeats: Oracle CX education blocks carry no Workday-style
  // ids and no numbered headings, so no sectionIndex exists — but when
  // tier-1 lands the SAME entry key on ≥2 fields of this page, the page
  // repeats entries and only the rotating getter is section-correct. A
  // global tier-2 answer ({{education.0.*}} seed template, stored
  // "highest degree"-style snapshot) stamps entry #1 onto EVERY block
  // (live NOV 2026-07-17: both School fields filled "University of
  // Houston"). Education keys qualify on the count alone; work keys also
  // need block evidence (sectionKind) — questionnaire pages legitimately
  // ask "current employer" + "most recent employer" as global fields.
  const repeatedEntryKey =
    tier1 !== null &&
    (ctx.tier1KeyCounts?.[entryKey] ?? 0) >= 2 &&
    (educationEntryKey || (signal.sectionKind === 'work' && workEntryKey))
  const sectionEntryAnswer = indexedSectionEntry || repeatedEntryKey
  const useTier1 = tier1 !== null && (sectionEntryAnswer || tier1.confidence >= tier2Confidence)

  interface Resolution {
    template: string
    confidence: number
    source: MatchResult['source']
    needsReview: boolean
    composite: boolean
    persona?: string
    capSuggest: boolean
    matchedKey?: string
    notify?: boolean
    fallbacks?: string[]
    provenance?: MatchResult['provenance']
    sourceKind?: QASource
    trusted?: boolean
    primaryQuestion?: string
    /** answerMode 'judge' entry — may never place lexically in the walk. */
    judgeOnly?: boolean
  }
  const tier1Res: Resolution | null = tier1
    ? {
      template: tier1.value,
      confidence: tier1.confidence,
      source: 'profile',
      needsReview: false,
      composite: false,
      capSuggest: false,
      matchedKey: tier1.matchedKey,
      fallbacks: tier1.fallbacks,
    }
    : null
  const toResolution = (s: Scored): Resolution => ({
    template: s.candidate.answerTemplate,
    confidence: s.score,
    source: s.candidate.source,
    needsReview: s.candidate.needsReview,
    composite: s.candidate.composite,
    persona: s.candidate.persona,
    capSuggest: s.candidate.capSuggest,
    notify: s.candidate.notify,
    fallbacks: s.candidate.fallbacks,
    provenance: driftHit && best === s ? 'drift' : undefined,
    sourceKind: s.candidate.sourceKind,
    trusted: s.candidate.trusted,
    primaryQuestion: s.candidate.questionTexts[0],
    judgeOnly: s.candidate.judgeOnly,
  })

  const ranked: Resolution[] = []
  if (useTier1 && tier1Res) ranked.push(tier1Res)
  // sectionEntryAnswer: tier-2 candidates don't even ride as option-walk
  // fallbacks — a global "Masters" placing after the entry's "Bachelor of
  // Engineering" failed to place is still the wrong education entry. Better
  // an honest failure chip than a section-incorrect fill.
  if (best && !sectionEntryAnswer) ranked.push(toResolution(best))
  if (!useTier1 && tier1Res) ranked.push(tier1Res)
  // runner-up threshold-clearing candidates, best-first — an option-bearing
  // field may be fillable from one of these when the winner's answer maps to
  // no option (e.g. tier-1 "US Citizen" on a Yes/No authorization listbox)
  if (!sectionEntryAnswer) {
    for (const s of [...clearing].sort((a, b) => b.score - a.score)) {
      if (s !== best) ranked.push(toResolution(s))
    }
  }
  if (ranked.length === 0) {
    // Nothing stored matches at all — infer from the applicant's facts.
    // The judge is told to decline unless the facts determine the answer;
    // demographics (eeoLike) and consent boxes are never inferred.
    const questionForJudge = signal.label || signal.normalizedQuestion
    if (signal.eeoLike || signal.consentLike) return null

    if (
      semanticAnswerer &&
      (signal.kind === 'select' || signal.kind === 'radio') &&
      signal.options.length > 0
    ) {
      const index = await semanticAnswerer(
        questionForJudge,
        signal.options.map((o) => o.text),
        buildFactSheet(ctx, questionForJudge),
      )
      if (index !== null && signal.options[index]) {
        const option = signal.options[index]
        return {
          fieldId: signal.fieldId,
          resolvedAnswer: null,
          rawAnswerTemplate: option.text,
          confidence: INFERENCE_SCORE,
          source: 'profile',
          unresolvedVars: [],
          // valueless radios all read value "on" — a value pin resolves
          // first-match-wins in fillRadioGroup and lands the pick on the
          // wrong duplicate (polarity flip). Radios place by exact text walk.
          chosenOptionValue: signal.kind === 'select' ? option.value || option.text : undefined,
          action: decideAction(INFERENCE_SCORE, ctx.settings, { suggestOnly: false }),
          needsReview: false,
          composite: false,
          provenance: 'inferred',
        }
      }
      return null
    }

    // Custom dropdowns load their options only after the popup opens —
    // defer the judge's pick to fill time (fillCustomDropdown).
    if (semanticAnswerer && signal.kind === 'custom-dropdown') {
      return {
        fieldId: signal.fieldId,
        resolvedAnswer: null,
        rawAnswerTemplate: '',
        confidence: INFERENCE_SCORE,
        source: 'profile',
        unresolvedVars: [],
        action: decideAction(INFERENCE_SCORE, ctx.settings, { suggestOnly: false }),
        needsReview: false,
        composite: false,
        inferAtFill: true,
        provenance: 'inferred',
      }
    }

    // Open-ended text: draft an answer from the facts and FILL it (user
    // decision 2026-07-14: no review step; the judge declines with UNKNOWN
    // rather than invent). Identity-style short labels are skipped (empty
    // tier-1 territory; generating "my email" is noise).
    if (
      semanticTextAnswerer &&
      (signal.kind === 'text' || signal.kind === 'textarea') &&
      questionForJudge.trim() !== ''
    ) {
      if (isIdentityLabel(signal.label)) return null
      const text = await semanticTextAnswerer(
        questionForJudge,
        buildFactSheet(ctx, questionForJudge),
        signal.kind === 'textarea' ? 'textarea' : 'text',
      )
      if (text) {
        return {
          fieldId: signal.fieldId,
          resolvedAnswer: null,
          rawAnswerTemplate: text,
          confidence: INFERENCE_SCORE,
          source: 'profile',
          unresolvedVars: [],
          action: decideAction(INFERENCE_SCORE, ctx.settings, { suggestOnly: false }),
          needsReview: false,
          composite: false,
          provenance: 'inferred',
        }
      }
    }
    return null
  }

  let resolution = ranked[0]

  // Option-bearing controls: we must be able to point at a concrete option.
  // Walk the ranked candidates (each with its ordered fallback answers) and
  // take the first whose answer chooseOption can actually place; only the
  // winner may proceed placement-less (capped).
  let chosenOptionValue: string | undefined
  let chosenOptionValues: string[] | undefined
  let optionScore: number | undefined
  let placedTemplate: string | undefined
  if (signal.kind === 'select' || signal.kind === 'radio') {
    if (!judgeOnlyRule) {
      outer: for (const candidate of ranked) {
        if (candidate.notify) continue // guidance is never placed on options
        if (candidate.judgeOnly) continue // judge-mode entries never place lexically
        for (const answer of [candidate.template, ...(candidate.fallbacks ?? [])]) {
          const choice = chooseOption(signal.options, answer, ctx.optionSets)
          if (choice) {
            resolution = candidate
            chosenOptionValue = choice.value
            optionScore = choice.score
            placedTemplate = answer
            break outer
          }
        }
      }
    }
    if (chosenOptionValue === undefined && !ranked[0].notify) {
      // Wording too different for lexical placement — ask the semantic judge
      // (same meaning first, closest professional equivalent second). Judge-
      // routed questions land here directly: the judge is their ONLY placer.
      const semantic = await semanticChooseOption(signal.options, ranked[0].template)
      if (semantic) {
        resolution = ranked[0]
        chosenOptionValue = semantic.value || semantic.text
        optionScore = semantic.score
      }
    }
  }

  let { template, confidence, source, needsReview, composite, persona, capSuggest } = resolution
  if (placedTemplate !== undefined) template = placedTemplate
  // The QUESTION-match score, before any option-placement clamp below — the
  // source-aware bar must not demote an exact question match whose option
  // placement scored 0.85.
  const questionScore = resolution.confidence

  // Multi-select checkbox groups inherently hold several parts
  const checkboxGroup = signal.kind === 'checkbox' && signal.options.length > 1
  // Fields that want several parts must not get a single-value guess (§6)
  if (signal.multiplicityCue && !composite && !checkboxGroup) capSuggest = true

  // Review gate restored (2026-07-16, superseding 2026-07-14): pending
  // learned entries SUGGEST — approval is one chip-Accept away, and that
  // accept both fills and activates the entry.
  if (needsReview) capSuggest = true

  // Qualifier guard: same family, different set ("current …" vs "desired …")
  // = a different question, however similar the wording scores. Applies to
  // every tier-2 winner — a curated "desired salary" answer landing on a
  // "current salary" field is just as wrong as a learned one. Deterministic,
  // and it outranks the semantic assist below by design: embeddings score
  // those near-neighbor traps HIGH.
  const fieldQuestionText = signal.label || signal.normalizedQuestion
  const qualifierConflict =
    !!resolution.primaryQuestion &&
    conflictingQualifiers(fieldQuestionText, resolution.primaryQuestion)
  if (qualifierConflict) capSuggest = true

  // Semantic question check (embeddings, key-gated): is the field's question
  // THE SAME QUESTION as the stored one, in different words? Requires high
  // cosine AND a clear margin over every differently-answered rival — an
  // ambiguous neighborhood never autofills. Two effects when it passes:
  // the confidence rises to the semantic level (a paraphrase the lexical
  // scorer scored 0.4 can still clear the thresholds), and the learned-entry
  // bar below treats the question as exact. Skipped entirely on qualifier
  // conflicts — embeddings score those traps HIGH by nature.
  let semanticExact = false
  if (
    semanticSimilarity &&
    resolution.primaryQuestion &&
    !qualifierConflict &&
    !resolution.notify &&
    questionScore < CAPTURED_AUTOFILL_MIN
  ) {
    const own = await semanticSimilarity(fieldQuestionText, resolution.primaryQuestion)
    if (own !== null && own >= EMBED_SAME_QUESTION) {
      let rivalSim = 0
      const ownAnswer = canonicalAnswer(resolution.template)
      for (const s of scored) {
        if (best && s === best) continue
        if (canonicalAnswer(s.candidate.answerTemplate) === ownAnswer) continue
        const sim = await semanticSimilarity(fieldQuestionText, s.candidate.questionTexts[0])
        if (sim !== null && sim > rivalSim) rivalSim = sim
      }
      if (own - rivalSim >= EMBED_MARGIN) {
        semanticExact = true
        // 0.93 cap: semantically-matched fills stay below lexical-exact ones
        confidence = Math.max(confidence, Math.min(own, 0.93))
      } else {
        // Same meaning but an ambiguous neighborhood: worth a SUGGESTION
        // chip (the user decides), never a silent fill.
        confidence = Math.max(confidence, 0.75)
        capSuggest = true
      }
    }
  }

  // Source-aware bar: approved learned entries autofill only when the
  // QUESTION is exact/near-exact until they graduate (trusted) — lexical
  // (≥ CAPTURED_AUTOFILL_MIN) or semantic (the check above). Curated
  // training/import entries and tier-1/seed matches are untouched.
  if (
    (resolution.sourceKind === 'captured' || resolution.sourceKind === 'inferred') &&
    !resolution.trusted &&
    questionScore < CAPTURED_AUTOFILL_MIN &&
    !semanticExact
  )
    capSuggest = true

  // Alias-divergence guard: an ungraduated learned entry whose match rode an
  // ALIAS while its own primary question is unrelated to the field is a
  // misattributed capture until proven otherwise (poisoned aliases, live
  // 2026-07-16) — chip, never a silent fill. Graduation restores full trust.
  if (
    (resolution.sourceKind === 'captured' || resolution.sourceKind === 'inferred') &&
    !resolution.trusted &&
    resolution.primaryQuestion &&
    questionScore >= CAPTURED_AUTOFILL_MIN
  ) {
    const primaryScore = await score(questionText, resolution.primaryQuestion)
    if (primaryScore < 0.2) capSuggest = true
  }

  const unresolvedVars = detectVariables(template).filter((v) => !v.startsWith('profile.'))

  if (signal.kind === 'select' || signal.kind === 'radio') {
    if (chosenOptionValue !== undefined && optionScore !== undefined) {
      confidence = Math.min(confidence, Math.max(optionScore, 0.6))
    } else if (signal.kind === 'select' && realOptionCount(signal.options) === 0) {
      // Dependent selects (Country → State) show only a placeholder until
      // the parent field is chosen — there is nothing to place YET. Keep the
      // match autofill-able and defer placement to fill time: fillSelect
      // re-runs chooseOption (with variants) against the LIVE option list
      // and fails honestly if the answer still isn't there.
    } else {
      // A template-variable answer ({{workHistory.0.company}}) can never
      // point at a closed option list — the chip would only ever offer
      // nonsense (live NOV 2026-07-17: "Are you a current NOV employee?"
      // suggesting the user's employer name). Plain-text answers keep the
      // suggest chip; template answers drop below the suggest bar.
      if (detectVariables(template).length > 0) confidence = Math.min(confidence, 0.3)
      capSuggest = true
    }
  } else if (checkboxGroup) {
    // Multi-select: place every part of the answer on the option labels
    const choices = chooseOptions(signal.options, template, ctx.optionSets)
    if (choices.length > 0) {
      chosenOptionValues = choices.map((c) => c.text)
      const worst = Math.min(...choices.map((c) => c.score))
      confidence = Math.min(confidence, Math.max(worst, 0.6))
    } else {
      capSuggest = true
    }
  } else if (signal.kind === 'checkbox') {
    if (YES_RE.test(template.trim())) chosenOptionValue = 'checked'
    else if (NO_RE.test(template.trim())) chosenOptionValue = 'unchecked'
    else {
      // Long-form polar answers ("No, I do not have…") still decide the box;
      // decline/unknown never guess a checkbox.
      const intent = classifyIntent(template)
      if (intent === 'affirm') chosenOptionValue = 'checked'
      else if (intent === 'negate') chosenOptionValue = 'unchecked'
      else capSuggest = true
    }
  }

  // Notify guidance is chip-only (there IS no answer — the user must act)
  if (resolution.notify) capSuggest = true

  const action = decideAction(confidence, ctx.settings, { suggestOnly: capSuggest })

  return {
    fieldId: signal.fieldId,
    resolvedAnswer: null, // resolved at fill time (Section 7)
    rawAnswerTemplate: template,
    confidence,
    source,
    persona,
    unresolvedVars,
    chosenOptionValue,
    chosenOptionValues,
    action,
    needsReview,
    composite,
    matchedKey: resolution.matchedKey,
    notify: resolution.notify,
    answerFallbacks: resolution.fallbacks,
    provenance: resolution.provenance,
    judgeOnly: judgeOnlyRule || undefined,
  }
}

export async function matchAll(
  signals: SignalBundle[],
  ctx: MatcherContext,
): Promise<Map<string, MatchResult>> {
  const usageCounts = (ctx.usageCounts = ctx.usageCounts || {})
  // Prepass: tally which tier-1 keys the page's fields resolve to, BEFORE
  // any rotation state exists (usageCounts empty → every getter reads entry
  // 0 and just reports its key). matchField uses ≥2 hits on one education/
  // work key to tell "repeated entry blocks" apart from a lone flat-form
  // question — see repeatedEntryKey.
  const tier1KeyCounts: Record<string, number> = (ctx.tier1KeyCounts = {})
  for (const signal of signals) {
    if (signal.kind === 'checkbox' || signal.kind === 'file') continue
    const key = tier1Match(signal, ctx)?.matchedKey
    if (key) tier1KeyCounts[key] = (tier1KeyCounts[key] || 0) + 1
  }
  const bump = (signal: SignalBundle, matchedKey: string | undefined) => {
    // Explicitly-indexed sections don't rotate — counting them would corrupt
    // the rotation for any un-indexed field later in the same pass.
    if (!matchedKey || signal.sectionIndex !== undefined) return
    usageCounts[matchedKey] = (usageCounts[matchedKey] || 0) + 1
  }

  const results = new Map<string, MatchResult>()
  for (const signal of signals) {
    if (signal.filled && !ctx.settings.overwriteFilled) {
      // Respect existing content (§3) — but a filled repeated-section field
      // still consumed its work-history slot. Without this, every rescan
      // (Workday adds sections between scans) hands the next empty section
      // the FIRST profile entry again.
      if (signal.kind !== 'checkbox' && !signal.consentLike) {
        bump(signal, tier1Match(signal, ctx)?.matchedKey)
      }
      continue
    }
    const match = await matchField(signal, ctx)
    if (match) {
      results.set(signal.fieldId, match)
      if (match.source === 'profile') bump(signal, match.matchedKey)
    }
  }
  return results
}
