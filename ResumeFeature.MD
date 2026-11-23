Plan: Resume / document upload (FlashFiller v0.3)

STATUS: IMPLEMENTED 2026-07-17 (P1–P5; suite at 590 tests, build green). P0 live DOM
captures + the per-ATS live checklist remain open — see docs/testing-checklist.md
("Resume / document upload") and ROADMAP.md for what shipped.

Date: 2026-07-16 · Ground truth verified against the post-rebuild source (schema v6, 407 tests)


0. The core mechanism

Extensions cannot read the user's disk, but a content script CAN programmatically populate a
file input from bytes it already holds:

tsconst file = new File([bytes], 'resume.pdf', { type: 'application/pdf' })
const dt = new DataTransfer()
dt.items.add(file)
input.files = dt.files
input.dispatchEvent(new Event('input', { bubbles: true }))
input.dispatchEvent(new Event('change', { bubbles: true }))

So the feature is: the user uploads their resume once, into the extension (Options UI →
stored locally), and FlashFiller re-attaches those stored bytes to every application's file
input. Same shape as the rest of the product: store once, fill everywhere, validate honestly,
never submit.

For drag-drop-only widgets there is a second lever — a synthetic drop:

tsconst drop = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
dropzone.dispatchEvent(drop)

Between input.files = + change and a synthetic drop, virtually every ATS uploader is
reachable (Workday, Greenhouse, Lever all wire one of the two).


1. Verified ground truth — every place 'file' touches today

SiteToday's behaviorChange neededdetector.ts:448-449inputKind maps type=file → kind 'file'keepdetectFields visibility gate (isHiddenOrHoneypot)hidden inputs are dropped — and ATS file inputs are almost always display:none behind a "Select files" button. Today most real upload fields are never even detected. There is already precedent for an exception: the styled-select pattern rescues hidden <select>sadd a file-input exceptionmatcher.ts:1193matchField returns null for kind === 'file'route to document matching insteadindex.ts:676-686runAutofill flags every file field: "Attach your file manually — extensions can't set file fields"attach when a stored doc matches; flag chip stays the fallbackindex.ts:384sessionAnswers replay excludes filekeepindex.ts:894captureGate excludes filekeep (never capture uploads)validate.ts:144file fields → verdict skippedreal verdict: read input.files / rendered filenamemanifest.config.ts:25permissions: storage, activeTab, scripting, debuggeradd unlimitedStorage (base64 PDFs blow the 10MB chrome.storage.local quota fast)CLAUDE.md house rules"file uploads untouched" hard limitsupersede with dated note (user-directed feature)

Storage note: content scripts must NOT use IndexedDB for this — a content script's IndexedDB
belongs to the page's origin, not the extension. chrome.storage.local (extension-scoped,
reachable from every context) + unlimitedStorage is the right home. Documents live under
their own storage key (flashfiller_documents_v1), not inside the main store — the main
store is parsed by zod on every getStore() and shouldn't drag megabytes of base64 through
every read.


2. Feature design

2a. Document store (src/lib/documents.ts, new)

tsinterface StoredDocument {
  id: string
  kind: 'resume' | 'coverLetter' | 'other'
  name: string          // "Candidate_Resume.pdf" — what sites will display
  mime: string          // application/pdf | docx mime | text/plain…
  bytesB64: string      // base64 payload
  size: number          // raw bytes, for UI + per-site max-size checks
  personas: string[]    // [] = universal — same convention as QAEntry
  isDefault: boolean    // the one auto-attached when several match
  createdAt / updatedAt: number
}

API: listDocuments(), saveDocument(file: File, kind) (FileReader → base64),
deleteDocument(id), getDocumentBytes(id) (base64 → Uint8Array),
pickDocument(docs, { docCue, accept, persona }) — the matching brain, pure and unit-testable:


filter by kind from the field's cue (resume vs cover letter, §2c)
filter by the input's accept attribute (an accept=".pdf" input never gets the .docx)
prefer active-persona docs, then isDefault, then most recent
return null honestly when nothing fits → flag chip


Versioning: DOCS_SCHEMA_VERSION inside the key's envelope; no migration needed for v1.

2b. Options UI — "Documents" panel

New DocumentsTab.tsx (or a section in ProfileTab): file picker → saveDocument; list with
name, kind selector, size, personas, "default" star, delete; size warning past ~4MB (some ATS
caps); note that files never leave the machine except into the application form itself.
Empty-state copy tells the user this is why FlashFiller can now attach resumes.

2c. Detection (detector.ts)


Visibility exception: in the detectFields loop, before the isHiddenOrHoneypot
skip: a hidden input[type=file] is NOT dropped — hidden-ness is the normal styling for
real upload inputs (mirror of the styled-select rescue, same comment style). Honeypot risk
is low (honeypots are text inputs wanting keystrokes), but keep the off-screen-position
check as a veto.
Upload-zone association: new fileUploadZone(input) — closest() of known dropzone
markers ([data-automation-id*="file-upload"], [data-automation-id*="attachments"],
class/aria cues like dropzone, upload, "drag and drop" text) so the SIGNAL's label
resolves from the zone via the existing label cascade, and fill can target the zone for
the synthetic-drop fallback. Store on DetectedField as uploadZoneEl?: HTMLElement.
Document-kind cue: docCue: 'resume' | 'coverLetter' | 'other' on the SignalBundle —
RESUME_RE = /\b(resume|resumé|curriculum vitae|cv)\b/i,
COVER_RE = /\bcover\s*letter\b/i, tested against the cascade label + zone text +
name/id/automation-id. Workday's combined "Resume/CV" zone → resume.


