// ---------------------------------------------------------------------------
// AI Fill (pill button, 2026-07-21): pure target selection + match builders.
// The button reads the Validate button's report and fills ONLY fields that
// are still EMPTY (user decision: 'wrong' values are never overwritten by AI
// — they keep their warning chip). No DOM in this module; index.ts owns the
// live fields, the judge calls, and the fill queue.
// ---------------------------------------------------------------------------

import type { FieldKind, FieldOption, MatchResult } from '@/types'
import type { FieldValidation } from '@/content/validate'

/** One click never fires an unbounded sweep of billed judge calls — the
 *  remainder is reported honestly ("run again for the rest"). */
export const AI_FILL_MAX_TARGETS = 15

/** Parity with the matcher's INFERENCE_SCORE — a judge answer is a judge
 *  answer, however it was requested. */
export const AI_FILL_CONFIDENCE = 0.86

export type AiFillReason = 'missing-answerable' | 'missing-unanswered'
export type AiFillSkipReason = 'eeo' | 'consent' | 'file' | 'password' | 'unsupported-kind'

export interface AiFillTarget {
  entry: FieldValidation
  reason: AiFillReason
}

export interface AiFillSelection {
  targets: AiFillTarget[]
  skipped: { entry: FieldValidation; why: AiFillSkipReason }[]
  /** Eligible targets beyond the per-pass cap. */
  overflow: number
}

/** Kinds the judge can INFER an answer for with nothing stored — mirrors the
 *  matcher's inference branch (select/radio pick, dropdown pick-at-fill,
 *  text drafting). Everything else (dates, checkbox groups…) has no judge
 *  pipeline and would only produce confident garbage. */
const INFERABLE_KINDS = new Set<FieldKind>(['select', 'radio', 'custom-dropdown', 'text', 'textarea'])

export function selectAiFillTargets(
  report: FieldValidation[],
  max = AI_FILL_MAX_TARGETS,
): AiFillSelection {
  const answerable: AiFillTarget[] = []
  const unanswered: AiFillTarget[] = []
  const skipped: AiFillSelection['skipped'] = []
  for (const entry of report) {
    if (entry.verdict !== 'missing-answerable' && entry.verdict !== 'missing-unanswered') continue
    const why: AiFillSkipReason | null = entry.eeoLike
      ? 'eeo'
      : entry.consentLike
        ? 'consent'
        : entry.kind === 'file'
          ? 'file'
          : entry.kind === 'password'
            ? 'password'
            : entry.verdict === 'missing-unanswered' && !INFERABLE_KINDS.has(entry.kind)
              ? 'unsupported-kind'
              : null
    if (why) {
      skipped.push({ entry, why })
      continue
    }
    ;(entry.verdict === 'missing-answerable' ? answerable : unanswered).push({
      entry,
      reason: entry.verdict,
    })
  }
  // Stored answers first: they're the cheap, high-confidence wins; inference
  // burns a judge call each.
  const targets = [...answerable, ...unanswered]
  return {
    targets: targets.slice(0, max),
    skipped,
    overflow: Math.max(0, targets.length - max),
  }
}

/** Retry a stored match with the lexical option walk OFF: it already failed
 *  to land once — this pass the judge alone places the answer (the fill
 *  functions fall through to semanticChooseOption when judgeOnly is set).
 *  Text kinds ignore judgeOnly and simply retry the verbatim write. */
export function judgeRetryMatch(stored: MatchResult): MatchResult {
  return {
    ...stored,
    action: 'autofill', // explicit button press — never downgrade to suggest
    needsReview: false,
    judgeOnly: true,
    chosenOptionValue: undefined, // the scan-time pick is what failed; re-place
    chosenOptionValues: undefined,
  }
}

/** Custom dropdown with nothing stored: options exist only after the popup
 *  opens, so the judge picks at fill time — mirrors the matcher's deferred
 *  inference match. */
export function inferDropdownMatch(fieldId: string): MatchResult {
  return {
    fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: '',
    confidence: AI_FILL_CONFIDENCE,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
    inferAtFill: true,
    provenance: 'inferred',
  }
}

/** Judge-picked option for a select/radio (SEMANTIC_ANSWER reply). */
export function inferOptionMatch(fieldId: string, option: FieldOption, kind: FieldKind): MatchResult {
  return {
    fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: option.text,
    confidence: AI_FILL_CONFIDENCE,
    source: 'profile',
    unresolvedVars: [],
    // Radio values are often empty or DUPLICATED (valueless radios all read
    // "on"), and fillRadioGroup resolves a pinned value first-match-wins — a
    // duplicate lands the judge's pick on the WRONG option (polarity flip,
    // review repro 2026-07-21). Radios place by exact text walk instead;
    // selects keep the value pin.
    chosenOptionValue: kind === 'select' ? option.value || option.text : undefined,
    action: 'autofill',
    needsReview: false,
    composite: false,
    provenance: 'inferred',
  }
}

/** Judge-drafted free text (SEMANTIC_TEXT reply). */
export function inferTextMatch(fieldId: string, text: string): MatchResult {
  return {
    fieldId,
    resolvedAnswer: null,
    rawAnswerTemplate: text,
    confidence: AI_FILL_CONFIDENCE,
    source: 'profile',
    unresolvedVars: [],
    action: 'autofill',
    needsReview: false,
    composite: false,
    provenance: 'inferred',
  }
}
