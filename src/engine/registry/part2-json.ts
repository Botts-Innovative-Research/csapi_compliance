// S09-02: OGC Connected Systems Part 2 — JSON Encoding conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/json

import { CS_PART2_CONF } from '@/lib/constants';
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

const REQ_DATASTREAM_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/json/datastream-schema',
  conformanceUri: '/conf/json/datastream-schema',
  name: 'Datastream JSON Schema',
  priority: 'MUST',
  description: 'Datastream JSON has required structure (id, name, type).',
};

const REQ_OBSERVATION_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/json/observation-schema',
  conformanceUri: '/conf/json/observation-schema',
  name: 'Observation JSON Schema',
  priority: 'MUST',
  description: 'Observation JSON has required structure (id, result, phenomenonTime).',
};

const REQ_CONTROLSTREAM_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/json/controlstream-schema',
  conformanceUri: '/conf/json/controlstream-schema',
  name: 'Control Stream JSON Schema',
  priority: 'MUST',
  description: 'Control stream JSON has required structure (id, name, type).',
};

// --- Conformance Class Definition ---

export const part2JsonClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.JSON,
  name: 'Connected Systems Part 2 - JSON Encoding',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.COMMON],
  requirements: [
    REQ_DATASTREAM_SCHEMA,
    REQ_OBSERVATION_SCHEMA,
    REQ_CONTROLSTREAM_SCHEMA,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testDatastreamSchema(ctx: TestContext) {
  const start = Date.now();
  const datastreamId = ctx.discoveryCache.datastreamId;
  if (!datastreamId) {
    return skipResult(
      REQ_DATASTREAM_SCHEMA,
      'No datastream available in discovery cache; cannot validate datastream JSON schema.',
    );
  }

  try {
    const url = new URL(`/datastreams/${encodeURIComponent(datastreamId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_DATASTREAM_SCHEMA,
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
        REQ_DATASTREAM_SCHEMA,
        assertionFailure(
          'Datastream response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Check required properties: id, name, type
    const missingFields: string[] = [];
    if (body.id === undefined) missingFields.push('id');
    if (body.name === undefined) missingFields.push('name');
    if (body.type === undefined) missingFields.push('type');

    if (missingFields.length > 0) {
      return failResult(
        REQ_DATASTREAM_SCHEMA,
        assertionFailure(
          'Datastream JSON must contain id, name, and type properties',
          'id, name, type',
          `missing: ${missingFields.join(', ')}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_DATASTREAM_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_DATASTREAM_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testObservationSchema(ctx: TestContext) {
  const start = Date.now();
  const observationId = ctx.discoveryCache.observationId;
  if (!observationId) {
    return skipResult(
      REQ_OBSERVATION_SCHEMA,
      'No observation available in discovery cache; cannot validate observation JSON schema.',
    );
  }

  try {
    const url = new URL(`/observations/${encodeURIComponent(observationId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_OBSERVATION_SCHEMA,
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
        REQ_OBSERVATION_SCHEMA,
        assertionFailure(
          'Observation response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Check required properties: id, result, phenomenonTime
    const missingFields: string[] = [];
    if (body.id === undefined) missingFields.push('id');
    if (body.result === undefined) missingFields.push('result');
    if (body.phenomenonTime === undefined) missingFields.push('phenomenonTime');

    if (missingFields.length > 0) {
      return failResult(
        REQ_OBSERVATION_SCHEMA,
        assertionFailure(
          'Observation JSON must contain id, result, and phenomenonTime properties',
          'id, result, phenomenonTime',
          `missing: ${missingFields.join(', ')}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_OBSERVATION_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_OBSERVATION_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testControlStreamSchema(ctx: TestContext) {
  const start = Date.now();
  const controlStreamId = ctx.discoveryCache.controlStreamId;
  if (!controlStreamId) {
    return skipResult(
      REQ_CONTROLSTREAM_SCHEMA,
      'No control stream available in discovery cache; cannot validate control stream JSON schema.',
    );
  }

  try {
    const url = new URL(`/controlstreams/${encodeURIComponent(controlStreamId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CONTROLSTREAM_SCHEMA,
        assertionFailure(
          'GET /controlstreams/{id} must return HTTP 200',
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
        REQ_CONTROLSTREAM_SCHEMA,
        assertionFailure(
          'Control stream response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Check required properties: id, name, type
    const missingFields: string[] = [];
    if (body.id === undefined) missingFields.push('id');
    if (body.name === undefined) missingFields.push('name');
    if (body.type === undefined) missingFields.push('type');

    if (missingFields.length > 0) {
      return failResult(
        REQ_CONTROLSTREAM_SCHEMA,
        assertionFailure(
          'Control stream JSON must contain id, name, and type properties',
          'id, name, type',
          `missing: ${missingFields.join(', ')}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_CONTROLSTREAM_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_CONTROLSTREAM_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const part2JsonTestModule: ConformanceClassTest = {
  classDefinition: part2JsonClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_DATASTREAM_SCHEMA, execute: testDatastreamSchema },
      { requirement: REQ_OBSERVATION_SCHEMA, execute: testObservationSchema },
      { requirement: REQ_CONTROLSTREAM_SCHEMA, execute: testControlStreamSchema },
    ];
  },
};
