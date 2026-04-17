// Regression tests for OGC API Features Part 1 items-links assertion.
// Locks in the Raze rubric-6.1 audit finding 2026-04-17:
//
//   `rel="self"` on items responses IS normatively required per
//   OGC 17-069r4 §7.15 Requirement 28 A:
//     "The response SHALL include a link to this resource (i.e. `self`)
//      and to the alternate representations of this resource (`alternate`)
//      (permitted only if the resource is represented in alternate formats)."
//
// This differs from the OGC Common Part 1 (19-072) landing page case
// (see SCENARIO-LINKS-NORMATIVE-001) where `self` is only an example.
// The Raze 6.1 rubric requires each rel-link assertion to cite its
// normative source; these tests plus the inline comments at
// `src/engine/registry/features-core.ts:77-97` and `:611-614` complete
// the audit.
//
// References:
//   - REQ-TEST-002 (item 5) in openspec/capabilities/conformance-testing/spec.md
//   - REQ-TEST-CITE-002: source-citation mandate for all rel-link assertions
//   - SCENARIO-FEATURES-LINKS-001: items-links normatively requires self
//   - SCENARIO-FEATURES-LINKS-002: audit-trail requirement for rel assertions

import { describe, it, expect, vi } from 'vitest';
import { featuresCoreTestModule } from '@/engine/registry/features-core';
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
    id: `ex-fc-links-${++exchangeCounter}`,
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
    collectionIds: ['test-collection'],
    links: [],
    ...overrides,
  };
}

function makeTestContext(getMock: ReturnType<typeof vi.fn>): TestContext {
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
    baseUrl: 'http://example.com/',
    auth: { type: 'none' },
    config: { timeoutMs: 30000, concurrency: 5 },
    discoveryCache: makeDiscoveryCache(),
    cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: vi.fn() },
  };
}

function getItemsLinksTest(ctx: TestContext) {
  const tests = featuresCoreTestModule.createTests(ctx);
  return tests.find(
    (t) => t.requirement.requirementUri === 'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-links',
  )!;
}

// --- SCENARIO-FEATURES-LINKS-001 ---

describe('REQ_ITEMS_LINKS — OGC 17-069r4 §7.15 Requirement 28 A (self is normative)', () => {
  it('PASSES when items response includes rel=self (the normative requirement)', async () => {
    const itemsBody = JSON.stringify({
      type: 'FeatureCollection',
      features: [],
      numberReturned: 0,
      links: [
        { rel: 'self', href: 'http://example.com/collections/test-collection/items' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: itemsBody }));
    const ctx = makeTestContext(getMock);

    const result = await getItemsLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('pass');
    expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-links');
  });

  it('FAILS when items response omits rel=self, with a message citing the OGC 17-069 source', async () => {
    // GH #3 analogue REVERSED: here `self` IS normative, so absence IS a real failure.
    const itemsBody = JSON.stringify({
      type: 'FeatureCollection',
      features: [],
      links: [
        { rel: 'alternate', href: 'http://example.com/items.html', type: 'text/html' },
        { rel: 'next', href: 'http://example.com/items?page=2' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: itemsBody }));
    const ctx = makeTestContext(getMock);

    const result = await getItemsLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('fail');
    // Failure message MUST cite the normative source so the reviewer can audit.
    expect(result.failureMessage).toMatch(/17-069/);
    expect(result.failureMessage).toMatch(/self/);
  });

  it('PASSES with just rel=self (alternate/next/prev are conditional, not unconditionally required)', async () => {
    const itemsBody = JSON.stringify({
      type: 'FeatureCollection',
      features: [],
      links: [
        { rel: 'self', href: 'http://example.com/collections/test-collection/items' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: itemsBody }));
    const ctx = makeTestContext(getMock);

    const result = await getItemsLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('pass');
  });

  it('FAILS when the links array is missing entirely', async () => {
    const itemsBody = JSON.stringify({
      type: 'FeatureCollection',
      features: [],
      // links property omitted
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: itemsBody }));
    const ctx = makeTestContext(getMock);

    const result = await getItemsLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('fail');
    expect(result.failureMessage).toMatch(/links/);
  });

  // --- SCENARIO-FEATURES-LINKS-002 audit-trail regression ---

  it('audit-trail: the requirement definition carries an OGC 17-069 source citation in its description', async () => {
    const ctx = makeTestContext(vi.fn());
    const tests = featuresCoreTestModule.createTests(ctx);
    const linksTest = tests.find(
      (t) => t.requirement.requirementUri === 'http://www.opengis.net/spec/ogcapi-features-1/1.0/req/ogcapi-features/items-links',
    )!;

    // REQ-TEST-CITE-002: source-citation mandate — the REQ definition must
    // reference the normative OGC spec section. This test will fail if a
    // future refactor strips the citation, alerting the reviewer.
    expect(linksTest.requirement.description).toMatch(/17-069/);
    expect(linksTest.requirement.description).toMatch(/§?7\.15|7\.15/);
  });
});
