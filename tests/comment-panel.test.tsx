import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import {
  CommentForm,
  MIRRORABLE_MIN_WORDS,
  REGISTER_LEVELS,
  countWords,
  coverageLine,
  draftState,
  mirrorLine,
  postTextState,
  postedBlockers,
  readCoverage,
  readEnvelope,
  readGate,
  readOutcome,
  readPostCapture,
  readRegister,
  registerDistance,
  registerLabel,
  type CapturedPost,
  type CommentFormProps,
} from '@/ui/components/CommentPanel'

// Stage 9 — the comment panel's rules, and the panel rendered from fixtures.
//
// Bob's rule is the whole rule (2026-09-07): the comment is built around his entire typed view, and
// its tone mirrors the post's. He was offered a ban list — no flattery openers, no hashtags, a length
// cap — and chose this instead, so exactly two refusals exist here and nothing else is refused.
// These tests hold that line: the two measurements are shown, the two refusals are rendered with
// their fixes, and nothing invents a third.
//
// The one bug this file exists to make impossible is Stage 8's: the lib answers in an ENVELOPE and
// the gate is INSIDE it. A panel that read the envelope as the payload dropped every refusal the hub
// sent and let a REFUSED note reach the send button looking clean. Both halves are tested — the
// reader as a function, and the rendered screen it produces.
//
// The extension's vitest config collects tests/**/*.test.tsx as well as .ts, so this file runs.
// lib/comments.ts is stubbed: nothing here touches the hub, chrome.* or a page.

vi.mock('@/lib/comments', () => ({
  // The hub's own threshold, which lib/comments.ts quotes and the panel re-exports. Stubbed at its
  // real value so the thin-read rules are exercised against the number production uses.
  POST_MIRROR_MIN_WORDS: 25,
  captureActiveTabPost: vi.fn(),
  checkComment: vi.fn(),
  draftComment: vi.fn(),
  getCommentSettings: vi.fn(),
  rememberTake: vi.fn(),
  saveComment: vi.fn(),
  markPosted: vi.fn(),
}))

// --- fixtures ---------------------------------------------------------------

const PLAIN_POST = {
  words: 62, sentences: 5, wordsPerSentence: 12.4, longWordShare: 0.048,
  acronyms: 0, numbers: 0, level: 'plain', score: 0.42,
}
const TECHNICAL_COMMENT = {
  words: 70, sentences: 3, wordsPerSentence: 23.3, longWordShare: 0.271,
  acronyms: 2, numbers: 1, level: 'technical', score: 1.94,
}
const PLAIN_COMMENT = {
  words: 48, sentences: 4, wordsPerSentence: 12.0, longWordShare: 0.062,
  acronyms: 0, numbers: 0, level: 'plain', score: 0.44,
}

/** What lib/comments.ts hands back from the ONE paid call when the model missed both rules: an
 *  envelope, with the gate nested inside it. This exact shape is the Stage 8 trap. */
const REFUSED_ENVELOPE = {
  status: 'sent',
  note: 'Drafted.',
  draft: {
    ok: false,
    text: 'The commissioning throughput delta is non-trivial and the handover interface warrants scrutiny.',
    chars: 96,
    reasons: [
      {
        code: 'register',
        detail: 'the post reads plain (12.4 words a sentence, 5% long words) and this comment reads technical (23.3, 27%)',
        fix: 'match the post — plainer sentences and everyday words',
      },
      {
        code: 'take_dropped',
        detail: 'your take is 25% in the comment — it leaves out commissioning, handover, operators',
        fix: 'the comment should revolve around your whole point, not part of it',
      },
    ],
    register: { post: PLAIN_POST, comment: TECHNICAL_COMMENT },
    coverage: {
      terms: ['commissioning', 'handover', 'operators', 'throughput'],
      carried: ['throughput'],
      dropped: ['commissioning', 'handover', 'operators'],
      share: 0.25,
    },
    costUsd: 0.0007,
    model: 'claude-haiku-4-5-20251001',
  },
}

