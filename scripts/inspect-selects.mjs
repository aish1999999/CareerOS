// One-off: dump every <select> on the page — options, visibility, whether the
// detector claimed it (data-ff-id) — plus its wrapper. Diagnosis only.
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.argv[2]
const context = await chromium.launchPersistentContext(join(homedir(), '.flashfiller-harness-profile'), {
  headless: true,
  channel: 'chromium',
  args: [`--disable-extensions-except=${join(root, 'dist')}`, `--load-extension=${join(root, 'dist')}`],
})
let [worker] = context.serviceWorkers()
if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 })
const storePath = process.argv[3] ?? join(root, 'flashfiller-profile-import.local.json')
const imported = JSON.parse(readFileSync(storePath, 'utf-8'))
await worker.evaluate(
  (data) => chrome.storage.local.set({ flashfiller: data }),
  {
    schemaVersion: 5,
    profile: imported.profile ?? imported,
    qa: imported.qa ?? [],
    optionSets: [],
    settings: { enabledDomains: [new URL(url).hostname], onboardingCompleted: true },
  },
)
const page = await context.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(6000) // SPA render + content script scan + lazy options

const dump = await page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('select')) {
    const style = getComputedStyle(el)
    out.push({
      label:
        (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()) ||
        el.getAttribute('aria-label') || el.name || el.id,
      id: el.id.slice(0, 50),
      detected: el.hasAttribute('data-ff-id'),
      optionCount: el.options.length,
      firstOptions: [...el.options].slice(0, 4).map((o) => `${o.value}|${o.text.trim()}`),
      hidden: style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null,
      wrapperClass: el.parentElement ? String(el.parentElement.className).slice(0, 80) : '',
      selectedText: el.selectedOptions?.[0]?.text?.trim() ?? '',
    })
  }
  return out
})
for (const s of dump) console.log(JSON.stringify(s))

// The extension's own eye-view: signals + match decisions from the last scan
const debug = await worker.evaluate(async (host) => {
  const tabs = await chrome.tabs.query({})
  const tab = tabs.find((t) => t.url && t.url.includes(host))
  if (!tab?.id) return null
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: () => window.__flashfillerDebug?.() ?? null,
  })
  return results.map((r) => r.result).filter(Boolean)
}, new URL(url).hostname)
console.log('\n=== EXTENSION SIGNALS ===')
for (const frame of debug ?? [])
  for (const sig of frame.signals) console.log(JSON.stringify(sig))
console.log('\n=== EXTENSION MATCHES ===')
for (const frame of debug ?? [])
  for (const m of frame.matches) console.log(JSON.stringify(m))
await context.close()
