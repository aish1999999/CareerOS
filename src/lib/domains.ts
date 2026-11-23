// ---------------------------------------------------------------------------
// Shared domain-matching predicate (Section 4): the ONE definition of what
// "enabled on this site" means, used by the content script's activation
// gating and the popup's "Always run on this site" toggle so they can't
// drift. An entry matches its exact host and every subdomain of it —
// "successfactors.eu" enables career5.successfactors.eu.
// ---------------------------------------------------------------------------

export function hostMatchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`)
}

export function domainEnabled(hostname: string, enabledDomains: string[]): boolean {
  return enabledDomains.some((d) => hostMatchesDomain(hostname, d))
}

/** Every list entry that makes `hostname` enabled — what a toggle-off must
 *  remove (removing only the exact host would leave a suffix entry active). */
export function entriesMatchingHost(hostname: string, enabledDomains: string[]): string[] {
  return enabledDomains.filter((d) => hostMatchesDomain(hostname, d))
}
