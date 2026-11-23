import type { Settings } from '@/types'
import { lexicalScore } from '@/lib/scorers/lexical'
import { createEmbeddingScorer } from '@/lib/scorers/embeddings'

// ---------------------------------------------------------------------------
// Pluggable scorer interface (Section 6). The matcher only sees `score()`.
// ---------------------------------------------------------------------------

export interface Scorer {
  name: string
  score(a: string, b: string): number | Promise<number>
}

export const lexical: Scorer = {
  name: 'lexical',
  score: lexicalScore,
}

/**
 * Returns the scorer for the current settings. Semantic matching is opt-in
 * and degrades gracefully to lexical when unconfigured or failing.
 */
export function getScorer(settings: Settings): Scorer {
  if (settings.semanticMatching.enabled) {
    const embedding = createEmbeddingScorer(settings.semanticMatching)
    if (embedding) return embedding
  }
  return lexical
}
