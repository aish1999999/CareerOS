# FlashFiller v2 — LLM-First Filling: Design Draft

*Draft for review — 2026-08-22. No code changes made. This inverts the control
flow: today a human drives FlashFiller and falls back to AI; in v2 an LLM
drives the application, using FlashFiller's store and executor as its tools,
and the human only handles what genuinely needs a human. The human's time goes
to networking with recruiters, not forms.*

---

## 1. The inversion

**Today:** Human opens page → FlashFiller autofills what it can (label
matching) → gaps → human fills by hand, or pokes the AI judge per field.

**v2:** Page detected → deterministic pass fills the cheap 70% → **LLM planner
receives everything left over as one structured brief and returns a fill plan**
→ guarded executor performs it with widget-correct mechanics → validation
verifies → failures loop once through the planner with evidence → only the
true residue surfaces to the human as chips.

The division of labor follows the same rule that made Mapper work:
**the model proposes, code decides and executes.** The LLM never touches the
DOM and never invents protected values; the executor never guesses meanings.

---

## 2. The field census (what the planner sees)

The detector's scan is upgraded from "label + input" to a **census entry** per
field — this is what makes every one of your problem cases solvable:

```json
{
  "fieldId": "ff-42",
  "label": "Title",
  "sectionKind": "contact | work-history | education | eeo | consent | questionnaire",
  "sectionIndex": 1,
  "sectionHeading": "Personal Information",
  "neighborLabels": ["First Name", "Last Name", "Suffix"],
  "widget": {
    "declaredType": "text",
    "probedBehavior": "combobox | native-select | text | radio-group | checkbox | date | file",
    "optionsVisible": ["Mr.", "Mrs.", "Ms.", "Dr."],
    "optionsVirtualized": true,
    "typeaheadFilters": true
  },
  "required": true,
  "currentValue": null
}
```

Two upgrades carry it:

* **Widget probing at fill time** (from our last discussion): combobox
  signals (`role`, `aria-haspopup/expanded/controls`, readonly inputs,
  select-styled containers) and, when ambiguous, a live probe — focus/click,
  see if a listbox renders. Behavior beats tag name. A dropdown is *always*
  opened and committed by option selection, never typed into.
* **Section context** rides with every field: which repeated section it
  belongs to, its heading, and its neighbor labels.

---

## 3. Your eight intelligence cases, mapped

| # | Case | Layer that solves it | How |
|---|------|----------------------|-----|
| 1 | **"Title" ambiguity** — job title vs designation (Mr./Sir/Jr./Sr./I–V) | Census + planner | The census carries sectionKind + neighbors + visible options. "Title" beside First/Last Name with options Mr./Sir → designation ("Mr."); "Title" inside work-history section → position title from that section's employer entry. The planner is *instructed to study the section before answering* — literally your words, encoded. |
| 2 | **Currently unemployed → "current/present employer"** | Life-state facts + policy | The brief carries derived life-state: `currentlyEmployed: false, lastEmployer: "MPI — McWane Plant & Industrial", lastEndDate: 2026-05, status: "graduating MS student"`. Policy: a field asking for CURRENT/PRESENT employer never receives a past employer; it gets "N/A"/"None — currently completing M.S." (text) or the Unemployed/None option (dropdown). Past-employer fields keep getting real history. |
| 3 | **Disability questions not filling** | Store scrub + option semantics | The stored answer is No (profile.eeo). The poisoned `select`-key entry gets scrubbed in migration. The planner maps "No" onto the CC-305 long forms: "No, I do not have a disability and have not had one in the past". Value comes from the store — the LLM only *places* it. |
| 4 | **Race = Asian, options like "Asian (Not Hispanic or Latino)"** | Option semantics under guardrail | Rule: a composite option that contains the stored primary value plus consistent qualifiers IS the stored value. "Asian (Not Hispanic/Latino)" ≡ Asian ✓. An option that would *change* the stored value is never selectable. |
| 5 | **Country dropdowns (virtualized) never fill** | Executor mechanics — no LLM needed | Your alphabetical-position method, encoded: (a) try typeahead first ("United"→ filtered list → click); (b) no typeahead → **proportional scroll by alphabetical rank**: "United States" sits ~90-95% down an A-Z country list, so jump the scroll container there, poll the rendered window, correct up/down, click. Same strategy for country-code lists (+1 / US). Commit-verify afterwards. |
| 6 | **Revisited companies fill instantly** | siteScope activation | Capture already records the company (`captureContext`) — it's just never applied. v2 pins site-specific answers to their site and reuses them at full confidence on return visits. Second pass at a company = mostly deterministic, near-zero LLM cost. |
| 7 | **Gender: always the option that maps to M** | Option semantics under guardrail | Stored value Male. Matcher maps M/Male/Man/Mr variants → select; "Female"/F is never selectable for this profile (and the two poisoned gender captures — one says Female — get scrubbed). If only decline-style options exist, planner flags rather than guesses. |
| 8 | **Military / tax / social-security / non-compete topics** | Topic-policy table | A stance table the planner must obey: military service → "No / not a veteran / no military experience" family; government employment → No; social-security income → No; non-compete → No; bondable → No. The LLM's job is only to *classify* the question into a topic and pick the option expressing the stored stance — it never decides the stance. |

---

## 4. The exact runtime workflow

**Phase 0 — Census.** Scan the page. Probe ambiguous widgets. Build the field
census. (No writes yet.)

