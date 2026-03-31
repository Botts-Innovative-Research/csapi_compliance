// S09-03: OGC Connected Systems Part 2 — Datastreams & Observations conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream

import { CS_PART2_CONF, CS_PART1_CONF } from '@/lib/constants';
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
  requirementUri: '/req/datastream/resources-endpoint',
  conformanceUri: '/conf/datastream/resources-endpoint',
  name: 'Datastreams Resources Endpoint',
  priority: 'MUST',
  description: 'GET /datastreams returns HTTP 200 with a JSON response body.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/datastream/canonical-url',
  conformanceUri: '/conf/datastream/canonical-url',
  name: 'Datastream Canonical URL',
  priority: 'MUST',
  description: 'GET /datastreams/{id} returns HTTP 200 with the correct datastream.',
};

const REQ_REF_FROM_SYSTEM: RequirementDefinition = {
  requirementUri: '/req/datastream/ref-from-system',
  conformanceUri: '/conf/datastream/ref-from-system',
  name: 'Datastreams Referenced from System',
  priority: 'MUST',
  description: 'GET /systems/{id}/datastreams returns HTTP 200.',
};

const REQ_SCHEMA_OP: RequirementDefinition = {
  requirementUri: '/req/datastream/schema-op',
  conformanceUri: '/conf/datastream/schema-op',
  name: 'Datastream Schema Operation',
  priority: 'MUST',
  description: 'GET /datastreams/{id}/schema returns HTTP 200.',
};

const REQ_OBS_RESOURCES_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/datastream/obs-resources-endpoint',
  conformanceUri: '/conf/datastream/obs-resources-endpoint',
  name: 'Observations Resources Endpoint',
  priority: 'MUST',
  description: 'GET /observations or /datastreams/{id}/observations returns HTTP 200.',
};

const REQ_OBS_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/datastream/obs-canonical-url',
  conformanceUri: '/conf/datastream/obs-canonical-url',
  name: 'Observation Canonical URL',
  priority: 'MUST',
  description: 'GET /observations/{id} returns HTTP 200.',
};

// --- Conformance Class Definition ---

