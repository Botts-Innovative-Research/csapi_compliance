// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-TEST-FILTER-001 (filter params applied to Part 2 collections)
//   SCENARIO-DYN-PASS-001..005 (per-class filter acceptance)

// Unit tests for Part 2 Advanced Filtering conformance class test module (S09-05).

import { describe, it, expect, vi } from 'vitest';
import { part2FilteringTestModule } from '@/engine/registry/part2-filtering';
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

describe('Part 2 Advanced Filtering conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2FilteringTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/advanced-filtering',
      );
    });

    it('depends on Datastream class', () => {
      expect(part2FilteringTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream',
      ]);
    });

    it('has 4 requirements', () => {
      expect(part2FilteringTestModule.classDefinition.requirements).toHaveLength(4);
    });

    it('is not a write operation', () => {
      expect(part2FilteringTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 4 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2FilteringTestModule.createTests(ctx);
      expect(tests).toHaveLength(4);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Phenomenon Time filter test', () => {
    it('passes when GET /observations?phenomenonTime=... returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/phenomenonTime');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No datastreams');
    });

    it('fails when GET returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('400');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: 'not json' }));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Result Time filter test', () => {
    it('passes when GET /observations?resultTime=... returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/resultTime');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when GET returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });
  });

  describe('Observed Property filter test', () => {
    it('passes when GET /datastreams?observedProperty=... returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/observedProperty');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when GET returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('400');
    });
  });

  describe('Combined Filters test', () => {
    it('passes when combined filters return 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/advanced-filtering/combined');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when combined filters return non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('400');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: 'not json' }));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/advanced-filtering/phenomenonTime',
        '/req/advanced-filtering/resultTime',
        '/req/advanced-filtering/observedProperty',
        '/req/advanced-filtering/combined',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = part2FilteringTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('Connection refused');
      }
    });
  });
});
