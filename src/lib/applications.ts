// ---------------------------------------------------------------------------
// Application log (Stage 6, 2026-09-07). THE job-application log, written from the
// extension through the hub outbox — one `applications` row per job per surface,
// upserted on (user_id, job_id, surface), so every event below lands on the same row:
//
//   drafted    the Tailor tab approved a draft (resume_document_id, and the cover
//              letter's documents row once it exists)
//   filled     the popup opened on the application page OF THE POSTING IT READ and found
//              the autofill's validation report for it (fill_stats, applied_url) —
//              recorded, never inferred: the report is what the filler measured there
//   submitted  the user pressed "I submitted" — submitted_at is set ONLY here; nothing
//              in this extension detects or performs a submit
//   the rest   the user's own funnel updates (screening, interview, offer, rejected,
//              withdrawn) from the same panel
//
// The status only moves forward on the automatic events; a user's choice sets it
// outright. The hub row is the record: a job this popup has never seen is read from the
// hub before its first event, so a wiped mirror never regresses a `submitted`. The local
// mirror (flashfiller_applications_v1) is what the panel renders between hub answers.
//
// Which posting is this page? The capture the Tailor tab made survives a popup reopen
// through a session store, and comes back only on the same application site (the same
// host, another host of the same company, or that company's tenant on a hosted ATS) and
// only when the page does not carry a different posting id (an ATS requisition id or a
// LinkedIn job id) than the capture — a second posting on the same tenant is never
// "this job", and neither is another tenant of the same vendor.
//
// Lives beside content/ — nothing here touches the fill, the validator or the page.
// ---------------------------------------------------------------------------

import type { ApplicationStatus } from '@contract/entities'
import { flushHubOutbox, getHubDeadLetters, hubQuery, hubUpsert } from '@/lib/hub'
import type { JobCapture } from '@/lib/job-capture'
import { atsReqIdFromUrl, urlKey } from '@/lib/job-dedupe'
import { loadValidationReports, type StoredValidationReport } from '@/lib/validation-report'

export const APPLICATIONS_KEY = 'flashfiller_applications_v1'
export const SESSION_CAPTURE_KEY = 'flashfiller_tailor_session_v1'
export const SESSION_CAPTURE_MAX_AGE_MS = 12 * 60 * 60 * 1000

/** The lifecycle, in the order the automatic events may advance it. */
export const STATUS_ORDER: ApplicationStatus[] = [
  'queued', 'drafted', 'filled', 'review', 'submitted', 'screening', 'interview', 'offer', 'rejected', 'withdrawn',
]
/** Statuses the user picks by hand on the panel (the automatic ones are never offered). */
export const USER_STATUSES: ApplicationStatus[] = ['review', 'submitted', 'screening', 'interview', 'offer', 'rejected', 'withdrawn']

/** What the validator measured on the page — its own verdicts, renamed for nobody. The entity's
 *  `human_reviewed` is NOT set by the extension: it has no signal that a human looked at a field
 *  (AutoApply's Review stop will have one). `wrong` is the validator's count, and stays called that. */
export interface FillStats {
  /** Every field the validator looked at. */
  total: number
  /** Verdict `ok` — filled with the expected answer. */
  filled: number
  /** Still empty: answerable (an answer was stored) + unanswered (nothing stored) — the human's share. */
  left: number
  /** Filled, but not with the expected answer — to check. */
  wrong: number
  missing_answerable: number
  missing_unanswered: number
  skipped: number
  /** File fields that received a document (the filename the page shows). */
  documents: string[]
  /** ISO 8601 — when the validator measured the page. */
  validated_at: string
  url: string
}

export type OutcomeStatus = 'sent' | 'queued' | 'dead' | 'error'

export interface ApplicationRecord {
  jobId: string
  title?: string | null
  company?: string | null
  status: ApplicationStatus
  appliedUrl?: string | null
  resumeDocumentId?: string | null
  coverLetterDocumentId?: string | null
  fillStats?: FillStats | null
  /** ISO 8601, set only by markSubmitted. */
  submittedAt?: string | null
  updatedAt: number
  /** What became of the last write. */
  lastOutcome?: OutcomeStatus | null
}

interface ApplicationsEnvelope {
  schemaVersion: number
  byJob: Record<string, ApplicationRecord>
}

export interface SessionCapture {
  capture: JobCapture | null
  jobId: string | null
  url: string
  host: string
  at: number
}

