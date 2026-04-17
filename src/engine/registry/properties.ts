// S03-05: Property Definitions conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/property

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
  requirementUri: '/req/property/resources-endpoint',
  conformanceUri: '/conf/property/resources-endpoint',
  name: 'Properties Resources Endpoint',
  priority: 'MUST',
  description: 'GET /properties returns HTTP 200 with a JSON response body.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/property/canonical-url',
  conformanceUri: '/conf/property/canonical-url',
  name: 'Property Canonical URL',
  priority: 'MUST',
  description: 'GET /properties/{id} returns HTTP 200 with the property definition resource.',
};

// REQ-TEST-CITE-002 rubric-6.1 audit (2026-04-17) against OGC 23-001 Part 1:
// - /req/property/canonical-endpoint: exposes /properties collection endpoint.
// - /req/property/canonical-url: rel="canonical" required ONLY on non-canonical
//   URLs. No SHALL clause requires rel="self" on GET /properties/{id}.
// - Parent OGC 17-069 /req/core/f-links applies to /collections/.../items/{id},
//   not the CS canonical URL.
// Per REQ-TEST-CITE-002 + GH #3 precedent, absence of rel="self" is downgraded
// from FAIL to SKIP-with-reason below.
// Source: https://docs.ogc.org/is/23-001/23-001.html (clause 14, /req/property/canonical-url).
const REQ_CANONICAL_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/property/canonical-endpoint',
  conformanceUri: '/conf/property/canonical-endpoint',
  name: 'Property Canonical Endpoint Self Link',
  priority: 'MUST',
  description:
    'Property resource has a links array; presence of rel="self" is ' +
    'checked but absence produces SKIP (not FAIL) because OGC 23-001 ' +
    '/req/property/canonical-url only requires rel="canonical" on ' +
    'non-canonical URLs — rel="self" on /properties/{id} is not normative.',
};

const REQ_COLLECTIONS: RequirementDefinition = {
  requirementUri: '/req/property/collections',
  conformanceUri: '/conf/property/collections',
  name: 'Property in Collections',
  priority: 'MUST',
  description: 'Properties appear in /collections.',
};

// --- Conformance Class Definition ---

export const propertiesClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.PROPERTY,
  name: 'Property Definitions',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.CORE],
  requirements: [
    REQ_RESOURCES_ENDPOINT,
    REQ_CANONICAL_URL,
    REQ_CANONICAL_ENDPOINT,
    REQ_COLLECTIONS,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.propertyId) {
    return skipResult(REQ_RESOURCES_ENDPOINT, 'No properties available on the server');
  }

  try {
    const url = new URL('properties', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /properties must return HTTP 200',
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
          'GET /properties must return valid JSON',
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

  if (!ctx.discoveryCache.propertyId) {
    return skipResult(REQ_CANONICAL_URL, 'No properties available on the server');
  }

  try {
    const propertyId = ctx.discoveryCache.propertyId;
    const url = new URL(`properties/${encodeURIComponent(propertyId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /properties/{id} must return HTTP 200',
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
          'GET /properties/{id} must return valid JSON',
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

  if (!ctx.discoveryCache.propertyId) {
    return skipResult(REQ_CANONICAL_ENDPOINT, 'No properties available on the server');
  }

  try {
    const propertyId = ctx.discoveryCache.propertyId;
    const url = new URL(`properties/${encodeURIComponent(propertyId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'GET /properties/{id} must return HTTP 200',
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
          'GET /properties/{id} must return valid JSON',
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
          'Property resource must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // REQ-TEST-CITE-002: rel="self" at canonical URL /properties/{id} is NOT
    // normatively required by OGC 23-001 /req/property/canonical-url
    // (which only mandates rel="canonical" on non-canonical URLs). Downgrade
    // missing rel="self" from FAIL to SKIP-with-reason per GH #3 precedent.
    const foundRels = new Set(links.map((l: Record<string, unknown>) => l.rel));
    if (!foundRels.has('self')) {
      return skipResult(
        REQ_CANONICAL_ENDPOINT,
        'Property resource has no rel="self" link, but OGC 23-001 ' +
          '/req/property/canonical-url only requires rel="canonical" on ' +
          'non-canonical URLs (not rel="self" on /properties/{id}). ' +
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

  if (!ctx.discoveryCache.propertyId) {
    return skipResult(REQ_COLLECTIONS, 'No properties available on the server');
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

export const propertiesTestModule: ConformanceClassTest = {
  classDefinition: propertiesClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES_ENDPOINT, execute: testResourcesEndpoint },
      { requirement: REQ_CANONICAL_URL, execute: testCanonicalUrl },
      { requirement: REQ_CANONICAL_ENDPOINT, execute: testCanonicalEndpoint },
      { requirement: REQ_COLLECTIONS, execute: testCollections },
    ];
  },
};
