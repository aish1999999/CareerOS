import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HubBatchRequest } from '@contract/types'
import {
  captureActiveTabPost, checkComment, countWords, draftComment, getCommentRecord, getCommentSettings,
  loadComments, recordPosted, postUrl, readPostDocument, rememberTake, saveComment, setCommentSettings,
  POST_MIRROR_MIN_WORDS, type LinkedInPost,
} from '@/lib/comments'
import { getHubOutbox } from '@/lib/hub'
import { setTailorConfig } from '@/lib/tailor'
import { resetChromeMock } from './setup'

// Stage 9 — the comments model layer. The human opens a post, presses Read, types his view, presses
// Draft once (the only spend), edits, copies, posts it on LinkedIn HIMSELF, and then presses "I
// posted it". Nothing here posts, clicks or watches anything on LinkedIn, and `posted` is true only
// because he said so.
//
// Bob's rule (2026-09-07) is the hub's: mirror the post's register, carry the whole take. There is
// no length cap, no banned-phrase list and no flattery check anywhere — he was offered those and
// chose this instead — so this file must not test for them either.

const ACTIVITY = '7123456789012345678'
const CANONICAL = `https://www.linkedin.com/feed/update/urn:li:activity:${ACTIVITY}`
const SHARE_LINK = `https://www.linkedin.com/posts/priya-menon-1a2b3c_seal-plan-activity-${ACTIVITY}-AbCd/`

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** The hub double: /db/batch accepts every op and echoes a stored row with an id. */
function hubUp(fetchMock: ReturnType<typeof vi.fn>, routes: Record<string, unknown> = {}) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const path = String(url).replace('http://127.0.0.1:8765', '')
    if (path === '/db/batch') {
      const req = JSON.parse(String(init?.body)) as HubBatchRequest
      return jsonResponse(200, {
        ok: true,
        results: req.ops.map((op) => ({
          clientRef: op.clientRef, ok: true, status: 200, error: null,
          row: { id: op.id ?? `row-${op.clientRef}`, ...(op.body ?? {}) },
        })),
      })
    }
    for (const [route, body] of Object.entries(routes)) if (path === route || path.startsWith(`${route}?`)) return jsonResponse(200, body)
    return jsonResponse(404, { error: `no route ${path}` })
  })
}

function paths(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((c) => String(c[0]).replace('http://127.0.0.1:8765', ''))
}

function lastBatch(fetchMock: ReturnType<typeof vi.fn>): HubBatchRequest {
  const call = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/db/batch')).at(-1)
  expect(call).toBeDefined()
  return JSON.parse(String((call as [string, RequestInit])[1].body)) as HubBatchRequest
}

function lastOp(fetchMock: ReturnType<typeof vi.fn>) {
  return lastBatch(fetchMock).ops[0]
}

function lastBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return (lastOp(fetchMock).body ?? {}) as Record<string, unknown>
}

/** The active tab, which only exists when the test says so — no tab is a refusal, not a crash. */
function stubTab(url: string | null, page?: { html: string; url?: string; title?: string }) {
  const c = globalThis.chrome as unknown as Record<string, unknown>
  c.tabs = { query: async () => (url === null ? [] : [{ id: 7, url }]) }
  c.scripting = { executeScript: async () => [{ frameId: 0, result: page ? { top: true, url: url ?? '', title: '', ...page } : null }] }
}

function clearTab() {
  const c = globalThis.chrome as unknown as Record<string, unknown>
  delete c.tabs
  delete c.scripting
}

const LONG_POST = 'We finally rewrote the seal plan for the hot oil pumps after three failures in one quarter, and the difference is that the flush line is now instrumented rather than assumed to be working by whoever walked past it last.'

const POST: LinkedInPost = {
  postUrl: CANONICAL, activityId: ACTIVITY, author: 'Priya Menon',
  authorUrl: 'https://www.linkedin.com/in/priya-menon', text: LONG_POST,
  words: countWords(LONG_POST), thin: false, thinWhy: null, hasImage: false, layers: {},
}

