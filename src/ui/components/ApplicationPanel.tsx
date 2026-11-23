import { useEffect, useState } from 'react'
import type { ApplicationStatus } from '@contract/entities'
import {
  activeTabUrl, getApplication, linkForPage, loadSessionCapture, markSubmitted, recordFilled, reportForPage,
  setApplicationStatus, USER_STATUSES, type ApplicationOutcome, type ApplicationRecord, type LinkConfidence,
} from '@/lib/applications'

// ---------------------------------------------------------------------------
// The application log for the posting the Tailor tab is working on (Stage 6).
// Reads what the validator measured on the active page (fill stats) — only when
// the page is that posting's — records it once, and offers the two things only a
// human can say: "I submitted" and the funnel status afterwards. Nothing here
// submits, clicks or reads the page.
// ---------------------------------------------------------------------------

export function ApplicationPanel({ jobId, title, company }: { jobId: string | null; title?: string | null; company?: string | null }) {
  const [app, setApp] = useState<ApplicationRecord | null>(null)
  const [pageUrl, setPageUrl] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<LinkConfidence>('none')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    const refresh = async () => {
      if (!jobId) {
        setApp(null)
        return
      }
      const url = await activeTabUrl()
      const session = await loadSessionCapture(url)
      // this page is the posting's (or its site's) only when the session says so: a page that carries
      // another posting's id, another tenant, another company never receives this job's fill
      const link: LinkConfidence = session?.jobId === jobId ? linkForPage(url, session).confidence : 'none'
      let latest: string | null = null
      if (link !== 'none') {
        const report = await reportForPage(url, session)
        if (report) {
          // the fill the validator measured on this page — logged once per report, never inferred
          const out = await recordFilled(jobId, report)
          if (out) latest = out.note
        }
      }
      const rec = await getApplication(jobId)
      if (!alive) return
      setPageUrl(url)
      setConfidence(link)
      if (latest) setNote(latest)
      setApp(rec)
    }
    void refresh().catch((e) => {
      if (alive) setNote(`Application panel: ${e instanceof Error ? e.message : String(e)}`)
    })
    return () => {
      alive = false
    }
  }, [jobId])

  if (!jobId) return null

  const label = `${title ?? 'this job'}${company ? ` @ ${company}` : ''}`
  const current: ApplicationStatus = app?.status ?? 'queued'

  const apply = async (work: () => Promise<ApplicationOutcome>) => {
    setBusy(true)
    try {
      const out = await work()
      setNote(out.note)
      setApp(out.record)
    } catch (e) {
      setNote(`Not logged — ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const submitted = () => {
    const ok = confirm(`Log "${label}" as submitted?\n\nOnly you know it went in — nothing here submits or checks the page. ` +
      'The time you press OK becomes submitted_at.')
    if (!ok) return
    void apply(() => markSubmitted(jobId))
  }

  const choose = (status: ApplicationStatus) => {
    if (status === current) return
    if (status === 'submitted') {
      submitted()                        // the same confirmation as the button — never a slip of the picker
      return
    }
    void apply(() => setApplicationStatus(jobId, status))
  }

  const fs = app?.fillStats
  const options = [current, ...USER_STATUSES].filter((s, i, a) => a.indexOf(s) === i)
  return (
    <div className="note" style={{ marginTop: 8 }} data-testid="application-panel">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <strong>Application</strong>
        <span className="chip gray" title="The application log's status for this job">{app ? app.status : 'not logged yet'}</span>
        {app?.submittedAt && <span className="sub">submitted {new Date(app.submittedAt).toLocaleString()}</span>}
        <span style={{ flex: 1 }} />
        {current !== 'submitted' && (
          <button className="btn small primary" disabled={busy} onClick={submitted}
            title="Only you can say this — nothing is submitted or checked for you">
            I submitted
          </button>
        )}
      </div>
      <div className="sub">
        {label}
        {confidence === 'ats' ? ' · this page' : confidence === 'session' ? ' · the posting you last read' : ''}
      </div>
      {pageUrl && confidence === 'none' && (
        <div className="sub">This page is not that posting — its fill is not logged here.</div>
      )}
      {fs ? (
        <div className="sub">
          Fill: {fs.filled} filled · {fs.left} left for you · {fs.wrong} to check
          {fs.documents.length ? ` · handed: ${fs.documents.join(', ')}` : ''}
          {' · '}{new Date(fs.validated_at).toLocaleTimeString()}
        </div>
      ) : pageUrl && confidence !== 'none' ? (
        <div className="sub">No fill recorded on this page yet — Scan this page, then Validate, and reopen.</div>
      ) : null}
      <label className="sub" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
        Status
        <select value={current} disabled={busy} onChange={(e) => choose(e.target.value as ApplicationStatus)}>
          {options.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {note && <div className="sub">{note}</div>}
    </div>
  )
}
