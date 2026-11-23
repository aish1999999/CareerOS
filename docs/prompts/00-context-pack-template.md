# Context pack (template)

Fill this out once and keep it updated. Paste it at the top of **every** Claude
session you run from this playbook — it gives Claude your facts, your voice,
and the JSON rules in one block.

**Save your filled copy as `context-pack.local.md`** (or somewhere outside the
repo). The filled version contains personal data — never commit it. Suggested
`.gitignore` lines (add them yourself): `*.local.md` and
`flashfiller-export*.json`.

Before each session, refresh the `TIMESTAMP_MS` line: open any page's DevTools
console and run `Date.now()`.

---

## Paste everything below this line

You are helping me maintain the answer library of FlashFiller, my local
form-autofill browser extension for job applications. Follow the JSON contract
at the bottom whenever I ask for import JSON.

### Who I am

<!-- ~10 lines: roles, years of experience, stack, current company, notice
     period, salary band, work authorization in plain words, location and
     remote preferences.
     DO NOT include: EEO/demographic answers, full street address, or anything
     you don't want sent to Anthropic. -->

- Name:
- Current role & company:
- Years of experience / stack:
- Work authorization (plain words):
- Notice period:
- Salary expectation:
- Location & work-model preference:
- Links (LinkedIn / GitHub / portfolio):

### My personas

<!-- Persona ids EXACTLY as configured in FlashFiller settings
     (defaults: frontend, full-stack). One line each. -->

- `frontend` —
- `full-stack` —

### Writing voice

<!-- 2–3 rules Claude must follow when drafting answers. -->

- First person, concrete, no buzzwords.
- Long answers 40–120 words; short fields one line.
-

### Session constants

TIMESTAMP_MS: <!-- paste Date.now() here -->

### JSON contract

When I ask for import JSON, output EXACTLY ONE fenced JSON code block and
nothing else. No comments, no trailing commas, no markdown inside the block.

Top-level shape: { "qa": [ <entry>, ... ] }
(or { "profile": { ... } } / { "optionSets": [ ... ] } only when I explicitly
ask for those payloads)

Every qa entry must include ALL of these fields:

{
  "id": "...",              // RULES BELOW — most common source of data loss
  "question": "...",        // canonical question, plain text
  "aliases": ["...", ...],  // paraphrases; never include a real company/role/city name
  "answer": "...",
  "answerType": "text",
  "answerTemplate": null,
  "mapsTo": null,
  "variables": [],          // list every {{var}} used in answer, e.g. ["company"]
  "personas": [],           // [] = applies to all personas
  "tags": ["..."],
  "fieldType": "text",      // "text" | "textarea" | "select" | "radio" | "checkbox"
  "options": [],            // for select/radio: the EXACT option texts the form offered
  "status": "needs_review", // I will tell you when "active" is allowed
  "source": "import",
  "captureContext": null,
  "createdAt": TIMESTAMP_MS,   // epoch MILLISECONDS as a bare number, not a string
  "updatedAt": TIMESTAMP_MS
}

When I ask for OPTION SETS (equivalence groups of option wordings), the shape
is: { "optionSets": [ { "id": "oset-<slug>-<4 hex>", "label": "...",
"options": ["Yes", "Yes, I am authorized to work in the United States"] } ] }
Same upsert-by-id rule applies: keep ids from my export when editing, mint
fresh ones for new sets. Only group wordings that are UNAMBIGUOUSLY the same
answer — a wrong grouping causes wrong fills everywhere the set applies.

ID RULES (import is an upsert-by-id; a wrong id silently overwrites data):
- EDITING an entry I gave you from my export: keep its id byte-for-byte,
  keep createdAt, set updatedAt to TIMESTAMP_MS, and return the FULL entry
  (imports replace whole entries — dropping a field resets it to its default).
- NEW entry: invent a fresh id "cfc-<short-slug>-<4 random hex>", e.g.
  "cfc-why-company-9f3a". Never reuse an id from my export and never invent
  an id starting with "seed-" unless I explicitly ask for a seed answer.
- SEED ANSWER (only when I ask): id must be exactly "seed-<seedId>"
  (persona variant: "seed-<seedId>--<persona>") and tags must include
  "seed:<seedId>" plus the seed's category. This makes the Training tab
  mark that question as answered instead of creating a duplicate.

STATUS RULES:
- Any entry with a NEW or CHANGED answer: "needs_review".
- Entries you only touched aliases/tags on: keep status exactly as given.
- Never change "needs_review" to "active" on your own.

TEMPLATE VARIABLES allowed in "answer": {{company}}, {{role}}, {{location}},
{{today}}, {{profile.<path>}}. Anything else will sit unresolved and block the
fill. Answers should still read acceptably if {{company}}/{{role}} can't be
detected on a page, so don't over-depend on them.

---

## Optional add-on: resume-to-profile bootstrap (run once)

Use this when your FlashFiller profile has blank fields. Blank profile fields
mean profile-backed questions produce **no fill candidate at all**, so this is
the first gap to close.

1. FlashFiller options → Answers tab → **Export** (`flashfiller-export.json`).
2. Open the file, copy the `"profile": { ... }` object.
3. Paste your context pack, then the profile object, then your resume text,
   then this prompt:

> Here is my current `profile` object from my autofill extension, followed by
> my resume text. Return `{"profile": {...}}` with the SAME shape, starting
> from my current object and only filling blanks or correcting fields the
> resume contradicts. The import REPLACES my whole profile, so return every
> existing field unchanged unless the resume says otherwise. Booleans stay
> booleans. Leave `eeo` exactly as given. `workHistory` entries use keys
> {company, title, startDate, endDate, location, description}; `education`
> entries use {institution, degree, field, startDate, endDate}; dates as
> strings.

4. Save Claude's block as a `.json` file and import it (Answers tab → Import →
   **OK** for merge). A profile-only payload touches nothing else.

Privacy note: prune `eeo`, salary, and street address from what you paste if
you don't want them in the session — re-enter those manually in the Profile
tab afterwards.
