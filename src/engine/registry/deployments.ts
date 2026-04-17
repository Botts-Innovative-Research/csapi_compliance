// S03-03: Connected Systems Part 1 — Deployment Features conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment

import { CS_PART1_CONF } from '@/lib/constants';
import type {
  ConformanceClassDefinition,
  ConformanceClassTest,
  ExecutableTest,
  RequirementDefinition,
  TestContext,
} from '@/lib/types';
import {
  passResult,
  failResult,
  skipResult,
  assertionFailure,
} from '@/engine/result-aggregator';

// --- Requirement Definitions ---

const REQ_RESOURCES_ENDPOINT: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/deployment/resources-endpoint',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment/resources-endpoint',
  name: 'Deployments Resources Endpoint',
  priority: 'MUST',
  description: 'GET /deployments returns HTTP 200 with a JSON response body.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/deployment/canonical-url',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment/canonical-url',
  name: 'Deployment Canonical URL',
  priority: 'MUST',
  description: 'GET /deployments/{id} returns HTTP 200 with the correct deployment id.',
};

// REQ-TEST-CITE-002 rubric-6.1 audit (2026-04-17) against OGC 23-001 Part 1:
// - /req/deployment/canonical-endpoint: exposes /deployments collection endpoint.
// - /req/deployment/canonical-url: rel="canonical" required ONLY on
//   non-canonical URLs. No SHALL clause requires rel="self" on
//   GET /deployments/{id}.
// - Parent OGC 17-069 /req/core/f-links applies to /collections/.../items/{id},
//   not the CS canonical URL.
// Per REQ-TEST-CITE-002 + GH #3 precedent, absence of rel="self" is downgraded
// from FAIL to SKIP-with-reason below.
// Source: https://docs.ogc.org/is/23-001/23-001.html (clause 10, /req/deployment/canonical-url).
const REQ_CANONICAL_ENDPOINT: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/deployment/canonical-endpoint',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment/canonical-endpoint',
  name: 'Deployment Canonical Endpoint',
  priority: 'MUST',
  description:
    'Deployment resource has a links array; presence of rel="self" is ' +
    'checked but absence produces SKIP (not FAIL) because OGC 23-001 ' +
    '/req/deployment/canonical-url only requires rel="canonical" on ' +
    'non-canonical URLs — rel="self" on /deployments/{id} is not normative.',
};

const REQ_REF_FROM_SYSTEM: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/deployment/ref-from-system',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment/ref-from-system',
  name: 'Deployments Referenced from System',
  priority: 'MUST',
  description: 'GET /systems/{id}/deployments returns HTTP 200.',
};

const REQ_COLLECTIONS: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/deployment/collections',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment/collections',
  name: 'Deployments in Collections',
  priority: 'MUST',
  description: 'Deployments appear in /collections.',
};

// --- Conformance Class Definition ---

