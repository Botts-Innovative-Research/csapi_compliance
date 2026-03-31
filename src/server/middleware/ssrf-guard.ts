// SSRF protection: validate that outbound request URLs target public hosts only.
// REQ-ENG-012: Graceful network error handling (no cascading failures)

// Use default import for CJS/ESM interop (ipaddr.js uses `export = Address`)
import ipaddr from 'ipaddr.js';
const { parse: parseIp, parseCIDR } = ipaddr;
import { BLOCKED_CIDRS } from '@/lib/constants.js';
import { SsrfError } from '@/engine/errors.js';
import dns from 'node:dns/promises';

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

/**
 * Pre-parsed CIDR ranges for fast matching. Parsed once at module load.
 */
const parsedCidrs: Array<[ipaddr.IPv4 | ipaddr.IPv6, number]> = BLOCKED_CIDRS.map((cidr) => {
  return parseCIDR(cidr);
});

/**
 * Check whether an IP address string falls within any blocked CIDR range.
 */
function isBlockedIp(ip: string): boolean {
  try {
    let addr = parseIp(ip);
    // Convert IPv4-mapped IPv6 addresses (::ffff:x.x.x.x) to IPv4 for matching
    if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      addr = (addr as ipaddr.IPv6).toIPv4Address();
    }

    for (const [network, prefix] of parsedCidrs) {
      // Only compare addresses of the same kind (v4 vs v6)
      if (addr.kind() === network.kind()) {
        if (addr.match(network, prefix)) {
          return true;
        }
      }
    }
    return false;
  } catch {
    // If parsing fails, block the address to be safe
    return true;
  }
}

/**
 * Validate that a URL is safe to request (not internal/private).
 *
 * Throws SsrfError if:
 * - URL uses a non-HTTP(S) scheme
 * - Hostname is 'localhost' or '::1'
 * - Hostname resolves to a blocked CIDR (private/internal IP)
 *
 * @param url - The URL string to validate
 * @throws {SsrfError} if the URL targets a blocked destination
 */
export async function validateUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfError(url, 'Invalid URL');
  }

  // 1. Scheme check
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new SsrfError(url, `Scheme "${parsed.protocol}" is not allowed; only http and https are permitted`);
  }

  const hostname = parsed.hostname;

  // 2. Direct localhost / loopback checks (no DNS needed)
  if (hostname === 'localhost') {
    throw new SsrfError(url, 'Hostname "localhost" is blocked');
  }
  if (hostname === '::1' || hostname === '[::1]') {
    throw new SsrfError(url, 'IPv6 loopback address is blocked');
  }

  // 3. If hostname is an IP literal, check directly
  // Strip brackets from IPv6 literals (URL parser keeps them)
  const bareHost = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;

  try {
    const addr = parseIp(bareHost);
    // It's a valid IP literal — check it directly
    if (isBlockedIp(addr.toString())) {
      throw new SsrfError(url, `IP address ${bareHost} is in a blocked range`);
    }
    // IP literal is public — allow
    return;
  } catch (e) {
    if (e instanceof SsrfError) throw e;
    // Not an IP literal — proceed to DNS resolution
  }

  // 4. DNS resolution — resolve hostname and check all returned IPs
  let addresses: string[];
  try {
    const results = await dns.resolve4(hostname);
    addresses = results;
  } catch {
    // If IPv4 resolution fails, try IPv6
    try {
      const results6 = await dns.resolve6(hostname);
      addresses = results6;
    } catch {
      // If both fail, let the actual request handle the DNS error
      return;
    }
  }

  for (const ip of addresses) {
    if (isBlockedIp(ip)) {
      throw new SsrfError(url, `Hostname "${hostname}" resolves to blocked IP ${ip}`);
    }
  }
}

// Re-export isBlockedIp for direct testing
export { isBlockedIp };
