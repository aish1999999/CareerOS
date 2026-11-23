import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { detectFields } from '@/content/detector'
import { extractPageContext } from '@/content/context'
import { matchAll, type MatcherContext } from '@/content/matcher'
import { resolveVariables } from '@/content/variables'
import { fillField } from '@/content/autofill'
import { defaultProfile, defaultSettings } from '@/lib/schema'
import type { QAEntry } from '@/types'

// ---------------------------------------------------------------------------
// E2E smoke (Section 15/18): saved ATS HTML → detect → extract context →
// match → resolve variables → fill. Asserts the full pipeline, including the
// safety rails (no consent, no file inputs, no literal braces).
// ---------------------------------------------------------------------------

function loadFixture(name: string): void {
  // import.meta.url is http-scheme under the jsdom environment; cwd is the repo root
  const path = resolve(process.cwd(), 'tests/fixtures', name)
  document.body.innerHTML = readFileSync(path, 'utf-8')
}

const profile = {
  ...defaultProfile(),
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@lovelace.dev',
  phone: '+49 151 1234567',
  workAuthorization: 'Yes',
  requiresSponsorship: false,
  desiredSalary: '€95,000',
  links: { linkedin: 'https://linkedin.com/in/ada', github: 'https://github.com/ada', portfolio: '', website: '' },
  workHistory: [
    { company: 'Analytical Engines GmbH', title: 'Staff Engineer', startDate: '2021', endDate: 'Present', location: 'Berlin', description: '' },
  ],
}

const qa: QAEntry[] = [
  {
    id: 'why',
    question: 'Why do you want to work here?',
    aliases: ['Why do you want to work at this company?'],
    answer: 'I admire {{company}} and want to build things that matter.',
    answerType: 'text',
    answerTemplate: null,
    mapsTo: null,
    variables: ['company'],
    personas: [],
    tags: [],
    fieldType: 'textarea',
    options: [],
    status: 'active',
    source: 'training',
    captureContext: null,
    createdAt: 0,
    updatedAt: 0,
  },
]

function ctx(): MatcherContext {
  return { profile, qa, seeds: [], settings: defaultSettings(), activePersona: null }
}

async function runPipeline() {
  const detected = detectFields(document)
  const pageContext = extractPageContext(document)
  const matches = await matchAll(detected.map((d) => d.signal), { ...ctx(), pageContext })
  const outcomes: Record<string, string> = {}
  for (const field of detected) {
    const match = matches.get(field.signal.fieldId)
    if (!match || match.action !== 'autofill') continue
    const { text, unresolved } = resolveVariables(match.rawAnswerTemplate, {
      context: pageContext,
      profile,
    })
    if (unresolved.length > 0) continue
    outcomes[field.el.id || field.signal.name] = (
      await fillField(field, { ...match, resolvedAnswer: text })
    ).outcome
  }
  return { detected, pageContext, matches, outcomes }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('Greenhouse fixture', () => {
  it('fills profile fields, resolves {{company}} from JSON-LD, refuses file input', async () => {
    loadFixture('greenhouse.html')
    const { pageContext, outcomes } = await runPipeline()

    expect(pageContext).toMatchObject({ company: 'Hooli', role: 'Senior Frontend Engineer', source: 'jsonld' })

    expect((document.getElementById('first_name') as HTMLInputElement).value).toBe('Ada')
    expect((document.getElementById('last_name') as HTMLInputElement).value).toBe('Lovelace')
    expect((document.getElementById('email') as HTMLInputElement).value).toBe('ada@lovelace.dev')
    expect((document.getElementById('phone') as HTMLInputElement).value).toBe('+49 151 1234567')
    expect((document.getElementById('question_2') as HTMLInputElement).value).toBe('https://linkedin.com/in/ada')

    // Free-text KB answer with the company resolved — no literal braces
    const why = (document.getElementById('question_1') as HTMLTextAreaElement).value
    expect(why).toContain('Hooli')
    expect(why).not.toContain('{{')

    // File input untouched, honeypot untouched
    expect(outcomes['resume']).toBeUndefined()
    expect((document.querySelector('[name="honeypot_field"]') as HTMLInputElement).value).toBe('')
  })

  it('answers the work-authorization select from the profile', async () => {
    loadFixture('greenhouse.html')
    await runPipeline()
    expect((document.getElementById('question_3') as HTMLSelectElement).value).toBe('Yes')
  })
})

describe('Lever fixture', () => {
  it('fills name/email/company/github/salary, answers the sponsorship radio, leaves consent alone', async () => {
    loadFixture('lever.html')
    await runPipeline()

    const byName = (name: string) =>
      document.querySelector<HTMLInputElement>(`[name="${name.replace(/([[\]])/g, '\\$1')}"]`)!

    expect(byName('name').value).toBe('Ada Lovelace')
    expect(byName('email').value).toBe('ada@lovelace.dev')
    expect(byName('org').value).toBe('Analytical Engines GmbH')
    expect(byName('urls[GitHub]').value).toBe('https://github.com/ada')
    expect(byName('cards[custom_q][field0]').value).toBe('€95,000')

    // Sponsorship radio: profile.requiresSponsorship=false → "No"
    const radios = [...document.querySelectorAll<HTMLInputElement>('[name="sponsorship"]')]
    expect(radios.find((r) => r.value === 'No')!.checked).toBe(true)

    // Consent checkbox NEVER auto-checked (Section 13)
    expect(byName('consent[marketing]').checked).toBe(false)
  })
})
