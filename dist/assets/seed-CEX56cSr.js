import { S as SeedCatalogSchema } from "./storage-DrgdSKCL.js";
function hostMatchesDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}
function domainEnabled(hostname, enabledDomains) {
  return enabledDomains.some((d) => hostMatchesDomain(hostname, d));
}
function entriesMatchingHost(hostname, enabledDomains) {
  return enabledDomains.filter((d) => hostMatchesDomain(hostname, d));
}
function textOf(doc, selector) {
  var _a;
  const el = doc.querySelector(selector);
  const text = (_a = el == null ? void 0 : el.textContent) == null ? void 0 : _a.trim();
  return text ? text : null;
}
const greenhouse = {
  name: "greenhouse",
  hosts: /(^|\.)greenhouse\.io$/,
  context: (doc) => ({
    company: textOf(doc, ".company-name") ?? textOf(doc, '[class*="company-name"]'),
    role: textOf(doc, ".app-title") ?? textOf(doc, "h1.section-header") ?? textOf(doc, "h1"),
    location: textOf(doc, ".location") ?? textOf(doc, '[class*="job__location"]')
  })
};
const lever = {
  name: "lever",
  hosts: /(^|\.)lever\.co$/,
  context: (doc) => {
    const company = doc.location.pathname.split("/").filter(Boolean)[0] ?? null;
    return {
      company: textOf(doc, ".main-header-logo img[alt]") ? doc.querySelector(".main-header-logo img").alt : company,
      role: textOf(doc, ".posting-headline h2") ?? textOf(doc, "h2"),
      location: textOf(doc, ".posting-categories .location") ?? textOf(doc, ".sort-by-time.posting-category")
    };
  }
};
const workday = {
  name: "workday",
  hosts: /\.myworkdayjobs\.com$/,
  isMultiStep: true,
  context: (doc) => ({
    // <company>.wd5.myworkdayjobs.com
    company: doc.location.hostname.split(".")[0] ?? null,
    role: textOf(doc, '[data-automation-id="jobPostingHeader"]') ?? textOf(doc, "h1"),
    location: textOf(doc, '[data-automation-id="locations"] dd')
  }),
  dropdownOptionSelector: '[data-automation-id="promptOption"], [role="option"]'
};
const ashby = {
  name: "ashby",
  hosts: /(^|\.)ashbyhq\.com$/,
  context: (doc) => ({
    company: doc.location.pathname.split("/").filter(Boolean)[0] ?? null,
    role: textOf(doc, "h1")
  })
};
const icims = {
  name: "icims",
  hosts: /\.icims\.com$/,
  isMultiStep: true,
  context: (doc) => ({
    role: textOf(doc, ".iCIMS_Header h1") ?? textOf(doc, "h1")
  })
};
const smartrecruiters = {
  name: "smartrecruiters",
  hosts: /(^|\.)smartrecruiters\.com$/,
  context: (doc) => ({
    company: textOf(doc, '[itemprop="hiringOrganization"]'),
    role: textOf(doc, 'h1[itemprop="title"]') ?? textOf(doc, "h1"),
    location: textOf(doc, '[itemprop="jobLocation"]')
  })
};
const successfactors = {
  name: "successfactors",
  hosts: /(^|\.)successfactors\.(eu|com)$/,
  isMultiStep: true,
  context: (doc) => ({
    // Legacy Career Portal titles are often generic ("Career Opportunities");
    // JSON-LD/meta layers usually do better — offer h1 as a last resort only.
    role: textOf(doc, "h1")
  }),
  // MUST stay a superset of the generic default ('[role="option"], [role="listbox"] li')
  // — the adapter selector REPLACES the default in findDropdownOptions, and SF
  // mixes native selects with SAPUI5 popover lists (.sapMSelectListItem/.sapMSLI).
  dropdownOptionSelector: '[role="option"], [role="listbox"] li, .sapMSelectListItem, .sapMSLI'
};
const oracle = {
  name: "oracle",
  // Oracle Recruiting Cloud Candidate Experience (hcmUI/CandidateExperience).
  // Tenants sit on varied pod hosts (fa-espx-saasfaprod1.fa.ocs.oraclecloud.com,
  // xyz.fa.us2.oraclecloud.com) — the shared suffix is the only stable handle.
  hosts: /\.oraclecloud\.com$/,
  canonicalDomain: "oraclecloud.com",
  // Vanity-domain CX sites (careers.honeywell.com, live 2026-07-21: address/
  // state/country/veteran unfilled — the SAME app as NOV, adapter never
  // applied) self-identify in the server-rendered shell: <base
  // data-apibaseurl="https://<tenant>.fa.ocs.oraclecloud.com:443"> points at
  // the real pod, and the CX candidate-experience bundle loads from
  // static.oracle.com/cdn/fa/oj-hcm-ce/. Either marker alone is decisive.
  fingerprint: (doc) => !!doc.querySelector(
    'base[data-apibaseurl*=".oraclecloud.com"], link[href*="/oj-hcm-ce/"], script[src*="/oj-hcm-ce/"]'
  ),
  isMultiStep: true,
  // apply flow is …/apply/section/N with pushState navigation
  context: (doc) => ({
    // og:site_name is "<Company> Talent Acquisition/Careers" — the meta layer
    // already takes it verbatim, so only the role needs help here.
    role: textOf(doc, ".job-details__title") ?? textOf(doc, "h1")
  }),
  // MUST stay a superset of the generic default — the adapter selector
  // REPLACES it in findDropdownOptions.
  // - CX apply-flow selects (`cx-select`, verified from the oj-hcm-ce bundle
  //   source, Cummins 2026-07-16): the popup is div[role="grid"] > div[role=
  //   "row"] > div[role="gridcell"].cx-select__list-item — NO option/listbox
  //   roles anywhere, which is why the generic selector saw "0 scoped
  //   options". The multi-select variant uses ul[role="listbox"] > li[role=
  //   "option"] (generic default covers it).
  // - Oracle JET (other CX surfaces) renders oj-select popups as
  //   ul.oj-listbox-results > li.oj-listbox-result with role="option" on the
  //   inner label div; the li class is the version-proof handle (li + label
  //   div double-matching is harmless: same text, clicks drill inward).
  dropdownOptionSelector: '[role="option"], [role="listbox"] li, [role="menu"] [role="menuitem"], [role="menu"] [role="menuitemradio"], [role="tree"] [role="treeitem"], .oj-listbox-result, [role="grid"] [role="gridcell"], .cx-select__list-item'
};
const ADAPTERS = [greenhouse, lever, workday, ashby, icims, smartrecruiters, successfactors, oracle];
function getAdapter(hostname, doc) {
  const byHost = ADAPTERS.find((a) => a.hosts.test(hostname));
  if (byHost) return byHost;
  if (doc) return ADAPTERS.find((a) => {
    var _a;
    return (_a = a.fingerprint) == null ? void 0 : _a.call(a, doc);
  }) ?? null;
  return null;
}
function enabledForPage(hostname, doc, enabledDomains, disabledDomains = []) {
  if (domainEnabled(hostname, disabledDomains)) return false;
  if (domainEnabled(hostname, enabledDomains)) return true;
  const adapter = getAdapter(hostname, doc);
  return !!(adapter == null ? void 0 : adapter.canonicalDomain) && domainEnabled(adapter.canonicalDomain, enabledDomains);
}
function clean(value) {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 && t.length < 200 ? t : null;
}
function findJobPosting(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  const obj = node;
  const type = obj["@type"];
  if (type === "JobPosting" || Array.isArray(type) && type.includes("JobPosting")) return obj;
  if (obj["@graph"]) return findJobPosting(obj["@graph"]);
  return null;
}
function extractJsonLd(doc) {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let parsed;
    try {
      parsed = JSON.parse(script.textContent ?? "");
    } catch {
      continue;
    }
    const posting = findJobPosting(parsed);
    if (!posting) continue;
    const org = posting.hiringOrganization;
    const company = typeof org === "string" ? clean(org) : clean(org == null ? void 0 : org.name);
    let location = null;
    const jobLocation = posting.jobLocation;
    const firstLocation = Array.isArray(jobLocation) ? jobLocation[0] : jobLocation;
    if (typeof firstLocation === "object" && firstLocation !== null) {
      const address = firstLocation.address;
      if (typeof address === "object" && address !== null) {
        const a = address;
        location = clean(a.addressLocality) ?? clean(a.addressRegion) ?? clean(a.addressCountry);
      } else {
        location = clean(firstLocation.name);
      }
    }
    return { company, role: clean(posting.title), location };
  }
  return null;
}
function metaContent(doc, property) {
  const el = doc.querySelector(`meta[property="${property}"]`) ?? doc.querySelector(`meta[name="${property}"]`);
  return clean(el == null ? void 0 : el.getAttribute("content"));
}
function extractMeta(doc) {
  const ogTitle = metaContent(doc, "og:title");
  const fromOgTitle = ogTitle ? splitTitle(ogTitle) : {};
  return {
    company: metaContent(doc, "og:site_name") ?? fromOgTitle.company,
    role: fromOgTitle.role ?? ogTitle
  };
}
function splitTitle(title) {
  const at = title.split(/\s+at\s+/i);
  if (at.length === 2) return { role: clean(at[0]), company: clean(at[1].split(/[|—–-]/)[0]) };
  const parts = title.split(/\s*[|—–]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { role: clean(parts[0]), company: clean(parts[parts.length - 1]) };
  return { role: clean(title) };
}
function extractPageContext(doc = document) {
  var _a, _b;
  const layers = [
    { data: extractJsonLd(doc), source: "jsonld" },
    { data: extractMeta(doc), source: "meta" },
    {
      // createHTMLDocument (tests) and detached docs have a null location;
      // doc passed through so vanity domains fingerprint to their platform
      data: doc.location ? ((_b = (_a = getAdapter(doc.location.hostname, doc)) == null ? void 0 : _a.context) == null ? void 0 : _b.call(_a, doc)) ?? null : null,
      source: "adapter"
    },
    { data: doc.title ? splitTitle(doc.title) : null, source: "title" }
  ];
  const context = { company: null, role: null, location: null, source: "none" };
  for (const { data, source } of layers) {
    if (!data) continue;
    let contributed = false;
    for (const key of ["company", "role", "location"]) {
      const value = clean(data[key]);
      if (value && !context[key]) {
        context[key] = value;
        contributed = true;
      }
    }
    if (contributed && context.source === "none") context.source = source;
  }
  return context;
}
const DOCS_KEY = "flashfiller_documents_v1";
const DOCS_SCHEMA_VERSION = 1;
const DOC_SIZE_WARN_BYTES = 4 * 1024 * 1024;
const B64_CHUNK = 32768;
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK));
  }
  return btoa(binary);
}
function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
const EXT_MIME = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".rtf": "application/rtf",
  ".odt": "application/vnd.oasis.opendocument.text"
};
function mimeFromName(name) {
  var _a, _b;
  const ext = ((_b = (_a = name.match(/\.\w+$/)) == null ? void 0 : _a[0]) == null ? void 0 : _b.toLowerCase()) ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}