export type ApplicationEvent =
  | { kind: 'drafted'; jobId: string; resumeDocumentId?: string | null; coverLetterDocumentId?: string | null; title?: string | null; company?: string | null }
  | { kind: 'cover_letter'; jobId: string; coverLetterDocumentId: string | null }
  | { kind: 'filled'; jobId: string; fillStats: FillStats; appliedUrl: string }
  | { kind: 'status'; jobId: string; status: ApplicationStatus; submittedAt?: string | null }

// ---- the local mirror ---------------------------------------------------------------------

function isRecord(raw: unknown): raw is ApplicationRecord {
  if (typeof raw !== 'object' || raw === null) return false
  const r = raw as Record<string, unknown>
  return typeof r.jobId === 'string' && typeof r.status === 'string' && typeof r.updatedAt === 'number'
}

async function readEnvelope(): Promise<ApplicationsEnvelope> {
  // a read that fails yields an empty mirror — safe because the hub row is the record and a job the
  // mirror does not know is read back from the hub before its first event (recordNow)
  try {
    const result = await chrome.storage.local.get(APPLICATIONS_KEY)
    const raw = result[APPLICATIONS_KEY] as Partial<ApplicationsEnvelope> | undefined
    const byJob: Record<string, ApplicationRecord> = {}
    for (const [k, v] of Object.entries(raw?.byJob ?? {})) if (isRecord(v)) byJob[k] = v
    return { schemaVersion: 1, byJob }
  } catch {
    return { schemaVersion: 1, byJob: {} }
  }
}

async function writeEnvelope(env: ApplicationsEnvelope): Promise<void> {
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: env })
}

export async function loadApplications(): Promise<ApplicationRecord[]> {
  const env = await readEnvelope()
  return Object.values(env.byJob).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getApplication(jobId: string): Promise<ApplicationRecord | null> {
  return (await readEnvelope()).byJob[jobId] ?? null
}

export function statusRank(status: ApplicationStatus): number {
  const i = STATUS_ORDER.indexOf(status)
  return i < 0 ? 0 : i
}

/** The automatic events never move a status backwards; a user's choice does what it says. */
export function nextStatus(current: ApplicationStatus | null | undefined, wanted: ApplicationStatus, explicit: boolean): ApplicationStatus {
  if (explicit || !current) return wanted
  return statusRank(wanted) > statusRank(current) ? wanted : current
}

// ---- fill stats from the validator's own report ---------------------------------------------

export function fillStatsFromReport(report: StoredValidationReport): FillStats {
  const s = report.summary
  const documents = report.entries
    .filter((e) => String(e.kind).toLowerCase().includes('file') && typeof e.actual === 'string' && e.actual.trim())
    .map((e) => (e.actual as string).trim())
  return {
    total: report.entries.length,
    filled: s.ok,
    left: s.missingAnswerable + s.missingUnanswered,
    wrong: s.wrong,
    missing_answerable: s.missingAnswerable,
    missing_unanswered: s.missingUnanswered,
    skipped: s.skipped,
    documents,
    validated_at: new Date(report.at).toISOString(),
    url: report.url,
  }
}

// ---- writing through the hub ------------------------------------------------------------------

export interface ApplicationOutcome {
  status: OutcomeStatus
  note: string
  record: ApplicationRecord
}

interface HubApplicationRow {
  status?: string
  submitted_at?: string | null
  applied_url?: string | null
  resume_document_id?: string | null
  cover_letter_document_id?: string | null
  fill_stats?: FillStats | null
}

/** The hub's row for a job this popup has not seen — the record beats an empty mirror. Null when the
 *  hub is not reachable or has no row; the first event then starts the row. */
async function remoteRecord(jobId: string): Promise<ApplicationRecord | null> {
  try {
    const rows = await hubQuery<HubApplicationRow>('applications', { job_id: `eq.${jobId}`, surface: 'eq.extension' })
    const row = Array.isArray(rows) ? rows[0] : undefined
    if (!row || typeof row.status !== 'string') return null
    return {
      jobId, status: row.status as ApplicationStatus, submittedAt: row.submitted_at ?? null, appliedUrl: row.applied_url ?? null,
      resumeDocumentId: row.resume_document_id ?? null, coverLetterDocumentId: row.cover_letter_document_id ?? null,
      fillStats: row.fill_stats ?? null, updatedAt: Date.now(), lastOutcome: 'sent',
    }
  } catch {
    return null
  }
}

function hubRow(rec: ApplicationRecord, withStatus: boolean): Record<string, unknown> {
  // upsert on user_id,job_id,surface (the hub's default key): PostgREST merges every column sent, so
  // only what this record knows is sent — nulls are never written over a stored value, and the status
  // rides only when this event moved it (a link-only event never re-asserts a status)
  const row: Record<string, unknown> = { job_id: rec.jobId, surface: 'extension' }
  if (withStatus) row.status = rec.status
  if (rec.appliedUrl) row.applied_url = rec.appliedUrl
  if (rec.resumeDocumentId) row.resume_document_id = rec.resumeDocumentId
  if (rec.coverLetterDocumentId) row.cover_letter_document_id = rec.coverLetterDocumentId
  if (rec.fillStats) row.fill_stats = rec.fillStats
  if (rec.submittedAt) row.submitted_at = rec.submittedAt
  return row
}

let chain: Promise<unknown> = Promise.resolve()

/** One writer at a time: the mirror's read-modify-write and the once-per-report check share the queue. */
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work)
  chain = run.then(() => undefined, () => undefined)
  return run
}

