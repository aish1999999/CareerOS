import type { FieldKind, MatchResult } from '@/types'
import type { DetectedField } from '@/content/detector'
import { answerVariants } from '@/content/matcher'
import { displayTextOf, uploadZoneFilename } from '@/content/autofill'
import { canonicalAnswer } from '@/lib/normalize'
import { classifyIntent } from '@/lib/intent'
import { lexicalAnswerScore } from '@/lib/scorers/lexical'
import { parseDateParts } from '@/lib/dates'

// ---------------------------------------------------------------------------
// Validation layer (user request 2026-07-15): the filler must never be its
// own validator. After autofill settles, this module READS the page (never
// writes) and compares every field's actual end state against the expected
// answer — completeness first (nothing answerable left empty), then
// correctness (what landed is what the profile/stored answers say). The
// per-field verdicts are the debugging surface: a "wrong" pinpoints a fill
// that lied about success; a "missing-answerable" pinpoints a fill that
// never landed.
// ---------------------------------------------------------------------------

export type ValidationVerdict =
  | 'ok'
  | 'wrong' // filled, but NOT with the expected answer — highest severity
  | 'missing-answerable' // we had an answer and the field is still empty
  | 'missing-unanswered' // empty and nothing stored answers it
  | 'skipped' // not ours to judge (files, notify, suggest-only, user content)

export interface FieldValidation {
  fieldId: string
  label: string
  kind: FieldKind
  verdict: ValidationVerdict
  expected?: string
  actual?: string
  required: boolean
  /** Structured notes (Validate button, 2026-07-21): the report must stand
   *  on its own — the AI-fill pass and the persisted copy read these instead
   *  of chasing live DOM. fieldIds die on SPA rerenders; the question is the
   *  durable identity. */
  normalizedQuestion: string
  /** Option texts as detected. Display/notes only — custom dropdowns have no
   *  options until their popup opens, so fills always read the LIVE signal. */
  options: string[]
  sectionContext: string
  sectionIndex?: number
  /** Ride along so AI fill can hard-exclude without a live field lookup. */
  eeoLike: boolean
  consentLike: boolean
}

/** The field's ACTUAL current content, per kind. Read-only. */
export function readActualValue(field: DetectedField): string {
  const { el, signal } = field
  if (field.dateSegmentEls) {
    const s = field.dateSegmentEls
    return [s.month?.value, s.day?.value, s.year?.value].filter(Boolean).join('/')
  }
  switch (signal.kind) {
    case 'select': {
      const select = el as HTMLSelectElement
      const opt = select.selectedIndex >= 0 ? select.options[select.selectedIndex] : null
      return opt ? opt.text.trim() || opt.value.trim() : ''
    }
    case 'radio': {
      // Pill groups carry their state as aria-pressed on the buttons
      if (field.pillEls) {
        const index = field.pillEls.findIndex((p) => p.getAttribute('aria-pressed') === 'true')
        if (index < 0) return ''
        return signal.options[index]?.text ?? (field.pillEls[index].textContent ?? '').trim()
      }
      const radios = field.groupEls ?? [el as HTMLInputElement]
      const index = radios.findIndex((r) => r.checked)
      if (index < 0) return ''
      return signal.options[index]?.text ?? radios[index].value
    }
    case 'checkbox': {
      // Multi-select pill groups: the pressed pills ARE the checked boxes
      if (field.pillEls) {
        return field.pillEls
          .map((p, i) =>
            p.getAttribute('aria-pressed') === 'true'
              ? signal.options[i]?.text ?? (p.textContent ?? '').trim()
              : '',
          )
          .filter(Boolean)
          .join('; ')
      }
      const boxes = field.groupEls ?? [el as HTMLInputElement]
      if (boxes.length > 1) {
        return boxes
          .map((box, i) => (box.checked ? signal.options[i]?.text ?? box.value : ''))
          .filter(Boolean)
          .join('; ')
      }
      return boxes[0].checked ? 'Yes' : 'No'
    }
    case 'custom-dropdown':
      return displayTextOf(el)
    case 'file': {
      // input.files when the hand-off stuck there; else the filename chip the
      // site rendered in the upload zone (many uploaders clear the input
      // once their own machinery takes the file).
      const input = el as HTMLInputElement
      let name = ''
      try {
        name = input.files && input.files.length > 0 ? input.files[0].name : ''
      } catch {
        name = ''
      }
      if (name) return name
      return field.uploadZoneEl ? uploadZoneFilename(field.uploadZoneEl) : ''
    }
    case 'contenteditable':
      return el.textContent?.trim() ?? ''
    default:
      return ((el as HTMLInputElement).value ?? '').trim()
  }
}

