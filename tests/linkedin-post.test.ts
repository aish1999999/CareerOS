import { describe, expect, it } from 'vitest'
import { parseLinkedInPost, postUrlOf } from '@/content/adapters/linkedin/post'

// Stage 9 — the LinkedIn post parser.
//
// No saved post pages live in the repo, so the fixtures are written here, shaped like the real
// page: the feed card with its `data-urn`, every string printed twice (once aria-hidden, once
// .visually-hidden), the "· Edited" sub-description, the see-more toggle as a sibling of the
// commentary, the counts written "1,234" and "1.2K", and the logged-out card, which LinkedIn
// renders with entirely different class names.
//
// The two flags carry the weight. Bob deferred the vision path, so `truncated` and `isImageOnly`
// are how the panel knows to stop and ask the human to paste the post instead of drafting a
// comment about half of one.

const doc = (html = ''): Document => new DOMParser().parseFromString(html, 'text/html')

const ACTIVITY = '7268123456789012345'
const CANONICAL = `https://www.linkedin.com/feed/update/urn:li:activity:${ACTIVITY}`

// -- the feed card, as LinkedIn writes it ---------------------------------------------

const ACTOR = `
  <div class="update-components-actor">
    <a class="update-components-actor__meta-link" href="https://www.linkedin.com/in/Dana-Whitfield?miniProfileUrn=urn%3Ali%3Afsd_profile%3AACoAA">
      <div class="update-components-actor__avatar">
        <img class="update-components-actor__avatar-image" alt="Dana Whitfield" src="https://media.licdn.com/dms/image/profile.jpg">
      </div>
      <span class="update-components-actor__title">
        <span dir="ltr"><span aria-hidden="true">Dana Whitfield</span><span class="visually-hidden">Dana Whitfield</span></span>
      </span>
      <span class="update-components-actor__description">
        <span aria-hidden="true">Director of Operations at Kestrel Grid</span><span class="visually-hidden">Director of Operations at Kestrel Grid</span>
      </span>
      <span class="update-components-actor__sub-description">
        <span aria-hidden="true">2d • Edited • <span class="visually-hidden">Visible to anyone</span></span>
      </span>
    </a>
  </div>`

/** One feed card, with whatever body, media and counts a test needs. */
const feedPost = (parts: { body: string; media?: string; counts?: string }): string => `
<html>
<head><link rel="canonical" href="${CANONICAL}/"></head>
<body>
<nav class="global-nav"><a href="/feed/">Home</a></nav>
<main>
  <div class="feed-shared-update-v2" data-urn="urn:li:activity:${ACTIVITY}">
    ${ACTOR}
    <div class="feed-shared-update-v2__description-wrapper">
      <div class="feed-shared-inline-show-more-text feed-shared-update-v2__description">
        ${parts.body}
      </div>
    </div>
    ${parts.media ?? ''}
    ${parts.counts ?? ''}
  </div>
</main>
</body>
</html>`

const commentary = (text: string): string => `
        <div class="update-components-text relative feed-shared-update-v2__commentary">
          <span class="break-words"><span dir="ltr">${text}</span></span>
        </div>`

const COUNTS = `
    <div class="social-details-social-counts">
      <ul class="social-details-social-counts__list">
        <li class="social-details-social-counts__item social-details-social-counts__reactions">
          <button aria-label="1,234 reactions"><span class="social-details-social-counts__reactions-count">1,234</span></button>
        </li>
        <li class="social-details-social-counts__item social-details-social-counts__comments">
          <button aria-label="86 comments"><span aria-hidden="true">86 comments</span></button>
        </li>
        <li class="social-details-social-counts__item">
          <button aria-label="12 reposts"><span aria-hidden="true">12 reposts</span></button>
        </li>
      </ul>
    </div>`