/** Apply one event to the local record and upsert the row. Never throws; the outcome says what happened. */
export function recordApplication(event: ApplicationEvent): Promise<ApplicationOutcome> {
  return enqueue(() => recordNow(event))
}

async function recordNow(event: ApplicationEvent): Promise<ApplicationOutcome> {
  let rec: ApplicationRecord = { jobId: event.jobId, status: 'queued', updatedAt: 0 }
  try {
    const env = await readEnvelope()
    const prev = env.byJob[event.jobId] ?? (await remoteRecord(event.jobId))
    if (prev) rec = { ...prev }
    switch (event.kind) {
      case 'drafted':
        rec.status = nextStatus(prev?.status, 'drafted', false)
        if (event.resumeDocumentId) rec.resumeDocumentId = event.resumeDocumentId
        if (event.coverLetterDocumentId) rec.coverLetterDocumentId = event.coverLetterDocumentId
        if (event.title) rec.title = event.title
        if (event.company) rec.company = event.company
        break
      case 'cover_letter':
        if (event.coverLetterDocumentId) rec.coverLetterDocumentId = event.coverLetterDocumentId
        break
      case 'filled':
        rec.status = nextStatus(prev?.status, 'filled', false)
        rec.fillStats = event.fillStats
        rec.appliedUrl = event.appliedUrl
        break
      case 'status':
        rec.status = nextStatus(prev?.status, event.status, true)
        if (event.status === 'submitted') rec.submittedAt = event.submittedAt ?? new Date().toISOString()
        break
    }
    const withStatus = !prev || rec.status !== prev.status || event.kind === 'status'
    rec.updatedAt = Date.now()
    env.byJob[event.jobId] = rec
    await writeEnvelope(env)                  // first: the record survives the popup closing mid-flush

    let outcome: ApplicationOutcome
    try {
      const ref = await hubUpsert('applications', hubRow(rec, withStatus), undefined, { flush: false })
      const report = await flushHubOutbox()
      const stored = report.rows?.[ref]
      if (stored) {
        outcome = { status: 'sent', note: `Application logged (${rec.status}).`, record: rec }
      } else {
        const dead = (await getHubDeadLetters()).find((d) => d.ref === ref)
        outcome = dead
          ? { status: 'dead', note: `Application not logged — refused by the hub — ${dead.lastError ?? 'unknown'}`, record: rec }
          : { status: 'queued', note: `Application ${rec.status} — queued for the hub (${report.reason ?? 'not reachable'}).`, record: rec }
      }
    } catch (e) {
      outcome = { status: 'error', note: `Application ${rec.status} kept locally, not sent — ${e instanceof Error ? e.message : String(e)}`, record: rec }
    }
    rec.lastOutcome = outcome.status
    env.byJob[event.jobId] = rec
    await writeEnvelope(env)
    return outcome
  } catch (e) {
    return { status: 'error', note: `Application not logged — ${e instanceof Error ? e.message : String(e)}`, record: rec }
  }
}

/** The fill the validator measured on this page — recorded once per report (same validated_at = same
 *  fill); the check runs on the writer's queue, so two callers with one report make one write. */
export function recordFilled(jobId: string, report: StoredValidationReport): Promise<ApplicationOutcome | null> {
  return enqueue(async () => {
    const stats = fillStatsFromReport(report)
    const prev = (await readEnvelope()).byJob[jobId]
    if (prev?.fillStats?.validated_at === stats.validated_at && prev.fillStats.url === stats.url) return null
    return recordNow({ kind: 'filled', jobId, fillStats: stats, appliedUrl: report.url })
  })
}

/** The one place submitted_at is ever set: the user said so. */
export function markSubmitted(jobId: string, when: Date = new Date()): Promise<ApplicationOutcome> {
  return recordApplication({ kind: 'status', jobId, status: 'submitted', submittedAt: when.toISOString() })
}

