import type { TailorRequest } from '@contract/types'

// ---------------------------------------------------------------------------
// Job-description capture.
//
// content/context.ts already resolves {company, role, location} from JSON-LD →
// meta → adapter → title. It does NOT pull the description, because nothing
// needed the JD body until now.
//
// Rather than widen that module — and touch the content script that carries the
// detect/match/fill machinery — this captures via chrome.scripting from the
// extension page. Fully additive: no content-script edit, no new permission
// ('scripting' is already granted), no risk to the existing suite.
//
// The trade: chrome.scripting SERIALISES the injected function, so it cannot
// import anything and must stay self-contained. That is why the JSON-LD walk
// below is duplicated rather than shared. Keep it small; anything clever
// belongs on the Mapper side where it can be tested properly.
// ---------------------------------------------------------------------------

export interface CapturedJd {
  role: string | null
  company: string | null
  location: string | null
  jdText: string
  url: string | null
  /** How the description was found — shown in the UI so a bad grab is obvious. */
  source: 'jsonld' | 'main' | 'article' | 'largest-block' | 'body' | 'none'
}

/** Runs INSIDE the page. Self-contained by necessity — see the note above. */
function captureInPage(): CapturedJd {
  const clean = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t.length > 0 && t.length < 300 ? t : null
  }

  const stripHtml = (html: string): string => {
    const div = document.createElement('div')
    div.innerHTML = html
    return (div.textContent ?? '').replace(/ /g, ' ')
  }

  const tidy = (text: string): string =>
    text
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim()

  const findPosting = (node: unknown): Record<string, unknown> | null => {
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = findPosting(item)
        if (hit) return hit
      }
      return null
    }
    if (typeof node !== 'object' || node === null) return null
    const obj = node as Record<string, unknown>
    const type = obj['@type']
    if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return obj
    if (obj['@graph']) return findPosting(obj['@graph'])
    return null
  }

  let role: string | null = null
  let company: string | null = null
  let location: string | null = null
  let jdText = ''
  let source: CapturedJd['source'] = 'none'

  // --- 1. JSON-LD JobPosting: structured, and it carries the description ----
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    let parsed: unknown
    try {
      parsed = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    const posting = findPosting(parsed)
    if (!posting) continue

    role = clean(posting.title)
    const org = posting.hiringOrganization as Record<string, unknown> | string | undefined
    company = typeof org === 'string' ? clean(org) : clean(org?.name)

    const jobLocation = posting.jobLocation
    const first = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation
    if (first && typeof first === 'object') {
      const address = (first as Record<string, unknown>).address
      if (address && typeof address === 'object') {
        const a = address as Record<string, unknown>
        location = clean(a.addressLocality) ?? clean(a.addressRegion) ?? clean(a.addressCountry)
      } else {
        location = clean((first as Record<string, unknown>).name)
      }
    }

    if (typeof posting.description === 'string' && posting.description.trim().length > 200) {
      jdText = tidy(stripHtml(posting.description))
      source = 'jsonld'
    }
    break
  }

  // --- 2. DOM fallbacks, cheapest and most semantic first -------------------
  if (!jdText) {
    const semantic: [string, CapturedJd['source']][] = [
      ['[data-automation-id="jobPostingDescription"]', 'main'],
      ['#job-details', 'main'],
      ['.job-description', 'main'],
      ['[class*="jobDescription"]', 'main'],
      ['article', 'article'],
      ['main', 'main'],
    ]
    for (const [selector, label] of semantic) {
      const el = document.querySelector(selector)
      const text = tidy(el?.textContent ?? '')
      if (text.length > 400) {
        jdText = text
        source = label
        break
      }
    }
  }

  // --- 3. Largest plausible text block --------------------------------------
  if (!jdText) {
    let best = ''
    for (const el of Array.from(document.querySelectorAll('div, section, td'))) {
      if (el.querySelector('nav, header, footer')) continue
      const text = tidy(el.textContent ?? '')
      if (text.length > best.length && text.length < 40000) best = text
    }
    if (best.length > 400) {
      jdText = best
      source = 'largest-block'
    } else {
      const body = tidy(document.body?.innerText ?? '')
      if (body.length > 400) {
        jdText = body
        source = 'body'
      }
    }
  }

  // --- 4. Title heuristics for anything still missing ------------------------
  if (!role || !company) {
    const title = document.title ?? ''
    const at = title.split(/\s+at\s+/i)
    if (at.length === 2) {
      role = role ?? clean(at[0])
      company = company ?? clean(at[1].split(/[|—–-]/)[0])
    } else {
      const parts = title.split(/\s*[|—–]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        role = role ?? clean(parts[0])
        company = company ?? clean(parts[parts.length - 1])
      } else {
        role = role ?? clean(title)
      }
    }
  }

  return {
    role,
    company,
    location,
    jdText: jdText.slice(0, 60000),
    url: location_href(),
    source,
  }

  function location_href(): string | null {
    try {
      return window.location.href
    } catch {
      return null
    }
  }
}

/** Capture from the active tab's top frame. Requires the activeTab grant. */
export async function captureActiveTabJd(): Promise<CapturedJd> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id || !tab.url || !/^https?:/.test(tab.url)) {
    throw new Error('Open the job posting in the active tab first.')
  }
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [0] },
    func: captureInPage,
  })
  const captured = injection?.result as CapturedJd | undefined
  if (!captured) throw new Error('Could not read that page.')
  return captured
}

/** Turn a capture into a request, or explain what is missing. */
export function toRequest(
  captured: CapturedJd,
  overrides: Partial<TailorRequest> = {},
): { request: TailorRequest } | { problem: string } {
  const role = (overrides.role ?? captured.role ?? '').trim()
  const jdText = (overrides.jdText ?? captured.jdText ?? '').trim()

  if (role.length < 2) return { problem: 'No job title found — type one in before running.' }
  if (jdText.length < 200) {
    return {
      problem:
        captured.source === 'none'
          ? 'No job description found on this page — paste it in instead.'
          : `Only ${jdText.length} characters captured (from ${captured.source}) — that is page chrome, not a posting. Paste the description instead.`,
    }
  }

  return {
    request: {
      role,
      company: overrides.company ?? captured.company,
      location: overrides.location ?? captured.location,
      jdText,
      url: overrides.url ?? captured.url,
      source: 'extension',
      ...(overrides.options ? { options: overrides.options } : {}),
    },
  }
}
