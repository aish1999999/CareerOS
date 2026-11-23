import { blockText, blockTextExcluding } from '@/content/adapters/postings/dom'
import { normText } from '@/lib/job-dedupe'

// ---------------------------------------------------------------------------
// LinkedIn post parser (Stage 9 — comments).
//
// PURE, and the same contract as adapters/linkedin/profile.ts: a function of a
// parsed Document (DOMParser — never the live DOM, never `doc.location`, which a
// parsed document does not have) plus the tab URL. Like profile.ts it lives under
// content/adapters/ but is imported from lib/, so it never enters the content-script
// bundle and the extension's blast radius does not widen.
//
// Nothing here touches LinkedIn. It reads a page already in hand — read ONCE, on a
// button press, by the caller — and reports what that page STATES. Nothing posts,
// clicks, opens, or watches anything. Class names churn every few months, so every
// field is selector hints first, then a bounded text scan, then null — never a guess.
//
// What the panel does with each field:
//   text                 what the model is asked to mirror (service/comments.py measures
//                        the post's register and makes the draft match it)
//   author / authorUrl   the `comments` row's post_author / post_author_url
//   postedAgo, counts    shown to the human, acted on by nothing
//   truncated,           THE TWO FLAGS. Bob deferred the vision/screenshot path
//   isImageOnly          (2026-09-07), so an image post and a clamped post are both
//                        cases where the words on the page are not the post. Either
//                        flag means the panel says so and offers a box to paste or
//                        type the post. Getting these wrong is the one expensive
//                        mistake in this file — a comment drafted against half a post
//                        reads like it missed the point — so both lean toward saying
//                        so. In doubt, `truncated`: asking is cheap, guessing is not.
//
// A count that cannot be read is null, NEVER 0. "1,234" and "1.2K" both parse;
// "Dana Whitfield and 1,233 others" does not, deliberately — the reaction summary
// counts everyone but the named person, and a wrong number is worse than no number.
// ---------------------------------------------------------------------------

export interface LinkedInPost {
  /**
   * The canonical activity URL — `https://www.linkedin.com/feed/update/urn:li:activity:<id>` —
   * which is the natural key of a `comments` row. Falls back to the tab URL, tidied, when neither
   * the page nor the address states an activity id.
   */
  url: string
  /** The person or company that posted, as the page prints it. */
  author: string | null
  /** Canonical `https://www.linkedin.com/in/<slug>` (or /company/…), query and tracking stripped. */
  authorUrl: string | null
  /** The line LinkedIn shows under the name. A follower count is not a headline, so it is not used. */
  authorHeadline: string | null
  /** The post body as the page shows it, the "…see more" tail removed. Null when the page states none. */
  text: string | null
  /** As LinkedIn prints it: "2d", "3 weeks ago", "now". Never a date — the page states no date. */
  postedAgo: string | null
  /** Null, not 0, when the page shows no readable number. */
  reactions: number | null
  comments: number | null
  reposts: number | null
  /** The post carries an image, a video or a document and almost no words: the words are not the post. */
  isImageOnly: boolean
  /** The body on the page is not the whole body — a see-more control, a clamp, or nothing readable at all. */
  truncated: boolean
}

// -- URLs -----------------------------------------------------------------------------

const LINKEDIN_HOST_RE = /(?:^|\.)linkedin\.com$/
/** "urn:li:activity:7268123456789012345", also written ugcPost or share. */
const URN_RE = /urn:li:(activity|ugcpost|share):(\d{6,25})/i
/** The same id inside a /posts/ slug: "…-activity-7268123456789012345-AbCd". */
const SLUG_URN_RE = /-(activity|ugcpost|share)-(\d{6,25})/i
const UPDATE_PATH_RE = /^\/(?:embed\/)?feed\/update\//i
const POSTS_PATH_RE = /^\/posts\//i

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value // "%zz" is not the caller's fault; the raw path still carries the id
  }
}

