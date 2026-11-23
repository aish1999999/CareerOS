Oracle Cloud Recruiting (CX) — DOM analysis for autofill
Framework / rendering stack
The portal is built on Oracle JET (JavaScript Extension Toolkit) with Knockout.js bindings. You'll see this everywhere in the markup: CSS classes prefixed with oj- (e.g. oj-textarea-input, oj-text-field-input, oj-component-initnode), internal attributes like data-oj-internal and data-bind, and RequireJS as the module loader. The candidate-experience-specific components use a cx- prefix (e.g. cx-select-pill-section).
Importantly, everything renders into the normal light DOM — no shadow DOM and no iframes were present. That's good news for an autofill extension: you can query fields with ordinary document.querySelectorAll without piercing shadow roots or hopping frame boundaries.
Field naming and identification (the useful part)
Oracle's standard personal-info fields are quite autofill-friendly. Text inputs carry clean, semantic name attributes and, for the common ones, proper HTML5 autocomplete tokens:

firstName → autocomplete="given-name", label "Legal First Name"
middleNames → autocomplete="additional-name", label "Legal Middle Name"
lastName → autocomplete="family-name", label "Legal Last Name"
email → autocomplete="email", label "Email Address"
addressLine1 / addressLine2 → autocomplete="address-line1" / address-line2
phoneNumber, city, postalCode, region2 (State), country

So the highest-signal matcher is the name attribute, with autocomplete as a strong secondary for the core name/email/address fields.
Caveats worth designing around:

IDs are not stable. They use a name + incrementing numeric suffix pattern — firstName-26, lastName-28, email-31, addressLine1-44. The suffix depends on render order and will change between pages/sessions, so don't key off id — match on name (or name prefix) instead.
autocomplete is inconsistent. Core fields have real tokens, but many others are explicitly set to autocomplete="none" (country, phoneNumber, postalCode, city, region2) or null. none isn't even a valid HTML autocomplete value — it's used here mainly to suppress the browser's native autofill, so your extension can't rely on it.
Custom/org-specific fields use opaque names. Things like "Preferred Last Name" map to namInformation15, and "Tax District" to addlAddressAttribute4. These generic backend names carry no semantic meaning, so for those you'll need to fall back to label-text matching rather than attribute matching.

Non-text controls

Yes/No questions are not radio inputs — they're <button type="button"> "pills" (cx-select-pill-section) whose selected state lives in aria-pressed="true" and a --selected modifier class. To autofill these you must click the correct button and read aria-pressed, not set a value.
EEO / demographic questions (e.g. disability status) do use real <input type="radio">, but with long coded names and values like name="US-STANDARD-ORA_DISABILITY_STATUS-STANDARD-12" and value="ORA_PER_YES_US" / ORA_PER_NO_US / ORA_PER_NO_ANSWER_US.
Dropdowns (Country, State, phone country code) are JET comboboxes, not native <select>, so they need open-and-click interaction rather than a simple value set.

Practical takeaway for your extension: for Oracle, build a matcher that prioritizes name (exact + prefix) → autocomplete → visible label text, treat id as throwaway, and implement click-based handlers for the JET pill buttons and comboboxes since setting .value alone won't update Knockout's model.

The core problem: there are no form inputs
The Application Questions aren't <input>, <select>, or <textarea> elements at all. I confirmed there are zero native radios, checkboxes, or selects, and zero hidden inputs backing them. Each Yes/No answer is a plain <button type="button">:
html<button type="button" aria-disabled="false" aria-pressed="false"
        class="cx-select-pill-section">
  <span class="cx-select-pill-name"> No</span>
</button>
If your extension enumerates fields the usual way (querySelectorAll('input, select, textarea')), these questions simply don't exist in its result set. That's the whole reason for the non-detection.
How they're actually structured
Each question is a React-rendered "pill group" mounted by Oracle JET via Knockout (data-bind="react: { component: 'cx-select-pills' ...}"). The hierarchy is:
FORM-BUILDER
  div (input-row)
    div  data-qa="natTravelFlag"      ← question identity lives here
      div (cx-select-pills)
        ul.cx-select-pills-container  role="list"  aria-label="Travel Domestically"  ← question TEXT
          li[role=listitem] > button.cx-select-pill-section (No)
          li[role=listitem] > button.cx-select-pill-section (Yes)
Two attributes are your reliable hooks:

data-qa on the wrapper div — this is the machine key. For standard fields it's semantic (natTravelFlag, intlTravelFlag, relocateFlag, allLocationsFlag, natTravelFrequency), and for the client's custom questions it's the numeric questionnaire ID (300000809568641 = "Are you a current NOV employee?", 300003662938119 = "Have you ever been employed by NOV…").
aria-label on the <ul> — this holds the human-readable question ("Travel Domestically", "Willing to Relocate", "Are you a current NOV employee?"). This is what you'd match against for label-based autofill.

The selected state is expressed as aria-pressed="true" plus a --selected modifier class on the chosen button — there's no value anywhere.
What to change in your extension
Detection: add pill groups as a first-class field type. Something like:
jsdocument.querySelectorAll('[data-qa] ul.cx-select-pills-container')
Then read the question from the <ul>'s aria-label (or the data-qa on the ancestor [data-qa] div for a stable key), and enumerate the option buttons from the child <li> > button elements, using each button's .cx-select-pill-name text as the option label.
Filling: you cannot set a value — you must dispatch a real click on the matching button (e.g. find the button whose text is "Yes"/"No" and .click() it). Setting attributes directly won't update Knockout/React state; the framework only commits the answer through its own click handler. After clicking, verify success by checking aria-pressed === "true" on that button rather than looking for a value.
One more note: not all of these are Yes/No. The "…Frequency" ones (natTravelFrequency, intlTravelFrequency) are the same pill component but with different option sets, so treat the option list as dynamic rather than hardcoding Yes/No.