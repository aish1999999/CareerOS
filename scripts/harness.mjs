// FlashFiller Playwright harness — loads the BUILT extension into a real
// Chromium, seeds the store, triggers autofill, and reports what happened.
//
//   node scripts/harness.mjs <url> [--headed] [--profile <path.json>] [--keep-open <secs>]
//
// Safety: this NEVER clicks Submit/Next/Save — it fills and observes only.
// Notes: the chrome.debugger trusted-input tier cannot attach while
// Playwright's own CDP connection is live, so tier-3 fills are unavailable
// here (tiers 1–2 are what's under test).
import { chromium } from 'playwright'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(root, 'dist')

const args = process.argv.slice(2)
const url = args.find((a) => !a.startsWith('--'))
if (!url) {
  console.error('usage: node scripts/harness.mjs <url> [--headed] [--profile <path.json>] [--keep-open <secs>]')
  process.exit(1)
}
const headed = args.includes('--headed')
const profileArg = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : null
const keepOpen = args.includes('--keep-open') ? Number(args[args.indexOf('--keep-open') + 1]) : 0
/** Login-walled sites: human signs in inside the harness window; the harness
 *  waits (up to N secs) until real form fields appear — never on a page with
 *  a password box — then triggers the fill itself. */
const awaitForm = args.includes('--await-form')
  ? Number(args[args.indexOf('--await-form') + 1] || 300)
  : 0
/** Wizard mode: after each fill, keep watching — when the human advances to
 *  the next step (Save & Continue is ALWAYS the human's click), fill that
 *  step too. Runs until the --await-form budget expires. */
const wizard = args.includes('--wizard')
/** Fresh throwaway browser profile instead of the persistent one (which
 *  keeps logins across harness runs). */
const freshProfile = args.includes('--fresh-profile')
/** Learning-loop experiment: fill once, hard-refresh the page (erasing form
 *  state), fill again — proves saved answers actually DRIVE fills. */
const reloadTest = args.includes('--reload-test')

// ---- store payload -----------------------------------------------------------
const profilePath = profileArg ?? join(root, 'flashfiller-profile-import.local.json')
let imported = {}
try {
  imported = JSON.parse(readFileSync(profilePath, 'utf-8'))
} catch {
  console.warn(`! could not read ${profilePath} — running with an empty profile`)
}
const targetHost = new URL(url).hostname
const store = {
  schemaVersion: 5,
  profile: imported.profile ?? imported ?? {},
  qa: imported.qa ?? [],
  optionSets: imported.optionSets ?? [],
  settings: { enabledDomains: [targetHost], onboardingCompleted: true },
}

// ---- launch with the extension -----------------------------------------------
// Persistent profile by default so sign-ins survive between runs
const userDataDir = freshProfile
  ? mkdtempSync(join(tmpdir(), 'ff-harness-'))
  : join(homedir(), '.flashfiller-harness-profile')
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: !headed,
  // Extensions in headless require the chromium channel's new headless mode
  channel: headed ? undefined : 'chromium',
  args: [
    `--disable-extensions-except=${distDir}`,
    `--load-extension=${distDir}`,
  ],
})

let [worker] = context.serviceWorkers()
if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 })
console.log(`✓ extension service worker: ${worker.url()}`)

// Seed the store BEFORE the page loads so the content script activates
await worker.evaluate((data) => chrome.storage.local.set({ flashfiller: data }), store)
console.log(`✓ store seeded (profile + enabledDomains: ${targetHost})`)

// ---- open the page, capture console -------------------------------------------
const page = await context.newPage()
const breadcrumbs = []
page.on('console', (msg) => {
  const text = msg.text()
  if (text.includes('[FlashFiller]')) {
    breadcrumbs.push(text)
    console.log(`  ${text}`)
  }
})
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(2500) // let the SPA render + content script settle

// ---- optionally wait for a human to sign in / reach the form -------------------
const detectedFieldCount = () =>
  worker
    .evaluate(async (host) => {
      const tabs = await chrome.tabs.query({})
      const tab = tabs.find((t) => t.url && t.url.includes(host))
      if (!tab?.id) return 0
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () =>
          window.__flashfillerScanReport
            ? window.__flashfillerScanReport().then((r) => r?.detected ?? 0)
            : 0,
      })
      return results.reduce((sum, r) => sum + (r.result || 0), 0)
    }, targetHost)
    .catch(() => 0)

const hasPasswordBox = async () =>
  (
    await Promise.all(
      page
        .frames()
        .map((f) => f.evaluate(() => !!document.querySelector('input[type="password"]')).catch(() => false)),
    )
  ).some(Boolean)

const waitForStableForm = async (deadline) => {
  let last = -1
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000)
    // NEVER act while any frame shows a password box (login screen)
    if (await hasPasswordBox()) {
      last = -1
      continue
    }
    const detected = await detectedFieldCount()
    if (detected >= 3 && detected === last) return detected // stable, real form
    last = detected
  }
  return 0
}

const formSignature = () =>
  page
    .evaluate(() =>
      [...document.querySelectorAll('input, select, textarea, [aria-haspopup="listbox"]')]
        .slice(0, 80)
        .map((el) => el.id || el.name || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '')
        .join('|'),
    )
    .catch(() => '')

const triggerAutofill = () =>
  worker.evaluate(async (host) => {
    const tabs = await chrome.tabs.query({})
    const tab = tabs.find((t) => t.url && t.url.includes(host))
    if (!tab?.id) return { error: 'tab not found' }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => window.__flashfillerAutofill?.() ?? null,
    })
    return results.map((r) => r.result).filter(Boolean)
  }, targetHost)

