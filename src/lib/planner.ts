import type {
  CensusEntry,
  FieldKind,
  MatchResult,
  PlanAction,
  PlanEntry,
  PlanRepairItem,
  PlanRepairPayload,
  PlannerBrief,
  PlannerLifeState,
  PlannerStance,
  Profile,
  QAEntry,
  SignalBundle,
} from '@/types'
import type { FieldValidation } from '@/content/validate'
import { canonicalAnswer } from '@/lib/normalize'
import { classifyIntent, stripParentheticals } from '@/lib/intent'
import { lexicalAnswerScore, lexicalScore } from '@/lib/scorers/lexical'
import { looksEeoLoose } from '@/lib/eeo'

// ---------------------------------------------------------------------------
// LLM-first filling, Stage 2 (2026-08-22) — the pure half. Everything here is
// DOM-free and network-free: census/brief assembly, the plan JSON contract,
// and the code-enforced guardrails (docs/llm-first-filling-plan.md §5). The
// division of labor is the same rule that made Mapper work: the model
// PROPOSES, code DECIDES AND EXECUTES. The planner never touches the DOM and
// never invents protected values; a fill whose value doesn't trace to its
// cited source dies here, before any write.
//
// content/index.ts owns the live fields and the fill queue; the service
// worker owns the single Anthropic (Claude Haiku) call.
// ---------------------------------------------------------------------------

/** One planner call covers at most this many fields — overflow is reported
 *  honestly ("run again for the rest"), never silently truncated. */
export const PLAN_MAX_FIELDS = 40

/** Fills below this confidence demote to suggestion chips (plan §7 open
 *  question 4 — proposed 0.8, adopted). */
export const PLAN_CONFIDENCE_FLOOR = 0.8

/** Inference-lane fills (Stage 2.5 — answers derived rather than traced)
 *  carry a HIGHER bar to land silently; below it they demote to Accept
 *  chips. Tracing is impossible for these by definition, so confidence and
 *  the binding checks (stances, policy, EEO block, option membership) are
 *  the whole guardrail. */
export const INFERENCE_FILL_FLOOR = 0.85

/** Default confidence when the model omits one — parity with the judge tier
 *  (AI_FILL_CONFIDENCE): a planner answer is a model answer either way. */
export const PLAN_FILL_CONFIDENCE = 0.86

/** Stored-answer candidates offered to the planner per call. */
export const PLAN_CANDIDATE_K = 24

// ---- Life state (case 2: current employer while unemployed) -----------------

const isOngoing = (endDate: string) =>
  !endDate.trim() || /\b(present|current|now|ongoing|today)\b/i.test(endDate)

export function deriveLifeState(profile: Profile): PlannerLifeState {
  const current = profile.workHistory.find((w) => w.company.trim() && isOngoing(w.endDate))
  if (current) {
    return {
      currentlyEmployed: true,
      currentEmployer: current.company.trim(),
      lastEmployer: current.company.trim(),
      lastEndDate: null,
    }
  }
  let last: { company: string; endDate: string } | null = null
  for (const w of profile.workHistory) {
    if (!w.company.trim()) continue
    // Dates are stored normalized "YYYY-MM" (storage.withNormalizedDates), so
    // lexicographic comparison is chronological.
    if (!last || w.endDate > last.endDate) last = { company: w.company.trim(), endDate: w.endDate }
  }
  return {
    currentlyEmployed: false,
    currentEmployer: null,
    lastEmployer: last?.company ?? null,
    lastEndDate: last?.endDate || null,
  }
}

/** A standalone current/present-employer question (NOT a work-history block
 *  field — those carry sectionKind and keep getting real history). */
export function isCurrentEmployerQuestion(question: string): boolean {
  if (!/\bemployer\b|\bcompany\b/i.test(question)) return false
  if (/\b(previous|former|past|last|most recent|prior)\b/i.test(question)) return false
  return /\b(current|present)\b/i.test(question)
}

// ---- Topic stances (case 8) --------------------------------------------------

export type StanceTopic =
  | 'military-service'
  | 'government-employment'
  | 'social-security-income'
  | 'non-compete'
  | 'bondable'

/** The stance table the planner must obey — it classifies the question into a
 *  topic; the TABLE answers it. The model never decides a stance (§5.3).
 *  Values locked with the user 2026-08-22: all No. */
export const STANCES: PlannerStance[] = [
  {
    topic: 'military-service',
    answer: 'no',
    note: 'No military service — always the "No"/"not a veteran"/"no military experience" option.',
  },
  {
    topic: 'government-employment',
    answer: 'no',
    note: 'Never a government employee or official, past or present.',
  },
  {
    topic: 'social-security-income',
    answer: 'no',
    note: 'Does not receive social security benefits or income.',
  },
  { topic: 'non-compete', answer: 'no', note: 'Not bound by any non-compete or non-solicitation agreement.' },
  { topic: 'bondable', answer: 'no', note: 'Answer No to bondability questions.' },
]

