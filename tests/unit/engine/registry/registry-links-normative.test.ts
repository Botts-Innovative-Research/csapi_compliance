// Regression tests for the rubric-6.1 sprint (2026-04-17).
// Locks in the REQ-TEST-CITE-002 audit findings for 7 registry modules:
//
//   procedures.ts / properties.ts / sampling.ts / deployments.ts /
//   system-features.ts — rel="self" on canonical-URL resources is NOT
//   normatively required by OGC 23-001 (which only mandates rel="canonical"
//   on non-canonical URLs via /req/<X>/canonical-url). Absence is SKIP,
//   not FAIL.
//
//   subsystems.ts / subdeployments.ts — rel="parent"/"up" on child
//   resources is NOT normatively required by OGC 23-001
//   /req/sub<Y>/recursive-assoc (which governs recursive aggregation of
//   associations on the parent, not parent-link relations on children).
//   Absence is SKIP, not FAIL.
//
// These tests mirror the pattern of
// tests/unit/engine/registry/features-core-links-normative.test.ts and
// implement SCENARIO-FEATURES-LINKS-002 (audit-trail) for each affected
// requirement definition.
//
// Source (verified 2026-04-17):
//   https://docs.ogc.org/is/23-001/23-001.html
//   https://github.com/opengeospatial/ogcapi-connected-systems/tree/master/api/part1/standard/requirements

import { describe, it, expect, vi } from 'vitest';
import { proceduresTestModule } from '@/engine/registry/procedures';
import { propertiesTestModule } from '@/engine/registry/properties';
import { samplingTestModule } from '@/engine/registry/sampling';
import { deploymentsTestModule } from '@/engine/registry/deployments';
import { systemFeaturesTestModule } from '@/engine/registry/system-features';
import { subsystemsTestModule } from '@/engine/registry/subsystems';
import { subdeploymentsTestModule } from '@/engine/registry/subdeployments';
import type {
  TestContext,
  HttpResponse,
  HttpExchange,
  DiscoveryCache,
  RequirementDefinition,
  ConformanceClassTest,
} from '@/lib/types';

// --- Helpers ---

let exchangeCounter = 0;

function makeExchange(): HttpExchange {
  return {
    id: `ex-cite-${++exchangeCounter}`,
    request: { method: 'GET', url: 'http://example.com', headers: {} },
    response: { statusCode: 200, headers: {}, body: '', responseTimeMs: 10 },
    metadata: { truncated: false, binaryBody: false, bodySize: 0 },
  };
}

function makeHttpResponse(overrides: Partial<HttpResponse> = {}): HttpResponse {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: '{}',
    responseTimeMs: 10,
    exchange: makeExchange(),
    ...overrides,
  };
}

function makeContext(
  body: string,
  cacheOverrides: Partial<DiscoveryCache> = {},
): TestContext {
  return {
    httpClient: {
      request: vi.fn(),
      get: vi.fn().mockResolvedValue(makeHttpResponse({ body })),
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
    discoveryCache: {
      landingPage: {},
      conformsTo: [],
      collectionIds: [],
      links: [],
      ...cacheOverrides,
    },
    cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: vi.fn() },
  };
}

function findTest(
  module: ConformanceClassTest,
  requirementUri: string,
  ctx: TestContext,
) {
  return module.createTests(ctx).find(
    (t) => t.requirement.requirementUri === requirementUri,
  )!;
}

// --- Self-link non-normativity (5 single-resource modules) ---

interface SelfLinkCase {
  label: string;
  module: ConformanceClassTest;
  requirementUri: string;
  resourceIdField: keyof DiscoveryCache;
  resourceId: string;
  /** Excerpt from OGC 23-001 /req/<X>/canonical-url that must appear in the
   *  description and skip-reason to prove the citation is present. */
  citation: RegExp;
}

const selfLinkCases: SelfLinkCase[] = [
  {
    label: 'procedures.ts REQ_CANONICAL_ENDPOINT',
    module: proceduresTestModule,
    requirementUri: '/req/procedure/canonical-endpoint',
    resourceIdField: 'procedureId',
    resourceId: 'proc-1',
    citation: /23-001|canonical-url|non-canonical/i,
  },
  {
    label: 'properties.ts REQ_CANONICAL_ENDPOINT',
    module: propertiesTestModule,
    requirementUri: '/req/property/canonical-endpoint',
    resourceIdField: 'propertyId',
    resourceId: 'prop-1',
    citation: /23-001|canonical-url|non-canonical/i,
  },
  {
    label: 'sampling.ts REQ_CANONICAL_ENDPOINT',
    module: samplingTestModule,
    requirementUri: '/req/sf/canonical-endpoint',
    resourceIdField: 'samplingFeatureId',
    resourceId: 'sf-1',
    citation: /23-001|canonical-url|non-canonical/i,
  },
  {
    label: 'deployments.ts REQ_CANONICAL_ENDPOINT',
    module: deploymentsTestModule,
    requirementUri: '/req/deployment/canonical-endpoint',
    resourceIdField: 'deploymentId',
    resourceId: 'dep-1',
    citation: /23-001|canonical-url|non-canonical/i,
  },
  {
    label: 'system-features.ts REQ_CANONICAL_ENDPOINT',
    module: systemFeaturesTestModule,
    requirementUri: '/req/system/canonical-endpoint',
    resourceIdField: 'systemId',
    resourceId: 'sys-1',
    citation: /23-001|canonical-url|non-canonical/i,
  },
];

