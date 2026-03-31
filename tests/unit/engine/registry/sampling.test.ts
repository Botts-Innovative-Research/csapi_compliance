// Unit tests for Sampling Features conformance class test module (S03-04).

import { describe, it, expect, vi } from 'vitest';
import { samplingTestModule } from '@/engine/registry/sampling';
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

describe('Sampling Features conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(samplingTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/sf',
      );
    });

    it('depends on CS API Core', () => {
      expect(samplingTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
      ]);
    });

    it('has 5 requirements', () => {
      expect(samplingTestModule.classDefinition.requirements).toHaveLength(5);
    });

    it('is not a write operation', () => {
      expect(samplingTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 5 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = samplingTestModule.createTests(ctx);
      expect(tests).toHaveLength(5);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Resources Endpoint test', () => {
    it('passes when GET /samplingFeatures returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sf/resources-endpoint');
    });

    it('fails when GET /samplingFeatures returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no samplingFeatureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No sampling features');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: 'not json' }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Canonical URL test', () => {
    it('passes when GET /samplingFeatures/{id} returns 200', async () => {
      const body = JSON.stringify({ id: 'sf-1', links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sf/canonical-url');
    });

    it('fails when GET /samplingFeatures/{id} returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 500, body: 'Error' }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });

    it('skips when no samplingFeatureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Canonical Endpoint Self Link test', () => {
    it('passes when sampling feature has self link', async () => {
      const body = JSON.stringify({
        id: 'sf-1',
        links: [{ rel: 'self', href: '/samplingFeatures/sf-1' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sf/canonical-endpoint');
    });

    it('fails when self link is missing', async () => {
      const body = JSON.stringify({
        id: 'sf-1',
        links: [{ rel: 'alternate', href: '/other' }],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('self');
    });

    it('fails when links array is missing', async () => {
      const body = JSON.stringify({ id: 'sf-1' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links');
    });

    it('skips when no samplingFeatureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('Reference from System test', () => {
    it('passes when GET /systems/{id}/samplingFeatures returns 200', async () => {
      const body = JSON.stringify({ items: [], links: [] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1', systemId: 'sys-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sf/ref-from-system');
    });

    it('fails when GET /systems/{id}/samplingFeatures returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1', systemId: 'sys-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no samplingFeatureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No sampling features');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('Collections test', () => {
    it('passes when collections returns valid response', async () => {
      const body = JSON.stringify({ collections: [{ id: 'sampling-features' }] });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sf/collections');
    });

    it('fails when collections array is missing', async () => {
      const body = JSON.stringify({ title: 'No collections' });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('skips when no samplingFeatureId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = samplingTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/sf/resources-endpoint',
        '/req/sf/canonical-url',
        '/req/sf/canonical-endpoint',
        '/req/sf/ref-from-system',
        '/req/sf/collections',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { samplingFeatureId: 'sf-1' });
      const tests = samplingTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
