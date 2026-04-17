// S03-04: Procedure Features conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/procedure

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
  requirementUri: '/req/procedure/resources-endpoint',
  conformanceUri: '/conf/procedure/resources-endpoint',
  name: 'Procedures Resources Endpoint',
  priority: 'MUST',
  description: 'GET /procedures returns HTTP 200 with a JSON response body.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/procedure/canonical-url',
  conformanceUri: '/conf/procedure/canonical-url',
  name: 'Procedure Canonical URL',
  priority: 'MUST',
  description: 'GET /procedures/{id} returns HTTP 200 with the procedure resource.',
};

// REQ-TEST-CITE-002 rubric-6.1 audit (2026-04-17) against OGC 23-001 Part 1:
// - /req/procedure/canonical-endpoint (§12 / req_canonical_endpoint.adoc):
//   "The server SHALL expose a procedure-resources-endpoint at {api_root}/procedures"
//   — this is about the COLLECTION endpoint existence, NOT about a self-link
//   on individual procedure resources.
// - /req/procedure/canonical-url (req_canonical_url.adoc): "Every Procedure
//   resource SHALL be accessible through its canonical URL ... If a Procedure
//   resource is retrieved through any other URL than its canonical URL, the
//   server response SHALL include a link ... with relation type `canonical`."
//   — rel="canonical" is required ONLY on NON-canonical URLs.
// - No SHALL clause in OGC 23-001 requires rel="self" on the response of
//   GET /procedures/{id}. rel="self" at the canonical URL is a widely-used
//   convention but not normative in CS Part 1.
// - Parent OGC 17-069 /req/core/f-links (self on features) applies only to
//   /collections/{id}/items/{id}, not the CS canonical URL /procedures/{id}.
// Therefore, per REQ-TEST-CITE-002 + GH #3 precedent (no FAIL when the cited
// source is an illustrative example rather than a SHALL clause), this test
// SKIPs-with-reason when the self link is absent instead of flagging FAIL.
// Source: https://docs.ogc.org/is/23-001/23-001.html (clause 12, /req/procedure/canonical-url).
const REQ_CANONICAL_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/procedure/canonical-endpoint',
  conformanceUri: '/conf/procedure/canonical-endpoint',
  name: 'Procedure Canonical Endpoint Self Link',
  priority: 'MUST',
  description:
    'Procedure resource has a links array; presence of rel="self" is ' +
    'checked but absence produces SKIP (not FAIL) because OGC 23-001 ' +
    '/req/procedure/canonical-url only requires rel="canonical" on ' +
    'non-canonical URLs — rel="self" on /procedures/{id} is not normative.',
};

const REQ_COLLECTIONS: RequirementDefinition = {
  requirementUri: '/req/procedure/collections',
  conformanceUri: '/conf/procedure/collections',
  name: 'Procedure in Collections',
  priority: 'MUST',
  description: 'Procedures appear in /collections.',
};

const REQ_LOCATION: RequirementDefinition = {
  requirementUri: '/req/procedure/location',
  conformanceUri: '/conf/procedure/location',
  name: 'Procedure Location',
  priority: 'MAY',
  description: 'Procedure may have a geometry (location).',
};

// --- Conformance Class Definition ---

export const proceduresClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.PROCEDURE,
  name: 'Procedure Features',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.CORE],
  requirements: [
    REQ_RESOURCES_ENDPOINT,
    REQ_CANONICAL_URL,
    REQ_CANONICAL_ENDPOINT,
    REQ_COLLECTIONS,
    REQ_LOCATION,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.procedureId) {
    return skipResult(REQ_RESOURCES_ENDPOINT, 'No procedures available on the server');
  }

  try {
    const url = new URL('procedures', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /procedures must return HTTP 200',
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
          'GET /procedures must return valid JSON',
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

  if (!ctx.discoveryCache.procedureId) {
    return skipResult(REQ_CANONICAL_URL, 'No procedures available on the server');
  }

  try {
    const procedureId = ctx.discoveryCache.procedureId;
    const url = new URL(`procedures/${encodeURIComponent(procedureId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /procedures/{id} must return HTTP 200',
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
          'GET /procedures/{id} must return valid JSON',
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

  if (!ctx.discoveryCache.procedureId) {
    return skipResult(REQ_CANONICAL_ENDPOINT, 'No procedures available on the server');
  }

  try {
    const procedureId = ctx.discoveryCache.procedureId;
    const url = new URL(`procedures/${encodeURIComponent(procedureId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'GET /procedures/{id} must return HTTP 200',
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
          'GET /procedures/{id} must return valid JSON',
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
          'Procedure resource must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // REQ-TEST-CITE-002: rel="self" at canonical URL /procedures/{id} is NOT
    // normatively required by OGC 23-001 /req/procedure/canonical-url
    // (which only mandates rel="canonical" on non-canonical URLs). Downgrade
    // missing rel="self" from FAIL to SKIP-with-reason per GH #3 precedent.
    const foundRels = new Set(links.map((l: Record<string, unknown>) => l.rel));
    if (!foundRels.has('self')) {
      return skipResult(
        REQ_CANONICAL_ENDPOINT,
        'Procedure resource has no rel="self" link, but OGC 23-001 ' +
          '/req/procedure/canonical-url only requires rel="canonical" on ' +
          'non-canonical URLs (not rel="self" on /procedures/{id}). ' +
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

  if (!ctx.discoveryCache.procedureId) {
    return skipResult(REQ_COLLECTIONS, 'No procedures available on the server');
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

async function testLocation(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.procedureId) {
    return skipResult(REQ_LOCATION, 'No procedures available on the server');
  }

  try {
    const procedureId = ctx.discoveryCache.procedureId;
    const url = new URL(`procedures/${encodeURIComponent(procedureId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_LOCATION,
        assertionFailure(
          'GET /procedures/{id} must return HTTP 200',
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
        REQ_LOCATION,
        assertionFailure(
          'GET /procedures/{id} must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // MAY requirement: geometry is optional, just verify the response is valid
    // If geometry exists, it should be a valid GeoJSON geometry object
    if (body.geometry !== undefined && body.geometry !== null) {
      const geom = body.geometry as Record<string, unknown>;
      if (!geom.type) {
        return failResult(
          REQ_LOCATION,
          assertionFailure(
            'If geometry is present, it must have a type field',
            'geometry with type',
            'geometry missing type field',
          ),
          exchangeIds,
          durationMs,
        );
      }
    }

    return passResult(REQ_LOCATION, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_LOCATION,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const proceduresTestModule: ConformanceClassTest = {
  classDefinition: proceduresClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES_ENDPOINT, execute: testResourcesEndpoint },
      { requirement: REQ_CANONICAL_URL, execute: testCanonicalUrl },
      { requirement: REQ_CANONICAL_ENDPOINT, execute: testCanonicalEndpoint },
      { requirement: REQ_COLLECTIONS, execute: testCollections },
      { requirement: REQ_LOCATION, execute: testLocation },
    ];
  },
};
