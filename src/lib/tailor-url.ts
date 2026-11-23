/**
 * Where the Tailor client is allowed to send a job description.
 *
 * This lives in its own module, with ZERO imports, for two reasons: it is the
 * single security decision in the Tailor path, so it should be readable in one
 * screen; and being pure makes it directly testable without mocking chrome.*.
 *
 * The rule: loopback and private networks yes, public internet never. A job
 * description plus the résumé that comes back is personal data, and the service
 * on the other end spends money — neither should ever be one typo away from
 * leaving the network you control.
 */

export type HostClass = 'loopback' | 'private' | 'tailnet' | 'public' | 'unknown'

/** 127.0.0.0/8 — the whole block, not just 127.0.0.1. */
function isLoopbackV4(o: number[]): boolean {
  return o[0] === 127
}

function isPrivateV4(o: number[]): boolean {
  if (o[0] === 10) return true                                  // 10.0.0.0/8
  if (o[0] === 172 && o[1] >= 16 && o[1] <= 31) return true     // 172.16.0.0/12
  if (o[0] === 192 && o[1] === 168) return true                 // 192.168.0.0/16
  if (o[0] === 169 && o[1] === 254) return true                 // 169.254.0.0/16 link-local
  return false
}

/**
 * 100.64.0.0/10 — the CGNAT block Tailscale assigns from. Strictly this is
 * "shared address space" rather than private, but it is not globally routable
 * and on this machine it means the tailnet.
 */
function isTailnetV4(o: number[]): boolean {
  return o[0] === 100 && o[1] >= 64 && o[1] <= 127
}

function parseIpv4(host: string): number[] | null {
  const parts = host.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
  return octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? octets : null
}

export function classifyHost(hostname: string): HostClass {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '')
  if (host === '') return 'unknown'

  if (host === 'localhost' || host === '::1' || host.endsWith('.localhost')) return 'loopback'

  const v4 = parseIpv4(host)
  if (v4) {
    if (isLoopbackV4(v4)) return 'loopback'
    if (isTailnetV4(v4)) return 'tailnet'
    if (isPrivateV4(v4)) return 'private'
    return 'public'
  }

  // IPv6 unique-local (fc00::/7) — fc.. and fd.. prefixes.
  if (host.includes(':')) {
    return /^f[cd][0-9a-f]{2}:/.test(host) ? 'private' : 'public'
  }

  // Tailscale MagicDNS names resolve only inside the tailnet. Accepted for
  // ergonomics — typing a 100.x address by hand is how you end up with a typo
  // pointing somewhere real. The token remains the actual access control.
  if (host.endsWith('.ts.net')) return 'tailnet'

  // Any other name would need DNS to resolve before we could judge it, and we
  // will not send a job description to something we cannot classify.
  return 'unknown'
}

export const ALLOWED_CLASSES: HostClass[] = ['loopback', 'private', 'tailnet']

export function describeRejection(host: string, cls: HostClass): string {
  if (cls === 'public') {
    return `Refusing to send to ${host} — that is a public address. Tailor must stay on a network you control.`
  }
  return `Refusing to send to ${host} — cannot verify it is a private address. Use an IP (127.0.0.1, 192.168.x.x, 10.x.x.x, 100.64–127.x.x) or a .ts.net name.`
}

/** Throws unless the URL points somewhere local, private, or on your tailnet. */
export function assertAllowedTailorUrl(baseUrl: string): void {
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    throw new Error(`"${baseUrl}" is not a valid URL.`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported scheme "${parsed.protocol}" — use http:// or https://.`)
  }
  const cls = classifyHost(parsed.hostname)
  if (!ALLOWED_CLASSES.includes(cls)) {
    throw new Error(describeRejection(parsed.hostname, cls))
  }
}
