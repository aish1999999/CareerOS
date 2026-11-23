import type { PageContext } from '@/types'
import { domainEnabled } from '@/lib/domains'

// ---------------------------------------------------------------------------
// Site-adapter layer (Section 14): a generic default plus per-ATS overrides
// registered by hostname — context-extraction selectors and dropdown quirks.
// ---------------------------------------------------------------------------

export interface SiteAdapter {
  name: string
  hosts: RegExp
  /** Page-marker fallback for platforms served from branded VANITY domains
   *  (careers.honeywell.com is the same Oracle CX app as *.oraclecloud.com —
   *  the hostname is pure branding). Consulted only when no adapter's `hosts`
   *  matches; must key on markers the platform itself emits in the initial
   *  HTML shell, never on anything a random site could plausibly carry. */
  fingerprint?: (doc: Document) => boolean
  /** The enabledDomains entry that governs fingerprint-matched pages: a
   *  vanity-domain page is active iff this domain is enabled, so the user's
   *  platform-level on/off switch keeps working when the hostname doesn't
   *  mention the platform at all. Required for adapters with `fingerprint`. */
  canonicalDomain?: string
  /** Extract whatever job context this ATS exposes; partials are fine. */
  context?: (doc: Document) => Partial<PageContext>
  /** Selector for this ATS's custom-dropdown option list, if non-standard. */
  dropdownOptionSelector?: string
  /** ATS uses a multi-step wizard — expect step navigation without reloads. */
  isMultiStep?: boolean
}

function textOf(doc: Document, selector: string): string | null {
  const el = doc.querySelector(selector)
  const text = el?.textContent?.trim()
  return text ? text : null
}

const greenhouse: SiteAdapter = {
  name: 'greenhouse',
  hosts: /(^|\.)greenhouse\.io$/,
  context: (doc) => ({
    company: textOf(doc, '.company-name') ?? textOf(doc, '[class*="company-name"]'),
    role: textOf(doc, '.app-title') ?? textOf(doc, 'h1.section-header') ?? textOf(doc, 'h1'),
    location: textOf(doc, '.location') ?? textOf(doc, '[class*="job__location"]'),
  }),
}

const lever: SiteAdapter = {
  name: 'lever',
  hosts: /(^|\.)lever\.co$/,
  context: (doc) => {
    // jobs.lever.co/<company>/<posting-id>
    const company = doc.location.pathname.split('/').filter(Boolean)[0] ?? null
    return {
      company: textOf(doc, '.main-header-logo img[alt]')
        ? (doc.querySelector('.main-header-logo img') as HTMLImageElement).alt
        : company,
      role: textOf(doc, '.posting-headline h2') ?? textOf(doc, 'h2'),
      location: textOf(doc, '.posting-categories .location') ?? textOf(doc, '.sort-by-time.posting-category'),
    }
  },
}

const workday: SiteAdapter = {
  name: 'workday',
  hosts: /\.myworkdayjobs\.com$/,
  isMultiStep: true,
  context: (doc) => ({
    // <company>.wd5.myworkdayjobs.com
    company: doc.location.hostname.split('.')[0] ?? null,
    role: textOf(doc, '[data-automation-id="jobPostingHeader"]') ?? textOf(doc, 'h1'),
    location: textOf(doc, '[data-automation-id="locations"] dd'),
  }),
  dropdownOptionSelector: '[data-automation-id="promptOption"], [role="option"]',
}

const ashby: SiteAdapter = {
  name: 'ashby',
  hosts: /(^|\.)ashbyhq\.com$/,
  context: (doc) => ({
    company: doc.location.pathname.split('/').filter(Boolean)[0] ?? null,
    role: textOf(doc, 'h1'),
  }),
}

const icims: SiteAdapter = {
  name: 'icims',
  hosts: /\.icims\.com$/,
  isMultiStep: true,
  context: (doc) => ({
    role: textOf(doc, '.iCIMS_Header h1') ?? textOf(doc, 'h1'),
  }),
}

const smartrecruiters: SiteAdapter = {
  name: 'smartrecruiters',
  hosts: /(^|\.)smartrecruiters\.com$/,
  context: (doc) => ({
    company: textOf(doc, '[itemprop="hiringOrganization"]'),
    role: textOf(doc, 'h1[itemprop="title"]') ?? textOf(doc, 'h1'),
    location: textOf(doc, '[itemprop="jobLocation"]'),
  }),
}

