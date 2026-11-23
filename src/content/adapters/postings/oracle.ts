import { atsReqIdFromUrl } from '@/lib/job-dedupe'
import { blockTextExcluding, firstEl, firstText, parsePostedAge } from './dom'
import type { PostingAdapter } from './types'

// Oracle Recruiting Cloud Candidate Experience (…/sites/CX_1/job/<id>, /requisitions/preview/<id>),
// on pod hosts and on vanity domains the registry fingerprints from <base data-apibaseurl>.
// `.job-details__title` is the registry's; the description / posted-date handles are
// best-effort until the live gate. og:site_name ("<Company> Careers") is cleaned in
// lib/job-capture.ts — the adapter never guesses the company.
export const oracle: PostingAdapter = {
  name: 'oracle',
  extract(doc, url) {
    const descriptionEl = firstEl(doc, ['.job-details__description-content', '.job-details__description', '[class*="job-details__description"]', '[class*="job-description"]'])
    const description = blockTextExcluding(descriptionEl, ['form', 'nav', 'button', '[class*="apply"]'])
    return {
      title: firstText(doc, ['.job-details__title', 'h1']),
      location: firstText(doc, ['.job-details__location', '[class*="job-details__location"]', '[class*="job-location"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      postedAgeText: parsePostedAge(firstText(doc, ['.job-details__posted-date', '[class*="posted-date"]'])),
      atsReqId: atsReqIdFromUrl(url.href),
    }
  },
}
