// Unit tests for Property Definitions conformance class test module (S03-05).

import { describe, it, expect, vi } from 'vitest';
import { propertiesTestModule } from '@/engine/registry/properties';
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

describe('Property Definitions conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(propertiesTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/property',
      );
    });

    it('depends on CS API Core', () => {
      expect(propertiesTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
      ]);
    });

    it('has 4 requirements', () => {
      expect(propertiesTestModule.classDefinition.requirements).toHaveLength(4);
    });

    it('is not a write operation', () => {
      expect(propertiesTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 4 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = propertiesTestModule.createTests(ctx);
      expect(tests).toHaveLength(4);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Resources Endpoint test', () => {
    it('passes when GET /properties returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/resources-endpoint');
    });

    it('fails when GET /properties returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 500, body: 'Error' }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('500');
    });

    it('skips when no propertyId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No properties');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: '<xml/>' }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Canonical URL test', () => {
    it('passes when GET /properties/{id} returns 200', async () => {
      const body = JSON.stringify({ id: 'prop-1', links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/canonical-url');
    });

    it('fails when GET /properties/{id} returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no propertyId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Canonical Endpoint Self Link test', () => {
    it('passes when property has self link', async () => {
      const body = JSON.stringify({
        id: 'prop-1',
        links: [{ rel: 'self', href: '/properties/prop-1' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/canonical-endpoint');
    });

    it('SKIPs when self link is missing (non-normative per OGC 23-001 rubric-6.1 audit)', async () => {
      // REQ-TEST-CITE-002: rel="self" at canonical URL /properties/{id} is NOT
      // normatively required by OGC 23-001 /req/property/canonical-url.
      // Per GH #3 precedent, absence of self is SKIP (not FAIL).
      const body = JSON.stringify({
        id: 'prop-1',
        links: [{ rel: 'alternate', href: '/other' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toMatch(/23-001|canonical-url|non-canonical/);
    });

    it('fails when links array is missing', async () => {
      const body = JSON.stringify({ id: 'prop-1' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links');
    });

    it('skips when no propertyId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Collections test', () => {
    it('passes when a collection declares itemType="sosa:Property" (OGC 23-001 /req/property/collections — note: ASYMMETRIC pattern; uses itemType, NOT featureType)', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'properties', itemType: 'sosa:Property' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/collections');
    });

    it('passes with non-canonical collection id when itemType is correct (SCENARIO-FEATURECOLLECTION-TYPE-001)', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'observable_properties', itemType: 'sosa:Property' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('FAILS when collections array is present but no collection has itemType="sosa:Property" (closes missing-check loophole)', async () => {
      // Pre-sprint, this would have silently PASSed.
      const body = JSON.stringify({
        collections: [
          { id: 'properties', title: 'Properties' },
          { id: 'systems', itemType: 'feature', featureType: 'sosa:System' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sosa:Property');
      expect(result.failureMessage).toMatch(/23-001|\/req\/property\/collections/);
    });

    it('FAILS when a collection has featureType="sosa:Property" instead of itemType="sosa:Property" (closes the asymmetric-pattern trap)', async () => {
      // Property collections use itemType directly, NOT featureType. A server
      // that wrongly copies the System/Deployment pattern (itemType="feature"
      // + featureType="sosa:Property") is non-conformant per OGC 23-001.
      const body = JSON.stringify({
        collections: [
          { id: 'properties', itemType: 'feature', featureType: 'sosa:Property' },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('itemType="sosa:Property"');
    });

    it('fails when collections array is missing', async () => {
      const body = JSON.stringify({ title: 'No collections' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('fails when collections is not an array', async () => {
      const body = JSON.stringify({ collections: 'not-an-array' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('skips when no propertyId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = propertiesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/resources-endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/canonical-url',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/canonical-endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/property/collections',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { propertyId: 'prop-1' });
      const tests = propertiesTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
