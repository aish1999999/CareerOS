/**
 * The comment panel, rendered and pressed, on the path that had no ending: a post that was never
 * read.
 *
 * The panel has always let you paste the post (or write from your take alone, which is what the
 * deferred vision path leaves for a picture post). Logging then demanded a post URL only a tab read
 * could supply, so the comment was drafted, checked, and stuck. This drives that path to the log.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { resetChromeMock } from './setup'

// @ts-expect-error — React's act() flag, which is not typed on globalThis
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const POST = 'Every handover we run loses a day to the same thing: the receiving team has to rebuild '
  + 'the context the sending team already had written down somewhere nobody thought to look. We keep '
  + 'treating that as a documentation problem when it is really a routing problem, and the fix is '
  + 'boring — one owner, one place, stated at the moment the work changes hands rather than after.'
const TAKE = 'Agreed, and the routing framing is the useful half — ownership is what actually moves.'
const DRAFT = 'The routing framing is the half that pays: naming one owner at the moment work '
  + 'changes hands is what stops the rebuild, and it is boring precisely because it works.'

/** The hub, answering as apps/mapper/service/comments.py does. */
const writes: { table: string; op: string; row: Record<string, unknown> }[] = []
globalThis.fetch = vi.fn(async (url: unknown, init: { body?: string } = {}) => {
  const path = String(url)
  const body = init.body ? JSON.parse(init.body) : {}
  if (path.includes('/comments/draft')) {
    return new Response(JSON.stringify({ ok: true, text: DRAFT, reasons: [], costUsd: 0.0004,
      mirror: { ok: true, detail: 'register matched' }, coverage: { ok: true, detail: 'whole take covered' } }), { status: 200 })
  }
  if (path.includes('/comments/check')) {
    return new Response(JSON.stringify({ ok: true, text: body.text ?? DRAFT, reasons: [],
      mirror: { ok: true, detail: 'register matched' }, coverage: { ok: true, detail: 'whole take covered' } }), { status: 200 })
  }
  if (path.includes('/db/batch')) {
    const results = (body.ops ?? []).map((op: { clientRef: string; table: string; op: string; body: Record<string, unknown> }) => {
      writes.push({ table: op.table, op: op.op, row: op.body ?? {} })
      return { clientRef: op.clientRef, ok: true, status: 200, row: { id: 'row-1', ...(op.body ?? {}) } }
    })
    return new Response(JSON.stringify({ results }), { status: 200 })
  }
  if (path.includes('/db/comments')) return new Response(JSON.stringify({ rows: [] }), { status: 200 })
  return new Response('{}', { status: 200 })
}) as unknown as typeof fetch

async function mount(): Promise<HTMLElement> {
  const { CommentPanel } = await import('@/ui/components/CommentPanel')
  const host = document.createElement('div')
  document.body.appendChild(host)
  await act(async () => { createRoot(host).render(<CommentPanel />) })
  return host
}

const testId = (host: HTMLElement, id: string) => host.querySelector(`[data-testid="${id}"]`)
const rowCount = (host: HTMLElement) => host.querySelectorAll('.recents-table tbody tr').length
const areaFor = (host: HTMLElement, fragment: string) =>
  [...host.querySelectorAll('textarea')].find((t) => t.placeholder.includes(fragment)) ?? null

const click = (el: Element | null) =>
  act(async () => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

const type = (el: HTMLTextAreaElement | null, value: string) =>
  act(async () => {
    if (!el) throw new Error('no such box on the panel')
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })

/** The check runs on a debounce after every edit; let it land. */
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 700)) })

describe('a comment on a post that was never read', () => {
  beforeEach(() => {
    resetChromeMock()
    writes.length = 0
    document.body.innerHTML = ''
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
  })

  it('drafts from the pasted post and logs it, with no post URL anywhere', async () => {
    const host = await mount()
    await type(areaFor(host, 'Paste or type the post here'), POST)
    await type(areaFor(host, 'What you actually think'), TAKE)

    await click(testId(host, 'comment-draft'))
    await settle()
    expect((areaFor(host, 'The drafted comment appears here') as HTMLTextAreaElement).value).toBe(DRAFT)

    // the press that used to be impossible
    const posted = testId(host, 'comment-posted') as HTMLButtonElement
    expect(testId(host, 'comment-blockers')).toBeNull()
    expect(posted.disabled).toBe(false)
    await click(posted)
    await settle()

    const row = writes.find((w) => w.table === 'comments')
    expect(row).toBeDefined()
    expect(row!.op).toBe('insert')
    // filed with what there is, and nothing invented for what there is not
    expect(row!.row).not.toHaveProperty('post_url')
    expect(row!.row.post_text).toBe(POST)
    expect(row!.row.my_take).toBe(TAKE)
    expect(row!.row.posted).toBe(true)
    expect(testId(host, 'comment-status')?.textContent).toMatch(/no post URL/i)
  })

  /**
   * The shelf. Logging a comment puts it in the table; Retrieve puts it back in the boxes — which
   * is the whole point, because the popup closes every time you click the page behind it.
   */
  it('lists what was logged and puts a row back in the boxes', async () => {
    const host = await mount()
    expect(testId(host, 'comment-recents')).toBeNull()          // nothing logged yet: no furniture

    await type(areaFor(host, 'Paste or type the post here'), POST)
    await type(areaFor(host, 'What you actually think'), TAKE)
    await click(testId(host, 'comment-draft'))
    await settle()
    await click(testId(host, 'comment-posted'))
    await settle()

    expect(rowCount(host)).toBe(1)
    expect(testId(host, 'comment-recents')?.textContent).toContain('The last 3 comments you logged')

    // he moves on to something else — as a closed and reopened popup would leave him
    await type(areaFor(host, 'Paste or type the post here'), 'A different post entirely.')
    await type(areaFor(host, 'What you actually think'), 'A different view.')
    await type(areaFor(host, 'The drafted comment appears here'), 'A different comment.')
    await settle()

    await click(testId(host, 'comment-recents-retrieve-0'))
    await settle()

    expect((areaFor(host, 'Paste or type the post here') as HTMLTextAreaElement).value).toBe(POST)
    expect((areaFor(host, 'What you actually think') as HTMLTextAreaElement).value).toBe(TAKE)
    expect((areaFor(host, 'The drafted comment appears here') as HTMLTextAreaElement).value).toBe(DRAFT)
    expect(testId(host, 'comment-status')?.textContent).toMatch(/Retrieved/i)
  })

  it('never logs twice for one retrieved comment — it comes back as the row it already is', async () => {
    const host = await mount()
    await type(areaFor(host, 'Paste or type the post here'), POST)
    await type(areaFor(host, 'What you actually think'), TAKE)
    await click(testId(host, 'comment-draft'))
    await settle()
    await click(testId(host, 'comment-posted'))
    await settle()
    writes.length = 0

    await click(testId(host, 'comment-recents-retrieve-0'))
    await settle()
    await click(testId(host, 'comment-posted'))
    await settle()

    const row = writes.find((w) => w.table === 'comments')
    expect(row?.op).toBe('update')                    // the same row, not a second one
    expect(rowCount(host)).toBe(1)
  })
})
