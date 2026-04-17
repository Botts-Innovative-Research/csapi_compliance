// S09-04: Command Feasibility conformance class test module (Part 2).
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/feasibility

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

const REQ_FEASIBILITY_ENDPOINT: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/feasibility/endpoint',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/feasibility/endpoint',
  name: 'Feasibility Endpoint',
  priority: 'MUST',
  description:
    'POST /controlstreams/{id}/commands with feasibility check returns HTTP 200.',
};

const REQ_FEASIBILITY_RESPONSE: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/req/feasibility/response',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/feasibility/response',
  name: 'Feasibility Response',
  priority: 'MUST',
  description: 'Response includes feasibility status.',
};

// --- Conformance Class Definition ---

export const part2FeasibilityClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.FEASIBILITY,
  name: 'Command Feasibility',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.CONTROLSTREAM],
  requirements: [REQ_FEASIBILITY_ENDPOINT, REQ_FEASIBILITY_RESPONSE],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testFeasibilityEndpoint(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.controlStreamId) {
    return skipResult(
      REQ_FEASIBILITY_ENDPOINT,
      'No control streams available on the server',
    );
  }

  try {
    const controlStreamId = ctx.discoveryCache.controlStreamId;
    const url = new URL(
      `controlstreams/${controlStreamId}/commands`,
      ctx.baseUrl,
    ).toString();
    const body = {
      feasibilityCheck: true,
      parameters: {},
    };
    const response = await ctx.httpClient.post(url, body, {
      'Content-Type': 'application/json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    // If server returns 404, the feasibility endpoint is optional
    if (response.statusCode === 404) {
      return skipResult(
        REQ_FEASIBILITY_ENDPOINT,
        'Server returned 404 for feasibility endpoint (optional feature)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_FEASIBILITY_ENDPOINT,
        assertionFailure(
          'POST /controlstreams/{id}/commands with feasibility check must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_FEASIBILITY_ENDPOINT, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_FEASIBILITY_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testFeasibilityResponse(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.controlStreamId) {
    return skipResult(
      REQ_FEASIBILITY_RESPONSE,
      'No control streams available on the server',
    );
  }

  try {
    const controlStreamId = ctx.discoveryCache.controlStreamId;
    const url = new URL(
      `controlstreams/${controlStreamId}/commands`,
      ctx.baseUrl,
    ).toString();
    const body = {
      feasibilityCheck: true,
      parameters: {},
    };
    const response = await ctx.httpClient.post(url, body, {
      'Content-Type': 'application/json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    // If server returns 404, the feasibility endpoint is optional
    if (response.statusCode === 404) {
      return skipResult(
        REQ_FEASIBILITY_RESPONSE,
        'Server returned 404 for feasibility endpoint (optional feature)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_FEASIBILITY_RESPONSE,
        assertionFailure(
          'POST feasibility check must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_FEASIBILITY_RESPONSE,
        assertionFailure(
          'Feasibility response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (parsed.feasibilityStatus === undefined && parsed.status === undefined) {
      return failResult(
        REQ_FEASIBILITY_RESPONSE,
        assertionFailure(
          'Feasibility response must include feasibility status',
          'feasibilityStatus or status property',
          'neither property found in response',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_FEASIBILITY_RESPONSE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_FEASIBILITY_RESPONSE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const part2FeasibilityTestModule: ConformanceClassTest = {
  classDefinition: part2FeasibilityClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_FEASIBILITY_ENDPOINT, execute: testFeasibilityEndpoint },
      { requirement: REQ_FEASIBILITY_RESPONSE, execute: testFeasibilityResponse },
    ];
  },
};