/** The free route's envelope on a comment that passed both checks. */
const CLEAN_ENVELOPE = {
  status: 'sent',
  note: 'Checked.',
  check: {
    ok: true,
    text: 'Agreed — the handover is where it goes wrong, and the operators are the ones who see it first.',
    chars: 94,
    reasons: [],
    register: { post: PLAIN_POST, comment: PLAIN_COMMENT },
    coverage: {
      terms: ['handover', 'operators'],
      carried: ['handover', 'operators'],
      dropped: [],
      share: 1.0,
    },
  },
}

const POST_URL = 'https://www.linkedin.com/feed/update/urn:li:activity:7000000000000000000/'

function capturedPost(over: Partial<CapturedPost> = {}): CapturedPost {
  return {
    postUrl: POST_URL,
    author: 'Priya Raman',
    authorUrl: 'https://www.linkedin.com/in/priya/',
    text: '',
    words: 0,
    thin: true,
    thinWhy: null,
    hasImage: false,
    ...over,
  }
}

const LONG_POST = 'Commissioning is where every schedule dies and nobody wants to say so out loud in the '
  + 'review meeting because the handover date is already on a slide that somebody printed.'

// --- rendering helpers ------------------------------------------------------

function formProps(over: Partial<CommentFormProps> = {}): CommentFormProps {
  const base: CommentFormProps = {
    post: null,
    recents: [],
    postText: postTextState(null, ''),
    pastedPost: '',
    take: '',
    text: '',
    gate: null,
    mirror: mirrorLine(null, null),
    coverage: coverageLine(null),
    draft: draftState({ take: '', postText: '', busy: false }),
    blockers: postedBlockers({ text: '', checked: false, reasons: [], busy: false, postedAt: null }),
    reading: false,
    drafting: false,
    checking: false,
    logging: false,
    drafted: false,
    edited: false,
    postedAt: null,
    status: null,
    on: {
      read: () => undefined,
      setPastedPost: () => undefined,
      setTake: () => undefined,
      retrieve: () => undefined,
      draft: () => undefined,
      setText: () => undefined,
      copy: () => undefined,
      logPosted: () => undefined,
    },
  }
  return { ...base, ...over }
}

function render(over: Partial<CommentFormProps> = {}): string {
  return renderToStaticMarkup(<CommentForm {...formProps(over)} />)
}

/** The one <button> carrying this test id, so a `disabled` on some other control cannot be mistaken
 *  for this one's. */
function buttonFor(markup: string, testid: string): string {
  const at = markup.indexOf(`data-testid="${testid}"`)
  expect(at, `no element carries data-testid="${testid}"`).toBeGreaterThan(-1)
  const start = markup.lastIndexOf('<button', at)
  const end = markup.indexOf('</button>', at)
  return markup.slice(start, end + '</button>'.length)
}

function isDisabled(markup: string, testid: string): boolean {
  return /\sdisabled=""/.test(buttonFor(markup, testid))
}

/** The whole screen, wired the way the container wires it, from one envelope off the lib. */
function screenFrom(envelope: unknown, over: Partial<CommentFormProps> = {}): string {
  const gate = readGate(envelope)
  return render({
    gate,
    text: gate.text,
    mirror: mirrorLine(gate.postRegister, gate.commentRegister),
    coverage: coverageLine(gate.coverage),
    blockers: postedBlockers({
      text: gate.text, checked: true, reasons: gate.reasons, busy: false, postedAt: null,
    }),
    ...over,
  })
}

// --- the envelope: the Stage 8 lesson ---------------------------------------

