import { describe, expect, it, vi } from 'vitest'
import { createJudgeCache } from '@/content/judge-cache'

// ---------------------------------------------------------------------------
// Judge session cache: identical asks coalesce (rescans must never re-bill),
// declines are cached too but EVICTABLE — an explicit AI Fill press re-asks
// what the judge declined, a background rescan never does.
// ---------------------------------------------------------------------------

const readIndex = (r: unknown) => (r as { index?: number | null }).index ?? null

describe('createJudgeCache', () => {
  it('coalesces identical asks — one send, both callers share the answer', async () => {
    const send = vi.fn(async () => ({ ok: true, index: 2 }))
    const cache = createJudgeCache(send)
    const msg = { type: 'SEMANTIC_ANSWER', question: 'Visa?', options: ['Yes', 'No'] }
    expect(await cache.ask(msg, readIndex)).toBe(2)
    expect(await cache.ask(msg, readIndex)).toBe(2)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('caches declines, and evictDeclines() forces the retry to hit the API', async () => {
    let reply: { ok: boolean; index: number | null } = { ok: true, index: null } // decline
    const send = vi.fn(async () => reply)
    const cache = createJudgeCache(send)
    const msg = { type: 'SEMANTIC_ANSWER', question: 'Clearance?', options: ['Yes', 'No'] }

    expect(await cache.ask(msg, readIndex)).toBeNull()
    expect(await cache.ask(msg, readIndex)).toBeNull() // replayed from cache
    expect(send).toHaveBeenCalledTimes(1)

    expect(cache.evictDeclines()).toBe(1)
    reply = { ok: true, index: 0 } // the judge changes its mind on the retry
    expect(await cache.ask(msg, readIndex)).toBe(0)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('successful answers survive decline eviction', async () => {
    const send = vi.fn(async (m: unknown) =>
      (m as { question: string }).question === 'good' ? { ok: true, index: 1 } : { ok: true, index: null },
    )
    const cache = createJudgeCache(send)
    await cache.ask({ question: 'good' }, readIndex)
    await cache.ask({ question: 'declined' }, readIndex)
    expect(cache.evictDeclines()).toBe(1)
    await cache.ask({ question: 'good' }, readIndex)
    expect(send).toHaveBeenCalledTimes(2) // 'good' stayed cached
  })

  it('transport errors count as declines — evictable, never a permanent dead key', async () => {
    let fail = true
    const send = vi.fn(async () => {
      if (fail) throw new Error('SW asleep')
      return { ok: true, index: 3 }
    })
    const cache = createJudgeCache(send)
    const msg = { question: 'flaky' }
    expect(await cache.ask(msg, readIndex)).toBeNull()
    expect(cache.evictDeclines()).toBe(1)
    fail = false
    expect(await cache.ask(msg, readIndex)).toBe(3)
  })

  it('evicts oldest entries past the cap and keeps the decline set in sync', async () => {
    const send = vi.fn(async () => ({ ok: true, index: null }))
    const cache = createJudgeCache(send, 2)
    await cache.ask({ q: 1 }, readIndex)
    await cache.ask({ q: 2 }, readIndex)
    await cache.ask({ q: 3 }, readIndex) // evicts q:1
    expect(cache.size()).toBe(2)
    expect(cache.evictDeclines()).toBe(2) // q:1's decline flag went with it
  })
})