export function classifyStanceTopic(question: string): StanceTopic | null {
  // Identity fields first: an SSN *number* input is data entry, not a stance.
  if (/\b(ssn|social security number)\b/i.test(question)) return null
  if (/\b(military|armed forces|armed services|active duty|uniformed service\w*|veteran)\b/i.test(question))
    return 'military-service'
  if (
    /\bgovernment (employee|employment|official|service|position)\b|\bemployed by (a |the )?(federal|state|local|any )?government\b/i.test(
      question,
    )
  )
    return 'government-employment'
  if (
    /\bsocial security (benefit|income|payment)/i.test(question) ||
    /\b(receive|receiving|collect|collecting|drawing)\b[\s\S]{0,40}\bsocial security\b/i.test(question)
  )
    return 'social-security-income'
  if (/\bnon.?compete\b|\bnon.?solicit/i.test(question)) return 'non-compete'
  if (/\bbondable\b/i.test(question)) return 'bondable'
  return null
}

// ---- Target selection --------------------------------------------------------

export type PlanSkipReason = 'consent' | 'file' | 'password' | 'eeo-unstored'

export interface PlanTargets {
  targets: FieldValidation[]
  skipped: { entry: FieldValidation; why: PlanSkipReason }[]
  overflow: number
}

/** Which validation-report entries go into the brief. Differences from the
 *  judge tier's selectAiFillTargets, by design:
 *  - EEO fields ARE eligible when a stored value exists (case 3: the stored
 *    disability "No" must land on the CC-305 long forms) — placement-only,
 *    enforced again at validation time. Nothing stored → skipped honestly.
 *  - No per-kind inferability cut: the planner sees every widget the
 *    executor can drive (dates, checkbox groups included).
 *  Consent, files and passwords stay out, always. */
export function selectPlanTargets(
  report: FieldValidation[],
  eeoAnswerFor: (entry: FieldValidation) => string | null,
  max = PLAN_MAX_FIELDS,
): PlanTargets {
  const eligible: FieldValidation[] = []
  const skipped: PlanTargets['skipped'] = []
  for (const entry of report) {
    if (entry.verdict !== 'missing-answerable' && entry.verdict !== 'missing-unanswered') continue
    if (entry.consentLike) {
      skipped.push({ entry, why: 'consent' })
      continue
    }
    if (entry.kind === 'file') {
      skipped.push({ entry, why: 'file' })
      continue
    }
    if (entry.kind === 'password') {
      skipped.push({ entry, why: 'password' })
      continue
    }
    if (entry.eeoLike && !eeoAnswerFor(entry)) {
      skipped.push({ entry, why: 'eeo-unstored' })
      continue
    }
    eligible.push(entry)
  }
  return {
    targets: eligible.slice(0, max),
    skipped,
    overflow: Math.max(0, eligible.length - max),
  }
}

// ---- Census -----------------------------------------------------------------

export function neighborLabels(signal: SignalBundle, all: SignalBundle[], cap = 6): string[] {
  const out: string[] = []
  for (const other of all) {
    if (other.fieldId === signal.fieldId) continue
    if (other.sectionContext !== signal.sectionContext) continue
    if (other.sectionIndex !== signal.sectionIndex) continue
    const label = other.label || other.normalizedQuestion
    if (label && !out.includes(label)) out.push(label)
    if (out.length >= cap) break
  }
  return out
}

export function censusEntry(
  v: FieldValidation,
  signal: SignalBundle | undefined,
  neighbors: string[],
  currentValue: string,
): CensusEntry {
  const kind: FieldKind = signal?.kind ?? v.kind
  const options = (signal ? signal.options.map((o) => o.text) : v.options)
    .map((o) => o.trim())
    .filter(Boolean)
  return {
    fieldId: v.fieldId,
    label: signal?.label || v.label,
    normalizedQuestion: signal?.normalizedQuestion ?? v.normalizedQuestion,
    kind,
    required: signal?.required ?? v.required,
    sectionContext: signal?.sectionContext ?? v.sectionContext,
    sectionIndex: signal?.sectionIndex ?? v.sectionIndex,
    sectionKind: signal?.sectionKind,
    eeoLike: signal?.eeoLike ?? v.eeoLike,
    neighborLabels: neighbors,
    optionsVisible: options.slice(0, 60),
    // Custom dropdowns usually expose nothing until their popup opens — an
    // empty or partial list must not let the option-membership guard reject
    // legitimate picks the fill-time walk would land.
    optionsComplete: options.length > 0 && kind !== 'custom-dropdown',
    currentValue,
  }
}

