import { normText } from '@/lib/job-dedupe'
import { blockTextExcluding, cleanCompany, firstEl, firstText, oneLine } from './dom'
import type { PostingAdapter } from './types'

// LinkedIn job pages — the logged-in detail pane (/jobs/view/<id>/, /jobs/search/?currentJobId=)
// and the public page (JSON-LD, criteria list). Class names churn; the selectors below are
// hints and lib/job-capture.ts's region scans (posted age, applicants, seniority, workplace
// pills) are the robust path. Never a requisition id here: LinkedIn rows key on `li:<id>`
// so they merge with Apify / JobFlow rows. Nothing is clicked (the full text sits under
// the CSS clamp; a clamped page is flagged, not expanded).
export const linkedin: PostingAdapter = {
  name: 'linkedin',
  extract(doc, url) {
    const titleEl = firstEl(doc, [
      'h1.job-details-jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title h1',
      'h1.top-card-layout__title',
      'h1.topcard__title',
      '.jobs-unified-top-card__job-title',
      '[class*="top-card"] h1',
      'h1',
    ])
    const title = oneLine(titleEl)?.replace(/\s+with verification$/i, '') ?? null

    const descriptionEl = firstEl(doc, [
      '#job-details',
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.show-more-less-html__markup',
      '.description__text',
      '[class*="jobs-description"]',
    ])
    const description = blockTextExcluding(descriptionEl, ['button', '.jobs-description__footer', '[class*="show-more-less-button"]'])

    const companyEl = firstEl(doc, [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      'a.topcard__org-name-link',
      '.topcard__org-name-link',
      '[class*="top-card"] a[href*="/company/"]',
      'a[href*="/company/"]',
    ])

    const criteria = new Map<string, string>()
    for (const item of Array.from(doc.querySelectorAll('.description__job-criteria-item'))) {
      const header = normText(item.querySelector('.description__job-criteria-subheader')?.textContent).toLowerCase()
      const value = normText(item.querySelector('.description__job-criteria-text')?.textContent)
      if (header && value) criteria.set(header, value)
    }

    const urn = doc.querySelector('[data-entity-urn*="jobPosting:"], [data-job-id]')
    const urnValue = urn?.getAttribute('data-entity-urn') ?? urn?.getAttribute('data-job-id') ?? ''
    const idMatch = /(\d{6,})/.exec(urnValue)

    let canonicalUrl: string | null = null
    const apply = doc.querySelector('a[href*="/jobs/view/externalApply/"]')
    if (apply) {
      try {
        canonicalUrl = new URL(apply.getAttribute('href') ?? '', url.href).searchParams.get('url')
      } catch {
        canonicalUrl = null
      }
    }

    return {
      title,
      titleEl,
      company: cleanCompany(oneLine(companyEl)),
      location: firstText(doc, [
        '.job-details-jobs-unified-top-card__bullet',
        '.jobs-unified-top-card__bullet',
        '.topcard__flavor--bullet',
      ]),
      description: description.length > 0 ? description : null,
      descriptionEl,
      experienceLevel: criteria.get('seniority level') ?? null,
      employmentType: criteria.get('employment type') ?? null,
      sector: criteria.get('industries') ?? null,
      applicantText: firstText(doc, ['.num-applicants__caption', '.jobs-unified-top-card__applicant-count', '[class*="applicant"]'], 80),
      linkedinJobId: idMatch ? idMatch[1] : null,
      canonicalUrl,
    }
  },
}
