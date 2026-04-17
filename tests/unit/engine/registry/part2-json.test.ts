// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-ENCODING-001 (JSON encoding for dynamic-data resources)

// Unit tests for Connected Systems Part 2 — JSON Encoding conformance class test module (S09-02).

import { describe, it, expect, vi } from 'vitest';
import { part2JsonTestModule } from '@/engine/registry/part2-json';
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

function validDatastreamBody(id = 'ds-1') {
  return JSON.stringify({
    id,
    name: 'Temperature Stream',
    type: 'http://www.opengis.net/def/x-]OGC/TBD',
  });
}

function validObservationBody(id = 'obs-1') {
  return JSON.stringify({
    id,
    result: { value: 23.5 },
    phenomenonTime: '2024-01-01T00:00:00Z',
  });
}

function validControlStreamBody(id = 'cs-1') {
  return JSON.stringify({
    id,
    name: 'Actuator Control',
    type: 'http://www.opengis.net/def/x-OGC/TBD',
  });
}

// --- Tests ---

describe('Connected Systems Part 2 - JSON Encoding conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2JsonTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/json',
      );
    });

    it('depends on Part 2 Common', () => {
      expect(part2JsonTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/api-common',
      ]);
    });

    it('has 3 requirements', () => {
      expect(part2JsonTestModule.classDefinition.requirements).toHaveLength(3);
    });

    it('is not a write operation', () => {
      expect(part2JsonTestModule.classDefinition.isWriteOperation).toBe(false);
    });

    it('belongs to cs-part2 standard part', () => {
      expect(part2JsonTestModule.classDefinition.standardPart).toBe('cs-part2');
    });
  });

  describe('createTests', () => {
    it('creates 3 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2JsonTestModule.createTests(ctx);
      expect(tests).toHaveLength(3);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Datastream JSON Schema test', () => {
    it('passes when datastream has id, name, and type', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validDatastreamBody('ds-abc') }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/json/datastream-schema');
    });

    it('fails when id is missing', async () => {
      const body = JSON.stringify({ name: 'Stream', type: 'some-type' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('id');
    });

    it('fails when name is missing', async () => {
      const body = JSON.stringify({ id: 'ds-abc', type: 'some-type' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('name');
    });

    it('fails when type is missing', async () => {
      const body = JSON.stringify({ id: 'ds-abc', name: 'Stream' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('type');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: '<xml>bad</xml>' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No datastream');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Timeout'));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Timeout');
    });
  });

  describe('Observation JSON Schema test', () => {
    it('passes when observation has id, result, and phenomenonTime', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validObservationBody('obs-abc') }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/json/observation-schema');
    });

    it('fails when result is missing', async () => {
      const body = JSON.stringify({ id: 'obs-abc', phenomenonTime: '2024-01-01T00:00:00Z' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('result');
    });

    it('fails when phenomenonTime is missing', async () => {
      const body = JSON.stringify({ id: 'obs-abc', result: { value: 10 } });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('phenomenonTime');
    });

    it('skips when no observationId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No observation');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not-json' }),
      );
      const ctx = makeTestContext(getMock, { observationId: 'obs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Control Stream JSON Schema test', () => {
    it('passes when control stream has id, name, and type', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validControlStreamBody('cs-abc') }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/json/controlstream-schema');
    });

    it('fails when id is missing', async () => {
      const body = JSON.stringify({ name: 'Control', type: 'some-type' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('id');
    });

    it('fails when name is missing', async () => {
      const body = JSON.stringify({ id: 'cs-abc', type: 'some-type' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('name');
    });

    it('fails when type is missing', async () => {
      const body = JSON.stringify({ id: 'cs-abc', name: 'Control' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('type');
    });

    it('skips when no controlStreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No control stream');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 403, body: 'Forbidden' }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('403');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: '<<<invalid>>>' }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Network error'));
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = part2JsonTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Network error');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/json/datastream-schema',
        '/req/json/observation-schema',
        '/req/json/controlstream-schema',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = part2JsonTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
