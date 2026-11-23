import { beforeEach, describe, expect, it } from 'vitest'
import { resetChromeMock, seedChromeStorage } from './setup'
import { getStore } from '@/lib/storage'
import { SCHEMA_VERSION } from '@/lib/schema'

// ---------------------------------------------------------------------------
// v7 → v8: Oracle Recruiting Cloud (oraclecloud.com) joins the default ATS
// list. The enabledDomains union only ever ran in v3→v4, so an existing
// store (the user's real one sits at v7) never sees a new default without
// this migration — the live symptom was FlashFiller sitting dormant on the
// Cummins Oracle CX apply flow.
// ---------------------------------------------------------------------------

beforeEach(() => resetChromeMock())

describe('v7 → v8 migration (Oracle default domain)', () => {
  it('unions oraclecloud.com into an existing enabledDomains list', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 7,
      settings: {
        enabledDomains: ['myworkdayjobs.com', 'careers.custom-site.com'],
      },
    })
    const store = await getStore()
    expect(store.schemaVersion).toBe(SCHEMA_VERSION)
    expect(store.settings.enabledDomains).toContain('oraclecloud.com')
    // user-added domains survive
    expect(store.settings.enabledDomains).toContain('careers.custom-site.com')
    expect(store.settings.enabledDomains).toContain('myworkdayjobs.com')
  })

  it('does not duplicate when oraclecloud.com is already present', async () => {
    seedChromeStorage('flashfiller', {
      schemaVersion: 7,
      settings: { enabledDomains: ['oraclecloud.com'] },
    })
    const store = await getStore()
    expect(
      store.settings.enabledDomains.filter((d) => d === 'oraclecloud.com'),
    ).toHaveLength(1)
  })

  it('leaves a missing enabledDomains key to the schema default (full list)', async () => {
    seedChromeStorage('flashfiller', { schemaVersion: 7, settings: {} })
    const store = await getStore()
    // zod default = DEFAULT_ENABLED_DOMAINS, which now includes Oracle
    expect(store.settings.enabledDomains).toContain('oraclecloud.com')
    expect(store.settings.enabledDomains).toContain('myworkdayjobs.com')
  })
})