2d. Matching (matcher.ts)

Replace the kind === 'file' → null early-return with a small tier: if the caller supplies
ctx.documents, run pickDocument; a hit returns a MatchResult with
source: 'document:<id>', rawAnswerTemplate: doc.name, confidence: 0.92,
action: 'autofill' (gated by a new settings.autoAttachDocuments, default ON — the user
curated these bytes personally; suggest-only mode available via the toggle). No stored doc →
null → today's flag chip. Matcher stays pure: documents metadata rides in via
MatcherContext.documents (bytes are NOT in the context — fill fetches them by id).

2e. Fill (autofill.ts — new fillFileUpload)

fillFileUpload(field, doc bytes):
  1. build File + DataTransfer; set input.files; dispatch input + change
  2. verify: input.files.length === 1 && names match → 'filled'
  3. else if uploadZoneEl: synthetic DragEvent('dragenter'/'dragover'/'drop') with the
     DataTransfer → re-verify (input.files OR a rendered filename in the zone, §2f reader)
  4. else 'failed' → honest chip ("Couldn't attach automatically — attach manually")

Multi-file inputs (input.multiple, "additional attachments"): v1 attaches the single picked
document; never more than one without an explicit user action.
fillDelayMs respected like every other fill; selfFilled marked so capture ignores it.

2f. Validation (validate.ts)

Replace the skipped verdict for file fields that had a match:
readActualValue for file kind = input.files[0]?.name else the upload zone's rendered
filename text (ATSes render a chip with the file name after successful hand-off — new
uploadZoneFilename(zone) reader shared with fill's verification step).
Verdicts: ok (name matches stored doc), missing-answerable (attach attempted, zone still
empty — retry chip), skipped (no stored documents). "WRONG" is unlikely but kept: a
different filename than expected surfaces it.

One honest limitation, documented: FlashFiller can verify the file was handed to the page,
not that the site's async upload to its server succeeded. The toast copy stays
"Review before submitting!" — the user sees the site's own upload state before submit.

2g. What stays forbidden

Never auto-submit (unchanged). Never capture/store files FROM pages. Cover-letter generation
is out of scope for v1 (stored static cover letters attach fine; per-posting generated ones
are a later feature riding the judge). EEO/consent unchanged.


3. Implementation phases (each independently landable + testable)

PhaseContentFilesP0 — fixturesCapture real upload-widget DOM (closed + after manual attach) from Workday, Greenhouse, Lever per the docs/ capture protocol; turn into jsdom fixtures. Drives every regex/selector above.docs/dom-captures/, tests/fixtures/P1 — store + UIlib/documents.ts, unlimitedStorage permission, Documents panel, settings toggle autoAttachDocumentslib, manifest, uiP2 — detecthidden-file-input exception, upload-zone association, docCue, label-from-zonedetector.tsP3 — match + fillpickDocument tier in matcher, fillFileUpload with drop fallback, runAutofill wiring (attach when doc matches, flag chip else)matcher.ts, autofill.ts, index.tsP4 — validatefile verdicts + zone filename reader + retry chipvalidate.ts, index.tsP5 — docs + testsCLAUDE.md hard-limit supersession (dated), ROADMAP, testing-checklist live sectiondocs

Test strategy (known jsdom gap)

jsdom implements File but not DataTransfer or DragEvent — the two APIs at the heart
of fill. Handle exactly like the trusted-click tier: isolate the environment-dependent bits in
one small buildFileTransfer(file) helper, feature-detect at runtime, and in vitest install a
~20-line DataTransfer/DragEvent shim in tests/setup.ts (items.add / files list / dataTransfer
property — enough to assert the wiring). Unit-test fully: pickDocument (kind/accept/persona/
default preferences), base64 round-trip, detector fixtures (hidden input rescued, zone label,
docCue), fill outcome paths with the shim, validation verdicts. Live verification then covers
what jsdom can't (real drop handlers, per-ATS upload flows).

Live checklist (per ATS, appended to testing-checklist.md)


Options → Documents: upload a PDF resume → appears with size/kind; survives reload.
Workday attachments step: resume auto-attaches, site renders its filename chip, validation
toast counts it ok; site's own "uploaded" state appears before Submit.
accept=".doc,.docx"-only input with only a PDF stored → no attach, honest flag chip.
Cover-letter zone with no stored cover letter → flag chip, resume NOT attached there.
Toggle autoAttachDocuments off → suggestion chip instead of silent attach; Accept attaches.
Multi-file "additional documents" zone → only the default resume, once.
Greenhouse + Lever pass (fixture parity).



4. Risks / open questions


Framework-managed uploaders that ignore change (rare; some React uploaders only listen
to drop): covered by the drop fallback; if a site needs trusted events, the existing CDP
tier could later gain a DOM.setFileInputFiles escalation — that CDP call needs a real temp
file path, which extensions can't write, so it is explicitly OUT of scope; the honest-chip
fallback covers it.
Site-side size/type caps: store size + mime; pre-check accept; surface site rejections
via the validation zone reader (zone shows the site's error text → missing-answerable chip).
Workday "parse my resume" flows: attaching can trigger the site's own parser overwriting
fields FlashFiller filled — mitigation: attach FIRST in runAutofill order (before text
fills), then the normal rescan/refill pass runs after; pin with a live check.
storage bloat: unlimitedStorage + separate key; UI shows per-doc size; no auto-pruning in v1.
Filename privacy: filenames often contain the user's name — that is the point (sites
display them); no redaction needed, but never log bytes, only names/sizes in breadcrumbs.