/** Do expected and actual mean the same thing? Tolerant: sites reformat
 *  dates, abbreviate states, and reword options — a cosmetic difference must
 *  not scream "wrong", but Algeria-for-United-States must. */
export function valuesMatch(expected: string, actual: string, kind: FieldKind): boolean {
  const e = expected.trim()
  const a = actual.trim()
  if (!e || !a) return false
  if (e === a) return true
  const eCanon = canonicalAnswer(e)
  const aCanon = canonicalAnswer(a)
  if (eCanon !== '' && eCanon === aCanon) return true
  // Geographic equivalents (TX ↔ Texas, USA ↔ United States of America)
  for (const variant of answerVariants(e)) {
    if (canonicalAnswer(variant) === aCanon) return true
  }
  for (const variant of answerVariants(a)) {
    if (canonicalAnswer(variant) === eCanon) return true
  }
  // Dates: "2026-01" vs "01/2026" vs "January 2026" are the same month
  if (kind === 'date' || (parseDateParts(e) && parseDateParts(a))) {
    const ep = parseDateParts(e)
    const ap = parseDateParts(a)
    if (ep && ap) return ep.year === ap.year && ep.month === ap.month
  }
  // Polarity is definitive in both directions ("No" vs "I am not…")
  const eIntent = classifyIntent(e)
  const aIntent = classifyIntent(a)
  if (eIntent !== 'unknown' && aIntent !== 'unknown') return eIntent === aIntent
  return lexicalAnswerScore(a, e) >= 0.5
}

const MASK = '••••••••'

/** Expected text for a match: what the fill actually placed when known
 *  (judge-picked dropdown options live only there), else the resolved
 *  answer, else the raw template. */
function expectedFor(match: MatchResult, filledValue: string | undefined, kind: FieldKind): string {
  if (filledValue) return filledValue
  if (kind === 'checkbox' && (match.chosenOptionValue === 'checked' || match.chosenOptionValue === 'unchecked')) {
    return match.chosenOptionValue === 'checked' ? 'Yes' : 'No'
  }
  return match.resolvedAnswer ?? match.rawAnswerTemplate
}

/**
 * Validate every detected field against the match set. Pure given its
 * inputs; the caller re-detects fields AFTER fills settle so `signal.filled`
 * reflects the page's real end state.
 */
