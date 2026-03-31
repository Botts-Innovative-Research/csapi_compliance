// Unit tests for Part 2 Update conformance class test module (S09-06).

import { describe, it, expect, vi } from 'vitest';
import { part2UpdateTestModule } from '@/engine/registry/part2-update';
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

describe('Part 2 Update conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(part2UpdateTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/update',
      );
    });

    it('depends on Part 2 CRUD class', () => {
      expect(part2UpdateTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/create-replace-delete',
      ]);
    });

    it('has 2 requirements', () => {
      expect(part2UpdateTestModule.classDefinition.requirements).toHaveLength(2);
    });

    it('is a write operation', () => {
      expect(part2UpdateTestModule.classDefinition.isWriteOperation).toBe(true);
    });
  });

  describe('createTests', () => {
    it('creates 2 executable tests', () => {
      const ctx = makeTestContext();
      const tests = part2UpdateTestModule.createTests(ctx);
      expect(tests).toHaveLength(2);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Update Datastream test', () => {
    it('passes when create-patch-verify-delete lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '{}' }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '{}' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, patch: patchMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/update/datastream');
      expect(result.exchangeIds).toHaveLength(4);
    });

    it('skips when no systemId in discovery cache', async () => {
      const ctx = makeTestContext();
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });

    it('fails when POST does not return 201', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );

      const ctx = makeTestContext({ post: postMock }, { systemId: 'sys-1' });
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
    });

    it('fails when PATCH does not return 200 or 204', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, patch: patchMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200 or 204');
    });

    it('attempts cleanup on failure', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/datastreams/ds-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, patch: patchMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2UpdateTestModule.createTests(ctx);
      await tests[0].execute(ctx);

      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('Update Control Stream test', () => {
    it('passes when create-patch-verify-delete lifecycle succeeds', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/controlstreams/cs-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: '{}' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, patch: patchMock, get: getMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/update/controlstream');
    });

    it('skips when no systemId in discovery cache', async () => {
      const ctx = makeTestContext();
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
    });

    it('fails when POST does not return 201', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );

      const ctx = makeTestContext({ post: postMock }, { systemId: 'sys-1' });
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
    });

    it('fails when PATCH does not return 200 or 204', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/controlstreams/cs-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 405, body: 'Not Allowed' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext(
        { post: postMock, patch: patchMock, delete: deleteMock },
        { systemId: 'sys-1' },
      );
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200 or 204');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/update/datastream',
        '/req/update/controlstream',
      ];

      const ctx = makeTestContext();
      const tests = part2UpdateTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const postMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const ctx = makeTestContext({ post: postMock }, { systemId: 'sys-1' });
      const tests = part2UpdateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('ECONNREFUSED');
    });
  });
});
