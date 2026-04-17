// Unit tests for Connected Systems Part 1 — Subdeployments conformance class test module (S03-03).

import { describe, it, expect, vi } from 'vitest';
import { subdeploymentsTestModule } from '@/engine/registry/subdeployments';
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

// --- Reusable response bodies ---

function validSubdeploymentsBody() {
  return JSON.stringify({
    items: [
      {
        id: 'subdep-1',
        name: 'Sub Deployment 1',
        links: [
          { rel: 'self', href: 'http://example.com/deployments/subdep-1' },
          { rel: 'parent', href: 'http://example.com/deployments/dep-1' },
        ],
      },
    ],
  });
}

function emptySubdeploymentsBody() {
  return JSON.stringify({ items: [] });
}

// --- Tests ---

describe('Connected Systems - Subdeployments conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(subdeploymentsTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subdeployment',
      );
    });

    it('depends on Deployment Features class', () => {
      expect(subdeploymentsTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment',
      ]);
    });

    it('has 4 requirements', () => {
      expect(subdeploymentsTestModule.classDefinition.requirements).toHaveLength(4);
    });

    it('is not a write operation', () => {
      expect(subdeploymentsTestModule.classDefinition.isWriteOperation).toBe(false);
    });

    it('belongs to cs-part1 standard part', () => {
      expect(subdeploymentsTestModule.classDefinition.standardPart).toBe('cs-part1');
    });
  });

  describe('createTests', () => {
    it('creates 4 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = subdeploymentsTestModule.createTests(ctx);
      expect(tests).toHaveLength(4);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Subdeployments Collection test', () => {
    it('passes when GET /deployments/{id}/subdeployments returns 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSubdeploymentsBody() }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/subdeployment/collection');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not json' }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('skips when no deploymentId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No deployments');
    });
  });

  describe('Subdeployments Recursive Parameter test', () => {
    it('passes when recursive=true is accepted with 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSubdeploymentsBody() }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/subdeployment/recursive-param');
    });

    it('fails when recursive request returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('400');
    });

    it('skips when no deploymentId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Subdeployments Recursive Search test', () => {
    it('passes when recursive response contains items array', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSubdeploymentsBody() }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/subdeployment/recursive-search-deployments');
    });

    it('fails when items array is missing from recursive response', async () => {
      const body = JSON.stringify({ results: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('items');
    });

    it('fails when recursive response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'broken' }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('skips when no deploymentId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Subdeployment Parent Association test', () => {
    it('passes when subdeployment has a parent link', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSubdeploymentsBody() }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/subdeployment/recursive-assoc');
    });

    it('SKIPs when subdeployment has no parent link (non-normative per OGC 23-001 rubric-6.1 audit)', async () => {
      // REQ-TEST-CITE-002: OGC 23-001 /req/subdeployment/recursive-assoc is
      // about recursive aggregation of deployedSystems/samplingFeatures/etc
      // on the parent — it does NOT mandate rel="parent"/"up" on subdeployment
      // resources. Per GH #3 precedent, absence is SKIP (not FAIL).
      const body = JSON.stringify({
        items: [
          {
            id: 'subdep-1',
            links: [{ rel: 'self', href: 'http://example.com/deployments/subdep-1' }],
          },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toMatch(/23-001|recursive-assoc|aggregation/);
    });

    it('fails when subdeployment links array is missing', async () => {
      const body = JSON.stringify({
        items: [{ id: 'subdep-1', name: 'Sub Dep' }],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links');
    });

    it('skips when no subdeployments exist', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: emptySubdeploymentsBody() }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No subdeployments');
    });

    it('skips when no deploymentId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = subdeploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No deployments');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/subdeployment/collection',
        '/req/subdeployment/recursive-param',
        '/req/subdeployment/recursive-search-deployments',
        '/req/subdeployment/recursive-assoc',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = subdeploymentsTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