describe('readEnvelope — the wrapper is never the verdict', () => {
  it('finds a nested payload whatever the lib called the key', () => {
    expect(readEnvelope({ status: 'sent', note: 'n', draft: { ok: true, text: 'a' } }).payload?.text).toBe('a')
    expect(readEnvelope({ status: 'sent', note: 'n', check: { ok: true, text: 'b' } }).payload?.text).toBe('b')
    expect(readEnvelope({ status: 'sent', note: 'n', result: { ok: true, text: 'c' } }).payload?.text).toBe('c')
  })

  it('accepts a payload the lib spread into the envelope instead of nesting', () => {
    const flat = readEnvelope({ status: 'sent', note: 'Checked.', ok: false, text: 'x', reasons: [] })
    expect(flat.payload?.text).toBe('x')
    expect(flat.status).toBe('sent')
  })

  it('says NO PAYLOAD when the lib answered with none, rather than reading the wrapper as one', () => {
    const empty = readEnvelope({ status: 'error', note: 'Not checked — the hub is not running.', check: null })
    expect(empty.payload).toBeNull()
    expect(empty.status).toBe('error')
    expect(empty.note).toMatch(/not running/)
    expect(readEnvelope(null).payload).toBeNull()
  })
})

describe('readGate — the refusal survives the envelope', () => {
  it('finds the gate INSIDE the envelope, refusals and all', () => {
    // The Stage 8 bug written out: read as though it were the payload, this envelope carries no
    // verdict at all — no `ok`, no `reasons`. A panel that did that dropped every refusal the hub
    // sent and let a REFUSED comment reach the log button looking clean.
    const naive = REFUSED_ENVELOPE as unknown as Record<string, unknown>
    expect(naive.ok).toBeUndefined()
    expect(naive.reasons).toBeUndefined()

    const gate = readGate(REFUSED_ENVELOPE, 'my own words')
    expect(gate.ok).toBe(false)
    expect(gate.reasons.map((r) => r.code)).toEqual(['register', 'take_dropped'])
    expect(gate.reasons[0].fix).toMatch(/plainer sentences/)
    expect(gate.chars).toBe(96)
    expect(gate.text).not.toBe('my own words')
    expect(gate.costUsd).toBe(0.0007)
    expect(gate.postRegister?.level).toBe('plain')
    expect(gate.commentRegister?.level).toBe('technical')
    expect(gate.coverage?.dropped).toEqual(['commissioning', 'handover', 'operators'])
  })

  it('reads the free route\'s envelope the same way, and reports no spend for it', () => {
    const gate = readGate(CLEAN_ENVELOPE)
    expect(gate.ok).toBe(true)
    expect(gate.reasons).toEqual([])
    expect(gate.costUsd).toBeNull()
    expect(gate.coverage?.share).toBe(1)
  })

  it('is ok only when the hub SAID ok and listed no reasons', () => {
    expect(readGate({ ok: true, text: 'hi', reasons: [] }).ok).toBe(true)
    expect(readGate({ ok: true, text: 'hi', reasons: [{ code: 'register', detail: 'd', fix: 'f' }] }).ok).toBe(false)
    // no payload at all is not consent
    expect(readGate({ status: 'error', note: 'the hub is down', draft: null }, 'typed').ok).toBe(false)
    expect(readGate({}, 'typed').text).toBe('typed')
  })

  it('fills a reason the hub sent half of, rather than dropping it', () => {
    const gate = readGate({ draft: { ok: false, text: 'x', reasons: [{ code: 'register' }] } })
    expect(gate.reasons).toHaveLength(1)
    expect(gate.reasons[0].detail).toMatch(/refused/)
    expect(gate.reasons[0].fix).toMatch(/checked again/)
  })
})

describe('the measurement readers', () => {
  it('reads a register reading, and returns null rather than a zeroed stand-in', () => {
    expect(readRegister(PLAIN_POST)?.wordsPerSentence).toBe(12.4)
    expect(readRegister({ level: 'jargon', words: 10 })).toBeNull()   // not one of the three buckets
    expect(readRegister({ level: 'plain' })).toBeNull()               // nothing was counted
    expect(readRegister(null)).toBeNull()
  })

  it('reads a coverage reading, and never invents a 100%', () => {
    expect(readCoverage({ terms: ['a'], carried: [], dropped: ['a'], share: 0 })?.share).toBe(0)
    expect(readCoverage({ terms: ['a'] })).toBeNull()
    expect(readCoverage(null)).toBeNull()
  })

  it('has the three registers the hub has, in the hub\'s order', () => {
    expect([...REGISTER_LEVELS]).toEqual(['plain', 'mixed', 'technical'])
    expect(registerDistance('plain', 'plain')).toBe(0)
    expect(registerDistance('plain', 'mixed')).toBe(1)
    expect(registerDistance('plain', 'technical')).toBe(2)
    expect(registerLabel('technical')).toMatch(/long sentences/)
  })

  it('counts words the way service/comments.py counts them', () => {
    expect(countWords('The handover is where it goes wrong.')).toBe(7)
    expect(countWords('')).toBe(0)
    // figures are not words: the hub counts those separately, and so does this
    expect(countWords('2026 and 40% — no words there')).toBe(4)
  })

  it('quotes the hub\'s own mirror threshold rather than choosing one', () => {
    expect(MIRRORABLE_MIN_WORDS).toBe(25)
  })
})

