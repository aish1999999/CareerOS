import { atsReqIdFromUrl } from '@/lib/job-dedupe'
import { blockTextExcluding, cleanCompany, firstEl, firstText } from './dom'
import type { PostingAdapter } from './types'

// Greenhouse boards (boards.greenhouse.io/<company>/jobs/<id>, job-boards.greenhouse.io,
// and the embedded board a company site loads with ?gh_jid=<id>). The title /
// company / location selectors are the registry's; `#content` also holds the
// application form on the classic board, so the form is cut before the text is read.
export const greenhouse: PostingAdapter = {
  name: 'greenhouse',
  extract(doc, url) {
    const descriptionEl = firstEl(doc, ['.job__description', '#job-description', '[class*="job__description"]', '#content'])
    const description = blockTextExcluding(descriptionEl, ['#application', 'form', '#header', '.job__header', 'h1.app-title', '.company-name', '.location'])
    return {
      title: firstText(doc, ['h1.job__title', '.app-title', 'h1.section-header', 'h1']),
      company: cleanCompany(firstText(doc, ['.company-name', '[class*="company-name"]'])),
      location: firstText(doc, ['.location', '.job__location', '[class*="job__location"]']),
      description: description.length > 0 ? description : null,
      descriptionEl,
      atsReqId: atsReqIdFromUrl(url.href),
    }
  },
}