function urnType(raw: string): string {
  const kind = raw.toLowerCase()
  return kind === 'ugcpost' ? 'ugcPost' : kind === 'share' ? 'share' : 'activity'
}

/** The activity URN stated anywhere in a string, in LinkedIn's own casing, or null. */
function urnIn(value: string | null | undefined): string | null {
  const text = normText(value)
  if (!text) return null
  const direct = URN_RE.exec(text)
  if (direct) return `urn:li:${urnType(direct[1])}:${direct[2]}`
  const slug = SLUG_URN_RE.exec(text)
  if (slug) return `urn:li:${urnType(slug[1])}:${slug[2]}`
  return null
}

function activityUrl(urn: string): string {
  return `https://www.linkedin.com/feed/update/${urn}`
}

/** No query, no hash, no trailing slash; a linkedin.com path lowercased, since post slugs are. */
function tidyUrl(raw: string): string {
  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.toLowerCase().replace(/\.$/, '')
    const path = LINKEDIN_HOST_RE.test(host) ? parsed.pathname.toLowerCase() : parsed.pathname
    return `${parsed.protocol}//${host}${path}`.replace(/\/+$/, '')
  } catch {
    return raw
  }
}

/**
 * The canonical activity URL of a post page, or null when this is not one.
 *
 * Canonical because it is the natural key of a `comments` row: LinkedIn writes the same post as
 * `/feed/update/urn:li:activity:123/`, as `/feed/update/urn%3Ali%3Aactivity%3A123`, and as
 * `/posts/<slug>-activity-123-AbCd?utm_source=share`, and all three must produce ONE string or the
 * same post is commented on twice. A /posts/ address with no id in it keeps its own tidied path —
 * it is still a post, and refusing to key it would lose the row entirely.
 */
export function postUrlOf(url: string | null | undefined): string | null {
  const raw = normText(url)
  if (!raw) return null
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (!/^https?:$/i.test(parsed.protocol)) return null
  if (!LINKEDIN_HOST_RE.test(parsed.hostname.toLowerCase().replace(/\.$/, ''))) return null
  const path = decodePath(parsed.pathname)
  const isUpdate = UPDATE_PATH_RE.test(path)
  const isPosts = POSTS_PATH_RE.test(path)
  if (!isUpdate && !isPosts) return null
  const urn = urnIn(path) ?? urnIn(decodePath(parsed.search))
  if (urn) return activityUrl(urn)
  if (isPosts) {
    const tidyPath = path.replace(/\/+$/, '').toLowerCase()
    return tidyPath.length > '/posts/'.length ? `https://www.linkedin.com${tidyPath}` : null
  }
  return null // "/feed/update/" with nothing after it names no post
}

// -- small helpers --------------------------------------------------------------------

function clean(value: unknown, max = 300): string | null {
  const text = normText(value).replace(/^[•·]\s*/, '').trim()
  return text.length > 0 && text.length <= max ? text : null
}

function qsa(root: ParentNode | null | undefined, selector: string): Element[] {
  if (!root) return []
  try {
    return Array.from(root.querySelectorAll(selector))
  } catch {
    return [] // a selector this browser will not parse is not a page fact
  }
}

function firstIn(root: ParentNode | null | undefined, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const els = qsa(root, selector)
    if (els.length) return els[0]
  }
  return null
}

/** Duplicates of visible text, printed for screen readers, and things that are not text at all. */
const HIDDEN_EXCLUDE = ['.visually-hidden', '.sr-only', 'script', 'style', 'svg']

/**
 * The visible lines of a block. LinkedIn prints every string twice — once in a
 * `span[aria-hidden="true"]` for sighted readers and once in a `.visually-hidden` span for screen
 * readers — so the aria-hidden spans ARE the block, in order, deduped. Markup that uses neither
 * (the logged-out page) falls back to the text with the screen-reader copies removed.
 */