// --- the two measurements, in words -----------------------------------------

describe('the register measurement', () => {
  it('says it mirrors, and quotes both readings so a PASS can be checked too', () => {
    const line = mirrorLine(readRegister(PLAIN_POST), readRegister(PLAIN_COMMENT))
    expect(line.ok).toBe(true)
    expect(line.text).toMatch(/mirrors/i)
    expect(line.detail).toContain('12.4 words a sentence')
  })

  it('names the whole range apart as the refusal it is', () => {
    const line = mirrorLine(readRegister(PLAIN_POST), readRegister(TECHNICAL_COMMENT))
    expect(line.ok).toBe(false)
    expect(line.text).toMatch(/plain/)
    expect(line.text).toMatch(/technical/)
    expect(line.text).toMatch(/mirror refusal/i)
  })

  it('passes one step apart, exactly as the hub does', () => {
    const mixed = { ...PLAIN_COMMENT, level: 'mixed' }
    expect(mirrorLine(readRegister(PLAIN_POST), readRegister(mixed)).ok).toBe(true)
  })

  it('claims NOTHING about a post too short to have a register — the hub does not either', () => {
    const short = { ...PLAIN_POST, words: MIRRORABLE_MIN_WORDS - 1 }
    const line = mirrorLine(readRegister(short), readRegister(TECHNICAL_COMMENT))
    expect(line.ok).toBeNull()
    expect(line.text).toMatch(/too short/i)
    expect(line.text).toMatch(/paste it/i)
  })

  it('says "not measured yet" rather than passing something it never saw', () => {
    expect(mirrorLine(null, null).ok).toBeNull()
    expect(mirrorLine(readRegister(PLAIN_POST), null).ok).toBeNull()
  })
})

describe('the take-coverage measurement', () => {
  it('names what went missing, in the words that went missing', () => {
    const line = coverageLine(readGate(REFUSED_ENVELOPE).coverage)
    expect(line.ok).toBe(false)
    expect(line.text).toMatch(/25%/)
    expect(line.text).toContain('commissioning')
    expect(line.text).toContain('handover')
  })

  it('says all of it when nothing was dropped', () => {
    const line = coverageLine(readGate(CLEAN_ENVELOPE).coverage)
    expect(line.ok).toBe(true)
    expect(line.text).toMatch(/all of it/i)
  })

  it('explains an empty measurement instead of showing a bare 100%', () => {
    const line = coverageLine({ terms: [], carried: [], dropped: [], share: 1 })
    expect(line.ok).toBeNull()
    expect(line.text).toMatch(/nothing to lose/i)
  })

  it('says "not measured yet" when there is no reading', () => {
    expect(coverageLine(null).ok).toBeNull()
    expect(coverageLine(null).text).toMatch(/not measured yet/i)
  })
})

// --- the post, and the vision path Bob deferred ------------------------------

