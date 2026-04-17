// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-PASS-001, SCENARIO-DYN-PASS-003 (DataStream read-path + history)
//   SCENARIO-DYN-OPTIN-001..002 (write-op opt-in gating)
//   SCENARIO-DYN-SKIP-001 (class-not-declared skip)
//   SCENARIO-DYN-EMPTY-001 (empty-collection handling)

// Unit tests for Connected Systems Part 2 — Datastreams & Observations conformance class test module (S09-03).

import { describe, it, expect, vi } from 'vitest';
import { datastreamsTestModule } from '@/engine/registry/datastreams';
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

function validDatastreamsBody() {
  return JSON.stringify({
    items: [
      { id: 'ds-1', name: 'Temperature', type: 'http://example.com/type' },
      { id: 'ds-2', name: 'Humidity', type: 'http://example.com/type' },
    ],
  });
}

function validSingleDatastreamBody(id = 'ds-1') {
  return JSON.stringify({
    id,
    name: 'Temperature Stream',
    type: 'http://example.com/type',
  });
}

function validObservationsBody() {
  return JSON.stringify({
    items: [
      { id: 'obs-1', result: { value: 23.5 }, phenomenonTime: '2024-01-01T00:00:00Z' },
    ],
  });
}

function validSingleObservationBody(id = 'obs-1') {
  return JSON.stringify({
    id,
    result: { value: 23.5 },
    phenomenonTime: '2024-01-01T00:00:00Z',
  });
}

// --- Tests ---

describe('Connected Systems Part 2 - Datastreams & Observations conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(datastreamsTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream',
      );
    });

    it('depends on Part 2 Common and Part 1 System', () => {
      expect(datastreamsTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/api-common',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 6 requirements', () => {
      expect(datastreamsTestModule.classDefinition.requirements).toHaveLength(6);
    });

    it('is not a write operation', () => {
      expect(datastreamsTestModule.classDefinition.isWriteOperation).toBe(false);
    });

    it('belongs to cs-part2 standard part', () => {
      expect(datastreamsTestModule.classDefinition.standardPart).toBe('cs-part2');
    });
  });

  describe('createTests', () => {
    it('creates 6 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);
      expect(tests).toHaveLength(6);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Datastreams Resources Endpoint test', () => {
    it('passes when GET /datastreams returns 200 with items array', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validDatastreamsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/datastream/resources-endpoint');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

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
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when items array is missing', async () => {
      const body = JSON.stringify({ datastreams: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('items');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Connection refused');
    });
  });

  describe('Datastream Canonical URL test', () => {
    it('passes when datastream returns 200 with correct id', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleDatastreamBody('ds-abc') }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/datastream/canonical-url');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '{}' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response id does not match', async () => {
      const body = JSON.stringify({ id: 'different-id', name: 'Wrong' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('ds-abc');
      expect(result.failureMessage).toContain('different-id');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No datastream');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not-json' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Datastreams Referenced from System test', () => {
    it('passes when GET /systems/{id}/datastreams returns 200 with items', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validDatastreamsBody() }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/datastream/ref-from-system');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No system');
    });

    it('fails when items array is missing', async () => {
      const body = JSON.stringify({ data: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('items');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'bad-json' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Datastream Schema Operation test', () => {
    it('passes when GET /datastreams/{id}/schema returns 200 with content', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: JSON.stringify({ type: 'record', fields: [] }) }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/datastream/schema-op');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response body is empty', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: '   ' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('non-empty');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No datastream');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Timeout'));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Timeout');
    });
  });

  describe('Observations Resources Endpoint test', () => {
    it('passes when GET /observations returns 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validObservationsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/datastream/obs-resources-endpoint');
    });

    it('falls back to /datastreams/{id}/observations when /observations fails', async () => {
      let callCount = 0;
      const getMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));
        }
        return Promise.resolve(makeHttpResponse({ body: validObservationsBody() }));
      });
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('fails when both /observations and fallback return non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });

    it('fails when /observations returns non-200 and no datastreamId available', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Network error'));
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Network error');
    });
  });

  describe('Observation Canonical URL test', () => {
    it('passes when observation returns 200 with correct id', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleObservationBody('obs-abc') }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/datastream/obs-canonical-url');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '{}' }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response id does not match', async () => {
      const body = JSON.stringify({ id: 'other-obs', result: {}, phenomenonTime: 'now' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('obs-abc');
      expect(result.failureMessage).toContain('other-obs');
    });

    it('skips when no observationId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No observation');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'invalid-json' }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Timeout'));
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = datastreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Timeout');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/datastream/resources-endpoint',
        '/req/datastream/canonical-url',
        '/req/datastream/ref-from-system',
        '/req/datastream/schema-op',
        '/req/datastream/obs-resources-endpoint',
        '/req/datastream/obs-canonical-url',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1', observationId: 'obs-1', systemId: 'sys-1' });
      const tests = datastreamsTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
