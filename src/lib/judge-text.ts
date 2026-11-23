// ---------------------------------------------------------------------------
// Post-processing for free-text judge replies (pure — unit-testable without
// the service worker or network).
// ---------------------------------------------------------------------------

/** Longest answer we ever accept from the model — beyond this it's rambling,
 *  not a form answer. */
export const JUDGE_TEXT_MAX_CHARS = 600

/**
 * Normalize a model reply into a fillable answer, or null when the model
 * declined (the UNKNOWN sentinel) or returned nothing usable.
 */
export function parseJudgeText(reply: string | null | undefined): string | null {
  if (!reply) return null
  let text = reply.trim()
  // Strip a single layer of surrounding quotes the model sometimes adds
  const quoted = text.match(/^"(.*)"$/s) ?? text.match(/^'(.*)'$/s) ?? text.match(/^[“”](.*)[“”]$/s)
  if (quoted) text = quoted[1].trim()
  if (!text) return null
  // The decline sentinel, tolerant of case and trailing punctuation
  if (/^unknown[.!]?$/i.test(text)) return null
  if (text.length > JUDGE_TEXT_MAX_CHARS) text = `${text.slice(0, JUDGE_TEXT_MAX_CHARS).trimEnd()}…`
  return text
}

/**
 * Parse a hierarchical-judge reply ("2.3" → category 2, sub-option 3) into
 * 0-based indices, or null on a decline ("0") or anything unparseable.
 * Tolerates dressing the model sometimes adds ("Answer: 2.3.") but rejects
 * replies with a lone number — a cascade pick needs BOTH levels.
 */
export function parseJudgePath(reply: string | null | undefined): { category: number; option: number } | null {
  if (!reply) return null
  const m = reply.match(/(\d+)\s*[.,]\s*(\d+)/)
  if (!m) return null
  const category = parseInt(m[1], 10) - 1
  const option = parseInt(m[2], 10) - 1
  if (category < 0 || option < 0) return null
  return { category, option }
}