const TAKE = 'Instrumenting the flush line is the whole point — an assumed flush is just a seal failure you have not been told about yet.'

describe('the comment panel’s settings', () => {
  beforeEach(() => resetChromeMock())

  it('keeps a half-typed take across the popup closing, and never breaks on an unreadable store', async () => {
    // WHY THIS EXISTS: reading the post means clicking the page behind the popup, which closes the
    // popup. The take must survive that, or the panel is unusable.
    expect(await getCommentSettings()).toEqual({ lastTake: '' })
    const saved = await rememberTake('Instrumenting the flush line is')
    expect(saved.status).toBe('sent')
    expect((await getCommentSettings()).lastTake).toBe('Instrumenting the flush line is')
    await setCommentSettings({ lastTake: TAKE })
    expect((await getCommentSettings()).lastTake).toBe(TAKE)
  })
})

describe('reading the post page', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    clearTab()
  })

  it('canonicalises the permalink, so one post is one row however he reached it', () => {
    expect(postUrl(SHARE_LINK)).toEqual({ canonical: CANONICAL, activityId: ACTIVITY })
    expect(postUrl(`${CANONICAL}/`)?.canonical).toBe(CANONICAL)
    expect(postUrl(`https://www.linkedin.com/feed/update/urn%3Ali%3Aactivity%3A${ACTIVITY}/`)?.canonical).toBe(CANONICAL)
    expect(postUrl(`https://in.linkedin.com/feed/update/urn:li:activity:${ACTIVITY}?utm_source=share`)?.canonical).toBe(CANONICAL)
    expect(postUrl('https://www.linkedin.com/feed/update/urn:li:ugcPost:999/')?.canonical)
      .toBe('https://www.linkedin.com/feed/update/urn:li:ugcPost:999')
    // a /posts/ link with no activity id still names one post
    expect(postUrl('https://www.linkedin.com/posts/priya-menon_hello')).toEqual({
      canonical: 'https://www.linkedin.com/posts/priya-menon_hello', activityId: null,
    })
    // not one post: the feed, a person, a job, and a look-alike host
    expect(postUrl('https://www.linkedin.com/feed/')).toBeNull()
    expect(postUrl('https://www.linkedin.com/in/priya-menon')).toBeNull()
    expect(postUrl('https://www.linkedin.com/jobs/view/4420761539/')).toBeNull()
    expect(postUrl(`https://linkedin.com.evil.example/feed/update/urn:li:activity:${ACTIVITY}`)).toBeNull()
    expect(postUrl(null)).toBeNull()
  })

  it('refuses a tab that is not a LinkedIn post, and names the page it wanted', async () => {
    stubTab('https://www.google.com/search?q=seal+plan')
    const off = await captureActiveTabPost()
    expect(off.status).toBe('error')
    expect(off.note).toMatch(/linkedin\.com\/(posts|feed\/update)/)
    expect(off.note).toContain('www.google.com')                        // what it found, not just what it wanted
    expect(off.post).toBeNull()
    expect(off.url).toBe('https://www.google.com/search?q=seal+plan')

    // LinkedIn, but not one post: the feed is a page of many, and a profile is the outreach panel's
    for (const notAPost of ['https://www.linkedin.com/feed/', 'https://www.linkedin.com/in/priya-menon/']) {
      stubTab(notAPost)
      const refused = await captureActiveTabPost()
      expect(refused.status).toBe('error')
      expect(refused.post).toBeNull()
      expect(refused.note).toMatch(/linkedin\.com\/(posts|feed\/update)/)
    }

    stubTab(null)
    expect((await captureActiveTabPost()).status).toBe('error')

    clearTab()                                                          // no tabs API at all
    const broken = await captureActiveTabPost()
    expect(broken.status).toBe('error')
    expect(broken.post).toBeNull()

    expect(paths(fetchMock)).toEqual([])                                // a refusal costs no request
  })

  it('reads the post once, on the press, with the author and the text the page itself states', async () => {
    const html = `<html><head><title>Priya Menon on LinkedIn: we rewrote the seal plan | 12 comments</title>
      <script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org', '@type': 'DiscussionForumPosting',
        author: { '@type': 'Person', name: 'Priya Menon', url: 'https://www.linkedin.com/in/priya-menon/' },
        articleBody: LONG_POST,
      })}</script></head><body></body></html>`
    stubTab(SHARE_LINK, { html, url: SHARE_LINK, title: 'Priya Menon on LinkedIn: we rewrote the seal plan | 12 comments' })

    const read = await captureActiveTabPost()
    expect(read.status).toBe('sent')
    expect(read.pageTitle).toMatch(/on LinkedIn/)
    expect(read.post).toMatchObject({
      postUrl: CANONICAL, activityId: ACTIVITY, author: 'Priya Menon',
      authorUrl: 'https://www.linkedin.com/in/priya-menon', text: LONG_POST, thin: false, thinWhy: null,
    })
    expect(read.post?.words).toBeGreaterThanOrEqual(POST_MIRROR_MIN_WORDS)
    // The post adapter is the default reader, so it is the layer that supplied these. That matters
    // beyond provenance: only the adapter strips the comment threads before reading the body, and
    // only the adapter decides `truncated` and `isImageOnly` — the two verdicts the deferred vision
    // path rests on. A page read by the metadata alone still answers, one layer worse.
    expect(read.post?.layers).toMatchObject({ text: 'adapter', author: 'adapter' })
    // ONE injected read, and nothing on LinkedIn is touched: no click, no like, no post
    expect(paths(fetchMock)).toEqual([])

    // an adapter, when one lands, is handed in — and one that throws never loses the read
    const angry = await captureActiveTabPost(() => { throw new Error('post adapter blew up') })
    expect(angry.status).toBe('error')
    expect(angry.note).toMatch(/post adapter blew up/)
    expect(angry.post?.text).toBe(LONG_POST)
  })

  it('a picture post is not a failure — it says so and asks for the text, because vision is deferred', async () => {
    const html = '<html><head><title>Priya Menon on LinkedIn: our new plant | 4 comments</title></head>'
      + '<body><article><img src="photo.jpg"></article></body></html>'
    stubTab(CANONICAL, { html, url: CANONICAL, title: 'Priya Menon on LinkedIn: our new plant | 4 comments' })

    const read = await captureActiveTabPost()
    expect(read.status).toBe('sent')                                    // the capture WORKED …
    expect(read.post?.thin).toBe(true)                                  // … the page just had little to read
    expect(read.post?.hasImage).toBe(true)
    expect(read.post?.thinWhy).toMatch(/picture or a video/)
    expect(read.post?.thinWhy).toMatch(/paste or type/)
    expect(read.note).toBe(read.post?.thinWhy)
    // nothing was guessed about what the picture said
    expect(read.post?.text).toBe('our new plant')
    expect(countWords(read.post?.text)).toBeLessThan(POST_MIRROR_MIN_WORDS)
  })

  it('the structural reader is the floor under an adapter, not a second one', () => {
    const doc = new DOMParser().parseFromString(
      `<html><head><meta property="og:description" content="${LONG_POST}"></head>`
      + '<body><article><nav>Feed  My Network</nav><p>ignored, shorter</p></article></body></html>', 'text/html')
    const read = readPostDocument(doc, CANONICAL)
    // the post's own container is preferred over og:description, which LinkedIn truncates
    expect(read.text).toBe('ignored, shorter')
    expect(read.layers).toMatchObject({ text: 'page' })
    expect(read.text).not.toMatch(/My Network/)                         // page furniture is not the post
    expect(read.activityId).toBe(ACTIVITY)
  })
})

