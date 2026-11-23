// @vitest-environment jsdom
// @vitest-environment-options {"url": "https://careers.example-mfg.com/en/sites/ExampleMfg/jobs/preview/153676/apply/section/1"}
import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'
import { fillCustomDropdown } from '@/content/autofill'
import { enabledForPage, getAdapter } from '@/content/adapters/index'
import { extractPageContext } from '@/content/context'
import { brandTokens } from '@/content/capture'
import { DEFAULT_ENABLED_DOMAINS } from '@/lib/schema'

// ---------------------------------------------------------------------------
// Oracle CX behind a VANITY domain (careers.honeywell.com, live 2026-07-21):
// the exact oj-hcm-ce app as NOV/Cummins, but the hostname never mentions
// Oracle — the pod (ibqbjb.fa.ocs.oraclecloud.com) appears only in the
// server-rendered <base data-apibaseurl> tag. Hostname-keyed adapter lookup
// returned null → generic option selector → every cx-select died at
// "0 scoped options" (address/state/country/veteran unfilled), and the
// content script had no default-enablement path at all.
// ---------------------------------------------------------------------------

/** The marker Honeywell actually serves (captured 2026-07-21). */
const BASE_MARKER =
  '<base href="/en/sites/ExampleMfg" data-apibaseurl="https://ibqbjb.fa.ocs.oraclecloud.com:443" ' +
  'data-vanitybaseurl="https://careers.example-mfg.com/" data-sitenumber="CX_1" />'

