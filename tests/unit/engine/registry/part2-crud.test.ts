// Unit tests for Part 2 Create/Replace/Delete conformance class test module (S09-06).

import { describe, it, expect, vi } from 'vitest';
import { part2CrudTestModule } from '@/engine/registry/part2-crud';
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

function makeTestContext(overrides: {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
  patch?: ReturnType<typeof vi.fn>;
} = {}, cacheOverrides: Partial<DiscoveryCache> = {}): TestContext {
  return {
    httpClient: {
      request: vi.fn(),
      get: overrides.get ?? vi.fn(),
      post: overrides.post ?? vi.fn(),
      put: vi.fn(),
      patch: overrides.patch ?? vi.fn(),
      delete: overrides.delete ?? vi.fn(),
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

describe('Part 2 Create/Replace/Delete conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2CrudTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/create-replace-delete',
      );
    });

    it('depends on Datastream class', () => {
      expect(part2CrudTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream',
      ]);
    });

    it('has 3 requirements', () => {
      expect(part2CrudTestModule.classDefinition.requirements).toHaveLength(3);
    });

    it('is a write operation', () => {
      expect(part2CrudTestModule.classDefinition.isWriteOperation).toBe(true);
    });
  });

  describe('createTests', () => {
    it('creates 3 executable tests', () => {
      const ctx = makeTestContext();
      const tests = part2CrudTestModule.createTests(ctx);
      expect(tests).toHaveLength(3);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('CRUD Datastream test', () => {
    it('passes when full lifecycle succeeds (201 -> 200 -> 204)', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '{}' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/datastream');
      expect(result.exchangeIds).toHaveLength(3);
    });

    it('skips when no systemId in discovery cache', async () => {
      const ctx = makeTestContext();
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });

    it('fails when POST does not return 201', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );

      const ctx = makeTestContext({ post: postMock }, { systemId: 'sys-1' });
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
      expect(result.failureMessage).toContain('400');
    });

    it('fails when POST does not return Location header', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 201, headers: {} }),
      );

      const ctx = makeTestContext({ post: postMock }, { systemId: 'sys-1' });
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Location');
    });

    it('attempts cleanup on failure', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      await tests[0].execute(ctx);

      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('CRUD Observation test', () => {
    // REQ-TEST-DYNAMIC-002: testCrudObservation now performs a GET on the
    // server's datastream between POST-datastream and POST-observation so
    // the observation body derives from the server's view. These tests
    // provide the GET mock accordingly.
    const validServerDatastream = {
      statusCode: 200,
      body: JSON.stringify({
        id: 'ds-1',
        resultType: 'measure',
        schema: {
          resultSchema: { type: 'Quantity', uom: { code: 'Cel' } },
        },
      }),
    };

    // REQ-TEST-DYNAMIC-002: existing-datastream fallback path (no POST-datastream
    // Location header to build from — the test reuses a datastreamId from the
    // discovery cache). The runtime-coupling GET must still fire against the
    // existing datastream so the observation body derives from the server's view.
    it('fallback: when POST datastream lacks Location header and discovery has datastreamId, GET the existing datastream and derive the observation body from it', async () => {
      const postMock = vi.fn()
        // First POST: datastream creation returns 201 but NO Location
        // (server impl that only uses explicit IDs); the code falls back to
        // the discovery-cache datastreamId.
        .mockResolvedValueOnce(
          makeHttpResponse({ statusCode: 201, headers: {} }),
        )
        // Second POST: observation insert — must use server-returned shape.
        .mockResolvedValueOnce(
          makeHttpResponse({
            statusCode: 201,
            headers: { 'location': '/observations/obs-1' },
          }),
        );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse(validServerDatastream),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1', datastreamId: 'existing-ds-7' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      // The test must PASS — the existing-datastream path should still exercise
      // the runtime coupling, not silently skip it.
      expect(result.status).toBe('pass');
      // GET must have been called exactly once on the existing datastream URL
      expect(getMock).toHaveBeenCalledTimes(1);
      const getUrl = getMock.mock.calls[0][0] as string;
      expect(getUrl).toMatch(/datastreams\/existing-ds-7/);
    });

    it('passes when observation POST returns 201 (server echoes client resultType)', async () => {
      const postMock = vi.fn()
        .mockResolvedValueOnce(
          makeHttpResponse({
            statusCode: 201,
            headers: { 'location': '/datastreams/ds-1' },
          }),
        )
        .mockResolvedValueOnce(
          makeHttpResponse({
            statusCode: 201,
            headers: { 'location': '/observations/obs-1' },
          }),
        );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse(validServerDatastream),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/observation');
    });

    it('skips when no systemId in discovery cache', async () => {
      const ctx = makeTestContext();
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when observation POST returns non-201', async () => {
      const postMock = vi.fn()
        .mockResolvedValueOnce(
          makeHttpResponse({
            statusCode: 201,
            headers: { 'location': '/datastreams/ds-1' },
          }),
        )
        .mockResolvedValueOnce(
          makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
        );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse(validServerDatastream),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
    });

    // REQ-TEST-DYNAMIC-002 / SCENARIO-OBS-SCHEMA-003: unparseable datastream
    // response fails loudly (doesn't silently fall back to the fixture).
    it('fails with a parseable-JSON error when GET datastream returns non-JSON body', async () => {
      const postMock = vi.fn().mockResolvedValueOnce(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '<html>not json</html>' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toMatch(/parseable JSON|parse error/i);
      // Must NOT have POSTed an observation with the fixture body
      expect(postMock).toHaveBeenCalledTimes(1);
    });

    // REQ-TEST-DYNAMIC-002 / SCENARIO-OBS-SCHEMA-003: GET datastream 4xx/5xx
    it('fails when GET datastream returns non-200 (cannot derive observation body)', async () => {
      const postMock = vi.fn().mockResolvedValueOnce(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'server error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toMatch(/REQ-TEST-DYNAMIC-002|200/);
      expect(postMock).toHaveBeenCalledTimes(1);
    });

    // REQ-TEST-DYNAMIC-002 / SCENARIO-OBS-SCHEMA-002: server rewrites resultType
    it('fails when server-returned datastream has unsupported resultType (runtime coupling)', async () => {
      const postMock = vi.fn().mockResolvedValueOnce(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      // Server rewrote the client's 'measure' proposal to 'record' (a
      // resultType the observation builder does not currently support).
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 200,
          body: JSON.stringify({ id: 'ds-1', resultType: 'record' }),
        }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toMatch(/REQ-TEST-DYNAMIC-002|mirror|resultType/i);
      // No observation should have been POSTed when the builder could not
      // mirror the server's shape.
      expect(postMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('CRUD Control Stream test', () => {
    it('passes when full lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/controlstreams/cs-1' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '{}' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/controlstream');
      expect(result.exchangeIds).toHaveLength(3);
    });

    it('skips when no systemId in discovery cache', async () => {
      const ctx = makeTestContext();
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when POST returns wrong status', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );

      const ctx = makeTestContext({ post: postMock }, { systemId: 'sys-1' });
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/create-replace-delete/datastream',
        '/req/create-replace-delete/observation',
        '/req/create-replace-delete/controlstream',
      ];

      const ctx = makeTestContext();
      const tests = part2CrudTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const postMock = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const ctx = makeTestContext({ post: postMock }, { systemId: 'sys-1' });
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Connection refused');
    });
  });
});
