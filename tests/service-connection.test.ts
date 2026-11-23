import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  TOKEN_PROBE_PATH,
  classifyConnection,
  isConnected,
  shortAddress,
  shouldOpen,
  summaryLine,
  testConnection,
  verdictLine,
  type ConnectionFacts,
  type ConnectionState,
} from '@/lib/service-connection'
import { setTailorConfig } from '@/lib/tailor'
import { resetChromeMock } from './setup'

// The hub connection, as seen from the outreach panel — which is the surface with no Tailor tab.
//
// The rule this file exists to hold: /health is UNAUTHENTICATED, so a running hub proves NOTHING
// about the token. Everything here is about not conflating those two facts, and about never letting
// a check that did not run read as a check that passed.

const HEALTH = { ok: true, version: '1.4.0' }

function facts(patch: Partial<ConnectionFacts> = {}): ConnectionFacts {
  return {
    address: 'http://127.0.0.1:8765',
    storedToken: 'a-token',
    addressError: null,
    health: HEALTH,
    healthError: null,
    probeStatus: 200,
    ...patch,
  }
}

const EVERY_STATE: ConnectionState[] = [
  { kind: 'unknown' },
  { kind: 'refused', address: 'http://8.8.8.8', why: 'that is a public address' },
  { kind: 'down', address: 'http://127.0.0.1:8765' },
  { kind: 'error', address: 'http://127.0.0.1:8765', why: 'the token was not tested' },
  { kind: 'no-token', address: 'http://127.0.0.1:8765', health: HEALTH },
  { kind: 'bad-token', address: 'http://127.0.0.1:8765', health: HEALTH },
  { kind: 'open', address: 'http://127.0.0.1:8765', health: HEALTH },
  { kind: 'ok', address: 'http://127.0.0.1:8765', health: HEALTH },
]

describe('classifyConnection — eight answers, each from facts already in hand', () => {
  it('refuses an address before anything is sent, and does not pretend to have tested a token', () => {
    const state = classifyConnection(facts({ addressError: 'that is a public address', health: null, probeStatus: null }))
    expect(state.kind).toBe('refused')
  })

  it('calls nothing listening "down", not an error', () => {
    expect(classifyConnection(facts({ health: null, probeStatus: null })).kind).toBe('down')
  })

  it('will not call the hub up when it answered something unusable', () => {
    expect(classifyConnection(facts({ healthError: 'HTTP 500, and the body was not JSON', health: null })).kind).toBe('error')
  })

  it('says so when the hub is up but the probe never ran — the token is UNTESTED, not accepted', () => {
    const state = classifyConnection(facts({ probeStatus: null }))
    expect(state.kind).toBe('error')
    expect(isConnected(state)).toBe(false)
  })

  it('tells a wrong token from a missing one, because the fixes are different', () => {
    expect(classifyConnection(facts({ probeStatus: 401, storedToken: 'wrong' })).kind).toBe('bad-token')
    expect(classifyConnection(facts({ probeStatus: 401, storedToken: '' })).kind).toBe('no-token')
    expect(classifyConnection(facts({ probeStatus: 403, storedToken: 'wrong' })).kind).toBe('bad-token')
  })

  it('names a hub running without a token rather than claiming the stored one was accepted', () => {
    expect(classifyConnection(facts({ probeStatus: 200, storedToken: '' })).kind).toBe('open')
    expect(classifyConnection(facts({ probeStatus: 200, storedToken: 'a-token' })).kind).toBe('ok')
  })

  it('treats any other status as an error naming the route, not as a pass', () => {
    const state = classifyConnection(facts({ probeStatus: 500 }))
    expect(state.kind).toBe('error')
    expect(isConnected(state)).toBe(false)
  })
})

describe('the honesty invariant', () => {
  it('never says "connected" unless the token was actually accepted', () => {
    for (const state of EVERY_STATE) {
      const claimed = /connected/i.test(summaryLine(state).text) || /^Connected/i.test(verdictLine(state))
      expect(claimed, `${state.kind} must not claim a connection`).toBe(isConnected(state))
    }
  })

  it('says the token was NOT tested when the hub never answered', () => {
    const verdict = verdictLine({ kind: 'down', address: 'http://127.0.0.1:8765' })
    expect(verdict).toMatch(/token was not tested/i)
    expect(verdict).toMatch(/nothing to ask/i)
  })

  it('blames the token, and explains why a green hub proved nothing', () => {
    const verdict = verdictLine({ kind: 'bad-token', address: 'http://127.0.0.1:8765', health: HEALTH })
    expect(verdict).toMatch(/rejected this token/i)
    expect(verdict).toMatch(/\/health is public/i)
    expect(verdict).toMatch(/version 1\.4\.0/)
  })
})

