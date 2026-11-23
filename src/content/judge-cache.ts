// ---------------------------------------------------------------------------
// Session cache for judge asks (extracted from the bootstrap 2026-07-21 so
// the decline-eviction invariant is unit-testable). MutationObserver rescans
// re-run matchAll constantly and every judge call is a billed API request —
// identical asks must coalesce, including asks that settled as "no".
//
// But a cached "no" would also make an explicit AI Fill press replay the
// decline forever, and declines aren't deterministic (no temperature
// pinned) — so decline-settled keys are tracked and evictable: a user retry
// deserves a fresh roll, a background rescan never re-bills.
// ---------------------------------------------------------------------------

export interface JudgeCache {
  ask<T>(message: unknown, read: (r: unknown) => T | null): Promise<T | null>
  /** Drop every decline-settled entry so the next identical ask goes to the
   *  API again. Returns how many were evicted (console breadcrumb). */
  evictDeclines(): number
  size(): number
}

export function createJudgeCache(
  send: (message: unknown) => Promise<unknown>,
  max = 200,
): JudgeCache {
  const cache = new Map<string, Promise<unknown>>()
  /** Keys whose ask settled as a decline — or a transport error, which the
   *  callers can't tell apart from one and equally deserves a retry. */
  const declines = new Set<string>()

  return {
    ask<T>(message: unknown, read: (r: unknown) => T | null): Promise<T | null> {
      const key = JSON.stringify(message)
      let pending = cache.get(key)
      if (!pending) {
        pending = send(message).catch(() => undefined)
        if (cache.size >= max) {
          const oldest = cache.keys().next().value
          if (oldest !== undefined) {
            cache.delete(oldest)
            declines.delete(oldest)
          }
        }
        cache.set(key, pending)
      }
      return pending.then((response) => {
        const r = response as { ok?: boolean } | undefined
        const value = r?.ok ? read(response) : null
        if (value === null) declines.add(key)
        else declines.delete(key)
        return value
      })
    },
    evictDeclines(): number {
      let evicted = 0
      for (const key of declines) {
        if (cache.delete(key)) evicted++
      }
      declines.clear()
      return evicted
    },
    size: () => cache.size,
  }
}
