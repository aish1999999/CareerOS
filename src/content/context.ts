import type { ContextSource, PageContext } from '@/types'
import { getAdapter } from '@/content/adapters/index'

// ---------------------------------------------------------------------------
// Page context extractor (Section 7). Pulls {company, role, location} for
// template variables. Extraction order, first hit wins per field:
//   1. schema.org JSON-LD JobPosting   2. OpenGraph/meta
//   3. per-ATS adapter selectors       4. document.title heuristics
// Pure: reads the document, writes nothing.
// ---------------------------------------------------------------------------

type Partial3 = { company?: string | null; role?: string | null; location?: string | null }

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t.length > 0 && t.length < 200 ? t : null
}

// ---- 1. JSON-LD -------------------------------------------------------------

function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }
  if (typeof node !== 'object' || node === null) return null
  const obj = node as Record<string, unknown>
  const type = obj['@type']
  if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) return obj
  if (obj['@graph']) return findJobPosting(obj['@graph'])
  return null
}

function extractJsonLd(doc: Document): Partial3 | null {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    const posting = findJobPosting(parsed)
    if (!posting) continue

    const org = posting.hiringOrganization as Record<string, unknown> | string | undefined
    const company =
      typeof org === 'string' ? clean(org) : clean((org as Record<string, unknown>)?.name)

    let location: string | null = null
    const jobLocation = posting.jobLocation
    const firstLocation = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation
    if (typeof firstLocation === 'object' && firstLocation !== null) {
      const address = (firstLocation as Record<string, unknown>).address
      if (typeof address === 'object' && address !== null) {
        const a = address as Record<string, unknown>
        location =
          clean(a.addressLocality) ??
          clean(a.addressRegion) ??
          clean(a.addressCountry)
      } else {
        location = clean((firstLocation as Record<string, unknown>).name)
      }
    }

    return { company, role: clean(posting.title), location }
  }
  return null
}

// ---- 2. OpenGraph / meta ----------------------------------------------------

function metaContent(doc: Document, property: string): string | null {
  const el =
    doc.querySelector(`meta[property="${property}"]`) ??
    doc.querySelector(`meta[name="${property}"]`)
  return clean(el?.getAttribute('content'))
}

function extractMeta(doc: Document): Partial3 {
  const ogTitle = metaContent(doc, 'og:title')
  const fromOgTitle = ogTitle ? splitTitle(ogTitle) : {}
  return {
    company: metaContent(doc, 'og:site_name') ?? fromOgTitle.company,
    role: fromOgTitle.role ?? ogTitle,
  }
}

// ---- 4. Title heuristics ----------------------------------------------------

/** "Senior Engineer at Acme" / "Senior Engineer — Acme" / "Acme | Senior Engineer" */
export function splitTitle(title: string): Partial3 {
  const at = title.split(/\s+at\s+/i)
  if (at.length === 2) return { role: clean(at[0]), company: clean(at[1].split(/[|—–-]/)[0]) }
  const parts = title.split(/\s*[|—–]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return { role: clean(parts[0]), company: clean(parts[parts.length - 1]) }
  return { role: clean(title) }
}

// ---- Merge ------------------------------------------------------------------

export function extractPageContext(doc: Document = document): PageContext {
  const layers: { data: Partial3 | null; source: ContextSource }[] = [
    { data: extractJsonLd(doc), source: 'jsonld' },
    { data: extractMeta(doc), source: 'meta' },
    {
      // createHTMLDocument (tests) and detached docs have a null location;
      // doc passed through so vanity domains fingerprint to their platform
      data: doc.location ? getAdapter(doc.location.hostname, doc)?.context?.(doc) ?? null : null,
      source: 'adapter',
    },
    { data: doc.title ? splitTitle(doc.title) : null, source: 'title' },
  ]

  const context: PageContext = { company: null, role: null, location: null, source: 'none' }
  for (const { data, source } of layers) {
    if (!data) continue
    let contributed = false
    for (const key of ['company', 'role', 'location'] as const) {
      const value = clean(data[key])
      if (value && !context[key]) {
        context[key] = value
        contributed = true
      }
    }
    if (contributed && context.source === 'none') context.source = source
  }
  return context
}
