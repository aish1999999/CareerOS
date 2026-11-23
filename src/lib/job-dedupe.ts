import type { JobAts } from '@contract/entities'

// ---------------------------------------------------------------------------
// The `jobs` dedupe key and its coercions — a line-for-line twin of
// apps/mapper/service/jobs_import.py (norm_text, norm_key, url_key, dedupe_key,
// _int, _date, _work_type, ats_req_id_from_url).
//
// The extension builds its own `jobs` row and sends it through the outbox, so
// the key it computes MUST equal the one the hub computes for the same posting
// arriving from a CSV or JobFlow — otherwise one posting becomes two rows.
// packages/contract/fixtures/jobs_dedupe_vectors.json is generated FROM the
// Python module (scripts/gen_dedupe_vectors.py); tests/job-dedupe.test.ts holds
// this file to it. Change both sides together, then regenerate.
//
// Deliberately NOT the WHATWG URL parser: urllib.parse keeps `;params`, blank
// query values, host case and percent-encoding exactly as written, and the key
// depends on those details (Taleo `;jsessionid=`, LinkedIn `?currentJobId=`).
// ---------------------------------------------------------------------------

/** Python `str(v or "")`. */
export function pyStr(value: unknown): string {
  if (value === null || value === undefined || value === false || value === 0 || value === '') return ''
  if (typeof value === 'number' && Number.isNaN(value)) return ''
  return String(value)
}

// str.isspace() — what Python's `\s` and str.strip() use; JS `\s` differs (﻿ in, \x85 and \x1c-\x1f out).
const PY_WS = '\\t\\n\\x0b\\x0c\\r\\x1c-\\x1f \\x85\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'
const WS_RUN = new RegExp(`[${PY_WS}]+`, 'g')
const WS_EDGE = new RegExp(`^[${PY_WS}]+|[${PY_WS}]+$`, 'g')

export function pyStrip(text: string): string {
  return text.replace(WS_EDGE, '')
}

export function normText(value: unknown): string {
  return pyStrip(pyStr(value).replace(WS_RUN, ' '))
}

