/**
 * Is the hub reachable, and does this token work? Two different questions, answered separately.
 *
 * WHY THIS EXISTS: the token could only be seen or repaired in the Tailor tab, and the Chrome side
 * panel — the surface you actually use beside a LinkedIn profile — has no Tailor tab. So a wrong
 * token left the outreach panel dead with no way to fix it from where you were standing. This is
 * the same credential (`flashfiller_tailor_v1`, written by `setTailorConfig`), surfaced where it is
 * needed. There is no second token and this module must never create one.
 *
 * WHY TWO REQUESTS: `/health` is UNAUTHENTICATED (service/server.py — no `_authorised()` in that
 * branch). A green /health proves something is listening and NOTHING about the token. So the token
 * is probed separately on `/outreach/templates`, which is authenticated, free, and changes no
 * state. If /health fails the probe is skipped and the answer says it was skipped — a test that did
 * not run must never read as a test that passed.
 *
 * The classification is pure and takes facts rather than fetching them, so every branch is
 * unit-testable without a socket.
 */

import type { HealthResponse } from '@contract/types'
import { getTailorConfig, setTailorConfig } from '@/lib/tailor'
import { assertAllowedTailorUrl } from '@/lib/tailor-url'

/** The free, authenticated route used to prove the token. Reads two markdown files; spends nothing. */
export const TOKEN_PROBE_PATH = '/outreach/templates'

export type ConnectionState =
  /** Nothing has been asked yet. */
  | { kind: 'unknown' }
  /** The address was refused before anything was sent — `assertAllowedTailorUrl` threw. */
  | { kind: 'refused'; address: string; why: string }
  /** Nothing is listening. The token was NOT tested. */
  | { kind: 'down'; address: string }
  /** Something answered but not usefully. The token was NOT tested. */
  | { kind: 'error'; address: string; why: string; health?: HealthResponse | null }
  /** The hub is up and wants a token; none is stored. */
  | { kind: 'no-token'; address: string; health: HealthResponse | null }
  /** The hub is up and rejected the token that IS stored. */
  | { kind: 'bad-token'; address: string; health: HealthResponse | null }
  /** The hub is up, no token is stored, and it accepted the call anyway (`make serve --no-token`). */
  | { kind: 'open'; address: string; health: HealthResponse | null }
  /** The hub is up and accepted the stored token on an authenticated call. */
  | { kind: 'ok'; address: string; health: HealthResponse | null }

export interface ConnectionFacts {
  address: string
  storedToken: string
  /** Non-null means nothing was sent at all. */
  addressError: string | null
  /** Null means /health did not answer. */
  health: HealthResponse | null
  /** Non-null means /health answered something unusable. */
  healthError: string | null
  /** Null means the authenticated probe was NOT run. */
  probeStatus: number | null
}

/** The address without its scheme — short enough for a 320px side panel, still says which machine. */
export function shortAddress(address: string): string {
  return address.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

/**
 * The verdict, from facts already gathered. Pure — this is what the tests exercise.
 *
 * Order matters: an address we refused was never sent, and a hub that did not answer cannot have
 * judged a token. Each earlier branch makes the later ones unanswerable, so they must not be reached.
 */
export function classifyConnection(facts: ConnectionFacts): ConnectionState {
  const address = facts.address
  if (facts.addressError) return { kind: 'refused', address, why: facts.addressError }
  if (facts.healthError) return { kind: 'error', address, why: facts.healthError, health: facts.health }
  if (!facts.health) return { kind: 'down', address }
  const health = facts.health
  // /health answered but the probe did not run: we know the hub is up and nothing about the token.
  if (facts.probeStatus === null) {
    return { kind: 'error', address, health, why: 'the token was not tested' }
  }
  const hasToken = facts.storedToken.trim() !== ''
  if (facts.probeStatus === 401 || facts.probeStatus === 403) {
    return hasToken ? { kind: 'bad-token', address, health } : { kind: 'no-token', address, health }
  }
  if (facts.probeStatus >= 200 && facts.probeStatus < 300) {
    return hasToken ? { kind: 'ok', address, health } : { kind: 'open', address, health }
  }
  return { kind: 'error', address, health, why: `the hub answered HTTP ${facts.probeStatus} on ${TOKEN_PROBE_PATH}` }
}

/** True only where the token has actually been proven. The honesty invariant is asserted on this. */
export function isConnected(state: ConnectionState): boolean {
  return state.kind === 'ok' || state.kind === 'open'
}

/** The collapsed one-liner. Pure. */
export function summaryLine(state: ConnectionState): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  switch (state.kind) {
    case 'unknown':
      return { text: 'Hub connection — not checked yet.', tone: 'muted' }
    case 'refused':
      return { text: `Address refused, nothing was sent — ${state.why}`, tone: 'warn' }
    case 'down':
      return {
        text: `Hub not running at ${shortAddress(state.address)} — nothing can be drafted, tightened or `
          + 'logged. Start it with make serve, or fix the address here.',
        tone: 'warn',
      }
    case 'error':
      return { text: `Hub at ${shortAddress(state.address)} answered something unusable — ${state.why}.`, tone: 'warn' }
    case 'no-token':
      return {
        text: 'No hub token set — the hub is running, but every draft, tighten and log will come back '
          + '401. Set it here.',
        tone: 'warn',
      }
    case 'bad-token':
      return {
        text: 'Hub rejected this token — the hub is up, the token is wrong. Re-copy it from '
          + 'apps/mapper/.tailor-token.',
        tone: 'warn',
      }
    case 'open':
      return { text: `Hub connected — ${shortAddress(state.address)}, and it asks for no token.`, tone: 'ok' }
    case 'ok':
      return {
        text: `Hub connected — ${shortAddress(state.address)}, token accepted. Change address or token`,
        tone: 'ok',
      }
  }
}