function visibleLines(el: Element | null | undefined): string[] {
  if (!el) return []
  const out: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | null | undefined): void => {
    const text = clean(raw, 400)
    if (!text) return
    const key = text.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(text)
  }
  const spans = qsa(el, 'span[aria-hidden="true"]')
  const outer = spans.filter((span) => !spans.some((other) => other !== span && other.contains(span)))
  for (const span of outer) push(blockText(span))
  if (out.length) return out
  for (const line of blockTextExcluding(el, HIDDEN_EXCLUDE).split('\n')) push(line)
  return out
}

/** The first visible line of a block, or null. */
function visibleLine(el: Element | null | undefined, max = 300): string | null {
  const lines = visibleLines(el)
  return lines.length ? clean(lines[0], max) : null
}

/**
 * A meta tag's content. postings/dom.ts has one of these, but it caps at 300 characters and an
 * og:description carrying a post body is longer than that, so this one takes the cap as an argument.
 */
function meta(doc: Document, property: string, max: number): string | null {
  const el = doc.querySelector(`meta[property="${property}"]`) ?? doc.querySelector(`meta[name="${property}"]`)
  return clean(el?.getAttribute('content'), max)
}

// -- the post card --------------------------------------------------------------------

/** Most specific first: the feed card, then the logged-out card, then a bare <article>. */
const ROOT_HINTS = [
  '.feed-shared-update-v2',
  '[class*="feed-shared-update-v2"]',
  '.occludable-update',
  '[data-urn]',
  '[data-id]',
  '[data-activity-urn]',
  'article.main-feed-activity-card',
  '.main-feed-activity-card',
  '[data-test-id="main-feed-activity-card"]',
  '[class*="activity-card"]',
  '[class*="share-update-card"]',
  'article',
]

/** What makes a box a post rather than a nav item: it holds a body or an actor. */
const CARD_PROOF = [
  '[class*="update-components-text"]',
  '[class*="commentary"]',
  '[class*="update-components-actor"]',
  '[class*="feed-shared-actor"]',
  '[class*="entity-lockup"]',
  '[class*="attributed-text-segment-list"]',
]

const URN_ATTRS = ['data-urn', 'data-id', 'data-activity-urn', 'data-entity-urn']

function urnAttr(el: Element): string | null {
  for (const name of URN_ATTRS) {
    const urn = urnIn(el.getAttribute(name))
    if (urn) return urn
  }
  return null
}

/**
 * Comment threads carry their own authors, their own "see more" and their own reaction counts, and
 * every one of those would be read as the post's. They are removed before anything else is read.
 * None of these match `feed-shared-update-v2__commentary` — the post body must survive.
 */
const COMMENT_SUBTREES = [
  '.comments-comments-list',
  '[class*="comments-comment-item"]',
  '[class*="comments-comment-entity"]',
  '[class*="comments-list"]',
  '[class*="comment-item"]',
  '[data-test-id="comments-list"]',
  '.comments-container',
]

interface Card {
  /** A detached clone, comment threads removed. Reading it can never reach the rest of the page. */
  el: Element | null
  /** False when the card is a guess (the address says post, the markup says nothing) — the body is then suspect. */
  certain: boolean
}

/** The post card, preferring the one the address names when the document holds several. */
function cardOf(doc: Document, wantedUrn: string | null): Card {
  for (const hint of ROOT_HINTS) {
    const cards = qsa(doc, hint).filter((el) => urnAttr(el) !== null || firstIn(el, CARD_PROOF) !== null)
    if (!cards.length) continue
    const named = wantedUrn ? cards.find((el) => urnAttr(el) === wantedUrn) : undefined
    const outer = cards.filter((el) => !cards.some((other) => other !== el && other.contains(el)))
    const chosen = named ?? outer[0] ?? cards[0]
    return { el: strip(chosen), certain: true }
  }
  if (wantedUrn) {
    // The address says this is a post and the markup is one we have never seen. Read what is there,
    // and say the body is not to be trusted whole.
    const main = doc.querySelector('main') ?? doc.body
    return { el: main ? strip(main) : null, certain: false }
  }
  return { el: null, certain: false }
}

