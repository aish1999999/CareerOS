import { describe, expect, it } from 'vitest'
import {
  assertAllowedTailorUrl,
  classifyHost,
} from '@/lib/tailor-url'

// The single security decision in the Tailor path: a job description and the
// résumé it produces must never leave a network the user controls.

describe('classifyHost', () => {
  it.each([
    ['127.0.0.1', 'loopback'],
    ['127.1.2.3', 'loopback'],        // the whole /8, not just .0.1
    ['localhost', 'loopback'],
    ['::1', 'loopback'],
  ])('%s → %s', (host, expected) => expect(classifyHost(host)).toBe(expected))

  it.each([
    ['10.0.0.5', 'private'],
    ['10.255.255.255', 'private'],
    ['172.16.0.1', 'private'],
    ['172.31.255.254', 'private'],
    ['192.168.1.42', 'private'],
    ['169.254.10.1', 'private'],
    ['fd00::1', 'private'],
  ])('%s → %s', (host, expected) => expect(classifyHost(host)).toBe(expected))

  it.each([
    ['100.64.0.1', 'tailnet'],
    ['100.101.102.103', 'tailnet'],
    ['100.127.255.255', 'tailnet'],
    ['macbook.tail9f2a.ts.net', 'tailnet'],
  ])('%s → %s', (host, expected) => expect(classifyHost(host)).toBe(expected))

  it.each([
    ['8.8.8.8', 'public'],
    ['1.1.1.1', 'public'],
    ['172.15.0.1', 'public'],          // just below the /12
    ['172.32.0.1', 'public'],          // just above the /12
    ['100.63.255.255', 'public'],      // just below the CGNAT block
    ['100.128.0.0', 'public'],         // just above it
    ['192.167.0.1', 'public'],
    ['11.0.0.1', 'public'],
    ['2001:4860:4860::8888', 'public'],
  ])('%s → %s (rejected)', (host, expected) => expect(classifyHost(host)).toBe(expected))

  it.each([
    ['evil.com', 'unknown'],
    ['tailor.example.org', 'unknown'],
    ['ts.net.evil.com', 'unknown'],    // suffix spoofing must not pass
    ['', 'unknown'],
  ])('%s → %s (unverifiable)', (host, expected) => expect(classifyHost(host)).toBe(expected))
})

describe('assertAllowedTailorUrl', () => {
  it('accepts the loopback default', () => {
    expect(() => assertAllowedTailorUrl('http://127.0.0.1:8765')).not.toThrow()
  })

  it('accepts a tailnet address', () => {
    expect(() => assertAllowedTailorUrl('http://100.101.102.103:8765')).not.toThrow()
  })

  it('accepts a LAN address', () => {
    expect(() => assertAllowedTailorUrl('http://192.168.1.50:8765')).not.toThrow()
  })

  it('refuses a public address', () => {
    expect(() => assertAllowedTailorUrl('http://203.0.113.9:8765')).toThrow(/public address/)
  })

  it('refuses a hostname it cannot verify', () => {
    expect(() => assertAllowedTailorUrl('http://tailor.example.com')).toThrow(/cannot verify/)
  })

  it('refuses a domain that merely ends in a lookalike', () => {
    expect(() => assertAllowedTailorUrl('http://ts.net.attacker.io:8765')).toThrow()
  })

  it('refuses non-http schemes', () => {
    expect(() => assertAllowedTailorUrl('file:///etc/passwd')).toThrow(/Unsupported scheme/)
    expect(() => assertAllowedTailorUrl('ftp://192.168.1.1')).toThrow(/Unsupported scheme/)
  })

  it('refuses malformed input', () => {
    expect(() => assertAllowedTailorUrl('not a url')).toThrow(/not a valid URL/)
  })
})
