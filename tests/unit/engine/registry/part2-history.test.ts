// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-PASS-003 (system history endpoint)
//   SCENARIO-DYN-SKIP-001 (class-not-declared skip)

// Unit tests for Part 2 System History conformance class test module (S09-05).

import { describe, it, expect, vi } from 'vitest';
import { part2HistoryTestModule } from '@/engine/registry/part2-history';
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

describe('Part 2 System History conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2HistoryTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/system-history',
      );
    });

    it('depends on Part 1 System class', () => {
      expect(part2HistoryTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 2 requirements', () => {
      expect(part2HistoryTestModule.classDefinition.requirements).toHaveLength(2);
    });

    it('is not a write operation', () => {
      expect(part2HistoryTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 2 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2HistoryTestModule.createTests(ctx);
      expect(tests).toHaveLength(2);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('System History Endpoint test', () => {
    it('passes when GET /systems/{id}/history returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-history/endpoint');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });

    it('fails when GET /systems/{id}/history returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not json' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('System History Revision test', () => {
    it('passes when history items have revision metadata', async () => {
      const body = JSON.stringify({
        items: [{ id: 'rev-1', revision: 1, modified: '2024-01-01T00:00:00Z' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-history/revision');
    });

    it('passes when history items have validTime metadata', async () => {
      const body = JSON.stringify({
        items: [{ id: 'rev-1', validTime: '2024-01-01T00:00:00Z/2024-12-31T23:59:59Z' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('passes when items array is empty', async () => {
      const body = JSON.stringify({ items: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when history item has no revision metadata', async () => {
      const body = JSON.stringify({
        items: [{ id: 'rev-1', name: 'some item' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('revision metadata');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not json' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-history/endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/system-history/revision',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2HistoryTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = part2HistoryTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('Connection refused');
      }
    });
  });
});
