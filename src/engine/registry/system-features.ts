// S03-02: Connected Systems Part 1 — System Features conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system

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
  requirementUri: '/req/system/resources-endpoint',
  conformanceUri: '/conf/system/resources-endpoint',
  name: 'Systems Resources Endpoint',
  priority: 'MUST',
  description: 'GET /systems returns HTTP 200 with a JSON response body containing an items array.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/system/canonical-url',
  conformanceUri: '/conf/system/canonical-url',
  name: 'System Canonical URL',
  priority: 'MUST',
  description: 'GET /systems/{systemId} returns HTTP 200 with the correct system id.',
};

// REQ-TEST-CITE-002 rubric-6.1 audit (2026-04-17) against OGC 23-001 Part 1:
// - /req/system/canonical-endpoint: exposes /systems collection endpoint.
// - /req/system/canonical-url: rel="canonical" required ONLY on non-canonical
//   URLs. No SHALL clause requires rel="self" on GET /systems/{id}.
// - Parent OGC 17-069 /req/core/f-links applies to /collections/.../items/{id},
//   not the CS canonical URL.
// Per REQ-TEST-CITE-002 + GH #3 precedent, absence of rel="self" is downgraded
// from FAIL to SKIP-with-reason below.
// Source: https://docs.ogc.org/is/23-001/23-001.html (clause 8, /req/system/canonical-url).
const REQ_CANONICAL_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/system/canonical-endpoint',
  conformanceUri: '/conf/system/canonical-endpoint',
  name: 'System Canonical Endpoint',
  priority: 'MUST',
  description:
    'System resource has a links array; presence of rel="self" is checked ' +
    'but absence produces SKIP (not FAIL) because OGC 23-001 ' +
    '/req/system/canonical-url only requires rel="canonical" on non-canonical ' +
    'URLs — rel="self" on /systems/{id} is not normative.',
};

const REQ_COLLECTIONS: RequirementDefinition = {
  requirementUri: '/req/system/collections',
  conformanceUri: '/conf/system/collections',
  name: 'Systems in Collections',
  priority: 'MUST',
  description: 'Systems appear in /collections.',
};

const REQ_LOCATION_TIME: RequirementDefinition = {
  requirementUri: '/req/system/location-time',
  conformanceUri: '/conf/system/location-time',
  name: 'System Location and Time',
  priority: 'MAY',
  description: 'System features may have geometry and validTime properties.',
};

// --- Conformance Class Definition ---

export const systemFeaturesClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.SYSTEM,
  name: 'Connected Systems - System Features',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.CORE],
  requirements: [
    REQ_RESOURCES_ENDPOINT,
    REQ_CANONICAL_URL,
    REQ_CANONICAL_ENDPOINT,
    REQ_COLLECTIONS,
    REQ_LOCATION_TIME,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('systems', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /systems must return HTTP 200',
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
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /systems must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.items)) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'Systems response must contain an items array',
          'items array',
          typeof body.items === 'undefined'
            ? 'missing items property'
            : `items is ${typeof body.items}`,
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
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_CANONICAL_URL,
      'No systems available in discovery cache; cannot test canonical URL.',
    );
  }

  try {
    const url = new URL(`systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /systems/{systemId} must return HTTP 200',
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
          'System response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.id !== systemId) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'System response id must match the requested systemId',
          systemId,
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
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_CANONICAL_ENDPOINT,
      'No systems available in discovery cache; cannot test canonical endpoint.',
    );
  }

  try {
    const url = new URL(`systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
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
          'System response must be valid JSON',
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
          'System resource must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // REQ-TEST-CITE-002: rel="self" at canonical URL /systems/{id} is NOT
    // normatively required by OGC 23-001 /req/system/canonical-url (which only
    // mandates rel="canonical" on non-canonical URLs). Downgrade missing
    // rel="self" from FAIL to SKIP-with-reason per GH #3 precedent.
    const hasSelf = links.some((l: Record<string, unknown>) => l.rel === 'self');
    if (!hasSelf) {
      return skipResult(
        REQ_CANONICAL_ENDPOINT,
        'System resource has no rel="self" link, but OGC 23-001 ' +
          '/req/system/canonical-url only requires rel="canonical" on ' +
          'non-canonical URLs (not rel="self" on /systems/{id}). ' +
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

    // OGC 23-001 /req/system/collections (clause 8):
    //   "The server SHALL identify all Feature collections containing
    //   System resources by setting the `itemType` attribute to `feature`
    //   and the `featureType` attribute to `sosa:System` in the Collection
    //   metadata."
    // Collection `id` is NOT normatively constrained. The spec-correct check
    // looks for `featureType="sosa:System"`. Prior heuristic (id==='systems'
    // || id==='system' || itemType.includes('system')) was both over-broad
    // and WRONG (spec says itemType="feature", not a string containing
    // "system"). Same class of bug as the deployments.ts heuristic; fixed in
    // the same sprint (deployments-collections-heuristic, 2026-04-17).
    // Source: https://docs.ogc.org/is/23-001/23-001.html (clause 8).
    const collections = body.collections as Record<string, unknown>[];
    const hasSystemCollection = collections.some(
      (c) => c.featureType === 'sosa:System',
    );

    if (!hasSystemCollection) {
      return failResult(
        REQ_COLLECTIONS,
        assertionFailure(
          'At least one collection must declare featureType="sosa:System" (OGC 23-001 /req/system/collections)',
          'collection with featureType="sosa:System"',
          'no collection with featureType="sosa:System" found',
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

async function testLocationTime(ctx: TestContext) {
  const start = Date.now();
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_LOCATION_TIME,
      'No systems available in discovery cache; cannot test location/time properties.',
    );
  }

  try {
    const url = new URL(`systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_LOCATION_TIME,
        assertionFailure(
          'GET /systems/{systemId} must return HTTP 200',
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
        REQ_LOCATION_TIME,
        assertionFailure(
          'System response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // geometry and validTime are MAY properties — if present they must be valid objects
    if (body.geometry !== undefined && body.geometry !== null) {
      if (typeof body.geometry !== 'object') {
        return failResult(
          REQ_LOCATION_TIME,
          assertionFailure(
            'System geometry, if present, must be an object or null',
            'object or null',
            typeof body.geometry,
          ),
          exchangeIds,
          durationMs,
        );
      }
    }

    if (body.validTime !== undefined && body.validTime !== null) {
      if (typeof body.validTime !== 'object' && typeof body.validTime !== 'string') {
        return failResult(
          REQ_LOCATION_TIME,
          assertionFailure(
            'System validTime, if present, must be an object or string',
            'object or string',
            typeof body.validTime,
          ),
          exchangeIds,
          durationMs,
        );
      }
    }

    return passResult(REQ_LOCATION_TIME, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_LOCATION_TIME,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const systemFeaturesTestModule: ConformanceClassTest = {
  classDefinition: systemFeaturesClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES_ENDPOINT, execute: testResourcesEndpoint },
      { requirement: REQ_CANONICAL_URL, execute: testCanonicalUrl },
      { requirement: REQ_CANONICAL_ENDPOINT, execute: testCanonicalEndpoint },
      { requirement: REQ_COLLECTIONS, execute: testCollections },
      { requirement: REQ_LOCATION_TIME, execute: testLocationTime },
    ];
  },
};
