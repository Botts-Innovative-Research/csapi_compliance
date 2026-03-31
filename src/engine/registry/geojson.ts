// S03-07: GeoJSON Format conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/geojson

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

const REQ_GEOJSON_MEDIATYPE_READ: RequirementDefinition = {
  requirementUri: '/req/geojson/mediatype-read',
  conformanceUri: '/conf/geojson/mediatype-read',
  name: 'GeoJSON Media Type Read',
  priority: 'MUST',
  description: 'Accept: application/geo+json returns Content-Type application/geo+json.',
};

const REQ_GEOJSON_FEATURE_MAPPING: RequirementDefinition = {
  requirementUri: '/req/geojson/feature-attribute-mapping',
  conformanceUri: '/conf/geojson/feature-attribute-mapping',
  name: 'GeoJSON Feature Attribute Mapping',
  priority: 'MUST',
  description: 'Response body has standard GeoJSON members: type, id, geometry, properties.',
};

const REQ_GEOJSON_SYSTEM_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/geojson/system-schema',
  conformanceUri: '/conf/geojson/system-schema',
  name: 'GeoJSON System Schema',
  priority: 'MUST',
  description: 'System GeoJSON has required system-specific properties.',
};

const REQ_GEOJSON_SYSTEM_MAPPINGS: RequirementDefinition = {
  requirementUri: '/req/geojson/system-mappings',
  conformanceUri: '/conf/geojson/system-mappings',
  name: 'GeoJSON System Mappings',
  priority: 'MUST',
  description: 'System properties map to OGC concepts.',
};

// --- Conformance Class Definition ---

export const geojsonClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.GEOJSON,
  name: 'GeoJSON Format',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_GEOJSON_MEDIATYPE_READ,
    REQ_GEOJSON_FEATURE_MAPPING,
    REQ_GEOJSON_SYSTEM_SCHEMA,
    REQ_GEOJSON_SYSTEM_MAPPINGS,
  ],
  isWriteOperation: false,
};

// --- Helper ---

function getSystemId(ctx: TestContext): string | null {
  return ctx.discoveryCache.systemId ?? null;
}

// --- Test Functions ---