/** A comment thread carries its own author, its own see-more and its own reaction count. */
const COMMENT_THREAD = `
    <div class="comments-comments-list">
      <article class="comments-comment-entity">
        <a class="comments-post-meta__actor-link" href="https://www.linkedin.com/in/marcus-feld/">
          <span aria-hidden="true">Marcus Feld</span>
        </a>
        <span class="comments-comment-item__main-content"><span aria-hidden="true">Ours drifted the same way. …see more</span></span>
        <span class="comments-comment-social-bar__reactions-count">1</span>
      </article>
    </div>`

// -- a full text post -----------------------------------------------------------------

const WHOLE = 'A maintenance backlog is not a list of jobs. It is a forecast of the next twelve months of '
  + 'unplanned downtime, written in the order you will pay for it. We started reading ours that way in '
  + 'March, and the argument about headcount ended in a week.'

const FULL = feedPost({ body: commentary(WHOLE), counts: COUNTS + COMMENT_THREAD })

describe('parseLinkedInPost — a full text post', () => {
  const post = parseLinkedInPost(doc(FULL), `${CANONICAL}/?utm_source=share&utm_medium=member_desktop`)

  it('keys the row on the activity URL, not on the address with its tracking', () => {
    expect(post.url).toBe(CANONICAL)
  })

  it('reads the author, their profile link and their headline off the post header', () => {
    expect(post.author).toBe('Dana Whitfield')
    expect(post.authorUrl).toBe('https://www.linkedin.com/in/dana-whitfield')
    expect(post.authorHeadline).toBe('Director of Operations at Kestrel Grid')
  })

  it('reads the age as LinkedIn prints it, without the rest of the sub-description', () => {
    expect(post.postedAgo).toBe('2d')
  })

  it('reads the whole body, once, with no screen-reader copy doubled into it', () => {
    expect(post.text).toBe(WHOLE)
  })

  it('reads counts written with thousands separators', () => {
    expect(post.reactions).toBe(1234)
    expect(post.comments).toBe(86)
    expect(post.reposts).toBe(12)
  })

  it('calls a finished post finished — the show-more WRAPPER is not a see-more control', () => {
    // `feed-shared-inline-show-more-text` wraps every feed commentary, clamped or not. Reading the
    // wrapper as a toggle would flag every post on LinkedIn and make the flag worth nothing.
    expect(post.truncated).toBe(false)
    expect(post.isImageOnly).toBe(false)
  })

  it('never mistakes a comment thread for the post', () => {
    expect(post.author).not.toBe('Marcus Feld')
    expect(post.text).not.toMatch(/drifted the same way/)
    expect(post.reactions).toBe(1234) // not the 1 reaction on Marcus's comment
    expect(post.truncated).toBe(false) // not the "…see more" on Marcus's comment
  })
})

// -- clamped: the see-more control ----------------------------------------------------

const CLAMPED_BODY = `
        <div class="update-components-text relative feed-shared-update-v2__commentary">
          <span class="break-words"><span dir="ltr">We rebuilt the changeover procedure last quarter and the first thing we learned is that the written standard had drifted from what the crews actually run on nights, which is</span></span>
        </div>
        <button class="feed-shared-inline-show-more-text__see-more-less-toggle see-more" aria-label="see more">…see more</button>`

describe('parseLinkedInPost — a post behind a see-more control', () => {
  const post = parseLinkedInPost(doc(feedPost({ body: CLAMPED_BODY, counts: COUNTS })), `${CANONICAL}/`)

  it('says the body is not all of it', () => {
    expect(post.truncated).toBe(true)
  })

  it('still hands over what it could read, without the toggle in it', () => {
    expect(post.text).toMatch(/^We rebuilt the changeover procedure/)
    expect(post.text).not.toMatch(/see more/i)
  })
})

// -- clamped: no control, the text just stops ------------------------------------------

const CUT_OFF = 'Every plant I have worked in keeps two schedules: the one in the CMMS and the one the crews '
  + 'actually run on nights. The gap between them is where reliability goes to die, and closing it starts with'

const FINISHED_WITH_TAGS = 'Every plant I have worked in keeps two schedules: the one in the CMMS and the one the '
  + 'crews actually run on nights. The gap between them is where reliability goes to die. '
  + '#maintenance #reliability #manufacturing'

