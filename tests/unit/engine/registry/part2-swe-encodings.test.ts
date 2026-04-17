// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-ENCODING-001 (SWE Common text/JSON/binary encodings)

// Unit tests for Part 2 SWE Common Encodings conformance class test modules (S09-07).

import { describe, it, expect, vi } from 'vitest';
import {
  sweJsonTestModule,
  sweTextTestModule,
  sweBinaryTestModule,
} from '@/engine/registry/part2-swe-encodings';
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

// ============================================================
// SWE Common JSON tests
// ============================================================

describe('SWE Common JSON conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(sweJsonTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/swecommon-json',
      );
    });

    it('depends on Datastream class', () => {
      expect(sweJsonTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream',
      ]);
    });

    it('has 2 requirements', () => {
      expect(sweJsonTestModule.classDefinition.requirements).toHaveLength(2);
    });

    it('is not a write operation', () => {
      expect(sweJsonTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 2 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweJsonTestModule.createTests(ctx);
      expect(tests).toHaveLength(2);
    });
  });

  describe('SWE JSON Media Type test', () => {
    it('passes when Content-Type is application/swe+json', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+json' },
          body: '{"values":[]}',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/swecommon-json/mediatype');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No datastreams');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 406, body: 'Not Acceptable' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('406');
    });

    it('fails when Content-Type is wrong', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: '{}',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('application/swe+json');
    });

    it('fails when GET returns non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });
  });

  describe('SWE JSON Schema test', () => {
    it('passes when response is valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+json' },
          body: '{"values":[1,2,3]}',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/swecommon-json/schema');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 406, body: '' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when response body is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+json' },
          body: 'not json',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweJsonTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('Connection refused');
      }
    });
  });
});

// ============================================================
// SWE Common Text tests
// ============================================================

describe('SWE Common Text conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(sweTextTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/swecommon-text',
      );
    });

    it('depends on Datastream class', () => {
      expect(sweTextTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream',
      ]);
    });

    it('has 2 requirements', () => {
      expect(sweTextTestModule.classDefinition.requirements).toHaveLength(2);
    });

    it('is not a write operation', () => {
      expect(sweTextTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 2 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweTextTestModule.createTests(ctx);
      expect(tests).toHaveLength(2);
    });
  });

  describe('SWE Text Media Type test', () => {
    it('passes when Content-Type is application/swe+text', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+text' },
          body: '1,2,3',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweTextTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/swecommon-text/mediatype');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweTextTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 406, body: '' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweTextTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('406');
    });

    it('fails when Content-Type is wrong', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'text/plain' },
          body: '1,2,3',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweTextTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('application/swe+text');
    });
  });

  describe('SWE Text Non-Empty test', () => {
    it('passes when response body is non-empty', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+text' },
          body: 'some,text,data',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweTextTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/swecommon-text/non-empty');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 406, body: '' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweTextTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when response body is empty', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+text' },
          body: '   ',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweTextTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('non-empty');
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweTextTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('ECONNREFUSED');
      }
    });
  });
});

// ============================================================
// SWE Common Binary tests
// ============================================================

describe('SWE Common Binary conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(sweBinaryTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/swecommon-binary',
      );
    });

    it('depends on Datastream class', () => {
      expect(sweBinaryTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream',
      ]);
    });

    it('has 2 requirements', () => {
      expect(sweBinaryTestModule.classDefinition.requirements).toHaveLength(2);
    });

    it('is not a write operation', () => {
      expect(sweBinaryTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 2 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweBinaryTestModule.createTests(ctx);
      expect(tests).toHaveLength(2);
    });
  });

  describe('SWE Binary Media Type test', () => {
    it('passes when Content-Type is application/swe+binary', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+binary' },
          body: '\x00\x01\x02',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweBinaryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/swecommon-binary/mediatype');
    });

    it('skips when no datastreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweBinaryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 406, body: '' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweBinaryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('406');
    });

    it('fails when Content-Type is wrong', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/octet-stream' },
          body: '\x00\x01',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweBinaryTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('application/swe+binary');
    });
  });

  describe('SWE Binary Non-Empty test', () => {
    it('passes when response body is non-empty', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+binary' },
          body: '\x00\x01\x02\x03',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweBinaryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/swecommon-binary/non-empty');
    });

    it('skips when server returns 406', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 406, body: '' }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweBinaryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when response body is empty', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          headers: { 'content-type': 'application/swe+binary' },
          body: '',
        }),
      );
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweBinaryTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('non-empty');
    });
  });

  describe('requirement URIs', () => {
    it('SWE JSON tests map to correct requirement URIs', () => {
      const expectedUris = [
        '/req/swecommon-json/mediatype',
        '/req/swecommon-json/schema',
      ];
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweJsonTestModule.createTests(ctx);
      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });

    it('SWE Text tests map to correct requirement URIs', () => {
      const expectedUris = [
        '/req/swecommon-text/mediatype',
        '/req/swecommon-text/non-empty',
      ];
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweTextTestModule.createTests(ctx);
      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });

    it('SWE Binary tests map to correct requirement URIs', () => {
      const expectedUris = [
        '/req/swecommon-binary/mediatype',
        '/req/swecommon-binary/non-empty',
      ];
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = sweBinaryTestModule.createTests(ctx);
      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully for binary tests', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock, { datastreamId: 'ds-1' });
      const tests = sweBinaryTestModule.createTests(ctx);

      for (const test of tests) {
        const result = await test.execute(ctx);
        expect(result.status).toBe('fail');
        expect(result.failureMessage).toContain('Connection refused');
      }
    });
  });
});
