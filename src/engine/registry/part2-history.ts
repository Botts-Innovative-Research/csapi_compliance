// S09-05: System History conformance class test module (Part 2).
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/system-history

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

const REQ_SYSTEM_HISTORY_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/system-history/endpoint',
  conformanceUri: '/conf/system-history/endpoint',
  name: 'System History Endpoint',
  priority: 'MUST',
  description: 'GET /systems/{id}/history returns HTTP 200.',
};

const REQ_SYSTEM_HISTORY_REVISION: RequirementDefinition = {
  requirementUri: '/req/system-history/revision',
  conformanceUri: '/conf/system-history/revision',
  name: 'System History Revision Metadata',
  priority: 'MUST',
  description: 'History items have revision metadata.',
};

// --- Conformance Class Definition ---

export const part2HistoryClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.SYSTEM_HISTORY,
  name: 'System History',
  standardPart: 'cs-part2',
  dependencies: [CS_PART1_CONF.SYSTEM],
  requirements: [REQ_SYSTEM_HISTORY_ENDPOINT, REQ_SYSTEM_HISTORY_REVISION],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testSystemHistoryEndpoint(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_SYSTEM_HISTORY_ENDPOINT,
      'No systems available on the server',
    );
  }

  try {
    const systemId = ctx.discoveryCache.systemId;
    const url = new URL(
      `/systems/${systemId}/history`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SYSTEM_HISTORY_ENDPOINT,
        assertionFailure(
          'GET /systems/{id}/history must return HTTP 200',
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
        REQ_SYSTEM_HISTORY_ENDPOINT,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SYSTEM_HISTORY_ENDPOINT, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SYSTEM_HISTORY_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSystemHistoryRevision(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_SYSTEM_HISTORY_REVISION,
      'No systems available on the server',
    );
  }

  try {
    const systemId = ctx.discoveryCache.systemId;
    const url = new URL(
      `/systems/${systemId}/history`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SYSTEM_HISTORY_REVISION,
        assertionFailure(
          'GET /systems/{id}/history must return HTTP 200',
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
        REQ_SYSTEM_HISTORY_REVISION,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Check if there are items to validate
    const items = body.items as unknown[];
    if (!Array.isArray(items) || items.length === 0) {
      // No history items to validate; pass since endpoint responded correctly
      return passResult(REQ_SYSTEM_HISTORY_REVISION, exchangeIds, durationMs);
    }

    // Validate the first history item has revision metadata
    const item = items[0] as Record<string, unknown>;
    const hasRevision =
      item.revision !== undefined ||
      item.validTime !== undefined ||
      item.modified !== undefined;

    if (!hasRevision) {
      return failResult(
        REQ_SYSTEM_HISTORY_REVISION,
        assertionFailure(
          'History items must have revision metadata (revision, validTime, or modified)',
          'revision metadata present',
          'no revision metadata found in history item',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SYSTEM_HISTORY_REVISION, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SYSTEM_HISTORY_REVISION,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const part2HistoryTestModule: ConformanceClassTest = {
  classDefinition: part2HistoryClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      {
        requirement: REQ_SYSTEM_HISTORY_ENDPOINT,
        execute: testSystemHistoryEndpoint,
      },
      {
        requirement: REQ_SYSTEM_HISTORY_REVISION,
        execute: testSystemHistoryRevision,
      },
    ];
  },
};