describe('the hub’s comment routes', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('check passes the take and the post through, free, and reports the hub’s two refusals', async () => {
    hubUp(fetchMock, {
      '/comments/check': {
        ok: false, text: 'Great post!', chars: 11,
        reasons: [{ code: 'take_dropped', detail: 'your take is 20% in the comment — it leaves out instrumented, flush', fix: 'the comment should revolve around your whole point, not part of it' }],
        register: { post: { level: 'mixed', wordsPerSentence: 38, longWordShare: 0.1, words: 40, sentences: 1, acronyms: 0, numbers: 0, score: 1.2 }, comment: { level: 'plain', wordsPerSentence: 2, longWordShare: 0, words: 2, sentences: 1, acronyms: 0, numbers: 0, score: 0.05 } },
        coverage: { terms: ['instrumented', 'flush'], carried: [], dropped: ['flush', 'instrumented'], share: 0.2 },
      },
    })
    const out = await checkComment({ text: 'Great post!', take: TAKE, postText: LONG_POST })
    expect(out.status).toBe('sent')                                     // the call worked …
    expect(out.check?.ok).toBe(false)                                   // … and the comment is refused
    expect(out.note).toMatch(/revolve around your whole point/)

    const body = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))
    expect(body).toEqual({ text: 'Great post!', take: TAKE, postText: LONG_POST })
    expect(fetchMock.mock.calls.at(-1)?.[1]?.headers).toMatchObject({ 'X-Tailor-Token': 'tok' })
    expect(paths(fetchMock)).toEqual(['/comments/check'])               // free: one call, no batch, no draft
  })

  it('draft spends only on the press, and a 503 is a sentence rather than a thrown error', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(503, { error: 'no ANTHROPIC_API_KEY in apps/mapper/.env' }))
    const refused = await draftComment({ postText: LONG_POST, take: TAKE, author: 'Priya Menon' })
    expect(refused.status).toBe('error')
    expect(refused.draft).toBeNull()
    expect(refused.note).toMatch(/nothing was written/)
    expect(refused.note).toMatch(/ANTHROPIC_API_KEY/)                   // the hub's own words, not a stack trace

    // an empty take never spends: the comment is his view, and there is no view yet
    const empty = await draftComment({ postText: LONG_POST, take: '   ' })
    expect(empty.status).toBe('error')
    expect(empty.note).toMatch(/Write your take first/)
    expect(paths(fetchMock)).toEqual(['/comments/draft'])

    fetchMock.mockImplementation(async () => jsonResponse(200, {
      text: 'The flush line being instrumented is the part that matters — an assumed flush is a seal failure nobody has told you about yet.',
      chars: 126, ok: true, reasons: [],
      register: { post: { level: 'mixed', wordsPerSentence: 38, longWordShare: 0.12, words: 40, sentences: 1, acronyms: 0, numbers: 0, score: 1.3 }, comment: { level: 'mixed', wordsPerSentence: 22, longWordShare: 0.13, words: 22, sentences: 1, acronyms: 0, numbers: 0, score: 1.1 } },
      coverage: { terms: ['instrumented', 'flush', 'assumed'], carried: ['assumed', 'flush', 'instrumented'], dropped: [], share: 1.0 },
      model: 'claude-haiku-4-5-20251001', usage: { input: 420, output: 90 }, costUsd: 0.0006,
    }))
    const done = await draftComment({ postText: LONG_POST, take: TAKE, author: 'Priya Menon' })
    expect(done.status).toBe('sent')
    expect(done.draft?.text).toMatch(/assumed flush/)
    expect(done.note).toMatch(/\$0\.0006/)                              // a spend is never invisible
    expect(done.note).toMatch(/mixed against a mixed post/)             // the mirror, shown rather than claimed
    const sent = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))
    expect(sent).toEqual({ postText: LONG_POST, take: TAKE, author: 'Priya Menon' })

    fetchMock.mockRejectedValue(new TypeError('connect ECONNREFUSED'))
    const offline = await draftComment({ postText: LONG_POST, take: TAKE })
    expect(offline.status).toBe('error')
    expect(offline.note).toMatch(/hub is not running/)
    expect(offline.draft).toBeNull()
  })
})