describe('parseLinkedInPost — a body that stops mid-sentence', () => {
  it('reads a long body with no closing punctuation as clamped', () => {
    const post = parseLinkedInPost(doc(feedPost({ body: commentary(CUT_OFF) })), `${CANONICAL}/`)
    expect(post.text).toBe(CUT_OFF)
    expect(post.truncated).toBe(true)
  })

  it('does not call a post clamped for ending on hashtags, which half of LinkedIn does', () => {
    const post = parseLinkedInPost(doc(feedPost({ body: commentary(FINISHED_WITH_TAGS) })), `${CANONICAL}/`)
    expect(post.truncated).toBe(false)
  })
})

// -- an image post with a one-line caption ---------------------------------------------

const IMAGE = `
    <div class="update-components-image update-components-image--single-image">
      <img class="ivm-view-attr__img--centered" alt="The night crew" src="https://media.licdn.com/dms/image/feedshare-shrink_800/0/1730000000000">
    </div>`

const CAPTION = 'Proud of this crew. Six months, zero recordables. 👏 #manufacturing #safety'

describe('parseLinkedInPost — an image post with a one-line caption', () => {
  const post = parseLinkedInPost(doc(feedPost({ body: commentary(CAPTION), media: IMAGE, counts: COUNTS })), `${CANONICAL}/`)

  it('says the words on the page are not the post', () => {
    expect(post.isImageOnly).toBe(true)
  })

  it('hands over the caption it did read, and does not pretend the caption was cut off', () => {
    expect(post.text).toBe(CAPTION)
    expect(post.truncated).toBe(false)
  })

  it('does not call the author avatar media — a text post with a headshot is still a text post', () => {
    const text = parseLinkedInPost(doc(feedPost({ body: commentary(CAPTION), counts: COUNTS })), `${CANONICAL}/`)
    expect(text.isImageOnly).toBe(false)
  })

  it('reads a video post the same way', () => {
    const video = '<div class="update-components-linkedin-video"><video src="blob:https://www.linkedin.com/abc"></video></div>'
    const post2 = parseLinkedInPost(doc(feedPost({ body: commentary(CAPTION), media: video })), `${CANONICAL}/`)
    expect(post2.isImageOnly).toBe(true)
  })

  it('leaves a long post with an image alone — the words are carrying it', () => {
    const post2 = parseLinkedInPost(doc(feedPost({ body: commentary(WHOLE), media: IMAGE })), `${CANONICAL}/`)
    expect(post2.isImageOnly).toBe(false)
  })
})

// -- markup we have never seen ----------------------------------------------------------

const UNKNOWN = `
<html><body><main>
  <div class="whatever-linkedin-ships-next">
    <span>Dana Whitfield</span>
    <p>A maintenance backlog is not a list of jobs.</p>
  </div>
</main></body></html>`

describe('parseLinkedInPost — a post page whose markup changed overnight', () => {
  const post = parseLinkedInPost(doc(UNKNOWN), `${CANONICAL}/`)

  it('still keys the row on the address, which did not change', () => {
    expect(post.url).toBe(CANONICAL)
  })

  it('reports what it could not read instead of inventing a body', () => {
    expect(post.text).toBeNull()
    expect(post.truncated).toBe(true)
    expect(post.reactions).toBeNull()
  })
})

// -- counts written the short way -------------------------------------------------------

const SHORT_COUNTS = `
    <div class="social-details-social-counts">
      <ul class="social-details-social-counts__list">
        <li class="social-details-social-counts__item social-details-social-counts__reactions">
          <button aria-label="1.2K reactions"><span class="social-details-social-counts__reactions-count">1.2K</span></button>
        </li>
        <li class="social-details-social-counts__item social-details-social-counts__comments">
          <button aria-label="3.4K comments"><span aria-hidden="true">3.4K comments</span></button>
        </li>
        <li class="social-details-social-counts__item">
          <button aria-label="2K reposts"><span aria-hidden="true">2K reposts</span></button>
        </li>
      </ul>
    </div>`