export function setApplicationStatus(jobId: string, status: ApplicationStatus): Promise<ApplicationOutcome> {
  if (status === 'submitted') return markSubmitted(jobId)
  return recordApplication({ kind: 'status', jobId, status })
}

// ---- the page the popup is on -------------------------------------------------------------

/** The active tab's http(s) URL, or null (no tabs API, a chrome:// page, the options page). */
export async function activeTabUrl(): Promise<string | null> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const url = tabs[0]?.url
    return typeof url === 'string' && /^https?:/i.test(url) ? url : null
  } catch {
    return null
  }
}

function hostOf(url: string | null | undefined): string {
  try {
    return url ? new URL(url).hostname.toLowerCase() : ''
  } catch {
    return ''
  }
}

// ---- which site, which posting ----------------------------------------------------------------

/** Hosted ATS vendors whose tenant is the first host label (acme.wd5.myworkdayjobs.com). */
const TENANT_VENDORS = ['myworkdayjobs.com', 'myworkdaysite.com', 'icims.com', 'taleo.net', 'bamboohr.com', 'eightfold.ai', 'oraclecloud.com']
/** Job boards and path-tenant ATSes: many companies on one host — only the exact host is "the same site". */
const SHARED_HOSTS = ['linkedin.com', 'greenhouse.io', 'lever.co', 'smartrecruiters.com', 'ashbyhq.com', 'jobvite.com', 'workable.com',
  'successfactors.com', 'ultipro.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com']
/** Public suffixes of two labels: the registrable domain is the three last labels there. */
const TWO_LABEL_SUFFIXES = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.in', 'co.jp', 'co.kr',
  'com.br', 'com.mx', 'com.sg', 'com.hk', 'co.za', 'com.ar', 'com.tr', 'co.il', 'com.my', 'com.ph', 'com.cn', 'com.tw'])

export type SiteIdentity =
  | { kind: 'tenant'; vendor: string; tenant: string }
  | { kind: 'shared'; host: string }
  | { kind: 'domain'; domain: string }

function underVendor(host: string, vendors: string[]): string | null {
  return vendors.find((v) => host === v || host.endsWith('.' + v)) ?? null
}

/** What a hostname is, for the purpose of "is this the same application site". */
export function siteIdentity(hostname: string): SiteIdentity | null {
  const host = hostname.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
  if (!host) return null
  const shared = underVendor(host, SHARED_HOSTS)
  if (shared) return { kind: 'shared', host }
  const vendor = underVendor(host, TENANT_VENDORS)
  if (vendor) {
    const tenant = host === vendor ? '' : host.slice(0, -(vendor.length + 1)).split('.')[0]
    return tenant ? { kind: 'tenant', vendor, tenant } : { kind: 'shared', host }
  }
  const parts = host.split('.')
  const n = TWO_LABEL_SUFFIXES.has(parts.slice(-2).join('.')) ? 3 : 2
  return { kind: 'domain', domain: parts.slice(-n).join('.') }
}

/** The same host; two hosts of one company (careers.acme.com ~ www.acme.com — the registrable domain,
 *  co.uk-aware); the company's tenant on a hosted ATS (careers.acme.com ~ acme.wd5.myworkdayjobs.com —
 *  the company label is the tenant); one tenant on any shard. Never two tenants of one vendor, never
 *  two hosts of a job board — and the posting-id check below does the rest on a shared host. */
export function sameApplicationSite(a: string, b: string): boolean {
  const x = siteIdentity(a)
  const y = siteIdentity(b)
  if (!x || !y) return false
  if (a.toLowerCase() === b.toLowerCase()) return true
  if (x.kind === 'shared' || y.kind === 'shared') return x.kind === 'shared' && y.kind === 'shared' && x.host === y.host
  if (x.kind === 'domain' && y.kind === 'domain') return x.domain === y.domain
  if (x.kind === 'tenant' && y.kind === 'tenant') return x.vendor === y.vendor && x.tenant === y.tenant
  const domain = (x.kind === 'domain' ? x : y) as { kind: 'domain'; domain: string }
  const tenant = (x.kind === 'tenant' ? x : y) as { kind: 'tenant'; tenant: string }
  return domain.domain.split('.')[0] === tenant.tenant
}

/** The posting id a URL carries when the site puts one there: an ATS requisition id, or a LinkedIn job id. */
export function postingIdInUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const req = atsReqIdFromUrl(url)
  if (req) return req.toLowerCase()
  const key = urlKey(url)
  return key && key.startsWith('li:') ? key : null
}