function strip(el: Element): Element {
  const clone = el.cloneNode(true) as Element
  for (const selector of COMMENT_SUBTREES) {
    for (const junk of qsa(clone, selector)) junk.remove()
  }
  return clone
}

// -- the actor ------------------------------------------------------------------------

const ACTOR_HINTS = [
  '.update-components-actor__meta',
  '.update-components-actor',
  '[class*="update-components-actor"]',
  '.feed-shared-actor',
  '[class*="feed-shared-actor"]',
  '[data-test-id="main-feed-activity-card__entity-lockup"]',
  '.main-feed-activity-card__entity-lockup',
  '[class*="entity-lockup"]',
  'header',
]

const NAME_HINTS = [
  '.update-components-actor__title',
  '[class*="update-components-actor__title"]',
  '.feed-shared-actor__name',
  '[class*="actor__name"]',
  '[data-test-id="actor-name"]',
  'a[href*="/in/"]',
  'a[href*="/company/"]',
]

const HEADLINE_HINTS = [
  '.update-components-actor__description',
  '[class*="update-components-actor__description"]',
  '.feed-shared-actor__description',
  '[class*="actor__description"]',
  '[data-test-id="actor-description"]',
]

/**
 * Headings and paragraphs are a name and a headline INSIDE an actor block. Outside one they are
 * just as likely to be the post body, so they are only used when an actor block was actually found.
 */
const GENERIC_NAME_HINTS = ['h1', 'h2', 'h3']
const GENERIC_HEADLINE_HINTS = ['h4', 'p']

const AGE_HINTS = [
  '.update-components-actor__sub-description',
  '[class*="actor__sub-description"]',
  '[class*="sub-description"]',
  'time',
  '[data-test-id="main-feed-activity-card__entity-lockup"] time',
]

const AUTHOR_PATH_RE = /^\/(?:in|company|school|showcase|newsletters)\/[^/]+/i

/** Furniture that is never a name and never a headline. */
const ACTOR_NOISE_RE = new RegExp([
  '^\\d[\\d,.]*\\s*[kmb]?\\s*(followers?|connections?|reactions?|comments?|reposts?)$',
  '^\\d+(st|nd|rd|th)\\+?(\\s*degree)?(\\s*connection)?$',
  '^(promoted|suggested|following|follow|connect|message|more|like|comment|repost|send|see more|…see more)$',
  '^(view|see|show)\\b.*', '^linkedin$', '^\\+\\s*follow$', '^edited$',
].join('|'), 'i')

/** "2d", "3w", "1mo", "5 hours ago", "now". Longer units first so "mo" beats "m". */
const AGE_SHORT_RE = /^\d+\s?(?:mos|mo|mins|min|hrs|hr|secs|sec|s|m|h|d|w|y)$/i
const AGE_LONG_RE = /^(?:an?|\d+)\s+(?:second|minute|hour|day|week|month|year)s?\s+ago$/i
const AGE_NOW_RE = /^(?:now|just now|today|yesterday)$/i

/** "2d • Edited • Visible to anyone" → "2d". The age is whichever bullet-separated piece is one. */
function parseAge(raw: string | null | undefined): string | null {
  const text = clean(raw, 120)
  if (!text) return null
  for (const piece of text.split(/\s*[•·|]\s*/)) {
    const part = piece.replace(/^(?:posted|reposted)\s+/i, '').replace(/\s*\(edited\)\s*$/i, '').trim()
    if (!part) continue
    if (AGE_SHORT_RE.test(part) || AGE_LONG_RE.test(part) || AGE_NOW_RE.test(part)) return part
  }
  return null
}

/** Canonical, and the same shape lib/outreach.ts keys a lead on, so the two agree about one person. */
function authorLink(scope: Element | null): string | null {
  for (const anchor of qsa(scope, 'a[href]')) {
    const href = normText(anchor.getAttribute('href'))
    if (!href) continue
    let parsed: URL
    try {
      parsed = new URL(href, 'https://www.linkedin.com/')
    } catch {
      continue
    }
    if (!LINKEDIN_HOST_RE.test(parsed.hostname.toLowerCase().replace(/\.$/, ''))) continue
    const match = AUTHOR_PATH_RE.exec(decodePath(parsed.pathname))
    if (!match) continue
    return `https://www.linkedin.com${match[0].toLowerCase().replace(/\/+$/, '')}`
  }
  return null
}

