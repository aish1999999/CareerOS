/**
 * The panel, actually rendered and actually pressed.
 *
 * Every other Stage 8 test calls the pure halves — readGate, generateState, missingBeforeDraft —
 * and they all passed while the screen they belong to could not produce a message. What they cannot
 * see is the wiring: which boxes exist, what a read leaves behind, and whether Generate is reachable
 * from where a real read leaves you. That is what this file drives.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { resetChromeMock, seedChromeStorage } from './setup'

// @ts-expect-error — React's act() flag, which is not typed on globalThis
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** What the reader hands back. Each test sets this before it mounts. */
let capture: unknown = null

vi.mock('@/lib/outreach', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/outreach')>()
  return { ...real, captureActiveTabProfile: async () => capture }
})

const TEMPLATES = [{
  key: '30s_female_casual', bracket: '30s', gender: 'f', tone: 'casual',
  body: 'Hi [Name]! Your [Stand out skill] at [Company] is great. My [Your Skillset] points at [Your Target Role].',
  skeletonChars: 70,
}]

/** The hub, answering exactly as apps/mapper/service/outreach.py does. */
let templatesStatus = 200
globalThis.fetch = vi.fn(async (url: unknown, init: { body?: string } = {}) => {
  const path = String(url)
  if (path.endsWith('/outreach/templates')) {
    return templatesStatus === 200
      ? new Response(JSON.stringify({ templates: TEMPLATES, max: 300, tokens: [], banned: [] }), { status: 200 })
      : new Response(JSON.stringify({ error: 'bad or missing X-Tailor-Token.' }), { status: templatesStatus })
  }
  if (path.endsWith('/outreach/draft')) {
    const body = JSON.parse(init.body ?? '{}') as { values: Record<string, string> }
    const text = `Hi ${body.values.name}! Your ${body.values.standoutSkill} at ${body.values.company} is great.`
    return new Response(JSON.stringify({
      ok: true, templateKey: '30s_female_casual', text, chars: text.length, max: 300, reasons: [],
    }), { status: 200 })
  }
  return new Response('{}', { status: 200 })
}) as unknown as typeof fetch

async function mount(): Promise<HTMLElement> {
  const { OutreachPanel } = await import('@/ui/components/OutreachPanel')
  const host = document.createElement('div')
  document.body.appendChild(host)
  await act(async () => { createRoot(host).render(<OutreachPanel />) })
  return host
}

const button = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(label)) ?? null
const testId = (host: HTMLElement, id: string) => host.querySelector(`[data-testid="${id}"]`)
const boxFor = (host: HTMLElement, placeholder: string) =>
  [...host.querySelectorAll('input')].find((i) => i.placeholder === placeholder) ?? null

const click = (el: Element | null) =>
  act(async () => { el?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })

const type = (input: HTMLInputElement | null, value: string) =>
  act(async () => {
    if (!input) throw new Error('no such box on the panel')
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })

const READ = {
  linkedinUrl: 'https://www.linkedin.com/in/ana/', slug: 'ana',
  fullName: 'Ana Diaz', firstName: 'Ana', lastName: 'Diaz',
  headline: 'Pricing lead at Acme', company: 'Acme',
  suggestedBracket: '30s', bracketWhy: 'graduated 2012',
  suggestedGender: 'f', genderWhy: 'she/her on the profile',
}

/** Fill everything the hub needs, from wherever the read left off. */
async function completeTheForm(host: HTMLElement) {
  await click(button(host, 'in their 30s'))
  await click(button(host, 'female'))
  await type(boxFor(host, 'where they work'), 'Acme')
  await type(boxFor(host, 'the one thing you would say about them'), 'dynamic pricing')
}