export function normKey(value: unknown): string {
  return pyStr(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

// -- urllib.parse.urlparse, only the parts url_key reads -----------------------

const USES_PARAMS = new Set(['', 'ftp', 'hdl', 'prospero', 'http', 'imap', 'https', 'shttp', 'rtsp', 'rtspu', 'sip', 'sips', 'mms', 'sftp', 'tel'])

export interface PyUrl {
  netloc: string
  path: string
  query: string
}

export function pyUrlparse(raw: string): PyUrl | null {
  let url = pyStrip(raw).replace(/[\t\r\n]/g, '')
  let scheme = ''
  const m = /^([A-Za-z0-9+.\-]+):/.exec(url)
  if (m) {
    scheme = m[1].toLowerCase()
    url = url.slice(m[0].length)
  }
  let netloc = ''
  if (url.startsWith('//')) {
    const rest = url.slice(2)
    const end = rest.search(/[/?#]/)
    netloc = end < 0 ? rest : rest.slice(0, end)
    url = end < 0 ? '' : rest.slice(end)
  }
  if (netloc.includes('[') !== netloc.includes(']')) return null
  const hash = url.indexOf('#')
  if (hash >= 0) url = url.slice(0, hash)
  let query = ''
  const q = url.indexOf('?')
  if (q >= 0) {
    query = url.slice(q + 1)
    url = url.slice(0, q)
  }
  let path = url
  if (USES_PARAMS.has(scheme) && path.includes(';')) {
    const from = path.includes('/') ? path.lastIndexOf('/') : 0
    const i = path.indexOf(';', from)
    if (i >= 0) path = path.slice(0, i)
  }
  return { netloc, path, query }
}

/** parse_qs(query).get(name, [None])[0] — blank values dropped, first kept. */
function pyQueryFirst(query: string, name: string): string | null {
  for (const pair of query.split('&')) {
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq < 0) continue
    const key = pyUnquotePlus(pair.slice(0, eq))
    const value = pair.slice(eq + 1)
    if (key === name && value.length > 0) return pyUnquotePlus(value)
  }
  return null
}

function pyUnquotePlus(text: string): string {
  const spaced = text.replace(/\+/g, ' ')
  try {
    return decodeURIComponent(spaced)
  } catch {
    return spaced.replace(/%[0-9A-Fa-f]{2}/g, (hex) => {
      try {
        return decodeURIComponent(hex)
      } catch {
        return '�'
      }
    })
  }
}

/** A stable identity for a posting URL: the LinkedIn job id when present, else host+path. */
export function urlKey(url: unknown): string | null {
  const text = pyStr(url)
  if (!text) return null
  const parsed = pyUrlparse(text)
  if (!parsed) return null
  const m = /\/jobs\/view\/(?:[^/]*-)?(\d{6,})/.exec(parsed.path) ?? /(\d{7,})/.exec(parsed.path)
  const current = pyQueryFirst(parsed.query, 'currentJobId')
  if (current !== null) return 'li:' + current
  if (m && parsed.netloc.includes('linkedin.com')) return 'li:' + m[1]
  const host = parsed.netloc.toLowerCase().split('www.').join('')
  const path = parsed.path.replace(/\/+$/, '')
  return host ? `${host}${path}`.toLowerCase() : null
}

export interface DedupeParts {
  atsReqId?: unknown
  url?: unknown
  description?: unknown
  linkedinJobId?: unknown
}

export function dedupeKey(company: unknown, title: unknown, parts: DedupeParts = {}): string {
  const req = normText(parts.atsReqId)
  const li = normText(parts.linkedinJobId)
  const fromUrl = urlKey(parts.url)
  const desc = normText(parts.description)
  let tail = ''
  if (req) {
    tail = 'req:' + req.toLowerCase()
  } else if (/^\d{6,}$/.test(li)) {
    tail = 'li:' + li
  } else if (fromUrl) {
    tail = fromUrl
  } else if (desc) {
    tail = 'desc:' + sha1Hex(Array.from(desc).slice(0, 2000).join('')).slice(0, 12)
  }
  return `${normKey(company)}|${normKey(title)}|${tail}`
}

// -- the per-ATS requisition id, from the URL alone (twin of ats_req_id_from_url) --

export function atsFromHost(hostname: string): JobAts | null {
  const host = hostname.toLowerCase()
  if (/\.myworkday(jobs|site)\.com$/.test(host)) return 'workday'
  if (/(^|\.)greenhouse\.io$/.test(host)) return 'greenhouse'
  if (/\.icims\.com$/.test(host)) return 'icims'
  if (/(^|\.)successfactors\.(eu|com)$/.test(host)) return 'successfactors'
  if (/\.oraclecloud\.com$/.test(host)) return 'oracle'
  if (/(^|\.)taleo\.net$/.test(host)) return 'taleo'
  if (/(^|\.)lever\.co$/.test(host)) return 'lever'
  if (/(^|\.)ashbyhq\.com$/.test(host)) return 'ashby'
  if (/(^|\.)smartrecruiters\.com$/.test(host)) return 'smartrecruiters'
  if (/(^|\.)jobvite\.com$/.test(host)) return 'jobvite'
  if (/(^|\.)bamboohr\.com$/.test(host)) return 'bamboohr'
  if (/(^|\.)eightfold\.ai$/.test(host)) return 'eightfold'
  return null
}

/** Platform URL shapes a vanity domain keeps (twin of _ats_from_path). */
function atsFromPath(path: string, query: string): JobAts | null {
  if (/\/sites\/[^/]+\/(?:job|jobs\/preview|requisitions\/preview)\/\d{4,}/.test(path)) return 'oracle'
  if (/\/job\/[^/]+\/\d{5,}\/?$/.test(path) || query.includes('career_job_req_id=')) return 'successfactors'
  return null
}

/**
 * The requisition id an ATS exposes in its own URL — by host, or by the path shape
 * on a vanity domain. Lever / Ashby / SmartRecruiters URLs are the identity already,
 * so they stay on the host+path key. The URL is the ONLY source of the key's
 * requisition id on every feeder: a page-only id (a "Job ID" label, a JSON-LD
 * identifier) would key the extension apart from a CSV of the same URL.
 */
export function atsReqIdFromUrl(url: unknown): string | null {
  const text = pyStr(url)
  if (!text) return null
  const parsed = pyUrlparse(text)
  if (!parsed) return null
  const host = parsed.netloc.toLowerCase()
  const path = parsed.path
  const ats = atsFromHost(host) ?? atsFromPath(path, parsed.query)
  let m: RegExpExecArray | null
  const ghJid = pyQueryFirst(parsed.query, 'gh_jid')
  if (ghJid && /^\d{3,}$/.test(ghJid)) return ghJid
  if (ats === 'workday') {
    const segments = path.split('/').filter(Boolean)
    for (let i = segments.length - 1; i >= 0; i--) {
      m = /_([A-Za-z]{0,6}[-_]?\d{2,}[\w-]*)$/.exec(segments[i])
      if (m) return m[1]
    }
    return null
  }
  if (ats === 'greenhouse') {
    m = /\/jobs\/(\d{4,})(?:\/|$)/.exec(path)
    if (m) return m[1]
    const token = pyQueryFirst(parsed.query, 'token')
    return token && /^\d{3,}$/.test(token) ? token : null
  }
  if (ats === 'icims') {
    m = /\/jobs\/((?:\d{4}-)?\d{3,})(?:\/|$)/.exec(path)
    return m ? m[1] : null
  }
  if (ats === 'successfactors') {
    const req = pyQueryFirst(parsed.query, 'career_job_req_id')
    if (req && /^\d{3,}$/.test(req)) return req
    m = /\/job\/[^/]+\/(\d{5,})\/?$/.exec(path)
    return m ? m[1] : null
  }
  if (ats === 'oracle') {
    m = /\/(?:job|preview|requisitions\/preview)\/(\d{4,})(?:\/|$)/.exec(path)
    return m ? m[1] : null
  }
  if (ats === 'taleo') {
    const job = pyQueryFirst(parsed.query, 'job')
    return job && /^[\w-]{3,}$/.test(job) ? job : null
  }
  return null
}

// -- coercions ------------------------------------------------------------------

/** `_int`: the first digit run, commas allowed; "Be among the first 25 applicants" is a ceiling, not a count. */
export function pyInt(value: unknown): number | null {
  const text = pyStr(value)
  if (/\bfirst\s+\d/i.test(text)) return null
  const m = /\d[\d,]*/.exec(text)
  if (!m) return null
  const n = Number.parseInt(m[0].replace(/,/g, ''), 10)
  return Number.isSafeInteger(n) ? n : null
}

/** `_date`: ISO prefix or US m/d/Y → YYYY-MM-DD; anything else (incl. D/M/Y) → null. */
export function pyDate(value: unknown): string | null {
  const text = pyStrip(pyStr(value))
  let m = /^(\d{4}-\d{2}-\d{2})/.exec(text)
  if (m) return m[1]
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(text)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function pyWorkType(value: unknown): 'remote' | 'hybrid' | 'onsite' | null {
  const text = pyStrip(pyStr(value)).toLowerCase()
  if (!text) return null
  if (text.includes('remote')) return 'remote'
  if (text.includes('hybrid')) return 'hybrid'
  if (text.includes('on-site') || text.includes('onsite') || text.includes('on site') || text.includes('in office') || text.includes('in-office')) return 'onsite'
  return null
}

// -- SHA-1 ------------------------------------------------------------------------

/** SHA-1 over the UTF-8 bytes, hex. Synchronous on purpose: crypto.subtle is async
 *  and absent under jsdom, and the key must be computable inline. */
export function sha1Hex(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  const length = bytes.length
  const padded = Math.ceil((length + 9) / 64) * 64
  const buf = new Uint8Array(padded)
  buf.set(bytes)
  buf[length] = 0x80
  const view = new DataView(buf.buffer)
  const bits = length * 8
  view.setUint32(padded - 8, Math.floor(bits / 0x100000000), false)
  view.setUint32(padded - 4, bits >>> 0, false)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  const w = new Uint32Array(80)
  for (let offset = 0; offset < padded; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false)
    for (let i = 16; i < 80; i++) {
      const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]
      w[i] = (x << 1) | (x >>> 31)
    }
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    for (let i = 0; i < 80; i++) {
      let f: number
      let k: number
      if (i < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (i < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0
      e = d
      d = c
      c = (b << 30) | (b >>> 2)
      b = a
      a = t
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }
  return [h0, h1, h2, h3, h4].map((v) => v.toString(16).padStart(8, '0')).join('')
}
