// ---------------------------------------------------------------------------
// Answer intent classification (Section 6). Sites phrase the same answer
// differently ("No" vs "No, I am not a protected veteran" vs "I AM NOT A
// PROTECTED VETERAN"), so option matching needs the polarity of a short
// answer, not just its surface text. Pure — no DOM access, unit-testable.
// ---------------------------------------------------------------------------

export type AnswerIntent = 'affirm' | 'negate' | 'decline' | 'unknown'

/** Strip parenthetical qualifiers — Workday suffixes every option with
 *  "(United States of America)" and can stack a second group; EEO options
 *  embed them mid-text ("Asian (Not Hispanic or Latino) or Pacific
 *  Islander"). Trailing groups strip first, then embedded ones — and the
 *  original text returns whenever stripping would leave nothing. */
export function stripParentheticals(text: string): string {
  let t = text
  let prev: string
  do {
    prev = t
    t = t.replace(/\s*\([^)]*\)\s*$/, '')
  } while (t !== prev)
  // Embedded groups ("Asian (United States of America) citizen") — collapse
  // to single spaces so the surrounding words rejoin cleanly.
  t = t.replace(/\s*\([^)]*\)\s*/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  return t === '' ? text : t
}

function prepare(text: string): string {
  return stripParentheticals(text)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Order is load-bearing. Guards run first so "0"/"N/A" stay inert; decline
// before negate because every decline phrase contains negation tokens
// ("I don't wish to answer"); negate before affirm because "No, I am not…"
// contains "I am".
const UNKNOWN_GUARDS: RegExp[] = [
  /^[\d\s.,+/-]*$/, // empty or numeric-only ("0" must not read as negate)
  /\bnot?\s+applicable\b/,
  /^n\/?a\.?$/,
]

const DECLINE_PATTERNS: RegExp[] = [
  /\bdecline[ds]?\b/, // "Decline", "I decline", "Decline to self-identify"
  /\bprefers?\s+(?:not|to\s+not)\b/,
  /\b(?:do|does|did)(?:\s+not|n't)\s+(?:wish|want|care)\s+to\b/,
  /\b(?:choose|chose|elect|opt)s?\s+not\s+to\b/,
  /\bwish\s+not\s+to\b/,
  /\brather\s+not\b/,
  /\bopt\s+out\b/,
  /^no\s+(?:answer|response|comment)$/,
]

const NEGATE_PATTERNS: RegExp[] = [
  /^no\b/, // word boundary: "Norway"/"None…" don't match this one
  /^none\b/,
  // anywhere, not just leading: "I have never worked for Novonesis" must not
  // fall through to the "\bi\s+have\b" affirm pattern (company work-history
  // option sets phrase their No this way)
  /\bnever\b/,
  /^(?:n|false)$/,
  /\b(?:i\s+am|i'm)\s+not\b/, // "I AM NOT A PROTECTED VETERAN"
  /\b(?:do|does|did|have|has|had)(?:\s+not|n't)\b/,
  /\b(?:have|has)\s+no\b/,
  /\bnot\s+(?:a|an)\b/,
]

const AFFIRM_PATTERNS: RegExp[] = [
  /^yes\b/,
  /^(?:y|true)$/,
  /\b(?:i\s+am|i'm)\s+(?:a|an|one)\b/, // "I am a protected veteran"
  /\bi\s+identify\s+as\b/,
  /\bi\s+have\b/,
]

/** Classify the polarity of a short answer or option label. Anything without
 *  clear polarity ("US Citizen", "Male", countries, numbers) is 'unknown',
 *  which keeps the intent layer inert for that comparison. */
export function classifyIntent(text: string): AnswerIntent {
  const t = prepare(text)
  if (UNKNOWN_GUARDS.some((re) => re.test(t))) return 'unknown'
  if (DECLINE_PATTERNS.some((re) => re.test(t))) return 'decline'
  if (NEGATE_PATTERNS.some((re) => re.test(t))) return 'negate'
  if (AFFIRM_PATTERNS.some((re) => re.test(t))) return 'affirm'
  return 'unknown'
}