const collectDebug = () =>
  worker.evaluate(async (host) => {
    const tabs = await chrome.tabs.query({})
    const tab = tabs.find((t) => t.url && t.url.includes(host))
    if (!tab?.id) return null
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: () => window.__flashfillerDebug?.() ?? null,
    })
    return results.map((r) => r.result).filter(Boolean)
  }, targetHost)

const collectValues = () =>
  page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('input, textarea, select, button[aria-haspopup="listbox"]')) {
      const type = el.getAttribute('type') ?? el.tagName.toLowerCase()
      if (['hidden', 'submit', 'file'].includes(type)) continue
      const label =
        (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()) ||
        el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.name ||
        el.id
      const value =
        el.tagName === 'SELECT'
          ? el.selectedOptions?.[0]?.text ?? ''
          : el.tagName === 'BUTTON'
            ? el.textContent?.trim() ?? ''
            : el.type === 'checkbox' || el.type === 'radio'
              ? el.checked
                ? '[x]'
                : '[ ]'
              : el.value
      out.push({ label: (label ?? '').slice(0, 70), value: String(value).slice(0, 45) })
    }
    return out
  })

const deadline = Date.now() + Math.max(awaitForm, 1) * 1000
let step = 0
for (;;) {
  if (awaitForm > 0) {
    console.log(`→ waiting for a form (sign in / advance steps in the window; ${Math.max(0, Math.round((deadline - Date.now()) / 1000))}s left)…`)
    if (!(await waitForStableForm(deadline))) break
  }
  step++
  console.log(`→ step ${step}: triggering autofill`)
  const report = await triggerAutofill()
  console.log(`✓ step ${step} autofill report:`, JSON.stringify(report))
  await page.waitForTimeout(1500) // controlled-component revert window

  const values = await collectValues()
  console.log(`\n— step ${step}: field state after autofill —`)
  for (const { label, value } of values)
    console.log(`  ${value === '' || value === 'Select One' ? '✗' : '✓'} ${label}: ${value || '(empty)'}`)

  // Signal/match introspection: what the detector saw and what the matcher
  // decided, per field — the diagnosis data live bugs always need.
  for (const dbg of (await collectDebug()) ?? []) {
    console.log(`— step ${step}: signals+matches (frame) —`)
    const matchById = new Map((dbg.matches ?? []).map((m) => [m.fieldId, m]))
    for (const s of dbg.signals ?? []) {
      const m = matchById.get(s.fieldId)
      const matchStr = m
        ? `${m.action} ${m.confidence} ${m.source}${m.provenance ? '/' + m.provenance : ''} → "${m.answer}"${m.chosenOptionValue ? ` [opt: ${m.chosenOptionValue}]` : ''}${m.inferAtFill ? ' [inferAtFill]' : ''}`
        : 'NO MATCH'
      console.log(
        `  · [${s.kind}] "${s.label}" (q="${s.normalizedQuestion}", src=${s.questionSource}, name=${s.name || '-'}, id=${s.id || '-'}, section=${s.sectionKind ?? '-'}#${s.sectionIndex ?? '-'}${s.eeoLike ? ', EEO' : ''}${s.filled ? ', filled' : ''}) ⇒ ${matchStr}`,
      )
      if (s.html) console.log(`      html: ${s.html.replace(/\n\s*/g, ' ').slice(0, 500)}`)
    }
  }

  // Detection-coverage check: dropdown-looking elements the detector did NOT
  // stamp with data-ff-id — true "not recognized" widgets show up here.
  const undetected = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll(
      'select, [role="combobox"], [role="listbox"], [aria-haspopup], [class*="dropdown" i], [class*="select" i]',
    )) {
      if (['OPTION', 'OPTGROUP'].includes(el.tagName)) continue
      if (el.closest('[data-flashfiller]')) continue
      if (el.hasAttribute('data-ff-id') || el.closest('[data-ff-id]') || el.querySelector('[data-ff-id]'))
        continue
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className ?? '').slice(0, 70),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 70),
      })
    }
    return out.slice(0, 20)
  })
  if (undetected.length) {
    console.log(`— step ${step}: dropdown-like elements NOT detected —`)
    for (const u of undetected) console.log(`  ? <${u.tag} class="${u.cls}"> ${u.label}`)
  }
  const shot = join(root, 'docs', wizard ? `harness-step-${step}.png` : 'harness-last-run.png')
  await page.screenshot({ path: shot, fullPage: true })
  console.log(`✓ screenshot: ${shot}\n`)

  if (reloadTest) {
    console.log('\n→ reload test: hard refresh (erasing form state), then refilling from the saved store…')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3500)
    const report2 = await triggerAutofill()
    console.log('✓ post-reload autofill report:', JSON.stringify(report2))
    await page.waitForTimeout(1500)
    const values2 = await collectValues()
    console.log('\n— post-reload field state —')
    for (const { label, value } of values2)
      console.log(`  ${value === '' || value === 'Select One' ? '✗' : '✓'} ${label}: ${value || '(empty)'}`)
    await page.screenshot({ path: join(root, 'docs', 'harness-reload-test.png'), fullPage: true })
    console.log(`✓ screenshot: ${join(root, 'docs', 'harness-reload-test.png')}`)
    break
  }

  if (!wizard) break
  // Wait for the HUMAN to advance (Save & Continue is never ours to click)
  const before = await formSignature()
  let advanced = false
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000)
    const sig = await formSignature()
    if (sig && sig !== before) {
      advanced = true
      break
    }
  }
  if (!advanced) break
}

if (keepOpen > 0) await page.waitForTimeout(keepOpen * 1000)
await context.close()