/** The expanded result after a Test press. Pure. Says what was tested AND what was not. */
export function verdictLine(state: ConnectionState): string {
  switch (state.kind) {
    case 'unknown':
      return 'Nothing has been checked yet. Press Test connection.'
    case 'refused':
      return `Nothing was sent — ${state.why}`
    case 'down':
      return `Nothing is listening at ${state.address}. The token was not tested — there was nothing to `
        + 'ask. Start the hub with make serve, or correct the address above.'
    case 'error':
      return `The hub at ${shortAddress(state.address)} did not answer usefully — ${state.why}. `
        + 'Until it does, the token cannot be tested.'
    case 'no-token':
      return 'The hub is up, and it wants a token you have not set. Paste the one make serve printed '
        + 'into the box above and press Save.'
    case 'bad-token':
      return `The hub is up${state.health?.version ? ` (version ${state.health.version})` : ''} but it `
        + 'rejected this token. /health is public, so a running hub proves nothing about the token — '
        + 'this is the authenticated check, and it failed. Re-copy it from apps/mapper/.tailor-token '
        + '("make token | pbcopy" gives it clean), then press Save.'
    case 'open':
      return 'Connected — and this hub is running without a token (make serve --no-token), so anything '
        + 'on this machine can reach it.'
    case 'ok':
      return 'Connected. The hub answered /health, and it accepted this token on an authenticated call. '
        + 'Nothing was spent.'
  }
}

/**
 * Should the block be open? A proven connection stays shut — the note is what he came for, and an
 * address form above it pushes the note below the fold in a side panel. Anything else opens, unless
 * he has closed it himself, because every button on the panel is dead until it is fixed and nobody
 * should have to hunt for the form.
 */
export function shouldOpen(state: ConnectionState, userClosed: boolean): boolean {
  if (state.kind === 'unknown' || isConnected(state)) return false
  return !userClosed
}

async function readHealth(address: string): Promise<{ health: HealthResponse | null; error: string | null }> {
  // Its own fetch rather than lib/tailor's checkHealth(), which returns null for offline but
  // RE-THROWS everything else — a bad URL would come back looking like a hub that is down.
  let response: Response
  try {
    response = await fetch(`${address}/health`)
  } catch {
    return { health: null, error: null }            // nothing listening: `down`, not `error`
  }
  let body: unknown = null
  try {
    body = JSON.parse(await response.text())
  } catch {
    return { health: null, error: `HTTP ${response.status}, and the body was not JSON` }
  }
  if (!response.ok) return { health: null, error: `HTTP ${response.status} on /health` }
  return { health: body as HealthResponse, error: null }
}

/**
 * Ask both questions and classify. Free: /health costs nothing and the probe reads two markdown
 * files. `over` lets the caller test what is TYPED rather than what is saved, so a bad address can
 * be tried before it is committed to storage.
 */
export async function testConnection(over: { baseUrl?: string; token?: string } = {}): Promise<ConnectionState> {
  const stored = await getTailorConfig().catch(() => ({ baseUrl: '', token: '' }))
  const address = (over.baseUrl ?? stored.baseUrl ?? '').trim().replace(/\/+$/, '')
  const storedToken = (over.token ?? stored.token ?? '').trim()

  try {
    assertAllowedTailorUrl(address)
  } catch (e) {
    return classifyConnection({
      address, storedToken, health: null, healthError: null, probeStatus: null,
      addressError: e instanceof Error ? e.message : String(e),
    })
  }

  const { health, error } = await readHealth(address)
  if (!health) {
    // The probe is SKIPPED, and probeStatus stays null so the verdict says so.
    return classifyConnection({ address, storedToken, addressError: null, health, healthError: error, probeStatus: null })
  }

  let probeStatus: number | null = null
  try {
    const probe = await fetch(`${address}${TOKEN_PROBE_PATH}`, {
      headers: storedToken ? { 'X-Tailor-Token': storedToken } : {},
    })
    probeStatus = probe.status
  } catch {
    return classifyConnection({
      address, storedToken, addressError: null, health, probeStatus: null,
      healthError: 'the hub answered /health but not the authenticated check',
    })
  }
  return classifyConnection({ address, storedToken, addressError: null, health, healthError: null, probeStatus })
}

/** Save the address and the token, then say what they are worth. The address is validated before it
 *  reaches storage (`setTailorConfig`), so a refused one is reported and never persisted. */
export async function saveConnection(baseUrl: string, token: string): Promise<ConnectionState> {
  const address = baseUrl.trim().replace(/\/+$/, '')
  try {
    await setTailorConfig({ baseUrl: address, token: token.trim() })
  } catch (e) {
    return { kind: 'refused', address, why: e instanceof Error ? e.message : String(e) }
  }
  return testConnection()
}