async function testMediaTypeRead(ctx: TestContext) {
  const start = Date.now();
  const systemId = getSystemId(ctx);
  if (!systemId) {
    return skipResult(
      REQ_GEOJSON_MEDIATYPE_READ,
      'No system ID available in discovery cache; cannot test GeoJSON media type.',
    );
  }

  try {
    const url = new URL(`/systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url, {
      'Accept': 'application/geo+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_GEOJSON_MEDIATYPE_READ,
        assertionFailure(
          'GET system with Accept: application/geo+json must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/geo+json')) {
      return failResult(
        REQ_GEOJSON_MEDIATYPE_READ,
        assertionFailure(
          'Response Content-Type must include application/geo+json',
          'application/geo+json',
          contentType || '(no Content-Type header)',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_GEOJSON_MEDIATYPE_READ, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_GEOJSON_MEDIATYPE_READ,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testFeatureAttributeMapping(ctx: TestContext) {
  const start = Date.now();
  const systemId = getSystemId(ctx);
  if (!systemId) {
    return skipResult(
      REQ_GEOJSON_FEATURE_MAPPING,
      'No system ID available in discovery cache; cannot test GeoJSON feature mapping.',
    );
  }

  try {
    const url = new URL(`/systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url, {
      'Accept': 'application/geo+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_GEOJSON_FEATURE_MAPPING,
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
        REQ_GEOJSON_FEATURE_MAPPING,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Check standard GeoJSON members: type, id, geometry, properties
    const requiredMembers = ['type', 'id', 'geometry', 'properties'];
    const missingMembers = requiredMembers.filter((m) => !(m in body));

    if (missingMembers.length > 0) {
      return failResult(
        REQ_GEOJSON_FEATURE_MAPPING,
        assertionFailure(
          'GeoJSON Feature must have type, id, geometry, and properties members',
          requiredMembers.join(', '),
          `missing: ${missingMembers.join(', ')}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.type !== 'Feature') {
      return failResult(
        REQ_GEOJSON_FEATURE_MAPPING,
        assertionFailure(
          'GeoJSON type must be "Feature"',
          'Feature',
          String(body.type),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_GEOJSON_FEATURE_MAPPING, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_GEOJSON_FEATURE_MAPPING,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSystemSchema(ctx: TestContext) {
  const start = Date.now();
  const systemId = getSystemId(ctx);
  if (!systemId) {
    return skipResult(
      REQ_GEOJSON_SYSTEM_SCHEMA,
      'No system ID available in discovery cache; cannot test system schema.',
    );
  }

  try {
    const url = new URL(`/systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url, {
      'Accept': 'application/geo+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_GEOJSON_SYSTEM_SCHEMA,
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
        REQ_GEOJSON_SYSTEM_SCHEMA,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Verify properties object exists and has system-specific fields
    const props = body.properties;
    if (typeof props !== 'object' || props === null) {
      return failResult(
        REQ_GEOJSON_SYSTEM_SCHEMA,
        assertionFailure(
          'System GeoJSON must have a properties object',
          'properties object',
          typeof props === 'undefined' ? 'missing properties' : `properties is ${typeof props}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    const propsObj = props as Record<string, unknown>;
    // System must at minimum have a name (or label/description per OGC spec)
    if (!('name' in propsObj) && !('label' in propsObj)) {
      return failResult(
        REQ_GEOJSON_SYSTEM_SCHEMA,
        assertionFailure(
          'System properties must include at least a name or label field',
          'name or label in properties',
          `found keys: ${Object.keys(propsObj).join(', ') || '(empty)'}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_GEOJSON_SYSTEM_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_GEOJSON_SYSTEM_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSystemMappings(ctx: TestContext) {
  const start = Date.now();
  const systemId = getSystemId(ctx);
  if (!systemId) {
    return skipResult(
      REQ_GEOJSON_SYSTEM_MAPPINGS,
      'No system ID available in discovery cache; cannot test system mappings.',
    );
  }

  try {
    const url = new URL(`/systems/${encodeURIComponent(systemId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url, {
      'Accept': 'application/geo+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_GEOJSON_SYSTEM_MAPPINGS,
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
        REQ_GEOJSON_SYSTEM_MAPPINGS,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Verify properties map to OGC concepts: check for featureType or systemType
    const props = body.properties as Record<string, unknown> | undefined;
    if (!props || typeof props !== 'object') {
      return failResult(
        REQ_GEOJSON_SYSTEM_MAPPINGS,
        assertionFailure(
          'System GeoJSON must have a properties object for OGC concept mapping',
          'properties object',
          'missing or invalid properties',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // OGC CS API systems should map featureType (or definition/systemType) to OGC concepts
    const hasMapping = 'featureType' in props ||
      'definition' in props ||
      'systemType' in props;

    if (!hasMapping) {
      return failResult(
        REQ_GEOJSON_SYSTEM_MAPPINGS,
        assertionFailure(
          'System properties must map to OGC concepts (featureType, definition, or systemType)',
          'featureType, definition, or systemType property',
          `found keys: ${Object.keys(props).join(', ') || '(empty)'}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_GEOJSON_SYSTEM_MAPPINGS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_GEOJSON_SYSTEM_MAPPINGS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const geojsonTestModule: ConformanceClassTest = {
  classDefinition: geojsonClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_GEOJSON_MEDIATYPE_READ, execute: testMediaTypeRead },
      { requirement: REQ_GEOJSON_FEATURE_MAPPING, execute: testFeatureAttributeMapping },
      { requirement: REQ_GEOJSON_SYSTEM_SCHEMA, execute: testSystemSchema },
      { requirement: REQ_GEOJSON_SYSTEM_MAPPINGS, execute: testSystemMappings },
    ];
  },
};