/** The id the capture knows for its posting: the ATS requisition id it read, else the id in its own URL. */
function knownPostingId(capture: JobCapture | null | undefined, url: string): string | null {
  const req = capture?.atsReqId
  if (req) return String(req).toLowerCase()
  return postingIdInUrl(capture?.sourceUrl) ?? postingIdInUrl(url)
}

// ---- the session capture: the posting the Tailor tab read, across a popup reopen ----------------

function sessionArea(): chrome.storage.StorageArea {
  const s = (chrome.storage as { session?: chrome.storage.StorageArea }).session
  return s ?? chrome.storage.local
}

/** Remember the posting read on this page; nothing is kept without a page to come back to. */
export async function saveSessionCapture(capture: JobCapture | null, jobId: string | null, url: string | null): Promise<void> {
  const host = hostOf(url)
  if (!host) return
  const entry: SessionCapture = { capture, jobId, url: url as string, host, at: Date.now() }
  try {
    await sessionArea().set({ [SESSION_CAPTURE_KEY]: entry })
  } catch {
    // storage unavailable: the capture lives in popup state only, as before Stage 6
  }
}

export async function clearSessionCapture(): Promise<void> {
  try {
    await sessionArea().remove(SESSION_CAPTURE_KEY)
  } catch {
    // nothing to clear
  }
}

/** The capture made recently for THIS page's posting — the same application site, no other posting id
 *  on the page, under twelve hours old; null when the popup is somewhere else (or on no page at all). */
export async function loadSessionCapture(activeUrl: string | null, now: number = Date.now()): Promise<SessionCapture | null> {
  try {
    const here = hostOf(activeUrl)
    if (!here) return null
    const result = await sessionArea().get(SESSION_CAPTURE_KEY)
    const raw = result[SESSION_CAPTURE_KEY] as Partial<SessionCapture> | undefined
    if (!raw || typeof raw.url !== 'string' || typeof raw.at !== 'number') return null
    if (now - raw.at > SESSION_CAPTURE_MAX_AGE_MS) return null
    const there = (typeof raw.host === 'string' && raw.host) || hostOf(raw.url)
    if (!there || !sameApplicationSite(here, there)) return null
    const capture = (raw.capture as JobCapture | null) ?? null
    const pageId = postingIdInUrl(activeUrl)
    const knownId = knownPostingId(capture, raw.url)
    if (pageId && knownId && pageId !== knownId) return null       // the same site, a different posting
    return { capture, jobId: typeof raw.jobId === 'string' ? raw.jobId : null, url: raw.url, host: there, at: raw.at }
  } catch {
    return null
  }
}

/** How sure the panel can be that the page it is on belongs to the job it shows: `ats` when the page
 *  carries the posting's own id, `session` when it is only the same site, `none` otherwise. */
export type LinkConfidence = 'ats' | 'session' | 'none'

export function linkForPage(activeUrl: string | null, session: SessionCapture | null): { jobId: string | null; confidence: LinkConfidence } {
  if (!session?.jobId) return { jobId: null, confidence: 'none' }
  const pageId = postingIdInUrl(activeUrl)
  const knownId = knownPostingId(session.capture, session.url)
  if (pageId && knownId) {
    return pageId === knownId ? { jobId: session.jobId, confidence: 'ats' } : { jobId: null, confidence: 'none' }
  }
  return { jobId: session.jobId, confidence: 'session' }
}

/** The validator's report for this page: the exact URL when it has one, else the newest report on the
 *  same application site (the ledger is keyed by the FRAME's URL — an iframe-hosted form, a wizard step —
 *  which the popup's tab URL need not equal) that is under twelve hours old and does not carry another
 *  posting's id than the session's. Another posting's fill is never this job's. */
export async function reportForPage(url: string | null, session: SessionCapture | null = null, now: number = Date.now()): Promise<StoredValidationReport | null> {
  if (!url) return null
  const reports = await loadValidationReports()
  const exact = reports.find((r) => r.url === url)
  if (exact) return exact
  const host = hostOf(url)
  if (!host) return null
  const knownId = session ? knownPostingId(session.capture, session.url) : null
  const onSite = reports.filter((r) => {
    if (now - r.at > SESSION_CAPTURE_MAX_AGE_MS) return false
    const rh = hostOf(r.url)
    if (!rh || !sameApplicationSite(host, rh)) return false
    const rid = postingIdInUrl(r.url)
    return !(rid && knownId && rid !== knownId)
  })
  onSite.sort((a, b) => b.at - a.at)
  return onSite[0] ?? null
}