describe('reading the post', () => {
  it('unwraps the reader\'s own envelope and keeps its verdict', () => {
    const read = readPostCapture({
      status: 'sent',
      note: 'Read the post.',
      post: {
        postUrl: POST_URL,
        author: 'Priya Raman',
        authorUrl: 'https://www.linkedin.com/in/priya/',
        text: LONG_POST,
        words: 30,
        thin: false,
        thinWhy: null,
        hasImage: false,
      },
    })
    expect(read.status).toBe('sent')
    expect(read.post?.author).toBe('Priya Raman')
    expect(read.post?.words).toBe(30)
    expect(read.post?.thin).toBe(false)
  })

  it('calls a post with no text thin whatever the reader said — the vision path is deferred, not silent', () => {
    const read = readPostCapture({
      status: 'sent',
      note: 'Read the post, but it is a picture.',
      post: { postUrl: POST_URL, text: '', thin: false, hasImage: true },
    })
    expect(read.post?.thin).toBe(true)
    expect(read.post?.hasImage).toBe(true)
    expect(read.post?.text).toBe('')
  })

  it('keeps the reader\'s own reason for a thin read', () => {
    const read = readPostCapture({
      status: 'sent', note: 'Read it.',
      post: { postUrl: POST_URL, text: 'Short.', words: 1, thin: true, thinWhy: 'the page cut it off at the “…see more”' },
    })
    expect(read.post?.thinWhy).toBe('the page cut it off at the “…see more”')
  })

  it('returns no post when nothing post-shaped came back, rather than an empty card that looks like a read', () => {
    expect(readPostCapture({ status: 'error', note: 'That tab is not a LinkedIn post.', post: null }).post).toBeNull()
    expect(readPostCapture(null).post).toBeNull()
  })
})

describe('which text the comment is measured against', () => {
  it('prefers what the human pasted over what the page gave — the human is the better reader', () => {
    const state = postTextState(capturedPost({ text: LONG_POST, words: 30, thin: false }),
      `  ${LONG_POST} And the operators say so every single time.  `)
    expect(state.source).toBe('typed')
    expect(state.thin).toBe(false)
    expect(state.text.startsWith('Commissioning is where')).toBe(true)
    expect(state.text.endsWith('every single time.')).toBe(true)
  })

  it('says plainly that an image post was not read, and that reading pictures is not built', () => {
    const state = postTextState(capturedPost({ text: '', words: 0, thin: true, hasImage: true }), '')
    expect(state.source).toBe('none')
    expect(state.thin).toBe(true)
    expect(state.why).toMatch(/image, a video or a document card/i)
    expect(state.why).toMatch(/deliberately not built/i)
    expect(state.why).toMatch(/paste or type/i)
  })

  it('shows the READER\'s reason for a thin read rather than inventing one', () => {
    const state = postTextState(
      capturedPost({ text: 'Short one.', words: 2, thin: true, thinWhy: 'the page cut it off at the “…see more”' }), '')
    expect(state.thin).toBe(true)
    expect(state.why).toContain('the page cut it off at the “…see more”')
    expect(state.why).toMatch(/paste it below/i)
  })

  it('falls back to the hub\'s own threshold when the reader gave no reason', () => {
    const state = postTextState(capturedPost({ text: 'Short one.', words: 2, thin: true }), '')
    expect(state.why).toContain(String(MIRRORABLE_MIN_WORDS))
  })

  it('is content with a full read, and still offers the box', () => {
    const state = postTextState(capturedPost({ text: LONG_POST, words: 30, thin: false }), '')
    expect(state.source).toBe('page')
    expect(state.thin).toBe(false)
    expect(state.why).toMatch(/paste it below/i)
  })

  it('says nothing about a page nothing has read yet', () => {
    const state = postTextState(null, '')
    expect(state.source).toBe('none')
    expect(state.why).toMatch(/No post has been read yet/i)
  })
})

// --- the two buttons that do something ---------------------------------------

