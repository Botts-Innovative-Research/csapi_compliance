// Unit tests for Advanced Filtering conformance class test module (S03-05).

import { describe, it, expect, vi } from 'vitest';
import { filteringTestModule } from '@/engine/registry/filtering';
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
  cacheOverrides: Partial<DiscoveryCache> = {},
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
    discoveryCache: makeDiscoveryCache(cacheOverrides),
    cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: vi.fn() },
  };
}

// --- Tests ---

describe('Advanced Filtering conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(filteringTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/advanced-filtering',
      );
    });

    it('depends on CS API System', () => {
      expect(filteringTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 6 requirements', () => {
      expect(filteringTestModule.classDefinition.requirements).toHaveLength(6);
    });

    it('is not a write operation', () => {
      expect(filteringTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 6 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = filteringTestModule.createTests(ctx);
      expect(tests).toHaveLength(6);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('ID List Schema test', () => {
    it('passes when GET /systems?id={id1},{id2} returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/id-list-schema');
    });

    it('fails when GET /systems?id=... returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 400, body: 'Bad Request' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('400');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: 'not json' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Resource by ID test', () => {
    it('passes when GET /systems?id={id} returns 200', async () => {
      const body = JSON.stringify({ items: [{ id: 'sys-1' }], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/resource-by-id');
    });

    it('fails when GET /systems?id={id} returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 500, body: 'Error' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Resource by Keyword test', () => {
    it('passes when GET /systems?q=keyword returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/resource-by-keyword');
    });

    it('fails when GET /systems?q=keyword returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 400, body: 'Bad Request' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('400');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Feature by Geometry test', () => {
    it('passes when GET /systems?bbox=... returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/feature-by-geom');
    });

    it('fails when GET /systems?bbox=... returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 400, body: 'Bad Request' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('400');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('System by Procedure test', () => {
    it('passes when GET /systems?procedure={id} returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1', procedureId: 'proc-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/system-by-procedure');
    });

    it('fails when GET /systems?procedure={id} returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 400, body: 'Bad Request' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('400');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('uses fallback procedure URI when no procedureId available', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
    });
  });

  describe('Combined Filters test', () => {
    it('passes when combined filters return 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/combined-filters');
    });

    it('fails when combined filters return non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 400, body: 'Bad Request' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('400');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: 'not json' }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/advanced-filtering/id-list-schema',
        '/req/advanced-filtering/resource-by-id',
        '/req/advanced-filtering/resource-by-keyword',
        '/req/advanced-filtering/feature-by-geom',
        '/req/advanced-filtering/system-by-procedure',
        '/req/advanced-filtering/combined-filters',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = filteringTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('Connection refused');
      }
    });
  });
});
