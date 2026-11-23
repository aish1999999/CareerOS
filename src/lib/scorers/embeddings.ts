import type { SemanticSettings } from '@/types'
import type { Scorer } from '@/lib/scorers/index'
import { lexicalScore } from '@/lib/scorers/lexical'

// ---------------------------------------------------------------------------
// Optional semantic scorer (Section 6, Tier 2 option 2). OFF by default.
// Only ever contacts the provider the user explicitly configured with their
// own API key; any failure degrades gracefully to the lexical scorer.
//
// This ships as a scaffold: the provider call is intentionally not
// implemented until a concrete provider is chosen (Section 19,
// << SEMANTIC_PROVIDER >>). With semantic matching off — the default — the
// extension makes zero network requests (Section 18).
// ---------------------------------------------------------------------------

export function createEmbeddingScorer(config: SemanticSettings): Scorer | null {
  if (!config.enabled || config.provider === 'none' || !config.apiKeyRef) return null
  return {
    name: `embeddings:${config.provider}`,
    async score(a: string, b: string): Promise<number> {
      // No provider integration shipped yet — behave exactly like lexical so
      // enabling the toggle can never make matching worse or leak data.
      return lexicalScore(a, b)
    },
  }
}
