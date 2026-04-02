// S03-07: SensorML Format conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/sensorml

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

const REQ_SENSORML_MEDIATYPE_READ: RequirementDefinition = {
  requirementUri: '/req/sensorml/mediatype-read',
  conformanceUri: '/conf/sensorml/mediatype-read',
  name: 'SensorML Media Type Read',
  priority: 'MUST',
  description: 'Accept: application/sml+json returns Content-Type application/sml+json.',
};

const REQ_SENSORML_RESOURCE_ID: RequirementDefinition = {
  requirementUri: '/req/sensorml/resource-id',
  conformanceUri: '/conf/sensorml/resource-id',
  name: 'SensorML Resource ID',
  priority: 'MUST',
  description: 'SensorML response includes the resource id.',
};

const REQ_SENSORML_SYSTEM_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/sensorml/system-schema',
  conformanceUri: '/conf/sensorml/system-schema',
  name: 'SensorML System Schema',
  priority: 'MUST',
  description: 'SensorML JSON response has a valid structure.',
};

// --- Conformance Class Definition ---

export const sensormlClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.SENSORML,
  name: 'SensorML Format',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_SENSORML_MEDIATYPE_READ,
    REQ_SENSORML_RESOURCE_ID,
    REQ_SENSORML_SYSTEM_SCHEMA,
  ],
  isWriteOperation: false,
};

// --- Helper ---

function getSystemId(ctx: TestContext): string | null {
  return ctx.discoveryCache.systemId ?? null;
}

// --- Test Functions ---

async function testSensormlMediaTypeRead(ctx: TestContext) {
  const start = Date.now();
  const systemId = getSystemId(ctx);
  if (!systemId) {
    return skipResult(
      REQ_SENSORML_MEDIATYPE_READ,
      'No system ID available in discovery cache; cannot test SensorML media type.',
    );
  }

  try {
    const url = new URL(`systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url, {
      'Accept': 'application/sml+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    // If server returns 406 Not Acceptable, SensorML is not supported — skip
    if (response.statusCode === 406) {
      return skipResult(
        REQ_SENSORML_MEDIATYPE_READ,
        'Server returned 406 Not Acceptable; SensorML format is not supported by this server.',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SENSORML_MEDIATYPE_READ,
        assertionFailure(
          'GET system with Accept: application/sml+json must return HTTP 200 or 406',
          '200 or 406',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/sml+json')) {
      return failResult(
        REQ_SENSORML_MEDIATYPE_READ,
        assertionFailure(
          'Response Content-Type must include application/sml+json',
          'application/sml+json',
          contentType || '(no Content-Type header)',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SENSORML_MEDIATYPE_READ, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SENSORML_MEDIATYPE_READ,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSensormlResourceId(ctx: TestContext) {
  const start = Date.now();
  const systemId = getSystemId(ctx);
  if (!systemId) {
    return skipResult(
      REQ_SENSORML_RESOURCE_ID,
      'No system ID available in discovery cache; cannot test SensorML resource id.',
    );
  }

  try {
    const url = new URL(`systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url, {
      'Accept': 'application/sml+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    // If server returns 406, skip
    if (response.statusCode === 406) {
      return skipResult(
        REQ_SENSORML_RESOURCE_ID,
        'Server returned 406 Not Acceptable; SensorML format is not supported by this server.',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SENSORML_RESOURCE_ID,
        assertionFailure(
          'GET system must return HTTP 200',
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
        REQ_SENSORML_RESOURCE_ID,
        assertionFailure(
          'SensorML response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Check for resource id (could be 'id', 'identifier', or 'uniqueId')
    const hasId = 'id' in body || 'identifier' in body || 'uniqueId' in body;
    if (!hasId) {
      return failResult(
        REQ_SENSORML_RESOURCE_ID,
        assertionFailure(
          'SensorML response must include a resource identifier',
          'id, identifier, or uniqueId field',
          `found keys: ${Object.keys(body).join(', ') || '(empty)'}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SENSORML_RESOURCE_ID, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SENSORML_RESOURCE_ID,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSensormlSystemSchema(ctx: TestContext) {
  const start = Date.now();
  const systemId = getSystemId(ctx);
  if (!systemId) {
    return skipResult(
      REQ_SENSORML_SYSTEM_SCHEMA,
      'No system ID available in discovery cache; cannot test SensorML system schema.',
    );
  }

  try {
    const url = new URL(`systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url, {
      'Accept': 'application/sml+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    // If server returns 406, skip
    if (response.statusCode === 406) {
      return skipResult(
        REQ_SENSORML_SYSTEM_SCHEMA,
        'Server returned 406 Not Acceptable; SensorML format is not supported by this server.',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SENSORML_SYSTEM_SCHEMA,
        assertionFailure(
          'GET system must return HTTP 200',
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
        REQ_SENSORML_SYSTEM_SCHEMA,
        assertionFailure(
          'SensorML response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Validate SensorML JSON structure: should have type field (e.g., 'PhysicalSystem', 'SimpleProcess')
    // and a valid object structure
    if (typeof body !== 'object' || body === null) {
      return failResult(
        REQ_SENSORML_SYSTEM_SCHEMA,
        assertionFailure(
          'SensorML response must be a JSON object',
          'JSON object',
          typeof body,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // SensorML JSON should have a type indicator (type, definition, or process type)
    const hasTypeInfo = 'type' in body ||
      'definition' in body ||
      'PhysicalSystem' in body ||
      'SimpleProcess' in body ||
      'AggregateProcess' in body;

    if (!hasTypeInfo) {
      return failResult(
        REQ_SENSORML_SYSTEM_SCHEMA,
        assertionFailure(
          'SensorML JSON must have a type or definition field',
          'type, definition, or SensorML process type',
          `found keys: ${Object.keys(body).join(', ') || '(empty)'}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SENSORML_SYSTEM_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SENSORML_SYSTEM_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const sensormlTestModule: ConformanceClassTest = {
  classDefinition: sensormlClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_SENSORML_MEDIATYPE_READ, execute: testSensormlMediaTypeRead },
      { requirement: REQ_SENSORML_RESOURCE_ID, execute: testSensormlResourceId },
      { requirement: REQ_SENSORML_SYSTEM_SCHEMA, execute: testSensormlSystemSchema },
    ];
  },
};
