import type { JobAts } from '@contract/entities'
import { getAdapter } from '@/content/adapters/index'
import { atsFromHost } from '@/lib/job-dedupe'
import { companyDomain } from './dom'
import { greenhouse } from './greenhouse'
import { icims } from './icims'
import { linkedin } from './linkedin'
import { oracle } from './oracle'
import { successfactors } from './successfactors'
import { workday } from './workday'
import type { Classification, PostingAdapter } from './types'

// ---------------------------------------------------------------------------
// Source classification (Stage 4 part 2):
//   linkedin.com                          → source linkedin,     ats unknown
//   an ATS's own host (registry + extras) → source ats_portal,   ats <platform>
//   a company domain with platform markers → source company_site, ats <platform>
//   anything else                          → source company_site, ats unknown
// The autofill registry (content/adapters/index.ts) is reused read-only for its
// hosts and the Oracle vanity-domain fingerprint; its context() callbacks are
// never called here (they need doc.location, which a parsed document lacks).
// ---------------------------------------------------------------------------

/** Nothing platform-specific to add — the JSON-LD / microdata / semantic ladders do the work. */
export const generic: PostingAdapter = { name: 'generic', extract: () => ({}) }

const BY_ATS: Partial<Record<JobAts, PostingAdapter>> = { workday, greenhouse, icims, successfactors, oracle }
const LINKEDIN_HOST = /(^|\.)linkedin\.com$/i

export interface FrameRef {
  url: string
  doc: Document
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** Markers a platform itself emits when it is embedded on a company domain — never
 *  anything a random site could plausibly carry (the registry's own rule). */
export function fingerprintAts(hostname: string, doc: Document, frames: FrameRef[] = []): JobAts | null {
  const registry = getAdapter(hostname, doc)
  if (registry && !registry.hosts.test(hostname)) return registry.name as JobAts
  if (doc.querySelector('iframe[src*="greenhouse.io/embed"], script[src*="greenhouse.io/embed"], script[src*="boards.greenhouse.io"], iframe[src*="boards.greenhouse.io"]')) return 'greenhouse'
  if (doc.querySelector('link[href*="rmkcdn.successfactors.com"], script[src*="rmkcdn.successfactors.com"]')) return 'successfactors'
  if (doc.querySelector('iframe#icims_content_iframe, iframe[src*=".icims.com"]')) return 'icims'
  if (doc.querySelector('iframe[src*="myworkdayjobs.com"], iframe[src*="myworkdaysite.com"]')) return 'workday'
  for (const frame of frames) {
    const host = hostOf(frame.url)
    const ats = host ? atsFromHost(host) : null
    if (ats) return ats
  }
  return null
}

export function classifyPosting(url: URL, doc: Document, frames: FrameRef[] = []): Classification {
  const host = url.hostname.toLowerCase()
  if (LINKEDIN_HOST.test(host)) {
    return { source: 'linkedin', ats: 'unknown', adapter: linkedin, matchedBy: 'linkedin', companyDomain: null }
  }
  const hostAts = atsFromHost(host)
  if (hostAts) {
    return { source: 'ats_portal', ats: hostAts, adapter: BY_ATS[hostAts] ?? generic, matchedBy: 'host', companyDomain: null }
  }
  const domain = companyDomain(host)
  const fingerprint = url.searchParams.get('gh_jid') ? 'greenhouse' : fingerprintAts(host, doc, frames)
  if (fingerprint) {
    return { source: 'company_site', ats: fingerprint, adapter: BY_ATS[fingerprint] ?? generic, matchedBy: 'fingerprint', companyDomain: domain }
  }
  return { source: 'company_site', ats: 'unknown', adapter: generic, matchedBy: 'none', companyDomain: domain }
}

export { greenhouse, icims, linkedin, oracle, successfactors, workday }
