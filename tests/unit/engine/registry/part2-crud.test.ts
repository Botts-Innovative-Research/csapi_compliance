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
    it('passes when observation POST returns 201', async () => {
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
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, delete: deleteMock },
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
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2CrudTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
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
