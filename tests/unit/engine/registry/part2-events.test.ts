// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-PASS-004 (SystemEvents read-path conformance)
//   SCENARIO-DYN-SKIP-001 (class-not-declared skip)

// Unit tests for Part 2 System Events conformance class test module (S09-04).

import { describe, it, expect, vi } from 'vitest';
import { part2EventsTestModule } from '@/engine/registry/part2-events';
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

describe('Part 2 System Events conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2EventsTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/system-event',
      );
    });

    it('depends on Part 1 System class', () => {
      expect(part2EventsTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 3 requirements', () => {
      expect(part2EventsTestModule.classDefinition.requirements).toHaveLength(3);
    });

    it('is not a write operation', () => {
      expect(part2EventsTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 3 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      expect(tests).toHaveLength(3);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('System Events Resources Endpoint test', () => {
    it('passes when GET /systemEvents returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-event/resources-endpoint');
    });

    it('fails when GET /systemEvents returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not json' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('System Event Ref from System test', () => {
    it('passes when GET /systems/{id}/events returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-event/ref-from-system');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });

    it('fails when GET /systems/{id}/events returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });
  });

  describe('System Event Schema test', () => {
    it('passes when events have required fields', async () => {
      const body = JSON.stringify({
        items: [{ id: 'evt-1', eventType: 'created', time: '2024-01-01T00:00:00Z' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-event/event-schema');
    });

    it('passes when items array is empty', async () => {
      const body = JSON.stringify({ items: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('fails when event is missing required fields', async () => {
      const body = JSON.stringify({
        items: [{ id: 'evt-1' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('eventType');
      expect(result.failureMessage).toContain('time');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not json' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when GET returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-event/resources-endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-event/ref-from-system',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-event/event-schema',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2EventsTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2EventsTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('ECONNREFUSED');
      }
    });
  });
});