// -- the body -------------------------------------------------------------------------

const BODY_HINTS = [
  '.feed-shared-update-v2__commentary',
  '[class*="feed-shared-update-v2__commentary"]',
  '.update-components-text',
  '[class*="update-components-text"]',
  '[class*="feed-shared-inline-show-more-text"]',
  '[data-test-id="main-feed-activity-card__commentary"]',
  '.main-feed-activity-card__commentary',
  '[class*="attributed-text-segment-list__content"]',
  '[class*="share-update-card__update-text"]',
  '[class*="commentary"]',
]

/**
 * The toggle, never the wrapper. LinkedIn's commentary sits inside a div whose class is
 * `feed-shared-inline-show-more-text` whether or not the post is clamped, so a `[class*="show-more"]`
 * exclusion here would delete the body itself on the next class rename. Only controls are removed.
 */
const BODY_EXCLUDE = [
  ...HIDDEN_EXCLUDE,
  'button',
  '[role="button"]',
  '[class*="see-more-less-toggle"]',
  '[class*="see-more"]',
  '[class*="see-less"]',
  '[class*="inline-show-more-text__button"]',
  '[class*="update-components-image"]',
  '[class*="update-components-linkedin-video"]',
]

/** The same rule: a control that opens the rest of the post — not the container it lives in. */
const SEE_MORE_HINTS = [
  'button[class*="see-more"]',
  'button[class*="show-more"]',
  '[class*="see-more-less-toggle"]',
  '[class*="inline-show-more-text__button"]',
  'a[class*="see-more"]',
  '[role="button"][class*="see-more"]',
  '[data-test-id*="see-more"]',
]

const SEE_MORE_TEXT_RE = /^\s*(?:…|\.\.\.)?\s*(?:see|show|read)\s+more\s*$/i
/** The tail LinkedIn appends inside the text itself when it clamps. */
const SEE_MORE_TAIL_RE = /\s*(?:…|\.\.\.)?\s*(?:see|show|read)\s+more\s*$/i

/**
 * LinkedIn clamps a feed post at roughly 200 characters. A body at least this long that stops
 * without closing a sentence is read as clamped — over-reporting costs a question, under-reporting
 * costs a comment written about half a post.
 */
const CLAMP_MIN = 180
const BODY_MAX = 6000

