// Regression tests for the Landing Page Required Links conformance check.
// Locks in the correct normative interpretation of OGC API - Common Part 1 (19-072)
// `/req/core/root-success`: the landing page SHALL include an API definition link
// (rel=service-desc OR rel=service-doc) AND a conformance link (rel=conformance).
// `self` is only an illustrative example in the spec and is NOT normatively required.
//
// References:
//   - REQ-TEST-001 (openspec/capabilities/conformance-testing/spec.md): OGC API Common Part 1 Tests
//   - SCENARIO-LINKS-NORMATIVE-001: Landing page PASSES without rel=self when service-desc and
//     conformance links are present (regression for GitHub issue #3 false positive).
//   - SCENARIO-LINKS-NORMATIVE-002: service-doc satisfies the OR-relation (no service-desc needed).
//   - SCENARIO-LINKS-NORMATIVE-003: Missing `conformance` link is a true normative FAIL.
//   - Requirement: REQ_LANDING_PAGE_LINKS (`/req/ogcapi-common/landing-page-links`).

import { describe, it, expect, vi } from 'vitest';
import { commonTestModule } from '@/engine/registry/common';
import type {
  TestContext,
  HttpResponse,
  HttpExchange,
  DiscoveryCache,
} from '@/lib/types';

// --- Helpers (mirror common.test.ts to stay self-contained) ---

let exchangeCounter = 0;

function makeExchange(): HttpExchange {
  return {
    id: `ex-links-${++exchangeCounter}`,
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
    baseUrl: 'http://example.com',
    auth: { type: 'none' },
    config: { timeoutMs: 30000, concurrency: 5 },
    discoveryCache: makeDiscoveryCache(),
    cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: vi.fn() },
  };
}

function getLinksTest(ctx: TestContext) {
  const tests = commonTestModule.createTests(ctx);
  // Index 1 is the Landing Page Required Links test (see commonTestModule.createTests order).
  return tests[1];
}

// --- SCENARIO-LINKS-NORMATIVE-001 ---
describe('REQ_LANDING_PAGE_LINKS — normative OGC API Common Part 1 /req/core/root-success', () => {
  it('PASSES when `self` is absent but service-desc + conformance + collections are present (issue #3 regression)', async () => {
    const landingBody = JSON.stringify({
      title: 'Issue #3 regression fixture',
      links: [
        { rel: 'service-desc', href: 'http://example.com/api', type: 'application/vnd.oai.openapi+json;version=3.0' },
        { rel: 'conformance', href: 'http://example.com/conformance', type: 'application/json' },
        { rel: 'data', href: 'http://example.com/collections', type: 'application/json' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: landingBody }));
    const ctx = makeTestContext(getMock);

    const result = await getLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('pass');
    expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/landing-page-links');
  });

  // --- SCENARIO-LINKS-NORMATIVE-002 ---
  it('PASSES when service-doc (HTML API definition) substitutes for service-desc (OR relation)', async () => {
    const landingBody = JSON.stringify({
      links: [
        { rel: 'service-doc', href: 'http://example.com/api.html', type: 'text/html' },
        { rel: 'conformance', href: 'http://example.com/conformance', type: 'application/json' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: landingBody }));
    const ctx = makeTestContext(getMock);

    const result = await getLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('pass');
    expect(result.requirementUri).toBe('http://www.opengis.net/spec/ogcapi-common-1/1.0/req/ogcapi-common/landing-page-links');
  });

  // --- SCENARIO-LINKS-NORMATIVE-003 ---
  it('FAILS when the conformance link is missing (true normative violation)', async () => {
    const landingBody = JSON.stringify({
      links: [
        { rel: 'self', href: 'http://example.com' },
        { rel: 'service-desc', href: 'http://example.com/api' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: landingBody }));
    const ctx = makeTestContext(getMock);

    const result = await getLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('fail');
    // The failure message must cite the missing `conformance` relation.
    expect(result.failureMessage).toContain('conformance');
    // And it must NOT demand `self` (issue #3 root cause: `self` is not normative).
    expect(result.failureMessage).not.toMatch(/missing:[^\n]*\bself\b/);
  });

  it('FAILS when neither service-desc nor service-doc is present', async () => {
    const landingBody = JSON.stringify({
      links: [
        { rel: 'self', href: 'http://example.com' },
        { rel: 'conformance', href: 'http://example.com/conformance' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: landingBody }));
    const ctx = makeTestContext(getMock);

    const result = await getLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('fail');
    expect(result.failureMessage).toContain('service-desc');
    expect(result.failureMessage).toContain('service-doc');
  });

  it('PASSES when ONLY the normative relations are present (no `self`, no extras)', async () => {
    // Minimal normatively-conformant landing page per /req/core/root-success.
    const landingBody = JSON.stringify({
      links: [
        { rel: 'service-desc', href: '/api' },
        { rel: 'conformance', href: '/conformance' },
      ],
    });
    const getMock = vi.fn().mockResolvedValue(makeHttpResponse({ body: landingBody }));
    const ctx = makeTestContext(getMock);

    const result = await getLinksTest(ctx).execute(ctx);

    expect(result.status).toBe('pass');
  });
});
