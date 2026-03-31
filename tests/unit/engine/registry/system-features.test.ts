// Unit tests for Connected Systems Part 1 — System Features conformance class test module (S03-02).

import { describe, it, expect, vi } from 'vitest';
import { systemFeaturesTestModule } from '@/engine/registry/system-features';
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

function validSystemsBody() {
  return JSON.stringify({
    items: [
      { id: 'system-1', name: 'Weather Station', links: [{ rel: 'self', href: 'http://example.com/systems/system-1' }] },
      { id: 'system-2', name: 'Seismometer', links: [{ rel: 'self', href: 'http://example.com/systems/system-2' }] },
    ],
  });
}

function validSingleSystemBody(id = 'system-1') {
  return JSON.stringify({
    id,
    name: 'Weather Station',
    links: [{ rel: 'self', href: `http://example.com/systems/${id}` }],
  });
}

function validCollectionsWithSystems() {
  return JSON.stringify({
    collections: [
      { id: 'systems', title: 'Systems', links: [] },
      { id: 'deployments', title: 'Deployments', links: [] },
    ],
  });
}

// --- Tests ---

describe('Connected Systems - System Features conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(systemFeaturesTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      );
    });

    it('depends on CS Part 1 Core', () => {
      expect(systemFeaturesTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
      ]);
    });

    it('has 5 requirements', () => {
      expect(systemFeaturesTestModule.classDefinition.requirements).toHaveLength(5);
    });

    it('is not a write operation', () => {
      expect(systemFeaturesTestModule.classDefinition.isWriteOperation).toBe(false);
    });

    it('belongs to cs-part1 standard part', () => {
      expect(systemFeaturesTestModule.classDefinition.standardPart).toBe('cs-part1');
    });
  });

  describe('createTests', () => {
    it('creates 5 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);
      expect(tests).toHaveLength(5);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Systems Resources Endpoint test', () => {
    it('passes when GET /systems returns 200 with items array', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSystemsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/system/resources-endpoint');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: '<html>not json</html>' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when items array is missing', async () => {
      const body = JSON.stringify({ systems: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('items');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Connection refused');
    });
  });

  describe('System Canonical URL test', () => {
    it('passes when system returns 200 with correct id', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleSystemBody('sys-abc') }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-abc' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/system/canonical-url');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '{}' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-abc' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response id does not match', async () => {
      const body = JSON.stringify({ id: 'different-id', name: 'Wrong System' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-abc' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sys-abc');
      expect(result.failureMessage).toContain('different-id');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('System Canonical Endpoint test', () => {
    it('passes when system has a self link', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleSystemBody('sys-1') }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/system/canonical-endpoint');
    });

    it('fails when links array is missing', async () => {
      const body = JSON.stringify({ id: 'sys-1', name: 'System' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links');
    });

    it('fails when self link is absent', async () => {
      const body = JSON.stringify({
        id: 'sys-1',
        links: [{ rel: 'alternate', href: 'http://example.com/other' }],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('self');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('Systems in Collections test', () => {
    it('passes when collections contain a systems collection', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validCollectionsWithSystems() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/system/collections');
    });

    it('fails when no system-related collection exists', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'roads', title: 'Roads', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('system');
    });

    it('fails when collections array is missing', async () => {
      const body = JSON.stringify({ title: 'No collections' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });
  });

  describe('System Location and Time test', () => {
    it('passes when geometry and validTime are valid or absent', async () => {
      const body = JSON.stringify({
        id: 'sys-1',
        geometry: { type: 'Point', coordinates: [10, 20] },
        validTime: { begin: '2024-01-01', end: '2025-01-01' },
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/system/location-time');
    });

    it('passes when geometry and validTime are null', async () => {
      const body = JSON.stringify({
        id: 'sys-1',
        geometry: null,
        validTime: null,
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('passes when geometry and validTime are not present', async () => {
      const body = JSON.stringify({ id: 'sys-1', name: 'System' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('fails when geometry is not an object', async () => {
      const body = JSON.stringify({
        id: 'sys-1',
        geometry: 'invalid-geometry',
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('geometry');
    });

    it('fails when validTime is a number', async () => {
      const body = JSON.stringify({
        id: 'sys-1',
        validTime: 12345,
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('validTime');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = systemFeaturesTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/system/resources-endpoint',
        '/req/system/canonical-url',
        '/req/system/canonical-endpoint',
        '/req/system/collections',
        '/req/system/location-time',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = systemFeaturesTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
