import { describe, expect, it } from 'vitest'
import { extractPageContext, splitTitle } from '@/content/context'

function docFrom(html: string, title = ''): Document {
  const doc = document.implementation.createHTMLDocument(title)
  doc.body.innerHTML = html
  return doc
}

describe('extractPageContext', () => {
  it('prefers schema.org JSON-LD JobPosting', () => {
    const doc = docFrom('', 'Ignored | Title')
    const script = doc.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.textContent = JSON.stringify({
      '@type': 'JobPosting',
      title: 'Staff Engineer',
      hiringOrganization: { '@type': 'Organization', name: 'Acme Corp' },
      jobLocation: { address: { addressLocality: 'Berlin' } },
    })
    doc.head.appendChild(script)
    const ctx = extractPageContext(doc)
    expect(ctx).toMatchObject({
      company: 'Acme Corp',
      role: 'Staff Engineer',
      location: 'Berlin',
      source: 'jsonld',
    })
  })

  it('finds JobPosting inside @graph and arrays', () => {
    const doc = docFrom('')
    const script = doc.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.textContent = JSON.stringify({
      '@graph': [
        { '@type': 'WebSite' },
        { '@type': 'JobPosting', title: 'Designer', hiringOrganization: 'Globex' },
      ],
    })
    doc.head.appendChild(script)
    const ctx = extractPageContext(doc)
    expect(ctx.company).toBe('Globex')
    expect(ctx.role).toBe('Designer')
  })

  it('ignores malformed JSON-LD and falls back to meta', () => {
    const doc = docFrom('')
    const bad = doc.createElement('script')
    bad.setAttribute('type', 'application/ld+json')
    bad.textContent = '{not json'
    doc.head.appendChild(bad)
    const og = doc.createElement('meta')
    og.setAttribute('property', 'og:site_name')
    og.setAttribute('content', 'Initech')
    doc.head.appendChild(og)
    const ctx = extractPageContext(doc)
    expect(ctx.company).toBe('Initech')
    expect(ctx.source).toBe('meta')
  })

  it('falls back to document.title heuristics', () => {
    const doc = docFrom('', 'Senior Backend Engineer at Hooli')
    const ctx = extractPageContext(doc)
    expect(ctx.role).toBe('Senior Backend Engineer')
    expect(ctx.company).toBe('Hooli')
    expect(ctx.source).toBe('title')
  })
})

describe('splitTitle', () => {
  it('handles "role at company"', () => {
    expect(splitTitle('Engineer at Acme')).toMatchObject({ role: 'Engineer', company: 'Acme' })
  })
  it('handles separator-delimited titles', () => {
    expect(splitTitle('Engineer — Acme')).toMatchObject({ role: 'Engineer', company: 'Acme' })
    expect(splitTitle('Engineer | Careers | Acme')).toMatchObject({ role: 'Engineer', company: 'Acme' })
  })
})
