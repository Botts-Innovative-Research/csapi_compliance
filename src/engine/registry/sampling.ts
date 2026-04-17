// S03-04: Sampling Features conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/sf

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
  requirementUri: '/req/sf/resources-endpoint',
  conformanceUri: '/conf/sf/resources-endpoint',
  name: 'Sampling Features Resources Endpoint',
  priority: 'MUST',
  description: 'GET /samplingFeatures returns HTTP 200 with a JSON response body.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/sf/canonical-url',
  conformanceUri: '/conf/sf/canonical-url',
  name: 'Sampling Feature Canonical URL',
  priority: 'MUST',
  description: 'GET /samplingFeatures/{id} returns HTTP 200 with the sampling feature resource.',
};

// REQ-TEST-CITE-002 rubric-6.1 audit (2026-04-17) against OGC 23-001 Part 1:
// - /req/sf/canonical-endpoint: exposes /samplingFeatures collection endpoint.
// - /req/sf/canonical-url: rel="canonical" required ONLY on non-canonical URLs.
//   No SHALL clause requires rel="self" on GET /samplingFeatures/{id}.
// - Parent OGC 17-069 /req/core/f-links applies to /collections/.../items/{id},
//   not the CS canonical URL.
// Per REQ-TEST-CITE-002 + GH #3 precedent, absence of rel="self" is downgraded
// from FAIL to SKIP-with-reason below.
// Source: https://docs.ogc.org/is/23-001/23-001.html (clause 13, /req/sf/canonical-url).
const REQ_CANONICAL_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/sf/canonical-endpoint',
  conformanceUri: '/conf/sf/canonical-endpoint',
  name: 'Sampling Feature Canonical Endpoint Self Link',
  priority: 'MUST',
  description:
    'Sampling feature resource has a links array; presence of rel="self" is ' +
    'checked but absence produces SKIP (not FAIL) because OGC 23-001 ' +
    '/req/sf/canonical-url only requires rel="canonical" on non-canonical ' +
    'URLs — rel="self" on /samplingFeatures/{id} is not normative.',
};

const REQ_REF_FROM_SYSTEM: RequirementDefinition = {
  requirementUri: '/req/sf/ref-from-system',
  conformanceUri: '/conf/sf/ref-from-system',
  name: 'Sampling Feature Reference from System',
  priority: 'MUST',
  description: 'GET /systems/{id}/samplingFeatures returns HTTP 200.',
};

const REQ_COLLECTIONS: RequirementDefinition = {
  requirementUri: '/req/sf/collections',
  conformanceUri: '/conf/sf/collections',
  name: 'Sampling Feature in Collections',
  priority: 'MUST',
  description: 'Sampling features appear in /collections.',
};

// --- Conformance Class Definition ---

export const samplingClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.SAMPLING_FEATURE,
  name: 'Sampling Features',
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

  if (!ctx.discoveryCache.samplingFeatureId) {
    return skipResult(REQ_RESOURCES_ENDPOINT, 'No sampling features available on the server');
  }

  try {
    const url = new URL('samplingFeatures', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /samplingFeatures must return HTTP 200',
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
          'GET /samplingFeatures must return valid JSON',
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

  if (!ctx.discoveryCache.samplingFeatureId) {
    return skipResult(REQ_CANONICAL_URL, 'No sampling features available on the server');
  }

  try {
    const sfId = ctx.discoveryCache.samplingFeatureId;
    const url = new URL(`samplingFeatures/${encodeURIComponent(sfId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /samplingFeatures/{id} must return HTTP 200',
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
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /samplingFeatures/{id} must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
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

  if (!ctx.discoveryCache.samplingFeatureId) {
    return skipResult(REQ_CANONICAL_ENDPOINT, 'No sampling features available on the server');
  }

  try {
    const sfId = ctx.discoveryCache.samplingFeatureId;
    const url = new URL(`samplingFeatures/${encodeURIComponent(sfId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'GET /samplingFeatures/{id} must return HTTP 200',
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
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'GET /samplingFeatures/{id} must return valid JSON',
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
          'Sampling feature resource must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // REQ-TEST-CITE-002: rel="self" at canonical URL /samplingFeatures/{id}
    // is NOT normatively required by OGC 23-001 /req/sf/canonical-url (which
    // only mandates rel="canonical" on non-canonical URLs). Downgrade missing
    // rel="self" from FAIL to SKIP-with-reason per GH #3 precedent.
    const foundRels = new Set(links.map((l: Record<string, unknown>) => l.rel));
    if (!foundRels.has('self')) {
      return skipResult(
        REQ_CANONICAL_ENDPOINT,
        'Sampling feature resource has no rel="self" link, but OGC 23-001 ' +
          '/req/sf/canonical-url only requires rel="canonical" on ' +
          'non-canonical URLs (not rel="self" on /samplingFeatures/{id}). ' +
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

  if (!ctx.discoveryCache.samplingFeatureId) {
    return skipResult(REQ_REF_FROM_SYSTEM, 'No sampling features available on the server');
  }

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_REF_FROM_SYSTEM, 'No systems available on the server');
  }

  try {
    const systemId = ctx.discoveryCache.systemId;
    const url = new URL(
      `systems/${encodeURIComponent(systemId)}/samplingFeatures`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'GET /systems/{id}/samplingFeatures must return HTTP 200',
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
          'GET /systems/{id}/samplingFeatures must return valid JSON',
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

  if (!ctx.discoveryCache.samplingFeatureId) {
    return skipResult(REQ_COLLECTIONS, 'No sampling features available on the server');
  }

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
          'GET /collections must return valid JSON',
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

export const samplingTestModule: ConformanceClassTest = {
  classDefinition: samplingClassDef,
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