// ---- Profile facts & stored EEO ---------------------------------------------

/** Longest per-job description excerpt carried in the brief — enough for the
 *  inference lane to know what the candidate actually did, without bloating
 *  the call. */
export const FACTS_DESCRIPTION_CHARS = 320

const trimDescription = (text: string): string => {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= FACTS_DESCRIPTION_CHARS ? t : `${t.slice(0, FACTS_DESCRIPTION_CHARS).trimEnd()}…`
}

/** Allow-listed facts — the ONLY profile view a brief may carry (§5.8).
 *  accountPassword, EEO answers and pronouns are deliberately absent: the
 *  password never leaves the device, and demographics ride eeoStored under
 *  placement-only rules instead. Work-history descriptions ride along
 *  TRIMMED (Stage 2.5): they are what makes unrelated-question inference
 *  possible — years-with-a-skill, tooling, domain questions. */
export function buildProfileFacts(profile: Profile): Record<string, unknown> {
  return {
    name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    address: { ...profile.address },
    links: { ...profile.links },
    accountEmail: profile.accountEmail,
    earliestStartDate: profile.earliestStartDate,
    workAuthorization: profile.workAuthorization,
    authorizedToWork: profile.authorizedToWork ? 'Yes' : 'No',
    requiresSponsorship: profile.requiresSponsorship ? 'Yes' : 'No',
    previouslyEmployedHere: profile.previouslyEmployedHere ? 'Yes' : 'No',
    willingToRelocate: profile.willingToRelocate ? 'Yes' : 'No',
    noticePeriod: profile.noticePeriod,
    desiredSalary: profile.desiredSalary,
    workHistory: profile.workHistory.map((w) => ({
      company: w.company,
      title: w.title,
      startDate: w.startDate,
      endDate: w.endDate,
      location: w.location,
      description: trimDescription(w.description),
    })),
    education: profile.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.field,
      startDate: e.startDate,
      endDate: e.endDate,
    })),
  }
}

/** Stored EEO/demographic values by key — profile.eeo + pronouns + any
 *  active EEO-topic Q&A entries (e.g. the honest "disability" capture),
 *  keyed by their question. Placement-only: the planner maps these onto
 *  option wordings, never chooses or infers a demographic value (§5.2). */
export function buildEeoStored(profile: Profile, qa: QAEntry[]): Record<string, string> {
  const out: Record<string, string> = {}
  const eeo = profile.eeo
  if (eeo.gender.trim()) out.gender = eeo.gender.trim()
  if (eeo.ethnicity.trim()) out.ethnicity = eeo.ethnicity.trim()
  if (eeo.veteranStatus.trim()) out.veteranStatus = eeo.veteranStatus.trim()
  if (eeo.disabilityStatus.trim()) out.disabilityStatus = eeo.disabilityStatus.trim()
  if (profile.pronouns.trim()) out.pronouns = profile.pronouns.trim()
  for (const entry of qa) {
    if (entry.status !== 'active') continue
    const answer = entry.answer.trim()
    if (!answer || answer.includes('{{')) continue
    if (!looksEeoLoose(entry.question)) continue
    out[entry.question.trim().toLowerCase()] = answer
  }
  return out
}

const PROFILE_EEO_KEYS = new Set([
  'gender',
  'ethnicity',
  'veteranStatus',
  'disabilityStatus',
  'pronouns',
  'sexualOrientation',
])

const EEO_KEY_TOPICS: Array<{ key: string; re: RegExp }> = [
  // Order matters: "sexual orientation" must resolve before the gender/sex test.
  { key: 'sexualOrientation', re: /sexual orientation|lgbtq/i },
  { key: 'gender', re: /\bgender\b|\bsex\b/i },
  { key: 'ethnicity', re: /\brace\b|\braces\b|racial|ethnic|hispanic|latino|latinx/i },
  { key: 'veteranStatus', re: /veteran/i },
  { key: 'disabilityStatus', re: /disabilit/i },
  { key: 'pronouns', re: /pronoun/i },
]

/** The stored value answering an EEO question, or null (→ the field is
 *  skipped honestly — nothing stored means nothing fillable, §5.2). */
export function eeoStoredAnswerFor(question: string, eeoStored: Record<string, string>): string | null {
  for (const { key, re } of EEO_KEY_TOPICS) {
    if (!re.test(question)) continue
    if (eeoStored[key]) return eeoStored[key]
    break // topic identified, canonical key empty — a qa-keyed answer may still cover it
  }
  let best: { value: string; score: number } | null = null
  for (const [key, value] of Object.entries(eeoStored)) {
    if (!value || PROFILE_EEO_KEYS.has(key)) continue
    // Containment counts: a short stored key ("disability") inside a long
    // form question qualifies even where token cosine dilutes the score.
    const score = Math.max(lexicalScore(question, key), valueContainsWord(question, key) ? 0.6 : 0)
    if (score >= 0.5 && (!best || score > best.score)) best = { value, score }
  }
  return best?.value ?? null
}