describe('Draft it — the only spend on the screen', () => {
  it('is dead with no view typed, because the comment IS the view', () => {
    const state = draftState({ take: '   ', postText: 'a post', busy: false })
    expect(state.enabled).toBe(false)
    expect(state.why).toMatch(/type your view first/i)
  })

  it('says on its own face that it spends, and that it asks first', () => {
    const state = draftState({ take: 'the handover is the problem', postText: 'a post', busy: false })
    expect(state.enabled).toBe(true)
    expect(state.why).toMatch(/spends money/i)
    expect(state.why).toMatch(/asks before it spends/i)
    expect(state.why).toMatch(/nothing is posted to linkedin/i)
  })

  it('warns that with no post text there is no register to mirror', () => {
    const state = draftState({ take: 'the handover is the problem', postText: '', busy: false })
    expect(state.enabled).toBe(true)
    expect(state.why).toMatch(/no register to mirror/i)
  })

  it('stays dead while something else is running', () => {
    expect(draftState({ take: 'a view', postText: 'a post', busy: true }).enabled).toBe(false)
  })
})

describe('"I posted it"', () => {
  const ready = {
    text: 'Agreed — the handover is where it goes wrong.',
    checked: true,
    reasons: [],
    busy: false,
    postedAt: null,
  }

  it('is alive only once the comment passed both checks', () => {
    expect(postedBlockers(ready)).toEqual([])
  })

  it('is dead while the hub has not checked the comment — an unmeasured log is never allowed', () => {
    expect(postedBlockers({ ...ready, checked: false })).toContain('the hub has not checked this comment yet')
  })

  it('is dead on each refusal the hub listed, and repeats the fix', () => {
    const gate = readGate(REFUSED_ENVELOPE)
    const blockers = postedBlockers({ ...ready, reasons: gate.reasons })
    expect(blockers).toHaveLength(2)
    expect(blockers[0]).toContain('the post reads plain')
    expect(blockers[0]).toContain('match the post')
    expect(blockers[1]).toContain('revolve around your whole point')
  })

  it('is ALIVE without a post URL — a comment drafted from a pasted post is still a comment', () => {
    // It used to be dead here, which meant every comment written from pasted text or from a take
    // alone (a picture post, the case vision was deferred on) could be drafted and never logged.
    expect(postedBlockers(ready)).toEqual([])
  })

  it('is dead with no comment, while busy, and once already logged', () => {
    expect(postedBlockers({ ...ready, text: '  ' })).toContain('there is no comment yet')
    expect(postedBlockers({ ...ready, busy: true })).toContain('working…')
    expect(postedBlockers({ ...ready, postedAt: '2026-09-07T10:00:00Z' }))
      .toContain('this comment is already logged as posted')
  })

  it('reads what the write actually came to, so only a landed write may latch the button', () => {
    expect(readOutcome({ status: 'sent', note: 'Comment saved and marked posted.', commentId: 'c-1' }).id).toBe('c-1')
    expect(readOutcome({ status: 'queued', note: 'Comment queued for the hub.' }).status).toBe('queued')
    expect(readOutcome({ status: 'sent', note: 'ok', commentId: null, record: { id: 'c-2' } }).id).toBe('c-2')
    expect(readOutcome(null).status).toBe('error')
  })
})

// --- the screen itself --------------------------------------------------------

