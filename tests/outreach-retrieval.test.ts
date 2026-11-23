import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { draftMessage } from '@/lib/outreach'
import { readGate } from '@/ui/components/OutreachPanel'
import { setTailorConfig } from '@/lib/tailor'
import { resetChromeMock } from './setup'

// "Where does the message reside? The problem arises at the retrieval of the message." (Bob,
// 2026-09-07.)
//
// The answer is that it resides nowhere: the hub composes it per request and it exists only in the
// HTTP response, then in React state. There is no store to read it back from. So "retrieval" is
// exactly two steps — the response bytes, and the two functions that turn them into a string — and
// this file drives BOTH with the hub's REAL bytes, captured from the live service with his own
// values. The only thing stubbed is fetch.

/** Byte-for-byte what 127.0.0.1:8765 answered for his Wozniak draft. */
const HUB_BYTES = '{"ok": true, "templateKey": "60s_male_professional", "text": "Dear Steve, your '
  + 'distinguished career and lasting impact involving Digital design Engineer at Apple set a '
  + 'standard I deeply respect. With my background in Semiconductors focused on a Industrial '
  + 'Engineer role, I would be honored to connect with you.", "chars": 248, "max": 300, '
  + '"skeletonChars": 182, "reasons": []}'

const EXPECTED = JSON.parse(HUB_BYTES).text as string

function respond(body: string, status = 200): void {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    async text() { return body },
  })) as unknown as typeof fetch
}

beforeEach(async () => {
  resetChromeMock()
  await setTailorConfig({ baseUrl: 'http://127.0.0.1:8765', token: 'a-token' })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('retrieval — the hub\'s bytes to a string on the page', () => {
  it('carries the text through draftMessage and readGate without losing it', async () => {
    respond(HUB_BYTES)
    const outcome = await draftMessage({
      bracket: '60s', gender: 'm', tone: 'professional',
      values: { name: 'Steve', standoutSkill: 'Digital design Engineer', company: 'Apple', skillset: 'Semiconductors', targetRole: 'Industrial Engineer' },
    })

    // step 1 — the client
    expect(outcome.status).toBe('sent')
    expect(outcome.draft?.text).toBe(EXPECTED)
    expect(outcome.note).toMatch(/Ready — 248 of 300/)

    // step 2 — the panel's reader, on the WHOLE outcome (this is what generate() passes it)
    const gate = readGate(outcome)
    expect(gate.text).toBe(EXPECTED)
    expect(gate.chars).toBe(248)
    expect(gate.templateKey).toBe('60s_male_professional')
    expect(gate.ok).toBe(true)
    expect(gate.reasons).toEqual([])
  })

  it('sends the token the panel holds, to the address the panel holds', async () => {
    respond(HUB_BYTES)
    await draftMessage({ bracket: '60s', gender: 'm', tone: 'professional', values: {} as never })
    const [url, init] = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe('http://127.0.0.1:8765/outreach/draft')
    expect((init.headers as Record<string, string>)['X-Tailor-Token']).toBe('a-token')
  })

  it('reports a 401 as a refusal rather than an empty message', async () => {
    respond('{"error": "bad or missing X-Tailor-Token."}', 401)
    const outcome = await draftMessage({ bracket: '60s', gender: 'm', tone: 'professional', values: {} as never })
    expect(outcome.status).toBe('error')
    expect(outcome.note).toMatch(/rejected the token/i)
    expect(outcome.draft).toBeNull()
  })

  it('reports an HTML answer as a refusal — the keep-alive desync, seen from this side', async () => {
    // The hub's HTML "Bad request syntax" page. Before the framing fix this is what a good request
    // received after a refused one on the same connection.
    respond('<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN">\n<html><body>Bad request</body></html>', 400)
    const outcome = await draftMessage({ bracket: '60s', gender: 'm', tone: 'professional', values: {} as never })
    expect(outcome.status).toBe('error')
    expect(outcome.note).toMatch(/not JSON/i)
    expect(outcome.draft).toBeNull()
  })

  it('never turns a refusal into an empty-but-successful draft', async () => {
    // The failure that started all this: an error envelope read as a gate yields text '' and the
    // panel would show an empty note as though it had worked.
    respond('{"error": "no route /outreach/draft."}', 404)
    const outcome = await draftMessage({ bracket: '60s', gender: 'm', tone: 'professional', values: {} as never })
    expect(outcome.status).toBe('error')
    // readGate on an error envelope must not be mistaken for a draft — the panel checks status
    // FIRST, and this documents why: the text would be empty and `ok` false.
    const gate = readGate(outcome)
    expect(gate.text).toBe('')
    expect(gate.ok).toBe(false)
  })
})
