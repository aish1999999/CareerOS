/** EEO/demographic topic vocabulary — single source of truth.
 *  detector.ts flags fields (eeoLike), capture/matcher use the ASYMMETRY:
 *  an answer stored under an EEO-topic question and a non-EEO question can
 *  never be the same question, whatever a judge or a value-equality check
 *  says (live corruption 2026-07-16: "School or University*" got aliased
 *  onto a captured disability answer by exactly that combination). */
export const EEO_TOPIC_RE =
  /\b(gender|races?|racial|ethnicit\w*|veteran|disabilit\w*|sexual orientation|transgender|lgbtq?\+?|demographic|hispanic|latino|latinx)\b/i

/** True when exactly ONE side is EEO-flavored — the poison signature. */
export function crossesEeoTopic(a: string, b: string): boolean {
  return EEO_TOPIC_RE.test(a) !== EEO_TOPIC_RE.test(b)
}

/** Word-boundary-tolerant EEO detection (Stage 1, 2026-08-22). The live store
 *  proved \b-anchored matching is beatable: a composed Workday trigger label
 *  ("GenderDecline to answerFemaleMale") mashed the option texts into the
 *  question key, "genderdecline" failed \bgender\b, and a gender answer was
 *  captured twice — once with the WRONG value. Squashing every non-letter
 *  first makes concatenation harmless. Use for capture gating; the symmetric
 *  crossesEeoTopic stays word-boundary (alias bridging needs the precision). */
// "race" is deliberately absent from the compact list — squashed text makes
// it a substring trap ("embrace", "trace"); the word-boundary RE above still
// owns the normal "race"/"races" wordings.
const EEO_COMPACT_RE =
  /(gender|racial|ethnicit|veteran|disabilit|sexualorientation|transgender|lgbtq|hispanic|latino|latinx)/i

export function looksEeoLoose(text: string): boolean {
  if (EEO_TOPIC_RE.test(text)) return true
  return EEO_COMPACT_RE.test(text.replace(/[^a-z]/gi, ''))
}