function isStoredDocument(raw) {
  if (typeof raw !== "object" || raw === null) return false;
  const d = raw;
  return typeof d.id === "string" && typeof d.name === "string" && typeof d.bytesB64 === "string" && (d.kind === "resume" || d.kind === "coverLetter" || d.kind === "other");
}
async function readEnvelope() {
  const result = await chrome.storage.local.get(DOCS_KEY);
  const raw = result[DOCS_KEY];
  const documents = Array.isArray(raw == null ? void 0 : raw.documents) ? raw.documents.filter(isStoredDocument) : [];
  return {
    schemaVersion: DOCS_SCHEMA_VERSION,
    documents: documents.map((d) => ({
      ...d,
      mime: typeof d.mime === "string" ? d.mime : "application/octet-stream",
      size: typeof d.size === "number" ? d.size : 0,
      personas: Array.isArray(d.personas) ? d.personas.filter((p) => typeof p === "string") : [],
      isDefault: d.isDefault === true,
      createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
      updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : 0
    }))
  };
}
async function writeEnvelope(env) {
  await chrome.storage.local.set({ [DOCS_KEY]: env });
}
let metaCache = null;
let watching = false;
function watchInvalidations() {
  if (watching) return;
  watching = true;
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && DOCS_KEY in changes) metaCache = null;
    });
  } catch {
  }
}
function stripBytes(doc) {
  const { bytesB64: _bytes, ...meta } = doc;
  return meta;
}
async function listDocumentMeta() {
  watchInvalidations();
  if (metaCache) return metaCache;
  metaCache = (await readEnvelope()).documents.map(stripBytes);
  return metaCache;
}
async function getDocument(id) {
  return (await readEnvelope()).documents.find((d) => d.id === id) ?? null;
}
function newDocId() {
  var _a, _b;
  return ((_b = (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) ?? `doc-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}
function guessKind(name) {
  if (/cover[\s_-]*letter|\bcl\b/i.test(name)) return "coverLetter";
  if (/resume|\bcv\b|curriculum/i.test(name)) return "resume";
  return "other";
}
async function fileBytes(file) {
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}
async function saveDocument(file, kind, opts = {}) {
  const bytes = await fileBytes(file);
  const env = await readEnvelope();
  const now = Date.now();
  const doc = {
    id: newDocId(),
    kind,
    name: file.name,
    mime: file.type || mimeFromName(file.name),
    bytesB64: bytesToBase64(bytes),
    size: bytes.byteLength,
    personas: opts.personas ?? [],
    // First document of its kind is the default automatically
    isDefault: !env.documents.some((d) => d.kind === kind),
    createdAt: now,
    updatedAt: now
  };
  env.documents.push(doc);
  await writeEnvelope(env);
  metaCache = null;
  return doc;
}
async function updateDocument(id, patch) {
  const env = await readEnvelope();
  const target = env.documents.find((d) => d.id === id);
  if (!target) return;
  Object.assign(target, patch, { updatedAt: Date.now() });
  if (patch.isDefault === true) {
    for (const d of env.documents) {
      if (d.id !== id && d.kind === target.kind) d.isDefault = false;
    }
  }
  await writeEnvelope(env);
  metaCache = null;
}
async function deleteDocument(id) {
  const env = await readEnvelope();
  env.documents = env.documents.filter((d) => d.id !== id);
  await writeEnvelope(env);
  metaCache = null;
}
function acceptMatches(accept, doc) {
  var _a, _b;
  if (!accept || !accept.trim()) return true;
  const ext = ((_b = (_a = doc.name.match(/\.\w+$/)) == null ? void 0 : _a[0]) == null ? void 0 : _b.toLowerCase()) ?? "";
  const mime = doc.mime.toLowerCase();
  return accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).some((token) => {
    if (token.startsWith(".")) return ext === token;
    if (token.endsWith("/*")) return mime.startsWith(token.slice(0, -1));
    return mime === token;
  });
}
function pickDocument(docs, query) {
  const cue = query.docCue ?? "other";
  let pool = docs.filter((d) => acceptMatches(query.accept, d));
  if (cue === "resume" || cue === "coverLetter") pool = pool.filter((d) => d.kind === cue);
  pool = pool.filter(
    (d) => d.personas.length === 0 || !!query.persona && d.personas.includes(query.persona)
  );
  if (pool.length === 0) return null;
  const rank = (d) => [
    query.persona && d.personas.includes(query.persona) ? 1 : 0,
    cue === "other" && d.kind === "resume" ? 1 : 0,
    d.isDefault ? 1 : 0,
    d.updatedAt
  ];
  return pool.reduce((best, d) => {
    const a = rank(d);
    const b = rank(best);
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] > b[i] ? d : best;
    }
    return best;
  });
}
let cache = null;
async function loadSeedCatalog() {
  if (cache) return cache;
  const url = chrome.runtime.getURL("seed-questions.json");
  const response = await fetch(url);
  const raw = await response.json();
  cache = SeedCatalogSchema.parse(raw);
  return cache;
}
function seedEntryId(seedId, persona) {
  return persona ? `seed-${seedId}--${persona}` : `seed-${seedId}`;
}
function readProfilePath(profile, path) {
  const parts = path.replace(/^profile\./, "").split(".");
  let value = profile;
  for (const part of parts) {
    if (typeof value !== "object" || value === null) return "";
    value = value[part];
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === void 0) return "";
  return String(value);
}
function compositeSeedCovered(seed, profile) {
  const template = seed.answerTemplate ?? "";
  const section = template.match(/\{\{#(\w+)\}\}/);
  if (section) {
    const arr = profile[section[1]];
    return Array.isArray(arr) && arr.length > 0;
  }
  const refs = [...template.matchAll(/\{\{\s*(profile\.[\w.]+)\s*\}\}/g)].map((m) => m[1]);
  return refs.length > 0 && refs.every((ref) => readProfilePath(profile, ref) !== "");
}
function seedStatuses(catalog, qa, profile, settings, persona) {
  const answeredIds = /* @__PURE__ */ new Set();
  for (const entry of qa) {
    for (const tag of entry.tags) {
      if (tag.startsWith("seed:")) answeredIds.add(tag.slice(5));
    }
  }
  return catalog.questions.map((seed) => {
    let coverage = "unanswered";
    if (settings.suppressedSeedIds.includes(seed.id)) {
      coverage = "suppressed";
    } else if (answeredIds.has(seed.id) || qa.some((e) => e.id === seedEntryId(seed.id, persona) || e.id === seedEntryId(seed.id, null))) {
      coverage = "answered";
    } else if (seed.answerType === "profile") {
      coverage = seed.mapsTo && readProfilePath(profile, seed.mapsTo) !== "" ? "covered" : "unanswered";
    } else if (seed.answerType === "composite") {
      coverage = compositeSeedCovered(seed, profile) ? "covered" : "unanswered";
    }
    return { seed, coverage };
  });
}
function trainingQueue(statuses, category) {
  return statuses.filter(
    (s) => s.coverage === "unanswered" && s.seed.answerType === "freeText" && (!category || s.seed.category === category)
  ).map((s) => s.seed);
}
export {
  DOC_SIZE_WARN_BYTES as D,
  enabledForPage as a,
  getDocument as b,
  base64ToBytes as c,
  deleteDocument as d,
  extractPageContext as e,
  guessKind as f,
  getAdapter as g,
  hostMatchesDomain as h,
  seedStatuses as i,
  seedEntryId as j,
  domainEnabled as k,
  listDocumentMeta as l,
  entriesMatchingHost as m,
  loadSeedCatalog as n,
  splitTitle as o,
  pickDocument as p,
  readProfilePath as r,
  saveDocument as s,
  trainingQueue as t,
  updateDocument as u
};
