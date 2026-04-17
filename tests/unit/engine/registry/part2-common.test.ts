// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-PASS-001 (Part 2 API Common dependencies)
//   SCENARIO-DYN-DEP-001 (cs-core prereq for dynamic-data classes)

// Unit tests for Connected Systems Part 2 — API Common conformance class test module (S09-01).

import { describe, it, expect, vi } from 'vitest';
import { part2CommonTestModule } from '@/engine/registry/part2-common';
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

describe('Connected Systems Part 2 - API Common conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2CommonTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/api-common',
      );
    });

    it('depends on CS Part 1 Core', () => {
      expect(part2CommonTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
      ]);
    });

    it('has 2 requirements', () => {
      expect(part2CommonTestModule.classDefinition.requirements).toHaveLength(2);
    });

    it('is not a write operation', () => {
      expect(part2CommonTestModule.classDefinition.isWriteOperation).toBe(false);
    });

    it('belongs to cs-part2 standard part', () => {
      expect(part2CommonTestModule.classDefinition.standardPart).toBe('cs-part2');
    });
  });

  describe('createTests', () => {
    it('creates 2 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);
      expect(tests).toHaveLength(2);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Part 2 Resource Endpoints test', () => {
    it('passes when at least one Part 2 endpoint returns 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: JSON.stringify({ items: [] }) }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/api-common/resources');
    });

    it('fails when no Part 2 endpoints return 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Part 2 resource endpoint');
    });

    it('passes when only some endpoints return 200', async () => {
      let callCount = 0;
      const getMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(makeHttpResponse({ statusCode: 200, body: JSON.stringify({ items: [] }) }));
        }
        return Promise.resolve(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));
      });
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('fails when all endpoints throw errors', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
    });
  });

  describe('Part 2 Resource Collections test', () => {
    it('passes when collections contain a Part 2 collection', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'datastreams', title: 'Datastreams', links: [] },
          { id: 'systems', title: 'Systems', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/api-common/resource-collection');
    });

    it('fails when no Part 2 collections exist', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'systems', title: 'Systems', links: [] },
          { id: 'deployments', title: 'Deployments', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Part 2');
    });

    it('fails when collections array is missing', async () => {
      const body = JSON.stringify({ title: 'No collections' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: '<html>not json</html>' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Connection refused');
    });

    it('detects Part 2 collection by itemType', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'my-data', itemType: 'Observation', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/api-common/resources',
        '/req/api-common/resource-collection',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2CommonTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
