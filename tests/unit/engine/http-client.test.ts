// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-CAP-BASIC-001..003 (request/response capture)
//   SCENARIO-CAP-POST-004 (POST body capture)
//   SCENARIO-CAP-LARGE-001..002, SCENARIO-CAP-BINARY-001 (body-size + binary handling)
//   SCENARIO-CAP-TIMING-001, SCENARIO-CAP-ERROR-001..002 (timing + network errors)
//   SCENARIO-ENG-TIMEOUT-001..002 (HTTP timeout semantics)
//   SCENARIO-SSRF-LOCAL-001..002 (private-network opt-in; see also ssrf-guard.test.ts)

// Tests for CaptureHttpClient — src/engine/http-client.ts
// REQ-ENG-011: Request timeout enforcement
// REQ-ENG-012: Graceful network error handling (no cascading failures)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthConfig } from '@/lib/types.js';
import { TimeoutError, NetworkError, SsrfError } from '@/engine/errors.js';

// --- Mocks ---

// Mock the SSRF guard — we test it separately in ssrf-guard.test.ts
const mockValidateUrl = vi.fn<(url: string) => Promise<void>>();
vi.mock('@/server/middleware/ssrf-guard.js', () => ({
  validateUrl: (url: string) => mockValidateUrl(url),
}));

// Mock global fetch
const mockFetch = vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { CaptureHttpClient } from '@/engine/http-client.js';

/**
 * Helper: create a mock Response object.
 */
function createMockResponse(opts: {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}): Response {
  const status = opts.status ?? 200;
  const headers = new Headers(opts.headers ?? { 'content-type': 'application/json' });
  const body = opts.body ?? '{"ok":true}';

  return {
    status,
    headers,
    ok: status >= 200 && status < 300,
    text: vi.fn().mockResolvedValue(body),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(Buffer.byteLength(body))),
  } as unknown as Response;
}