describe('the comment log', () => {
  const fetchMock = vi.fn()

  beforeEach(async () => {
    resetChromeMock()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    await setTailorConfig({ token: 'tok' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('inserts the first time and updates after — drafting twice on one post is one row', async () => {
    hubUp(fetchMock)
    const first = await saveComment(POST, { take: TAKE, draft: 'The flush line being instrumented is the part that matters.' })
    expect(first.status).toBe('sent')
    expect(first.commentId).toMatch(/^row-/)

    const insert = lastOp(fetchMock)
    expect(insert).toMatchObject({ op: 'insert', table: 'comments' })
    expect(insert.body).toEqual({
      post_url: CANONICAL, post_author: 'Priya Menon',
      post_author_url: 'https://www.linkedin.com/in/priya-menon', post_text: LONG_POST,
      my_take: TAKE, draft: 'The flush line being instrumented is the part that matters.',
    })
    // `comments` has no unique key in the contract, so nothing invents an onConflict here
    expect(insert).not.toHaveProperty('onConflict')

    // he redrafts, edits, saves again: the SAME row, by the id this module remembered
    const second = await saveComment(POST, { finalText: 'The flush line being instrumented is what matters here.' })
    expect(second.status).toBe('sent')
    expect(second.commentId).toBe(first.commentId)
    expect(lastOp(fetchMock)).toMatchObject({ op: 'update', table: 'comments', id: first.commentId })
    expect(lastBody(fetchMock)).toMatchObject({ final_text: 'The flush line being instrumented is what matters here.', my_take: TAKE })

    expect(await loadComments()).toHaveLength(1)
    expect((await getCommentRecord(SHARE_LINK))?.id).toBe(first.commentId)   // remembered under the canonical URL

  })

  /**
   * The comment that has no post behind it: pasted text, or a picture post the reader could not
   * take. It used to be refused outright, which left a drafted and checked comment with nowhere to
   * go. It is now filed under a minted identity — and the note says plainly what that identity
   * cannot do.
   */
  it('files a comment with no post URL under a local id, and says what that costs', async () => {
    hubUp(fetchMock)
    const homeless = await saveComment(
      { ...POST, postUrl: 'https://www.linkedin.com/feed/' },
      { take: TAKE, draft: 'Written from what he typed, with no post to read.' },
    )
    expect(homeless.status).toBe('sent')
    expect(homeless.record?.key).toMatch(/^local:/)
    expect(homeless.record?.postUrl).toBe('')
    // the column is simply absent — nothing is invented to fill it
    expect(lastBody(fetchMock)).not.toHaveProperty('post_url')
    expect(homeless.note).toMatch(/no post URL/i)

    // pressing again with the identity it returned is an UPDATE, not a second row
    const again = await saveComment(
      { ...POST, postUrl: 'https://www.linkedin.com/feed/' },
      { key: homeless.record!.key, finalText: 'Edited before posting.' },
    )
    expect(again.status).toBe('sent')
    expect(again.commentId).toBe(homeless.commentId)
    expect(lastOp(fetchMock)).toMatchObject({ op: 'update', table: 'comments', id: homeless.commentId })
    expect(await loadComments()).toHaveLength(1)
  })

  it('never asks the hub to recognise a row that has no post URL to recognise it by', async () => {
    hubUp(fetchMock, { '/db/comments': { rows: [{ id: 'someone-elses-row' }] } })
    const homeless = await saveComment({ ...POST, postUrl: 'https://www.linkedin.com/feed/' }, { take: TAKE })
    // remoteId matches on post_url; with none, a query would hand back an unrelated row
    expect(lastOp(fetchMock)).toMatchObject({ op: 'insert', table: 'comments' })
    expect(homeless.commentId).not.toBe('someone-elses-row')
  })

  it('a cleared local store is not a second row: the hub is asked for the id first', async () => {
    hubUp(fetchMock, { '/db/comments': { rows: [{ id: 'existing-row-id' }] } })
    const out = await saveComment(POST, { take: TAKE })
    expect(out.status).toBe('sent')
    expect(out.commentId).toBe('existing-row-id')
    expect(lastOp(fetchMock)).toMatchObject({ op: 'update', table: 'comments', id: 'existing-row-id' })
    expect(paths(fetchMock).some((p) => p.startsWith('/db/comments?'))).toBe(true)
    expect(lastBatch(fetchMock).ops.some((o) => o.op === 'insert')).toBe(false)
  })

  it('posted is true only because the human said so, and the stamp is that moment', async () => {
    hubUp(fetchMock)
    // saving a draft says nothing about posting: neither column is sent
    const saved = await saveComment(POST, { take: TAKE, draft: 'A comment.' })
    expect(saved.status).toBe('sent')
    expect(lastBody(fetchMock)).not.toHaveProperty('posted')
    expect(lastBody(fetchMock)).not.toHaveProperty('posted_at')
    expect(saved.record?.posted).toBe(false)
    expect(saved.record?.postedAt).toBeNull()

    // he copied it, posted it on LinkedIn himself, and pressed the button. Nothing detected this.
    const posted = await recordPosted(POST, 'A comment, as I actually posted it.')
    expect(posted.status).toBe('sent')
    expect(posted.note).toMatch(/marked posted/)
    const body = lastBody(fetchMock)
    expect(body.posted).toBe(true)
    expect(body.final_text).toBe('A comment, as I actually posted it.')
    expect(Date.now() - Date.parse(String(body.posted_at))).toBeLessThan(5000)
    expect(lastOp(fetchMock)).toMatchObject({ op: 'update', table: 'comments' })

    // and no route was called that could post anything — the only routes this whole flow touches are
    // the two database ones, because no route in this product posts a comment
    for (const path of paths(fetchMock)) expect(path.split('?')[0]).toMatch(/^\/db\/(batch|comments)$/)

    // un-marking is explicit too, and it clears the stamp rather than leaving a timestamp behind
    const un = await saveComment(POST, { posted: false })
    expect(lastBody(fetchMock)).toMatchObject({ posted: false, posted_at: null })
    expect(un.record?.postedAt).toBeNull()
  })

  it('hub down: the write waits in the outbox, a second press makes no second row, and both are said plainly', async () => {
    fetchMock.mockRejectedValue(new TypeError('connect ECONNREFUSED'))
    const queued = await saveComment(POST, { take: TAKE, draft: 'First version.' })
    expect(queued.status).toBe('queued')
    expect(queued.commentId).toBeNull()
    expect(queued.note).toMatch(/queued for the hub/)
    expect((await getHubOutbox()).map((e) => e.op.table)).toEqual(['comments'])

    // he edits and presses Save again while the hub is still down. An insert here would become a
    // SECOND row for one post the moment the hub came back — the table has no key to merge them.
    const again = await saveComment(POST, { draft: 'Second version.' })
    expect(again.status).toBe('queued')
    expect(again.note).toMatch(/still waiting/)
    expect(again.note).toMatch(/no second row/)
    expect(await getHubOutbox()).toHaveLength(1)
    expect((await getCommentRecord(CANONICAL))?.draft).toBe('Second version.')   // the newest text is kept here

    // the hub comes back: the queued insert lands, its id is learned, and this press UPDATES it
    hubUp(fetchMock)
    const landed = await saveComment(POST, { draft: 'Second version.' })
    expect(landed.status).toBe('sent')
    expect(landed.commentId).toMatch(/^row-/)
    expect(lastOp(fetchMock)).toMatchObject({ op: 'update', table: 'comments', id: landed.commentId })
    expect(lastBody(fetchMock)).toMatchObject({ draft: 'Second version.' })
    expect(await getHubOutbox()).toHaveLength(0)
    expect(await loadComments()).toHaveLength(1)
  })

  it('a row the hub refuses is a dead letter, said plainly — never a silent success', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (!String(url).endsWith('/db/batch')) return jsonResponse(404, { error: 'no' })
      const req = JSON.parse(String(init?.body)) as HubBatchRequest
      return jsonResponse(207, {
        ok: false,
        results: req.ops.map((op) => ({ clientRef: op.clientRef, ok: false, status: 400, row: null, error: 'comments: post_url must be text' })),
      })
    })
    const out = await saveComment(POST, { take: TAKE })
    expect(out.status).toBe('dead')
    expect(out.note).toMatch(/refused by the hub/)
    expect(out.note).toMatch(/post_url/)
    expect(out.commentId).toBeNull()
  })
})