export function validateFields(
  fields: DetectedField[],
  matches: Map<string, MatchResult>,
  filledValues: Map<string, string>,
): FieldValidation[] {
  const out: FieldValidation[] = []
  for (const field of fields) {
    const { signal } = field
    const base = {
      fieldId: signal.fieldId,
      label: signal.label || signal.normalizedQuestion,
      kind: signal.kind,
      required: signal.required,
      normalizedQuestion: signal.normalizedQuestion,
      options: signal.options.map((o) => o.text),
      sectionContext: signal.sectionContext,
      sectionIndex: signal.sectionIndex,
      eeoLike: signal.eeoLike,
      consentLike: signal.consentLike,
    }
    // An action:'ignore' match is a below-threshold guess — for completeness
    // purposes the field is UNANSWERED, not covered.
    const rawMatch = matches.get(signal.fieldId)
    const match = rawMatch && rawMatch.action !== 'ignore' ? rawMatch : undefined

    if (match?.notify) {
      out.push({ ...base, verdict: 'skipped' })
      continue
    }

    // File uploads get real verdicts now (resume feature, 2026-07-17).
    // Honest limitation: this verifies the file was HANDED to the page, not
    // that the site's async upload to its server succeeded — the toast's
    // "Review before submitting!" stands.
    if (signal.kind === 'file') {
      if (!match) {
        out.push({ ...base, verdict: 'skipped' }) // no stored documents
        continue
      }
      const actual = readActualValue(field)
      const expected = expectedFor(match, filledValues.get(signal.fieldId), signal.kind)
      if (actual === '') {
        // Attach attempted but the zone is still empty → retry chip;
        // suggest-only matches are waiting for the user by design.
        out.push(
          match.action === 'autofill'
            ? { ...base, verdict: 'missing-answerable', expected }
            : { ...base, verdict: 'skipped', expected },
        )
        continue
      }
      // Zones render "name.pdf", "name.pdf (120 KB)", or a truncation —
      // containment either way is a match; a different filename is WRONG.
      const e = expected.trim().toLowerCase()
      const a = actual.trim().toLowerCase()
      const ok = e !== '' && (a.includes(e) || e.includes(a))
      out.push({ ...base, verdict: ok ? 'ok' : 'wrong', expected, actual })
      continue
    }

    const actual = readActualValue(field)
    const filled = signal.filled

    if (!match) {
      // No stored answer: an empty field is a coverage gap; a filled one is
      // the user's (or the site's) content — not ours to judge.
      out.push(filled ? { ...base, verdict: 'skipped' } : { ...base, verdict: 'missing-unanswered' })
      continue
    }

    const expected = expectedFor(match, filledValues.get(signal.fieldId), signal.kind)
    const mask = signal.kind === 'password'
    const show = (s: string) => (mask ? MASK : s)

    // No usable expectation (e.g. deferred inference whose fill never
    // recorded a pick) — nothing to judge against, never cry "wrong".
    if (expected.trim() === '') {
      out.push({ ...base, verdict: 'skipped' })
      continue
    }

    // Multi-select custom dropdowns render choices as pills OUTSIDE the
    // trigger: an empty display with a recorded successful fill is an
    // UNVERIFIABLE widget, not a failure.
    if (
      signal.kind === 'custom-dropdown' &&
      !filled &&
      actual === '' &&
      filledValues.has(signal.fieldId)
    ) {
      out.push({ ...base, verdict: 'skipped', expected: show(expected) })
      continue
    }

    if (!filled) {
      // Suggest-only matches are WAITING for the user — that's the design,
      // not a failure.
      out.push(
        match.action === 'autofill'
          ? { ...base, verdict: 'missing-answerable', expected: show(expected) }
          : { ...base, verdict: 'skipped', expected: show(expected) },
      )
      continue
    }

    // Multi-select checkbox groups (native boxes or pill buttons): every
    // expected part must be checked
    if (
      signal.kind === 'checkbox' &&
      ((field.groupEls?.length ?? 0) > 1 || (field.pillEls?.length ?? 0) > 1) &&
      match.chosenOptionValues
    ) {
      const checkedTexts = actual.split('; ').map((t) => canonicalAnswer(t))
      const allPlaced = match.chosenOptionValues.every((t) =>
        checkedTexts.includes(canonicalAnswer(t)),
      )
      out.push({
        ...base,
        verdict: allPlaced ? 'ok' : 'wrong',
        expected: match.chosenOptionValues.join('; '),
        actual,
      })
      continue
    }

    const ok = valuesMatch(expected, actual, signal.kind)
    out.push({
      ...base,
      verdict: ok ? 'ok' : 'wrong',
      expected: show(expected),
      actual: show(actual),
    })
  }
  return out
}

export interface ValidationSummary {
  ok: number
  wrong: number
  missingAnswerable: number
  missingUnanswered: number
  skipped: number
}

export function summarizeValidation(report: FieldValidation[]): ValidationSummary {
  const summary: ValidationSummary = {
    ok: 0,
    wrong: 0,
    missingAnswerable: 0,
    missingUnanswered: 0,
    skipped: 0,
  }
  for (const v of report) {
    if (v.verdict === 'ok') summary.ok++
    else if (v.verdict === 'wrong') summary.wrong++
    else if (v.verdict === 'missing-answerable') summary.missingAnswerable++
    else if (v.verdict === 'missing-unanswered') summary.missingUnanswered++
    else summary.skipped++
  }
  return summary
}
