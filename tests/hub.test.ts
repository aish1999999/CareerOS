import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HubBatchRequest } from '@contract/types'
import {
  HUB_BATCH_MAX,
  HUB_DEAD_KEY,
  HUB_OUTBOX_KEY,
  clearHubDeadLetters,
  flushHubOutbox,
  getHubDeadLetters,
  getHubOutbox,
  hubEnqueue,
  hubEvent,
  hubHealth,
  hubInsert,
  hubQuery,
  hubUpdate,
  hubUpsert,
} from '@/lib/hub'
import { setTailorConfig } from '@/lib/tailor'
import { resetChromeMock } from './setup'

// Stage 3 — the hub client: every write is queued in chrome.storage first and
// flushed to POST /db/batch; the service being down loses nothing; a refused
// row (4xx) goes to the dead-letter list instead of blocking the queue.

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function batchOk(req: HubBatchRequest): Response {
  return jsonResponse(200, {
    ok: true,
    results: req.ops.map((op) => ({ clientRef: op.clientRef, ok: true, status: 200, row: { id: 'r-' + op.clientRef, ...(op.body ?? {}) }, error: null })),
  })
}

const job = { source: 'linkedin', title: 'IE', company: 'Acme', captured_by: 'extension', dedupe_key: 'k1' }

