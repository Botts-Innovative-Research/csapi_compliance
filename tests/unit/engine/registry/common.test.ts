// Unit tests for OGC API Common Part 1 Core conformance class test module (S02-01).
// SCENARIO-TEST-PASS-001: Conformance tests produce correct PASS verdicts for conformant responses (CRITICAL)
// SCENARIO-TEST-PASS-002: Conformance tests produce correct FAIL verdicts for non-conformant responses (CRITICAL)
// Note: these two scenarios are exercised by every module in tests/unit/engine/registry/;
// this file is the canonical reference for both.

import { describe, it, expect, vi } from 'vitest';
import { commonTestModule } from '@/engine/registry/common';
import type {
  TestContext,
  HttpResponse,
  HttpExchange,
  DiscoveryCache,
} from '@/lib/types';

// --- Helpers ---

let exchangeCounter = 0;

function makeExchange(): HttpExchange {
  return {
    id: `ex-${++exchangeCounter}`,
    request: { method: 'GET', url: 'http://example.com', headers: {} },
    response: { statusCode: 200, headers: {}, body: '', responseTimeMs: 10 },
    metadata: { truncated: false, binaryBody: false, bodySize: 0 },
  };
}

function makeHttpResponse(overrides: Partial<HttpResponse> = {}): HttpResponse {
  const exchange = makeExchange();
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: '{}',
    responseTimeMs: 10,
    exchange,
    ...overrides,
  };
}

function makeDiscoveryCache(overrides: Partial<DiscoveryCache> = {}): DiscoveryCache {
  return {
    landingPage: {},
    conformsTo: [],
    collectionIds: [],
    links: [],
    ...overrides,
  };
}

function makeTestContext(
  getMock: ReturnType<typeof vi.fn>,
): TestContext {
  return {
    httpClient: {
      request: vi.fn(),
      get: getMock,
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
    schemaValidator: {
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    },
    baseUrl: 'http://example.com',
    auth: { type: 'none' },
    config: { timeoutMs: 30000, concurrency: 5 },
    discoveryCache: makeDiscoveryCache(),
    cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: vi.fn() },
  };
}

// --- Tests ---

