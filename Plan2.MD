Review.MD documents a recurring failure when filling job applications: semantically identical questions have different answer option texts across sites. The stored veteran-status answer is "No", but sites render the negative option as "No", "No, I am not a protected veteran", or (Workday) "I AM NOT A PROTECTED VETERAN". Same for disability ("No, I do not have a disability and have not had one in the past"), ethnicity ("Decline to State (United States of America)" vs "I don't wish to answer" vs "Prefer not to say"), and Yes/No listboxes for work authorization/sponsorship.

The stored answer expresses an **intent** (negative / affirmative / decline-to-answer), but option matching is purely lexical, so "No" cannot find "I am not a protected veteran". Fix: an intent-classification layer so options match by polarity, not surface text.

## Root causes (verified in code)

1. **`chooseOption` is lexical-only** ([matcher.ts:154-168](src/content/matcher.ts#L154-L168)): exact canonical → bidirectional substring (0.85) → `lexicalScore` (0.55 floor). "No" vs the long-form option works today *only by accident* (both sides canonicalize "no"→"number", hitting the substring tier); the Workday variant with no leading "No" falls to lexical and dies → field downgraded to suggest, and the chip won't fill either.
2. **`no → number` token mapping poisons answers** ([normalize.ts:50](src/lib/normalize.ts#L50)): `canonical("No")` = `"number"`. Meant for "phone no.", but runs on answers/options too.
3. **Fill-time matching is duplicated and inconsistent with match-time**: [fillSelect](src/content/autofill.ts#L36-L51) (canonical-exact only), [fillRadioGroup](src/content/autofill.ts#L53-L69) and [fillCustomDropdown](src/content/autofill.ts#L108-L139) (private lexical loops).
4. **EEO never auto-fills, via two independent blockers**: [matcher.ts:377](src/content/matcher.ts#L377) unconditionally caps `eeoLike` fields, AND the 4 EEO seeds ship `autofillByDefault: false` → `capSuggest` in [seedCandidates (matcher.ts:250)](src/content/matcher.ts#L250). The `autoFillEeo` setting ([schema.ts:114](src/lib/schema.ts#L114)) is dead — nothing reads it.
5. **Workday parenthetical suffixes** ("… (United States of America)", sometimes stacked) inflate lexical similarity between *wrong* options.
6. **Review.MD's "missing" questions are miswired seeds**: `prev-employed` is `answerType: "freeText"` → never a fill candidate ([seed-questions.json:907-921](public/seed-questions.json#L907-L921)); `work-auth` maps to free-text `profile.workAuthorization`, which fails Yes/No listboxes when it holds "US Citizen" ([seed-questions.json:272-286](public/seed-questions.json#L272-L286)).

## User decisions

- EEO fields: **always auto-fill** (remove caps entirely; remove the dead toggle).
- Include the missing Review.MD questions/answers in this change.

## Changes

### 1. New `src/lib/intent.ts`

```ts
export type AnswerIntent = 'affirm' | 'negate' | 'decline' | 'unknown'
export function stripParentheticals(text: string): string
export function classifyIntent(text: string): AnswerIntent
```

- `stripParentheticals`: loop-strip trailing `\s*\([^)]*\)\s*$` groups (Workday stacks them: "Asian (Not Hispanic or Latino) (United States of America)"); if the result trims empty, return the original.
- `classifyIntent` preprocessing: stripParentheticals → lowercase → normalize curly apostrophes to `'` → collapse whitespace. Do NOT use `canonical()` — apostrophes and the stopwords `not`/`have` carry the signal.
- **Ordered** pattern tiers (order is load-bearing):
  - **Tier 0 guards → unknown**: numeric/punctuation-only (`/^[\d\s.,+/-]*$/` — so "0" isn't negate on a years-of-experience select); `not applicable` / `n/a`.
  - **Tier 1 DECLINE** (before negate — decline phrases contain negation tokens): `\bdecline[ds]?\b` (standalone — catches minimalist "Decline" / "I decline" options, and subsumes "decline to state/self-identify"; safe because "decline" never appears in affirm/negate option text on application forms), `prefer(s)? (not|to not)`, `(do|does|did)(n't| not) (wish|want|care) to`, `(choose|chose|elect|opt)s? not to`, `wish not to`, `rather not`, `opt out`, `^no (answer|response|comment)$`.
  - **Tier 2 NEGATE** (before affirm — "No, I am not…" contains "I am"): `^no\b` (word boundary → "Norway"/"None…" safe), `^none\b`, `^never\b`, `^(n|false)$`, `(i am|i'm) not`, `(do|does|did|have|has|had)(n't| not)`, `(have|has) no`, `not (a|an)\b`.
  - **Tier 3 AFFIRM**: `^yes\b`, `^(y|true)$`, `(i am|i'm) (a|an|one)`, `i identify as`, `i have`.
  - Else **unknown** ("US Citizen", "Male", "Two or More Races", countries, numbers) — intent layer stays inert.

### 2. `src/lib/normalize.ts` — answer-safe canonicalization

Refactor `tokenize` into internal `tokenizeWith(text, skipMap: Set<string>)`; add `tokenizeAnswer`/`canonicalAnswer` that skip `TOKEN_MAP` for tokens in `ANSWER_AMBIGUOUS_TOKENS = new Set(['no'])` (only `no` for now — minimal blast radius). Question-side callers stay on `canonical()` unchanged (verified call sites: detector.ts:249,275; matcher.ts decontextualize/inferPersona/rawText; capture.ts). Only `chooseOption` and the soon-deleted autofill matching move to `canonicalAnswer`.

**Answer-mode lexical scorer** ([lexical.ts](src/lib/scorers/lexical.ts)): the Tier D fallback must not reintroduce `no→number` through `lexicalScore`'s internal use of `tokenize`/`canonical`. But `lexicalScore` cannot be changed globally — tier-2 *question* scoring depends on the mapping (it's what makes the question "Phone no." match a stored "Phone number"). So: parameterize the scorer's tokenizer internally and export `lexicalAnswerScore(a, b)` built on `tokenizeAnswer`/`canonicalAnswer`; `chooseOption` Tier D uses it (fill-time paths inherit it via the Step-4 consolidation), while `scoreCandidate`/question callers keep `lexicalScore` byte-identical.

### 3. Rewrite `chooseOption` ([matcher.ts:148-168](src/content/matcher.ts#L148-L168))

Extend the return type: `OptionChoice { value, index, text, score }` (`index` for radio/custom-dropdown fills; `text` for empty-value `<option>`s).

Per option (both sides `stripParentheticals` + `canonicalAnswer`):
- **Polarity veto** (applies to every tier): if both answer and option intents are known and differ → skip the option. Covers affirm↔negate AND decline↔either ("declined" must not fill as "No", and vice versa). Wrong fills are worse than no fills; a full veto → null → existing `capSuggest` path (matcher.ts:389) = suggest chip.
- Tier A: exact `canonicalAnswer` match → 1.0.
- Tier B: **token-subset** either direction → 0.85. Replaces raw `.includes()` — mandatory once `canonicalAnswer("No") = "no"`, else "No" substring-matches "norway". Preserves "Yes" ⊆ "Yes, immediately".
- Tier C (new): if answer intent ≠ unknown and exactly ONE surviving option shares it → floor its score at **0.85** (must be 0.85, not 0.8: default `autoFillThreshold` = 0.85 and the confidence clamp at matcher.ts:387 means a lower tier score could never auto-fill even non-EEO polar questions like sponsorship). Multiple same-intent options → no floor; lexical decides or falls through to null.
- Tier D: `lexicalAnswerScore` fallback (answer-mode tokenizer — see Change 2); keep the 0.55 return floor.

**Checkbox path** (matcher.ts:391-394): keep `YES_RE`/`NO_RE` first (they cover `1/0/true/false` which intent deliberately treats as unknown), then fall back to `classifyIntent`: affirm → checked, negate → unchecked, decline/unknown → `capSuggest`.

### 4. Consolidate fill-time matching (`src/content/autofill.ts`)

Import `chooseOption` from `@/content/matcher` (no cycle — matcher is DOM-free):
- `fillSelect`: build `FieldOption[]` from `el.options` (filter placeholder empty-value+empty-text), delegate; select by `value`, falling back to `choice.text`/`index` when the matched option's value is `''`.
- `fillRadioGroup`: parallel array `{value, text: label ?? value}` (do NOT filter — indexes must align), click `radios[choice.index]` (values are often empty/duplicated).
- `fillCustomDropdown`: map option elements to `{value: text, text}`, click `optionEls[choice.index]`; keep the Escape-close on null.

Known pre-existing gap (note, don't fix): an explicit chip Accept on a vetoed/below-threshold fill returns `'failed'` with no user feedback (index.ts:264-270).

### 5. Option-aware candidate fallback in `matchField` ([matcher.ts:310-412](src/content/matcher.ts#L310-L412))

The tier-1 vs tier-2 winner is picked *before* `chooseOption` runs; if the winner's answer maps to no option, the field dies even when a runner-up would match. For select/radio: walk ranked candidates (tier 1 + threshold-clearing tier 2) and take the first whose template `chooseOption` can place. Directly fixes work-auth: tier-1 returns `workAuthorization` = "US Citizen" (no match on Yes/No listbox) → falls back to the work-auth seed's "Yes".

### 6. EEO always auto-fills (three blockers, all removed)

- Delete the unconditional cap at [matcher.ts:377](src/content/matcher.ts#L377).
- Flip the 4 `voluntary_eeo` seeds to `autofillByDefault: true` + update `guidance` ([seed-questions.json:811-874](public/seed-questions.json#L811-L874)) — otherwise `seedCandidates` still caps them independently.
- Remove the `!signal.eeoLike` exclusion at [index.ts:145](src/content/index.ts#L145) (session-answer replay).
- Remove the dead `autoFillEeo` setting: [types.ts:154](src/types.ts#L154), [schema.ts:114](src/lib/schema.ts#L114), SettingsTab toggle; fix stale "NEVER auto-filled" comments ([types.ts:98](src/types.ts#L98)). Zod strips the leftover stored key.
- Keep the capture-loop EEO exclusion at [index.ts:287](src/content/index.ts#L287) — that governs harvesting typed answers, not filling.

### 7. Missing questions from Review.MD

- **prev-employed** ([seed-questions.json:907](public/seed-questions.json#L907)): `answerType: "profile"`, `mapsTo` new boolean `profile.previouslyEmployedHere` (default false); add alias "Have you previously worked for this company as an employee or contractor?" (company names genericized by [decontextualize](src/content/matcher.ts#L47-L62)). ProfileTab toggle row (copy the `requiresSponsorship` pattern at [ProfileTab.tsx:106-113](src/ui/components/ProfileTab.tsx#L106-L113)).
- **work-auth** ([seed-questions.json:272](public/seed-questions.json#L272)): new boolean `profile.authorizedToWork` (default true) + ProfileTab toggle; seed `mapsTo` it. Keep `profile.workAuthorization` (string) for status questions and tier-1.
- Add both booleans to [Profile (types.ts:71-105)](src/types.ts#L71-L105) and the zod profile schema with defaults so stored profiles migrate cleanly. `readProfilePath` ([seed.ts:35](src/lib/seed.ts#L35)) already renders booleans as Yes/No — verify.
- **User data to enter in ProfileTab** (not code): `eeo.veteranStatus` = "No", `eeo.ethnicity` = "Decline to State", `eeo.disabilityStatus` = "No", "Require visa sponsorship?" = checked (Review.MD: Yes).

## Out of scope (also in Review.MD, separate work)

- "How did you hear about us?" dependent subfields; Workday "Add"-button sections (education/work history).
- Ride-along one-liner: PHRASE_MAP synonym `institution` → school/university ([normalize.ts:7-32](src/lib/normalize.ts#L7-L32)).

## Implementation order

1. `intent.ts` + tests (purely additive) → 2. normalize additions + tests → 3. `chooseOption` + checkbox fallback + matcher tests → 4. autofill consolidation + tests → 5. matchField option-aware fallback → 6. EEO un-capping → 7. seeds/profile additions. Each step keeps the suite green independently.

## Tests (vitest, `npm test`)

- **New `tests/intent.test.ts`** — table-driven: "None"→negate; "Not applicable"/"N/A"/"0"/"1-2"→unknown; "I do not want to answer"/"I don't wish to answer." (straight AND curly apostrophe)/"Choose not to identify"/"Decline"/"I decline"→decline; "Yes, I have a disability"/"I identify as one or more…"/"I am a protected veteran"→affirm; "I AM NOT A PROTECTED VETERAN"→negate; "Norway"/"Male"/"White (United States of America)"→unknown.
- **`tests/matcher.test.ts`** — Workday fixture sets:
  - Veteran `['I identify as one or more of the classifications of a protected veteran', 'I am not a protected veteran', "I don't wish to answer."]`: answer 'No'→opt 2; 'Yes'→opt 1; 'Prefer not to say'→opt 3; **'I am a protected veteran'→opt 1** (veto must beat ~0.9 lexical similarity to opt 2 — the single most important test).
  - Disability & ethnicity sets analogous (decline answer → "Decline to State (United States of America)"; 'Asian' → parenthetical-stripped match, no country-token mispick).
  - Veto→null: 'Yes' vs only negate+decline options. False-positive guards: 'No' vs ['Norway','Northern Mariana Islands']→null; vs ['Norway','No']→'No' @1.0; vs ['0','1','2+']→null. Pin existing Germany/'Wakanda' regressions.
  - `matchField` integration: EEO select + veteran seed + `eeo.veteranStatus:'No'` with exact-alias question → `action==='autofill'` and correct `chosenOptionValue`; option-aware fallback ("US Citizen" tier-1 loses to seed "Yes" on a Yes/No select); checkbox long-form negative → 'unchecked'.
- **`tests/autofill.test.ts`** — fillSelect/fillRadioGroup/fillCustomDropdown each fill the long-form negative option from answer 'No'; fillSelect 'Yes' vs negate+decline-only → 'failed'; empty-value `<option>` text-selection path; keep existing value-match/lexical tests.
- **`tests/normalize.test.ts`** — `canonicalAnswer('No')==='no'` while `canonical('No')==='number'` (documenting the split); `canonicalAnswer('previous employers')` still maps employer→company; existing `canonical` tests untouched.
- **`tests/lexical.test.ts`** — `lexicalAnswerScore('No', 'Norway')` low / no false 0.85-tier interaction; `lexicalScore('phone no', 'phone number')` unchanged high (pins the question-mode `no→number` behavior the answer scorer deliberately drops).

## Risks

- Tier-2 *question* matching untouched: `canonical`/`TOKEN_MAP`/`lexicalScore` keep question-mode behavior; the new tokenizer is opt-in per call site.
- `includes` → token-subset drops char-granular partial matches (e.g. "state" in "statement") to the lexical tier — that class was a mispick source anyway; pin survivors with tests.
- Intent misclassification fails safe: unknown on either side disables veto + intent tier → today's behavior.
- `fillRadioGroup` must select by `choice.index` with an unfiltered parallel array; `fillSelect` filters placeholders so it selects by value/text.