describe('CaptureHttpClient', () => {
  const noAuth: AuthConfig = { type: 'none' };

  beforeEach(() => {
    vi.clearAllMocks();
    // By default, SSRF guard allows all URLs
    mockValidateUrl.mockResolvedValue(undefined);
    // By default, fetch returns a simple 200 JSON response
    mockFetch.mockResolvedValue(createMockResponse({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Auth header tests ---

  // REQ-ENG-011, REQ-ENG-012
  describe('authentication headers', () => {
    it('applies Bearer auth header', async () => {
      const auth: AuthConfig = { type: 'bearer', token: 'my-token-123' };
      const client = new CaptureHttpClient(auth);

      await client.get('http://example.com/api');

      expect(mockFetch).toHaveBeenCalledOnce();
      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer my-token-123');
    });

    it('applies API key auth header', async () => {
      const auth: AuthConfig = {
        type: 'apikey',
        headerName: 'X-API-Key',
        headerValue: 'secret-key-456',
      };
      const client = new CaptureHttpClient(auth);

      await client.get('http://example.com/api');

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('secret-key-456');
    });

    it('applies Basic auth header', async () => {
      const auth: AuthConfig = {
        type: 'basic',
        username: 'user',
        password: 'pass',
      };
      const client = new CaptureHttpClient(auth);

      await client.get('http://example.com/api');

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      const expectedBase64 = Buffer.from('user:pass').toString('base64');
      expect(headers['Authorization']).toBe(`Basic ${expectedBase64}`);
    });

    it('sends no auth header when type is none', async () => {
      const client = new CaptureHttpClient(noAuth);

      await client.get('http://example.com/api');

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('merges caller-supplied headers with auth headers', async () => {
      const auth: AuthConfig = { type: 'bearer', token: 'tok' };
      const client = new CaptureHttpClient(auth);

      await client.get('http://example.com/api', { 'Accept': 'application/json' });

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer tok');
      expect(headers['Accept']).toBe('application/json');
    });
  });

  // --- Timeout ---

  // REQ-ENG-011: Request timeout enforcement
  describe('timeout handling', () => {
    it('throws TimeoutError when request times out', async () => {
      const timeoutErr = new DOMException('The operation was aborted.', 'TimeoutError');
      mockFetch.mockRejectedValue(timeoutErr);

      const client = new CaptureHttpClient(noAuth, 5000);

      await expect(client.get('http://example.com/slow')).rejects.toThrow(TimeoutError);
      await expect(
        client.request({ method: 'GET', url: 'http://example.com/slow' })
      ).rejects.toThrow(TimeoutError);
    });

    it('passes timeout to AbortSignal.timeout', async () => {
      const spy = vi.spyOn(AbortSignal, 'timeout');
      const client = new CaptureHttpClient(noAuth, 15000);

      await client.get('http://example.com/api');

      expect(spy).toHaveBeenCalledWith(15000);
      spy.mockRestore();
    });

    it('uses per-request timeout when provided', async () => {
      const spy = vi.spyOn(AbortSignal, 'timeout');
      const client = new CaptureHttpClient(noAuth, 30000);

      await client.request({
        method: 'GET',
        url: 'http://example.com/api',
        timeoutMs: 5000,
      });

      expect(spy).toHaveBeenCalledWith(5000);
      spy.mockRestore();
    });

    it('TimeoutError includes url and timeoutMs', async () => {
      const timeoutErr = new DOMException('Aborted', 'TimeoutError');
      mockFetch.mockRejectedValue(timeoutErr);

      const client = new CaptureHttpClient(noAuth, 7000);

      try {
        await client.get('http://example.com/slow');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(TimeoutError);
        const te = err as TimeoutError;
        expect(te.url).toBe('http://example.com/slow');
        expect(te.timeoutMs).toBe(7000);
      }
    });
  });

  // --- SSRF guard integration ---

  describe('SSRF guard', () => {
    it('delegates URL validation to SSRF guard', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.get('http://example.com/api');
      expect(mockValidateUrl).toHaveBeenCalledWith('http://example.com/api');
    });

    it('throws SsrfError when SSRF guard rejects', async () => {
      mockValidateUrl.mockRejectedValue(new SsrfError('http://127.0.0.1/', 'blocked'));
      const client = new CaptureHttpClient(noAuth);
      await expect(client.get('http://127.0.0.1/')).rejects.toThrow(SsrfError);
    });

    it('does not call fetch when SSRF guard rejects', async () => {
      mockValidateUrl.mockRejectedValue(new SsrfError('http://10.0.0.1/', 'blocked'));
      const client = new CaptureHttpClient(noAuth);
      await expect(client.get('http://10.0.0.1/')).rejects.toThrow(SsrfError);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // --- Exchange capture ---

  describe('exchange capture', () => {
    it('captures exchange for each request', async () => {
      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/api');

      expect(resp.exchange).toBeDefined();
      expect(resp.exchange.id).toBeTruthy();
      expect(resp.exchange.request.method).toBe('GET');
      expect(resp.exchange.request.url).toBe('http://example.com/api');
      expect(resp.exchange.response.statusCode).toBe(200);
    });

    it('stores exchanges in getExchanges()', async () => {
      const client = new CaptureHttpClient(noAuth);
      expect(client.getExchanges().size).toBe(0);

      await client.get('http://example.com/a');
      await client.get('http://example.com/b');

      expect(client.getExchanges().size).toBe(2);
    });

    it('clearExchanges() empties the map', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.get('http://example.com/a');
      expect(client.getExchanges().size).toBe(1);

      client.clearExchanges();
      expect(client.getExchanges().size).toBe(0);
    });

    it('exchange IDs are unique UUIDs', async () => {
      const client = new CaptureHttpClient(noAuth);
      const r1 = await client.get('http://example.com/a');
      const r2 = await client.get('http://example.com/b');

      expect(r1.exchange.id).not.toBe(r2.exchange.id);
      // UUID v4 format
      expect(r1.exchange.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    it('captures request body when present', async () => {
      const client = new CaptureHttpClient(noAuth);
      const resp = await client.post('http://example.com/api', { key: 'value' });

      expect(resp.exchange.request.body).toBe('{"key":"value"}');
    });

    it('captures response headers', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({
          headers: { 'content-type': 'application/json', 'x-custom': 'hello' },
        })
      );
      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/api');

      expect(resp.exchange.response.headers['content-type']).toBe('application/json');
      expect(resp.exchange.response.headers['x-custom']).toBe('hello');
    });
  });

  // --- Response body truncation ---

  describe('response body truncation', () => {
    it('truncates body larger than maxResponseBodySizeBytes', async () => {
      // Create a response larger than 5MB
      const largeBody = 'x'.repeat(6 * 1024 * 1024);
      mockFetch.mockResolvedValue(
        createMockResponse({ body: largeBody })
      );

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/large');

      expect(resp.body.length).toBeLessThanOrEqual(5 * 1024 * 1024);
      expect(resp.exchange.metadata.truncated).toBe(true);
    });

    it('does not truncate body within limit', async () => {
      const body = '{"data":"small"}';
      mockFetch.mockResolvedValue(createMockResponse({ body }));

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/small');

      expect(resp.body).toBe(body);
      expect(resp.exchange.metadata.truncated).toBe(false);
    });
  });

  // --- Binary content detection ---

  describe('binary content detection', () => {
    it('detects binary content from Content-Type', async () => {
      const binaryResponse = {
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        ok: true,
        text: vi.fn().mockResolvedValue(''),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024)),
      } as unknown as Response;
      mockFetch.mockResolvedValue(binaryResponse);

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/image.png');

      expect(resp.exchange.metadata.binaryBody).toBe(true);
      expect(resp.body).toContain('[binary content:');
    });

    it('does not flag JSON as binary', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ headers: { 'content-type': 'application/json' } })
      );

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/api');

      expect(resp.exchange.metadata.binaryBody).toBe(false);
    });

    it('does not flag text/html as binary', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ headers: { 'content-type': 'text/html; charset=utf-8' }, body: '<h1>hi</h1>' })
      );

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/page');

      expect(resp.exchange.metadata.binaryBody).toBe(false);
    });

    it('does not flag application/geo+json as binary', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ headers: { 'content-type': 'application/geo+json' } })
      );

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/geojson');

      expect(resp.exchange.metadata.binaryBody).toBe(false);
    });
  });

  // --- Network error handling ---

  // REQ-ENG-012: Graceful network error handling
  describe('network error handling', () => {
    it('wraps DNS/connection errors as NetworkError', async () => {
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      const client = new CaptureHttpClient(noAuth);
      await expect(client.get('http://nonexistent.invalid/')).rejects.toThrow(NetworkError);
    });

    it('NetworkError includes url and cause', async () => {
      const cause = new TypeError('fetch failed: ENOTFOUND');
      mockFetch.mockRejectedValue(cause);

      const client = new CaptureHttpClient(noAuth);
      try {
        await client.get('http://nonexistent.invalid/');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NetworkError);
        const ne = err as NetworkError;
        expect(ne.url).toBe('http://nonexistent.invalid/');
        expect(ne.cause).toBe(cause);
      }
    });

    it('wraps unexpected errors as NetworkError', async () => {
      mockFetch.mockRejectedValue(new Error('unexpected socket hangup'));

      const client = new CaptureHttpClient(noAuth);
      await expect(client.get('http://example.com/')).rejects.toThrow(NetworkError);
    });
  });

  // --- Convenience methods ---

  describe('convenience methods', () => {
    it('get() delegates to request() with GET method', async () => {
      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/api');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.method).toBe('GET');
      expect(resp.statusCode).toBe(200);
    });

    it('post() delegates to request() with POST method and body', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.post('http://example.com/api', { key: 'val' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.method).toBe('POST');
      expect(callArgs[1]?.body).toBe('{"key":"val"}');
    });

    it('put() delegates to request() with PUT method', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.put('http://example.com/api', { key: 'val' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.method).toBe('PUT');
    });

    it('patch() delegates to request() with PATCH method', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.patch('http://example.com/api', { key: 'val' });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.method).toBe('PATCH');
    });

    it('delete() delegates to request() with DELETE method', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.delete('http://example.com/api');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.method).toBe('DELETE');
    });

    it('post() auto-sets Content-Type for object bodies', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.post('http://example.com/api', { data: 1 });

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('post() does not override explicit Content-Type', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.post('http://example.com/api', { data: 1 }, {
        'Content-Type': 'application/ld+json',
      });

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/ld+json');
    });

    it('post() sends string body as-is', async () => {
      const client = new CaptureHttpClient(noAuth);
      await client.post('http://example.com/api', '<xml/>');

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1]?.body).toBe('<xml/>');
    });
  });

  // --- Response properties ---

  describe('response properties', () => {
    it('returns statusCode from the response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ status: 404 }));

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/missing');

      expect(resp.statusCode).toBe(404);
    });

    it('returns responseTimeMs >= 0', async () => {
      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/api');

      expect(resp.responseTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('exchange metadata records bodySize', async () => {
      const body = '{"hello":"world"}';
      mockFetch.mockResolvedValue(createMockResponse({ body }));

      const client = new CaptureHttpClient(noAuth);
      const resp = await client.get('http://example.com/api');

      expect(resp.exchange.metadata.bodySize).toBe(Buffer.byteLength(body));
    });
  });
});
