// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-TEST-CRUD-001 (full Create-Replace-Delete lifecycle)
//   SCENARIO-TEST-WARN-001..002 (write-op opt-in warning + enforcement)

// Unit tests for Create/Replace/Delete conformance class test module (S03-06).

import { describe, it, expect, vi } from 'vitest';
import { crudTestModule } from '@/engine/registry/crud';
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
} = {}): TestContext {
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
    discoveryCache: makeDiscoveryCache(),
    cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: vi.fn() },
  };
}

// --- Tests ---

describe('Create/Replace/Delete conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(crudTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete',
      );
    });

    it('depends on System class', () => {
      expect(crudTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 6 requirements', () => {
      expect(crudTestModule.classDefinition.requirements).toHaveLength(6);
    });

    it('is a write operation', () => {
      expect(crudTestModule.classDefinition.isWriteOperation).toBe(true);
    });
  });

  describe('createTests', () => {
    it('creates 6 executable tests', () => {
      const ctx = makeTestContext();
      const tests = crudTestModule.createTests(ctx);
      expect(tests).toHaveLength(6);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('CRUD System test', () => {
    it('passes when full lifecycle succeeds (201 -> 200 -> 204 -> 404)', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/test-123' },
        }),
      );
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 200, body: '{}' }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 404, body: '' }));
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/system');
      expect(result.exchangeIds).toHaveLength(4);
    });

    it('fails when POST does not return 201', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );

      const ctx = makeTestContext({ post: postMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
      expect(result.failureMessage).toContain('400');
    });

    it('fails when POST does not return Location header', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: {},
        }),
      );

      const ctx = makeTestContext({ post: postMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Location');
    });

    it('fails when GET after create does not return 200', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/test-123' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });

    it('fails when DELETE does not return 204 or 200', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/test-123' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '{}' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('204');
    });

    it('fails when GET after DELETE does not return 404', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/test-123' },
        }),
      );
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 200, body: '{}' }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 200, body: '{}' }));
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('attempts cleanup on failure', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/test-123' },
        }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      await tests[0].execute(ctx);

      // DELETE should be called for cleanup (in finally block)
      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('CRUD System Delete Cascade test', () => {
    it('passes when create-delete-verify lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/cascade-123' },
        }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/system-delete-cascade');
    });

    it('fails when POST does not return 201', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );

      const ctx = makeTestContext({ post: postMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
    });
  });

  describe('CRUD Deployment test', () => {
    it('passes when full lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/deployments/dep-1' },
        }),
      );
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 200, body: '{}' }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 404, body: '' }));
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/deployment');
    });

    it('fails when POST returns wrong status', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );

      const ctx = makeTestContext({ post: postMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
    });
  });

  describe('CRUD Procedure test', () => {
    it('passes when full lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/procedures/proc-1' },
        }),
      );
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 200, body: '{}' }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 404, body: '' }));
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/procedure');
    });
  });

  describe('CRUD Sampling Feature test', () => {
    it('passes when full lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/samplingFeatures/sf-1' },
        }),
      );
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 200, body: '{}' }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 404, body: '' }));
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/sampling-feature');
    });
  });

  describe('CRUD Property test', () => {
    it('passes when full lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/properties/prop-1' },
        }),
      );
      const getMock = vi.fn()
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 200, body: '{}' }))
        .mockResolvedValueOnce(makeHttpResponse({ statusCode: 404, body: '' }));
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, get: getMock, delete: deleteMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/create-replace-delete/property');
    });

    it('fails when POST returns wrong status', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 422, body: 'Unprocessable' }),
      );

      const ctx = makeTestContext({ post: postMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
      expect(result.failureMessage).toContain('422');
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const postMock = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const ctx = makeTestContext({ post: postMock });
      const tests = crudTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Connection refused');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/create-replace-delete/system',
        '/req/create-replace-delete/system-delete-cascade',
        '/req/create-replace-delete/deployment',
        '/req/create-replace-delete/procedure',
        '/req/create-replace-delete/sampling-feature',
        '/req/create-replace-delete/property',
      ];

      const ctx = makeTestContext();
      const tests = crudTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