export const datastreamsClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.DATASTREAM,
  name: 'Connected Systems Part 2 - Datastreams & Observations',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.COMMON, CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_RESOURCES_ENDPOINT,
    REQ_CANONICAL_URL,
    REQ_REF_FROM_SYSTEM,
    REQ_SCHEMA_OP,
    REQ_OBS_RESOURCES_ENDPOINT,
    REQ_OBS_CANONICAL_URL,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('/datastreams', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /datastreams must return HTTP 200',
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
          'GET /datastreams must return valid JSON',
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
          'Datastreams response must contain an items array',
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
  const datastreamId = ctx.discoveryCache.datastreamId;
  if (!datastreamId) {
    return skipResult(
      REQ_CANONICAL_URL,
      'No datastream available in discovery cache; cannot test canonical URL.',
    );
  }

  try {
    const url = new URL(`/datastreams/${encodeURIComponent(datastreamId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /datastreams/{id} must return HTTP 200',
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
          'Datastream response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.id !== datastreamId) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'Datastream response id must match the requested datastreamId',
          datastreamId,
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

async function testRefFromSystem(ctx: TestContext) {
  const start = Date.now();
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_REF_FROM_SYSTEM,
      'No system available in discovery cache; cannot test datastreams from system.',
    );
  }

  try {
    const url = new URL(`/systems/${encodeURIComponent(systemId)}/datastreams`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'GET /systems/{id}/datastreams must return HTTP 200',
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
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.items)) {
      return failResult(
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'Response must contain an items array',
          'items array',
          typeof body.items === 'undefined'
            ? 'missing items property'
            : `items is ${typeof body.items}`,
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

async function testSchemaOp(ctx: TestContext) {
  const start = Date.now();
  const datastreamId = ctx.discoveryCache.datastreamId;
  if (!datastreamId) {
    return skipResult(
      REQ_SCHEMA_OP,
      'No datastream available in discovery cache; cannot test schema operation.',
    );
  }

  try {
    const url = new URL(`/datastreams/${encodeURIComponent(datastreamId)}/schema`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SCHEMA_OP,
        assertionFailure(
          'GET /datastreams/{id}/schema must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Verify non-empty body
    if (!response.body || response.body.trim().length === 0) {
      return failResult(
        REQ_SCHEMA_OP,
        assertionFailure(
          'Schema response must be non-empty',
          'non-empty response body',
          'empty response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SCHEMA_OP, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SCHEMA_OP,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testObsResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();
  const datastreamId = ctx.discoveryCache.datastreamId;

  try {
    // Try /observations first, fall back to /datastreams/{id}/observations
    const primaryUrl = new URL('/observations', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(primaryUrl);
    const exchangeIds = [response.exchange.id];

    if (response.statusCode === 200) {
      const durationMs = Date.now() - start;
      return passResult(REQ_OBS_RESOURCES_ENDPOINT, exchangeIds, durationMs);
    }

    // Fall back to datastream-scoped observations
    if (datastreamId) {
      const fallbackUrl = new URL(`/datastreams/${encodeURIComponent(datastreamId)}/observations`, ctx.baseUrl).toString();
      const fallbackResponse = await ctx.httpClient.get(fallbackUrl);
      exchangeIds.push(fallbackResponse.exchange.id);
      const durationMs = Date.now() - start;

      if (fallbackResponse.statusCode === 200) {
        return passResult(REQ_OBS_RESOURCES_ENDPOINT, exchangeIds, durationMs);
      }

      return failResult(
        REQ_OBS_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /observations or /datastreams/{id}/observations must return HTTP 200',
          '200',
          `GET /observations returned ${response.statusCode}, GET /datastreams/{id}/observations returned ${fallbackResponse.statusCode}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    const durationMs = Date.now() - start;
    return failResult(
      REQ_OBS_RESOURCES_ENDPOINT,
      assertionFailure(
        'GET /observations must return HTTP 200',
        '200',
        String(response.statusCode),
      ),
      exchangeIds,
      durationMs,
    );
  } catch (error) {
    return failResult(
      REQ_OBS_RESOURCES_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testObsCanonicalUrl(ctx: TestContext) {
  const start = Date.now();
  const observationId = ctx.discoveryCache.observationId;
  if (!observationId) {
    return skipResult(
      REQ_OBS_CANONICAL_URL,
      'No observation available in discovery cache; cannot test observation canonical URL.',
    );
  }

  try {
    const url = new URL(`/observations/${encodeURIComponent(observationId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_OBS_CANONICAL_URL,
        assertionFailure(
          'GET /observations/{id} must return HTTP 200',
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
        REQ_OBS_CANONICAL_URL,
        assertionFailure(
          'Observation response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.id !== observationId) {
      return failResult(
        REQ_OBS_CANONICAL_URL,
        assertionFailure(
          'Observation response id must match the requested observationId',
          observationId,
          String(body.id ?? '(missing id)'),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_OBS_CANONICAL_URL, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_OBS_CANONICAL_URL,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const datastreamsTestModule: ConformanceClassTest = {
  classDefinition: datastreamsClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES_ENDPOINT, execute: testResourcesEndpoint },
      { requirement: REQ_CANONICAL_URL, execute: testCanonicalUrl },
      { requirement: REQ_REF_FROM_SYSTEM, execute: testRefFromSystem },
      { requirement: REQ_SCHEMA_OP, execute: testSchemaOp },
      { requirement: REQ_OBS_RESOURCES_ENDPOINT, execute: testObsResourcesEndpoint },
      { requirement: REQ_OBS_CANONICAL_URL, execute: testObsCanonicalUrl },
    ];
  },
};
