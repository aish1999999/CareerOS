import { useState } from 'react'
import { TAILOR_BASE_URL } from '@contract/types'
import { getTailorConfig } from '@/lib/tailor'
import {
  isConnected,
  saveConnection,
  summaryLine,
  testConnection,
  verdictLine,
  type ConnectionState,
} from '@/lib/service-connection'

// ---------------------------------------------------------------------------
// The hub connection, wherever it is needed.
//
// It lived only in the Tailor tab, and the Chrome side panel has no Tailor tab — so from the
// surface used beside a LinkedIn profile there was no way to see, fix or test the connection. This
// is the SAME credential (`flashfiller_tailor_v1`); there is no second token.
//
// DEFINED AT MODULE SCOPE, ON PURPOSE. A component defined inside a render is a new function
// identity every pass, so React unmounts and remounts it and the input loses focus on every
// keystroke — the hazard TailorTab.tsx:392-395 names. A module-scope component reconciles normally.
// Never move this inside another component's body, and never give it a `key` that changes as you
// type.
//
// It owns the credential draft so no host needs text state of its own; the host owns only `open`,
// because "a failed draft opens this block" is the host's event to decide.
// ---------------------------------------------------------------------------

export interface ServiceConnectionProps {
  /** Controlled disclosure — the host opens it when one of ITS calls comes back 401 or offline. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What the host already knows, so opening the block fires no redundant probe. The outreach
   *  panel passes `ok` when getTemplates() succeeded: templates arriving IS proof of the token,
   *  on the very route this component would probe. */
  state: ConnectionState
  /** Fired after a Save or a Test, so the host can retry what it could not do. */
  onChange: (state: ConnectionState) => void
}

export function ServiceConnection({ open, onOpenChange, state, onChange }: ServiceConnectionProps) {
  const [baseUrl, setBaseUrl] = useState<string | null>(null)   // null = not loaded from storage yet
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState<'saving' | 'testing' | null>(null)
  const [verdict, setVerdict] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Read the stored address once, the first time the block is opened. Not on mount: a closed block
  // has nothing to show, and the panel above it should not wait on storage to render.
  if (open && !loaded) {
    setLoaded(true)
    void getTailorConfig()
      .then((config) => { setBaseUrl(config.baseUrl); setToken(config.token) })
      .catch(() => setBaseUrl(TAILOR_BASE_URL))
  }

  const summary = summaryLine(state)

  const save = async () => {
    setBusy('saving')
    setVerdict(null)
    try {
      const next = await saveConnection(baseUrl ?? TAILOR_BASE_URL, token)
      setVerdict(verdictLine(next))
      onChange(next)
      if (isConnected(next)) onOpenChange(false)   // fixed: get out of the way of the note
    } finally {
      setBusy(null)
    }
  }

  const test = async () => {
    setBusy('testing')
    setVerdict(null)
    try {
      // Against what is TYPED, not what is saved — so a corrected address can be tried before it is
      // committed to storage.
      const next = await testConnection({ baseUrl: baseUrl ?? undefined, token })
      setVerdict(verdictLine(next))
      onChange(next)
    } finally {
      setBusy(null)
    }
  }

  return (
    <details className="conn" data-testid="outreach-connection" open={open}
      onToggle={(e) => onOpenChange((e.currentTarget as HTMLDetailsElement).open)}>
      <summary data-testid="outreach-connection-summary"
        className={summary.tone === 'warn' ? 'warn' : 'sub'} style={{ cursor: 'pointer' }}>
        {summary.text}
      </summary>

      <div className="field" style={{ marginTop: 8 }}>
        <label>Service address</label>
        <input type="text" placeholder={TAILOR_BASE_URL} value={baseUrl ?? ''}
          onChange={(e) => setBaseUrl(e.target.value)}
          spellCheck={false} autoComplete="off" autoCapitalize="off" autoCorrect="off" />
        <div className="sub">
          Loopback, LAN or tailnet only — <code>127.0.0.1</code>, <code>192.168.x.x</code>,{' '}
          <code>10.x.x.x</code>, <code>100.64–127.x.x</code> or a <code>.ts.net</code> name.
          Public addresses are refused.
        </div>
      </div>

      <div className="field">
        <label>Service token</label>
        <input type="password" placeholder="from `make serve`" value={token}
          onChange={(e) => setToken(e.target.value)}
          spellCheck={false} autoComplete="off" autoCapitalize="off" autoCorrect="off" />
        <div className="sub">
          The same token the Tailor tab uses — one hub, one token. <code>make token</code> prints it.
        </div>
      </div>

      <div className="btn-row">
        <button className="btn small primary" disabled={busy !== null} onClick={() => void save()}>
          {busy === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button className="btn small" disabled={busy !== null} onClick={() => void test()}
          title="Two free requests: is the hub up, and does this token work. Nothing is spent.">
          {busy === 'testing' ? 'Testing…' : 'Test connection'}
        </button>
      </div>

      {verdict && (
        <div className={isConnected(state) ? 'sub' : 'note warn'} data-testid="outreach-connection-verdict"
          style={{ marginTop: 6 }}>
          {verdict}
        </div>
      )}
    </details>
  )
}