**Phase 1 — Deterministic pass (free, instant).** Exactly today's engine, but
executing through the widget-correct executor: profile tier-1 matches, seeds,
graduated learned entries, siteScope-pinned answers for this company, option
equivalence sets. Every fill is commit-verified. Typically covers contact,
address, links, education, work history, standard consents.

**Phase 2 — The brief.** Everything unresolved is packaged into ONE planner
call (not per-field pokes):

* the unresolved census entries (label, section, options, widget, required);
* the candidate pack: profile facts + derived life-state + the topic-stance
  table + the 20-30 most semantically relevant QA entries (retrieved by
  embedding against the unresolved labels);
* application context: company, role, and the JD summary if the Tailor run
  exists for this posting;
* the rules of engagement (guardrails, §5).

**Phase 3 — The plan.** The LLM returns structured JSON only:

```json
{ "fills": [
  { "fieldId": "ff-42", "action": "select", "value": "Mr.",
    "source": "profile:namePrefix", "reasoning": "contact section, designation options",
    "confidence": 0.97 },
  { "fieldId": "ff-77", "action": "type", "value": "N/A — completing M.S., available Sept 2026",
    "source": "policy:current-employer-unemployed", "confidence": 0.9 },
  { "fieldId": "ff-91", "action": "skip", "reason": "asks for felony detail — no policy, needs human" },
  { "fieldId": "ff-93", "action": "suggest", "value": "<drafted essay>", "reason": "free-text motivation" }
] }
```

Four actions only: **fill** (type/select/check), **skip** (with reason),
**suggest** (staged for human approval — essays and anything below the
confidence floor), **needs_human**.

**Phase 4 — Guarded execution.** Code validates the plan before any DOM write
(§5), then executes with the right mechanics per widget: dropdowns opened →
options polled (virtualized strategy for long lists) → option clicked →
commit verified; text via native setters; dates via segment typing. Every
fill re-validated against actual page state.

**Phase 5 — Repair loop (once).** Validation failures go back to the planner
in one batch WITH evidence ("selected 'United States' but field shows empty;
options visible were […]"). One corrected plan, re-executed. Still failing →
honest chips.

**Phase 6 — Learn.** Successful fills credit okCount (graduation finally
works); new question wordings capture with CLEAN keys (hygiene v2), siteScope
pinned, and the planner's option mappings distill into option-equivalence
sets. **The deterministic layer grows every application; LLM spend shrinks
toward zero for repeat patterns** — the same converge-to-offline philosophy
the semantic layer already follows.

**Phase 7 — Human residue.** Chips for: suggests awaiting approval, skips
with reasons, failures. Submission is ALWAYS the human — never auto-submit.

---

## 5. Guardrails (code-enforced, non-negotiable)

1. **Never auto-submit.** Unchanged, ever.
2. **EEO/demographic values come only from the store.** The LLM maps stored
   values onto option wordings; it can never choose or infer a demographic
   value. A plan entry touching an EEO field whose value ≠ stored value is
   rejected in code before execution.
3. **Topic stances come only from the stance table** (military, tax,
   non-compete, government service…). Planner classifies; table answers.
4. **No invented facts.** Certifications, licenses, clearances, dates,
   salary — plan values must trace to profile/store/policy (`source` field is
   mandatory and validated). Salary numeric fields derive from the stored
   range via a template (min value by default) — never mashed text.
5. **Free-text essays are suggest-only by default.**
6. **Documents**: only user-stored documents attach (unchanged).
7. **Consents** fill only from stored consent preferences (unchanged).
8. **Privacy**: the brief contains profile + EEO data and goes to the
   configured LLM provider on the user's own key. Provider pluggable
   (OpenAI today; Anthropic option since the Mapper key exists). Redact
   accountPassword from every brief; exports redact the API key + password.

---

## 6. What must be fixed FIRST (the plan is only as good as its executor)

Stage 1 — foundations (no LLM yet):
1. Widget probing + dropdown open-and-commit + virtualized/alphabetical
   country strategy + commit verification (§2, case 5).
2. Capture hygiene v2 + store migration: scrub the poisoned gender/disability
   entries, junk keys (`select`, `apply`, `complet`), mashed salary; dedupe
   phone/city; trim whitespace; apply siteScope from captureContext.
3. Graduation credit fix (okCount from validated fills).
4. Profile completion: all 4 employers with locations/descriptions, so
   work-history sections can fill fully.

Stage 2 — the planner (behind a setting, `fillMode: "assisted" | "llm-first"`):
5. Census builder + brief assembly + plan schema + guarded executor + repair
   loop, using the existing judge plumbing upgraded from per-field poke to
   one-plan-per-page.

Stage 3 — learning loop + default-on once validated on your top ATSes
(Workday, Greenhouse, Oracle, iCIMS, SuccessFactors).

---

## 7. Open questions before implementation

1. **Current-employer convention** when unemployed: "N/A", or a phrase like
   "None — completing M.S. (available Sept 2026)"? (Case 2.)
2. **Military/veteran questions**: confirm the intent is "always answer the
   No / not-a-veteran option" — not "leave blank" (required fields would
   block submission if skipped).
3. **Planner provider**: keep OpenAI (key already configured) or add
   Anthropic as the planner?
4. **Confidence floor**: below what confidence should the planner's fills
   demote to suggest chips? (Proposed: 0.8.)
5. **Per-application LLM budget**: one plan + one repair call ≈ $0.01-0.03
   per application at gpt-4o-mini class. Acceptable ceiling?
6. Rotate the exposed OpenAI key before any of this ships (it's in the
   export you shared).
