import type { PageContext, Profile } from '@/types'
import { readProfilePath } from '@/lib/seed'

// ---------------------------------------------------------------------------
// Template variables (Section 7). Matching happens on question text; the
// chosen answer may contain {{company}}, {{role}}, {{location}}, {{today}},
// or {{profile.*}}. Resolution happens here, at fill time — never at match
// time. A variable that can't be resolved is reported, NOT filled literally.
// ---------------------------------------------------------------------------

const VAR_RE = /\{\{\s*([\w.]+)\s*\}\}/g

/** Variables referenced in a template (excludes {{#section}} markers). */
export function detectVariables(text: string): string[] {
  const vars = new Set<string>()
  for (const m of text.matchAll(VAR_RE)) vars.add(m[1])
  return [...vars]
}

export interface ResolveInput {
  context: PageContext
  profile: Profile
  /** Per-application-session answers to unresolved-variable prompts (Section 7):
   *  remembered for the current application only, never stored globally. */
  session?: Map<string, string>
  /** Injectable for tests. */
  today?: () => string
}

export interface ResolveResult {
  text: string
  unresolved: string[]
}

function defaultToday(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${d.getFullYear()}`
}

function lookupVariable(name: string, input: ResolveInput): string | null {
  const session = input.session
  if (session?.has(name)) return session.get(name)!
  switch (name) {
    case 'company':
      return input.context.company
    case 'role':
    case 'jobTitle':
      return input.context.role
    case 'location':
      return input.context.location
    case 'today':
      return (input.today ?? defaultToday)()
    default:
      // Any dotted path resolves against the profile — the "profile." prefix
      // is optional (seed templates say "{{education.0.degree}}"; a literal
      // prompt chip for that name is never what anyone wants).
      if (name.includes('.')) {
        const value = readProfilePath(input.profile, name)
        return value === '' ? null : value
      }
      return null
  }
}

/**
 * Substitute all resolvable variables. Unresolved ones are left in place and
 * reported in `unresolved`; the fill path must prompt for them instead of
 * writing literal braces to the page (Section 7).
 */
export function resolveVariables(template: string, input: ResolveInput): ResolveResult {
  const unresolved = new Set<string>()
  const text = template.replace(VAR_RE, (raw, name: string) => {
    const value = lookupVariable(name, input)
    if (value === null || value === undefined || value === '') {
      unresolved.add(name)
      return raw
    }
    return value
  })
  return { text, unresolved: [...unresolved] }
}
