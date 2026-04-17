// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-TEST-CRUD-001 (update via PATCH is part of the CRUD lifecycle)
//   SCENARIO-TEST-WARN-001..002 (write-op opt-in warning + enforcement)

// Unit tests for Update conformance class test module (S03-06).

import { describe, it, expect, vi } from 'vitest';
import { updateTestModule } from '@/engine/registry/update';
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

describe('Update conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(updateTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/update',
      );
    });

    it('depends on CRUD class', () => {
      expect(updateTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete',
      ]);
    });

    it('has 3 requirements', () => {
      expect(updateTestModule.classDefinition.requirements).toHaveLength(3);
    });

    it('is a write operation', () => {
      expect(updateTestModule.classDefinition.isWriteOperation).toBe(true);
    });
  });

  describe('createTests', () => {
    it('creates 3 executable tests', () => {
      const ctx = makeTestContext();
      const tests = updateTestModule.createTests(ctx);
      expect(tests).toHaveLength(3);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Update System test', () => {
    it('passes when create-patch-verify-delete lifecycle succeeds', async () => {
      const updatedBody = JSON.stringify({
        type: 'Feature',
        id: 'sys-1',
        properties: { name: 'CSAPI Compliance Test Resource Updated' },
        geometry: null,
      });

      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/sys-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: updatedBody }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: updatedBody }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, patch: patchMock, get: getMock, delete: deleteMock });
      const tests = updateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/update/system');
      expect(result.exchangeIds).toHaveLength(4);
    });

    it('fails when POST does not return 201', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );

      const ctx = makeTestContext({ post: postMock });
      const tests = updateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('201');
    });

    it('fails when PATCH does not return 200 or 204', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/sys-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, patch: patchMock, delete: deleteMock });
      const tests = updateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200 or 204');
    });

    it('fails when PATCH does not update the name', async () => {
      const unchangedBody = JSON.stringify({
        type: 'Feature',
        id: 'sys-1',
        properties: { name: 'Original Name' },
        geometry: null,
      });

      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/sys-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: unchangedBody }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: unchangedBody }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, patch: patchMock, get: getMock, delete: deleteMock });
      const tests = updateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('CSAPI Compliance Test Resource Updated');
    });

    it('attempts cleanup on failure', async () => {
      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/systems/sys-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, patch: patchMock, delete: deleteMock });
      const tests = updateTestModule.createTests(ctx);
      await tests[0].execute(ctx);

      expect(deleteMock).toHaveBeenCalled();
    });
  });

  describe('Update Deployment test', () => {
    it('passes when full lifecycle succeeds', async () => {
      const updatedBody = JSON.stringify({
        type: 'Feature',
        id: 'dep-1',
        properties: { name: 'CSAPI Compliance Test Resource Updated' },
        geometry: null,
      });

      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/deployments/dep-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: updatedBody }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, patch: patchMock, get: getMock, delete: deleteMock });
      const tests = updateTestModule.createTests(ctx);
      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/update/deployment');
    });
  });

  describe('Update Procedure test', () => {
    it('passes when full lifecycle succeeds', async () => {
      const updatedBody = JSON.stringify({
        type: 'Feature',
        id: 'proc-1',
        properties: { name: 'CSAPI Compliance Test Resource Updated' },
        geometry: null,
      });

      const postMock = vi.fn().mockResolvedValue(
        makeHttpResponse({
          statusCode: 201,
          headers: { 'location': '/procedures/proc-1' },
        }),
      );
      const patchMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: updatedBody }),
      );
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 200, body: updatedBody }),
      );
      const deleteMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 204, body: '' }),
      );

      const ctx = makeTestContext({ post: postMock, patch: patchMock, get: getMock, delete: deleteMock });
      const tests = updateTestModule.createTests(ctx);
      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/update/procedure');
    });
  });

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const postMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const ctx = makeTestContext({ post: postMock });
      const tests = updateTestModule.createTests(ctx);
      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('ECONNREFUSED');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/update/system',
        '/req/update/deployment',
        '/req/update/procedure',
      ];

      const ctx = makeTestContext();
      const tests = updateTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
