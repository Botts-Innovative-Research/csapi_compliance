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

const REQ_CANONICAL_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/procedure/canonical-endpoint',
  conformanceUri: '/conf/procedure/canonical-endpoint',
  name: 'Procedure Canonical Endpoint Self Link',
  priority: 'MUST',
  description: 'Procedure resource has a self link.',
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

    const foundRels = new Set(links.map((l: Record<string, unknown>) => l.rel));
    if (!foundRels.has('self')) {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'Procedure resource must have a self link',
          'link with rel="self"',
          'no self link found',
        ),
        exchangeIds,
        durationMs,
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