export const deploymentsClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.DEPLOYMENT,
  name: 'Connected Systems - Deployment Features',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.CORE],
  requirements: [
    REQ_RESOURCES_ENDPOINT,
    REQ_CANONICAL_URL,
    REQ_CANONICAL_ENDPOINT,
    REQ_REF_FROM_SYSTEM,
    REQ_COLLECTIONS,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('deployments', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /deployments must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    try {
      JSON.parse(response.body);
    } catch {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /deployments must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RESOURCES_ENDPOINT, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RESOURCES_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testCanonicalUrl(ctx: TestContext) {
  const start = Date.now();
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_CANONICAL_URL,
      'No deployments available in discovery cache; cannot test canonical URL.',
    );
  }

  try {
    const url = new URL(
      `deployments/${encodeURIComponent(deploymentId)}`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /deployments/{id} must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'Deployment response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.id !== deploymentId) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'Deployment response id must match the requested deploymentId',
          deploymentId,
          String(body.id ?? '(missing id)'),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_CANONICAL_URL, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_CANONICAL_URL,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testCanonicalEndpoint(ctx: TestContext) {
  const start = Date.now();
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_CANONICAL_ENDPOINT,
      'No deployments available in discovery cache; cannot test canonical endpoint.',
    );
  }

  try {
    const url = new URL(
      `deployments/${encodeURIComponent(deploymentId)}`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'Deployment response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    const links = body.links;
    if (!Array.isArray(links)) {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'Deployment resource must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // REQ-TEST-CITE-002: rel="self" at canonical URL /deployments/{id} is NOT
    // normatively required by OGC 23-001 /req/deployment/canonical-url (which
    // only mandates rel="canonical" on non-canonical URLs). Downgrade missing
    // rel="self" from FAIL to SKIP-with-reason per GH #3 precedent.
    const hasSelf = links.some((l: Record<string, unknown>) => l.rel === 'self');
    if (!hasSelf) {
      return skipResult(
        REQ_CANONICAL_ENDPOINT,
        'Deployment resource has no rel="self" link, but OGC 23-001 ' +
          '/req/deployment/canonical-url only requires rel="canonical" on ' +
          'non-canonical URLs (not rel="self" on /deployments/{id}). ' +
          'Per REQ-TEST-CITE-002 and GH #3 precedent, absence is not FAIL.',
      );
    }

    return passResult(REQ_CANONICAL_ENDPOINT, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_CANONICAL_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testRefFromSystem(ctx: TestContext) {
  const start = Date.now();
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_REF_FROM_SYSTEM,
      'No systems available in discovery cache; cannot test deployments referenced from system.',
    );
  }

  try {
    const url = new URL(
      `systems/${encodeURIComponent(systemId)}/deployments`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'GET /systems/{id}/deployments must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    try {
      JSON.parse(response.body);
    } catch {
      return failResult(
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'System deployments response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_REF_FROM_SYSTEM, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_REF_FROM_SYSTEM,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testCollections(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('collections', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_COLLECTIONS,
        assertionFailure(
          'GET /collections must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_COLLECTIONS,
        assertionFailure(
          'Collections response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.collections)) {
      return failResult(
        REQ_COLLECTIONS,
        assertionFailure(
          'Collections response must contain a collections array',
          'collections array',
          typeof body.collections === 'undefined'
            ? 'missing collections property'
            : `collections is ${typeof body.collections}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // OGC 23-001 /req/deployment/collections (clause 10):
    //   "The server SHALL identify all Feature collections containing
    //   Deployment resources by setting the `itemType` attribute to `feature`
    //   and the `featureType` attribute to `sosa:Deployment` in the Collection
    //   metadata."
    // The collection `id` is NOT normatively constrained (spec examples:
    // `saildrone_missions`, `sof_missions`). The spec-correct test looks for
    // the normative `featureType="sosa:Deployment"` marker, not for an id
    // convention. Prior heuristic (id==='deployments' || id==='deployment' ||
    // itemType.includes('deployment')) was both over-broad (admitted non-
    // conformant servers via id convention) and WRONG (spec says
    // itemType="feature", not a string containing "deployment"). Quinn flagged
    // 2026-04-02; closed 2026-04-17 by sprint deployments-collections-heuristic.
    // Source: https://docs.ogc.org/is/23-001/23-001.html (clause 10).
    const collections = body.collections as Record<string, unknown>[];
    const hasDeploymentCollection = collections.some(
      (c) => c.featureType === 'sosa:Deployment',
    );

    if (!hasDeploymentCollection) {
      return failResult(
        REQ_COLLECTIONS,
        assertionFailure(
          'At least one collection must declare featureType="sosa:Deployment" (OGC 23-001 /req/deployment/collections)',
          'collection with featureType="sosa:Deployment"',
          'no collection with featureType="sosa:Deployment" found',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_COLLECTIONS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_COLLECTIONS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const deploymentsTestModule: ConformanceClassTest = {
  classDefinition: deploymentsClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES_ENDPOINT, execute: testResourcesEndpoint },
      { requirement: REQ_CANONICAL_URL, execute: testCanonicalUrl },
      { requirement: REQ_CANONICAL_ENDPOINT, execute: testCanonicalEndpoint },
      { requirement: REQ_REF_FROM_SYSTEM, execute: testRefFromSystem },
      { requirement: REQ_COLLECTIONS, execute: testCollections },
    ];
  },
};