describe('parseLinkedInPost — counts written as 1.2K', () => {
  const post = parseLinkedInPost(doc(feedPost({ body: commentary(WHOLE), counts: SHORT_COUNTS })), `${CANONICAL}/`)

  it('reads the short form as the number it stands for', () => {
    expect(post.reactions).toBe(1200)
    expect(post.comments).toBe(3400)
    expect(post.reposts).toBe(2000)
  })
})

// -- counts that are not there, and counts that cannot be read ---------------------------

const SOCIAL_PROOF_ONLY = `
    <div class="social-details-social-counts">
      <span class="social-details-social-counts__social-proof-text">Dana Whitfield and 1,233 others</span>
    </div>`

describe('parseLinkedInPost — a post with no counts', () => {
  it('reports null, never zero, when the page shows no counts at all', () => {
    const post = parseLinkedInPost(doc(feedPost({ body: commentary(WHOLE) })), `${CANONICAL}/`)
    expect(post.reactions).toBeNull()
    expect(post.comments).toBeNull()
    expect(post.reposts).toBeNull()
  })

  it('refuses a number it cannot attribute — "and 1,233 others" counts everyone but Dana', () => {
    const post = parseLinkedInPost(doc(feedPost({ body: commentary(WHOLE), counts: SOCIAL_PROOF_ONLY })), `${CANONICAL}/`)
    expect(post.reactions).toBeNull()
    expect(post.comments).toBeNull()
    expect(post.reposts).toBeNull()
  })
})

// -- the logged-out card, which is a different page entirely -----------------------------

const PUBLIC = `
<html>
<head>
  <meta property="og:url" content="https://www.linkedin.com/posts/dana-whitfield_reliability-activity-${ACTIVITY}-AbCd">
  <meta property="og:title" content="Dana Whitfield on LinkedIn: A maintenance backlog is not a list of jobs">
</head>
<body>
<article class="main-feed-activity-card" data-activity-urn="urn:li:activity:${ACTIVITY}">
  <div class="main-feed-activity-card__entity-lockup">
    <a href="https://www.linkedin.com/in/dana-whitfield?trk=public_post_feed-actor-name">
      <h3 class="base-main-feed-card__entity-lockup-title">Dana Whitfield</h3>
    </a>
    <p class="base-main-feed-card__entity-lockup-subtitle">Director of Operations at Kestrel Grid</p>
    <time class="main-feed-activity-card__entity-lockup-time">3 weeks ago</time>
  </div>
  <p class="attributed-text-segment-list__content">${WHOLE}</p>
  <div class="main-feed-activity-card__social-actions">
    <a data-test-id="social-actions__reaction-count" href="/signup">1,234</a>
    <a data-test-id="social-actions__comments" data-num-comments="86" href="/signup">86 comments</a>
  </div>
</article>
</body>
</html>`

describe('parseLinkedInPost — the logged-out post page', () => {
  const post = parseLinkedInPost(doc(PUBLIC), `https://www.linkedin.com/posts/dana-whitfield_reliability-activity-${ACTIVITY}-AbCd?utm_source=share`)

  it('gives the /posts/ address the same key the feed address gets — one post, one row', () => {
    expect(post.url).toBe(CANONICAL)
  })

  it('reads the actor out of markup that shares no class name with the feed', () => {
    expect(post.author).toBe('Dana Whitfield')
    expect(post.authorUrl).toBe('https://www.linkedin.com/in/dana-whitfield')
    expect(post.authorHeadline).toBe('Director of Operations at Kestrel Grid')
    expect(post.postedAgo).toBe('3 weeks ago')
  })

  it('reads the body and the counts, including the one written in an attribute', () => {
    expect(post.text).toBe(WHOLE)
    expect(post.reactions).toBe(1234)
    expect(post.comments).toBe(86)
    expect(post.reposts).toBeNull()
    expect(post.truncated).toBe(false)
  })
})

