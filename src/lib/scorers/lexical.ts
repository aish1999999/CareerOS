import { canonical, canonicalAnswer, tokenize, tokenizeAnswer } from '@/lib/normalize'

// ---------------------------------------------------------------------------
// Local lexical scorer (Section 6, Tier 2 default): token-set cosine
// blended with a character-bigram Dice ratio, clamped to [0,1].
// Pure and offline — the default scorer makes zero network requests.
// ---------------------------------------------------------------------------

function termFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

type Tokenizer = (text: string) => string[]
type Canonicalizer = (text: string) => string

/** Term-frequency cosine similarity over normalized tokens. */
export function tokenCosine(a: string, b: string, toTokens: Tokenizer = tokenize): number {
  const ta = termFrequencies(toTokens(a))
  const tb = termFrequencies(toTokens(b))
  if (ta.size === 0 || tb.size === 0) return 0
  let dot = 0
  for (const [term, count] of ta) {
    const other = tb.get(term)
    if (other) dot += count * other
  }
  const magnitude = (tf: Map<string, number>) =>
    Math.sqrt([...tf.values()].reduce((sum, c) => sum + c * c, 0))
  const denom = magnitude(ta) * magnitude(tb)
  return denom === 0 ? 0 : dot / denom
}

function bigrams(text: string): Map<string, number> {
  const grams = new Map<string, number>()
  const s = text.replace(/\s+/g, ' ')
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2)
    grams.set(g, (grams.get(g) ?? 0) + 1)
  }
  return grams
}

/** Dice coefficient over character bigrams of the canonical strings. */
export function diceBigrams(a: string, b: string, toCanonical: Canonicalizer = canonical): number {
  const ca = toCanonical(a)
  const cb = toCanonical(b)
  if (!ca || !cb) return 0
  if (ca === cb) return 1
  const ga = bigrams(ca)
  const gb = bigrams(cb)
  let overlap = 0
  let sizeA = 0
  let sizeB = 0
  for (const c of ga.values()) sizeA += c
  for (const c of gb.values()) sizeB += c
  if (sizeA === 0 || sizeB === 0) return 0
  for (const [g, c] of ga) {
    const other = gb.get(g)
    if (other) overlap += Math.min(c, other)
  }
  return (2 * overlap) / (sizeA + sizeB)
}

const COSINE_WEIGHT = 0.6
const DICE_WEIGHT = 0.4

/** Combined lexical similarity in [0,1]. */
export function lexicalScore(a: string, b: string): number {
  const score = COSINE_WEIGHT * tokenCosine(a, b) + DICE_WEIGHT * diceBigrams(a, b)
  return Math.min(1, Math.max(0, score))
}

/** lexicalScore over the answer-mode tokenizer, for comparing answers to
 *  option labels — "no" stays a polarity word (see tokenizeAnswer). */
export function lexicalAnswerScore(a: string, b: string): number {
  const score =
    COSINE_WEIGHT * tokenCosine(a, b, tokenizeAnswer) +
    DICE_WEIGHT * diceBigrams(a, b, canonicalAnswer)
  return Math.min(1, Math.max(0, score))
}