const successfactors: SiteAdapter = {
  name: 'successfactors',
  hosts: /(^|\.)successfactors\.(eu|com)$/,
  isMultiStep: true,
  context: (doc) => ({
    // Legacy Career Portal titles are often generic ("Career Opportunities");
    // JSON-LD/meta layers usually do better — offer h1 as a last resort only.
    role: textOf(doc, 'h1'),
  }),
  // MUST stay a superset of the generic default ('[role="option"], [role="listbox"] li')
  // — the adapter selector REPLACES the default in findDropdownOptions, and SF
  // mixes native selects with SAPUI5 popover lists (.sapMSelectListItem/.sapMSLI).
  dropdownOptionSelector: '[role="option"], [role="listbox"] li, .sapMSelectListItem, .sapMSLI',
}

const oracle: SiteAdapter = {
  name: 'oracle',
  // Oracle Recruiting Cloud Candidate Experience (hcmUI/CandidateExperience).
  // Tenants sit on varied pod hosts (fa-espx-saasfaprod1.fa.ocs.oraclecloud.com,
  // xyz.fa.us2.oraclecloud.com) — the shared suffix is the only stable handle.
  hosts: /\.oraclecloud\.com$/,
  canonicalDomain: 'oraclecloud.com',
  // Vanity-domain CX sites (careers.honeywell.com, live 2026-07-21: address/
  // state/country/veteran unfilled — the SAME app as NOV, adapter never
  // applied) self-identify in the server-rendered shell: <base
  // data-apibaseurl="https://<tenant>.fa.ocs.oraclecloud.com:443"> points at
  // the real pod, and the CX candidate-experience bundle loads from
  // static.oracle.com/cdn/fa/oj-hcm-ce/. Either marker alone is decisive.
  fingerprint: (doc) =>
    !!doc.querySelector(
      'base[data-apibaseurl*=".oraclecloud.com"], link[href*="/oj-hcm-ce/"], script[src*="/oj-hcm-ce/"]',
    ),
  isMultiStep: true, // apply flow is …/apply/section/N with pushState navigation
  context: (doc) => ({
    // og:site_name is "<Company> Talent Acquisition/Careers" — the meta layer
    // already takes it verbatim, so only the role needs help here.
    role: textOf(doc, '.job-details__title') ?? textOf(doc, 'h1'),
  }),
  // MUST stay a superset of the generic default — the adapter selector
  // REPLACES it in findDropdownOptions.
  // - CX apply-flow selects (`cx-select`, verified from the oj-hcm-ce bundle
  //   source, Cummins 2026-07-16): the popup is div[role="grid"] > div[role=
  //   "row"] > div[role="gridcell"].cx-select__list-item — NO option/listbox
  //   roles anywhere, which is why the generic selector saw "0 scoped
  //   options". The multi-select variant uses ul[role="listbox"] > li[role=
  //   "option"] (generic default covers it).
  // - Oracle JET (other CX surfaces) renders oj-select popups as
  //   ul.oj-listbox-results > li.oj-listbox-result with role="option" on the
  //   inner label div; the li class is the version-proof handle (li + label
  //   div double-matching is harmless: same text, clicks drill inward).
  dropdownOptionSelector:
    '[role="option"], [role="listbox"] li, [role="menu"] [role="menuitem"], ' +
    '[role="menu"] [role="menuitemradio"], [role="tree"] [role="treeitem"], ' +
    '.oj-listbox-result, [role="grid"] [role="gridcell"], .cx-select__list-item',
}

const ADAPTERS: SiteAdapter[] = [greenhouse, lever, workday, ashby, icims, smartrecruiters, successfactors, oracle]

/** Hostname match first (cheap, covers the ATS's own domains); when no host
 *  matches and a document is provided, fall back to page fingerprints so
 *  vanity-domain deployments get the same adapter as the platform's home
 *  domains. Pass the document wherever one is available. */
export function getAdapter(hostname: string, doc?: Document): SiteAdapter | null {
  const byHost = ADAPTERS.find((a) => a.hosts.test(hostname))
  if (byHost) return byHost
  if (doc) return ADAPTERS.find((a) => a.fingerprint?.(doc)) ?? null
  return null
}

/** The activation predicate for a live page: enabled by hostname, or served
 *  from a vanity domain whose platform fingerprint maps to an enabled
 *  canonical domain (careers.honeywell.com activates iff oraclecloud.com is
 *  enabled). Shared by bootstrap gating and the settings-change waker so the
 *  two can't drift. `disabledDomains` is a per-host veto checked FIRST —
 *  it's the popup toggle's OFF path for fingerprint-activated pages, whose
 *  enablement has no hostname entry to remove. */
export function enabledForPage(
  hostname: string,
  doc: Document,
  enabledDomains: string[],
  disabledDomains: string[] = [],
): boolean {
  if (domainEnabled(hostname, disabledDomains)) return false
  if (domainEnabled(hostname, enabledDomains)) return true
  const adapter = getAdapter(hostname, doc)
  return !!adapter?.canonicalDomain && domainEnabled(adapter.canonicalDomain, enabledDomains)
}
