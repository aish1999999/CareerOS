The date fields are not a single <input type="date"> element like a typical form. Workday splits each date (start date, end date) into two separate custom widgets — a "Month" input and a "Year" input — each implemented as:
<input role="spinbutton" type="text" aria-valuemin="1" aria-valuemax="12" aria-valuetext="2" value="2" id="workExperience-6--startDate-dateSectionMonth-input">
Key details on the value format:

type is plain "text", not "number" or "date" — so there's no native date parsing/validation happening in the browser itself.
The value is a bare integer as a string (e.g. "2" for February, "2002" for the year) — not zero-padded ("02"), and not a combined string like "02/2002" or an ISO date like "2002-02-01".
It mirrors this same raw number in aria-valuetext and aria-valuenow.
Month and Year are two entirely separate DOM elements/inputs, each with their own aria-valuemin/aria-valuemax (Month: 1–12, Year: 1–9999).

Why this likely breaks a generic autofill extension: most autofill tools expect one input per date and try to write a full formatted string (like "02/2002", "2002-02-15", or similar) into it. If your extension injects a full date string into just the Month field, Workday will try to interpret it as a single integer 1–12, which typically causes a bad/garbled month value and leaves Year blank or wrong. Additionally, since this is a custom React-driven ARIA spinbutton (not a native input), simply setting .value via JavaScript without dispatching proper input/change/keydown events often fails to update Workday's internal state at all — so the extension may write a value that visually "sticks" for a moment but gets reset, or gets picked up incorrectly on blur.

Start Date wrapper: div#workExperience-6--startDate with data-automation-id="dateInputWrapper", role="group" — this is the group container for the whole start-date widget.
Inside it, two separate inputs:

Month: id="workExperience-6--startDate-dateSectionMonth-input", data-automation-id="dateSectionMonth-input", role="spinbutton", aria-label="Month", value is a bare integer string (e.g. "2")
Year: id="workExperience-6--startDate-dateSectionYear-input", data-automation-id="dateSectionYear-input", role="spinbutton", aria-label="Year", value is a bare integer string (e.g. "2002")

End Date follows the exact same structure, just with endDate instead of startDate in the id (e.g. workExperience-6--endDate-dateSectionMonth-input).
Practical implications for your extension:

data-automation-id alone (dateSectionMonth-input / dateSectionYear-input) is not unique on the page — every work experience entry reuses the same automation id. You need to scope your selector using the parent's unique id prefix (e.g. [id^="workExperience-6--startDate"]) or query within each [data-automation-id="dateInputWrapper"] group and grab its Month/Year children in order.
There's no name attribute at all, so form-serialization-based autofill (reading input[name=...]) won't find these — you must match by id substring or data-automation-id + ancestor scoping.
Values must be unpadded integers as strings ("2" not "02"), Month and Year set independently.
Because it's a React-controlled role="spinbutton" widget, setting .value directly via JS typically won't register with Workday's internal state. You generally need to use the native input value setter and dispatch a real input event (and often blur/change) for it to persist, e.g. using Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set before dispatching new Event('input', {bubbles:true}).

That last point is very likely your root cause if the extension writes a value that then reverts or shows a mismatched date after you tab away — it's writing the DOM value but not triggering the events Workday's React state relies on.