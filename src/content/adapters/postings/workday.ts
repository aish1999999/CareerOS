import { atsReqIdFromUrl } from '@/lib/job-dedupe'
import { blockText, firstEl, firstText, parsePostedAge } from './dom'
import type { PostingAdapter } from './types'

// Workday job postings (<tenant>.wd5.myworkdayjobs.com/.../job/<location>/<slug>_<req>).
// The data-automation-id handles are the ones the autofill adapter already relies
// on (jobPostingHeader, locations) plus the description container jd-capture.ts
// has used live; postedOn / requisitionId / remoteType are best-effort until an
// outerHTML from Bob confirms them — a miss degrades to the generic ladder.
export const workday: PostingAdapter = {
  name: 'workday',
  extract(doc, url) {
    const descriptionEl = firstEl(doc, ['[data-automation-id="jobPostingDescription"]'])
    const description = descriptionEl ? blockText(descriptionEl) : null
    return {
      title: firstText(doc, ['[data-automation-id="jobPostingHeader"]', 'h2[data-automation-id]', 'h1']),
      location: firstText(doc, ['[data-automation-id="locations"] dd', '[data-automation-id="locations"]']),
      description: description && description.length > 0 ? description : null,
      descriptionEl,
      postedAgeText: parsePostedAge(firstText(doc, ['[data-automation-id="postedOn"] dd', '[data-automation-id="postedOn"]'])),
      // what the page states; the key and the column take the URL's id (lib/job-capture.ts buildJobRow)
      atsReqId: firstText(doc, ['[data-automation-id="requisitionId"] dd'], 40) ?? atsReqIdFromUrl(url.href),
      workTypeText: firstText(doc, ['[data-automation-id="remoteType"] dd', '[data-automation-id="remoteType"]'], 40),
    }
  },
}
