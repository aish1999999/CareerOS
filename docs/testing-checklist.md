# Live verification checklist

The suite (276 tests) proves logic; only a real application page proves a widget. Update statuses as you test: ✅ verified live · ⏳ shipped untested · ❌ broken (add a note + date).

## Workday (primary)

| Area | Status | Last checked | Notes |
|---|---|---|---|
| Text inputs / textareas (My Information) | ✅ | 2026-07-12 | |
| Segmented dates MM/YYYY (From/To) | ✅ | 2026-07-13 | values, focus flow, validation clears |
| Repeated work-experience sections (right entry per block) | ✅ | 2026-07-14 | harness-verified: titles/companies/descriptions/dates per section |
| Education section (school/degree/field/dates from education, not work) | ⏳ | 2026-07-16 | NVIDIA harness: School ✓; Degree seed now carries {{degree}} fallback for listboxes; degree seed no longer steals "Field of study" labels; Year-only date labels under diagnosis |
| Degree per education block (PSG block → Bachelors, never "highest degree" Masters) | ⏳ | 2026-07-16 | indexed-section fields now use only that entry's tier-1 answer — global qa/seed answers excluded from ranking AND option-walk fallback; {{education.0.*}} seed templates now resolve (flat forms) |
| Poisoned-alias immunity (EEO entry wearing another field's label never fills it) | ⏳ | 2026-07-16 | live corruption fixed: v7 migration strips cross-EEO aliases + opaque-id answers; matcher skips crossing learned entries; alias-divergence guard chips instead of filling; verify school fills correctly on Workday education |
| Capture identity guard (wizard step swap never captures across widgets) | ⏳ | 2026-07-16 | dropdown diff now tracks question identity per data-ff-id; watch console for "capture skipped: widget identity changed" |
| Multiselect search-combobox (Field of Study / Skills: input + ☰ list button) | ⏳ | 2026-07-16 | new: input detected as custom-dropdown via multiselect container; fill = type → Enter-search → click option → pill verify, ☰ button fallback; pill = filled on rescan. Round 2: full phrase finding nothing → search broadens word-by-word ("Industrial", "Engineering") and the OpenAI judge picks the CLOSEST catalog option (needs key in Settings → Semantic matching); judge declines → honest chip. If still failing: capture protocol below (input + container + ☰ button outerHTML, closed AND after clicking ☰) + `[FlashFiller] dropdown` console lines |
| Questionnaire dropdowns (button aria-haspopup=listbox) | ✅ | 2026-07-14 | harness: sponsorship/authorized/relocate → Yes; salary textarea ✓ |
| Hierarchical prompt (How did you hear → Website → company domain) | ⏳ | 2026-07-16 | live bug fixed: category click empties the panel while Workday fetches sub-options — the 600ms watch read that as "committed" and stopped at the primary. Expandable rows now wait up to 4s through the swap, and the company-brand leaf pick outranks semantic tiers at sub-levels. Retest: primary AND domain leaf must both land |
| Hierarchical cascade judge (How did you hear: answer matches no category text) | ⏳ | 2026-07-16 | new: when no sub-option matches lexically, all branches are harvested and ONE OpenAI call picks category + sub-option together (console: `[FlashFiller] dropdown cascade: judge picked "…" → "…"`); needs key; also runs with NO stored answer (fact-sheet anchored); judge declines → chip |
| Multi-select checkbox groups | ⏳ | | |
| EEO / Voluntary Disclosures listboxes | ⏳ | 2026-07-14 | harness: ethnicity matched but placement failed honestly (option wording; trusted tier off under harness); consent box correctly refused |
| Self-Identify page (name/date fields) | ⏳ | | |
| Chips reposition on inner-container scroll | ⏳ | | |
| Header language picker ignored (never filled) | ✅ | 2026-07-13 | chrome exclusion |

## Cross-site answering (SHIPPED 2026-07-14 — all ⏳ until seen live)

| Area | Status | Last checked | Notes |
|---|---|---|---|
| Import file (58 answers) fills screening questions | ⏳ | | user must import flashfiller-profile-import.local.json first |
| "Have you worked at ‹company›?" → No on unseen site | ⏳ | | brand tokens from pageContext + hostname |
| Prior-employment options worded per company ("I have never worked for ‹X›…" / "Not applicable" / "No experience") | ⏳ | 2026-07-16 | "never" now reads as negate (intent fix) + tier-1 No/Yes carries meaning-fallback wordings through chooseOption at match AND fill time; verify on a Workday listbox with no literal "No" option |
| Travel % on ranges AND integers | ⏳ | | numeric-range matching; also age brackets ("24" → 18-24) |
| Fallback answers (F-1 ↔ OPT; IE → Engineering) | ⏳ | | select/radio/custom-dropdown |
| Earliest start date: date widget vs text box | ⏳ | | 2026-09-01 vs "September 1, 2026" |
| Consent boxes with stored answers auto-tick per curated answers | ⏳ | | full-autonomy mode (2026-07-14); unmatched consent still flags |
| Notify chips (locations, interview availability, references) | ⏳ | | guidance text, no Accept fill |
| Judge: "How did you hear" w/o Website option → closest professional | ⏳ | | needs OpenAI key in Settings |
| Judge: unknown custom dropdown inferred at fill time | ⏳ | | needs key; declines honestly → chip |
| answerMode "judge" entries (Field of Study): OpenAI ALONE places the option, lexical off | ⏳ | 2026-07-16 | user request "for this question only openai should answer"; set via Answers tab "AI judge only" checkbox or import; field-of-study import entry pre-set; judge off/declines → chip, never a lexical guess; USER: re-import file (merge) + key in Settings |
| Judge: open-ended question → drafted answer FILLS directly | ⏳ | | full-autonomy mode; saved for reuse; UNKNOWN → chip |
| Learning loop: refill same page → no new API calls | ⏳ | | entries tagged ai-inferred in Answers tab |
| Account creation: email+password(+verify) fill on a Workday signup screen | ⏳ | | account email ≠ contact email; user clicks Create Account; password never captured/shown |
| Address fields near From/To date ranges stay EMPTY (2026-07-15 fix) | ⏳ | | bare From/To now needs date context; session cache kind-guarded; real date fields must still fill |
| Validation layer: toast shows "validated: N ok…", wrong fills get fix chips | ⏳ | 2026-07-15 | harness-verified on greenhouse fixture (6 ok/1 unanswered/1 skipped); paste `[FlashFiller] validation` lines in bug reports |
| Validate pill button: on-demand census, chips + toast, report stored (`flashfiller_validation_v1` in chrome.storage.local) | ⏳ | 2026-07-21 | new outline button next to Autofill; works pre-Autofill too (coverage census); badge stays visible at 0 fillable once a report exists |
| AI Fill pill button: fills ONLY still-empty fields from the Validate report via OpenAI judge | ⏳ | 2026-07-21 | needs key (dimmed button + toast otherwise); shows target count "AI Fill (n)"; wrong values NEVER overwritten (chip only); EEO/consent/file/password never AI-filled (honest chips); stored-answer misses retry judge-only, unanswered infer; declines → "fill manually" chips; re-validates after the pass; capped 15/click, remainder toasted; console `[FlashFiller] AI fill start` shows evicted decline-cache count |

## Cross-site widget library support

| Widget | Status | Last checked | Notes |
|---|---|---|---|
| react-datepicker month/year grid (custom header + year select) | ⏳ | | popup drive → trusted typing; boundary-aware nav |
| react-datepicker day grid | ⏳ | | same path, day-cell aria matching untested live |

## Other ATSes (one pass each when a real application comes up)

| ATS | Status | Notes |
|---|---|---|
| Greenhouse | ⏳ | e2e fixture green; live unverified since v0.2 changes |
| Lever | ⏳ | |
| iCIMS | ⏳ | multi-step wizard |
| SuccessFactors (career5.successfactors.eu) | ⏳ | SAPUI5 dropdown selector must stay superset |
| SmartRecruiters | ⏳ | |
| Ashby | ⏳ | |
| Oracle Recruiting Cloud (*.oraclecloud.com — Cummins fa-espx pod) | ⏳ | 2026-07-16 (schema v8 + cx-select fixes): default-enabled + adapter. Harness run proved detection/matching; dropdowns then fixed from bundle source — cx-select popups are `div[role=grid] > div[role=gridcell].cx-select__list-item` (selector covers them now), toggle buttons suppressed, radiogroup aria-labelledby questions, EEO `races?/racial`. Selector must stay superset. 2026-07-17: PILL GROUPS added (questionnaire = `<ul role=list aria-label=Q>` of `<button aria-pressed>` pills, zero native inputs — see src/content/overlay/oracle.md): detect as radio-kind w/ pillEls, fill = click + aria-pressed verify, validate reads pressed pill. Verify live: Title prefix pills, travel/relocate yes-no pills, frequency pills. Live re-pass pending (email OTP gates each draft). Known non-bugs: profile has no address line1/ZIP → those fields can't fill. 2026-07-17 (user report: city/zip/degree unfilled on NOV): searchable cx-select catalogs — City opens on a rendered SUBSET (or a "start typing" status panel) and only reveals the full list through the input's filter, so the type-to-filter tier now ALSO runs as a last resort when a populated list has no placeable option (pick gated on the filtered list actually CHANGING); degree-level answerVariants ("Master of Science" ↔ "Master's Degree"/"Masters"/"Graduate degree") place education degrees deterministically. Harness-verified in real Chromium on tests/fixtures/cx-search.html (City=Houston via filter, Degree=Master's Degree, ZIP honestly flagged missing-unanswered). Retest live: City, Degree (per education block), ZIP only after the user adds line1+ZIP to the profile. **2026-07-17 night (user report "fields not getting filled", egay.fa.us6 CX_4001 section 1): ROOT CAUSE = the cx-select combobox INPUT was being skipped by the plain-input vetoes — non-searchable widgets render it `readonly`, searchable ones `type="search"` — while its companion toggle button was ALSO deduped against the DOM combobox, so the WHOLE widget vanished from detection (never matched, never filled). Fix in detector.ts isSkippableInput: a `role="combobox"`/`aria-haspopup` trigger survives the readonly AND search vetoes. Also hardened labelFromFor (CSS.escape — a selector-breaking page id used to throw and abort the ENTIRE scan). Harness-reproduced in real Chromium on tests/fixtures/cx-readonly-combobox.html: pre-fix detected 0 / filled 0; post-fix detected 2, Country→United States + City→Houston, validation ok:2 wrong:0. Regression tests in tests/oracle-cx.test.ts (readonly + type=search variants). LIVE RE-PASS STILL PENDING — the apply URL redirects to the jobs-search page without a fresh OTP'd draft (harness can't reach the form). User: reload the extension at chrome://extensions + reload the apply tab, sign in, re-run.** |
| Oracle CX VANITY domains (careers.honeywell.com class — branded hostname, same oj-hcm-ce app) | ⏳ | 2026-07-21 user report (Honeywell job 153676 apply section 1): address/state/country + veteran status unfilled — the NOV failure resurfacing because adapter lookup and activation were HOSTNAME-keyed, and vanity domains never mention Oracle (the pod appears only in `<base data-apibaseurl="https://ibqbjb.fa.ocs.oraclecloud.com:443">`). Fixed: adapters gain page FINGERPRINTS — `getAdapter(hostname, doc)` falls back to `base[data-apibaseurl*=".oraclecloud.com"]` / `oj-hcm-ce` bundle link/script markers when no hosts regex matches, and `enabledForPage` activates fingerprinted pages iff the platform's canonicalDomain (oraclecloud.com) is enabled — so the user's platform on/off switch still governs vanity sites. Harness-verified in real Chromium on tests/fixtures/cx-vanity-grid.html (localhost = no hosts match, exactly like a vanity domain): Country→United States, State→TX→Texas, Veteran→No→"I am not a veteran", validation ok:3 wrong:0. Tests: tests/oracle-cx-vanity.test.ts (14). Retest live on careers.honeywell.com: reload ext + tab; address LINE 1 + ZIP still need profile data (empty since Cummins — no code fix can fill them). Adversarial-review round (7 confirmed findings, all addressed): popup is now fingerprint-aware — PING returns the page's platformDomain so "Always run on this site" shows ON for vanity pages, and toggle-off pins the host in NEW `settings.disabledDomains` (per-host veto checked FIRST by enabledForPage; also stops removing platform suffix entries, so disabling one Workday tenant no longer kills every other tenant); brandTokens walks past generic prefixes on non-ATS hostnames (careers.honeywell.com → "honeywell") but keeps tenant-label-only on known ATS platforms (jobs.lever.co never yields "lever"). Accepted residual (low): a crafted page carrying an inert Oracle marker can auto-ACTIVATE (scan/overlay/capture listeners) with no user gesture — fills still require the overlay Autofill click, and disabledDomains is the escape hatch; acceptable for a single-user tool. |
| Oracle education blocks — entry per block (Education 1 → UH, Education 2 → PSG) | ⏳ | 2026-07-17 live bug: BOTH school fields filled "University of Houston" — no Workday-style ids on Oracle, so no sectionIndex, and the school seed's global {{education.0.institution}} beat the rotating tier-1 getter on every block. Fixed: ≥2 tier-1 hits on one education key = repeated blocks → rotating getter outranks global qa/seed answers; detector strips structural indexes when the same question lands the same index from different items (rows-not-blocks tell, JET hidden inputs defeat the block test). Retest NOV education section: school AND degree/field per block |

## When something misbehaves — capture protocol

1. Open DevTools console → copy every `[FlashFiller]` line (scan breakdown + fill outcomes with labels).
2. Right-click the widget → Inspect → copy `outerHTML` of the control **closed**.
3. Click it open → copy `outerHTML` of the popup/listbox too.
4. Paste all three into the Claude session (or save as `docs/dom-captures/<widget>.md`).

This protocol solved the date widget (date.md) and the questionnaire dropdowns in one round each.

## Resume / document upload (2026-07-17) — live verification

Rebuild, reload extension AND target tab first. Upload a real PDF resume in Options → Documents.

| Check | Status | Notes |
|---|---|---|
| Options → Documents: PDF resume appears with size/kind; survives browser reload | ✅ 2026-07-17 | user-confirmed live; keeps a second resume stored under kind Other |
| Workday attachments step: resume auto-attaches, site renders its filename chip, validation toast counts it ok | ✅ 2026-07-17 | user-confirmed live: "the resume gets uploaded, so it's a success"; attach happens BEFORE text fills (parse-resume ordering) |
| accept=".doc,.docx"-only input with only a PDF stored → no attach, honest flag chip | ⏳ | pickDocument accept filter |
| Cover-letter zone with no stored cover letter → flag chip, resume NOT attached there | ⏳ | docCue kind isolation |
| Toggle autoAttachDocuments off → suggestion chip instead of silent attach; Accept attaches | ⏳ | Settings → Filling behavior |
| Multi-file "additional documents" zone → only the default resume, once | ✅ 2026-07-17 | user-confirmed live (generic zones prefer the resume kind; user deliberately stores a second resume as Other); v1 never attaches more than one without user action |
| Greenhouse + Lever pass (fixture parity) | ⏳ | jsdom fixtures modeled, live DOM captures still wanted (docs/dom-captures/) |
| Workday "parse my resume" flow: parser fills fields, follow-up pass repairs FlashFiller's fills | ⏳ | risk item from the plan — pin with a live check |

## Learned-answer rebuild (v6, 2026-07-16) — live verification

Rebuild, reload extension AND target tab first.

1. Options → Settings: capture toggle shows ON without touching it (v6 migration). Review tab lists old captured/inferred entries re-queued with the "before the review gate" note; toolbar badge count matches.
2. On a posting: answer an unknown question manually → chip says "Save for review?" → entry lands in Review as pending. On the NEXT page/site asking the same thing: suggestion chip only, never a silent fill. Chip Accept fills AND activates the entry (Review count drops).
3. Approve a captured entry, then hit a near-neighbor question (current vs desired salary) → suggest chip only; exact/same-meaning wording → autofills. After 3 validated fills it autofills on fuzzy wording too (graduated).
4. Type `12/05/2025` into a free-text date → stored answer is ISO. Type an ambiguous date the profile can't disambiguate → console shows `capture skipped: ambiguous` breadcrumb, nothing stored.
5. Pick a branded "how did you hear" option → entry saved with siteScope; on another company's site it does not even suggest; Review card shows "only <host>" + "Make universal".
6. Force a wrong fill from an approved captured entry (edit its answer to a wrong value, autofill) → validation toast shows WRONG; first time = strike (entry stays active, note records evidence); second wrong → entry back in Review with the "Filled wrong value on …" note. A chip-Accept on the same page never re-demotes.
7. Radio group whose options have no label text (coded values) → console `capture skipped: radio option has no label text`, no junk entry.
8. With an API key set (Settings → Semantic matching): a clear paraphrase of an approved learned question autofills (embedding bar assist); console shows `learned option equivalence` lines after semantic option placements validate ok — the Options tab grows `auto:` sets.

## Stage 1 (2026-08-22) — combobox reroute + catalog scroll

- [ ] Workday country dropdown: field fills by option selection (watch for the list flicking open); committed value survives page validation.
- [ ] Oracle/iCIMS combobox rendered as plain input: no raw text left in the box on failure; honest chip instead.
- [ ] Long country-code list with no filter box: alphabetical jump finds +1/United States.
- [ ] Capture prompt on a numbered questionnaire question stores a key without the leading number.
- [ ] Gender/disability widgets: no capture prompt appears, ever (mashed labels included).
- [ ] After import of flashfiller-profile-complete.local.json: Workday experience section fills all four employers.

## Stage 2 — LLM-first filling

- [ ] `make build` clean; chrome://extensions shows **0.8.0** after reload
- [ ] Options → Settings → LLM-first filling: mode "LLM-first" + Anthropic key saved (model claude-haiku-4-5)
- [ ] Autofill on a Workday/Oracle page: normal toast first, then "Planner: X filled…" toast
- [ ] Console: `[FlashFiller] planner brief` / `plan validated` / (maybe) `planner repair round` breadcrumbs
- [ ] EEO fields fill ONLY stored values (gender → Male option; disability → CC-305 long-form No; race → Asian composite)
- [ ] Military / government / social-security questionnaire items → the No option
- [ ] Standalone "Current employer" → exactly "N/A"
- [ ] Essays arrive as suggestion chips (Accept fills), never silent
- [ ] Export JSON contains no `sk-ant` and no OpenAI key
- [ ] Rejected plan entries show "Planner blocked: …" flag chips, not silent skips

## Stage 2.5 — inference lane (eaton.eightfold.ai)

- [ ] chrome://extensions shows **0.8.1** after make build + reload
- [ ] Badge appears on eaton.eightfold.ai WITHOUT pressing Scan (auto-activation)
- [ ] Button reads "Plan Fill (n)" in llm-first mode
- [ ] Console: planner brief line shows jdChars > 0 on the Eightfold apply page
- [ ] Additional Questions: unrelated questions get filled (not chipped) when derivable — check a years-of-experience / willingness question
- [ ] Chips show one-line reasoning for anything the planner blocked or demoted
- [ ] Nothing invented: no certifications/licenses/legal answers appear that aren't yours

## 2026-09-16 audit — Tailor tab and hub client (live verification)

- [ ] Engine **v7** selected: the Lens picker lists the families (with "no master yet" where true) — it used to stay on "router picks the family"
- [ ] Switch engine v6 → v7 → v6: a lens chosen under the other engine is cleared, not sent silently
- [ ] Type into a draft, press **Reset edits**: the boxes stay on the generated text (they used to snap back to the typed edits ~0.3 s later)
- [ ] Service address saved as `http://127.0.0.1:8765/` (trailing slash, as the address bar copies it): health, drafts and the outbox all work
- [ ] Outreach: pick target role B from the dropdown, close and reopen the popup — B is still selected
- [ ] With the hub's database down, press "Read this page" ~10 times, bring the database back: the outbox drains (no chunk stuck at the head; an op the hub refuses lands in the dead letters with its reason)
- [ ] Review tab: clear the Question box on a captured answer — Approve is disabled; approve a normal one — the store is intact afterwards (profile and answers still there)
- [ ] Review tab: with 3+ pending, **Discard all** — the queue is empty afterwards, not one shorter
- [ ] Answers → Import: pick a file, press **Cancel** on the first prompt — "Import cancelled", nothing changed; OK then Cancel — merged, nothing replaced
- [ ] Training: answer three seeds in a row — the progress count and the shown seed advance one at a time, no seed skipped, "Nothing left" only when the queue is really empty
- [ ] Answers → Export: the JSON has `"accountPassword": ""`; re-import it — the stored password is still there
