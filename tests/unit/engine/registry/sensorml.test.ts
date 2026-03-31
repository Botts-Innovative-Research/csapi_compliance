// Unit tests for SensorML Format conformance class test module (S03-07).

import { describe, it, expect, vi } from 'vitest';
import { sensormlTestModule } from '@/engine/registry/sensorml';
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
    headers: { 'content-type': 'application/sml+json' },
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

// Valid SensorML JSON body
function validSensormlBody() {
  return JSON.stringify({
    type: 'PhysicalSystem',
    id: 'system-1',
    identifier: 'urn:example:system:1',
    definition: 'http://www.w3.org/ns/sosa/Platform',
    name: 'Test System',
    description: 'A test sensor system',
  });
}

// --- Tests ---

describe('SensorML Format conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(sensormlTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/sensorml',
      );
    });

    it('depends on System class', () => {
      expect(sensormlTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 3 requirements', () => {
      expect(sensormlTestModule.classDefinition.requirements).toHaveLength(3);
    });

    it('is not a write operation', () => {
      expect(sensormlTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 3 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = sensormlTestModule.createTests(ctx);
      expect(tests).toHaveLength(3);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('SensorML Media Type Read test', () => {
    it('passes when Content-Type is application/sml+json', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/sml+json' },
          body: validSensormlBody(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sensorml/mediatype-read');
    });

    it('skips when server returns 406 Not Acceptable', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 406,
          headers: { 'content-type': 'application/json' },
          body: 'Not Acceptable',
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('406');
      expect(result.skipReason).toContain('not supported');
    });

    it('fails when Content-Type is not application/sml+json', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/json' },
          body: validSensormlBody(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('application/sml+json');
    });

    it('skips when no system ID in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, {});
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No system ID');
    });
  });

  describe('SensorML Resource ID test', () => {
    it('passes when response has id field', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/sml+json' },
          body: validSensormlBody(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sensorml/resource-id');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 406,
          headers: {},
          body: '',
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when response has no identifier field', async () => {
      const body = JSON.stringify({
        type: 'PhysicalSystem',
        name: 'No ID system',
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/sml+json' },
          body,
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('identifier');
    });

    it('skips when no system ID in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, {});
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('SensorML System Schema test', () => {
    it('passes when response has valid SensorML structure', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/sml+json' },
          body: validSensormlBody(),
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/sensorml/system-schema');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 406,
          headers: {},
          body: '',
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when response has no type information', async () => {
      const body = JSON.stringify({
        id: 'sys-1',
        name: 'No type system',
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/sml+json' },
          body,
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('type');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          headers: { 'content-type': 'application/sml+json' },
          body: 'not json',
        }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('skips when no system ID in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, {});
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('DNS resolution failed'));

      const ctx = makeTestContext(getMock, { systemId: 'system-1' });
      const tests = sensormlTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('DNS resolution failed');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/sensorml/mediatype-read',
        '/req/sensorml/resource-id',
        '/req/sensorml/system-schema',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = sensormlTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