describe('hub outbox', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('queues when the service is down and loses nothing', async () => {
    fetchMock.mockRejectedValue(new TypeError('connect ECONNREFUSED'))
    const ref = await hubInsert('jobs', job)
    const outbox = await getHubOutbox()
    expect(outbox).toHaveLength(1)
    expect(outbox[0].ref).toBe(ref)
    expect(outbox[0].op).toMatchObject({ op: 'insert', table: 'jobs', clientRef: ref })
    const report = await flushHubOutbox()
    expect(report).toMatchObject({ sent: 0, left: 1, offline: true })
  })

  it('flushes in order with the token and the surface header, then empties the outbox', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('down'))
    await hubInsert('jobs', job)                                                   // queued: service down
    await hubUpsert('leads', { linkedin_url: 'https://www.linkedin.com/in/x/' }, undefined, { flush: false })
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => batchOk(JSON.parse(String(init.body)) as HubBatchRequest))
    await hubEvent('jobs', 'j1', 'captured', { where: 'test' })                  // flushes all three
    expect(await getHubOutbox()).toEqual([])
    expect(await flushHubOutbox()).toMatchObject({ sent: 0, left: 0, reason: 'outbox empty' })
    const call = fetchMock.mock.calls.at(-1) as [string, RequestInit]
    expect(call[0]).toBe('http://127.0.0.1:8765/db/batch')
    const headers = call[1].headers as Record<string, string>
    expect(headers['X-Tailor-Token']).toBe('tok')
    expect(headers['X-Surface']).toBe('extension')
    const body = JSON.parse(String(call[1].body)) as HubBatchRequest
    expect(body.surface).toBe('extension')
    expect(body.ops.map((o) => o.op)).toEqual(['insert', 'upsert', 'insert'])
    expect(body.ops[2].body).toMatchObject({ surface: 'extension', entity: 'jobs', entity_id: 'j1', action: 'captured' })
  })

  it('a 5xx answer keeps an op enqueued mid-flight (the write-back re-reads the outbox)', async () => {
    const first = await hubUpsert('jobs', job, undefined, { flush: false })
    let midFlight: string | null = null
    fetchMock.mockImplementationOnce(async () => {
      midFlight = await hubUpsert('leads', { linkedin_url: 'https://www.linkedin.com/in/mid/' }, undefined, { flush: false })
      return jsonResponse(500, { error: 'boom' })
    })
    const report = await flushHubOutbox()
    expect(report).toMatchObject({ sent: 0, left: 2, reason: 'Hub answered HTTP 500.' })
    const outbox = await getHubOutbox()
    expect(outbox.map((e) => e.ref)).toEqual([first, midFlight])
    expect(outbox.map((e) => e.attempts)).toEqual([1, 0])
  })

  it('two enqueues at once never overwrite each other (one write chain over the outbox)', async () => {
    const refs = await Promise.all([
      hubUpsert('jobs', job, undefined, { flush: false }),
      hubUpsert('leads', { linkedin_url: 'https://www.linkedin.com/in/a/' }, undefined, { flush: false }),
      hubUpsert('leads', { linkedin_url: 'https://www.linkedin.com/in/b/' }, undefined, { flush: false }),
    ])
    expect((await getHubOutbox()).map((e) => e.ref)).toEqual(refs)
  })

  it('reports the stored row per ref, so a caller can read the id the hub assigned (Stage 5)', async () => {
    const ref = await hubUpsert('jobs', job, undefined, { flush: false })
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => batchOk(JSON.parse(String(init.body)) as HubBatchRequest))
    const report = await flushHubOutbox()
    expect(report).toMatchObject({ sent: 1, left: 0 })
    expect(Object.keys(report.rows ?? {})).toEqual([ref])
    expect(report.rows?.[ref]).toMatchObject({ id: expect.any(String) })
  })

  it('moves refused rows (4xx) to the dead letters and keeps the rest flowing', async () => {
    const good = await hubInsert('jobs', job, { flush: false })
    const bad = await hubInsert('jobs', { ...job, source: 'facebook' }, { flush: false })
    const later = await hubUpdate('jobs', 'missing-id', { status: 'closed' }, { flush: false })
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const req = JSON.parse(String(init.body)) as HubBatchRequest
      return jsonResponse(207, {
        ok: false,
        results: req.ops.map((op) =>
          op.clientRef === good
            ? { clientRef: op.clientRef, ok: true, status: 200, row: { id: 'r1' }, error: null }
            : op.clientRef === bad
              ? { clientRef: op.clientRef, ok: false, status: 400, row: null, error: "jobs.source: 'facebook' not in (...)" }
              : { clientRef: op.clientRef, ok: false, status: 404, row: null, error: 'jobs/missing-id: not found' },
        ),
      })
    })
    const report = await flushHubOutbox()
    expect(report).toMatchObject({ sent: 1, left: 0, dead: 2, offline: false })
    expect(await getHubOutbox()).toEqual([])
    const dead = await getHubDeadLetters()
    expect(dead.map((d) => [d.ref, d.status])).toEqual([
      [bad, 400],
      [later, 404],
    ])
    expect(dead[0].lastError).toContain('facebook')
    await clearHubDeadLetters()
    expect(await getHubDeadLetters()).toEqual([])
  })

  it('keeps ops queued when the database behind the hub is unreachable (5xx per op)', async () => {
    const ref = await hubInsert('jobs', job, { flush: false })
    fetchMock.mockResolvedValue(
      jsonResponse(207, { ok: false, results: [{ clientRef: ref, ok: false, status: 502, row: null, error: 'database: cannot reach Supabase' }] }),
    )
    const report = await flushHubOutbox()
    expect(report).toMatchObject({ sent: 0, left: 1, dead: 0, offline: false })
    const [entry] = await getHubOutbox()
    expect(entry.attempts).toBe(1)
    expect(entry.lastError).toContain('cannot reach')
  })

  it('stops on 401 / 503 and on a non-JSON answer without dropping anything', async () => {
    await hubInsert('jobs', job, { flush: false })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    expect(await flushHubOutbox()).toMatchObject({ sent: 0, left: 1, reason: expect.stringContaining('token') })
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'database not configured' }))
    expect(await flushHubOutbox()).toMatchObject({ sent: 0, left: 1, reason: expect.stringContaining('no database') })
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 500 }))
    expect(await flushHubOutbox()).toMatchObject({ sent: 0, left: 1, reason: 'Hub answered HTTP 500.' })
    expect((await getHubOutbox())[0].attempts).toBe(1)
  })

  it('sends at most HUB_BATCH_MAX ops per request and drains the rest in further requests', async () => {
    for (let i = 0; i < HUB_BATCH_MAX + 5; i++) await hubEnqueue({ op: 'insert', table: 'events', body: { surface: 'extension', entity: 'x', action: 'a' } }, { flush: false })
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => batchOk(JSON.parse(String(init.body)) as HubBatchRequest))
    const report = await flushHubOutbox()
    expect(report.sent).toBe(HUB_BATCH_MAX + 5)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as HubBatchRequest
    expect(first.ops).toHaveLength(HUB_BATCH_MAX)
  })

  // 2026-09-16 audit: the hub refuses bodies over 1 MB with a 400; a count-only chunk of captured
  // postings could exceed that and then sit at the head of the queue forever.
  it('caps a chunk by bytes as well as by count, so a request never exceeds what the hub accepts', async () => {
    const big = { surface: 'extension', entity: 'x', action: 'a', note: 'x'.repeat(300_000) }
    for (let i = 0; i < 3; i++) await hubEnqueue({ op: 'insert', table: 'events', body: big }, { flush: false })
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => batchOk(JSON.parse(String(init.body)) as HubBatchRequest))
    const report = await flushHubOutbox()
    expect(report).toMatchObject({ sent: 3, left: 0, dead: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)) as HubBatchRequest
    expect(first.ops).toHaveLength(2)                      // 600 KB fits under the 900 KB budget; the third op does not
  })

  it('an envelope-level 400 halves the chunk, and a single op the hub will not take goes to the dead letters', async () => {
    const small = await hubInsert('jobs', job, { flush: false })
    const huge = await hubEnqueue({ op: 'insert', table: 'events', body: { surface: 'extension', entity: 'x', action: 'a', note: 'x'.repeat(50_000) } }, { flush: false })
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const req = JSON.parse(String(init.body)) as HubBatchRequest
      // the hub refuses any envelope that carries the huge op — as it would a body over MAX_BODY_BYTES
      if (req.ops.some((op) => op.clientRef === huge)) return jsonResponse(400, { error: 'request body exceeds 1000000 bytes.' })
      return batchOk(req)
    })
    const report = await flushHubOutbox()
    expect(report).toMatchObject({ sent: 1, left: 0, dead: 1, offline: false })
    expect(await getHubOutbox()).toEqual([])
    const dead = await getHubDeadLetters()
    expect(dead.map((d) => [d.ref, d.status])).toEqual([[huge, 400]])
    expect(dead[0].lastError).toContain('exceeds')
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2)   // the pair was refused, then each op went alone
    void small
  })

  it('is single-flight: a flush that finds one in flight follows it, and sees what both sent', async () => {
    await hubInsert('jobs', job, { flush: false })
    let resolve: (r: Response) => void = () => undefined
    fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => (resolve = res)))
    const a = flushHubOutbox()
    const b = flushHubOutbox()
    const c = flushHubOutbox()
    expect(b).toBe(c)                                    // one follow-up serves every caller that found a flush running
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const ref = (await getHubOutbox())[0].ref
    resolve(jsonResponse(200, { ok: true, results: [{ clientRef: ref, ok: true, status: 200, row: { id: 'j1' }, error: null }] }))
    expect(await a).toMatchObject({ sent: 1, left: 0 })
    // the follow-up found the outbox empty (no second request) and still reports the first flush's rows
    expect(await b).toMatchObject({ sent: 1, left: 0, rows: { [ref]: { id: 'j1' } } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('an op enqueued during a flush goes out — by that flush re-reading the outbox, and the follow-up reports it too (Stage 6)', async () => {
    await hubInsert('jobs', job, { flush: false })
    let resolve: (r: Response) => void = () => undefined
    fetchMock.mockImplementationOnce(() => new Promise<Response>((res) => (resolve = res)))
    const a = flushHubOutbox()
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const first = (await getHubOutbox())[0].ref
    const late = await hubInsert('jobs', { ...job, dedupe_key: 'acme|ie|late' }, { flush: false })   // during the request
    const b = flushHubOutbox()
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      const req = JSON.parse(String(init.body)) as HubBatchRequest
      return jsonResponse(200, { ok: true, results: req.ops.map((op) => ({ clientRef: op.clientRef, ok: true, status: 200, row: { id: 'j-' + op.clientRef }, error: null })) })
    })
    resolve(jsonResponse(200, { ok: true, results: [{ clientRef: first, ok: true, status: 200, row: { id: 'j1' }, error: null }] }))
    const firstReport = await a                          // the running flush re-read the outbox after its response and sent the late op
    expect(firstReport).toMatchObject({ sent: 2, left: 0 })
    expect(firstReport.rows?.[late]).toEqual({ id: 'j-' + late })
    const report = await b                               // the follow-up found nothing left and carries the same rows
    expect(report).toMatchObject({ sent: 2, left: 0 })
    expect(report.rows?.[late]).toEqual({ id: 'j-' + late })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(await getHubOutbox()).toEqual([])
  })

  it('reads never touch the outbox and fail soft', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { configured: true, reachable: true, userId: 'candidate' }))
      expect(await hubHealth()).toMatchObject({ configured: true, userId: 'candidate' })
    fetchMock.mockRejectedValueOnce(new TypeError('down'))
    expect(await hubHealth()).toBeNull()
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { table: 'jobs', rows: [{ id: '1' }], count: 1 }))
    expect(await hubQuery('jobs', { company: 'eq.Acme', limit: '5' })).toEqual([{ id: '1' }])
    expect((fetchMock.mock.calls.at(-1) as [string])[0]).toBe('http://127.0.0.1:8765/db/jobs?company=eq.Acme&limit=5')
    const raw = await chrome.storage.local.get([HUB_OUTBOX_KEY, HUB_DEAD_KEY])
    expect(raw[HUB_OUTBOX_KEY] ?? []).toEqual([])
  })
})
