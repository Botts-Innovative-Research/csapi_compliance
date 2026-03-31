// Unit tests for GeoJSON Format conformance class test module (S03-07).

import { describe, it, expect, vi } from 'vitest';
import { geojsonTestModule } from '@/engine/registry/geojson';
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
    headers: { 'content-type': 'application/geo+json' },
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

// Reusable valid system GeoJSON body
function validSystemGeoJson() {
  return JSON.stringify({
    type: 'Feature',
    id: 'system-1',
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: {
      name: 'Test System',
      featureType: 'http://www.w3.org/ns/sosa/Platform',
      description: 'A test system',
    },
  });
}

// --- Tests ---

describe('GeoJSON Format conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(geojsonTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/geojson',
      );
    });

    it('depends on System class', () => {
      expect(geojsonTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 4 requirements', () => {
      expect(geojsonTestModule.classDefinition.requirements).toHaveLength(4);
    });

    it('is not a write operation', () => {
      expect(geojsonTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 4 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = geojsonTestModule.createTests(ctx);
      expect(tests).toHaveLength(4);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('GeoJSON Media Type Read test', () => {
    it('passes when Content-Type is application/geo+json', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body: validSystemGeoJson(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/geojson/mediatype-read');
    });

    it('fails when Content-Type is not application/geo+json', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/json' },
          body: validSystemGeoJson(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('application/geo+json');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });

    it('skips when no system ID in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, {});
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No system ID');
    });
  });

  describe('GeoJSON Feature Attribute Mapping test', () => {
    it('passes when response has all required GeoJSON members', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body: validSystemGeoJson(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/geojson/feature-attribute-mapping');
    });

    it('fails when required GeoJSON members are missing', async () => {
      const body = JSON.stringify({ data: 'not a feature' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body,
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('type');
    });

    it('fails when type is not Feature', async () => {
      const body = JSON.stringify({
        type: 'FeatureCollection',
        id: 'system-1',
        geometry: null,
        properties: {},
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body,
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Feature');
    });

    it('skips when no system ID in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, {});
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('GeoJSON System Schema test', () => {
    it('passes when system has required properties', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body: validSystemGeoJson(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/geojson/system-schema');
    });

    it('fails when properties is missing', async () => {
      const body = JSON.stringify({
        type: 'Feature',
        id: 'sys-1',
        geometry: null,
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body,
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('properties');
    });

    it('fails when properties has no name or label', async () => {
      const body = JSON.stringify({
        type: 'Feature',
        id: 'sys-1',
        geometry: null,
        properties: { description: 'No name field' },
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body,
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('name');
    });
  });

  describe('GeoJSON System Mappings test', () => {
    it('passes when system has OGC concept mapping properties', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body: validSystemGeoJson(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/geojson/system-mappings');
    });

    it('fails when no OGC concept mapping properties found', async () => {
      const body = JSON.stringify({
        type: 'Feature',
        id: 'sys-1',
        geometry: null,
        properties: { name: 'Test', custom: 'value' },
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/geo+json' },
          body,
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('featureType');
    });

    it('skips when no system ID in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, {});
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Timeout'));

      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = geojsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Timeout');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/geojson/mediatype-read',
        '/req/geojson/feature-attribute-mapping',
        '/req/geojson/system-schema',
        '/req/geojson/system-mappings',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = geojsonTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
