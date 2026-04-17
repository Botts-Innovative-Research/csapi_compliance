// S03-05: Advanced Filtering conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/advanced-filtering

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

const REQ_ID_LIST_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/id-list-schema',
  conformanceUri: '/conf/advanced-filtering/id-list-schema',
  name: 'ID List Filter Schema',
  priority: 'MUST',
  description: 'GET /systems?id={id1},{id2} returns filtered results.',
};

const REQ_RESOURCE_BY_ID: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/resource-by-id',
  conformanceUri: '/conf/advanced-filtering/resource-by-id',
  name: 'Filter Resource by ID',
  priority: 'MUST',
  description: 'Filtering by id returns matching resource.',
};

const REQ_RESOURCE_BY_KEYWORD: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/resource-by-keyword',
  conformanceUri: '/conf/advanced-filtering/resource-by-keyword',
  name: 'Filter Resource by Keyword',
  priority: 'MUST',
  description: 'GET /systems?q=keyword returns results.',
};

const REQ_FEATURE_BY_GEOM: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/feature-by-geom',
  conformanceUri: '/conf/advanced-filtering/feature-by-geom',
  name: 'Filter Feature by Geometry',
  priority: 'MUST',
  description: 'GET /systems?bbox=... returns spatial results.',
};

const REQ_SYSTEM_BY_PROCEDURE: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/system-by-procedure',
  conformanceUri: '/conf/advanced-filtering/system-by-procedure',
  name: 'Filter System by Procedure',
  priority: 'MUST',
  description: 'GET /systems?procedure={id} works.',
};

const REQ_COMBINED_FILTERS: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/combined-filters',
  conformanceUri: '/conf/advanced-filtering/combined-filters',
  name: 'Combined Filters',
  priority: 'MUST',
  description: 'Multiple filters can be combined.',
};

// --- Conformance Class Definition ---

export const filteringClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.ADVANCED_FILTERING,
  name: 'Advanced Filtering',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_ID_LIST_SCHEMA,
    REQ_RESOURCE_BY_ID,
    REQ_RESOURCE_BY_KEYWORD,
    REQ_FEATURE_BY_GEOM,
    REQ_SYSTEM_BY_PROCEDURE,
    REQ_COMBINED_FILTERS,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testIdListSchema(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_ID_LIST_SCHEMA, 'No systems available on the server');
  }

  try {
    const systemId = ctx.discoveryCache.systemId;
    const url = new URL('systems', ctx.baseUrl);
    url.searchParams.set('id', `${systemId},${systemId}`);
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_ID_LIST_SCHEMA,
        assertionFailure(
          'GET /systems?id={id1},{id2} must return HTTP 200',
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
        REQ_ID_LIST_SCHEMA,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_ID_LIST_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_ID_LIST_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testResourceById(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_RESOURCE_BY_ID, 'No systems available on the server');
  }

  try {
    const systemId = ctx.discoveryCache.systemId;
    const url = new URL('systems', ctx.baseUrl);
    url.searchParams.set('id', systemId);
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCE_BY_ID,
        assertionFailure(
          'GET /systems?id={id} must return HTTP 200',
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
        REQ_RESOURCE_BY_ID,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RESOURCE_BY_ID, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RESOURCE_BY_ID,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testResourceByKeyword(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_RESOURCE_BY_KEYWORD, 'No systems available on the server');
  }

  try {
    const url = new URL('systems', ctx.baseUrl);
    url.searchParams.set('q', 'sensor');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCE_BY_KEYWORD,
        assertionFailure(
          'GET /systems?q=keyword must return HTTP 200',
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
        REQ_RESOURCE_BY_KEYWORD,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RESOURCE_BY_KEYWORD, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RESOURCE_BY_KEYWORD,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testFeatureByGeom(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_FEATURE_BY_GEOM, 'No systems available on the server');
  }

  try {
    // Use a world-spanning bbox to ensure we get results if any exist
    const url = new URL('systems', ctx.baseUrl);
    url.searchParams.set('bbox', '-180,-90,180,90');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_FEATURE_BY_GEOM,
        assertionFailure(
          'GET /systems?bbox=... must return HTTP 200',
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
        REQ_FEATURE_BY_GEOM,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_FEATURE_BY_GEOM, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_FEATURE_BY_GEOM,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSystemByProcedure(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_SYSTEM_BY_PROCEDURE, 'No systems available on the server');
  }

  if (!ctx.discoveryCache.procedureId) {
    return skipResult(
      REQ_SYSTEM_BY_PROCEDURE,
      'No procedure available on the server; cannot construct a valid procedure filter',
    );
  }

  try {
    const url = new URL('systems', ctx.baseUrl);
    url.searchParams.set('procedure', ctx.discoveryCache.procedureId);
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SYSTEM_BY_PROCEDURE,
        assertionFailure(
          'GET /systems?procedure={id} must return HTTP 200',
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
        REQ_SYSTEM_BY_PROCEDURE,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SYSTEM_BY_PROCEDURE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SYSTEM_BY_PROCEDURE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testCombinedFilters(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_COMBINED_FILTERS, 'No systems available on the server');
  }

  try {
    const systemId = ctx.discoveryCache.systemId;
    const url = new URL('systems', ctx.baseUrl);
    url.searchParams.set('id', systemId);
    url.searchParams.set('q', 'sensor');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_COMBINED_FILTERS,
        assertionFailure(
          'GET /systems with combined filters must return HTTP 200',
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
        REQ_COMBINED_FILTERS,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_COMBINED_FILTERS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_COMBINED_FILTERS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const filteringTestModule: ConformanceClassTest = {
  classDefinition: filteringClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_ID_LIST_SCHEMA, execute: testIdListSchema },
      { requirement: REQ_RESOURCE_BY_ID, execute: testResourceById },
      { requirement: REQ_RESOURCE_BY_KEYWORD, execute: testResourceByKeyword },
      { requirement: REQ_FEATURE_BY_GEOM, execute: testFeatureByGeom },
      { requirement: REQ_SYSTEM_BY_PROCEDURE, execute: testSystemByProcedure },
      { requirement: REQ_COMBINED_FILTERS, execute: testCombinedFilters },
    ];
  },
};