describe('OGC API Common - Core conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(commonTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core',
      );
    });

    it('has no dependencies (root class)', () => {
      expect(commonTestModule.classDefinition.dependencies).toEqual([]);
    });

    it('has 6 requirements', () => {
      expect(commonTestModule.classDefinition.requirements).toHaveLength(6);
    });

    it('is not a write operation', () => {
      expect(commonTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 6 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      expect(tests).toHaveLength(6);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Landing Page test', () => {
    it('passes when response is 200 with valid JSON', async () => {
      const landingBody = JSON.stringify({
        title: 'Test API',
        links: [
          { rel: 'self', href: 'http://example.com' },
          { rel: 'service-desc', href: 'http://example.com/api' },
          { rel: 'conformance', href: 'http://example.com/conformance' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: landingBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const landingPageTest = tests[0];

      const result = await landingPageTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/landing-page');
      expect(result.conformanceUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/ogcapi-common/landing-page');
    });

    it('fails when response status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const landingPageTest = tests[0];

      const result = await landingPageTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: '<html>not json</html>' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const landingPageTest = tests[0];

      const result = await landingPageTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Landing Page Links test', () => {
    it('passes when all required links are present', async () => {
      const landingBody = JSON.stringify({
        links: [
          { rel: 'self', href: 'http://example.com' },
          { rel: 'service-desc', href: 'http://example.com/api' },
          { rel: 'conformance', href: 'http://example.com/conformance' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: landingBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const linksTest = tests[1];

      const result = await linksTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/landing-page-links');
    });

    it('fails when links are missing', async () => {
      const landingBody = JSON.stringify({
        links: [
          { rel: 'self', href: 'http://example.com' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: landingBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const linksTest = tests[1];

      const result = await linksTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('service-desc');
      expect(result.failureMessage).toContain('conformance');
    });

    it('fails when links property is missing', async () => {
      const landingBody = JSON.stringify({ title: 'No links' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: landingBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const linksTest = tests[1];

      const result = await linksTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links array');
    });
  });

  describe('Conformance Endpoint test', () => {
    it('passes when conformance returns 200 with JSON', async () => {
      const confBody = JSON.stringify({ conformsTo: ['http://example.com/conf/core'] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: confBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const confTest = tests[2];

      const result = await confTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/conformance');
    });

    it('fails when conformance returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Server Error' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const confTest = tests[2];

      const result = await confTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('500');
    });
  });

  describe('Conformance conformsTo Array test', () => {
    it('passes when conformsTo array is present', async () => {
      const confBody = JSON.stringify({
        conformsTo: ['http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core'],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: confBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const conformsToTest = tests[3];

      const result = await conformsToTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/conformance-conformsTo');
    });

    it('fails when conformsTo is missing', async () => {
      const confBody = JSON.stringify({ title: 'No conformsTo' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: confBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const conformsToTest = tests[3];

      const result = await conformsToTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('conformsTo');
    });

    it('fails when conformsTo is not an array', async () => {
      const confBody = JSON.stringify({ conformsTo: 'not-an-array' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: confBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const conformsToTest = tests[3];

      const result = await conformsToTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('conformsTo');
    });
  });

  describe('API Definition Link test', () => {
    it('passes when service-desc link returns valid document', async () => {
      const landingBody = JSON.stringify({
        links: [
          { rel: 'self', href: 'http://example.com' },
          { rel: 'service-desc', href: '/api' },
          { rel: 'conformance', href: '/conformance' },
        ],
      });
      const apiBody = JSON.stringify({ openapi: '3.0.0', info: { title: 'API' } });

      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ body: landingBody }))
        .mockResolvedValueOnce(makeHttpResponse({ body: apiBody }));

      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const apiDefTest = tests[4];

      const result = await apiDefTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/api-definition');
      expect(result.exchangeIds).toHaveLength(2);
    });

    it('fails when NEITHER service-desc nor service-doc is present (SCENARIO-API-DEF-FALLBACK-001)', async () => {
      // OGC 19-072 /req/landing-page/root-success permits service-desc OR
      // service-doc. FAIL only when BOTH are absent. Failure message names both.
      const landingBody = JSON.stringify({
        links: [
          { rel: 'self', href: 'http://example.com' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: landingBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const apiDefTest = tests[4];

      const result = await apiDefTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('service-desc');
      expect(result.failureMessage).toContain('service-doc');
      expect(result.failureMessage).toMatch(/19-072|landing-page\/root-success/);
    });

    it('PASSES when only service-doc is present (SCENARIO-API-DEF-FALLBACK-001 fallback)', async () => {
      // Closes `api-definition-service-doc-fallback`: a server exposing
      // HTML-only API docs (rel="service-doc") is spec-conformant per
      // OGC 19-072 and must NOT be flagged as failing.
      const landingBody = JSON.stringify({
        links: [
          { rel: 'self', href: 'http://example.com' },
          { rel: 'service-doc', href: '/api/docs.html' },
          { rel: 'conformance', href: '/conformance' },
        ],
      });
      const htmlBody = '<!doctype html><html><body><h1>API Docs</h1></body></html>';

      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ body: landingBody }))
        .mockResolvedValueOnce(makeHttpResponse({
          headers: { 'content-type': 'text/html' },
          body: htmlBody,
        }));

      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const apiDefTest = tests[4];

      const result = await apiDefTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/api-definition');
      expect(result.exchangeIds).toHaveLength(2);
      // Sanity: the second GET was against the service-doc URL, not service-desc.
      expect(getMock.mock.calls[1][0]).toContain('/api/docs.html');
    });

    it('prefers service-desc over service-doc when BOTH are present', async () => {
      // When a landing page exposes both, service-desc (machine-readable) is
      // the canonical API definition per OGC 19-072 and SHOULD be fetched.
      const landingBody = JSON.stringify({
        links: [
          { rel: 'self', href: 'http://example.com' },
          { rel: 'service-doc', href: '/api/docs.html' },
          { rel: 'service-desc', href: '/api/openapi.json' },
        ],
      });
      const openapiBody = JSON.stringify({ openapi: '3.0.3', info: { title: 'API' } });

      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ body: landingBody }))
        .mockResolvedValueOnce(makeHttpResponse({ body: openapiBody }));

      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const apiDefTest = tests[4];

      const result = await apiDefTest.execute(ctx);

      expect(result.status).toBe('pass');
      // The fetched URL must be the service-desc one, not service-doc.
      expect(getMock.mock.calls[1][0]).toContain('/api/openapi.json');
      expect(getMock.mock.calls[1][0]).not.toContain('docs.html');
    });

    it('fails when chosen API definition link returns non-200 (message names chosen rel)', async () => {
      const landingBody = JSON.stringify({
        links: [
          { rel: 'service-desc', href: '/api' },
        ],
      });
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ body: landingBody }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 404, body: '' }));

      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const apiDefTest = tests[4];

      const result = await apiDefTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('404');
      // Failure message must identify WHICH rel was chosen, to aid debugging.
      expect(result.failureMessage).toContain('service-desc');
    });

    it('fails when chosen link returns empty body (service-doc fallback path)', async () => {
      // Even via the service-doc fallback, the server must return a non-empty
      // document — an empty response can't be a meaningful API definition.
      const landingBody = JSON.stringify({
        links: [
          { rel: 'service-doc', href: '/docs' },
        ],
      });
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ body: landingBody }))
        .mockResolvedValueOnce(makeHttpResponse({
          headers: { 'content-type': 'text/html' },
          body: '   ',  // whitespace-only body
        }));

      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const apiDefTest = tests[4];

      const result = await apiDefTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('non-empty');
      expect(result.failureMessage).toContain('service-doc');
    });
  });

  describe('JSON Content-Type Header test', () => {
    it('passes when Content-Type is application/json', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/json' },
          body: '{}',
        }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const contentTypeTest = tests[5];

      const result = await contentTypeTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/json-content-type');
    });

    it('passes when Content-Type includes charset parameter', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: '{}',
        }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const contentTypeTest = tests[5];

      const result = await contentTypeTest.execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('fails when Content-Type is not application/json', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'text/html' },
          body: '<html></html>',
        }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const contentTypeTest = tests[5];

      const result = await contentTypeTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('application/json');
      expect(result.failureMessage).toContain('text/html');
    });

    it('fails when Content-Type header is missing', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: {},
          body: '{}',
        }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);
      const contentTypeTest = tests[5];

      const result = await contentTypeTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('application/json');
    });
  });

  describe('requirement URIs', () => {
    it('each test produces correct requirement URI in result', async () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/landing-page',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/landing-page-links',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/conformance',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/conformance-conformsTo',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/api-definition',
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/json-content-type',
      ];

      // Use a valid landing page with service-desc so all tests can run
      const landingBody = JSON.stringify({
        links: [
          { rel: 'self', href: 'http://example.com' },
          { rel: 'service-desc', href: '/api' },
          { rel: 'conformance', href: '/conformance' },
        ],
      });
      const confBody = JSON.stringify({
        conformsTo: ['http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core'],
      });

      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: landingBody }),
      );
      const ctx = makeTestContext(getMock);
      const tests = commonTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        // Reset mock for each test to provide appropriate responses
        if (i === 2 || i === 3) {
          getMock.mockResolvedValue(makeHttpResponse({ body: confBody }));
        } else if (i === 4) {
          getMock.mockResolvedValueOnce(makeHttpResponse({ body: landingBody }));
          getMock.mockResolvedValueOnce(makeHttpResponse({ body: '{ "openapi": "3.0" }' }));
        } else {
          getMock.mockResolvedValue(makeHttpResponse({ body: landingBody }));
        }

        const result = await tests[i].execute(ctx);
        expect(result.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
