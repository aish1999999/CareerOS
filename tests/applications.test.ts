import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HubBatchRequest } from '@contract/types'
import type { FieldValidation, ValidationSummary } from '@/content/validate'
import {
  activeTabUrl, clearSessionCapture, fillStatsFromReport, getApplication, linkForPage, loadApplications, loadSessionCapture,
  markSubmitted, nextStatus, postingIdInUrl, recordApplication, recordFilled, reportForPage, sameApplicationSite,
  saveSessionCapture, setApplicationStatus, siteIdentity, SESSION_CAPTURE_MAX_AGE_MS,
} from '@/lib/applications'
import { getHubDeadLetters, getHubOutbox } from '@/lib/hub'
import type { JobCapture } from '@/lib/job-capture'
import { saveValidationReport, type StoredValidationReport } from '@/lib/validation-report'
import { setTailorConfig } from '@/lib/tailor'
import { resetChromeMock } from './setup'

// Stage 6 — the application log: one row per job per surface through the outbox; drafted on
// approve, filled from the validator's own report (only on the posting's own page), submitted only
// when the user says so; the hub row is the record.

const JOB = 'a1b2c3d4-0000-4000-8000-000000000001'
const JOB2 = 'a1b2c3d4-0000-4000-8000-000000000002'
const POSTING = 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Houston/IE_R-123'
const APPLY = 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Houston/IE_R-123/apply'
const OTHER_REQ = 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/Dallas/IE_R-999/apply'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function batchOk(req: HubBatchRequest): Response {
  return jsonResponse(200, {
    ok: true,
    results: req.ops.map((op) => ({ clientRef: op.clientRef, ok: true, status: 200, row: { id: 'app-' + op.clientRef, ...(op.body ?? {}) }, error: null })),
  })
}

/** The hub double: /db/batch accepts every op; a GET /db/<table> answers with `rows`. */
function hubUp(fetchMock: ReturnType<typeof vi.fn>, rows: unknown[] = []) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (String(url).endsWith('/db/batch')) return batchOk(JSON.parse(String(init?.body)) as HubBatchRequest)
    return jsonResponse(200, { rows })
  })
}

function batchCalls(fetchMock: ReturnType<typeof vi.fn>): [string, RequestInit][] {
  return fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/db/batch')) as [string, RequestInit][]
}

function lastBatch(fetchMock: ReturnType<typeof vi.fn>): HubBatchRequest {
  const call = batchCalls(fetchMock).at(-1)
  expect(call).toBeDefined()
  return JSON.parse(String((call as [string, RequestInit])[1].body)) as HubBatchRequest
}

function entry(kind: string, verdict: FieldValidation['verdict'], actual?: string): FieldValidation {
  return { fieldId: 'f', label: kind, kind: kind as FieldValidation['kind'], verdict, actual, required: false,
    normalizedQuestion: kind, options: [], sectionContext: '', eeoLike: false, consentLike: false }
}

function report(url = APPLY, at = 1_700_000_000_000): StoredValidationReport {
  const entries = [
    entry('text', 'ok'), entry('text', 'ok'), entry('select', 'ok'), entry('text', 'wrong'),
    entry('text', 'missing-answerable'), entry('textarea', 'missing-unanswered'), entry('textarea', 'missing-unanswered'),
    entry('file', 'ok', 'Candidate_Acme_Industrial_Engineer.docx'), entry('checkbox', 'skipped'),
  ]
  const summary: ValidationSummary = { ok: 4, wrong: 1, missingAnswerable: 1, missingUnanswered: 2, skipped: 1 }
  return { url, at, summary, entries }
}

const WORKDAY = { origin: 'page', source: 'ats_portal', ats: 'workday', title: 'IE', company: 'Acme', atsReqId: 'R-123', sourceUrl: POSTING } as unknown as JobCapture
const LINKEDIN = { origin: 'page', source: 'linkedin', ats: 'unknown', title: 'IE', company: 'Acme', atsReqId: null,
  sourceUrl: 'https://www.linkedin.com/jobs/view/4420761539/' } as unknown as JobCapture

