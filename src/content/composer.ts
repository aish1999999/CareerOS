import type { Profile } from '@/types'
import { readProfilePath } from '@/lib/seed'

// ---------------------------------------------------------------------------
// Composite answers (Sections 6 & 9). Renders a minimal iteration template
// over a structured profile array, e.g.:
//   {{#workHistory}}{{title}} — {{company}} ({{startDate}}–{{endDate}})\n{{/workHistory}}
// Mini-language: {{#array}}…{{/array}} iteration + {{field}} interpolation.
// Deliberately NOT a full template engine.
// ---------------------------------------------------------------------------

const SECTION_RE = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g

function interpolateItem(body: string, item: Record<string, unknown>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (raw, field: string) => {
    const value = item[field]
    if (value === undefined || value === null || value === '') return raw
    return String(value)
  })
}

export interface ComposeResult {
  text: string
  /** True when every iterated array was empty — treat as unanswered. */
  empty: boolean
}

/**
 * Render a composite template against the profile. Section blocks iterate
 * profile arrays; {{profile.*}} refs outside blocks resolve directly; any
 * other {{var}} outside blocks is left for the variable resolver.
 */
export function renderComposite(template: string, profile: Profile): ComposeResult {
  let sawSection = false
  let anyItems = false

  let text = template.replace(SECTION_RE, (_m, arrayName: string, body: string) => {
    sawSection = true
    const arr = (profile as unknown as Record<string, unknown>)[arrayName]
    if (!Array.isArray(arr) || arr.length === 0) return ''
    anyItems = true
    return arr
      .map((item) => interpolateItem(body, item as Record<string, unknown>))
      .join('')
  })

  text = text.replace(/\{\{\s*(profile\.[\w.]+)\s*\}\}/g, (raw, path: string) => {
    const value = readProfilePath(profile, path)
    return value === '' ? raw : value
  })

  const empty = sawSection
    ? !anyItems
    : /\{\{\s*profile\.[\w.]+\s*\}\}/.test(text) // pure-interpolation template still unresolved

  return { text: text.replace(/\n+$/, ''), empty }
}
