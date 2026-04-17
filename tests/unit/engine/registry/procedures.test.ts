// Unit tests for Procedure Features conformance class test module (S03-04).

import { describe, it, expect, vi } from 'vitest';
import { proceduresTestModule } from '@/engine/registry/procedures';
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

describe('Procedure Features conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(proceduresTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/procedure',
      );
    });

    it('depends on CS API Core', () => {
      expect(proceduresTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
      ]);
    });

    it('has 5 requirements', () => {
      expect(proceduresTestModule.classDefinition.requirements).toHaveLength(5);
    });

    it('is not a write operation', () => {
      expect(proceduresTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 5 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = proceduresTestModule.createTests(ctx);
      expect(tests).toHaveLength(5);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Resources Endpoint test', () => {
    it('passes when GET /procedures returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/resources-endpoint');
    });

    it('fails when GET /procedures returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no procedureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No procedures');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: '<html>' }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Canonical URL test', () => {
    it('passes when GET /procedures/{id} returns 200', async () => {
      const body = JSON.stringify({ id: 'proc-1', links: [{ rel: 'self', href: '/procedures/proc-1' }] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/canonical-url');
    });

    it('fails when GET /procedures/{id} returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 500, body: 'Error' }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });

    it('skips when no procedureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Canonical Endpoint Self Link test', () => {
    it('passes when procedure has self link', async () => {
      const body = JSON.stringify({
        id: 'proc-1',
        links: [{ rel: 'self', href: '/procedures/proc-1' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/canonical-endpoint');
    });

    it('SKIPs when self link is missing (non-normative per OGC 23-001 rubric-6.1 audit)', async () => {
      // REQ-TEST-CITE-002: rel="self" at canonical URL /procedures/{id} is NOT
      // normatively required by OGC 23-001 /req/procedure/canonical-url.
      // Per GH #3 precedent, absence of self is SKIP (not FAIL).
      const body = JSON.stringify({
        id: 'proc-1',
        links: [{ rel: 'alternate', href: '/other' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toMatch(/23-001|canonical-url|non-canonical/);
    });

    it('fails when links array is missing', async () => {
      const body = JSON.stringify({ id: 'proc-1' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links');
    });

    it('skips when no procedureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Collections test', () => {
    it('passes when a collection declares featureType="sosa:Procedure" (OGC 23-001 /req/procedure/collections)', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'procedures', itemType: 'feature', featureType: 'sosa:Procedure' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/collections');
    });

    it('passes with non-canonical collection id when featureType is correct (SCENARIO-FEATURECOLLECTION-TYPE-001)', async () => {
      // Collection id is NOT normatively constrained — featureType is the signal.
      const body = JSON.stringify({
        collections: [
          { id: 'algorithms', itemType: 'feature', featureType: 'sosa:Procedure' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('FAILS when collections array is present but no collection has featureType="sosa:Procedure" (closes missing-check loophole)', async () => {
      // Pre-sprint, this test would have silently PASSed because the old code
      // only checked `Array.isArray(body.collections)`. Post-sprint, FAIL with
      // a message naming the required featureType and citing OGC 23-001.
      const body = JSON.stringify({
        collections: [
          { id: 'procedures', title: 'Procedures' },
          { id: 'systems', itemType: 'feature', featureType: 'sosa:System' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sosa:Procedure');
      expect(result.failureMessage).toMatch(/23-001|\/req\/procedure\/collections/);
    });

    it('FAILS when id="procedures" is present but featureType is absent (closes id-convention loophole — parity with deployments/systems tests; addresses Raze GAP-3 2026-04-17T17:50Z)', async () => {
      // Parallels the "id-convention alone is not enough" regression in
      // deployments.test.ts + system-features.test.ts. A server that names
      // its collection "procedures" without setting featureType is non-
      // conformant per OGC 23-001; id convention alone MUST NOT admit it.
      const body = JSON.stringify({
        collections: [
          { id: 'procedures', title: 'Procedures', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sosa:Procedure');
    });

    it('fails when collections array is missing', async () => {
      const body = JSON.stringify({ title: 'No collections' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('skips when no procedureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Location test', () => {
    it('passes when procedure has geometry', async () => {
      const body = JSON.stringify({
        id: 'proc-1',
        geometry: { type: 'Point', coordinates: [0, 0] },
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/location');
    });

    it('passes when procedure has no geometry (MAY requirement)', async () => {
      const body = JSON.stringify({ id: 'proc-1' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('fails when geometry is present but has no type', async () => {
      const body = JSON.stringify({
        id: 'proc-1',
        geometry: { coordinates: [0, 0] },
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('type');
    });

    it('skips when no procedureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = proceduresTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/resources-endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/canonical-url',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/canonical-endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/collections',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/procedure/location',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { procedureId: 'proc-1' });
      const tests = proceduresTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
