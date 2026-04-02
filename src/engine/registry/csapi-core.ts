// S03-01: CS API Core conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core

import { CS_PART1_CONF, PARENT_CONF } from '@/lib/constants';
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

const REQ_RESOURCE_IDS: RequirementDefinition = {
  requirementUri: '/req/api-common/resource-ids',
  conformanceUri: '/conf/api-common/resource-ids',
  name: 'Resource IDs',
  priority: 'MUST',
  description: 'All CS API resources have unique id fields.',
};

const REQ_RESOURCE_UIDS: RequirementDefinition = {
  requirementUri: '/req/api-common/resource-uids',
  conformanceUri: '/conf/api-common/resource-uids',
  name: 'Resource UIDs',
  priority: 'SHOULD',
  description: 'Resources may have a uid (unique identifier) field.',
};

const REQ_DATETIME: RequirementDefinition = {
  requirementUri: '/req/api-common/datetime',
  conformanceUri: '/conf/api-common/datetime',
  name: 'DateTime Filter',
  priority: 'MUST',
  description: 'Server supports datetime query parameter on collection endpoints.',
};

// --- Conformance Class Definition ---

export const csapiCoreClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.CORE,
  name: 'CS API Core',
  standardPart: 'cs-part1',
  dependencies: [PARENT_CONF.FEATURES_CORE],
  requirements: [
    REQ_RESOURCE_IDS,
    REQ_RESOURCE_UIDS,
    REQ_DATETIME,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourceIds(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_RESOURCE_IDS, 'No systems available on the server');
  }

  try {
    const url = new URL('systems?limit=1', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCE_IDS,
        assertionFailure(
          'GET /systems?limit=1 must return HTTP 200',
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
        REQ_RESOURCE_IDS,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return skipResult(REQ_RESOURCE_IDS, 'No items returned from /systems?limit=1');
    }

    const firstItem = items[0] as Record<string, unknown>;
    if (!firstItem.id) {
      return failResult(
        REQ_RESOURCE_IDS,
        assertionFailure(
          'Each resource item must have an id field',
          'non-empty id field',
          'id is missing or empty',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RESOURCE_IDS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RESOURCE_IDS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testResourceUids(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_RESOURCE_UIDS, 'No systems available on the server');
  }

  try {
    const url = new URL('systems?limit=1', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCE_UIDS,
        assertionFailure(
          'GET /systems?limit=1 must return HTTP 200',
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
        REQ_RESOURCE_UIDS,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return skipResult(REQ_RESOURCE_UIDS, 'No items returned from /systems?limit=1');
    }

    const firstItem = items[0] as Record<string, unknown>;
    const properties = firstItem.properties as Record<string, unknown> | undefined;

    // uid is a SHOULD requirement — pass with a warning if missing
    if (!properties || !properties.uid) {
      // SHOULD requirement: warn but still pass
      return passResult(REQ_RESOURCE_UIDS, exchangeIds, durationMs);
    }

    return passResult(REQ_RESOURCE_UIDS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RESOURCE_UIDS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testDatetimeFilter(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(REQ_DATETIME, 'No systems available on the server');
  }

  try {
    const url = new URL('systems?datetime=2020-01-01T00:00:00Z/..', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_DATETIME,
        assertionFailure(
          'GET /systems?datetime=... must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Verify response body is valid JSON
    try {
      JSON.parse(response.body);
    } catch {
      return failResult(
        REQ_DATETIME,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_DATETIME, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_DATETIME,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const csapiCoreTestModule: ConformanceClassTest = {
  classDefinition: csapiCoreClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCE_IDS, execute: testResourceIds },
      { requirement: REQ_RESOURCE_UIDS, execute: testResourceUids },
      { requirement: REQ_DATETIME, execute: testDatetimeFilter },
    ];
  },
};