// -- pages that are not posts -----------------------------------------------------------

const PROFILE = `
<html>
<head><link rel="canonical" href="https://www.linkedin.com/in/dana-whitfield/"></head>
<body><main>
  <section class="artdeco-card pv-top-card">
    <h1 class="text-heading-xlarge">Dana Whitfield</h1>
    <div class="text-body-medium break-words">Director of Operations at Kestrel Grid</div>
  </section>
</main></body>
</html>`

describe('parseLinkedInPost — a page that is not a post', () => {
  const post = parseLinkedInPost(doc(PROFILE), 'https://www.linkedin.com/in/dana-whitfield/')

  it('reads nothing off it rather than reading a profile as a post', () => {
    expect(post.author).toBeNull()
    expect(post.text).toBeNull()
    expect(post.postedAgo).toBeNull()
    expect(post.reactions).toBeNull()
    expect(post.comments).toBeNull()
    expect(post.reposts).toBeNull()
    expect(post.isImageOnly).toBe(false)
  })

  it('says the body is not whole, which is what makes the panel ask instead of draft', () => {
    expect(post.truncated).toBe(true)
  })

  it('still hands back the address it was given, tidied', () => {
    expect(post.url).toBe('https://www.linkedin.com/in/dana-whitfield')
  })

  it('does not throw on an empty document', () => {
    const empty = parseLinkedInPost(doc(''), 'https://www.linkedin.com/feed/')
    expect(empty.text).toBeNull()
    expect(empty.truncated).toBe(true)
    expect(empty.url).toBe('https://www.linkedin.com/feed')
  })
})

// -- the key ------------------------------------------------------------------------------

describe('postUrlOf', () => {
  it('canonicalises the feed address', () => {
    expect(postUrlOf(`${CANONICAL}/`)).toBe(CANONICAL)
    expect(postUrlOf(`${CANONICAL}/?commentUrn=urn%3Ali%3Acomment%3A(activity%3A1%2C2)`)).toBe(CANONICAL)
  })

  it('reads the urn LinkedIn wrote encoded, on any of its country hosts', () => {
    expect(postUrlOf(`https://in.linkedin.com/feed/update/urn%3Ali%3Aactivity%3A${ACTIVITY}`)).toBe(CANONICAL)
  })

  it('gives a /posts/ share link the same key — the same post from two addresses is one row', () => {
    expect(postUrlOf(`https://www.linkedin.com/posts/dana-whitfield_reliability-activity-${ACTIVITY}-AbCd?utm_source=share`))
      .toBe(CANONICAL)
  })

  it('keeps a ugcPost urn as a ugcPost, in LinkedIn\'s own casing', () => {
    expect(postUrlOf(`https://www.linkedin.com/feed/update/urn:li:ugcPost:${ACTIVITY}/`))
      .toBe(`https://www.linkedin.com/feed/update/urn:li:ugcPost:${ACTIVITY}`)
  })

  it('keys a /posts/ address that states no id on its own tidied path', () => {
    expect(postUrlOf('https://www.linkedin.com/posts/Kestrel-Grid_We-Are-Hiring/'))
      .toBe('https://www.linkedin.com/posts/kestrel-grid_we-are-hiring')
  })

  it('refuses everything that is not a post', () => {
    expect(postUrlOf('https://www.linkedin.com/in/dana-whitfield/')).toBeNull()
    expect(postUrlOf('https://www.linkedin.com/feed/')).toBeNull()
    expect(postUrlOf('https://www.linkedin.com/feed/update/')).toBeNull()
    expect(postUrlOf('https://www.linkedin.com/pulse/backlog-forecast-dana-whitfield')).toBeNull()
    expect(postUrlOf(`https://example.com/feed/update/urn:li:activity:${ACTIVITY}`)).toBeNull()
    expect(postUrlOf('chrome://extensions')).toBeNull()
    expect(postUrlOf('not a url')).toBeNull()
    expect(postUrlOf('')).toBeNull()
    expect(postUrlOf(null)).toBeNull()
  })
})