describe('the application log', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it("turns the validator report into fill stats: its own verdicts, the documents handed, no 'human_reviewed' it cannot measure", () => {
    const fs = fillStatsFromReport(report())
    expect(fs).toMatchObject({ total: 9, filled: 4, left: 3, wrong: 1, missing_answerable: 1, missing_unanswered: 2, skipped: 1 })
    expect(fs).not.toHaveProperty('human_reviewed')
    expect(fs.documents).toEqual(['Candidate_Acme_Industrial_Engineer.docx'])
    expect(fs.validated_at).toBe('2023-11-14T22:13:20.000Z')
  })

  it('the status only moves forward on automatic events; a user choice sets it outright', () => {
    expect(nextStatus(null, 'drafted', false)).toBe('drafted')
    expect(nextStatus('filled', 'drafted', false)).toBe('filled')
    expect(nextStatus('submitted', 'filled', false)).toBe('submitted')
    expect(nextStatus('submitted', 'rejected', true)).toBe('rejected')
    expect(nextStatus('offer', 'review', true)).toBe('review')
  })

  it('drafted → filled → submitted land on one row, upserted on the hub key, with only what is known', async () => {
    hubUp(fetchMock)
    const drafted = await recordApplication({ kind: 'drafted', jobId: JOB, resumeDocumentId: 'doc-1', title: 'Industrial Engineer', company: 'Acme' })
    expect(drafted.status).toBe('sent')
    let batch = lastBatch(fetchMock)
    expect(batch.ops[0]).toMatchObject({ op: 'upsert', table: 'applications', onConflict: null })
    expect(batch.ops[0].body).toEqual({ job_id: JOB, surface: 'extension', status: 'drafted', resume_document_id: 'doc-1' })

    const filled = await recordFilled(JOB, report())
    expect(filled?.status).toBe('sent')
    batch = lastBatch(fetchMock)
    expect(batch.ops[0].body).toMatchObject({ job_id: JOB, status: 'filled', resume_document_id: 'doc-1', applied_url: APPLY })
    expect((batch.ops[0].body as Record<string, unknown>).fill_stats).toMatchObject({ total: 9, filled: 4, left: 3 })
    expect(batch.ops[0].body).not.toHaveProperty('submitted_at')
    // the same report again is not a second fill
    expect(await recordFilled(JOB, report())).toBeNull()

    const before = batchCalls(fetchMock).length
    const sub = await markSubmitted(JOB, new Date('2026-09-07T15:04:05Z'))
    expect(sub.status).toBe('sent')
    batch = lastBatch(fetchMock)
    expect(batch.ops[0].body).toMatchObject({ status: 'submitted', submitted_at: '2026-09-07T15:04:05.000Z' })
    expect(batchCalls(fetchMock).length).toBe(before + 1)

    // a later fill never downgrades a submitted application — and does not even re-send the status
    const later = await recordFilled(JOB, report(undefined, 1_700_000_500_000))
    expect(later?.record.status).toBe('submitted')
    expect(lastBatch(fetchMock).ops[0].body).not.toHaveProperty('status')
    // a user's status change does what it says
    const rejected = await setApplicationStatus(JOB, 'rejected')
    expect(rejected.record.status).toBe('rejected')
    expect(rejected.record.submittedAt).toBe('2026-09-07T15:04:05.000Z')
    expect(lastBatch(fetchMock).ops[0].body).toMatchObject({ status: 'rejected' })
    const apps = await loadApplications()
    expect(apps).toHaveLength(1)
    expect(apps[0]).toMatchObject({ jobId: JOB, status: 'rejected', title: 'Industrial Engineer', company: 'Acme', lastOutcome: 'sent' })
    expect(await getHubOutbox()).toEqual([])
  })

  it('the hub row is the record: a job the mirror never saw is read back first, so nothing regresses it', async () => {
    hubUp(fetchMock, [{ status: 'submitted', submitted_at: '2026-09-01T00:00:00+00:00', resume_document_id: 'doc-9' }])
    const linked = await recordApplication({ kind: 'cover_letter', jobId: JOB2, coverLetterDocumentId: 'cl-1' })
    expect(linked.status).toBe('sent')
    expect(linked.record.status).toBe('submitted')
    expect(lastBatch(fetchMock).ops[0].body).toEqual({
      job_id: JOB2, surface: 'extension', resume_document_id: 'doc-9', cover_letter_document_id: 'cl-1', submitted_at: '2026-09-01T00:00:00+00:00',
    })
    const drafted = await recordApplication({ kind: 'drafted', jobId: JOB2, resumeDocumentId: 'doc-10' })
    expect(drafted.record.status).toBe('submitted')
    expect(lastBatch(fetchMock).ops[0].body).not.toHaveProperty('status')
    expect((await getApplication(JOB2))?.submittedAt).toBe('2026-09-01T00:00:00+00:00')
  })

  it('offline: the record is kept locally and the row waits in the outbox; a refused row is a dead letter', async () => {
    fetchMock.mockRejectedValue(new TypeError('connect ECONNREFUSED'))
    const out = await recordApplication({ kind: 'drafted', jobId: JOB, resumeDocumentId: 'doc-1' })
    expect(out.status).toBe('queued')
    expect(out.note).toMatch(/queued for the hub/)
    expect((await getApplication(JOB))?.status).toBe('drafted')
    expect(await getHubOutbox()).toHaveLength(1)
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (!String(url).endsWith('/db/batch')) return jsonResponse(200, { rows: [] })
      const req = JSON.parse(String(init?.body)) as HubBatchRequest
      return jsonResponse(207, { ok: false, results: req.ops.map((op) => ({ clientRef: op.clientRef, ok: false, status: 400, row: null, error: 'applications: job_id must be a uuid' })) })
    })
    const dead = await markSubmitted('not-a-uuid')
    expect(dead.status).toBe('dead')
    expect(dead.note).toMatch(/refused by the hub/)
    expect(await getHubDeadLetters()).not.toHaveLength(0)
  })

  it('knows which hosts are one application site: a company, its tenant on a hosted ATS, never two tenants or two boards', () => {
    expect(siteIdentity('acme.wd5.myworkdayjobs.com')).toEqual({ kind: 'tenant', vendor: 'myworkdayjobs.com', tenant: 'acme' })
    expect(siteIdentity('jobs.acme.co.uk')).toEqual({ kind: 'domain', domain: 'acme.co.uk' })
    expect(siteIdentity('www.linkedin.com')).toEqual({ kind: 'shared', host: 'linkedin.com' })
    expect(siteIdentity('')).toBeNull()
    const same = (a: string, b: string) => sameApplicationSite(a, b)
    expect(same('careers.acme.com', 'www.acme.com')).toBe(true)
    expect(same('careers.acme.com', 'acme.wd5.myworkdayjobs.com')).toBe(true)          // the company's own tenant
    expect(same('acme.wd5.myworkdayjobs.com', 'acme.wd1.myworkdayjobs.com')).toBe(true)  // one tenant, any shard
    expect(same('acme.wd5.myworkdayjobs.com', 'globex.wd1.myworkdayjobs.com')).toBe(false)
    expect(same('careers.acme.com', 'globex.wd5.myworkdayjobs.com')).toBe(false)
    expect(same('jobs.acme.co.uk', 'www.acme.co.uk')).toBe(true)
    expect(same('jobs.acme.co.uk', 'careers.beta.co.uk')).toBe(false)
    expect(same('www.linkedin.com', 'linkedin.com')).toBe(true)
    expect(same('boards.greenhouse.io', 'job-boards.greenhouse.io')).toBe(false)
    expect(same('', 'x.com')).toBe(false)
    expect(postingIdInUrl(APPLY)).toBe('r-123')
    expect(postingIdInUrl('https://www.linkedin.com/jobs/search/?currentJobId=4420761539')).toBe('li:4420761539')
    expect(postingIdInUrl('https://careers.acme.com/apply/123')).toBeNull()
  })

  it("the page capture survives a reopen on the posting's own site for twelve hours — never on another posting's page", async () => {
    await saveSessionCapture(WORKDAY, JOB, POSTING)
    const same = await loadSessionCapture(APPLY)
    expect(same?.jobId).toBe(JOB)
    expect(linkForPage(APPLY, same)).toEqual({ jobId: JOB, confidence: 'ats' })
    expect(await loadSessionCapture('https://jobs.other.com/x')).toBeNull()
    expect(await loadSessionCapture(null)).toBeNull()                                   // no page: nothing to key on
    expect(await loadSessionCapture('https://acme.wd5.myworkdayjobs.com/x', Date.now() + SESSION_CAPTURE_MAX_AGE_MS + 1)).toBeNull()
    expect(await loadSessionCapture(OTHER_REQ)).toBeNull()                              // the same tenant, another requisition
    expect(await loadSessionCapture('https://globex.wd1.myworkdayjobs.com/x')).toBeNull()  // another tenant of the vendor
    const hop = await loadSessionCapture('https://careers.acme.com/apply/123')          // the company's own site
    expect(hop?.jobId).toBe(JOB)
    expect(linkForPage('https://careers.acme.com/apply/123', hop)).toEqual({ jobId: JOB, confidence: 'session' })

    await saveSessionCapture(LINKEDIN, JOB2, 'https://www.linkedin.com/jobs/view/4420761539/')
    const li = await loadSessionCapture('https://www.linkedin.com/jobs/search/?currentJobId=4420761539')
    expect(li?.jobId).toBe(JOB2)
    expect(linkForPage('https://www.linkedin.com/jobs/search/?currentJobId=4420761539', li)).toEqual({ jobId: JOB2, confidence: 'ats' })
    expect(await loadSessionCapture('https://www.linkedin.com/jobs/view/4420761540/')).toBeNull()   // another posting on the board

    await clearSessionCapture()
    await saveSessionCapture(WORKDAY, JOB, null)                                        // no page: nothing is kept
    expect(await loadSessionCapture(APPLY)).toBeNull()
    expect(linkForPage('https://x', null)).toEqual({ jobId: null, confidence: 'none' })
    expect(await activeTabUrl()).toBeNull()                                              // no tabs API in the test double
  })

  it("finds the report for a page by exact URL, else the newest on the same site under twelve hours — never another posting's", async () => {
    hubUp(fetchMock)
    const now = 1_700_000_200_000
    await saveValidationReport(report(`${APPLY}/step-2`, 1_700_000_100_000))
    await saveValidationReport(report(`${APPLY}/step-1`, 1_700_000_000_000))
    await saveValidationReport(report(OTHER_REQ, 1_700_000_150_000))                 // newer, but requisition R-999
    await saveSessionCapture(WORKDAY, JOB, POSTING)
    const session = await loadSessionCapture(APPLY)
    expect((await reportForPage(`${APPLY}/step-2`, session, now))?.url).toMatch(/step-2$/)
    expect((await reportForPage(APPLY, session, now))?.url).toMatch(/step-2$/)
    expect(await reportForPage('https://other.example.com/apply', session, now)).toBeNull()
    expect(await reportForPage(APPLY, session)).toBeNull()                            // all of them older than twelve hours by now
    expect(await reportForPage(null, session, now)).toBeNull()

    const chosen = (await reportForPage(APPLY, session, now)) as StoredValidationReport
    const [a, b] = await Promise.all([recordFilled(JOB, chosen), recordFilled(JOB, chosen)])   // one report, one write
    expect([a, b].filter(Boolean)).toHaveLength(1)
    expect(batchCalls(fetchMock)).toHaveLength(1)
    const out = a ?? b
    expect(out?.record.fillStats?.documents).toEqual(['Candidate_Acme_Industrial_Engineer.docx'])
    expect(out?.record.appliedUrl).toMatch(/step-2$/)
  })
})