describe('the outreach panel, rendered', () => {
  beforeEach(() => {
    resetChromeMock()
    templatesStatus = 200
    capture = { status: 'sent', note: 'Read Ana Diaz at Acme.', profile: READ, pageTitle: null, url: READ.linkedinUrl }
    document.body.innerHTML = ''
    seedChromeStorage('flashfiller_tailor_v1', { baseUrl: 'http://127.0.0.1:8765', token: 't' })
    seedChromeStorage('flashfiller_outreach_v1', {
      tone: 'casual', skillset: 'pricing analytics',
      lastTargetRole: 'Product Manager', targetRoles: ['Product Manager'],
    })
  })

  it('reads a profile, fills the fields and writes the note', async () => {
    const host = await mount()
    await click(button(host, 'Read this profile'))
    await completeTheForm(host)

    const generate = testId(host, 'outreach-generate') as HTMLButtonElement
    expect(generate.disabled).toBe(false)
    await click(generate)

    expect(testId(host, 'outreach-note')?.textContent)
      .toBe('Hi Ana! Your dynamic pricing at Acme is great.')
  })

  /**
   * The failure this file was written for. A profile that had not finished rendering gives the
   * reader no name; it refuses, and used to take the whole person down with it — leaving no name,
   * no box to type one into, and Generate disabled with "read the profile again" as the only
   * advice, which reads the same nothing a second time.
   */
  it('keeps a read that came back without a name, and lets the name be typed', async () => {
    capture = {
      status: 'error', pageTitle: null, url: READ.linkedinUrl,
      note: 'Read the page but found no name on it — scroll the profile to the top and press this again, or type the name in.',
      profile: { ...READ, fullName: null, firstName: null, lastName: null },
    }
    const host = await mount()
    await click(button(host, 'Read this profile'))

    // the person survived the missing name: the suggestions the reader did make are on screen
    expect(button(host, 'in their 30s')).not.toBeNull()
    // and the reader's complaint is shown rather than swallowed for opening with the word "Read"
    expect(host.textContent).toContain('found no name on it')

    await completeTheForm(host)
    expect((testId(host, 'outreach-generate') as HTMLButtonElement).disabled).toBe(true)

    await type(boxFor(host, 'the name the note opens with'), 'Ana')
    const generate = testId(host, 'outreach-generate') as HTMLButtonElement
    expect(generate.disabled).toBe(false)
    await click(generate)
    expect(testId(host, 'outreach-note')?.textContent)
      .toBe('Hi Ana! Your dynamic pricing at Acme is great.')
  })

  it('a read that refused outright is still refused', async () => {
    capture = { status: 'error', profile: null, pageTitle: null, url: 'https://example.com',
                note: 'That tab is example.com — this reads a LinkedIn profile.' }
    const host = await mount()
    await click(button(host, 'Read this profile'))
    expect(host.textContent).toContain('this reads a LinkedIn profile')
    expect(button(host, 'in their 30s')).toBeNull()
  })

  /**
   * The shelf. lib/outreach.ts has kept the last ten notes all along; nothing showed them, so a
   * note for the person before this one was reachable only by opening their profile again.
   */
  it('lists the notes it drafted and puts one back in every box', async () => {
    const host = await mount()
    expect(testId(host, 'outreach-recents')).toBeNull()          // nothing drafted yet: no furniture

    await click(button(host, 'Read this profile'))
    await completeTheForm(host)
    await click(testId(host, 'outreach-generate'))
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })

    expect(host.querySelectorAll('.recents-table tbody tr')).toHaveLength(1)
    expect(testId(host, 'outreach-recents')?.textContent).toContain('Ana Diaz')
    expect(testId(host, 'outreach-recents')?.textContent).toContain('Acme')

    // he moves on, as a closed and reopened popup would leave him
    await click(button(host, 'Read this profile again'))
    await type(boxFor(host, 'where they work'), 'Other Co')
    await type(boxFor(host, 'the one thing you would say about them'), 'something else')
    expect(testId(host, 'outreach-note')?.textContent ?? '').not.toContain('dynamic pricing')

    await click(testId(host, 'outreach-recents-retrieve-0'))
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })

    expect((boxFor(host, 'the name the note opens with') as HTMLInputElement).value).toBe('Ana')
    expect((boxFor(host, 'where they work') as HTMLInputElement).value).toBe('Acme')
    expect((boxFor(host, 'the one thing you would say about them') as HTMLInputElement).value).toBe('dynamic pricing')
    expect(testId(host, 'outreach-note')?.textContent).toBe('Hi Ana! Your dynamic pricing at Acme is great.')
    // the chips come back CONFIRMED, or Generate would be dead on a note that is already written
    expect(host.textContent).toContain('you confirmed')
  })

  it('says so when the template bank could not be read, instead of looking healthy', async () => {
    templatesStatus = 401
    const host = await mount()
    expect(host.textContent).toContain('rejected the token')
  })
})
