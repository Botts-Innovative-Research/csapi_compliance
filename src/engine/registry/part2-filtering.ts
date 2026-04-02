// S09-05: Part 2 Advanced Filtering conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/advanced-filtering

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

const REQ_FILTER_PHENOMENON_TIME: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/phenomenonTime',
  conformanceUri: '/conf/advanced-filtering/phenomenonTime',
  name: 'Filter by Phenomenon Time',
  priority: 'MUST',
  description: 'GET /observations?phenomenonTime=... returns HTTP 200.',
};

const REQ_FILTER_RESULT_TIME: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/resultTime',
  conformanceUri: '/conf/advanced-filtering/resultTime',
  name: 'Filter by Result Time',
  priority: 'MUST',
  description: 'GET /observations?resultTime=... returns HTTP 200.',
};

const REQ_FILTER_OBSERVED_PROPERTY: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/observedProperty',
  conformanceUri: '/conf/advanced-filtering/observedProperty',
  name: 'Filter by Observed Property',
  priority: 'MUST',
  description: 'GET /datastreams?observedProperty=... returns HTTP 200.',
};

const REQ_FILTER_COMBINED: RequirementDefinition = {
  requirementUri: '/req/advanced-filtering/combined',
  conformanceUri: '/conf/advanced-filtering/combined',
  name: 'Combined Part 2 Filters',
  priority: 'MUST',
  description: 'Multiple Part 2 filters can be combined.',
};

// --- Conformance Class Definition ---

export const part2FilteringClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.ADVANCED_FILTERING,
  name: 'Part 2 Advanced Filtering',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.DATASTREAM],
  requirements: [
    REQ_FILTER_PHENOMENON_TIME,
    REQ_FILTER_RESULT_TIME,
    REQ_FILTER_OBSERVED_PROPERTY,
    REQ_FILTER_COMBINED,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testFilterPhenomenonTime(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_FILTER_PHENOMENON_TIME,
      'No datastreams available on the server',
    );
  }

  try {
    const url = new URL('observations', ctx.baseUrl);
    url.searchParams.set('phenomenonTime', '2020-01-01T00:00:00Z/2030-12-31T23:59:59Z');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_FILTER_PHENOMENON_TIME,
        assertionFailure(
          'GET /observations?phenomenonTime=... must return HTTP 200',
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
        REQ_FILTER_PHENOMENON_TIME,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_FILTER_PHENOMENON_TIME, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_FILTER_PHENOMENON_TIME,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testFilterResultTime(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_FILTER_RESULT_TIME,
      'No datastreams available on the server',
    );
  }

  try {
    const url = new URL('observations', ctx.baseUrl);
    url.searchParams.set('resultTime', '2020-01-01T00:00:00Z/2030-12-31T23:59:59Z');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_FILTER_RESULT_TIME,
        assertionFailure(
          'GET /observations?resultTime=... must return HTTP 200',
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
        REQ_FILTER_RESULT_TIME,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_FILTER_RESULT_TIME, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_FILTER_RESULT_TIME,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testFilterObservedProperty(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_FILTER_OBSERVED_PROPERTY,
      'No datastreams available on the server',
    );
  }

  try {
    const url = new URL('datastreams', ctx.baseUrl);
    url.searchParams.set('observedProperty', 'urn:example:property:temperature');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_FILTER_OBSERVED_PROPERTY,
        assertionFailure(
          'GET /datastreams?observedProperty=... must return HTTP 200',
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
        REQ_FILTER_OBSERVED_PROPERTY,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_FILTER_OBSERVED_PROPERTY, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_FILTER_OBSERVED_PROPERTY,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testFilterCombined(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_FILTER_COMBINED,
      'No datastreams available on the server',
    );
  }

  try {
    const url = new URL('observations', ctx.baseUrl);
    url.searchParams.set('phenomenonTime', '2020-01-01T00:00:00Z/2030-12-31T23:59:59Z');
    url.searchParams.set('resultTime', '2020-01-01T00:00:00Z/2030-12-31T23:59:59Z');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_FILTER_COMBINED,
        assertionFailure(
          'GET /observations with combined filters must return HTTP 200',
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
        REQ_FILTER_COMBINED,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_FILTER_COMBINED, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_FILTER_COMBINED,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const part2FilteringTestModule: ConformanceClassTest = {
  classDefinition: part2FilteringClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_FILTER_PHENOMENON_TIME, execute: testFilterPhenomenonTime },
      { requirement: REQ_FILTER_RESULT_TIME, execute: testFilterResultTime },
      { requirement: REQ_FILTER_OBSERVED_PROPERTY, execute: testFilterObservedProperty },
      { requirement: REQ_FILTER_COMBINED, execute: testFilterCombined },
    ];
  },
};
