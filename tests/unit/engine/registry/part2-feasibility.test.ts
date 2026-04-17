// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-PASS-005 (command feasibility endpoint)
//   SCENARIO-DYN-SKIP-001 (class-not-declared skip)

// Unit tests for Part 2 Command Feasibility conformance class test module (S09-04).

import { describe, it, expect, vi } from 'vitest';
import { part2FeasibilityTestModule } from '@/engine/registry/part2-feasibility';
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

function makeTestContext(overrides: {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
} = {}, cacheOverrides: Partial<DiscoveryCache> = {}): TestContext {
  return {
    httpClient: {
      request: vi.fn(),
      get: overrides.get ?? vi.fn(),
      post: overrides.post ?? vi.fn(),
      put: vi.fn(),
      patch: overrides.patch ?? vi.fn(),
      delete: overrides.delete ?? vi.fn(),
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

describe('Part 2 Command Feasibility conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2FeasibilityTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/feasibility',
      );
    });

    it('depends on Control Stream class', () => {
      expect(part2FeasibilityTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/controlstream',
      ]);
    });

    it('has 2 requirements', () => {
      expect(part2FeasibilityTestModule.classDefinition.requirements).toHaveLength(2);
    });

    it('is not a write operation', () => {
      expect(part2FeasibilityTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 2 executable tests', () => {
      const ctx = makeTestContext();
      const tests = part2FeasibilityTestModule.createTests(ctx);
      expect(tests).toHaveLength(2);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Feasibility Endpoint test', () => {
    it('passes when POST returns 200', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '{"status":"feasible"}' }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/feasibility/endpoint');
    });

    it('skips when no controlStreamId in discovery cache', async () => {
      const ctx = makeTestContext();
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No control streams');
    });

    it('skips when server returns 404 (optional feature)', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '' }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('404');
    });

    it('fails when POST returns non-200/non-404', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('500');
    });
  });

  describe('Feasibility Response test', () => {
    it('passes when response includes feasibility status', async () => {
      const body = JSON.stringify({ feasibilityStatus: 'feasible' });
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/feasibility/response');
    });

    it('passes when response includes status field', async () => {
      const body = JSON.stringify({ status: 'feasible' });
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('skips when no controlStreamId in discovery cache', async () => {
      const ctx = makeTestContext();
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('skips when server returns 404', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '' }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when response does not include feasibility status', async () => {
      const body = JSON.stringify({ result: 'ok' });
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('feasibility status');
    });

    it('fails when response body is not valid JSON', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: 'not json' }),
      );
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/feasibility/endpoint',
        '/req/feasibility/response',
      ];

      const ctx = makeTestContext();
      const tests = part2FeasibilityTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const postMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext({ post: postMock }, { controlStreamId: 'cs-1' });
      const tests = part2FeasibilityTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('Connection refused');
      }
    });
  });
});