describe.each(selfLinkCases)(
  'REQ-TEST-CITE-002 rubric-6.1 self-link audit — $label',
  ({ module, requirementUri, resourceIdField, resourceId, citation }) => {
    const presentBody = JSON.stringify({
      id: resourceId,
      links: [{ rel: 'self', href: `http://example.com/${resourceId}` }],
    });
    const absentBody = JSON.stringify({
      id: resourceId,
      links: [{ rel: 'alternate', href: 'http://example.com/other' }],
    });
    const missingLinksBody = JSON.stringify({ id: resourceId });

    it('PASSES when rel="self" is present on the canonical-URL resource', async () => {
      const ctx = makeContext(presentBody, { [resourceIdField]: resourceId });
      const result = await findTest(module, requirementUri, ctx).execute(ctx);
      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe(requirementUri);
    });

    it('SKIPs (does NOT fail) when rel="self" is absent — OGC 23-001 only requires rel="canonical" on non-canonical URLs', async () => {
      const ctx = makeContext(absentBody, { [resourceIdField]: resourceId });
      const result = await findTest(module, requirementUri, ctx).execute(ctx);
      expect(result.status).toBe('skip');
      // SCENARIO-FEATURES-LINKS-002 audit trail: the skip reason must cite
      // the normative source so a future reviewer can follow the chain.
      expect(result.skipReason).toMatch(citation);
    });

    it('FAILs when the links array is missing entirely (structural violation, not rel-content)', async () => {
      const ctx = makeContext(missingLinksBody, { [resourceIdField]: resourceId });
      const result = await findTest(module, requirementUri, ctx).execute(ctx);
      expect(result.status).toBe('fail');
      expect(result.failureMessage).toMatch(/links/);
    });

    it('audit-trail: REQ description carries the OGC 23-001 canonical-url citation', () => {
      const ctx = makeContext(presentBody, { [resourceIdField]: resourceId });
      const req = findTest(module, requirementUri, ctx).requirement as RequirementDefinition;
      expect(req.description).toMatch(/23-001|canonical-url/i);
      expect(req.description).toMatch(/non-canonical|SKIP|not normative/i);
    });
  },
);

// --- Parent-link non-normativity (subsystems + subdeployments) ---

interface ParentLinkCase {
  label: string;
  module: ConformanceClassTest;
  requirementUri: string;
  parentIdField: keyof DiscoveryCache;
  parentId: string;
  childId: string;
  citation: RegExp;
}

const parentLinkCases: ParentLinkCase[] = [
  {
    label: 'subsystems.ts REQ_RECURSIVE_ASSOC',
    module: subsystemsTestModule,
    requirementUri: '/req/subsystem/recursive-assoc',
    parentIdField: 'systemId',
    parentId: 'sys-1',
    childId: 'sub-1',
    citation: /23-001|recursive-assoc|aggregation/i,
  },
  {
    label: 'subdeployments.ts REQ_RECURSIVE_ASSOC',
    module: subdeploymentsTestModule,
    requirementUri: '/req/subdeployment/recursive-assoc',
    parentIdField: 'deploymentId',
    parentId: 'dep-1',
    childId: 'subdep-1',
    citation: /23-001|recursive-assoc|aggregation/i,
  },
];

describe.each(parentLinkCases)(
  'REQ-TEST-CITE-002 rubric-6.1 parent-link audit — $label',
  ({ module, requirementUri, parentIdField, parentId, childId, citation }) => {
    // subsystems/subdeployments test shapes use `{ items: [...] }` containing
    // the child resource; the assertion iterates the first item's links.
    const pathSegment = requirementUri.includes('subsystem') ? 'systems' : 'deployments';
    const withParent = JSON.stringify({
      items: [
        {
          id: childId,
          links: [
            { rel: 'self', href: `http://example.com/${pathSegment}/${childId}` },
            { rel: 'parent', href: `http://example.com/${pathSegment}/${parentId}` },
          ],
        },
      ],
    });
    const withoutParent = JSON.stringify({
      items: [
        {
          id: childId,
          links: [
            { rel: 'self', href: `http://example.com/${pathSegment}/${childId}` },
          ],
        },
      ],
    });
    const missingLinks = JSON.stringify({
      items: [{ id: childId, name: 'Child' }],
    });

    it('PASSES when rel="parent" (or href matching parent) is present', async () => {
      const ctx = makeContext(withParent, { [parentIdField]: parentId });
      const result = await findTest(module, requirementUri, ctx).execute(ctx);
      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe(requirementUri);
    });

    it('SKIPs (does NOT fail) when parent-link relation is absent — OGC 23-001 recursive-assoc governs aggregation on the parent, not child-to-parent links', async () => {
      const ctx = makeContext(withoutParent, { [parentIdField]: parentId });
      const result = await findTest(module, requirementUri, ctx).execute(ctx);
      expect(result.status).toBe('skip');
      expect(result.skipReason).toMatch(citation);
    });

    it('FAILs when the child-item links array is missing (structural violation)', async () => {
      const ctx = makeContext(missingLinks, { [parentIdField]: parentId });
      const result = await findTest(module, requirementUri, ctx).execute(ctx);
      expect(result.status).toBe('fail');
      expect(result.failureMessage).toMatch(/links/);
    });

    it('audit-trail: REQ description carries the OGC 23-001 recursive-assoc citation', () => {
      const ctx = makeContext(withParent, { [parentIdField]: parentId });
      const req = findTest(module, requirementUri, ctx).requirement as RequirementDefinition;
      expect(req.description).toMatch(/23-001|recursive-assoc/i);
      expect(req.description).toMatch(/aggregation|SKIP|not normative|not a parent-link/i);
    });
  },
);
