// Tests for SSRF guard — src/server/middleware/ssrf-guard.ts
// REQ-ENG-012: Graceful network error handling (no cascading failures)
// REQ-SSRF-002 / SCENARIO-SSRF-LOCAL-001: opt-in private-network allowlist

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SsrfError } from '@/engine/errors.js';

// We mock dns.resolve4 / dns.resolve6 so tests don't hit real DNS.
const mockResolve4 = vi.fn<(hostname: string) => Promise<string[]>>();
const mockResolve6 = vi.fn<(hostname: string) => Promise<string[]>>();

vi.mock('node:dns/promises', () => {
  const mod = {
    resolve4: (...args: Parameters<typeof mockResolve4>) => mockResolve4(...args),
    resolve6: (...args: Parameters<typeof mockResolve6>) => mockResolve6(...args),
  };
  return { ...mod, default: mod };
});

// Import after mocking
import { validateUrl, isBlockedIp } from '@/server/middleware/ssrf-guard.js';

describe('SSRF Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default, DNS resolves to a public IP
    mockResolve4.mockResolvedValue(['93.184.216.34']);
    mockResolve6.mockRejectedValue(new Error('no AAAA'));
  });

  // --- Scheme validation ---

  // REQ-ENG-012: block non-HTTP schemes
  it('blocks ftp:// scheme', async () => {
    await expect(validateUrl('ftp://example.com/file')).rejects.toThrow(SsrfError);
    await expect(validateUrl('ftp://example.com/file')).rejects.toThrow(/Scheme/);
  });

  it('blocks file:// scheme', async () => {
    await expect(validateUrl('file:///etc/passwd')).rejects.toThrow(SsrfError);
    await expect(validateUrl('file:///etc/passwd')).rejects.toThrow(/Scheme/);
  });

  it('blocks data: scheme', async () => {
    await expect(validateUrl('data:text/html,<h1>hi</h1>')).rejects.toThrow(SsrfError);
  });

  it('rejects invalid URLs', async () => {
    await expect(validateUrl('not-a-url')).rejects.toThrow(SsrfError);
    await expect(validateUrl('not-a-url')).rejects.toThrow(/Invalid URL/);
  });

  // --- Localhost and loopback ---

  it('blocks localhost hostname', async () => {
    await expect(validateUrl('http://localhost/api')).rejects.toThrow(SsrfError);
    await expect(validateUrl('http://localhost:8080/')).rejects.toThrow(SsrfError);
  });

  it('blocks 127.0.0.1', async () => {
    await expect(validateUrl('http://127.0.0.1/')).rejects.toThrow(SsrfError);
    await expect(validateUrl('http://127.0.0.1/')).rejects.toThrow(/blocked range/);
  });

  it('blocks 127.x.x.x range', async () => {
    await expect(validateUrl('http://127.0.0.2/')).rejects.toThrow(SsrfError);
    await expect(validateUrl('http://127.255.255.255/')).rejects.toThrow(SsrfError);
  });

  it('blocks ::1 (IPv6 loopback)', async () => {
    await expect(validateUrl('http://[::1]/')).rejects.toThrow(SsrfError);
  });

  // --- Private ranges ---

  it('blocks 10.x.x.x (Class A private)', async () => {
    await expect(validateUrl('http://10.0.0.1/')).rejects.toThrow(SsrfError);
    await expect(validateUrl('http://10.255.255.255/')).rejects.toThrow(SsrfError);
  });

  it('blocks 172.16-31.x.x (Class B private)', async () => {
    await expect(validateUrl('http://172.16.0.1/')).rejects.toThrow(SsrfError);
    await expect(validateUrl('http://172.31.255.255/')).rejects.toThrow(SsrfError);
  });

  it('allows 172.32.x.x (outside private range)', async () => {
    // 172.32.0.1 is a public IP literal — should be allowed
    await expect(validateUrl('http://172.32.0.1/')).resolves.toBeUndefined();
  });

  it('blocks 192.168.x.x (Class C private)', async () => {
    await expect(validateUrl('http://192.168.1.1/')).rejects.toThrow(SsrfError);
    await expect(validateUrl('http://192.168.0.1/')).rejects.toThrow(SsrfError);
  });

  it('blocks 0.0.0.0', async () => {
    await expect(validateUrl('http://0.0.0.0/')).rejects.toThrow(SsrfError);
  });

  it('blocks 169.254.x.x (link-local)', async () => {
    await expect(validateUrl('http://169.254.169.254/')).rejects.toThrow(SsrfError);
  });

  // --- DNS resolution based blocking ---

  it('blocks hostnames that resolve to private IPs', async () => {
    mockResolve4.mockResolvedValue(['10.0.0.5']);
    await expect(validateUrl('http://internal.example.com/')).rejects.toThrow(SsrfError);
    await expect(validateUrl('http://internal.example.com/')).rejects.toThrow(/resolves to blocked/);
  });

  // --- Public URLs ---

  it('allows valid public http URL', async () => {
    mockResolve4.mockResolvedValue(['93.184.216.34']);
    await expect(validateUrl('http://example.com/api/v1')).resolves.toBeUndefined();
  });

  it('allows valid public https URL', async () => {
    mockResolve4.mockResolvedValue(['93.184.216.34']);
    await expect(validateUrl('https://example.com/api/v1')).resolves.toBeUndefined();
  });

  it('allows public IP literals', async () => {
    await expect(validateUrl('http://93.184.216.34/')).resolves.toBeUndefined();
  });

  // --- isBlockedIp helper ---

  describe('isBlockedIp', () => {
    it('identifies private IPs as blocked', () => {
      expect(isBlockedIp('10.0.0.1')).toBe(true);
      expect(isBlockedIp('172.16.5.4')).toBe(true);
      expect(isBlockedIp('192.168.1.1')).toBe(true);
      expect(isBlockedIp('127.0.0.1')).toBe(true);
      expect(isBlockedIp('0.0.0.0')).toBe(true);
    });

    it('identifies public IPs as allowed', () => {
      expect(isBlockedIp('8.8.8.8')).toBe(false);
      expect(isBlockedIp('93.184.216.34')).toBe(false);
      expect(isBlockedIp('1.1.1.1')).toBe(false);
    });

    it('blocks IPv6 loopback', () => {
      expect(isBlockedIp('::1')).toBe(true);
    });

    it('blocks IPv6 unique-local (fc00::/7)', () => {
      expect(isBlockedIp('fd00::1')).toBe(true);
    });

    it('blocks IPv6 link-local (fe80::/10)', () => {
      expect(isBlockedIp('fe80::1')).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // REQ-SSRF-002 / SCENARIO-SSRF-LOCAL-001 — opt-in private networks
  // ------------------------------------------------------------------

  describe('ALLOW_PRIVATE_NETWORKS=true opt-in', () => {
    const originalFlag = process.env.ALLOW_PRIVATE_NETWORKS;

    beforeEach(() => {
      process.env.ALLOW_PRIVATE_NETWORKS = 'true';
    });

    afterEach(() => {
      if (originalFlag === undefined) {
        delete process.env.ALLOW_PRIVATE_NETWORKS;
      } else {
        process.env.ALLOW_PRIVATE_NETWORKS = originalFlag;
      }
    });

    it('accepts localhost when opt-in is set', async () => {
      await expect(validateUrl('http://localhost:8080/api')).resolves.toBeUndefined();
    });

    it('accepts 127.0.0.1 when opt-in is set', async () => {
      await expect(validateUrl('http://127.0.0.1:4000/')).resolves.toBeUndefined();
    });

    it('accepts 10.x.x.x when opt-in is set', async () => {
      await expect(validateUrl('http://10.0.0.5/api')).resolves.toBeUndefined();
    });

    it('accepts 192.168.x.x when opt-in is set', async () => {
      await expect(validateUrl('http://192.168.1.1/api')).resolves.toBeUndefined();
    });

    it('accepts hostnames that resolve to private IPs when opt-in is set', async () => {
      mockResolve4.mockResolvedValue(['10.0.0.5']);
      await expect(validateUrl('http://internal.example.com/')).resolves.toBeUndefined();
    });

    it('still blocks non-HTTP schemes even when opt-in is set', async () => {
      await expect(validateUrl('file:///etc/passwd')).rejects.toThrow(SsrfError);
      await expect(validateUrl('ftp://localhost/')).rejects.toThrow(SsrfError);
    });
  });

  describe('ALLOW_PRIVATE_NETWORKS unset (default)', () => {
    // Explicitly re-verify the default path still blocks, in case a prior
    // test leaked the env var.
    const originalFlag = process.env.ALLOW_PRIVATE_NETWORKS;

    beforeEach(() => {
      delete process.env.ALLOW_PRIVATE_NETWORKS;
    });

    afterEach(() => {
      if (originalFlag !== undefined) {
        process.env.ALLOW_PRIVATE_NETWORKS = originalFlag;
      }
    });

    it('blocks localhost when flag is unset', async () => {
      await expect(validateUrl('http://localhost/')).rejects.toThrow(SsrfError);
    });

    it('blocks 10.x.x.x when flag is unset', async () => {
      await expect(validateUrl('http://10.0.0.1/')).rejects.toThrow(SsrfError);
    });
  });
});