// ---- Candidate retrieval -----------------------------------------------------

/** Top-K stored answers by lexical relevance to the unresolved questions.
 *  EEO-topic entries are excluded here — they ride eeoStored under stricter
 *  rules. Site-scoped entries only surface on their own site. */
export function selectRelevantQA(
  qa: QAEntry[],
  questions: string[],
  hostname: string,
  k = PLAN_CANDIDATE_K,
): QAEntry[] {
  const scored: Array<{ entry: QAEntry; score: number }> = []
  for (const entry of qa) {
    if (entry.status !== 'active') continue
    if (entry.answerType === 'notify') continue
    if (looksEeoLoose(entry.question)) continue
    if (entry.siteScope && !hostname.endsWith(entry.siteScope)) continue
    const texts = [entry.question, ...entry.aliases]
    let best = 0
    for (const q of questions) {
      for (const t of texts) {
        const s = lexicalScore(q, t)
        if (s > best) best = s
      }
    }
    if (best >= 0.12) scored.push({ entry, score: best })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k).map((s) => s.entry)
}

// ---- Value tracing -----------------------------------------------------------

const escapeRe = (text: string) => text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Word-boundary containment — "Female" does NOT contain "Male". */
export function valueContainsWord(haystack: string, needle: string): boolean {
  const n = needle.trim()
  if (!n) return false
  try {
    return new RegExp(`\\b${escapeRe(n)}\\b`, 'i').test(haystack)
  } catch {
    return false
  }
}

/** Does a planned value plausibly BE the source value? Canonical equality,
 *  word-boundary containment either way, polarity agreement, or high lexical
 *  overlap. Tolerant on purpose: sites reword options — but a value from
 *  nowhere fails everything. */
export function looseValueMatch(source: string, planned: string): boolean {
  const s = source.trim()
  const p = planned.trim()
  if (!s || !p) return false
  const sc = canonicalAnswer(s)
  if (sc !== '' && sc === canonicalAnswer(p)) return true
  if (valueContainsWord(p, s) || valueContainsWord(s, p)) return true
  const si = classifyIntent(s)
  const pi = classifyIntent(p)
  if (si !== 'unknown' && pi !== 'unknown') return si === pi
  return lexicalAnswerScore(s, p) >= 0.6
}

/** EEO placement rule (§5.2, cases 3/4/7): a composite option containing the
 *  stored value with consistent qualifiers IS the stored value ("Asian (Not
 *  Hispanic or Latino)" for stored "Asian"); Yes/No stored values map onto
 *  long-form wordings by polarity ("No" → "No, I do not have a disability…").
 *  Word-boundary containment keeps "Female" from ever matching stored "Male". */