function installMarker(html: string = BASE_MARKER): void {
  document.head.insertAdjacentHTML('beforeend', html)
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

/** Trimmed cx-select from the live capture: readonly combobox input + toggle,
 *  popup portals a grid (role=grid > row > gridcell) with NO option roles —
 *  only the oracle adapter's selector can see these options. */
function buildCxSelect(
  id: string,
  label: string,
  options: string[],
): { input: HTMLInputElement } {
  const row = document.createElement('div')
  row.className = 'input-row'
  row.innerHTML = `
    <label class="input-row__label cx-select__label" for="${id}">${label}</label>
    <div class="cx-select-container">
      <input autocomplete="none" name="${id}" id="${id}" type="text" role="combobox" readonly
             aria-autocomplete="list" aria-haspopup="grid" aria-controls="${id}-listbox"
             aria-expanded="false" class="cx-select-input" />
      <button type="button" class="icon-dropdown-arrow" id="${id}-toggle-button" tabindex="-1"
              aria-label="Open the drop-down list for ${label}." aria-expanded="false"
              aria-controls="${id}-listbox"></button>
    </div>`
  document.body.appendChild(row)
  const input = document.getElementById(id) as HTMLInputElement
  const open = () => {
    if (document.getElementById(`${id}-listbox`)) return
    const portal = document.createElement('div')
    portal.className = 'cx-select__options'
    portal.innerHTML = `
      <div class="cx-select__list" role="grid" id="${id}-listbox" aria-label="${label}" tabindex="-1">
        ${options
          .map(
            (text, i) => `
          <div role="row">
            <div tabindex="-1" role="gridcell" id="${id}-listitem-${i}" aria-selected="false"
                 class="cx-select__list-item"><span>${text}</span></div>
          </div>`,
          )
          .join('')}
      </div>`
    document.body.appendChild(portal)
    input.setAttribute('aria-expanded', 'true')
    for (const cell of portal.querySelectorAll<HTMLElement>('[role="gridcell"]')) {
      cell.addEventListener('click', () => {
        const proto = Object.getPrototypeOf(input) as object
        Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(input, cell.textContent?.trim() ?? '')
        portal.remove()
        input.setAttribute('aria-expanded', 'false')
      })
    }
  }
  input.addEventListener('click', open)
  document.getElementById(`${id}-toggle-button`)!.addEventListener('click', open)
  return { input }
}

describe('adapter resolution by page fingerprint', () => {
  it('hostname alone resolves nothing on a vanity domain', () => {
    expect(getAdapter('careers.example-mfg.com')).toBeNull()
  })

  it('base[data-apibaseurl] pointing at an oraclecloud pod resolves the oracle adapter', () => {
    installMarker()
    expect(getAdapter('careers.example-mfg.com', document)?.name).toBe('oracle')
  })

  it('the oj-hcm-ce bundle link resolves it too (either marker is decisive)', () => {
    installMarker(
      '<link rel="stylesheet" href="https://static.oracle.com/cdn/fa/oj-hcm-ce/2604.20.261590626/css/main-minimal.css" />',
    )
    expect(getAdapter('careers.example-mfg.com', document)?.name).toBe('oracle')
  })

  it('the oj-hcm-ce bundle script resolves it too', () => {
    installMarker(
      '<script src="https://static.oracle.com/cdn/fa/oj-hcm-ce/2604.20.261590626/js/main-minimal.js"></script>',
    )
    expect(getAdapter('careers.example-mfg.com', document)?.name).toBe('oracle')
  })

  it('an unmarked page resolves NO adapter — random sites never inherit Oracle quirks', () => {
    installMarker('<link rel="stylesheet" href="/assets/site.css" /><base href="/careers/" />')
    expect(getAdapter('careers.example-mfg.com', document)).toBeNull()
  })

  it('hostname match still wins without any document', () => {
    expect(getAdapter('egay.fa.us6.oraclecloud.com')?.name).toBe('oracle')
  })
})

describe('activation on vanity domains (enabledForPage)', () => {
  it('fingerprinted page activates via the platform canonical domain default', () => {
    installMarker()
    expect(enabledForPage('careers.example-mfg.com', document, DEFAULT_ENABLED_DOMAINS)).toBe(true)
  })

  it('user disabling the platform (removing oraclecloud.com) disables vanity sites too', () => {
    installMarker()
    const without = DEFAULT_ENABLED_DOMAINS.filter((d) => d !== 'oraclecloud.com')
    expect(enabledForPage('careers.example-mfg.com', document, without)).toBe(false)
  })

  it('unmarked pages stay fully dormant', () => {
    expect(enabledForPage('careers.example-mfg.com', document, DEFAULT_ENABLED_DOMAINS)).toBe(false)
  })

  it('explicit hostname enablement works without any fingerprint', () => {
    expect(enabledForPage('careers.example-mfg.com', document, ['careers.example-mfg.com'])).toBe(true)
  })

  it('host-matched adapters never ride canonicalDomain: a Workday host with workday disabled stays dormant', () => {
    // The workday adapter matches by hosts but has no canonicalDomain — its
    // enablement must come from the hostname list alone, even when other
    // platforms are enabled.
    const withoutWorkday = DEFAULT_ENABLED_DOMAINS.filter((d) => d !== 'myworkdayjobs.com')
    expect(enabledForPage('nov.wd1.myworkdayjobs.com', document, withoutWorkday)).toBe(false)
  })

  it('disabledDomains vetoes a fingerprint-activated vanity page (the popup OFF switch)', () => {
    installMarker()
    expect(
      enabledForPage('careers.example-mfg.com', document, DEFAULT_ENABLED_DOMAINS, [
        'careers.example-mfg.com',
      ]),
    ).toBe(false) // veto wins over the platform enablement
  })

  it('disabledDomains vetoes even explicit hostname enablement (veto is checked first)', () => {
    expect(
      enabledForPage('careers.example-mfg.com', document, ['careers.example-mfg.com'], [
        'careers.example-mfg.com',
      ]),
    ).toBe(false)
  })

  it('a per-host veto never leaks onto the platform pod domains', () => {
    // Vetoing the Honeywell vanity host must leave real *.oraclecloud.com
    // pod pages fully enabled.
    expect(
      enabledForPage('egay.fa.us6.oraclecloud.com', document, DEFAULT_ENABLED_DOMAINS, [
        'careers.example-mfg.com',
      ]),
    ).toBe(true)
  })
})

describe('brand tokens on vanity domains', () => {
  it('walks past the generic prefix to the brand label (careers.honeywell.com → honeywell)', () => {
    expect(brandTokens(null, 'careers.honeywell.com').has('honeywell')).toBe(true)
  })

  it('known ATS platforms still use the tenant label only (never the platform name)', () => {
    const workday = brandTokens(null, 'mcwane.wd5.myworkdayjobs.com')
    expect(workday.has('mcwane')).toBe(true)
    expect(workday.has('myworkdayjobs')).toBe(false)
    // jobs.lever.co: "jobs" is generic and "lever" is the PLATFORM — a
    // source-list option literally named "Lever" must never read as branded.
    expect(brandTokens(null, 'jobs.lever.co').has('lever')).toBe(false)
  })
})

describe('cx-select fills on a vanity domain (the Honeywell kill chain)', () => {
  it('detects the readonly combobox and fills through the grid popup', async () => {
    installMarker()
    const { input } = buildCxSelect('state-41', 'State', ['Pennsylvania', 'Texas', 'Utah'])

    const fields = detectFields(document)
    const dropdown = fields.find((f) => f.el.id === 'state-41')
    expect(dropdown?.signal.kind).toBe('custom-dropdown')

    const result = await fillCustomDropdown(input, 'Texas')
    expect(result.outcome).toBe('filled')
    expect(input.value).toBe('Texas')
  })

  it('veteran-status cx-select fills the same way (grid options, vanity host)', async () => {
    installMarker()
    const { input } = buildCxSelect('veteran-52', 'Veteran Status', [
      'I am not a veteran',
      'I am a veteran',
      'I do not wish to answer',
    ])
    const result = await fillCustomDropdown(input, 'I am not a veteran')
    expect(result.outcome).toBe('filled')
    expect(input.value).toBe('I am not a veteran')
  })

  it('WITHOUT the fingerprint the grid popup is invisible to the generic selector (the pre-fix kill)', () => {
    // Structural pin, not a full fill run (the honest-failure path polls out
    // 30s+ of fallback tiers): no marker → no adapter → the generic option
    // selector sees ZERO of the grid's options ("open: 0 scoped options").
    const { input } = buildCxSelect('country-63', 'Country', ['Canada', 'United States'])
    input.click() // grid portal renders
    expect(document.querySelectorAll('[role="gridcell"]').length).toBe(2)
    expect(getAdapter(document.location.hostname, document)).toBeNull()
    const generic =
      '[role="option"], [role="listbox"] li, [role="menu"] [role="menuitem"], ' +
      '[role="menu"] [role="menuitemradio"], [role="tree"] [role="treeitem"]'
    expect(document.querySelectorAll(generic).length).toBe(0)
  })
})

describe('page context on vanity domains', () => {
  it('the oracle adapter context layer applies (.job-details__title)', () => {
    installMarker()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div class="job-details__title">Senior Industrial Engineer</div>',
    )
    const ctx = extractPageContext(document)
    expect(ctx.role).toBe('Senior Industrial Engineer')
  })
})
