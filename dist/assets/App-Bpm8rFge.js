import { u as useApp, r as reactExports, j as jsxRuntimeExports, a as atsReqIdFromUrl, b as urlKey, h as hubUpsert, f as flushHubOutbox, g as getHubDeadLetters, d as hubQuery, T as TAILOR_BASE_URL, s as saveDraftEdits, m as measureEdits, e as getTailorConfig, l as loadTailorEntries, i as getActiveRun, k as getJob, n as isUnknownJobError, o as clearActiveRun, p as TailorOfflineError, q as pollUntilDone, S as STAGE_LABELS, V as V7_PRESETS, t as V6_PRESETS, v as presetId, w as estimateCostUsd, R as RecentEntries, x as estimateRedraftCostUsd, y as clearDraftEdits, z as downloadResultDocument, B as downloadCoverLetterDocument, C as checkHealth, D as listFamilies, E as getDraftEdits, F as pollCoverLetter, G as setTailorConfig, H as recordActiveTabJob, I as recordFormJob, J as startTailor, K as rememberTailorEntry, L as saveActiveRun, M as cancelJob, N as finalizeJob, O as FinalizeRejectedError, P as saveResultAsDocument, Q as estimateCoverLetterCostUsd, U as requestCoverLetter, W as saveCoverLetterAsDocument, X as OutreachPanel, Y as CommentPanel } from "./styles-CbmMJvxW.js";
import { t as toMonthISO, n as newId, r as redactForExport, d as runMigrations, v as validateImport, p as pendingReviewCount } from "./storage-DrgdSKCL.js";
import { D as DOC_SIZE_WARN_BYTES, d as deleteDocument, l as listDocumentMeta, s as saveDocument, f as guessKind, u as updateDocument, i as seedStatuses, t as trainingQueue, j as seedEntryId, k as domainEnabled, m as entriesMatchingHost } from "./seed-CEX56cSr.js";
import { d as detectVariables, r as resolveVariables, j as findGeneralizations, k as applyGeneralizations, l as mergeOptions, n as loadValidationReports } from "./validation-report-CTSZ6ve_.js";
function Text({
  label,
  value,
  onChange,
  type = "text"
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type, value, onChange: (e) => onChange(e.target.value) })
  ] });
}
function MonthField({
  label,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "month", value: toMonthISO(value), onChange: (e) => onChange(e.target.value) })
  ] });
}
const EMPTY_JOB = {
  company: "",
  title: "",
  startDate: "",
  endDate: "",
  location: "",
  description: ""
};
const EMPTY_EDU = {
  institution: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: ""
};
function ProfileTab() {
  const { store, setProfile } = useApp();
  const [draft, setDraft] = reactExports.useState(store.profile);
  const [savedFlash, setSavedFlash] = reactExports.useState(false);
  const [showEeo, setShowEeo] = reactExports.useState(false);
  const patch = (p) => setDraft({ ...draft, ...p });
  const patchAddress = (p) => setDraft({ ...draft, address: { ...draft.address, ...p } });
  const patchLinks = (p) => setDraft({ ...draft, links: { ...draft.links, ...p } });
  const patchEeo = (p) => setDraft({ ...draft, eeo: { ...draft.eeo, ...p } });
  const patchJob = (i, p) => {
    const workHistory = draft.workHistory.map((j, idx) => idx === i ? { ...j, ...p } : j);
    setDraft({ ...draft, workHistory });
  };
  const patchEdu = (i, p) => {
    const education = draft.education.map((e, idx) => idx === i ? { ...e, ...p } : e);
    setDraft({ ...draft, education });
  };
  const save = async () => {
    await setProfile(draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Basics" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "First name", value: draft.firstName, onChange: (v) => patch({ firstName: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Last name", value: draft.lastName, onChange: (v) => patch({ lastName: v }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Email", type: "email", value: draft.email, onChange: (v) => patch({ email: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Phone", value: draft.phone, onChange: (v) => patch({ phone: v }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Pronouns (optional)", value: draft.pronouns, onChange: (v) => patch({ pronouns: v }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "ATS account credentials" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", children: "Used ONLY on account-creation / sign-in forms (pages with a password box). Stored in this browser's local extension storage; never captured, never shown in chips. FlashFiller fills the form — you always click Create Account / Sign In yourself." }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Text,
        {
          label: "Account email",
          type: "email",
          value: draft.accountEmail,
          onChange: (v) => patch({ accountEmail: v })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Text,
        {
          label: "Account password",
          type: "password",
          value: draft.accountPassword,
          onChange: (v) => patch({ accountPassword: v })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Address" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Address line 1", value: draft.address.line1, onChange: (v) => patchAddress({ line1: v }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Address line 2", value: draft.address.line2, onChange: (v) => patchAddress({ line2: v }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "City", value: draft.address.city, onChange: (v) => patchAddress({ city: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "State / region", value: draft.address.state, onChange: (v) => patchAddress({ state: v }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Postal code", value: draft.address.postalCode, onChange: (v) => patchAddress({ postalCode: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Country", value: draft.address.country, onChange: (v) => patchAddress({ country: v }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Links" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "LinkedIn", type: "url", value: draft.links.linkedin, onChange: (v) => patchLinks({ linkedin: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "GitHub", type: "url", value: draft.links.github, onChange: (v) => patchLinks({ github: v }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Portfolio", type: "url", value: draft.links.portfolio, onChange: (v) => patchLinks({ portfolio: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Website", type: "url", value: draft.links.website, onChange: (v) => patchLinks({ website: v }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Work eligibility & logistics" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      Text,
      {
        label: "Work authorization (e.g. US citizen, H-1B, EU work permit)",
        value: draft.workAuthorization,
        onChange: (v) => patch({ workAuthorization: v })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "Legally authorized to work?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: draft.authorizedToWork,
          onChange: (e) => patch({ authorizedToWork: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "Require visa sponsorship?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: draft.requiresSponsorship,
          onChange: (e) => patch({ requiresSponsorship: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "Previously worked at the company you’re applying to?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: draft.previouslyEmployedHere,
          onChange: (e) => patch({ previouslyEmployedHere: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "Willing to relocate?" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: draft.willingToRelocate,
          onChange: (e) => patch({ willingToRelocate: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Notice period", value: draft.noticePeriod, onChange: (v) => patch({ noticePeriod: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Desired salary", value: draft.desiredSalary, onChange: (v) => patch({ desiredSalary: v }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Work history" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Most recent first — powers “list your last N employers” composite answers." }),
    draft.workHistory.map((job, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Company", value: job.company, onChange: (v) => patchJob(i, { company: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Title", value: job.title, onChange: (v) => patchJob(i, { title: v }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(MonthField, { label: "Start month", value: job.startDate, onChange: (v) => patchJob(i, { startDate: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MonthField, { label: "End month (blank = current)", value: job.endDate, onChange: (v) => patchJob(i, { endDate: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Location", value: job.location, onChange: (v) => patchJob(i, { location: v }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Description" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: job.description,
            onChange: (e) => patchJob(i, { description: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small danger",
          onClick: () => setDraft({ ...draft, workHistory: draft.workHistory.filter((_, idx) => idx !== i) }),
          children: "Remove"
        }
      )
    ] }, i)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => setDraft({ ...draft, workHistory: [...draft.workHistory, EMPTY_JOB] }), children: "+ Add position" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Education" }),
    draft.education.map((edu, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Institution", value: edu.institution, onChange: (v) => patchEdu(i, { institution: v }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Degree", value: edu.degree, onChange: (v) => patchEdu(i, { degree: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Field of study", value: edu.field, onChange: (v) => patchEdu(i, { field: v }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(MonthField, { label: "Start month", value: edu.startDate, onChange: (v) => patchEdu(i, { startDate: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(MonthField, { label: "End month (blank = in progress)", value: edu.endDate, onChange: (v) => patchEdu(i, { endDate: v }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small danger",
          onClick: () => setDraft({ ...draft, education: draft.education.filter((_, idx) => idx !== i) }),
          children: "Remove"
        }
      )
    ] }, i)),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => setDraft({ ...draft, education: [...draft.education, EMPTY_EDU] }), children: "+ Add education" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "collapse-head", onClick: () => setShowEeo(!showEeo), children: [
      "Voluntary EEO (optional) ",
      showEeo ? "▾" : "▸"
    ] }) }),
    showEeo && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "warn", children: [
        "These are stored locally and ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "never auto-filled" }),
        ". FlashFiller only surfaces them as suggestions you explicitly accept per field."
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Gender", value: draft.eeo.gender, onChange: (v) => patchEeo({ gender: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Ethnicity", value: draft.eeo.ethnicity, onChange: (v) => patchEeo({ ethnicity: v }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Veteran status", value: draft.eeo.veteranStatus, onChange: (v) => patchEeo({ veteranStatus: v }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Text, { label: "Disability status", value: draft.eeo.disabilityStatus, onChange: (v) => patchEeo({ disabilityStatus: v }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", onClick: () => void save(), children: "Save profile" }),
      savedFlash && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "saved-flash", children: "✓ Saved" })
    ] })
  ] });
}
const KIND_LABELS = {
  resume: "Resume",
  coverLetter: "Cover letter",
  other: "Other"
};
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
function DocumentsTab() {
  const { store } = useApp();
  const [docs, setDocs] = reactExports.useState([]);
  const [status, setStatus] = reactExports.useState(null);
  const fileInput = reactExports.useRef(null);
  const refresh = async () => setDocs(await listDocumentMeta());
  reactExports.useEffect(() => {
    void refresh();
  }, []);
  const addFiles = async (files) => {
    if (!files || files.length === 0) return;
    for (const file of [...files]) {
      await saveDocument(file, guessKind(file.name));
    }
    setStatus(`${files.length === 1 ? files[0].name : `${files.length} files`} saved.`);
    setTimeout(() => setStatus(null), 4e3);
    await refresh();
  };
  const patch = async (id, p) => {
    await updateDocument(id, p);
    await refresh();
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Documents" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Stored locally in this browser only — files never leave your machine except into the application form itself. Matched documents attach to upload fields automatically (Settings → “Auto-attach documents” switches to suggest-only chips)." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        ref: fileInput,
        type: "file",
        multiple: true,
        accept: ".pdf,.doc,.docx,.txt,.rtf,.odt",
        style: { display: "none" },
        onChange: (e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", onClick: () => {
      var _a;
      return (_a = fileInput.current) == null ? void 0 : _a.click();
    }, children: "Add document" }),
    status && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", style: { marginTop: 8 }, children: status }),
    docs.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", style: { marginTop: 12 }, children: "Nothing stored yet. Upload your resume once and FlashFiller can attach it to every application’s “Upload resume” field for you — including drag-and-drop-only widgets." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 12 }, children: [
      docs.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "row",
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap"
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn small",
                title: d.isDefault ? "Default for its kind" : "Make default",
                onClick: () => void patch(d.id, { isDefault: true }),
                style: { minWidth: 30 },
                children: d.isDefault ? "★" : "☆"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 160 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", style: { wordBreak: "break-all" }, children: d.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
                formatSize(d.size),
                d.size > DOC_SIZE_WARN_BYTES && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "warn", style: { marginLeft: 6 }, children: "over 4 MB — some sites reject files this large" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: d.kind,
                onChange: (e) => void patch(d.id, { kind: e.target.value }),
                children: Object.keys(KIND_LABELS).map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: KIND_LABELS[k] }, k))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "btn small danger",
                onClick: () => {
                  if (confirm(`Delete "${d.name}" from FlashFiller?`)) void deleteDocument(d.id).then(refresh);
                },
                children: "✕"
              }
            ),
            store.settings.personas.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "list-editor", style: { width: "100%" }, children: store.settings.personas.map((p) => {
              const on = d.personas.includes(p);
              return /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: "removable",
                  style: { opacity: on ? 1 : 0.45, cursor: "pointer" },
                  title: on ? `Only attaches when the "${p}" persona is active — click to make universal again` : `Pin to the "${p}" persona`,
                  onClick: () => void patch(d.id, {
                    personas: on ? d.personas.filter((x) => x !== p) : [...d.personas, p]
                  }),
                  children: p
                },
                p
              );
            }) })
          ]
        },
        d.id
      )),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", style: { marginTop: 10 }, children: "★ marks the document attached when several of the same kind match. No persona selected = universal. Cover-letter fields only ever receive cover letters; a field that accepts only formats you haven’t stored gets an honest chip instead." })
    ] })
  ] });
}
function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function Editor({
  entry,
  personas,
  onSave,
  onCancel
}) {
  const [draft, setDraft] = reactExports.useState(entry);
  const vars = detectVariables(draft.answer);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Question" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: draft.question,
          onChange: (e) => setDraft({ ...draft, question: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Aliases (one per line — other phrasings of the same question)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: draft.aliases.join("\n"),
          onChange: (e) => setDraft({ ...draft, aliases: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { children: [
        "Answer — supports ",
        "{{company}}, {{role}}, {{location}}, {{today}}, {{profile.*}}"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: draft.answer,
          onChange: (e) => setDraft({ ...draft, answer: e.target.value })
        }
      )
    ] }),
    vars.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "muted", style: { marginBottom: 8 }, children: [
      "Template variables: ",
      vars.map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip", children: `{{${v}}}` }, v))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { fontSize: 12.5 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: draft.answerMode === "judge",
          onChange: (e) => setDraft({ ...draft, answerMode: e.target.checked ? "judge" : "auto" })
        }
      ),
      " ",
      "AI judge only — OpenAI picks the closest option for this question; local matching never places it (needs the API key in Settings; no pick = review chip)"
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Personas (none = universal)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "list-editor", children: personas.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { fontSize: 12.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: draft.personas.includes(p),
            onChange: (e) => setDraft({
              ...draft,
              personas: e.target.checked ? [...draft.personas, p] : draft.personas.filter((x) => x !== p)
            })
          }
        ),
        " ",
        p
      ] }, p)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn primary",
          disabled: !draft.question.trim() || !draft.answer.trim(),
          onClick: () => onSave({ ...draft, variables: vars, updatedAt: Date.now() }),
          children: "Save answer"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: onCancel, children: "Cancel" })
    ] })
  ] });
}
function AnswersTab() {
  const { store, saveQA, removeQA, importPayload } = useApp();
  const [search, setSearch] = reactExports.useState("");
  const [personaFilter, setPersonaFilter] = reactExports.useState("");
  const [editing, setEditing] = reactExports.useState(null);
  const [importReport, setImportReport] = reactExports.useState(null);
  const fileRef = reactExports.useRef(null);
  const active = store.qa.filter((e) => e.status === "active");
  const needle = search.toLowerCase();
  const filtered = active.filter((e) => {
    const matchesSearch = !needle || e.question.toLowerCase().includes(needle) || e.answer.toLowerCase().includes(needle) || e.aliases.some((a) => a.toLowerCase().includes(needle));
    const matchesPersona = !personaFilter || (personaFilter === "__universal" ? e.personas.length === 0 : e.personas.includes(personaFilter));
    return matchesSearch && matchesPersona;
  });
  const startNew = () => setEditing({
    id: newId(),
    question: "",
    aliases: [],
    answer: "",
    answerType: "text",
    answerTemplate: null,
    mapsTo: null,
    variables: [],
    personas: [],
    tags: [],
    fieldType: "text",
    options: [],
    status: "active",
    source: "import",
    captureContext: null,
    siteScope: null,
    reviewNote: "",
    lastWrongAt: null,
    okCount: 0,
    wrongCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  const handleImportFile = async (file) => {
    var _a, _b;
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setImportReport("Import failed: not valid JSON.");
      return;
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      parsed = runMigrations(parsed);
    }
    const result = validateImport(parsed);
    if (!result.ok || !result.data) {
      setImportReport(`Import failed: ${result.errors.join("; ")}`);
      return;
    }
    const n = ((_a = result.data.qa) == null ? void 0 : _a.length) ?? 0;
    if (!confirm(`Import ${n} answer${n === 1 ? "" : "s"}${result.data.profile ? " + profile" : ""} by MERGING into your existing data?

(matching ids updated, new added — Cancel aborts)`)) {
      setImportReport("Import cancelled — nothing changed.");
      return;
    }
    const replace = confirm("Also REPLACE all existing Q&A with this file?\n\nOK = replace everything · Cancel = keep merging");
    await importPayload(result.data, replace ? "replace" : "merge");
    const rejectedNote = result.rejected.length > 0 ? ` ${result.rejected.length} malformed entr${result.rejected.length === 1 ? "y" : "ies"} rejected: ${result.rejected.slice(0, 3).map((r) => `#${r.index}${r.question ? ` (“${r.question.slice(0, 30)}”)` : ""} — ${r.reason}`).join("; ")}${result.rejected.length > 3 ? "…" : ""}` : "";
    setImportReport(
      `Imported ${((_b = result.data.qa) == null ? void 0 : _b.length) ?? 0} answers${result.data.profile ? " + profile" : ""}${result.data.optionSets ? ` + ${result.data.optionSets.length} option sets` : ""}${result.data.settings ? " + settings" : ""}.${rejectedNote}`
    );
  };
  const exportAll = () => {
    const payload = redactForExport(store);
    download("flashfiller-export.json", payload);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: "Search answers…",
          value: search,
          onChange: (e) => setSearch(e.target.value)
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: personaFilter, onChange: (e) => setPersonaFilter(e.target.value), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "All personas" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "__universal", children: "Universal only" }),
        store.settings.personas.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p, children: p }, p))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small primary", onClick: startNew, children: "+ Add" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: exportAll, children: "Export JSON" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => {
        var _a;
        return (_a = fileRef.current) == null ? void 0 : _a.click();
      }, children: "Import JSON" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          ref: fileRef,
          type: "file",
          accept: "application/json",
          style: { display: "none" },
          onChange: (e) => {
            var _a;
            const file = (_a = e.target.files) == null ? void 0 : _a[0];
            if (file) void handleImportFile(file);
            e.target.value = "";
          }
        }
      )
    ] }),
    importReport && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", children: importReport }),
    editing && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Editor,
      {
        entry: editing,
        personas: store.settings.personas,
        onSave: (e) => {
          void saveQA(e);
          setEditing(null);
        },
        onCancel: () => setEditing(null)
      }
    ),
    filtered.length === 0 && !editing && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty-state", children: [
      "No answers yet. Use the ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Training" }),
      " tab to answer common questions, or add one manually."
    ] }),
    filtered.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card qa-item", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "q", children: entry.question }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "a", children: entry.answer || (entry.answerType !== "text" ? `(from ${entry.answerType})` : "") }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        entry.personas.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip", children: p }, p)),
        entry.personas.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: "universal" }),
        entry.variables.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: "{{…}}" }),
        entry.answerMode === "judge" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip", children: "AI judge" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: entry.source })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "item-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => setEditing(entry), children: "Edit" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn small danger",
            onClick: () => {
              if (confirm(`Delete “${entry.question}”?`)) void removeQA(entry.id);
            },
            children: "Delete"
          }
        )
      ] })
    ] }, entry.id))
  ] });
}
const SAMPLE_CONTEXT = {
  company: "Acme Corp",
  role: "Software Engineer",
  location: "Berlin",
  source: "none"
};
function buildTrainingEntry(seed, answer, persona, now = Date.now()) {
  return {
    id: seedEntryId(seed.id, persona),
    question: seed.question,
    aliases: seed.aliases,
    answer,
    answerType: "text",
    answerTemplate: null,
    mapsTo: null,
    variables: detectVariables(answer),
    personas: persona ? [persona] : [],
    tags: [`seed:${seed.id}`, seed.category],
    fieldType: seed.fieldType,
    options: [],
    status: "active",
    source: "training",
    captureContext: null,
    siteScope: null,
    reviewNote: "",
    lastWrongAt: null,
    okCount: 0,
    wrongCount: 0,
    createdAt: now,
    updatedAt: now
  };
}
function TrainingTab({ limit, onDone }) {
  var _a;
  const { store, seeds, saveQA, patchSettings } = useApp();
  const [persona, setPersona] = reactExports.useState(null);
  const [category, setCategory] = reactExports.useState("");
  const [index, setIndex] = reactExports.useState(0);
  const [answer, setAnswer] = reactExports.useState("");
  const [showNewForm, setShowNewForm] = reactExports.useState(false);
  const [newQ, setNewQ] = reactExports.useState({ question: "", answer: "" });
  const statuses = reactExports.useMemo(
    () => seeds ? seedStatuses(seeds, store.qa, store.profile, store.settings, persona) : [],
    [seeds, store, persona]
  );
  const queueAll = reactExports.useMemo(() => trainingQueue(statuses, category || void 0), [statuses, category]);
  const queue = limit ? queueAll.slice(0, limit) : queueAll;
  if (!seeds) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty-state", children: "Seed catalog unavailable." });
  const freeTextSeeds = statuses.filter(
    (s) => s.seed.answerType === "freeText" && s.coverage !== "suppressed"
  );
  const answeredCount = freeTextSeeds.filter((s) => s.coverage === "answered").length;
  const coveredCount = statuses.filter((s) => s.coverage === "covered").length;
  const total = freeTextSeeds.length;
  const current = queue[Math.min(index, queue.length - 1)];
  const done = queue.length === 0 || index >= queue.length;
  const advance = () => {
    setAnswer("");
    if (index + 1 >= queue.length && onDone) onDone();
    else setIndex(index + 1);
  };
  const consumed = () => {
    setAnswer("");
    if (queue.length <= 1 && onDone) onDone();
  };
  const save = async () => {
    if (!current || !answer.trim()) return;
    await saveQA(buildTrainingEntry(current, answer.trim(), persona));
    consumed();
  };
  const notApplicable = async () => {
    if (!current) return;
    await patchSettings({
      suppressedSeedIds: [...store.settings.suppressedSeedIds, current.id]
    });
    consumed();
  };
  const vars = detectVariables(answer);
  const preview = vars.length > 0 ? resolveVariables(answer, { context: SAMPLE_CONTEXT, profile: store.profile }) : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "progress-track", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "div",
        {
          className: "progress-fill",
          style: { width: total ? `${answeredCount / total * 100}%` : "0%" }
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "muted", children: [
        answeredCount,
        " / ",
        total,
        " answered"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: category, onChange: (e) => {
        setCategory(e.target.value);
        setIndex(0);
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "All categories" }),
        seeds.categories.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.id, children: c.label }, c.id))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: persona ?? "",
          onChange: (e) => {
            setPersona(e.target.value || null);
            setIndex(0);
          },
          title: "Answer the same question differently per persona",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Universal answer" }),
            store.settings.personas.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: p, children: [
              "As: ",
              p
            ] }, p))
          ]
        }
      )
    ] }),
    coveredCount > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", children: [
      "✓ ",
      coveredCount,
      " questions already covered by your profile — no typing needed."
    ] }),
    done ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "empty-state", children: [
      "🎉 Nothing left to answer",
      category ? " in this category" : "",
      ".",
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", style: { justifyContent: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => setShowNewForm(true), children: "+ Add your own question" }),
        onDone && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", onClick: onDone, children: "Finish" })
      ] })
    ] }) : current ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card flashcard", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "category", children: [
        ((_a = seeds.categories.find((c) => c.id === current.category)) == null ? void 0 : _a.label) ?? current.category,
        " · ",
        index + 1,
        " of ",
        queue.length,
        " · appears as ",
        current.fieldType
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "question", children: current.question }),
      current.guidance && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "guidance", children: current.guidance }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "field", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: answer,
          placeholder: persona ? `Your ${persona} answer…` : "Your answer… ({{company}}, {{role}} become per-application variables)",
          onChange: (e) => setAnswer(e.target.value),
          rows: current.fieldType === "textarea" ? 6 : 2
        }
      ) }),
      preview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "preview", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "preview-label", children: "Preview with sample job (Acme Corp · Software Engineer · Berlin)" }),
        preview.text,
        preview.unresolved.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "warn", style: { marginTop: 6 }, children: [
          "Unresolved: ",
          preview.unresolved.join(", "),
          " — you’ll be prompted when filling."
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", disabled: !answer.trim(), onClick: () => void save(), children: "Save" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: advance, children: "Skip" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void notApplicable(), title: "Don’t ask me this again", children: "Not applicable" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", disabled: index === 0, onClick: () => {
          setAnswer("");
          setIndex(index - 1);
        }, children: "← Back" })
      ] })
    ] }) : null,
    !done && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => setShowNewForm(!showNewForm), children: "+ Add your own question" }),
    showNewForm && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Question" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            value: newQ.question,
            onChange: (e) => setNewQ({ ...newQ, question: e.target.value })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Answer" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: newQ.answer, onChange: (e) => setNewQ({ ...newQ, answer: e.target.value }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn primary",
            disabled: !newQ.question.trim() || !newQ.answer.trim(),
            onClick: () => {
              const now = Date.now();
              void saveQA({
                id: `custom-${now}`,
                question: newQ.question.trim(),
                aliases: [],
                answer: newQ.answer.trim(),
                answerType: "text",
                answerTemplate: null,
                mapsTo: null,
                variables: detectVariables(newQ.answer),
                personas: persona ? [persona] : [],
                tags: ["custom"],
                fieldType: "textarea",
                options: [],
                status: "active",
                source: "training",
                captureContext: null,
                siteScope: null,
                reviewNote: "",
                lastWrongAt: null,
                okCount: 0,
                wrongCount: 0,
                createdAt: now,
                updatedAt: now
              });
              setNewQ({ question: "", answer: "" });
              setShowNewForm(false);
            },
            children: "Save question"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => setShowNewForm(false), children: "Cancel" })
      ] })
    ] })
  ] });
}
function GeneralizeDiff({
  answer,
  spans,
  selected,
  onToggle
}) {
  const parts = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start > cursor) parts.push(answer.slice(cursor, span.start));
    const active = selected.has(i);
    parts.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.Fragment, { children: active ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("mark", { children: span.literal }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "var", children: `{{${span.variable}}}` })
      ] }) : span.literal }, i)
    );
    cursor = span.end;
  });
  parts.push(answer.slice(cursor));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "diff", children: parts }),
    spans.map((span, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "gen-option", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: selected.has(i), onChange: () => onToggle(i) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Replace “",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: span.literal }),
        "” with",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: `{{${span.variable}}}` })
      ] })
    ] }, i))
  ] });
}
function ReviewCard({ entry }) {
  const { store, saveQA, removeQA } = useApp();
  const [draft, setDraft] = reactExports.useState(entry);
  const [showGeneralize, setShowGeneralize] = reactExports.useState(false);
  const spans = reactExports.useMemo(
    () => findGeneralizations(draft.answer, draft.captureContext),
    [draft.answer, draft.captureContext]
  );
  const [selected, setSelected] = reactExports.useState(new Set(spans.map((_, i) => i)));
  const applySelected = () => {
    const chosen = spans.filter((_, i) => selected.has(i));
    const generalized = applyGeneralizations(draft.answer, chosen);
    setDraft({ ...draft, answer: generalized, variables: detectVariables(generalized) });
    setShowGeneralize(false);
  };
  const approvable = !!draft.answer.trim() && !!draft.question.trim();
  const approve = () => void saveQA({
    ...draft,
    question: draft.question.trim(),
    status: "active",
    reviewNote: "",
    lastWrongAt: null,
    wrongCount: 0,
    variables: detectVariables(draft.answer),
    updatedAt: Date.now()
  });
  const context = draft.captureContext;
  const cameBackWrong = entry.lastWrongAt != null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "muted", style: { marginBottom: 6, display: "flex", gap: 8, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge", children: entry.source === "inferred" ? "ai-inferred" : entry.source }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "badge", children: entry.fieldType }),
      entry.siteScope && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "badge", children: [
        "only ",
        entry.siteScope
      ] })
    ] }),
    entry.reviewNote && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: cameBackWrong ? "note danger" : "note",
        style: cameBackWrong ? { color: "#b3261e", fontWeight: 600 } : void 0,
        children: [
          cameBackWrong ? "⚠ " : "",
          entry.reviewNote
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Question" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: draft.question,
          onChange: (e) => setDraft({ ...draft, question: e.target.value })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Answer" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "textarea",
        {
          value: draft.answer,
          onChange: (e) => setDraft({ ...draft, answer: e.target.value })
        }
      )
    ] }),
    context && (context.company || context.role || context.location) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "muted", style: { marginBottom: 6 }, children: [
      "Captured on: ",
      [context.company, context.role, context.location].filter(Boolean).join(" · ")
    ] }),
    entry.options.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "muted", style: { marginBottom: 6 }, children: [
      "Field offered:",
      " ",
      entry.options.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("code", { style: { marginRight: 6 }, children: o }, o))
    ] }),
    entry.siteScope && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "gen-option", style: { marginBottom: 6 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: draft.siteScope === null,
          onChange: (e) => setDraft({ ...draft, siteScope: e.target.checked ? null : entry.siteScope })
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
        "Make universal — currently only fills on ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: entry.siteScope })
      ] })
    ] }),
    spans.length > 0 && !showGeneralize && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn small", onClick: () => {
      setSelected(new Set(spans.map((_, i) => i)));
      setShowGeneralize(true);
    }, children: [
      "✨ Generalize (",
      spans.length,
      " literal",
      spans.length === 1 ? "" : "s",
      " found)"
    ] }),
    showGeneralize && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", children: "Review each replacement below — nothing changes until you apply." }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        GeneralizeDiff,
        {
          answer: draft.answer,
          spans,
          selected,
          onToggle: (i) => {
            const next = new Set(selected);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            setSelected(next);
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn primary small", disabled: selected.size === 0, onClick: applySelected, children: [
          "Apply ",
          selected.size,
          " replacement",
          selected.size === 1 ? "" : "s"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => setShowGeneralize(false), children: "Cancel" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Personas (none = universal)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "list-editor", children: store.settings.personas.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { fontSize: 12.5 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "checkbox",
            checked: draft.personas.includes(p),
            onChange: (e) => setDraft({
              ...draft,
              personas: e.target.checked ? [...draft.personas, p] : draft.personas.filter((x) => x !== p)
            })
          }
        ),
        " ",
        p
      ] }, p)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "btn-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", disabled: !approvable, onClick: approve, children: "✓ Approve" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn danger",
          onClick: () => {
            if (confirm("Discard this captured answer?")) void removeQA(entry.id);
          },
          children: "Discard"
        }
      )
    ] })
  ] });
}
function ReviewTab() {
  const { store, saveManyQA, removeQA } = useApp();
  const pending = store.qa.filter((e) => e.status === "needs_review");
  if (pending.length === 0) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty-state", children: "Review queue is empty. Answers captured while you apply will appear here for approval — they’re never auto-filled until you approve them." });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toolbar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "muted", children: [
        pending.length,
        " pending"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small",
          onClick: () => {
            if (confirm(`Approve all ${pending.length} pending answers as-is?`))
              void saveManyQA(
                pending.map((e) => ({
                  ...e,
                  status: "active",
                  reviewNote: "",
                  lastWrongAt: null,
                  wrongCount: 0,
                  updatedAt: Date.now()
                }))
              );
          },
          children: "Approve all"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small danger",
          onClick: () => {
            if (confirm(`Discard all ${pending.length} pending answers? This can’t be undone.`)) {
              void (async () => {
                for (const e of pending) await removeQA(e.id);
              })();
            }
          },
          children: "Discard all"
        }
      )
    ] }),
    pending.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsx(ReviewCard, { entry }, `${entry.id}-${entry.updatedAt}`))
  ] });
}
function QuestionRow({
  entry,
  selected,
  onToggle
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card qa-item", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "flex", gap: 8, alignItems: "baseline" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: selected, onChange: onToggle }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "q", children: entry.question }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: entry.fieldType }),
      entry.status === "needs_review" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip warn-chip", children: "needs review" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "a", children: [
      "Answer: ",
      entry.answer || "—"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" }, children: entry.options.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      "span",
      {
        className: `chip ${option === entry.answer ? "" : "gray"}`,
        title: option === entry.answer ? "Stored answer" : void 0,
        children: option
      },
      option
    )) }),
    entry.aliases.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "muted", children: [
      "Also matches: ",
      entry.aliases.join(" · ")
    ] })
  ] });
}
function SetCard({ set, knownOptions }) {
  const { saveOptionSet, removeOptionSet } = useApp();
  const [label, setLabel] = reactExports.useState(set.label);
  const [draft, setDraft] = reactExports.useState("");
  const listId = `ff-known-options-${set.id}`;
  const addOption = () => {
    const text = draft.trim();
    if (!text) return;
    void saveOptionSet({ ...set, options: mergeOptions(set.options, [text]) });
    setDraft("");
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Set name" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          value: label,
          placeholder: "e.g. Authorized to work — Yes",
          onChange: (e) => setLabel(e.target.value),
          onBlur: () => {
            if (label.trim() !== set.label) void saveOptionSet({ ...set, label: label.trim() });
          }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }, children: [
      set.options.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "muted", children: "No options yet — add the wordings that mean the same thing." }),
      set.options.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip", children: [
        option,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "chip-remove",
            style: { border: "none", background: "none", cursor: "pointer", padding: 0 },
            title: "Remove from set",
            onClick: () => void saveOptionSet({ ...set, options: set.options.filter((o) => o !== option) }),
            children: "×"
          }
        )
      ] }, option))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toolbar", style: { marginBottom: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          list: listId,
          value: draft,
          placeholder: "Add an equivalent option wording…",
          onChange: (e) => setDraft(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") addOption();
          }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: listId, children: knownOptions.filter((o) => !set.options.some((s) => s.toLowerCase() === o.toLowerCase())).map((o) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: o }, o)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", disabled: !draft.trim(), onClick: addOption, children: "Add" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small danger",
          onClick: () => {
            if (confirm(`Delete option set “${set.label || "Untitled"}”?`)) void removeOptionSet(set.id);
          },
          children: "Delete set"
        }
      )
    ] })
  ] });
}
function OptionsTab() {
  const { store, saveQA, removeQA, saveOptionSet } = useApp();
  const [selected, setSelected] = reactExports.useState(/* @__PURE__ */ new Set());
  const [survivorId, setSurvivorId] = reactExports.useState(null);
  const withOptions = reactExports.useMemo(
    () => store.qa.filter((e) => e.options.length > 0),
    [store.qa]
  );
  const knownOptions = reactExports.useMemo(
    () => mergeOptions(withOptions.flatMap((e) => e.options), []).sort((a, b) => a.localeCompare(b)),
    [withOptions]
  );
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    if (!next.has(survivorId ?? "")) setSurvivorId([...next][0] ?? null);
  };
  const selectedEntries = withOptions.filter((e) => selected.has(e.id));
  const mergeSelected = async () => {
    const survivor = selectedEntries.find((e) => e.id === survivorId);
    if (!survivor || selectedEntries.length < 2) return;
    const others = selectedEntries.filter((e) => e.id !== survivor.id);
    if (!confirm(
      `Merge ${others.length} question${others.length === 1 ? "" : "s"} into “${survivor.question}”?

Their question texts become aliases of the kept entry; the kept answer wins. This cannot be undone.`
    ))
      return;
    const known = new Set([survivor.question, ...survivor.aliases].map((t) => t.toLowerCase()));
    const aliases = [...survivor.aliases];
    for (const other of others) {
      for (const text of [other.question, ...other.aliases]) {
        if (text.trim() && !known.has(text.toLowerCase())) {
          known.add(text.toLowerCase());
          aliases.push(text);
        }
      }
    }
    const answersDiffer = others.some((o) => o.answer.trim() !== survivor.answer.trim());
    await saveQA({
      ...survivor,
      aliases,
      options: mergeOptions(survivor.options, others.flatMap((o) => o.options)),
      // A merged-away entry disagreed on the answer → re-check before autofill
      status: answersDiffer ? "needs_review" : survivor.status,
      updatedAt: Date.now()
    });
    for (const other of others) await removeQA(other.id);
    setSelected(/* @__PURE__ */ new Set());
    setSurvivorId(null);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", children: [
      "Questions captured from choice fields (dropdowns, radios, checkboxes) appear here with every option the form offered. Different forms word the same question — and the same option — differently; classifying them is your call. Merge equivalent ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "questions" }),
      " so they match as one, and group equivalent ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "option wordings" }),
      " into sets so a stored answer can fill any of its set’s wordings."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { margin: "14px 0 8px" }, children: "Captured questions & their options" }),
    withOptions.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "empty-state", children: "Nothing here yet. When you (or an agent like Claude) answer a dropdown, radio or checkbox question FlashFiller didn’t know, saving it from the capture prompt records the question together with all its options." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      selected.size >= 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toolbar", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "muted", children: [
          selected.size,
          " selected — keep:"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: survivorId ?? "", onChange: (e) => setSurvivorId(e.target.value), children: selectedEntries.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: e.id, children: e.question }, e.id)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small primary", onClick: () => void mergeSelected(), children: "Merge as same question" })
      ] }),
      withOptions.map((entry) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        QuestionRow,
        {
          entry,
          selected: selected.has(entry.id),
          onToggle: () => toggle(entry.id)
        },
        entry.id
      ))
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { margin: "18px 0 8px" }, children: "Option sets (equivalent wordings)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "muted", style: { marginBottom: 8 }, children: "Example: group “Yes”, “Yes, I am authorized to work in the United States” and “Authorized” — then an entry whose answer is any one of them can fill a form that offers any other." }),
    store.optionSets.map((set) => /* @__PURE__ */ jsxRuntimeExports.jsx(SetCard, { set, knownOptions }, set.id)),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn",
        onClick: () => void saveOptionSet({ id: newId(), label: "", options: [] }),
        children: "+ New option set"
      }
    )
  ] });
}
function SettingsTab() {
  const { store, patchSettings, deleteAllData } = useApp();
  const s = store.settings;
  const [newDomain, setNewDomain] = reactExports.useState("");
  const [newPersona, setNewPersona] = reactExports.useState("");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Matching thresholds" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "slider-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "slider-head", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Auto-fill at or above" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          Math.round(s.autoFillThreshold * 100),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "range",
          min: 0.5,
          max: 1,
          step: 0.05,
          value: s.autoFillThreshold,
          onChange: (e) => void patchSettings({
            autoFillThreshold: Math.max(Number(e.target.value), s.suggestThreshold)
          })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "slider-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "slider-head", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Suggest at or above" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
          Math.round(s.suggestThreshold * 100),
          "%"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "range",
          min: 0.3,
          max: 1,
          step: 0.05,
          value: s.suggestThreshold,
          onChange: (e) => void patchSettings({
            suggestThreshold: Math.min(Number(e.target.value), s.autoFillThreshold)
          })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Filling behavior" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", children: "Overwrite already-filled fields" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Off: existing content is always respected" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: s.overwriteFilled,
          onChange: (e) => void patchSettings({ overwriteFilled: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", children: "Auto-attach documents" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Off: matched resumes/cover letters show a suggestion chip instead of attaching silently (documents live in the Documents tab)" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: s.autoAttachDocuments,
          onChange: (e) => void patchSettings({ autoAttachDocuments: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", children: "Capture loop" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Offer to save answers you type that FlashFiller didn’t know" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: s.captureLoopEnabled,
          onChange: (e) => void patchSettings({ captureLoopEnabled: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Delay between fills (ms) — never faster than the page can handle" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "number",
          min: 0,
          value: s.fillDelayMs,
          onChange: (e) => void patchSettings({ fillDelayMs: Math.max(0, Number(e.target.value) || 0) })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Enabled domains" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "FlashFiller activates automatically on these domains. Anywhere else, use “Scan this page” in the popup (only acts on your click)." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "list-editor", children: s.enabledDomains.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "removable", children: [
      d,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => void patchSettings({ enabledDomains: s.enabledDomains.filter((x) => x !== d) }),
          children: "✕"
        }
      )
    ] }, d)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: "jobs.example.com",
          value: newDomain,
          onChange: (e) => setNewDomain(e.target.value),
          style: { padding: "6px 9px", border: "1px solid var(--border)", borderRadius: 7 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small",
          disabled: !newDomain.trim(),
          onClick: () => {
            const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
            if (domain && !s.enabledDomains.includes(domain))
              void patchSettings({ enabledDomains: [...s.enabledDomains, domain] });
            setNewDomain("");
          },
          children: "Add"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Personas" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Answer the same question differently per role type. The active persona’s answers are preferred when filling." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "list-editor", children: s.personas.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "removable", children: [
      p,
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => void patchSettings({
            personas: s.personas.filter((x) => x !== p),
            activePersona: s.activePersona === p ? null : s.activePersona
          }),
          children: "✕"
        }
      )
    ] }, p)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "row", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: "e.g. backend",
          value: newPersona,
          onChange: (e) => setNewPersona(e.target.value),
          style: { padding: "6px 9px", border: "1px solid var(--border)", borderRadius: 7 }
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small",
          disabled: !newPersona.trim(),
          onClick: () => {
            const p = newPersona.trim();
            if (p && !s.personas.includes(p)) void patchSettings({ personas: [...s.personas, p] });
            setNewPersona("");
          },
          children: "Add"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", style: { marginTop: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Active persona" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: s.activePersona ?? "",
          onChange: (e) => void patchSettings({ activePersona: e.target.value || null }),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "None (universal answers only)" }),
            s.personas.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p, children: p }, p))
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", children: "Auto-infer persona from job title" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "e.g. a “Senior Frontend Engineer” posting activates “frontend”" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: s.autoInferPersona,
          onChange: (e) => void patchSettings({ autoInferPersona: e.target.checked })
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Semantic matching (optional)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", children: [
      "Privacy: with this OFF (default), FlashFiller makes ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "zero" }),
      " network requests — all matching is local. Turning it on sends form questions, their option texts, and (when inferring an unknown question) a summary of your profile answers to OpenAI, using your own API key, stored only on this device."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "toggle-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "label", children: "Enable semantic matching" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "checkbox",
          checked: s.semanticMatching.enabled,
          onChange: (e) => void patchSettings({
            semanticMatching: {
              ...s.semanticMatching,
              enabled: e.target.checked,
              // Turning the judge on means OpenAI — the only provider shipped
              provider: e.target.checked ? "openai" : s.semanticMatching.provider
            }
          })
        }
      )
    ] }),
    s.semanticMatching.enabled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "OpenAI API key (stored locally, sent only to api.openai.com)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            placeholder: "sk-...",
            value: s.semanticMatching.apiKeyRef ?? "",
            onChange: (e) => void patchSettings({
              semanticMatching: { ...s.semanticMatching, apiKeyRef: e.target.value || null }
            })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Model" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "gpt-4o-mini",
            value: s.semanticMatching.model,
            onChange: (e) => void patchSettings({
              semanticMatching: { ...s.semanticMatching, model: e.target.value }
            })
          }
        )
      ] }),
      !s.semanticMatching.apiKeyRef && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "warn", children: "Without an API key, matching stays fully local (lexical) — the judge never runs." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "LLM-first filling (beta)" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", children: [
      "The inversion: after the normal (deterministic) pass, ",
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "one" }),
      " Claude call plans everything left on the page — questionnaires, EEO placement from your stored answers, dropdowns — and the guarded executor fills it. At most one repair round per page. Privacy: the unresolved questions with their options, your profile facts, your stored EEO answers (placement only), and relevant saved answers are sent to api.anthropic.com using your own key, stored only on this device. Your account password never leaves this device. FlashFiller still never submits anything."
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Fill mode" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "select",
        {
          value: s.fillMode,
          onChange: (e) => void patchSettings({ fillMode: e.target.value === "llm-first" ? "llm-first" : "assisted" }),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "assisted", children: "Assisted (default) — deterministic + per-field AI pokes" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "llm-first", children: "LLM-first — deterministic pass, then one Claude plan" })
          ]
        }
      )
    ] }),
    s.fillMode === "llm-first" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Anthropic API key (stored locally, sent only to api.anthropic.com)" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "password",
            placeholder: "sk-ant-...",
            value: s.planner.apiKeyRef ?? "",
            onChange: (e) => void patchSettings({
              planner: { ...s.planner, apiKeyRef: e.target.value || null }
            })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Model" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "claude-haiku-4-5",
            value: s.planner.model,
            onChange: (e) => void patchSettings({ planner: { ...s.planner, model: e.target.value } })
          }
        )
      ] }),
      !s.planner.apiKeyRef && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "warn", children: "Without an Anthropic key the planner never runs — filling stays exactly as in assisted mode." })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Your data" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Everything lives in this browser’s local extension storage. Export from the Answers tab any time." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        className: "btn danger",
        onClick: () => {
          if (confirm(
            "Delete ALL FlashFiller data — profile, answers, settings? This cannot be undone. (Consider exporting first.)"
          ))
            void deleteAllData();
        },
        children: "Delete all my data"
      }
    )
  ] });
}
function captureInPage() {
  var _a;
  const clean = (v) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 && t.length < 300 ? t : null;
  };
  const stripHtml = (html) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent ?? "").replace(/ /g, " ");
  };
  const tidy = (text) => text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").split("\n").map((line) => line.trim()).join("\n").trim();
  const findPosting = (node) => {
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = findPosting(item);
        if (hit) return hit;
      }
      return null;
    }
    if (typeof node !== "object" || node === null) return null;
    const obj = node;
    const type = obj["@type"];
    if (type === "JobPosting" || Array.isArray(type) && type.includes("JobPosting")) return obj;
    if (obj["@graph"]) return findPosting(obj["@graph"]);
    return null;
  };
  let role = null;
  let company = null;
  let location = null;
  let jdText = "";
  let source = "none";
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
    let parsed;
    try {
      parsed = JSON.parse(script.textContent ?? "");
    } catch {
      continue;
    }
    const posting = findPosting(parsed);
    if (!posting) continue;
    role = clean(posting.title);
    const org = posting.hiringOrganization;
    company = typeof org === "string" ? clean(org) : clean(org == null ? void 0 : org.name);
    const jobLocation = posting.jobLocation;
    const first = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
    if (first && typeof first === "object") {
      const address = first.address;
      if (address && typeof address === "object") {
        const a = address;
        location = clean(a.addressLocality) ?? clean(a.addressRegion) ?? clean(a.addressCountry);
      } else {
        location = clean(first.name);
      }
    }
    if (typeof posting.description === "string" && posting.description.trim().length > 200) {
      jdText = tidy(stripHtml(posting.description));
      source = "jsonld";
    }
    break;
  }
  if (!jdText) {
    const semantic = [
      ['[data-automation-id="jobPostingDescription"]', "main"],
      ["#job-details", "main"],
      [".job-description", "main"],
      ['[class*="jobDescription"]', "main"],
      ["article", "article"],
      ["main", "main"]
    ];
    for (const [selector, label] of semantic) {
      const el = document.querySelector(selector);
      const text = tidy((el == null ? void 0 : el.textContent) ?? "");
      if (text.length > 400) {
        jdText = text;
        source = label;
        break;
      }
    }
  }
  if (!jdText) {
    let best = "";
    for (const el of Array.from(document.querySelectorAll("div, section, td"))) {
      if (el.querySelector("nav, header, footer")) continue;
      const text = tidy(el.textContent ?? "");
      if (text.length > best.length && text.length < 4e4) best = text;
    }
    if (best.length > 400) {
      jdText = best;
      source = "largest-block";
    } else {
      const body = tidy(((_a = document.body) == null ? void 0 : _a.innerText) ?? "");
      if (body.length > 400) {
        jdText = body;
        source = "body";
      }
    }
  }
  if (!role || !company) {
    const title = document.title ?? "";
    const at = title.split(/\s+at\s+/i);
    if (at.length === 2) {
      role = role ?? clean(at[0]);
      company = company ?? clean(at[1].split(/[|—–-]/)[0]);
    } else {
      const parts = title.split(/\s*[|—–]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        role = role ?? clean(parts[0]);
        company = company ?? clean(parts[parts.length - 1]);
      } else {
        role = role ?? clean(title);
      }
    }
  }
  return {
    role,
    company,
    location,
    jdText: jdText.slice(0, 6e4),
    url: location_href(),
    source
  };
  function location_href() {
    try {
      return window.location.href;
    } catch {
      return null;
    }
  }
}
async function captureActiveTabJd() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!(tab == null ? void 0 : tab.id) || !tab.url || !/^https?:/.test(tab.url)) {
    throw new Error("Open the job posting in the active tab first.");
  }
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [0] },
    func: captureInPage
  });
  const captured = injection == null ? void 0 : injection.result;
  if (!captured) throw new Error("Could not read that page.");
  return captured;
}
function toRequest(captured, overrides = {}) {
  const role = (overrides.role ?? captured.role ?? "").trim();
  const jdText = (overrides.jdText ?? captured.jdText ?? "").trim();
  if (role.length < 2) return { problem: "No job title found — type one in before running." };
  if (jdText.length < 200) {
    return {
      problem: captured.source === "none" ? "No job description found on this page — paste it in instead." : `Only ${jdText.length} characters captured (from ${captured.source}) — that is page chrome, not a posting. Paste the description instead.`
    };
  }
  return {
    request: {
      role,
      company: overrides.company ?? captured.company,
      location: overrides.location ?? captured.location,
      jdText,
      url: overrides.url ?? captured.url,
      source: "extension",
      ...overrides.options ? { options: overrides.options } : {}
    }
  };
}
const APPLICATIONS_KEY = "flashfiller_applications_v1";
const SESSION_CAPTURE_KEY = "flashfiller_tailor_session_v1";
const SESSION_CAPTURE_MAX_AGE_MS = 12 * 60 * 60 * 1e3;
const STATUS_ORDER = [
  "queued",
  "drafted",
  "filled",
  "review",
  "submitted",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn"
];
const USER_STATUSES = ["review", "submitted", "screening", "interview", "offer", "rejected", "withdrawn"];
function isRecord(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw;
  return typeof r.jobId === "string" && typeof r.status === "string" && typeof r.updatedAt === "number";
}
async function readEnvelope() {
  try {
    const result = await chrome.storage.local.get(APPLICATIONS_KEY);
    const raw = result[APPLICATIONS_KEY];
    const byJob = {};
    for (const [k, v] of Object.entries((raw == null ? void 0 : raw.byJob) ?? {})) if (isRecord(v)) byJob[k] = v;
    return { schemaVersion: 1, byJob };
  } catch {
    return { schemaVersion: 1, byJob: {} };
  }
}
async function writeEnvelope(env) {
  await chrome.storage.local.set({ [APPLICATIONS_KEY]: env });
}
async function getApplication(jobId) {
  return (await readEnvelope()).byJob[jobId] ?? null;
}
function statusRank(status) {
  const i = STATUS_ORDER.indexOf(status);
  return i < 0 ? 0 : i;
}
function nextStatus(current, wanted, explicit) {
  if (explicit || !current) return wanted;
  return statusRank(wanted) > statusRank(current) ? wanted : current;
}
function fillStatsFromReport(report) {
  const s = report.summary;
  const documents = report.entries.filter((e) => String(e.kind).toLowerCase().includes("file") && typeof e.actual === "string" && e.actual.trim()).map((e) => e.actual.trim());
  return {
    total: report.entries.length,
    filled: s.ok,
    left: s.missingAnswerable + s.missingUnanswered,
    wrong: s.wrong,
    missing_answerable: s.missingAnswerable,
    missing_unanswered: s.missingUnanswered,
    skipped: s.skipped,
    documents,
    validated_at: new Date(report.at).toISOString(),
    url: report.url
  };
}
async function remoteRecord(jobId) {
  try {
    const rows = await hubQuery("applications", { job_id: `eq.${jobId}`, surface: "eq.extension" });
    const row = Array.isArray(rows) ? rows[0] : void 0;
    if (!row || typeof row.status !== "string") return null;
    return {
      jobId,
      status: row.status,
      submittedAt: row.submitted_at ?? null,
      appliedUrl: row.applied_url ?? null,
      resumeDocumentId: row.resume_document_id ?? null,
      coverLetterDocumentId: row.cover_letter_document_id ?? null,
      fillStats: row.fill_stats ?? null,
      updatedAt: Date.now(),
      lastOutcome: "sent"
    };
  } catch {
    return null;
  }
}
function hubRow(rec, withStatus) {
  const row = { job_id: rec.jobId, surface: "extension" };
  if (withStatus) row.status = rec.status;
  if (rec.appliedUrl) row.applied_url = rec.appliedUrl;
  if (rec.resumeDocumentId) row.resume_document_id = rec.resumeDocumentId;
  if (rec.coverLetterDocumentId) row.cover_letter_document_id = rec.coverLetterDocumentId;
  if (rec.fillStats) row.fill_stats = rec.fillStats;
  if (rec.submittedAt) row.submitted_at = rec.submittedAt;
  return row;
}
let chain = Promise.resolve();
function enqueue(work) {
  const run = chain.then(work, work);
  chain = run.then(() => void 0, () => void 0);
  return run;
}
function recordApplication(event) {
  return enqueue(() => recordNow(event));
}
async function recordNow(event) {
  var _a;
  let rec = { jobId: event.jobId, status: "queued", updatedAt: 0 };
  try {
    const env = await readEnvelope();
    const prev = env.byJob[event.jobId] ?? await remoteRecord(event.jobId);
    if (prev) rec = { ...prev };
    switch (event.kind) {
      case "drafted":
        rec.status = nextStatus(prev == null ? void 0 : prev.status, "drafted", false);
        if (event.resumeDocumentId) rec.resumeDocumentId = event.resumeDocumentId;
        if (event.coverLetterDocumentId) rec.coverLetterDocumentId = event.coverLetterDocumentId;
        if (event.title) rec.title = event.title;
        if (event.company) rec.company = event.company;
        break;
      case "cover_letter":
        if (event.coverLetterDocumentId) rec.coverLetterDocumentId = event.coverLetterDocumentId;
        break;
      case "filled":
        rec.status = nextStatus(prev == null ? void 0 : prev.status, "filled", false);
        rec.fillStats = event.fillStats;
        rec.appliedUrl = event.appliedUrl;
        break;
      case "status":
        rec.status = nextStatus(prev == null ? void 0 : prev.status, event.status, true);
        if (event.status === "submitted") rec.submittedAt = event.submittedAt ?? (/* @__PURE__ */ new Date()).toISOString();
        break;
    }
    const withStatus = !prev || rec.status !== prev.status || event.kind === "status";
    rec.updatedAt = Date.now();
    env.byJob[event.jobId] = rec;
    await writeEnvelope(env);
    let outcome;
    try {
      const ref = await hubUpsert("applications", hubRow(rec, withStatus), void 0, { flush: false });
      const report = await flushHubOutbox();
      const stored = (_a = report.rows) == null ? void 0 : _a[ref];
      if (stored) {
        outcome = { status: "sent", note: `Application logged (${rec.status}).`, record: rec };
      } else {
        const dead = (await getHubDeadLetters()).find((d) => d.ref === ref);
        outcome = dead ? { status: "dead", note: `Application not logged — refused by the hub — ${dead.lastError ?? "unknown"}`, record: rec } : { status: "queued", note: `Application ${rec.status} — queued for the hub (${report.reason ?? "not reachable"}).`, record: rec };
      }
    } catch (e) {
      outcome = { status: "error", note: `Application ${rec.status} kept locally, not sent — ${e instanceof Error ? e.message : String(e)}`, record: rec };
    }
    rec.lastOutcome = outcome.status;
    env.byJob[event.jobId] = rec;
    await writeEnvelope(env);
    return outcome;
  } catch (e) {
    return { status: "error", note: `Application not logged — ${e instanceof Error ? e.message : String(e)}`, record: rec };
  }
}
function recordFilled(jobId, report) {
  return enqueue(async () => {
    var _a;
    const stats = fillStatsFromReport(report);
    const prev = (await readEnvelope()).byJob[jobId];
    if (((_a = prev == null ? void 0 : prev.fillStats) == null ? void 0 : _a.validated_at) === stats.validated_at && prev.fillStats.url === stats.url) return null;
    return recordNow({ kind: "filled", jobId, fillStats: stats, appliedUrl: report.url });
  });
}
function markSubmitted(jobId, when = /* @__PURE__ */ new Date()) {
  return recordApplication({ kind: "status", jobId, status: "submitted", submittedAt: when.toISOString() });
}
function setApplicationStatus(jobId, status) {
  if (status === "submitted") return markSubmitted(jobId);
  return recordApplication({ kind: "status", jobId, status });
}
async function activeTabUrl() {
  var _a;
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = (_a = tabs[0]) == null ? void 0 : _a.url;
    return typeof url === "string" && /^https?:/i.test(url) ? url : null;
  } catch {
    return null;
  }
}
function hostOf(url) {
  try {
    return url ? new URL(url).hostname.toLowerCase() : "";
  } catch {
    return "";
  }
}
const TENANT_VENDORS = ["myworkdayjobs.com", "myworkdaysite.com", "icims.com", "taleo.net", "bamboohr.com", "eightfold.ai", "oraclecloud.com"];
const SHARED_HOSTS = [
  "linkedin.com",
  "greenhouse.io",
  "lever.co",
  "smartrecruiters.com",
  "ashbyhq.com",
  "jobvite.com",
  "workable.com",
  "successfactors.com",
  "ultipro.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com"
];
const TWO_LABEL_SUFFIXES = /* @__PURE__ */ new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "co.in",
  "co.jp",
  "co.kr",
  "com.br",
  "com.mx",
  "com.sg",
  "com.hk",
  "co.za",
  "com.ar",
  "com.tr",
  "co.il",
  "com.my",
  "com.ph",
  "com.cn",
  "com.tw"
]);
function underVendor(host, vendors) {
  return vendors.find((v) => host === v || host.endsWith("." + v)) ?? null;
}
function siteIdentity(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  if (!host) return null;
  const shared = underVendor(host, SHARED_HOSTS);
  if (shared) return { kind: "shared", host };
  const vendor = underVendor(host, TENANT_VENDORS);
  if (vendor) {
    const tenant = host === vendor ? "" : host.slice(0, -(vendor.length + 1)).split(".")[0];
    return tenant ? { kind: "tenant", vendor, tenant } : { kind: "shared", host };
  }
  const parts = host.split(".");
  const n = TWO_LABEL_SUFFIXES.has(parts.slice(-2).join(".")) ? 3 : 2;
  return { kind: "domain", domain: parts.slice(-n).join(".") };
}
function sameApplicationSite(a, b) {
  const x = siteIdentity(a);
  const y = siteIdentity(b);
  if (!x || !y) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  if (x.kind === "shared" || y.kind === "shared") return x.kind === "shared" && y.kind === "shared" && x.host === y.host;
  if (x.kind === "domain" && y.kind === "domain") return x.domain === y.domain;
  if (x.kind === "tenant" && y.kind === "tenant") return x.vendor === y.vendor && x.tenant === y.tenant;
  const domain = x.kind === "domain" ? x : y;
  const tenant = x.kind === "tenant" ? x : y;
  return domain.domain.split(".")[0] === tenant.tenant;
}
function postingIdInUrl(url) {
  if (!url) return null;
  const req = atsReqIdFromUrl(url);
  if (req) return req.toLowerCase();
  const key = urlKey(url);
  return key && key.startsWith("li:") ? key : null;
}
function knownPostingId(capture, url) {
  const req = capture == null ? void 0 : capture.atsReqId;
  if (req) return String(req).toLowerCase();
  return postingIdInUrl(capture == null ? void 0 : capture.sourceUrl) ?? postingIdInUrl(url);
}
function sessionArea() {
  const s = chrome.storage.session;
  return s ?? chrome.storage.local;
}
async function saveSessionCapture(capture, jobId, url) {
  const host = hostOf(url);
  if (!host) return;
  const entry = { capture, jobId, url, host, at: Date.now() };
  try {
    await sessionArea().set({ [SESSION_CAPTURE_KEY]: entry });
  } catch {
  }
}
async function clearSessionCapture() {
  try {
    await sessionArea().remove(SESSION_CAPTURE_KEY);
  } catch {
  }
}
async function loadSessionCapture(activeUrl, now = Date.now()) {
  try {
    const here = hostOf(activeUrl);
    if (!here) return null;
    const result = await sessionArea().get(SESSION_CAPTURE_KEY);
    const raw = result[SESSION_CAPTURE_KEY];
    if (!raw || typeof raw.url !== "string" || typeof raw.at !== "number") return null;
    if (now - raw.at > SESSION_CAPTURE_MAX_AGE_MS) return null;
    const there = typeof raw.host === "string" && raw.host || hostOf(raw.url);
    if (!there || !sameApplicationSite(here, there)) return null;
    const capture = raw.capture ?? null;
    const pageId = postingIdInUrl(activeUrl);
    const knownId = knownPostingId(capture, raw.url);
    if (pageId && knownId && pageId !== knownId) return null;
    return { capture, jobId: typeof raw.jobId === "string" ? raw.jobId : null, url: raw.url, host: there, at: raw.at };
  } catch {
    return null;
  }
}
function linkForPage(activeUrl, session) {
  if (!(session == null ? void 0 : session.jobId)) return { jobId: null, confidence: "none" };
  const pageId = postingIdInUrl(activeUrl);
  const knownId = knownPostingId(session.capture, session.url);
  if (pageId && knownId) {
    return pageId === knownId ? { jobId: session.jobId, confidence: "ats" } : { jobId: null, confidence: "none" };
  }
  return { jobId: session.jobId, confidence: "session" };
}
async function reportForPage(url, session = null, now = Date.now()) {
  if (!url) return null;
  const reports = await loadValidationReports();
  const exact = reports.find((r) => r.url === url);
  if (exact) return exact;
  const host = hostOf(url);
  if (!host) return null;
  const knownId = session ? knownPostingId(session.capture, session.url) : null;
  const onSite = reports.filter((r) => {
    if (now - r.at > SESSION_CAPTURE_MAX_AGE_MS) return false;
    const rh = hostOf(r.url);
    if (!rh || !sameApplicationSite(host, rh)) return false;
    const rid = postingIdInUrl(r.url);
    return !(rid && knownId && rid !== knownId);
  });
  onSite.sort((a, b) => b.at - a.at);
  return onSite[0] ?? null;
}
function ApplicationPanel({ jobId, title, company }) {
  const [app, setApp] = reactExports.useState(null);
  const [pageUrl, setPageUrl] = reactExports.useState(null);
  const [confidence, setConfidence] = reactExports.useState("none");
  const [note, setNote] = reactExports.useState(null);
  const [busy, setBusy] = reactExports.useState(false);
  reactExports.useEffect(() => {
    let alive = true;
    const refresh = async () => {
      if (!jobId) {
        setApp(null);
        return;
      }
      const url = await activeTabUrl();
      const session = await loadSessionCapture(url);
      const link = (session == null ? void 0 : session.jobId) === jobId ? linkForPage(url, session).confidence : "none";
      let latest = null;
      if (link !== "none") {
        const report = await reportForPage(url, session);
        if (report) {
          const out = await recordFilled(jobId, report);
          if (out) latest = out.note;
        }
      }
      const rec = await getApplication(jobId);
      if (!alive) return;
      setPageUrl(url);
      setConfidence(link);
      if (latest) setNote(latest);
      setApp(rec);
    };
    void refresh().catch((e) => {
      if (alive) setNote(`Application panel: ${e instanceof Error ? e.message : String(e)}`);
    });
    return () => {
      alive = false;
    };
  }, [jobId]);
  if (!jobId) return null;
  const label = `${title ?? "this job"}${company ? ` @ ${company}` : ""}`;
  const current = (app == null ? void 0 : app.status) ?? "queued";
  const apply = async (work) => {
    setBusy(true);
    try {
      const out = await work();
      setNote(out.note);
      setApp(out.record);
    } catch (e) {
      setNote(`Not logged — ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };
  const submitted = () => {
    const ok = confirm(`Log "${label}" as submitted?

Only you know it went in — nothing here submits or checks the page. The time you press OK becomes submitted_at.`);
    if (!ok) return;
    void apply(() => markSubmitted(jobId));
  };
  const choose = (status) => {
    if (status === current) return;
    if (status === "submitted") {
      submitted();
      return;
    }
    void apply(() => setApplicationStatus(jobId, status));
  };
  const fs = app == null ? void 0 : app.fillStats;
  const options = [current, ...USER_STATUSES].filter((s, i, a) => a.indexOf(s) === i);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 8 }, "data-testid": "application-panel", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Application" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", title: "The application log's status for this job", children: app ? app.status : "not logged yet" }),
      (app == null ? void 0 : app.submittedAt) && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
        "submitted ",
        new Date(app.submittedAt).toLocaleString()
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { flex: 1 } }),
      current !== "submitted" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn small primary",
          disabled: busy,
          onClick: submitted,
          title: "Only you can say this — nothing is submitted or checked for you",
          children: "I submitted"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
      label,
      confidence === "ats" ? " · this page" : confidence === "session" ? " · the posting you last read" : ""
    ] }),
    pageUrl && confidence === "none" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "This page is not that posting — its fill is not logged here." }),
    fs ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
      "Fill: ",
      fs.filled,
      " filled · ",
      fs.left,
      " left for you · ",
      fs.wrong,
      " to check",
      fs.documents.length ? ` · handed: ${fs.documents.join(", ")}` : "",
      " · ",
      new Date(fs.validated_at).toLocaleTimeString()
    ] }) : pageUrl && confidence !== "none" ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "No fill recorded on this page yet — Scan this page, then Validate, and reopen." }) : null,
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "sub", style: { display: "flex", gap: 6, alignItems: "center", marginTop: 4 }, children: [
      "Status",
      /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: current, disabled: busy, onChange: (e) => choose(e.target.value), children: options.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s }, s)) })
    ] }),
    note && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: note })
  ] });
}
function costLabel(usd) {
  return `$${usd.toFixed(2)}`;
}
const OVER = { borderColor: "var(--danger)", boxShadow: "0 0 0 1px var(--danger)" };
const OK_CHIP = {
  background: "rgba(16,185,129,0.15)",
  color: "var(--ok)",
  border: "1px solid rgba(16,185,129,0.3)",
  textShadow: "none"
};
function buildEdits(result, editSummary, editSkills, editBullets, editHidden, onlyChanged) {
  const edits = {};
  const summaryNow = editSummary.trim();
  if (summaryNow && (!onlyChanged || summaryNow !== (result.summary ?? "").trim())) edits.summary = summaryNow;
  const skillsNow = editSkills.map((s) => ({ category: s.category.trim(), skills: s.skills.trim() })).filter((s) => s.category && s.skills);
  const skillsWere = (result.skills ?? []).map((s) => ({ category: s.category.trim(), skills: s.skills.trim() }));
  if (skillsNow.length && (!onlyChanged || JSON.stringify(skillsNow) !== JSON.stringify(skillsWere))) {
    edits.skills = skillsNow;
  }
  const bulletEdits = result.bullets.map((b) => ({ slot: b.slot, text: (editBullets[b.slot] ?? b.text).trim() })).filter((e) => {
    var _a;
    return e.text && (!onlyChanged || e.text !== (((_a = result.bullets.find((b) => b.slot === e.slot)) == null ? void 0 : _a.text) ?? "").trim());
  });
  if (bulletEdits.length) edits.bullets = bulletEdits;
  if (editHidden !== null && (result.engine === "v6" || result.engine === "v7")) {
    const hiddenNow = editHidden.split(",").map((t) => t.trim()).filter(Boolean).join(", ");
    if (!onlyChanged || hiddenNow !== (result.hiddenKeywords ?? "").trim()) edits.hiddenKeywords = hiddenNow;
  }
  return edits;
}
function counterText(m, chars, maxChars, lineRule) {
  const cap = maxChars ? `${chars}/${maxChars} chars` : `${chars} chars`;
  if (!m) return `${cap} · ${lineRule}`;
  const lines = `${m.lines} line${m.lines === 1 ? "" : "s"}`;
  return m.ok ? `${cap} · ${lines} ✓` : `${cap} · ${lines} — ${m.message ?? "over the limit"}`;
}
function confidenceChip(b) {
  switch (b.confidence) {
    case "verified":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip", style: OK_CHIP, title: "Every cited fact is verified", children: "verified" });
    case "confirm":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip warn-chip", title: (b.askAishwar ?? []).join("\n") || "A number Aishwar has not confirmed", children: "confirm number" });
    case "framing":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip warn-chip", title: (b.askAishwar ?? []).join("\n") || "Rests on a lens angle Aishwar has not confirmed", children: "ask Aishwar" });
    case "adjacent":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", title: "Rests on an adjacent fact — claim level capped", children: "adjacent" });
    case "unsupported":
      return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip warn-chip", title: "No fact cited", children: "no fact cited" });
    default:
      return null;
  }
}
function TailorTab() {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  const [health, setHealth] = reactExports.useState(null);
  const [checking, setChecking] = reactExports.useState(true);
  const [token, setToken] = reactExports.useState("");
  const [baseUrl, setBaseUrl] = reactExports.useState(TAILOR_BASE_URL);
  const [tokenSaved, setTokenSaved] = reactExports.useState(false);
  const [urlError, setUrlError] = reactExports.useState(null);
  const [captured, setCaptured] = reactExports.useState(null);
  const [jobCapture, setJobCapture] = reactExports.useState(null);
  const [role, setRole] = reactExports.useState("");
  const [company, setCompany] = reactExports.useState("");
  const [postingUrl, setPostingUrl] = reactExports.useState("");
  const [jdText, setJdText] = reactExports.useState("");
  const [recents, setRecents] = reactExports.useState([]);
  const [job, setJob] = reactExports.useState(null);
  const [result, setResult] = reactExports.useState(null);
  const [error, setError] = reactExports.useState(null);
  const [status, setStatus] = reactExports.useState(null);
  const [running, setRunning] = reactExports.useState(false);
  const [makeDefault, setMakeDefault] = reactExports.useState(true);
  const [showToken, setShowToken] = reactExports.useState(false);
  const abort = reactExports.useRef(null);
  const [engine, setEngine] = reactExports.useState("v6");
  const [domain, setDomain] = reactExports.useState("");
  const [preset, setPreset] = reactExports.useState({});
  const recordedJobId = reactExports.useRef(null);
  const [sessionJobId, setSessionJobId] = reactExports.useState(null);
  const [families, setFamilies] = reactExports.useState([]);
  const [redraftDomain, setRedraftDomain] = reactExports.useState("");
  const [lastDryRun, setLastDryRun] = reactExports.useState(false);
  const [editSummary, setEditSummary] = reactExports.useState("");
  const [editSkills, setEditSkills] = reactExports.useState([]);
  const [editBullets, setEditBullets] = reactExports.useState({});
  const [editHidden, setEditHidden] = reactExports.useState(null);
  const [finalizing, setFinalizing] = reactExports.useState(false);
  const [measured, setMeasured] = reactExports.useState({});
  const [measureError, setMeasureError] = reactExports.useState(null);
  const [violations, setViolations] = reactExports.useState([]);
  const [letterBusy, setLetterBusy] = reactExports.useState(false);
  const [letterStatus, setLetterStatus] = reactExports.useState(null);
  const beginReview = (r, restoreSaved = true) => {
    var _a2;
    setEditSummary(r.summary ?? "");
    setEditSkills((r.skills ?? []).map((s) => ({ category: s.category, skills: s.skills })));
    setEditBullets(Object.fromEntries(r.bullets.map((b) => [b.slot, b.text])));
    setEditHidden(r.engine === "v6" ? r.hiddenKeywords ?? "" : null);
    setMeasured({});
    setViolations([]);
    setRedraftDomain(((_a2 = r.domain) == null ? void 0 : _a2.id) ?? "");
    if (!restoreSaved) return;
    void getDraftEdits(r.jobId).then((saved) => {
      if (!saved) return;
      setEditSummary(saved.summary);
      setEditSkills(saved.skills);
      setEditBullets(saved.bullets);
      if (r.engine === "v6") setEditHidden(saved.hidden);
    });
  };
  const isV6Draft = !!result && !lastDryRun && !result.finalized && (result.engine === "v6" || result.engine === "v7");
  reactExports.useEffect(() => {
    if (!isV6Draft || !result) return;
    const handle = setTimeout(() => {
      void saveDraftEdits({
        jobId: result.jobId,
        summary: editSummary,
        skills: editSkills,
        bullets: editBullets,
        hidden: editHidden,
        savedAt: Date.now()
      });
      const body = buildEdits(result, editSummary, editSkills, editBullets, editHidden, false);
      measureEdits(result.jobId, body).then((m) => {
        setMeasured(Object.fromEntries(m.items.map((i) => [i.id, i])));
        setMeasureError(null);
      }).catch((e) => setMeasureError(e instanceof Error ? e.message : String(e)));
    }, 350);
    return () => clearTimeout(handle);
  }, [isV6Draft, result == null ? void 0 : result.jobId, editSummary, editSkills, editBullets, editHidden]);
  const overLimit = Object.values(measured).filter((m) => !m.ok);
  const loadFamilies = async () => {
    try {
      setFamilies(await listFamilies());
    } catch {
      setFamilies([]);
    }
  };
  const refreshHealth = async () => {
    setChecking(true);
    try {
      setHealth(await checkHealth());
      setError(null);
    } catch (e) {
      setHealth(null);
      setError(e instanceof Error ? e.message : String(e));
    }
    setChecking(false);
  };
  reactExports.useEffect(() => {
    void getTailorConfig().then((c) => {
      setToken(c.token);
      setBaseUrl(c.baseUrl);
      setEngine(c.engine);
      setDomain(c.domain);
      setPreset(c.engine === "v7" ? { mode: c.mode, writerModel: c.mode === "full" ? c.writerModel ?? "claude-sonnet-4-6" : null, extractorModel: c.extractorModel } : { writerModel: c.writerModel, extractorModel: c.extractorModel });
    });
    void activeTabUrl().then((url) => loadSessionCapture(url)).then((session) => {
      var _a2;
      if (!session || recordedJobId.current) return;
      setJobCapture(session.capture);
      if ((_a2 = session.capture) == null ? void 0 : _a2.sourceUrl) setPostingUrl(session.capture.sourceUrl);
      recordedJobId.current = session.jobId;
      setSessionJobId(session.jobId);
    });
    void refreshHealth();
    return () => {
      var _a2;
      return (_a2 = abort.current) == null ? void 0 : _a2.abort();
    };
  }, []);
  reactExports.useEffect(() => {
    if (health && token && (engine === "v6" || engine === "v7") && families.length === 0) void loadFamilies();
  }, [health, token, engine]);
  reactExports.useEffect(() => {
    let alive = true;
    void loadTailorEntries().then((list) => {
      if (alive) setRecents(list);
    });
    return () => {
      alive = false;
    };
  }, []);
  reactExports.useEffect(() => {
    void (async () => {
      const rec = await getActiveRun();
      if (!rec) return;
      setRole((v) => v || rec.role);
      setCompany((v) => v || (rec.company ?? ""));
      setJdText((v) => v || rec.jdText);
      let current;
      try {
        current = await getJob(rec.jobId);
      } catch (e) {
        if (isUnknownJobError(e)) void clearActiveRun();
        else if (!(e instanceof TailorOfflineError)) setError(e instanceof Error ? e.message : String(e));
        return;
      }
      setJob(current);
      setLastDryRun(false);
      const adoptDone = (r) => {
        setResult(r);
        if (!r.finalized) beginReview(r);
        setStatus(r.finalized ? "Picked your approved résumé back up — it survived the popup closing." : "The draft finished while the popup was closed — review below, then approve.");
        if (r.coverLetterStatus === "running") {
          setLetterBusy(true);
          void pollCoverLetter(rec.jobId, (j) => {
            if (j.result) setResult(j.result);
          }).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLetterBusy(false));
        }
      };
      if (current.status === "queued" || current.status === "running") {
        setRunning(true);
        setStatus(`Reattached to the run started at ${new Date(rec.startedAt).toLocaleTimeString()} — still drafting.`);
        abort.current = new AbortController();
        try {
          const finished = await pollUntilDone(rec.jobId, setJob, { signal: abort.current.signal });
          if (finished.status === "done" && finished.result) {
            setResult(finished.result);
            if (!finished.result.finalized) beginReview(finished.result);
            setStatus(`Draft ready — ${costLabel(finished.costUsd ?? 0)} spent. Review below, then approve.`);
          } else if (finished.status === "failed") {
            setError(finished.error ?? "The run failed.");
            void clearActiveRun();
          } else if (finished.status === "cancelled") {
            setStatus("That run was cancelled.");
            void clearActiveRun();
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
        setRunning(false);
      } else if (current.status === "done" && current.result) {
        adoptDone(current.result);
      } else if (current.status === "failed") {
        setError(current.error ?? "The run failed while the popup was closed.");
        void clearActiveRun();
      } else {
        void clearActiveRun();
      }
    })();
  }, []);
  const chooseEngine = async (next) => {
    setEngine(next);
    setPreset({});
    setDomain("");
    await setTailorConfig({ engine: next, domain: "", mode: "skills", writerModel: null, extractorModel: null }).catch(() => null);
  };
  const choosePreset = async (id) => {
    var _a2;
    const next = ((_a2 = (engine === "v7" ? V7_PRESETS : V6_PRESETS).find((p) => p.id === id)) == null ? void 0 : _a2.preset) ?? {};
    setPreset(next);
    await setTailorConfig({ mode: next.mode ?? "skills", writerModel: next.writerModel ?? null, extractorModel: next.extractorModel ?? null }).catch(() => null);
  };
  const chooseDomain = async (next) => {
    setDomain(next);
    await setTailorConfig({ domain: next }).catch(() => null);
  };
  const saveService = async () => {
    setUrlError(null);
    try {
      await setTailorConfig({ baseUrl: baseUrl.trim(), token: token.trim() });
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : String(e));
      return;
    }
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 3e3);
    await refreshHealth();
  };
  const serviceFields = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", style: { display: "block", marginTop: 8 }, children: [
      "Service address",
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "text",
          placeholder: TAILOR_BASE_URL,
          value: baseUrl,
          onChange: (e) => setBaseUrl(e.target.value),
          spellCheck: false,
          autoComplete: "off",
          autoCapitalize: "off",
          autoCorrect: "off"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
        "Loopback, LAN or tailnet only — ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "127.0.0.1" }),
        ", ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "192.168.x.x" }),
        ",",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "10.x.x.x" }),
        ", ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "100.64–127.x.x" }),
        " or a ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: ".ts.net" }),
        " name. Public addresses are refused."
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", style: { display: "block", marginTop: 6 }, children: [
      "Service token",
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          type: "password",
          placeholder: "from `make serve`",
          value: token,
          onChange: (e) => setToken(e.target.value),
          autoComplete: "off",
          autoCapitalize: "off",
          autoCorrect: "off",
          spellCheck: false
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small primary", onClick: () => void saveService(), children: "Save" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => void refreshHealth(), children: "Test connection" })
    ] }),
    urlError && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note warn", style: { marginTop: 8 }, children: urlError }),
    tokenSaved && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { marginTop: 6 }, children: "Saved." })
  ] });
  const capture = async () => {
    var _a2, _b2, _c2;
    setError(null);
    try {
      const cap = await captureActiveTabJd();
      setCaptured(cap);
      setRole(cap.role ?? "");
      setCompany(cap.company ?? "");
      setPostingUrl(cap.url ?? "");
      setJdText(cap.jdText);
      setStatus(
        cap.jdText.length > 200 ? `Captured ${cap.jdText.length.toLocaleString()} characters (${cap.source}).` : "Could not find a description on that page — paste it below."
      );
      const rec = await recordActiveTabJob();
      setJobCapture(rec.capture ?? null);
      recordedJobId.current = rec.jobId ?? null;
      setSessionJobId(rec.jobId ?? null);
      void activeTabUrl().then((url) => {
        var _a3;
        return saveSessionCapture(rec.capture ?? null, rec.jobId ?? null, ((_a3 = rec.capture) == null ? void 0 : _a3.sourceUrl) ?? url);
      });
      if ((_a2 = rec.capture) == null ? void 0 : _a2.title) setRole(rec.capture.title);
      if ((_b2 = rec.capture) == null ? void 0 : _b2.company) setCompany(rec.capture.company);
      if ((_c2 = rec.capture) == null ? void 0 : _c2.sourceUrl) setPostingUrl(rec.capture.sourceUrl);
      setStatus((s) => s ? `${s} ${rec.note}` : rec.note);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setTimeout(() => setStatus(null), 6e3);
  };
  const run = async (dryRun) => {
    var _a2;
    setError(null);
    setResult(null);
    setJob(null);
    const built = toRequest(
      captured ?? { role: null, company: null, location: null, jdText: "", url: null, source: "none" },
      { role, company, jdText, url: postingUrl.trim() || null }
    );
    if ("problem" in built) {
      setError(built.problem);
      return;
    }
    if (company.trim().length < 2) {
      setError("404: Company not found in preflight — type the company name first.");
      return;
    }
    const lensNote = engine === "v6" || engine === "v7" ? domain ? `
Lens: ${((_a2 = families.find((f) => f.id === domain)) == null ? void 0 : _a2.name) ?? domain} (fixed).` : "\nLens: the router reads the title and duties and picks the role family." : "";
    if (!dryRun) {
      const ok = confirm(
        `Generate a tailored résumé draft for "${built.request.role}"?

Engine ${engine} against your Anthropic key — roughly ${costLabel(estimateCostUsd(engine, preset))}, a few minutes. The budget ceiling stops it going further.${lensNote}

You review and approve the draft before any document is rendered.`
      );
      if (!ok) return;
    }
    setRunning(true);
    setLastDryRun(dryRun);
    abort.current = new AbortController();
    try {
      const rec = await recordFormJob(jobCapture, { title: built.request.role, company: company.trim(), description: built.request.jdText, url: built.request.url });
      setStatus(rec.note);
      const jobIdNow = rec.jobId ?? null;
      recordedJobId.current = jobIdNow;
      setSessionJobId(jobIdNow);
      if (jobCapture) void activeTabUrl().then((url) => saveSessionCapture(jobCapture, jobIdNow, jobCapture.sourceUrl ?? url));
      else void clearSessionCapture();
      const started = await startTailor({
        ...built.request,
        // renderDocx:false = draft mode — the document is rendered by
        // /finalize only after the user approves (possibly edited) sections.
        options: {
          ...built.request.options ?? {},
          dryRun,
          renderDocx: false,
          engine,
          ...(engine === "v6" || engine === "v7") && domain ? { domain } : {},
          // Stage 5: the mode, the model preset and the jobs row the résumé is for
          ...engine === "v7" ? { mode: preset.mode ?? "skills" } : {},
          ...preset.writerModel ? { writerModel: preset.writerModel } : {},
          ...preset.extractorModel ? { extractorModel: preset.extractorModel } : {},
          ...jobIdNow ? { jobId: jobIdNow } : {}
        }
      });
      setJob(started);
      void rememberTailorEntry({
        company: built.request.company ?? company,
        role: built.request.role,
        jdText: built.request.jdText,
        url: built.request.url ?? "",
        engine,
        domain: engine === "v6" || engine === "v7" ? domain : ""
      }).then(setRecents);
      if (!dryRun) {
        void clearDraftEdits();
        void saveActiveRun({
          jobId: started.jobId,
          role: built.request.role,
          company: built.request.company ?? null,
          jdText: built.request.jdText,
          engine,
          domain: engine === "v6" || engine === "v7" ? domain : "",
          startedAt: Date.now()
        });
      }
      const finished = await pollUntilDone(started.jobId, setJob, { signal: abort.current.signal });
      if (finished.status === "done" && finished.result) {
        setResult(finished.result);
        if (!dryRun && !finished.result.finalized) beginReview(finished.result);
        setStatus(dryRun ? `Preflight complete. ${rec.note}` : `Draft ready — ${costLabel(finished.costUsd ?? 0)} spent. Review below, then approve.`);
      } else if (finished.status === "failed") {
        setError(finished.error ?? "The run failed.");
      } else if (finished.status === "cancelled") {
        setStatus("Run cancelled.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setRunning(false);
  };
  const stop = async () => {
    var _a2;
    if (job) await cancelJob(job.jobId).catch(() => null);
    (_a2 = abort.current) == null ? void 0 : _a2.abort();
    setRunning(false);
    void clearActiveRun();
  };
  const redraft = async () => {
    var _a2;
    if (!result || !redraftDomain) return;
    if (jdText.trim().length < 200) {
      setError("The job description is no longer in the box above — paste it back before re-drafting.");
      return;
    }
    const fam = families.find((f) => f.id === redraftDomain);
    const ok = confirm(
      `Re-draft "${result.role}" with the ${(fam == null ? void 0 : fam.name) ?? redraftDomain} lens?

Reuses this run's keyword extraction — roughly ${costLabel(estimateRedraftCostUsd(preset))}${preset.writerModel ? ` (${preset.writerModel} writer)` : ""}. The current draft stays in its run folder (${result.runDir ?? "runs"}).`
    );
    if (!ok) return;
    setError(null);
    setRunning(true);
    setLastDryRun(false);
    abort.current = new AbortController();
    try {
      const started = await startTailor({
        role: result.role,
        company: result.company ?? null,
        jdText,
        source: "extension",
        options: {
          renderDocx: false,
          engine: "v6",
          domain: redraftDomain,
          extractFrom: result.runDir ?? null,
          ...preset.writerModel ? { writerModel: preset.writerModel } : {},
          ...recordedJobId.current ? { jobId: recordedJobId.current } : {}
        }
      });
      setJob(started);
      void clearDraftEdits();
      void saveActiveRun({
        jobId: started.jobId,
        role: result.role,
        company: result.company ?? null,
        jdText,
        engine: "v6",
        domain: redraftDomain,
        startedAt: Date.now()
      });
      const finished = await pollUntilDone(started.jobId, setJob, { signal: abort.current.signal });
      if (finished.status === "done" && finished.result) {
        setResult(finished.result);
        beginReview(finished.result);
        setStatus(`Re-drafted with the ${((_a2 = finished.result.domain) == null ? void 0 : _a2.name) ?? redraftDomain} lens — ${costLabel(finished.costUsd ?? 0)} spent.`);
      } else if (finished.status === "failed") {
        setError(finished.error ?? "The re-draft failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setRunning(false);
  };
  const save = async () => {
    if (!result) return;
    try {
      const saved = await saveResultAsDocument(result, { makeDefault });
      setStatus(
        makeDefault ? `Saved "${saved.name}" and starred it — this is the résumé that will attach next.` : `Saved "${saved.name}". Another résumé is still starred, so star this one in Documents if you want it attached instead.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const approve = async () => {
    var _a2;
    if (!result) return;
    setFinalizing(true);
    setError(null);
    setViolations([]);
    try {
      const edits = buildEdits(result, editSummary, editSkills, editBullets, editHidden, true);
      const finished = await finalizeJob(result.jobId, edits);
      if (finished.result) {
        setResult(finished.result);
        if (recordedJobId.current) {
          void recordApplication({
            kind: "drafted",
            jobId: recordedJobId.current,
            resumeDocumentId: finished.result.documentId ?? null,
            coverLetterDocumentId: finished.result.coverLetterDocumentId ?? null,
            title: finished.result.role,
            company: finished.result.company ?? null
          }).then((o) => setStatus((s) => s ? `${s} · ${o.note}` : o.note));
        }
        void clearDraftEdits();
        const n = (((_a2 = edits.bullets) == null ? void 0 : _a2.length) ?? 0) + (edits.summary ? 1 : 0) + (edits.skills ? 1 : 0) + (edits.hiddenKeywords !== void 0 ? 1 : 0);
        setStatus((n ? `Approved with ${n} edit${n === 1 ? "" : "s"} — résumé drafted below.` : "Approved as generated — résumé drafted below.") + (recordedJobId.current ? "" : " · Not logged as an application — this run has no jobs row (Read this page, then Preflight, next time)."));
      }
    } catch (e) {
      if (e instanceof FinalizeRejectedError) {
        setViolations(e.violations);
        setMeasured((prev) => ({ ...prev, ...Object.fromEntries(e.violations.map((v) => [v.id, v])) }));
        setError(`Not drafted — ${e.violations.map((v) => `${v.id}: ${v.message ?? "over the limit"}`).join("; ")}. Shorten the marked boxes and approve again; nothing is trimmed for you.`);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    setFinalizing(false);
  };
  const generateLetter = async () => {
    var _a2, _b2;
    if (!result) return;
    const regenerating = result.coverLetterStatus === "done";
    const ok = confirm(
      `${regenerating ? "Regenerate" : "Generate"} a cover letter for "${result.role}"?

Uses this run's analysis and your verified résumé record — roughly ${costLabel(estimateCoverLetterCostUsd())}, under a minute. The résumé is untouched.`
    );
    if (!ok) return;
    setLetterBusy(true);
    setLetterStatus(null);
    setError(null);
    try {
      await requestCoverLetter(result.jobId);
      const finished = await pollCoverLetter(
        result.jobId,
        (j) => {
          if (j.result) setResult(j.result);
        },
        { signal: ((_a2 = abort.current) == null ? void 0 : _a2.signal) ?? void 0 }
      );
      const r = finished.result;
      if ((r == null ? void 0 : r.coverLetterStatus) === "done") {
        if (recordedJobId.current && r.coverLetterDocumentId) {
          void recordApplication({ kind: "cover_letter", jobId: recordedJobId.current, coverLetterDocumentId: r.coverLetterDocumentId });
        }
        setLetterStatus(((_b2 = r.coverLetter) == null ? void 0 : _b2.needsHumanReview) ? "Cover letter drafted — the gate flagged parts of it; read before sending." : "Cover letter drafted.");
      } else if ((r == null ? void 0 : r.coverLetterStatus) === "failed") {
        setError(r.coverLetterError ?? "Cover letter generation failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLetterBusy(false);
  };
  const copyLetter = async () => {
    var _a2;
    if (!((_a2 = result == null ? void 0 : result.coverLetter) == null ? void 0 : _a2.text)) return;
    try {
      await navigator.clipboard.writeText(result.coverLetter.text);
      setLetterStatus("Letter copied to the clipboard.");
    } catch {
      setLetterStatus("Could not copy — select the text and copy it manually.");
    }
  };
  const saveLetter = async () => {
    if (!result) return;
    try {
      const saved = await saveCoverLetterAsDocument(result);
      setLetterStatus(`Saved "${saved.name}" to Documents as a cover letter — it will only ever be offered to cover-letter upload zones.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  if (!checking && !health) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Tailor" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Generates a résumé tailored to a specific posting, then drops it straight into your Documents so it attaches like any other stored résumé." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "The Tailor service isn’t running." }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", style: { marginTop: 6 }, children: [
          "Start it from the project root:",
          /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { style: { margin: "6px 0", whiteSpace: "pre-wrap" }, children: "make serve" }),
          "Nothing is sent anywhere until it is running — FlashFiller does not retry in the background."
        ] })
      ] }),
      error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note warn", style: { marginTop: 8 }, children: error }),
      serviceFields()
    ] });
  }
  const engineReady = engine === "v6" ? (health == null ? void 0 : health.v6Ready) !== false : engine === "v7" ? (health == null ? void 0 : health.v7Ready) === true : !!(health == null ? void 0 : health.vaultReady);
  const blocked = health ? !health.apiKeyPresent || !engineReady : false;
  const stage = (job == null ? void 0 : job.stage) ? STAGE_LABELS[job.stage] ?? job.stage : null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Tailor" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "Reads the posting in the active tab and drafts a summary, skills section, and STAR bullets against your vault. You review and edit the draft; only after you approve does it render the ATS-clean .docx for Documents. Never submits anything." }),
    checking && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", children: "Checking the service…" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ApplicationPanel, { jobId: sessionJobId, title: (result == null ? void 0 : result.role) ?? role, company: (result == null ? void 0 : result.company) ?? company }),
    health && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "Service connected",
          health.activeJobs ? ` · ${health.activeJobs} job running` : ""
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { flex: 1 } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => setShowToken((v) => !v), children: token ? "Change address / token" : "Set address & token" })
      ] }),
      (showToken || !token) && serviceFields(),
      !token && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", style: { marginTop: 6 }, children: [
        "Required before ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Generate" }),
        " — without it the service returns 401. It is printed when ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "make serve" }),
        " starts, and cached in",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "apps/mapper/.tailor-token" }),
        "."
      ] }),
      tokenSaved && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { marginTop: 6 }, children: "Token saved." })
    ] }),
    health && blocked && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note warn", style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Not ready to run." }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("ul", { style: { margin: "6px 0 0 16px" }, children: [
        !health.apiKeyPresent && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "ANTHROPIC_API_KEY is not set — paid runs are refused." }),
        engine === "v5" && !health.vaultReady && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: health.vaultDetail }),
        engine === "v7" && health.v7Ready !== true && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "The v7 engine is not ready on the service (main_v7, its prompt set or the master library is missing — `python3 src/v7/main_v7.py --sync-masters`)." }),
        engine === "v6" && health.v6Ready === false && /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: "The v6 engine is not ready on the service (main_v6, its prompt set or the fact bank is missing)." })
      ] })
    ] }),
    health && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "muted", style: { display: "flex", gap: 6, alignItems: "center" }, children: [
        "Engine",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: engine, onChange: (e) => void chooseEngine(e.target.value), disabled: running, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "v6", children: "v6 — two agents, one page, role-family lens" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "v7", children: "v7 — over the master library (skills ≈ $0.03 · full ≈ $0.06)" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "muted", style: { display: "flex", gap: 6, alignItems: "center" }, children: [
        "Models",
        /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: presetId(engine, preset), onChange: (e) => void choosePreset(e.target.value), disabled: running, children: (engine === "v7" ? V7_PRESETS : V6_PRESETS).map((p) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p.id, children: p.label }, p.id)) })
      ] }),
      (engine === "v6" || engine === "v7") && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "muted", style: { display: "flex", gap: 6, alignItems: "center" }, children: [
        "Lens",
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: domain, onChange: (e) => void chooseDomain(e.target.value), disabled: running, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "router picks the family" }),
          families.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: f.id, children: [
            f.id,
            " · ",
            f.name,
            engine === "v7" ? f.hasMaster ? "" : " (no master yet — nearest family used, flagged)" : f.hasProfile ? "" : " (no profile yet — generic writer)"
          ] }, f.id))
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn primary", onClick: () => void capture(), disabled: running, children: "Read this page" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn", onClick: () => void run(true), disabled: running, children: "Preflight (free)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "btn", onClick: () => void run(false), disabled: running || blocked, children: [
        "Generate — ~",
        costLabel(estimateCostUsd(engine, preset))
      ] }),
      running && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small danger", onClick: () => void stop(), children: "Stop" })
    ] }),
    status && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", style: { marginTop: 8 }, children: status }),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note warn", style: { marginTop: 8 }, children: error }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      RecentEntries,
      {
        testId: "tailor-recents",
        title: "The last 3 postings you tailored against",
        entries: recents,
        busy: running,
        busyWhy: "A run is in flight — wait for it to finish before changing the boxes.",
        hint: "Retrieve puts the company, job title and job description back in the boxes below, replacing what is there. It starts nothing and spends nothing.",
        columns: [
          { label: "Company", cell: (e) => e.company },
          { label: "Job title", cell: (e) => e.role },
          { label: "Job description", cell: (e) => e.jdText, wide: true }
        ],
        onRetrieve: (entry) => {
          setRole(entry.role);
          setCompany(entry.company);
          setPostingUrl(entry.url);
          setJdText(entry.jdText);
          setStatus(`Retrieved ${entry.role || "that posting"}${entry.company ? ` at ${entry.company}` : ""}. Nothing has been run — press Generate when you are ready.`);
        }
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 12, display: "grid", gap: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", children: [
        "Job title",
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: role, onChange: (e) => setRole(e.target.value), placeholder: "Junior Manufacturing Engineer" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", children: [
        "Company",
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: company, onChange: (e) => setCompany(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", children: [
        "Posting URL",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: postingUrl,
            onChange: (e) => setPostingUrl(e.target.value),
            placeholder: "https://… — the page this posting lives on"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", children: "Recorded on the posting's row and shown on the dashboard's Jobs page. Read this page fills it; paste it yourself when the description came from somewhere else." })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", children: [
        "Job description",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            rows: 8,
            value: jdText,
            onChange: (e) => setJdText(e.target.value),
            placeholder: "Captured from the page, or paste it here."
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
          jdText.length.toLocaleString(),
          " characters",
          (captured == null ? void 0 : captured.source) && captured.source !== "none" ? ` · via ${captured.source}` : "",
          jdText.length > 0 && jdText.length < 200 ? " · too short to run" : ""
        ] })
      ] })
    ] }),
    job && running && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("strong", { children: [
        stage ?? "Working",
        "…"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", children: [
        Math.round((job.progress ?? 0) * 100),
        "% · job ",
        job.jobId,
        job.costUsd ? ` · ${costLabel(job.costUsd)} so far` : ""
      ] })
    ] }),
    result && lastDryRun && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Preflight" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { style: { margin: "10px 0 0 18px", padding: 0 }, children: result.bullets.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { style: { marginBottom: 6 }, children: b.text }, b.slot)) })
    ] }),
    result && !lastDryRun && !result.finalized && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Review the draft" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "muted", children: [
          "· ",
          costLabel(result.costUsd),
          " spent · nothing is rendered until you approve"
        ] })
      ] }),
      isV6Draft && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: "v6" }),
          result.domain && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: result.domain.generic ? "chip warn-chip" : "chip",
              title: result.domain.reason ?? void 0,
              children: [
                result.domain.generic ? "generic writer — no lens profile yet" : `lens · ${result.domain.name ?? result.domain.slug}`,
                result.domain.subCategory ? ` · ${result.domain.subCategory}` : "",
                result.domain.fixed ? " · fixed" : " · router"
              ]
            }
          ),
          ((_a = result.domain) == null ? void 0 : _a.fixed) && result.domain.routerId && result.domain.routerId !== result.domain.id && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip gray", title: "The router read the title and duties and would have chosen this family", children: [
            "router preferred ",
            result.domain.routerName ?? result.domain.routerId
          ] }),
          result.pageFit && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "span",
            {
              className: result.pageFit.fits ? "chip" : "chip warn-chip",
              style: result.pageFit.fits ? OK_CHIP : void 0,
              title: result.pageFit.steps.length ? `Fit steps: ${result.pageFit.steps.join("; ")}` : "No fit steps needed",
              children: [
                result.pageFit.fits ? "one page" : "over one page",
                result.pageFit.usedPt != null && result.pageFit.availablePt != null ? ` · ${Math.round(result.pageFit.usedPt)}/${Math.round(result.pageFit.availablePt)} pt` : ""
              ]
            }
          ),
          result.atsScore && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip gray", title: "Jobscan-style pre-score: hidden keyword block included / visible text only", children: [
            "ATS ",
            result.atsScore.parsed ?? "–",
            " parsed · ",
            result.atsScore.visible ?? "–",
            " visible"
          ] })
        ] }),
        result.pageFit && result.pageFit.steps.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", style: { marginTop: 4 }, children: [
          "Fit ladder: ",
          result.pageFit.steps.join("; "),
          "."
        ] }),
        families.length > 0 && result.engine === "v6" && /* a re-draft is v6's writer over v6's run — never offered on a v7 draft */
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
            "Re-draft with another lens (v6 writer only, ~",
            costLabel(estimateRedraftCostUsd(preset)),
            "):"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: redraftDomain, onChange: (e) => setRedraftDomain(e.target.value), disabled: running || finalizing, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "choose a family…" }),
            families.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: f.id, children: [
              f.id,
              " · ",
              f.name,
              f.hasProfile ? "" : " (generic)"
            ] }, f.id))
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "btn small",
              onClick: () => void redraft(),
              disabled: running || finalizing || !redraftDomain || redraftDomain === ((_b = result.domain) == null ? void 0 : _b.id),
              children: "Re-draft"
            }
          )
        ] })
      ] }),
      result.needsHumanReview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note warn", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "The pipeline flagged parts of this draft." }),
        " ",
        result.reviewReason ?? "Some pieces did not clear the gate.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { marginTop: 4 }, children: "Fix them here — anything you edit counts as reviewed; anything you leave keeps its ⚠." })
      ] }),
      isV6Draft && (((_c = result.setDefects) == null ? void 0 : _c.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "sub", style: { cursor: "pointer" }, children: [
          result.setDefects.length,
          " set-level note",
          result.setDefects.length === 1 ? "" : "s",
          " on the bullets as a group"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "4px 0 0 16px" }, children: result.setDefects.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "sub", children: d }, i)) })
      ] }),
      measureError && isV6Draft && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub warn", style: { marginTop: 8 }, children: [
        "Live measurement unavailable (",
        measureError,
        ") — the service still checks every box on approve."
      ] }),
      result.summary != null ? /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "label", style: { marginTop: 12, display: "block" }, children: [
        "Professional summary",
        isV6Draft && (((_d = result.summaryDefects) == null ? void 0 : _d.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "warn", title: result.summaryDefects.join("\n"), children: [
          " ⚠ ",
          result.summaryDefects.length
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            rows: 3,
            value: editSummary,
            onChange: (e) => setEditSummary(e.target.value),
            style: isV6Draft && measured["summary"] && !measured["summary"].ok ? OVER : void 0
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", style: isV6Draft && measured["summary"] && !measured["summary"].ok ? { color: "var(--danger)" } : void 0, children: [
          editSummary.trim().split(/\s+/).filter(Boolean).length,
          " words",
          isV6Draft && result.limits ? ` · ${counterText(
            measured["summary"],
            editSummary.trim().length,
            result.limits.summaryChars,
            `${result.limits.summaryMinLines}–${result.limits.summaryMaxLines} lines`
          )}` : ""
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", style: { marginTop: 12 }, children: "This run produced bullets only — no summary/skills sections (pre-Phase-6 pipeline)." }),
      editSkills.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "label", children: [
          "Technical skills",
          isV6Draft && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", children: " · each line renders on exactly one line; what would wrap goes to the hidden block" })
        ] }),
        editSkills.map((line, i) => {
          var _a2, _b2;
          const m = isV6Draft ? measured[`skills ${line.category.trim().replace(/:$/, "")}`] : void 0;
          const orig = (_a2 = result.skills) == null ? void 0 : _a2[i];
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  value: line.category,
                  onChange: (e) => setEditSkills((prev) => prev.map((l, j) => j === i ? { ...l, category: e.target.value } : l)),
                  style: { flex: "0 0 38%" },
                  placeholder: "Category:"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  value: line.skills,
                  onChange: (e) => setEditSkills((prev) => prev.map((l, j) => j === i ? { ...l, skills: e.target.value } : l)),
                  style: { flex: 1, ...m && !m.ok ? OVER : {} },
                  placeholder: "Skill, skill, skill"
                }
              )
            ] }),
            isV6Draft && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", style: m && !m.ok ? { color: "var(--danger)" } : void 0, children: [
              (orig == null ? void 0 : orig.source) === "code" ? "code-built toolkit line · " : "",
              counterText(m, line.skills.trim().length, orig == null ? void 0 : orig.maxChars, "one line"),
              (((_b2 = orig == null ? void 0 : orig.movedToHidden) == null ? void 0 : _b2.length) ?? 0) > 0 ? ` · moved to hidden: ${orig.movedToHidden.join(", ")}` : ""
            ] })
          ] }, i);
        })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "label", children: [
          "Experience bullets",
          isV6Draft && result.limits && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
            " · two lines max (slots ",
            result.limits.oneLineSlots.join(" and "),
            ": one line) · measured as you type"
          ] })
        ] }),
        result.bullets.map((b) => {
          var _a2, _b2, _c2, _d2;
          const m = isV6Draft ? measured[`slot ${b.slot}`] : void 0;
          const text = editBullets[b.slot] ?? b.text;
          const edited = text.trim() !== b.text.trim();
          const oneLine = b.length === "one_line";
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
                b.slot,
                ". [",
                b.category,
                "]"
              ] }),
              isV6Draft && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: oneLine ? "one line" : "two lines" }),
              isV6Draft && !edited && confidenceChip(b),
              isV6Draft && b.codeTrimmed && !edited && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip warn-chip", title: "Code cut this bullet at a clause boundary to meet its lines — read it", children: "code-trimmed" }),
              isV6Draft && b.humanEdited && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: "your text" }),
              (((_a2 = b.notes) == null ? void 0 : _a2.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { marginTop: 2 }, title: "What the engine did to this slot (v7 full mode)", children: b.notes.join(" · ") }),
              b.needs_human_review && !edited && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "warn", title: (b.defects ?? []).join("\n") || void 0, children: " ⚠ flagged" }),
              isV6Draft && edited && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: "edited — physical rules only" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                rows: oneLine ? 2 : 3,
                value: text,
                onChange: (e) => setEditBullets((prev) => ({ ...prev, [b.slot]: e.target.value })),
                style: { width: "100%", marginTop: 2, ...m && !m.ok ? OVER : {} }
              }
            ),
            isV6Draft && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", style: m && !m.ok ? { color: "var(--danger)" } : void 0, children: [
              counterText(m, text.trim().length, b.maxChars, oneLine ? "one line" : "two lines"),
              !edited && (((_b2 = b.facts) == null ? void 0 : _b2.length) ?? 0) > 0 ? ` · facts ${b.facts.join(", ")}` : ""
            ] }),
            isV6Draft && !edited && (((_c2 = b.askAishwar) == null ? void 0 : _c2.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { style: { marginTop: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "sub", style: { cursor: "pointer", color: "var(--warn-text)" }, children: [
                "Confirm with Aishwar before this goes out (",
                b.askAishwar.length,
                ")"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "2px 0 0 16px" }, children: b.askAishwar.map((q, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "sub", children: q }, i)) })
            ] }),
            isV6Draft && !edited && (((_d2 = b.defects) == null ? void 0 : _d2.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { style: { marginTop: 2 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "sub", style: { cursor: "pointer" }, children: [
                b.defects.length,
                " gate defect",
                b.defects.length === 1 ? "" : "s"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "2px 0 0 16px" }, children: b.defects.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "sub", children: d }, i)) })
            ] })
          ] }, b.slot);
        })
      ] }),
      isV6Draft && editHidden !== null && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { style: { marginTop: 10 }, open: violations.some((v) => v.id === "hidden keywords"), children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "label", style: { cursor: "pointer" }, children: [
          "Hidden keyword block · ",
          editHidden.split(",").map((t) => t.trim()).filter(Boolean).length,
          " terms",
          result.hiddenKeywords !== void 0 && editHidden.trim() !== (result.hiddenKeywords ?? "").trim() ? " · edited" : ""
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { margin: "4px 0" }, children: "Rendered in 1 pt white under the skills lines: ATS keyword matchers parse it, the page shows nothing. Remove anything Aishwar could not speak to in an interview; empty the box to render no hidden block." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            rows: 4,
            value: editHidden,
            onChange: (e) => setEditHidden(e.target.value),
            style: { width: "100%", ...measured["hidden keywords"] && !measured["hidden keywords"].ok ? OVER : {} },
            placeholder: "keyword, keyword, keyword"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 4 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => setEditHidden(result.hiddenKeywords ?? ""), children: "Restore generated list" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn primary",
            onClick: () => void approve(),
            disabled: finalizing || isV6Draft && overLimit.length > 0,
            title: isV6Draft && overLimit.length ? overLimit.map((m) => `${m.id}: ${m.message ?? "over the limit"}`).join("\n") : void 0,
            children: finalizing ? "Drafting…" : isV6Draft && overLimit.length ? `Shorten ${overLimit.map((m) => m.id).join(", ")} first` : "Approve & draft résumé"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn",
            onClick: () => {
              if (result) void clearDraftEdits().then(() => beginReview(result, false));
            },
            disabled: finalizing,
            children: "Reset edits"
          }
        ),
        isV6Draft && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "sub", children: "Approve re-runs the page model, skills packing and hidden block on your text — the docx renders only when every box fits." })
      ] }),
      result.runDir && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "muted", style: { marginTop: 8 }, children: [
        "Full run artifacts: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: result.runDir })
      ] })
    ] }),
    result && !lastDryRun && result.finalized && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Approved résumé" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "muted", children: [
          "· ",
          costLabel(result.costUsd)
        ] }),
        result.document && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small primary", onClick: () => void save(), children: result.needsHumanReview ? "Save anyway →  Documents" : "Save to Documents" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => downloadResultDocument(result), children: "View / download .docx" })
        ] })
      ] }),
      result.document && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "label",
        {
          className: "muted",
          style: { display: "flex", gap: 6, alignItems: "center", marginTop: 6, cursor: "pointer" },
          title: "Documents only auto-star the first résumé you store. Without this, an older résumé stays the one that attaches.",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                type: "checkbox",
                checked: makeDefault,
                onChange: (e) => setMakeDefault(e.target.checked)
              }
            ),
            "Make this the résumé that attaches (★)"
          ]
        }
      ),
      result.needsHumanReview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note warn", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Still flagged." }),
        " ",
        result.reviewReason ?? "Some unedited pieces did not clear the gate.",
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { marginTop: 4 }, children: "These are the parts you left as generated — read them before this goes to an employer." })
      ] }),
      result.engine === "v6" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", children: "v6" }),
        result.domain && !result.domain.generic && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip", children: [
          "lens · ",
          result.domain.name ?? result.domain.slug,
          result.domain.subCategory ? ` · ${result.domain.subCategory}` : ""
        ] }),
        result.pageFit && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: result.pageFit.fits ? "chip" : "chip warn-chip", style: result.pageFit.fits ? OK_CHIP : void 0, children: [
          result.pageFit.fits ? "one page" : "over one page",
          result.pageFit.usedPt != null && result.pageFit.availablePt != null ? ` · ${Math.round(result.pageFit.usedPt)}/${Math.round(result.pageFit.availablePt)} pt` : ""
        ] }),
        result.atsScore && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip gray", children: [
          "ATS ",
          result.atsScore.parsed ?? "–",
          " parsed · ",
          result.atsScore.visible ?? "–",
          " visible"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "chip gray", children: [
          "hidden block · ",
          (result.hiddenKeywords ?? "").split(",").map((t) => t.trim()).filter(Boolean).length,
          " terms"
        ] })
      ] }),
      result.engine === "v6" && (() => {
        const questions = Array.from(new Set(result.bullets.flatMap((b) => b.humanEdited ? [] : b.askAishwar ?? [])));
        return questions.length ? /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { style: { marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { className: "sub", style: { cursor: "pointer", color: "var(--warn-text)" }, children: [
            "Confirm with Aishwar before sending — ",
            questions.length,
            " question",
            questions.length === 1 ? "" : "s"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "4px 0 0 16px" }, children: questions.map((q, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { className: "sub", children: q }, i)) })
        ] }) : null;
      })(),
      result.summary && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", children: "Professional summary" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "4px 0 0 0" }, children: result.summary })
      ] }),
      (((_e = result.skills) == null ? void 0 : _e.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", children: "Technical skills" }),
        result.skills.map((line, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { margin: "4px 0 0 0" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: line.category }),
          " ",
          line.skills
        ] }, i))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "label", style: { marginTop: 10 }, children: "Experience bullets" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { style: { margin: "6px 0 0 18px", padding: 0 }, children: result.bullets.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { style: { marginBottom: 6 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "sub", children: [
          "[",
          b.category,
          "]"
        ] }),
        " ",
        b.text,
        b.needs_human_review && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "warn", title: (b.defects ?? []).join("\n") || void 0, children: " ⚠" }),
        result.engine === "v6" && b.humanEdited && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip gray", style: { marginLeft: 4 }, children: "your text" }),
        result.engine === "v6" && !b.humanEdited && (b.confidence === "confirm" || b.confidence === "framing") && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "chip warn-chip", style: { marginLeft: 4 }, title: (b.askAishwar ?? []).join("\n"), children: "ask Aishwar" })
      ] }, b.slot)) }),
      result.runDir && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "muted", style: { marginTop: 8 }, children: [
        "Full run artifacts: ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: result.runDir })
      ] })
    ] }),
    result && !lastDryRun && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Cover letter" }),
        result.coverLetterStatus !== "running" && !letterBusy && /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn small primary",
            onClick: () => void generateLetter(),
            disabled: blocked,
            children: result.coverLetterStatus === "done" ? `Regenerate — ~${costLabel(estimateCoverLetterCostUsd())}` : `Generate cover letter — ~${costLabel(estimateCoverLetterCostUsd())}`
          }
        ),
        result.coverLetter && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => void copyLetter(), children: "Copy text" }),
          result.coverLetterDocument && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => downloadCoverLetterDocument(result), children: "Download .docx" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small", onClick: () => void saveLetter(), children: "Save to Documents" })
          ] })
        ] })
      ] }),
      !result.coverLetter && result.coverLetterStatus !== "running" && !letterBusy && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", style: { marginTop: 6 }, children: "Reads the posting into the problem this role exists to solve, picks the result on the verified record that looks most like it, and writes five paragraphs — why this company, what he does, the evidence, a hedged reading of the likely constraint, and an invitation to talk about it (10 / 30 / 30 / 20 / 10). Uses the Company Atlas when the employer is in it. The résumé is untouched, and nothing is ever attached automatically." }),
      (result.coverLetterStatus === "running" || letterBusy) && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Writing the cover letter…" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", children: "Question set → fact-grounded answers → letter → gate. Under a minute." })
      ] }),
      letterStatus && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", style: { marginTop: 8 }, children: letterStatus }),
      result.coverLetterStatus === "failed" && result.coverLetterError && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note warn", style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Letter generation failed." }),
        " ",
        result.coverLetterError
      ] }),
      result.coverLetter && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        result.coverLetter.needsHumanReview && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "note warn", style: { marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "The letter gate flagged parts of this draft." }),
          (((_f = result.coverLetter.defects) == null ? void 0 : _f.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "6px 0 0 16px" }, children: result.coverLetter.defects.map((d, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: d }, i)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "sub", style: { marginTop: 4 }, children: "Read it before sending — copy it out and fix what the gate could not." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              marginTop: 10,
              padding: 10,
              border: "1px solid var(--border)",
              borderRadius: 6,
              whiteSpace: "pre-wrap"
            },
            children: result.coverLetter.text
          }
        ),
        result.coverLetter.mode === "hypothesis" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "sub", style: { marginTop: 6, display: "grid", gap: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            result.coverLetter.wordCount ?? 0,
            " words · problem-hypothesis letter",
            ((_g = result.coverLetter.weights) == null ? void 0 : _g.length) ? ` · weights ${result.coverLetter.weights.map((w) => `${Math.round(w * 100)}%`).join(" / ")} (target 10/30/30/20/10)` : ""
          ] }),
          result.coverLetter.roleReadsAs && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Reading of the role: ",
            result.coverLetter.roleReadsAs
          ] }),
          result.coverLetter.hypothesis && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Hypothesis offered: ",
            result.coverLetter.hypothesis
          ] }),
          result.coverLetter.atlas && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Company Atlas: ",
            result.coverLetter.atlas
          ] }),
          (((_h = result.coverLetter.askAishwar) == null ? void 0 : _h.length) ?? 0) > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("details", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("summary", { style: { cursor: "pointer", color: "var(--warn-text)" }, children: [
              "Confirm with Aishwar before sending (",
              result.coverLetter.askAishwar.length,
              ")"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { style: { margin: "4px 0 0 16px" }, children: result.coverLetter.askAishwar.map((q, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: q }, i)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
            "Diagnosis in ",
            /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: result.runDir ? `${result.runDir}/7_cover_letter_diagnosis.json` : "7_cover_letter_diagnosis.json" })
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "muted", style: { marginTop: 6 }, children: [
          result.coverLetter.wordCount ?? 0,
          " words · thinking trace in",
          " ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: result.runDir ? `${result.runDir}/7_cover_letter_thinking.json` : "7_cover_letter_thinking.json" })
        ] })
      ] })
    ] })
  ] });
}
const TABS = ["Profile", "Documents", "Tailor", "Outreach", "Comment", "Answers", "Training", "Review", "Options", "Settings"];
function App({ mode, initialTab }) {
  const { store, patchSettings } = useApp();
  const [tab, setTab] = reactExports.useState(initialTab ?? "Profile");
  const [scanStatus, setScanStatus] = reactExports.useState(null);
  const [tabHost, setTabHost] = reactExports.useState(null);
  const [tabPlatform, setTabPlatform] = reactExports.useState(null);
  const pending = pendingReviewCount(store);
  reactExports.useEffect(() => {
    if (mode !== "popup") return;
    void chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
      const url = activeTab == null ? void 0 : activeTab.url;
      if (!url || !/^https?:/.test(url) || (activeTab == null ? void 0 : activeTab.id) === void 0) return;
      setTabHost(new URL(url).hostname.toLowerCase());
      chrome.tabs.sendMessage(activeTab.id, { type: "PING" }, { frameId: 0 }).then(
        (res) => setTabPlatform((res == null ? void 0 : res.platformDomain) ?? null)
      ).catch(() => null);
    });
  }, [mode]);
  const hostVetoed = tabHost !== null && domainEnabled(tabHost, store.settings.disabledDomains);
  const siteEnabled = tabHost !== null && !hostVetoed && (domainEnabled(tabHost, store.settings.enabledDomains) || tabPlatform !== null && domainEnabled(tabPlatform, store.settings.enabledDomains));
  const scanPage = async () => {
    setScanStatus("Scanning…");
    try {
      const result = await chrome.runtime.sendMessage({
        type: "SCAN_ACTIVE_TAB"
      });
      if (!result.ok) setScanStatus(result.error ?? "Failed.");
      else if (typeof result.detected === "number")
        setScanStatus(
          `Scanned: ${result.detected} field${result.detected === 1 ? "" : "s"} detected, ${result.matched ?? 0} fillable` + ((result.skippedFilled ?? 0) > 0 ? `, ${result.skippedFilled} already filled.` : ".")
        );
      else setScanStatus("Scanned — check the page for the ⚡ badge.");
    } catch {
      setScanStatus("Could not reach this page.");
    }
    setTimeout(() => setScanStatus(null), 6e3);
  };
  const toggleSite = async (enable) => {
    if (!tabHost) return;
    if (enable) {
      const vetoes = entriesMatchingHost(tabHost, store.settings.disabledDomains);
      await patchSettings({
        disabledDomains: store.settings.disabledDomains.filter((d) => !vetoes.includes(d)),
        enabledDomains: store.settings.enabledDomains.includes(tabHost) ? store.settings.enabledDomains : [...store.settings.enabledDomains, tabHost]
      });
      await scanPage();
    } else {
      await patchSettings({
        enabledDomains: store.settings.enabledDomains.filter((d) => d !== tabHost),
        disabledDomains: store.settings.disabledDomains.includes(tabHost) ? store.settings.disabledDomains : [...store.settings.disabledDomains, tabHost]
      });
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app-header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "logo", children: "⚡ FlashFiller" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "spacer" }),
      mode === "popup" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn small primary", onClick: () => void scanPage(), children: "Scan this page" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "btn small",
            title: "Open full-size view",
            onClick: () => void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" }),
            children: "⧉"
          }
        )
      ] })
    ] }),
    scanStatus && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "note", style: { margin: "0 16px" }, children: scanStatus }),
    mode === "popup" && tabHost && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "label",
      {
        className: "muted",
        style: { display: "flex", gap: 6, alignItems: "center", margin: "4px 16px 0", cursor: "pointer" },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: siteEnabled,
              onChange: (e) => void toggleSite(e.target.checked)
            }
          ),
          "Always run on ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: tabHost })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("nav", { className: "tabs", children: TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: t === tab ? "active" : "", onClick: () => setTab(t), children: [
      t,
      t === "Review" && pending > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "count-badge", children: pending })
    ] }, t)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "tab-body", children: [
      tab === "Profile" && /* @__PURE__ */ jsxRuntimeExports.jsx(ProfileTab, {}),
      tab === "Documents" && /* @__PURE__ */ jsxRuntimeExports.jsx(DocumentsTab, {}),
      tab === "Tailor" && /* @__PURE__ */ jsxRuntimeExports.jsx(TailorTab, {}),
      tab === "Outreach" && /* @__PURE__ */ jsxRuntimeExports.jsx(OutreachPanel, {}),
      tab === "Comment" && /* @__PURE__ */ jsxRuntimeExports.jsx(CommentPanel, {}),
      tab === "Answers" && /* @__PURE__ */ jsxRuntimeExports.jsx(AnswersTab, {}),
      tab === "Training" && /* @__PURE__ */ jsxRuntimeExports.jsx(TrainingTab, {}),
      tab === "Review" && /* @__PURE__ */ jsxRuntimeExports.jsx(ReviewTab, {}),
      tab === "Options" && /* @__PURE__ */ jsxRuntimeExports.jsx(OptionsTab, {}),
      tab === "Settings" && /* @__PURE__ */ jsxRuntimeExports.jsx(SettingsTab, {})
    ] })
  ] });
}
export {
  App as A,
  ProfileTab as P,
  TrainingTab as T
};
