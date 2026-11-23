// ---------------------------------------------------------------------------
// Local embedding cache (2026-07-16 rebuild, Phase 2). The semantic layer's
// core idea: the API embeds a string ONCE, the vector lives in
// chrome.storage.local forever, and every later comparison is a local cosine
// — job forms ask the same ~200 questions in a thousand wordings, so API
// calls trend toward zero. Gated exactly like the judge: no key configured →
// the service worker returns null, this module marks itself unavailable, and
// every caller degrades to lexical. Zero network by default.
// ---------------------------------------------------------------------------

const CACHE_KEY = 'flashfiller_embed_cache_v1'
/** Rebuildable cache — past this size, start over rather than curate. */
const CACHE_MAX_ENTRIES = 3000

let mem: Map<string, number[]> | null = null
/** First null response (no key / judge off) short-circuits the session. */
let unavailable = false
let persistTimer: ReturnType<typeof setTimeout> | 0 = 0

function keyOf(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 300)
}

async function loadCache(): Promise<Map<string, number[]>> {
  if (mem) return mem
  mem = new Map()
  try {
    const raw = await chrome.storage.local.get(CACHE_KEY)
    const stored = raw[CACHE_KEY] as Record<string, number[]> | undefined
    if (stored) for (const [k, v] of Object.entries(stored)) mem.set(k, v)
  } catch {
    // storage unavailable (tests) — stay in-memory
  }
  return mem
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = 0
    const cache = mem
    if (!cache) return
    if (cache.size > CACHE_MAX_ENTRIES) cache.clear() // rebuildable — reset beats curating
    void chrome.storage.local
      .set({ [CACHE_KEY]: Object.fromEntries(cache) })
      .catch(() => undefined)
  }, 1500)
}

async function fetchVectors(texts: string[]): Promise<number[][] | null> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'SEMANTIC_EMBED',
      texts,
    })) as { ok: boolean; vectors: number[][] | null } | undefined
    if (!response?.ok || !response.vectors) return null
    return response.vectors
  } catch {
    return null
  }
}

/** Ensure every text has a cached vector (one batched API call for the
 *  misses). Silently does nothing when the judge/key is unconfigured. */
export async function prefetchEmbeddings(texts: string[]): Promise<void> {
  if (unavailable || texts.length === 0) return
  const cache = await loadCache()
  const missing: string[] = []
  const seen = new Set<string>()
  for (const text of texts) {
    const key = keyOf(text)
    if (!key || cache.has(key) || seen.has(key)) continue
    seen.add(key)
    missing.push(text.trim())
  }
  if (missing.length === 0) return
  const vectors = await fetchVectors(missing.slice(0, 256))
  if (!vectors) {
    unavailable = true
    return
  }
  vectors.forEach((v, i) => {
    if (Array.isArray(v) && v.length > 0) cache.set(keyOf(missing[i]), v)
  })
  schedulePersist()
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

/** Meaning-similarity of two strings in [0,1], or null when embeddings are
 *  unavailable (no key) — callers fall back to lexical. Cache-first: only
 *  strings never seen before cost an API call. */
export async function semanticSimilarity(a: string, b: string): Promise<number | null> {
  if (unavailable) return null
  if (!a.trim() || !b.trim()) return null
  const cache = await loadCache()
  const ka = keyOf(a)
  const kb = keyOf(b)
  if (ka === kb) return 1
  if (!cache.has(ka) || !cache.has(kb)) await prefetchEmbeddings([a, b])
  const va = cache.get(ka)
  const vb = cache.get(kb)
  if (!va || !vb) return null
  return Math.max(0, cosine(va, vb))
}

/** Test hook: reset module state between runs. */
export function __resetEmbedCache(): void {
  mem = null
  unavailable = false
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = 0
}