describe('the panel, rendered', () => {
  it('says nothing runs on LinkedIn until the button is pressed, before anything is read', () => {
    const markup = render()
    expect(markup).toContain('Read this post')
    expect(markup).toMatch(/Nothing runs on LinkedIn until you press this/)
    expect(markup).toMatch(/never written to/)
    expect(isDisabled(markup, 'comment-draft')).toBe(true)      // no view typed yet
    expect(isDisabled(markup, 'comment-posted')).toBe(true)     // and nothing to log
    // and it makes no claim about a page nothing has looked at yet
    expect(markup).not.toContain('The page did not give the full post')
  })

  it('offers no way to post, open or click anything on LinkedIn', () => {
    const markup = screenFrom(CLEAN_ENVELOPE)
    expect(markup).not.toContain('href')                        // nothing here is a link that opens
    expect(markup).not.toMatch(/>\s*Post it\s*</i)
    expect(markup).toContain('you post it, we log it')
    expect(markup).toMatch(/records what you tell it you did/)
  })

  it('REGRESSION (Stage 8): a refused envelope reaches the screen as a refusal and kills the log button', () => {
    // The whole chain, as the container runs it: envelope in, unwrapped gate, blockers, markup. If
    // readGate ever reads the wrapper as the payload again, the reasons list vanishes, blockers
    // empties, and this button goes live on a comment the hub refused. Both halves are asserted.
    const markup = screenFrom(REFUSED_ENVELOPE)
    expect(markup).toContain('Not ready to post as written')
    expect(markup).toContain('the post reads plain')
    expect(markup).toContain('match the post')
    expect(markup).toContain('revolve around your whole point')
    expect(isDisabled(markup, 'comment-posted')).toBe(true)
    expect(markup).toContain('Not loggable yet')
  })

  it('shows the two measurements a refusal is MADE of, not just the refusal', () => {
    const markup = screenFrom(REFUSED_ENVELOPE)
    expect(markup).toContain('data-testid="comment-register"')
    expect(markup).toContain('data-testid="comment-coverage"')
    expect(markup).toMatch(/the whole range apart/)
    expect(markup).toContain('12.4 words a sentence')            // the post's own numbers
    expect(markup).toContain('23.3 words a sentence')            // and the comment's
    expect(markup).toMatch(/25%/)                                // how much of his take survived
    expect(markup).toContain('commissioning')                    // and what did not
    expect(markup).toMatch(/no length cap, no banned words/i)    // and nothing else is refused
  })

  it('lets a clean comment through, and says what to do next in the human\'s own hands', () => {
    const markup = screenFrom(CLEAN_ENVELOPE)
    expect(markup).not.toContain('Not ready to post as written')
    expect(markup).toContain('Passes both checks')
    expect(markup).toMatch(/post it on LinkedIn yourself/)
    expect(isDisabled(markup, 'comment-posted')).toBe(false)
  })

  it('says plainly that a thin read is thin, and shows the box Bob chose instead of the vision path', () => {
    const imagePost = capturedPost({ text: '', words: 0, thin: true, hasImage: true })
    const markup = render({ post: imagePost, postText: postTextState(imagePost, '') })
    expect(markup).toContain('The page did not give the full post')
    expect(markup).toMatch(/deliberately not built/)
    expect(markup).toContain('Paste or type the post here')
    expect(markup).toContain('data-testid="comment-thin"')
    expect(markup).toContain('the page had a picture or a video')
  })

  it('stops calling the read thin once the human pasted the post themselves', () => {
    const thinPost = capturedPost({ text: 'Short one.', words: 2, thin: true })
    const pasted = `${LONG_POST} And the operators say so every time.`
    const markup = render({ post: thinPost, pastedPost: pasted, postText: postTextState(thinPost, pasted) })
    expect(markup).not.toContain('The page did not give the full post')
    expect(markup).toContain('yours, used instead of the page')
  })

  it('labels the view box as the thing the comment is built around', () => {
    const markup = render()
    expect(markup).toMatch(/the comment is built around this whole line/i)
    expect(markup).toMatch(/revolves around your entire view/i)
  })

  it('keeps the log button dead while a check is in flight, and says why', () => {
    const gate = readGate(CLEAN_ENVELOPE)
    const markup = render({
      gate,
      text: gate.text,
      checking: true,
      blockers: postedBlockers({
        text: gate.text, checked: true, reasons: [], busy: true, postedAt: null,
      }),
    })
    expect(isDisabled(markup, 'comment-posted')).toBe(true)
    expect(markup).toContain('checking…')
    // and the pass line does not outlive the measurement it was made of
    expect(markup).not.toContain('Passes both checks')
  })

  it('latches once logged, and never claims LinkedIn was asked', () => {
    const gate = readGate(CLEAN_ENVELOPE)
    const markup = render({
      gate,
      text: gate.text,
      postedAt: '2026-09-07T10:00:00Z',
      blockers: postedBlockers({
        text: gate.text, checked: true, reasons: [], busy: false, postedAt: '2026-09-07T10:00:00Z',
      }),
    })
    expect(markup).toContain('Logged as posted')
    expect(isDisabled(markup, 'comment-posted')).toBe(true)
    expect(markup).toMatch(/Nothing here watches LinkedIn/)
  })
})
