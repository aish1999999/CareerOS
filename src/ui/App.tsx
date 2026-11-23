import { useEffect, useState } from 'react'
import type { Message, ScanResponse } from '@/types'
import { pendingReviewCount } from '@/lib/storage'
import { domainEnabled, entriesMatchingHost } from '@/lib/domains'
import { useApp } from '@/ui/store'
import { ProfileTab } from '@/ui/components/ProfileTab'
import { DocumentsTab } from '@/ui/components/DocumentsTab'
import { AnswersTab } from '@/ui/components/AnswersTab'
import { TrainingTab } from '@/ui/components/TrainingTab'
import { ReviewTab } from '@/ui/components/ReviewTab'
import { OptionsTab } from '@/ui/components/OptionsTab'
import { SettingsTab } from '@/ui/components/SettingsTab'
import { TailorTab } from '@/ui/components/TailorTab'
import { OutreachPanel } from '@/ui/components/OutreachPanel'
import { CommentPanel } from '@/ui/components/CommentPanel'

// ---------------------------------------------------------------------------
// Shared shell (Section 12): Profile · Documents · Answers · Training ·
// Review · Options · Settings. The popup adds "Scan this page"; the options
// page is the same shell, wider, for bulk work.
// ---------------------------------------------------------------------------

// Outreach (Stage 8) sits beside Tailor: the two things you do to a page you are looking at. The
// same component is the whole of the side panel (src/ui/sidepanel), so the panel is written once.
const TABS = ['Profile', 'Documents', 'Tailor', 'Outreach', 'Comment', 'Answers', 'Training', 'Review', 'Options', 'Settings'] as const
type Tab = (typeof TABS)[number]

export function App({ mode, initialTab }: { mode: 'popup' | 'options'; initialTab?: Tab }) {
  const { store, patchSettings } = useApp()
  const [tab, setTab] = useState<Tab>(initialTab ?? 'Profile')
  const [scanStatus, setScanStatus] = useState<string | null>(null)
  const [tabHost, setTabHost] = useState<string | null>(null)
  // The page's platform canonical domain (from the content script's PING):
  // vanity-domain deployments (careers.honeywell.com = Oracle CX) activate
  // via their platform's enabledDomains entry, which hostname-only math here
  // could neither display nor turn off.
  const [tabPlatform, setTabPlatform] = useState<string | null>(null)
  const pending = pendingReviewCount(store)

  // Current tab's hostname (popup only) — powers "Always run on this site".
  // tab.url is readable here via host permissions + the activeTab grant from
  // opening the popup; non-http tabs (chrome://, Web Store) yield null.
  useEffect(() => {
    if (mode !== 'popup') return
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      const url = activeTab?.url
      if (!url || !/^https?:/.test(url) || activeTab?.id === undefined) return
      setTabHost(new URL(url).hostname.toLowerCase())
      // Top frame only — the platform marker lives in the main document.
      chrome.tabs
        .sendMessage(activeTab.id, { type: 'PING' } satisfies Message, { frameId: 0 })
        .then((res: { platformDomain?: string | null } | undefined) =>
          setTabPlatform(res?.platformDomain ?? null),
        )
        .catch(() => null) // unreachable page (no content script) — hostname math stands
    })
  }, [mode])

  // Mirrors enabledForPage (content side): per-host veto first, then hostname
  // enablement, then the fingerprinted platform's canonical domain.
  const hostVetoed = tabHost !== null && domainEnabled(tabHost, store.settings.disabledDomains)
  const siteEnabled =
    tabHost !== null &&
    !hostVetoed &&
    (domainEnabled(tabHost, store.settings.enabledDomains) ||
      (tabPlatform !== null && domainEnabled(tabPlatform, store.settings.enabledDomains)))

  const scanPage = async () => {
    setScanStatus('Scanning…')
    try {
      const result = (await chrome.runtime.sendMessage({
        type: 'SCAN_ACTIVE_TAB',
      } satisfies Message)) as ScanResponse
      if (!result.ok) setScanStatus(result.error ?? 'Failed.')
      else if (typeof result.detected === 'number')
        setScanStatus(
          `Scanned: ${result.detected} field${result.detected === 1 ? '' : 's'} detected, ` +
            `${result.matched ?? 0} fillable` +
            ((result.skippedFilled ?? 0) > 0 ? `, ${result.skippedFilled} already filled.` : '.'),
        )
      else setScanStatus('Scanned — check the page for the ⚡ badge.')
    } catch {
      setScanStatus('Could not reach this page.')
    }
    setTimeout(() => setScanStatus(null), 6000)
  }

  const toggleSite = async (enable: boolean) => {
    if (!tabHost) return
    if (enable) {
      // Lift any veto covering this host, then pin the hostname on (harmless
      // when a platform entry already covers it).
      const vetoes = entriesMatchingHost(tabHost, store.settings.disabledDomains)
      await patchSettings({
        disabledDomains: store.settings.disabledDomains.filter((d) => !vetoes.includes(d)),
        enabledDomains: store.settings.enabledDomains.includes(tabHost)
          ? store.settings.enabledDomains
          : [...store.settings.enabledDomains, tabHost],
      })
      await scanPage() // activate + scan the tab right away
    } else {
      // Pin the host OFF via the per-host veto — the only lever that also
      // covers fingerprint-activated vanity pages, whose enablement rides a
      // platform entry (oraclecloud.com) that must survive for real pod
      // sites. Only the EXACT hostname entry is dropped from enabledDomains;
      // suffix/platform entries stay (toggling off one Workday tenant no
      // longer disables every other *.myworkdayjobs.com site).
      await patchSettings({
        enabledDomains: store.settings.enabledDomains.filter((d) => d !== tabHost),
        disabledDomains: store.settings.disabledDomains.includes(tabHost)
          ? store.settings.disabledDomains
          : [...store.settings.disabledDomains, tabHost],
      })
    }
  }

  return (
    <div className="app">
      <div className="app-header">
        <span className="logo">⚡ FlashFiller</span>
        <span className="spacer" />
        {mode === 'popup' && (
          <>
            <button className="btn small primary" onClick={() => void scanPage()}>
              Scan this page
            </button>
            <button
              className="btn small"
              title="Open full-size view"
              onClick={() => void chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' } satisfies Message)}
            >
              ⧉
            </button>
          </>
        )}
      </div>
      {scanStatus && <div className="note" style={{ margin: '0 16px' }}>{scanStatus}</div>}
      {mode === 'popup' && tabHost && (
        <label
          className="muted"
          style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '4px 16px 0', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={siteEnabled}
            onChange={(e) => void toggleSite(e.target.checked)}
          />
          Always run on <strong>{tabHost}</strong>
        </label>
      )}
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
            {t === 'Review' && pending > 0 && <span className="count-badge">{pending}</span>}
          </button>
        ))}
      </nav>
      <div className="tab-body">
        {tab === 'Profile' && <ProfileTab />}
        {tab === 'Documents' && <DocumentsTab />}
        {tab === 'Tailor' && <TailorTab />}
        {tab === 'Outreach' && <OutreachPanel />}
        {tab === 'Comment' && <CommentPanel />}
        {tab === 'Answers' && <AnswersTab />}
        {tab === 'Training' && <TrainingTab />}
        {tab === 'Review' && <ReviewTab />}
        {tab === 'Options' && <OptionsTab />}
        {tab === 'Settings' && <SettingsTab />}
      </div>
    </div>
  )
}
