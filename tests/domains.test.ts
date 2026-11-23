import { describe, expect, it } from 'vitest'
import { domainEnabled, entriesMatchingHost, hostMatchesDomain } from '@/lib/domains'
import { DEFAULT_ENABLED_DOMAINS } from '@/lib/schema'
import { getAdapter } from '@/content/adapters/index'

// ---------------------------------------------------------------------------
// Run-everywhere activation: the shared domain predicate and the ATS defaults
// that make major career sites (incl. SuccessFactors — Grifols) auto-activate.
// ---------------------------------------------------------------------------

describe('hostMatchesDomain / domainEnabled', () => {
  it('matches exact host and subdomains, not lookalike suffixes', () => {
    expect(hostMatchesDomain('successfactors.eu', 'successfactors.eu')).toBe(true)
    expect(hostMatchesDomain('career5.successfactors.eu', 'successfactors.eu')).toBe(true)
    expect(hostMatchesDomain('evilsuccessfactors.eu', 'successfactors.eu')).toBe(false)
    expect(hostMatchesDomain('grifols.wd3.myworkdayjobs.com', 'myworkdayjobs.com')).toBe(true)
  })

  it('default domains activate all supported ATSes', () => {
    for (const host of [
      'career5.successfactors.eu', // Grifols
      'boards.greenhouse.io',
      'jobs.lever.co',
      'acme.wd5.myworkdayjobs.com',
      'jobs.ashbyhq.com',
      'careers.icims.com',
      'jobs.smartrecruiters.com',
      'fa-espx-saasfaprod1.fa.ocs.oraclecloud.com', // Oracle Recruiting Cloud (Cummins)
      'xyz.fa.us2.oraclecloud.com',
    ]) {
      expect(domainEnabled(host, DEFAULT_ENABLED_DOMAINS), host).toBe(true)
    }
    expect(domainEnabled('example.com', DEFAULT_ENABLED_DOMAINS)).toBe(false)
  })

  it('entriesMatchingHost finds every entry a toggle-off must remove', () => {
    const list = ['successfactors.eu', 'career5.successfactors.eu', 'jobs.lever.co']
    expect(entriesMatchingHost('career5.successfactors.eu', list)).toEqual([
      'successfactors.eu',
      'career5.successfactors.eu',
    ])
  })
})

describe('successfactors adapter', () => {
  it('resolves for SF career-portal hosts and keeps the generic option selector', () => {
    const adapter = getAdapter('career5.successfactors.eu')
    expect(adapter?.name).toBe('successfactors')
    expect(getAdapter('performancemanager.successfactors.com')?.name).toBe('successfactors')
    // superset rule: adapter selector REPLACES the generic default, so it must contain it
    expect(adapter?.dropdownOptionSelector).toContain('[role="option"]')
    expect(adapter?.dropdownOptionSelector).toContain('.sapMSelectListItem')
  })

  it('does not shadow other ATS adapters', () => {
    expect(getAdapter('grifols.wd3.myworkdayjobs.com')?.name).toBe('workday')
    expect(getAdapter('boards.greenhouse.io')?.name).toBe('greenhouse')
  })
})

describe('oracle adapter', () => {
  it('resolves for Oracle Recruiting Cloud pod hosts, superset option selector', () => {
    const adapter = getAdapter('fa-espx-saasfaprod1.fa.ocs.oraclecloud.com')
    expect(adapter?.name).toBe('oracle')
    expect(getAdapter('xyz.fa.us2.oraclecloud.com')?.name).toBe('oracle')
    // superset rule: adapter selector REPLACES the generic default, so it must contain it
    expect(adapter?.dropdownOptionSelector).toContain('[role="option"]')
    expect(adapter?.dropdownOptionSelector).toContain('[role="listbox"] li')
    // Oracle JET listbox rows (oj-select-one / oj-combobox popups)
    expect(adapter?.dropdownOptionSelector).toContain('.oj-listbox-result')
  })

  it('does not claim non-Oracle hosts', () => {
    expect(getAdapter('oraclecloud.com.evil.example')).toBeNull()
  })
})
