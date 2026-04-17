// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-DYN-PASS-002 (ControlStream read-path conformance)
//   SCENARIO-DYN-OPTIN-001..002 (write-op opt-in gating; ControlStream CRUD)
//   SCENARIO-DYN-SKIP-001 (class-not-declared skip)

// Unit tests for Connected Systems Part 2 — Control Streams & Commands conformance class test module (S09-03).

import { describe, it, expect, vi } from 'vitest';
import { controlstreamsTestModule } from '@/engine/registry/controlstreams';
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

function validControlStreamsBody() {
  return JSON.stringify({
    items: [
      { id: 'cs-1', name: 'Actuator Control', type: 'http://example.com/type' },
      { id: 'cs-2', name: 'Valve Control', type: 'http://example.com/type' },
    ],
  });
}

function validSingleControlStreamBody(id = 'cs-1') {
  return JSON.stringify({
    id,
    name: 'Actuator Control',
    type: 'http://example.com/type',
  });
}

function validCommandsBody() {
  return JSON.stringify({
    items: [
      { id: 'cmd-1', commandCode: 'open', parameters: {} },
    ],
  });
}

function validSingleCommandBody(id = 'cmd-1') {
  return JSON.stringify({
    id,
    commandCode: 'open',
    parameters: {},
  });
}

// --- Tests ---

describe('Connected Systems Part 2 - Control Streams & Commands conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(controlstreamsTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/controlstream',
      );
    });

    it('depends on Part 2 Common and Part 1 System', () => {
      expect(controlstreamsTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/api-common',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
      ]);
    });

    it('has 6 requirements', () => {
      expect(controlstreamsTestModule.classDefinition.requirements).toHaveLength(6);
    });

    it('is not a write operation', () => {
      expect(controlstreamsTestModule.classDefinition.isWriteOperation).toBe(false);
    });

    it('belongs to cs-part2 standard part', () => {
      expect(controlstreamsTestModule.classDefinition.standardPart).toBe('cs-part2');
    });
  });

  describe('createTests', () => {
    it('creates 6 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);
      expect(tests).toHaveLength(6);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Control Streams Resources Endpoint test', () => {
    it('passes when GET /controlstreams returns 200 with items array', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validControlStreamsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/resources-endpoint');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

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
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when items array is missing', async () => {
      const body = JSON.stringify({ controlstreams: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('items');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Connection refused'));
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Connection refused');
    });
  });

  describe('Control Stream Canonical URL test', () => {
    it('passes when control stream returns 200 with correct id', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleControlStreamBody('cs-abc') }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/canonical-url');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '{}' }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response id does not match', async () => {
      const body = JSON.stringify({ id: 'different-id', name: 'Wrong' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('cs-abc');
      expect(result.failureMessage).toContain('different-id');
    });

    it('skips when no controlStreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No control stream');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not-json' }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Control Streams Referenced from System test', () => {
    it('passes when GET /systems/{id}/controlstreams returns 200 with items', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validControlStreamsBody() }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/ref-from-system');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

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
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('items');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'bad-json' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });
  });

  describe('Control Stream Schema Operation test', () => {
    it('passes when GET /controlstreams/{id}/schema returns 200 with content', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: JSON.stringify({ type: 'record', fields: [] }) }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/schema-op');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response body is empty', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: '   ' }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('non-empty');
    });

    it('skips when no controlStreamId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No control stream');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Timeout'));
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Timeout');
    });
  });

  describe('Commands Resources Endpoint test', () => {
    it('passes when GET /commands returns 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validCommandsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/cmd-resources-endpoint');
    });

    it('falls back to /controlstreams/{id}/commands when /commands fails', async () => {
      let callCount = 0;
      const getMock = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(makeHttpResponse({ statusCode: 404, body: 'Not Found' }));
        }
        return Promise.resolve(makeHttpResponse({ body: validCommandsBody() }));
      });
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('fails when both /commands and fallback return non-200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });

    it('fails when /commands returns non-200 and no controlStreamId available', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('200');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Network error'));
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Network error');
    });
  });

  describe('Command Canonical URL test', () => {
    it('passes when command returns 200 with correct id', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleCommandBody('cmd-abc') }),
      );
      const ctx = makeTestContext(getMock, { commandId: 'cmd-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/cmd-canonical-url');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '{}' }),
      );
      const ctx = makeTestContext(getMock, { commandId: 'cmd-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response id does not match', async () => {
      const body = JSON.stringify({ id: 'other-cmd', commandCode: 'close' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { commandId: 'cmd-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('cmd-abc');
      expect(result.failureMessage).toContain('other-cmd');
    });

    it('skips when no commandId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No command');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'invalid-json' }),
      );
      const ctx = makeTestContext(getMock, { commandId: 'cmd-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Timeout'));
      const ctx = makeTestContext(getMock, { commandId: 'cmd-abc' });
      const tests = controlstreamsTestModule.createTests(ctx);

      const result = await tests[5].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Timeout');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/resources-endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/canonical-url',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/ref-from-system',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/schema-op',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/cmd-resources-endpoint',
        'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/controlstream/cmd-canonical-url',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { controlStreamId: 'cs-1', commandId: 'cmd-1', systemId: 'sys-1' });
      const tests = controlstreamsTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