export function eeoValueMatches(stored: string, planned: string): boolean {
  const s = stored.trim()
  const p = planned.trim()
  if (!s || !p) return false
  if (canonicalAnswer(s) !== '' && canonicalAnswer(s) === canonicalAnswer(p)) return true
  // "consistent qualifiers": a negated composite is the OPPOSITE of the stored value — stored
  // "Hispanic or Latino" must never match "White (Not Hispanic or Latino)" (2026-09-16 audit)
  const negated = new RegExp(`\\b(?:not|non|no)[-\\s]+${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  if (negated.test(p)) return false
  if (valueContainsWord(stripParentheticals(p), s)) return true
  const si = classifyIntent(s)
  const pi = classifyIntent(p)
  if (si !== 'unknown' && pi !== 'unknown') return si === pi
  return false
}

// ---- Plan parsing ------------------------------------------------------------

const ACTION_ALIASES: Record<string, PlanAction> = {
  fill: 'fill',
  type: 'fill',
  select: 'fill',
  check: 'fill',
  autofill: 'fill',
  suggest: 'suggest',
  draft: 'suggest',
  skip: 'skip',
  needs_human: 'needs_human',
  'needs-human': 'needs_human',
  needshuman: 'needs_human',
  human: 'needs_human',
}

/** Model reply → normalized PlanEntry[], or null when nothing parseable came
 *  back. Tolerates code fences, prose around the JSON, {"fills":[…]} or a
 *  bare array, snake_case fieldIds, numeric values, string confidences. */
export function extractPlanJson(raw: string | null | undefined): PlanEntry[] | null {
  if (!raw) return null
  let text = raw.trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) text = fence[1].trim()
  const objStart = text.indexOf('{')
  const arrStart = text.indexOf('[')
  let candidate: string | null = null
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    candidate = text.slice(objStart, text.lastIndexOf('}') + 1)
  } else if (arrStart >= 0) {
    candidate = text.slice(arrStart, text.lastIndexOf(']') + 1)
  }
  if (!candidate) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch {
    return null
  }
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { fills?: unknown }).fills)
      ? ((parsed as { fills: unknown[] }).fills)
      : null
  if (!list) return null
  const out: PlanEntry[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue
    const r = item as Record<string, unknown>
    const fieldId =
      typeof r.fieldId === 'string' && r.fieldId
        ? r.fieldId
        : typeof r.field_id === 'string' && r.field_id
          ? r.field_id
          : null
    if (!fieldId) continue
    const action = ACTION_ALIASES[String(r.action ?? '').trim().toLowerCase()]
    if (!action) continue
    const value = r.value === undefined || r.value === null ? undefined : String(r.value)
    const source = typeof r.source === 'string' && r.source.trim() ? r.source.trim() : undefined
    const reason = typeof r.reason === 'string' ? r.reason : undefined
    const confRaw =
      typeof r.confidence === 'number'
        ? r.confidence
        : typeof r.confidence === 'string'
          ? Number.parseFloat(r.confidence)
          : undefined
    const confidence =
      confRaw !== undefined && Number.isFinite(confRaw)
        ? Math.max(0, Math.min(1, confRaw))
        : undefined
    out.push({ fieldId, action, value, source, reason, confidence })
  }
  return out.length > 0 ? out : null
}

// ---- Guarded plan validation (§5 — code decides) ----------------------------

interface SourceResolution {
  values: string[]
  kind: 'profile' | 'qa' | 'eeo' | 'stance' | 'policy' | 'context' | 'draft' | 'inference'
  qaId?: string
}

function dotPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

/** Resolve a cited source to its actual value(s) — against the REDACTED
 *  brief, so a path like profile:accountPassword resolves to nothing. */
export function resolveSource(source: string, brief: PlannerBrief): SourceResolution | null {
  if (source === 'draft') return { values: [], kind: 'draft' }
  // Stage 2.5: a derived answer — no value to trace; the binding checks and
  // the higher confidence floor are the guardrail (validatePlan).
  if (source === 'inference') return { values: [], kind: 'inference' }
  if (source === 'policy:current-employer' || source === 'policy:current-employer-unemployed')
    return { values: ['N/A'], kind: 'policy' }
  if (source.startsWith('profile:')) {
    const path = source.slice('profile:'.length).replace(/^profileFacts\./, '').replace(/^profile\./, '')
    const value = dotPath(brief.profileFacts, path)
    if (value === undefined || value === null || typeof value === 'object') return null
    const text = String(value).trim()
    return text ? { values: [text], kind: 'profile' } : null
  }
  if (source.startsWith('qa:')) {
    const id = source.slice(3)
    const candidate = brief.candidates.find((c) => c.id === id)
    if (!candidate) return null
    return { values: [candidate.answer, ...(candidate.fallbacks ?? [])], kind: 'qa', qaId: id }
  }
  if (source.startsWith('eeo:')) {
    const key = source.slice(4)
    const value = brief.eeoStored[key] ?? brief.eeoStored[key.toLowerCase()]
    return value ? { values: [value], kind: 'eeo' } : null
  }
  if (source.startsWith('stance:')) {
    const topic = source.slice('stance:'.length)
    const stance = brief.stances.find((s) => s.topic === topic)
    return stance ? { values: [stance.answer], kind: 'stance' } : null
  }
  if (source === 'context:company')
    return brief.page.company ? { values: [brief.page.company], kind: 'context' } : null
  if (source === 'context:role')
    return brief.page.role ? { values: [brief.page.role], kind: 'context' } : null
  return null
}

const NONE_ANSWER_RE = /\bnot applicable\b|\bnone\b|\bunemployed\b|\bno current employer\b/i
export const isNoneAnswer = (value: string) =>
  /^n\s*\/?\s*a\b/i.test(value.trim()) || NONE_ANSWER_RE.test(value)

const PLACEHOLDER_OPTION_RE = /^(please )?(select|choose|pick)\b|^--|^—+$|^\.{3}$|^…$/i
export const isPlaceholderOption = (option: string) => PLACEHOLDER_OPTION_RE.test(option.trim())

export interface PlanDecision {
  entry: PlanEntry
  /** fill demoted to a suggestion chip (draft source, confidence floor,
   *  free-text essay) — Accept executes it. */
  demoted: boolean
  sourceKind: SourceResolution['kind'] | null
  qaId?: string
  /** For option widgets with a complete list: the option text the value
   *  landed on — the executor places THIS, verbatim. */
  matchedOption?: string
  fallbacks: string[]
}

export interface PlanValidation {
  accepted: PlanDecision[]
  rejected: { entry: PlanEntry; why: string }[]
}

/**
 * Code-enforced §5: every fill must cite a source and its value must trace to
 * it; EEO fields take stored values only; stances and the current-employer
 * policy cannot be contradicted; option widgets with known lists must land on
 * a real option. Violations are REJECTED (chip), not repaired silently.
 */
export function validatePlan(entries: PlanEntry[], brief: PlannerBrief): PlanValidation {
  const accepted: PlanDecision[] = []
  const rejected: PlanValidation['rejected'] = []
  const fieldById = new Map(brief.fields.map((f) => [f.fieldId, f]))
  const seen = new Set<string>()

  for (const entry of entries) {
    const field = fieldById.get(entry.fieldId)
    if (!field) {
      rejected.push({ entry, why: 'unknown fieldId' })
      continue
    }
    if (seen.has(entry.fieldId)) {
      rejected.push({ entry, why: 'duplicate fieldId' })
      continue
    }
    seen.add(entry.fieldId)

    if (entry.action === 'skip' || entry.action === 'needs_human') {
      accepted.push({ entry, demoted: false, sourceKind: null, fallbacks: [] })
      continue
    }

    const value = entry.value?.trim() ?? ''
    if (!value) {
      rejected.push({ entry, why: 'no value' })
      continue
    }
    if (/\{\{[\w.\s]+\}\}/.test(value)) {
      rejected.push({ entry, why: 'unresolved template braces' })
      continue
    }
    if (!entry.source) {
      rejected.push({ entry, why: 'no source cited' })
      continue
    }
    const resolved = resolveSource(entry.source, brief)
    if (!resolved) {
      rejected.push({ entry, why: `source "${entry.source}" resolves to nothing` })
      continue
    }

    const question = field.label || field.normalizedQuestion

    // EEO fields: stored values only, in either direction (§5.2).
    if (field.eeoLike) {
      if (resolved.kind !== 'eeo') {
        rejected.push({ entry, why: 'EEO field requires an eeo:<key> source' })
        continue
      }
      if (!eeoValueMatches(resolved.values[0], value)) {
        rejected.push({ entry, why: `EEO value does not match stored "${resolved.values[0]}"` })
        continue
      }
    } else if (resolved.kind === 'eeo') {
      rejected.push({ entry, why: 'eeo source cited for a non-EEO field' })
      continue
    } else if (resolved.kind === 'stance') {
      const topic = classifyStanceTopic(question)
      const cited = entry.source.slice('stance:'.length)
      if (topic !== cited) {
        rejected.push({ entry, why: `field is not a ${cited} question` })
        continue
      }
      const stance = brief.stances.find((s) => s.topic === topic)
      const want = stance?.answer === 'yes' ? 'affirm' : 'negate'
      if (classifyIntent(value) !== want) {
        rejected.push({ entry, why: `value does not express the ${stance?.answer ?? 'stored'} stance` })
        continue
      }
    } else if (resolved.kind === 'policy') {
      if (!isNoneAnswer(value)) {
        rejected.push({ entry, why: 'current-employer policy requires an N/A-style value' })
        continue
      }
    } else if (resolved.kind === 'inference') {
      // Derived answers can't trace by definition — the reasoning is the
      // audit trail, so its absence is a rejection, not a shrug. Everything
      // binding (stances, current-employer policy, option membership, the
      // EEO block above) still applies below.
      if (!entry.reason?.trim()) {
        rejected.push({ entry, why: 'inference requires its reasoning' })
        continue
      }
    } else if (resolved.kind !== 'draft') {
      const traced = resolved.values.some((v) => looseValueMatch(v, value))
      if (!traced) {
        rejected.push({ entry, why: `value does not trace to ${entry.source}` })
        continue
      }
    }

    // Stance topics bind whatever source was cited: a "have you served in the
    // military" fill can never carry an affirmative, even via qa:/profile:.
    if (!field.eeoLike && resolved.kind !== 'stance') {
      const topic = classifyStanceTopic(question)
      if (topic) {
        const stance = STANCES.find((s) => s.topic === topic)
        const want = stance?.answer === 'yes' ? 'affirm' : 'negate'
        const intent = classifyIntent(value)
        if (intent !== 'unknown' && intent !== want) {
          rejected.push({ entry, why: `contradicts the ${topic} stance` })
          continue
        }
      }
    }

    // Case 2, enforced even when mis-sourced: a standalone current-employer
    // field while unemployed takes N/A, never a past employer.
    if (
      !brief.lifeState.currentlyEmployed &&
      field.sectionKind === undefined &&
      isCurrentEmployerQuestion(question) &&
      resolved.kind !== 'policy' &&
      !isNoneAnswer(value)
    ) {
      rejected.push({ entry, why: 'current employer while unemployed must be N/A' })
      continue
    }

    // Option widgets with a complete list: the value must land on a REAL
    // option (never a placeholder). The executor places the matched text.
    let matchedOption: string | undefined
    if (field.optionsComplete && field.optionsVisible.length > 0) {
      // exact first, then canonical, then loose: a loose match accepts sibling options in graded
      // lists ('3-5 years' vs '1-3 years', "Master's" vs "Associate's"), and find() took the FIRST
      const cv = canonicalAnswer(value)
      matchedOption =
        field.optionsVisible.find((o) => o.trim() === value.trim()) ??
        (cv ? field.optionsVisible.find((o) => canonicalAnswer(o) === cv) : undefined) ??
        field.optionsVisible.find((o) =>
          field.eeoLike ? eeoValueMatches(value, o) || looseValueMatch(o, value) : looseValueMatch(o, value),
        )
      if (!matchedOption) {
        rejected.push({ entry, why: 'value matches no visible option' })
        continue
      }
      if (isPlaceholderOption(matchedOption)) {
        rejected.push({ entry, why: 'placeholder option' })
        continue
      }
    }

    let demoted = entry.action === 'suggest'
    if (entry.action === 'fill') {
      if (resolved.kind === 'draft') demoted = true // essays are suggest-only (§5.5)
      if ((entry.confidence ?? PLAN_FILL_CONFIDENCE) < PLAN_CONFIDENCE_FLOOR) demoted = true
      // Inference lane: higher bar, and OMITTED confidence never rides the
      // default past it — a derived answer must own its number to land.
      if (resolved.kind === 'inference' && (entry.confidence ?? 0) < INFERENCE_FILL_FLOOR)
        demoted = true
      if (field.kind === 'textarea' && resolved.kind !== 'qa') demoted = true
    }

    accepted.push({
      entry,
      demoted,
      sourceKind: resolved.kind,
      qaId: resolved.qaId,
      matchedOption,
      fallbacks: resolved.kind === 'qa' ? resolved.values.slice(1) : [],
    })
  }
  return { accepted, rejected }
}

// ---- Plan → executor ---------------------------------------------------------

/** A validated decision becomes a MatchResult and rides the EXISTING
 *  widget-correct fill engine — dropdown open-and-commit, alphabetical
 *  scroll, commit verification, session answers, learning: all Stage 1
 *  machinery, none of it re-implemented. qa-sourced fills keep their
 *  `qa:<id>` source so validation feedback credits okCount exactly as any
 *  stored-answer fill would. */
export function planEntryToMatch(decision: PlanDecision, signal: SignalBundle): MatchResult {
  const { entry } = decision
  const planned = entry.value ?? ''
  let raw = planned
  let chosenOptionValue: string | undefined
  if (decision.matchedOption) {
    raw = decision.matchedOption
    if (signal.kind === 'select') {
      const opt = signal.options.find((o) => o.text.trim() === decision.matchedOption)
      // Radios deliberately get NO value pin: radio values are often empty or
      // duplicated ("on"), and a pinned duplicate lands on the wrong option
      // (polarity-flip repro 2026-07-21). Text walk places radios.
      chosenOptionValue = opt ? opt.value || opt.text : undefined
    }
  }
  const learns =
    decision.sourceKind !== 'qa' && decision.sourceKind !== 'eeo' && !signal.eeoLike
  return {
    fieldId: signal.fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: raw,
    confidence: entry.confidence ?? PLAN_FILL_CONFIDENCE,
    source: decision.qaId ? `qa:${decision.qaId}` : 'profile',
    unresolvedVars: [],
    chosenOptionValue,
    action: decision.demoted ? 'suggest' : 'autofill',
    needsReview: false,
    composite: false,
    ...(decision.fallbacks.length > 0 ? { answerFallbacks: decision.fallbacks } : {}),
    // Planner answers with no stored backing learn like judge inferences
    // (persistLearning applies its own EEO/section gates on top).
    ...(learns ? { provenance: 'inferred' as const } : {}),
  }
}

// ---- Repair evidence ---------------------------------------------------------

/** Post-execution failures → the single repair round's evidence (§ Phase 5).
 *  Only fields THIS plan attempted; each carries what was attempted, what the
 *  page actually shows, and the options visible now. */
export function buildRepairItems(
  report: FieldValidation[],
  attemptedValues: Map<string, string>,
  optionsOf: (fieldId: string) => string[],
): PlanRepairItem[] {
  const items: PlanRepairItem[] = []
  for (const v of report) {
    const attempted = attemptedValues.get(v.fieldId)
    if (attempted === undefined) continue
    if (v.verdict !== 'wrong' && v.verdict !== 'missing-answerable') continue
    items.push({
      fieldId: v.fieldId,
      label: v.label,
      attempted,
      observed: v.actual ?? '',
      optionsVisible: optionsOf(v.fieldId).slice(0, 60),
    })
  }
  return items
}

// ---- Prompts -----------------------------------------------------------------

export const PLANNER_SYSTEM_PROMPT = `You are FlashFiller's filling planner for ONE job-application page. You receive a structured brief: unresolved form fields (with section context, neighbor labels, visible options), the applicant's profile facts (work history with what they actually did), derived life-state, non-negotiable topic stances, stored EEO/demographic values, saved answer candidates, and a job-posting excerpt when one was found.

Reply with ONLY JSON, no prose: {"fills":[{"fieldId":"…","action":"fill|suggest|skip|needs_human","value":"…","source":"…","reason":"…","confidence":0.0}]}

Rules — the executor enforces every one of these in code; violating entries are dropped:
1. One entry per brief field, using its exact fieldId. Cover EVERY field in the brief.
2. Every "fill" MUST cite its source: "profile:<dot.path>" (a path into profileFacts, e.g. profile:workHistory.0.title), "qa:<id>" (a candidate), "eeo:<key>" (a stored EEO value), "stance:<topic>", "policy:current-employer", "context:company", "context:role", "inference" (an answer you DERIVED — rule 9), or "draft" (composed free text — becomes a suggestion for human review). Traceable sources are always preferred over "inference" when both could answer.
3. STUDY THE SECTION before answering. A "Title" beside First/Last Name with options like Mr./Ms./Dr. is a courtesy designation; a "Title" inside a work-history section is that job's position title (profile:workHistory.<sectionIndex>.title). Neighbor labels and sectionKind tell you which world you are in.
4. lifeState.currentlyEmployed=false → any current/present-employer field gets exactly "N/A" with source "policy:current-employer" — NEVER a past employer. Past-employer and work-history fields keep using real history.
5. EEO/demographic fields (eeoLike=true): place the stored value onto the option wording that means the same thing. A composite option containing the stored value with consistent qualifiers IS the stored value ("Asian (Not Hispanic or Latino)" for stored "Asian"; the long "No, I do not have a disability…" wording for stored "No"). Never pick an option that would change the stored value. Nothing stored for the topic → needs_human.
6. Topic stances are non-negotiable. Classify the question into its topic and answer with the option expressing the stance — you never decide a stance yourself.
7. When optionsVisible is non-empty, "value" must be copied VERBATIM from it (the closest-meaning real option). Placeholder rows ("Select One", "--") are never valid. When optionsComplete=false the widget's list is unknown — give the answer text and the executor will place it.
8. Free-text essays and motivation questions → action "suggest" with source "draft": first person, concise, ONLY facts from the brief. Never invent employers, dates, numbers, skills, or biography.
9. THE INFERENCE LANE — this is where you earn your keep. "Additional questions" that match no stored answer are usually still DERIVABLE from the dossier: years of experience with a skill or domain (compute from work history + descriptions), tools/processes used (from descriptions), "how did you hear about this position" (a sensible channel like LinkedIn/company website), willingness and logistics questions (consistent with stated relocation/start-date/salary facts), proficiency self-ratings (supported by the history, modest when thin), work-environment questions grounded in the job-posting excerpt. Answer these with source "inference": value + a ONE-LINE reason citing which facts you reasoned from + honest confidence. What "inference" may NEVER do: fabricate credentials, licenses, certifications, clearances, references, employers, dates, or numbers with no basis; answer legal-history, background-check, or personal-judgment questions (those are needs_human); touch EEO/demographic fields (stored values only); contradict a stance or the current-employer policy.
10. A field you cannot answer even by rule 9 → "needs_human" with a short reason. Skips need reasons too.
11. Salary numeric fields: digits only, derived from profileFacts.desiredSalary (use the minimum of a range).

confidence is your honest probability that this fill is what the applicant would enter (below 0.8 the executor demotes to a suggestion; "inference" fills need 0.85 and always demote without an explicit confidence). This tool fills forms; it never submits them — a human reviews everything.`

export function plannerUserPrompt(brief: PlannerBrief, repair?: PlanRepairPayload | null): string {
  const parts = [`BRIEF:\n${JSON.stringify(brief, null, 1)}`]
  if (repair) {
    parts.push(
      `REPAIR_EVIDENCE — your previous plan was executed; these fields FAILED. Each shows what was attempted, what the page displays now, and the options visible now:\n${JSON.stringify(repair.items, null, 1)}`,
    )
    parts.push(`YOUR_PREVIOUS_PLAN:\n${JSON.stringify(repair.previous)}`)
    parts.push(
      'Return corrected entries for ONLY the fieldIds in REPAIR_EVIDENCE. When optionsVisible is non-empty, copy the chosen option text EXACTLY. A field you cannot correct → needs_human with the reason.',
    )
  }
  return parts.join('\n\n')
}
