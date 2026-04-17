// Unit tests for Connected Systems Part 1 — Deployment Features conformance class test module (S03-03).

import { describe, it, expect, vi } from 'vitest';
import { deploymentsTestModule } from '@/engine/registry/deployments';
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

function validDeploymentsBody() {
  return JSON.stringify({
    items: [
      { id: 'dep-1', name: 'Field Deployment', links: [{ rel: 'self', href: 'http://example.com/deployments/dep-1' }] },
    ],
  });
}

function validSingleDeploymentBody(id = 'dep-1') {
  return JSON.stringify({
    id,
    name: 'Field Deployment',
    links: [{ rel: 'self', href: `http://example.com/deployments/${id}` }],
  });
}

function validCollectionsWithDeployments() {
  // Per OGC 23-001 /req/deployment/collections, a conformant deployment
  // collection is identified by featureType="sosa:Deployment" (NOT by id).
  return JSON.stringify({
    collections: [
      { id: 'systems', title: 'Systems', itemType: 'feature', featureType: 'sosa:System', links: [] },
      { id: 'deployments', title: 'Deployments', itemType: 'feature', featureType: 'sosa:Deployment', links: [] },
    ],
  });
}

// --- Tests ---

describe('Connected Systems - Deployment Features conformance tests', () => {
  describe('class definition', () => {
    it('has correct classUri', () => {
      expect(deploymentsTestModule.classDefinition.classUri).toBe(
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment',
      );
    });

    it('depends on CS Part 1 Core', () => {
      expect(deploymentsTestModule.classDefinition.dependencies).toEqual([
        'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
      ]);
    });

    it('has 5 requirements', () => {
      expect(deploymentsTestModule.classDefinition.requirements).toHaveLength(5);
    });

    it('is not a write operation', () => {
      expect(deploymentsTestModule.classDefinition.isWriteOperation).toBe(false);
    });

    it('belongs to cs-part1 standard part', () => {
      expect(deploymentsTestModule.classDefinition.standardPart).toBe('cs-part1');
    });
  });

  describe('createTests', () => {
    it('creates 5 executable tests', () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);
      expect(tests).toHaveLength(5);
      for (const test of tests) {
        expect(typeof test.execute).toBe('function');
        expect(test.requirement).toBeDefined();
      }
    });
  });

  describe('Deployments Resources Endpoint test', () => {
    it('passes when GET /deployments returns 200 with valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validDeploymentsBody() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/deployment/resources-endpoint');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });

    it('fails when response is not valid JSON', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: 'not-json' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('valid JSON');
    });

    it('fails when request throws an error', async () => {
      const getMock = vi.fn().mockRejectedValue(new Error('Timeout'));
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[0].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('Timeout');
    });
  });

  describe('Deployment Canonical URL test', () => {
    it('passes when deployment returns 200 with correct id', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleDeploymentBody('dep-abc') }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-abc' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/deployment/canonical-url');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: '{}' }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-abc' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('fails when response id does not match', async () => {
      const body = JSON.stringify({ id: 'wrong-id', name: 'Wrong' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-abc' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('dep-abc');
      expect(result.failureMessage).toContain('wrong-id');
    });

    it('skips when no deploymentId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[1].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No deployments');
    });
  });

  describe('Deployment Canonical Endpoint test', () => {
    it('passes when deployment has a self link', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validSingleDeploymentBody('dep-1') }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/deployment/canonical-endpoint');
    });

    it('SKIPs when self link is absent (non-normative per OGC 23-001 rubric-6.1 audit)', async () => {
      // REQ-TEST-CITE-002: rel="self" at canonical URL /deployments/{id} is NOT
      // normatively required by OGC 23-001 /req/deployment/canonical-url.
      // Per GH #3 precedent, absence of self is SKIP (not FAIL).
      const body = JSON.stringify({
        id: 'dep-1',
        links: [{ rel: 'alternate', href: 'http://example.com/other' }],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toMatch(/23-001|canonical-url|non-canonical/);
    });

    it('fails when links array is missing', async () => {
      const body = JSON.stringify({ id: 'dep-1' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('links');
    });

    it('skips when no deploymentId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[2].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No deployments');
    });
  });

  describe('Deployments Referenced from System test', () => {
    it('passes when GET /systems/{id}/deployments returns 200', async () => {
      const body = JSON.stringify({ items: [] });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/deployment/ref-from-system');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 404, body: 'Not Found' }),
      );
      const ctx = makeTestContext(getMock, { systemId: 'sys-1' });
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('404');
    });

    it('skips when no systemId in discovery cache', async () => {
      const getMock = vi.fn();
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[3].execute(ctx);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toContain('No systems');
    });
  });

  describe('Deployments in Collections test', () => {
    it('passes when a collection declares featureType="sosa:Deployment" (OGC 23-001 /req/deployment/collections)', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body: validCollectionsWithDeployments() }),
      );
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe('/req/deployment/collections');
    });

    it('passes when a collection has non-canonical id but declares featureType="sosa:Deployment" (SCENARIO-FEATURECOLLECTION-TYPE-001)', async () => {
      // Per OGC 23-001, collection id is NOT normatively constrained — the
      // spec gives examples like "saildrone_missions". The featureType is
      // the authoritative signal. A spec-conformant server using a custom
      // id MUST pass this test.
      const body = JSON.stringify({
        collections: [
          {
            id: 'saildrone_missions',
            title: 'Saildrone Missions',
            itemType: 'feature',
            featureType: 'sosa:Deployment',
            links: [],
          },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('pass');
    });

    it('FAILS when a collection has id="deployments" but no featureType (closes legacy-id loophole; failure cites OGC 23-001)', async () => {
      // The old heuristic admitted this collection via id convention. Under
      // the new spec-correct check it FAILs because featureType is absent.
      // The failure message must cite /req/deployment/collections so the
      // server operator knows exactly what to add.
      const body = JSON.stringify({
        collections: [
          { id: 'deployments', title: 'Deployments', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sosa:Deployment');
      expect(result.failureMessage).toMatch(/23-001|\/req\/deployment\/collections/);
    });

    it('FAILS when a collection has itemType containing "deployment" but no featureType (closes the wrong-itemType loophole)', async () => {
      // The old heuristic admitted this via itemType.includes('deployment').
      // Spec says itemType="feature" (not a string containing "deployment"),
      // and the required signal is featureType="sosa:Deployment" — which
      // this fixture lacks. FAIL is spec-correct.
      const body = JSON.stringify({
        collections: [
          { id: 'my_missions', title: 'Missions', itemType: 'deployment_feature', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sosa:Deployment');
    });

    it('FAILS when a collection has itemType="feature" but NO featureType (addresses Raze GAP-2 2026-04-17T16:30Z)', async () => {
      // Half-conformant server: sets itemType correctly but omits featureType.
      // featureType is the authoritative signal per OGC 23-001
      // /req/deployment/collections; its absence MUST fail regardless of
      // itemType. This closes the "looks almost right" loophole.
      const body = JSON.stringify({
        collections: [
          { id: 'my_missions', title: 'Missions', itemType: 'feature', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body }));
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sosa:Deployment');
    });

    it('fails when no deployment-related collection exists at all', async () => {
      const body = JSON.stringify({
        collections: [
          { id: 'roads', title: 'Roads', itemType: 'feature', featureType: 'sosa:Road', links: [] },
        ],
      });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('sosa:Deployment');
    });

    it('fails when collections array is missing', async () => {
      const body = JSON.stringify({ title: 'No collections' });
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ body }),
      );
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('collections');
    });

    it('fails when status is not 200', async () => {
      const getMock = vi.fn().mockResolvedValue(
        makeHttpResponse({ statusCode: 500, body: 'Error' }),
      );
      const ctx = makeTestContext(getMock);
      const tests = deploymentsTestModule.createTests(ctx);

      const result = await tests[4].execute(ctx);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toContain('500');
    });
  });

  describe('requirement URIs', () => {
    it('each test maps to its correct requirement URI', () => {
      const expectedUris = [
        '/req/deployment/resources-endpoint',
        '/req/deployment/canonical-url',
        '/req/deployment/canonical-endpoint',
        '/req/deployment/ref-from-system',
        '/req/deployment/collections',
      ];

      const getMock = vi.fn();
      const ctx = makeTestContext(getMock, { deploymentId: 'dep-1', systemId: 'sys-1' });
      const tests = deploymentsTestModule.createTests(ctx);

      for (let i = 0; i < tests.length; i++) {
        expect(tests[i].requirement.requirementUri).toBe(expectedUris[i]);
      }
    });
  });
});
