# JSON-emission contract for Claude

This is the canonical copy of the rules Claude must follow whenever it produces
import JSON for FlashFiller. Every prompt file in this directory embeds it, so
you normally never paste this file on its own — it exists as the single source
of truth to keep the embedded copies honest.

Grounding (verified in code):

- `validateImport` (`src/lib/schema.ts`) accepts a top-level object with any
  subset of `{profile, qa, settings}` — `{"qa": [...]}` alone is valid;
  `schemaVersion` is not required.
- In `QAEntrySchema` only `id` and `question` are required; every other field
  has a default — critically `status` defaults to `"active"` (instantly
  autofillable) and `source` to `"import"`.
- Merge-mode import (`src/lib/storage.ts` `importData`) upserts **by id,
  replacing the entire entry** — partial entries are not patched, they clobber.
- Malformed qa entries are rejected individually with a report; the rest import.
- A `profile` payload **replaces the whole profile object**, not a merge.
- Seed-answer ids come from `seedEntryId` (`src/lib/seed.ts`): `seed-<seedId>`
  or `seed-<seedId>--<persona>`; the Training tab marks a seed answered via
  that id **or** a `seed:<seedId>` tag.

---

## The contract (paste-ready block)

````
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
````

## Notes for the human

- `TIMESTAMP_MS` lives in your context pack — refresh it before a session
  (`Date.now()` in any DevTools console; day precision is fine).
- Import via FlashFiller options → Answers tab → Import. In the confirm
  dialog, **OK = merge, Cancel = REPLACE your entire Q&A store**. Always
  export a backup immediately before importing.
- If the import report rejects entries, paste the rejection reasons back to
  Claude — rejections are per-entry, the rest imported fine.