describe('the collapsed summary', () => {
  it('reads as connected only when it is, and names the machine', () => {
    const line = summaryLine({ kind: 'ok', address: 'http://127.0.0.1:8765', health: HEALTH })
    expect(line.text).toBe('Hub connected — 127.0.0.1:8765, token accepted. Change address or token')
    expect(line.tone).toBe('ok')
  })

  it('tells him what is dead and how to fix it when the hub is not running', () => {
    const line = summaryLine({ kind: 'down', address: 'http://127.0.0.1:8765' })
    expect(line.text).toBe('Hub not running at 127.0.0.1:8765 — nothing can be drafted, tightened or '
      + 'logged. Start it with make serve, or fix the address here.')
    expect(line.tone).toBe('warn')
  })

  it('says a missing token will 401 everything, rather than leaving him to find out', () => {
    const line = summaryLine({ kind: 'no-token', address: 'http://127.0.0.1:8765', health: HEALTH })
    expect(line.text).toBe('No hub token set — the hub is running, but every draft, tighten and log '
      + 'will come back 401. Set it here.')
  })

  it('strips the scheme so the line fits a side panel, and keeps the port', () => {
    expect(shortAddress('http://127.0.0.1:8765/')).toBe('127.0.0.1:8765')
    expect(shortAddress('https://box.ts.net')).toBe('box.ts.net')
  })
})

describe('when the block opens itself', () => {
  it('stays shut on a proven connection — the note is what he came for', () => {
    expect(shouldOpen({ kind: 'ok', address: 'a', health: null }, false)).toBe(false)
    expect(shouldOpen({ kind: 'open', address: 'a', health: null }, false)).toBe(false)
  })

  it('stays shut before anything has been checked', () => {
    expect(shouldOpen({ kind: 'unknown' }, false)).toBe(false)
  })

  it('opens on every kind of trouble, because every button below it is dead', () => {
    for (const state of EVERY_STATE.filter((s) => s.kind !== 'unknown' && !isConnected(s))) {
      expect(shouldOpen(state, false), state.kind).toBe(true)
    }
  })

  it('respects him closing it', () => {
    expect(shouldOpen({ kind: 'down', address: 'a' }, true)).toBe(false)
  })
})

describe('testConnection — two requests, and the second is skipped when the first fails', () => {
  let calls: string[]

  beforeEach(async () => {
    resetChromeMock()
    calls = []
    await setTailorConfig({ baseUrl: 'http://127.0.0.1:8765', token: 'a-token' })
  })

  afterEach(() => { vi.restoreAllMocks() })

  function serve(handler: (url: string) => { status: number; body: string } | 'refuse'): void {
    globalThis.fetch = vi.fn(async (url: string) => {
      calls.push(url)
      const answer = handler(url)
      if (answer === 'refuse') throw new TypeError('Failed to fetch')
      return { ok: answer.status >= 200 && answer.status < 300, status: answer.status, async text() { return answer.body } }
    }) as unknown as typeof fetch
  }

  it('asks /health, then proves the token on the free authenticated route', async () => {
    serve(() => ({ status: 200, body: JSON.stringify(HEALTH) }))
    const state = await testConnection()
    expect(state.kind).toBe('ok')
    expect(calls).toEqual(['http://127.0.0.1:8765/health', `http://127.0.0.1:8765${TOKEN_PROBE_PATH}`])
  })

  it('does not ask about the token when nothing is listening — one request, and it says so', async () => {
    serve(() => 'refuse')
    const state = await testConnection()
    expect(state.kind).toBe('down')
    expect(calls).toHaveLength(1)                      // the probe was TRULY skipped, not just unreported
    expect(verdictLine(state)).toMatch(/token was not tested/i)
  })

  it('sends nothing at all for an address it refuses', async () => {
    serve(() => ({ status: 200, body: '{}' }))
    const state = await testConnection({ baseUrl: 'https://example.com' })
    expect(state.kind).toBe('refused')
    expect(calls).toHaveLength(0)
  })

  it('carries the token on the probe, and blames the token when it is rejected', async () => {
    serve((url) => (url.endsWith('/health')
      ? { status: 200, body: JSON.stringify(HEALTH) }
      : { status: 401, body: '{"error":"bad or missing X-Tailor-Token."}' }))
    const state = await testConnection()
    expect(state.kind).toBe('bad-token')
    const init = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[1][1]
    expect((init.headers as Record<string, string>)['X-Tailor-Token']).toBe('a-token')
  })

  it('tests what is TYPED, so a corrected address can be tried before it is saved', async () => {
    serve(() => ({ status: 200, body: JSON.stringify(HEALTH) }))
    await testConnection({ baseUrl: 'http://192.168.1.50:8765', token: 'typed' })
    expect(calls[0]).toBe('http://192.168.1.50:8765/health')
  })

  it('calls a hub that answers /health with something unreadable an error, not a hub that is down', async () => {
    serve((url) => (url.endsWith('/health') ? { status: 200, body: '<html>nope</html>' } : { status: 200, body: '{}' }))
    const state = await testConnection()
    expect(state.kind).toBe('error')
    expect(isConnected(state)).toBe(false)
  })
})