/** A sentence that closed: punctuation, a closing quote, or the emoji people end a post with. */
function endsClosed(text: string): boolean {
  return /[.!?”’"')\]:;]$/.test(text) || /\p{Extended_Pictographic}$/u.test(text)
}

/**
 * Did the body stop mid-sentence? Trailing hashtags and @mentions are stripped first: half of
 * LinkedIn ends on "#manufacturing", and that is a finished post, not a clamped one.
 */
function endsUnfinished(text: string): boolean {
  const whole = text.trimEnd()
  if (/(?:…|\.\.\.)$/.test(whole)) return true
  const tail = whole.replace(/(?:\s*[#@][\wÀ-ɏ-]+)+$/, '').trimEnd()
  if (!tail) return false
  return !endsClosed(tail)
}

/** Does a see-more control sit on this body — in it, or beside it in its wrapper? */
function hasSeeMore(body: Element, card: Element): boolean {
  let scope: Element | null = body
  for (let depth = 0; depth < 3 && scope; depth++) {
    if (firstIn(scope, SEE_MORE_HINTS)) return true
    for (const el of qsa(scope, 'button, span, a, div')) {
      if (SEE_MORE_TEXT_RE.test(normText(blockText(el)))) return true
    }
    if (scope === card) break
    scope = scope.parentElement
  }
  return false
}

// -- media ----------------------------------------------------------------------------

/**
 * Media the deferred vision path would have read: photos, video, and document carousels (slides,
 * which are images). An article share is NOT here — its headline is text on the page, and the
 * human can read it.
 */
const MEDIA_HINTS = [
  '[class*="update-components-image"]',
  '[class*="update-components-linkedin-video"]',
  '[class*="update-components-video"]',
  '[class*="update-components-document"]',
  '[class*="feed-shared-image"]',
  '[class*="feed-shared-video"]',
  '[class*="feed-shared-linkedin-video"]',
  '[class*="feed-shared-document"]',
  '[class*="feed-shared-carousel"]',
  '[class*="feed-images-content"]',
  '[data-test-id="feed-images-content"]',
  '[class*="main-feed-activity-card__feed-image"]',
  'video',
  'figure img',
]

/** Where an <img> is furniture: an avatar, a reaction icon, an article thumbnail, page chrome. */
const NOT_MEDIA_CONTEXT = [
  '[class*="actor"]', '[class*="avatar"]', '[class*="EntityPhoto"]', '[class*="entity-photo"]',
  '[class*="presence"]', '[class*="social-details"]', '[class*="social-action"]', '[class*="reaction"]',
  '[class*="comment"]', '[class*="icon"]', '[class*="article"]', '[class*="lockup"]',
  'header', 'nav', 'footer', 'button', 'a',
].join(', ')

function hasMedia(card: Element): boolean {
  if (firstIn(card, MEDIA_HINTS)) return true
  for (const img of qsa(card, 'img')) {
    let furniture = false
    try {
      furniture = img.closest(NOT_MEDIA_CONTEXT) !== null
    } catch {
      furniture = true // cannot tell it apart from an avatar: do not call it the post
    }
    if (!furniture) return true
  }
  return false
}

/** How many words the post actually spends. Hashtags, @mentions and links are not the point. */
function substance(text: string | null): number {
  if (!text) return 0
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#@][\wÀ-ɏ-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length
}

/** About a line and a half of caption. More than this and the words are carrying the post. */
const IMAGE_ONLY_MAX = 160

// -- counts ---------------------------------------------------------------------------

const COUNTS_HINTS = [
  '.social-details-social-counts',
  '[class*="social-details-social-counts"]',
  '[class*="social-counts"]',
  '[data-test-id="social-actions"]',
  '[class*="social-actions"]',
  '[class*="social-action"]',
]

/**
 * Elements that hold ONE kind of count and nothing else, so a bare "1,234" in them can be read as
 * that count. A generic `social-details-social-counts__item` is NOT one of these — LinkedIn uses
 * that same class for the reactions row and the comments row, and reading the bare number out of
 * whichever came first is exactly how a post gets 1,234 reposts it never had.
 */
const REACTION_HINTS = [
  '.social-details-social-counts__reactions-count',
  '[class*="reactions-count"]',
  '[class*="reaction-count"]',
  '[data-test-id="social-actions__reaction-count"]',
]
const COMMENT_COUNT_HINTS = [
  '[data-test-id="social-actions__comment-count"]',
  '[class*="comments-count"]',
  '[class*="comment-count"]',
]
const REPOST_HINTS = [
  '[data-test-id="social-actions__repost-count"]',
  '[class*="reposts-count"]',
  '[class*="repost-count"]',
]

const REACTION_WORD = 'reactions?|likes?'
const COMMENT_WORD = 'comments?'
const REPOST_WORD = 'reposts?|shares?'

/** "1,234", "1.234" (thousands, as Europe writes them), "1.2K". */
const COUNT_TOKEN = '\\d[\\d.,]*\\s*[KMB]?'
/** "View all 86 comments" states a count; "Dana and 1,233 others" does not. */
const COUNT_LEAD = '(?:(?:view|see|show)\\s+(?:all\\s+)?)?'

function parseCount(raw: string | null | undefined): number | null {
  const text = normText(raw).replace(/\s+/g, '')
  if (!text) return null
  const m = /^(\d[\d.,]*)([KMB])?$/i.exec(text)
  if (!m) return null
  const body = m[1]
  const suffix = (m[2] ?? '').toUpperCase()
  if (suffix) {
    if (!/^\d{1,3}(?:[.,]\d{1,2})?$/.test(body)) return null
    const value = Number(body.replace(',', '.'))
    if (!Number.isFinite(value)) return null
    return Math.round(value * (suffix === 'K' ? 1e3 : suffix === 'M' ? 1e6 : 1e9))
  }
  if (/^\d+$/.test(body)) return Number(body)
  if (/^\d{1,3}(?:,\d{3})+$/.test(body)) return Number(body.replace(/,/g, ''))
  if (/^\d{1,3}(?:\.\d{3})+$/.test(body)) return Number(body.replace(/\./g, ''))
  return null // "1.5" alone could be 1.5 or 1,500 — say nothing rather than guess
}

/** A count STATED next to its word: "1,234 reactions", "Comments: 86". Anything looser is refused. */
function countStated(text: string | null | undefined, word: string): number | null {
  const line = clean(text, 200)
  if (!line) return null
  const before = new RegExp(`^\\s*${COUNT_LEAD}(${COUNT_TOKEN})\\s+(?:${word})\\b`, 'i')
  const after = new RegExp(`^\\s*(?:${word})\\b\\s*[:\\-]?\\s*(${COUNT_TOKEN})\\s*$`, 'i')
  const m = before.exec(line) ?? after.exec(line)
  return m ? parseCount(m[1]) : null
}

/**
 * One count, read in the order the page is most likely to be honest about it: the attribute
 * LinkedIn puts it in, then an element that holds this count and nothing else, then any aria-label
 * that names it, then any visible line that names it. Null when nothing states it — a post with its
 * counts hidden is not a post with no reactions.
 */
function countIn(scope: Element | null, bareHints: string[], word: string, attr: string): number | null {
  if (!scope) return null
  for (const el of qsa(scope, `[${attr}]`)) {
    const value = parseCount(el.getAttribute(attr))
    if (value !== null) return value
  }
  for (const el of qsa(scope, bareHints.join(', '))) {
    const label = countStated(el.getAttribute('aria-label'), word)
    if (label !== null) return label
    const line = visibleLine(el, 200)
    const stated = countStated(line, word)
    if (stated !== null) return stated
    const bare = parseCount(line)
    if (bare !== null) return bare
  }
  for (const el of qsa(scope, '[aria-label]')) {
    const label = countStated(el.getAttribute('aria-label'), word)
    if (label !== null) return label
  }
  for (const line of blockTextExcluding(scope, HIDDEN_EXCLUDE).split('\n')) {
    const stated = countStated(line, word)
    if (stated !== null) return stated
  }
  return null
}

// -- the parse ------------------------------------------------------------------------

const NOTHING: Omit<LinkedInPost, 'url'> = {
  author: null, authorHeadline: null, authorUrl: null, text: null, postedAgo: null,
  reactions: null, comments: null, reposts: null, isImageOnly: false,
  // Nothing was read, so nothing can be called whole.
  truncated: true,
}

/**
 * A LinkedIn post page (or a feed document) → what it states. Never throws: an empty document, a
 * profile page, a page whose markup changed overnight all give nulls and `truncated: true`, which
 * is exactly the signal the panel needs to ask the human to paste the post.
 */
export function parseLinkedInPost(doc: Document, url: string): LinkedInPost {
  const tab = normText(url)
  if (!doc || typeof doc.querySelector !== 'function') return { url: tab, ...NOTHING }

  const canonicalTab = postUrlOf(tab)
  const wantedUrn = canonicalTab ? urnIn(canonicalTab) : null
  const { el: card, certain } = cardOf(doc, wantedUrn)

  const statedUrl = postUrlOf(doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '')
    ?? postUrlOf(meta(doc, 'og:url', 600) ?? '')
  const cardUrn = card ? urnAttr(card) : null
  const post: LinkedInPost = {
    url: canonicalTab ?? (cardUrn ? activityUrl(cardUrn) : null) ?? statedUrl ?? (tab ? tidyUrl(tab) : ''),
    ...NOTHING,
  }
  if (!card) return post

  // -- the actor: name, link, headline, age
  const actorEl = firstIn(card, ACTOR_HINTS)
  const actor = actorEl ?? card
  const nameHints = actorEl ? [...NAME_HINTS, ...GENERIC_NAME_HINTS] : NAME_HINTS
  const nameEl = firstIn(actor, nameHints)
  const name = visibleLine(nameEl, 120)
  post.author = name && !ACTOR_NOISE_RE.test(name) ? name : null
  post.authorUrl = authorLink(actor) ?? authorLink(card)

  const nameKey = (post.author ?? '').toLowerCase()
  const headlineHints = actorEl ? [...HEADLINE_HINTS, ...GENERIC_HEADLINE_HINTS] : HEADLINE_HINTS
  for (const hint of headlineHints) {
    for (const el of qsa(actor, hint)) {
      const line = visibleLine(el, 260)
      if (!line || line.toLowerCase() === nameKey) continue
      if (ACTOR_NOISE_RE.test(line) || parseAge(line)) continue
      post.authorHeadline = line
      break
    }
    if (post.authorHeadline) break
  }

  for (const hint of AGE_HINTS) {
    for (const el of qsa(actor, hint)) {
      const age = parseAge(visibleLine(el, 120))
      if (age) {
        post.postedAgo = age
        break
      }
    }
    if (post.postedAgo) break
  }
  if (!post.postedAgo) {
    for (const line of visibleLines(actor)) {
      const age = parseAge(line)
      if (age) {
        post.postedAgo = age
        break
      }
    }
  }

  if (!post.author) {
    // The logged-out page states it in the title: "Dana Whitfield on LinkedIn: …".
    const title = meta(doc, 'og:title', 400) ?? clean(doc.querySelector('title')?.textContent, 400)
    const m = title ? /^(.{2,80}?)\s+on\s+LinkedIn\b/i.exec(title) : null
    post.author = m ? clean(m[1], 120) : null
  }

  // -- the body, and whether it is all of it
  let truncated = !certain // markup we did not recognise: read it, but do not vouch for it
  const bodyEl = firstIn(card, BODY_HINTS)
  if (bodyEl) {
    if (hasSeeMore(bodyEl, card)) truncated = true
    let body = blockTextExcluding(bodyEl, BODY_EXCLUDE).trim()
    if (SEE_MORE_TAIL_RE.test(body)) {
      body = body.replace(SEE_MORE_TAIL_RE, '').trim()
      truncated = true
    }
    if (body.length > BODY_MAX) {
      body = body.slice(0, BODY_MAX).trim()
      truncated = true
    }
    post.text = body.length > 0 ? body : null
  }
  if (!post.text) {
    // Nothing in the card: the page's own summary of the post, which LinkedIn writes clamped.
    const described = meta(doc, 'og:description', 4000)
    if (described) {
      post.text = described.replace(SEE_MORE_TAIL_RE, '').trim() || null
      truncated = true
    }
  }
  if (!post.text) truncated = true
  else if (post.text.length >= CLAMP_MIN && endsUnfinished(post.text)) truncated = true
  post.truncated = truncated

  // -- media: an image post with a caption is not a post we can read
  post.isImageOnly = hasMedia(card) && substance(post.text) <= IMAGE_ONLY_MAX

  // -- the counts, from the social bar only
  const counts = firstIn(card, COUNTS_HINTS)
  post.reactions = countIn(counts, REACTION_HINTS, REACTION_WORD, 'data-num-reactions')
  post.comments = countIn(counts, COMMENT_COUNT_HINTS, COMMENT_WORD, 'data-num-comments')
  post.reposts = countIn(counts, REPOST_HINTS, REPOST_WORD, 'data-num-reposts')
  return post
}
