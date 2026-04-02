// S09-01: OGC Connected Systems Part 2 — API Common conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/api-common

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

const REQ_RESOURCES: RequirementDefinition = {
  requirementUri: '/req/api-common/resources',
  conformanceUri: '/conf/api-common/resources',
  name: 'Part 2 Resource Endpoints',
  priority: 'MUST',
  description: 'Part 2 resource endpoints (datastreams, observations, controlstreams, commands) are accessible.',
};

const REQ_RESOURCE_COLLECTION: RequirementDefinition = {
  requirementUri: '/req/api-common/resource-collection',
  conformanceUri: '/conf/api-common/resource-collection',
  name: 'Part 2 Resource Collections',
  priority: 'MUST',
  description: 'Part 2 resources appear in collections.',
};

// --- Conformance Class Definition ---

export const part2CommonClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.COMMON,
  name: 'Connected Systems Part 2 - API Common',
  standardPart: 'cs-part2',
  dependencies: [CS_PART1_CONF.CORE],
  requirements: [
    REQ_RESOURCES,
    REQ_RESOURCE_COLLECTION,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResources(ctx: TestContext) {
  const start = Date.now();
  try {
    // Test that at least one Part 2 resource endpoint is accessible
    const endpoints = ['/datastreams', '/observations', '/controlstreams', '/commands'];
    const exchangeIds: string[] = [];
    let anyAccessible = false;
    const results: string[] = [];

    for (const endpoint of endpoints) {
      try {
        const url = new URL(endpoint, ctx.baseUrl).toString();
        const response = await ctx.httpClient.get(url);
        exchangeIds.push(response.exchange.id);
        if (response.statusCode === 200) {
          anyAccessible = true;
          results.push(`${endpoint}: 200`);
        } else {
          results.push(`${endpoint}: ${response.statusCode}`);
        }
      } catch {
        results.push(`${endpoint}: error`);
      }
    }

    const durationMs = Date.now() - start;

    if (!anyAccessible) {
      return failResult(
        REQ_RESOURCES,
        assertionFailure(
          'At least one Part 2 resource endpoint must be accessible',
          'at least one endpoint returning 200',
          results.join(', '),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RESOURCES, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RESOURCES,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testResourceCollection(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('collections', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCE_COLLECTION,
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
        REQ_RESOURCE_COLLECTION,
        assertionFailure(
          'Collections response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.collections)) {
      return failResult(
        REQ_RESOURCE_COLLECTION,
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

    // Check that at least one Part 2 collection exists (datastreams, observations, controlstreams, commands)
    const part2Keywords = ['datastream', 'observation', 'controlstream', 'command'];
    const collections = body.collections as Record<string, unknown>[];
    const hasPart2Collection = collections.some(
      (c) => {
        const id = String(c.id ?? '').toLowerCase();
        const itemType = String(c.itemType ?? '').toLowerCase();
        return part2Keywords.some((k) => id.includes(k) || itemType.includes(k));
      },
    );

    if (!hasPart2Collection) {
      return failResult(
        REQ_RESOURCE_COLLECTION,
        assertionFailure(
          'Part 2 resources must appear in /collections',
          'a collection for datastreams, observations, controlstreams, or commands',
          'no Part 2 resource collection found',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RESOURCE_COLLECTION, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RESOURCE_COLLECTION,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const part2CommonTestModule: ConformanceClassTest = {
  classDefinition: part2CommonClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES, execute: testResources },
      { requirement: REQ_RESOURCE_COLLECTION, execute: testResourceCollection },
    ];
  },
};
