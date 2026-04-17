// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-TEST-PASS-001..002 (pass/fail verdicts for Features Core)
//   SCENARIO-FEATURES-LINKS-001..002 (items response self-link audit-trail;
//     deeper coverage in features-core-links-normative.test.ts)

// Unit tests for OGC API Features Part 1 Core conformance class test module (S02-02).

import { describe, it, expect, vi } from 'vitest';
import { featuresCoreTestModule } from '@/engine/registry/features-core';
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

// Reusable response bodies
function validCollectionsBody() {
  return JSON.stringify({
    collections: [
      { id: 'buildings', title: 'Buildings', links: [] },
      { id: 'roads', title: 'Roads', links: [] },
    ],
    links: [{ rel: 'self', href: 'http://example.com/collections' }],
  });
}

function validSingleCollectionBody() {
  return JSON.stringify({
    id: 'buildings',
    title: 'Buildings',
    links: [{ rel: 'self', href: 'http://example.com/collections/buildings' }],
  });
}

function validItemsBody() {
  return JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'feature-1',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { name: 'Test' },
      },
    ],
    links: [
      { rel: 'self', href: 'http://example.com/collections/buildings/items' },
    ],
  });
}

// --- Tests ---

describe('OGC API Features - Core conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(featuresCoreTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
      );
    });

    it('depends on Common Core', () => {
      expect(featuresCoreTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core',
      ]);
    });

    it('has 8 requirements', () => {
      expect(featuresCoreTestModule.classDefinition.requirements).toHaveLength(8);
    });

    it('is not a write operation', () => {
      expect(featuresCoreTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 8 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = featuresCoreTestModule.createTests(ctx);
      expect(tests).toHaveLength(8);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Collections Endpoint test', () => {
    it('passes with valid collections response', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validCollectionsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = featuresCoreTestModule.createTests(ctx);
      const collectionsTest = tests[0];

      const result = await collectionsTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/collections');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });
  });

  describe('Collections Array test', () => {
    it('passes when collections array is present', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validCollectionsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/collections-array');
    });

    it('fails when collections array is missing', async () => {
      const body = JSON.stringify({ title: 'No collections' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('fails when collections is not an array', async () => {
      const body = JSON.stringify({ collections: 'not-an-array' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });
  });

  describe('Single Collection test', () => {
    it('passes with required fields present', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleCollectionBody() }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/single-collection');
    });

    it('fails when required fields are missing', async () => {
      const body = JSON.stringify({ title: 'No id or links' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('id');
      expect(result.failureMessage).toContain('links');
    });

    it('skips when no collections available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { collectionIds: [] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No collections');
    });
  });

  describe('Items Endpoint test', () => {
    it('passes with HTTP 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validItemsBody() }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items');
    });

    it('skips when no collections available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { collectionIds: [] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Items GeoJSON FeatureCollection test', () => {
    it('passes with valid GeoJSON FeatureCollection', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validItemsBody() }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-geojson');
    });

    it('fails when type is not FeatureCollection', async () => {
      const body = JSON.stringify({ type: 'Feature', features: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('FeatureCollection');
    });

    it('fails when features array is missing', async () => {
      const body = JSON.stringify({ type: 'FeatureCollection' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('features');
    });

    it('skips when no collections available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { collectionIds: [] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Items Limit Parameter test', () => {
    it('passes when limit parameter is accepted', async () => {
      const body = JSON.stringify({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', id: '1', geometry: null, properties: {} },
          { type: 'Feature', id: '2', geometry: null, properties: {} },
        ],
        links: [],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-limit');
    });

    it('fails when limit is not respected', async () => {
      const features = Array.from({ length: 5 }, (_, i) => ({
        type: 'Feature',
        id: String(i),
        geometry: null,
        properties: {},
      }));
      const body = JSON.stringify({
        type: 'FeatureCollection',
        features,
        links: [],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('limit');
    });

    it('skips when no collections available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { collectionIds: [] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Single Feature test', () => {
    it('passes when single feature returns 200', async () => {
      const itemsBody = validItemsBody();
      const featureBody = JSON.stringify({
        type: 'Feature',
        id: 'feature-1',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { name: 'Test' },
      });

      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ body: itemsBody }))
        .mockResolvedValueOnce(makeHttpResponse({ body: featureBody }));

      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[6].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/single-feature');
      expect(result.exchangeIds).toHaveLength(2);
    });

    it('fails when single feature returns non-200', async () => {
      const itemsBody = validItemsBody();

      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ body: itemsBody }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));

      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[6].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no collections available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { collectionIds: [] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[6].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('skips when no features exist in the collection', async () => {
      const emptyItems = JSON.stringify({
        type: 'FeatureCollection',
        features: [],
        links: [],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: emptyItems }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[6].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No features');
    });
  });

  describe('Items Response Links test', () => {
    it('passes when self link is present', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validItemsBody() }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[7].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-links');
    });

    it('fails when links array is missing', async () => {
      const body = JSON.stringify({
        type: 'FeatureCollection',
        features: [],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[7].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links');
    });

    it('fails when self link is missing', async () => {
      const body = JSON.stringify({
        type: 'FeatureCollection',
        features: [],
        links: [{ rel: 'next', href: 'http://example.com/page2' }],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { collectionIds: ['buildings'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[7].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('self');
    });

    it('skips when no collections available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { collectionIds: [] });
      const tests = featuresCoreTestModule.createTests(ctx);

      const result = await tests[7].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/collections',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/collections-array',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/single-collection',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-geojson',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-limit',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/single-feature',
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-links',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { collectionIds: ['test'] });
      const tests = featuresCoreTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
