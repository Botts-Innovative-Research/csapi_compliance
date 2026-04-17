// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-TEST-PASS-001..002 (pass/fail verdicts for CS API Core class)
//   SCENARIO-TEST-DEPGRAPH-001 (core-class prereq for downstream classes)

// REQ-TEST-003: Unit tests for CS API Core conformance class test module (S03-01).

import { describe, it, expect, vi } from 'vitest';
import { csapiCoreTestModule } from '@/engine/registry/csapi-core';
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

// Reusable response bodies
function validSystemsBody() {
  return JSON.stringify({
    items: [
      {
        id: 'system-001',
        properties: {
          uid: 'urn:example:system:001',
          name: 'Test System',
        },
      },
    ],
  });
}

function systemsBodyNoId() {
  return JSON.stringify({
    items: [
      {
        properties: {
          uid: 'urn:example:system:001',
          name: 'Test System',
        },
      },
    ],
  });
}

function systemsBodyNoUid() {
  return JSON.stringify({
    items: [
      {
        id: 'system-001',
        properties: {
          name: 'Test System',
        },
      },
    ],
  });
}

// --- Tests ---

describe('CS API Core conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(csapiCoreTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
      );
    });

    it('depends on Features Core', () => {
      expect(csapiCoreTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
      ]);
    });

    it('has 3 requirements', () => {
      expect(csapiCoreTestModule.classDefinition.requirements).toHaveLength(3);
    });

    it('is not a write operation', () => {
      expect(csapiCoreTestModule.classDefinition.isWriteOperation).toBe(false);
    });
  });

  describe('createTests', () => {
    it('creates 3 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = csapiCoreTestModule.createTests(ctx);
      expect(tests).toHaveLength(3);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Resource IDs test', () => {
    it('passes when items have id field', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSystemsBody() }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-001' });
      const tests = csapiCoreTestModule.createTests(ctx);
      const resourceIdsTest = tests[0];

      const result = await resourceIdsTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/api-common/resource-ids');
      expect(result.conformanceUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/api-common/resource-ids');
    });

    it('fails when id is missing from items', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: systemsBodyNoId() }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-001' });
      const tests = csapiCoreTestModule.createTests(ctx);
      const resourceIdsTest = tests[0];

      const result = await resourceIdsTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('id');
    });

    it('skips when no systems available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = csapiCoreTestModule.createTests(ctx);
      const resourceIdsTest = tests[0];

      const result = await resourceIdsTest.execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('Resource UIDs test', () => {
    it('passes when uid is present', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSystemsBody() }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-001' });
      const tests = csapiCoreTestModule.createTests(ctx);
      const resourceUidsTest = tests[1];

      const result = await resourceUidsTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/api-common/resource-uids');
    });

    it('passes when uid is missing (SHOULD requirement)', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: systemsBodyNoUid() }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-001' });
      const tests = csapiCoreTestModule.createTests(ctx);
      const resourceUidsTest = tests[1];

      const result = await resourceUidsTest.execute(ctx);

      // SHOULD requirement: warn but pass if missing
      expect(result.status).toBe('pass');
    });

    it('skips when no systems available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = csapiCoreTestModule.createTests(ctx);
      const resourceUidsTest = tests[1];

      const result = await resourceUidsTest.execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('DateTime filter test', () => {
    it('passes with 200 response', async () => {
      const body = JSON.stringify({ items: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-001' });
      const tests = csapiCoreTestModule.createTests(ctx);
      const datetimeTest = tests[2];

      const result = await datetimeTest.execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/api-common/datetime');
    });

    it('fails with 400 response', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 400, body: 'Bad Request' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'system-001' });
      const tests = csapiCoreTestModule.createTests(ctx);
      const datetimeTest = tests[2];

      const result = await datetimeTest.execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
      expect(result.failureMessage).toContain('400');
    });

    it('skips when no systems available', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = csapiCoreTestModule.createTests(ctx);
      const datetimeTest = tests[2];

      const result = await datetimeTest.execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/api-common/resource-ids',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/api-common/resource-uids',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/api-common/datetime',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { systemId: 'system-001' });
      const tests = csapiCoreTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
