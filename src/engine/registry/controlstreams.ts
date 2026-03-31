// S09-03: OGC Connected Systems Part 2 — Control Streams & Commands conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/controlstream

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
  requirementUri: '/req/controlstream/resources-endpoint',
  conformanceUri: '/conf/controlstream/resources-endpoint',
  name: 'Control Streams Resources Endpoint',
  priority: 'MUST',
  description: 'GET /controlstreams returns HTTP 200 with a JSON response body.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/controlstream/canonical-url',
  conformanceUri: '/conf/controlstream/canonical-url',
  name: 'Control Stream Canonical URL',
  priority: 'MUST',
  description: 'GET /controlstreams/{id} returns HTTP 200 with the correct control stream.',
};

const REQ_REF_FROM_SYSTEM: RequirementDefinition = {
  requirementUri: '/req/controlstream/ref-from-system',
  conformanceUri: '/conf/controlstream/ref-from-system',
  name: 'Control Streams Referenced from System',
  priority: 'MUST',
  description: 'GET /systems/{id}/controlstreams returns HTTP 200.',
};

const REQ_SCHEMA_OP: RequirementDefinition = {
  requirementUri: '/req/controlstream/schema-op',
  conformanceUri: '/conf/controlstream/schema-op',
  name: 'Control Stream Schema Operation',
  priority: 'MUST',
  description: 'GET /controlstreams/{id}/schema returns HTTP 200.',
};

const REQ_CMD_RESOURCES_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/controlstream/cmd-resources-endpoint',
  conformanceUri: '/conf/controlstream/cmd-resources-endpoint',
  name: 'Commands Resources Endpoint',
  priority: 'MUST',
  description: 'GET /commands or /controlstreams/{id}/commands returns HTTP 200.',
};

const REQ_CMD_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/controlstream/cmd-canonical-url',
  conformanceUri: '/conf/controlstream/cmd-canonical-url',
  name: 'Command Canonical URL',
  priority: 'MUST',
  description: 'GET /commands/{id} returns HTTP 200.',
};

// --- Conformance Class Definition ---

export const controlstreamsClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.CONTROLSTREAM,
  name: 'Connected Systems Part 2 - Control Streams & Commands',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.COMMON, CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_RESOURCES_ENDPOINT,
    REQ_CANONICAL_URL,
    REQ_REF_FROM_SYSTEM,
    REQ_SCHEMA_OP,
    REQ_CMD_RESOURCES_ENDPOINT,
    REQ_CMD_CANONICAL_URL,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('/controlstreams', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /controlstreams must return HTTP 200',
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
          'GET /controlstreams must return valid JSON',
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
          'Control streams response must contain an items array',
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
  const controlStreamId = ctx.discoveryCache.controlStreamId;
  if (!controlStreamId) {
    return skipResult(
      REQ_CANONICAL_URL,
      'No control stream available in discovery cache; cannot test canonical URL.',
    );
  }

  try {
    const url = new URL(`/controlstreams/${encodeURIComponent(controlStreamId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
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
        REQ_CANONICAL_URL,
        assertionFailure(
          'Control stream response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.id !== controlStreamId) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'Control stream response id must match the requested controlStreamId',
          controlStreamId,
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
      'No system available in discovery cache; cannot test control streams from system.',
    );
  }

  try {
    const url = new URL(`/systems/${encodeURIComponent(systemId)}/controlstreams`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'GET /systems/{id}/controlstreams must return HTTP 200',
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
  const controlStreamId = ctx.discoveryCache.controlStreamId;
  if (!controlStreamId) {
    return skipResult(
      REQ_SCHEMA_OP,
      'No control stream available in discovery cache; cannot test schema operation.',
    );
  }

  try {
    const url = new URL(`/controlstreams/${encodeURIComponent(controlStreamId)}/schema`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SCHEMA_OP,
        assertionFailure(
          'GET /controlstreams/{id}/schema must return HTTP 200',
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

async function testCmdResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();
  const controlStreamId = ctx.discoveryCache.controlStreamId;

  try {
    // Try /commands first, fall back to /controlstreams/{id}/commands
    const primaryUrl = new URL('/commands', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(primaryUrl);
    const exchangeIds = [response.exchange.id];

    if (response.statusCode === 200) {
      const durationMs = Date.now() - start;
      return passResult(REQ_CMD_RESOURCES_ENDPOINT, exchangeIds, durationMs);
    }

    // Fall back to controlstream-scoped commands
    if (controlStreamId) {
      const fallbackUrl = new URL(`/controlstreams/${encodeURIComponent(controlStreamId)}/commands`, ctx.baseUrl).toString();
      const fallbackResponse = await ctx.httpClient.get(fallbackUrl);
      exchangeIds.push(fallbackResponse.exchange.id);
      const durationMs = Date.now() - start;

      if (fallbackResponse.statusCode === 200) {
        return passResult(REQ_CMD_RESOURCES_ENDPOINT, exchangeIds, durationMs);
      }

      return failResult(
        REQ_CMD_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /commands or /controlstreams/{id}/commands must return HTTP 200',
          '200',
          `GET /commands returned ${response.statusCode}, GET /controlstreams/{id}/commands returned ${fallbackResponse.statusCode}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    const durationMs = Date.now() - start;
    return failResult(
      REQ_CMD_RESOURCES_ENDPOINT,
      assertionFailure(
        'GET /commands must return HTTP 200',
        '200',
        String(response.statusCode),
      ),
      exchangeIds,
      durationMs,
    );
  } catch (error) {
    return failResult(
      REQ_CMD_RESOURCES_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testCmdCanonicalUrl(ctx: TestContext) {
  const start = Date.now();
  const commandId = ctx.discoveryCache.commandId;
  if (!commandId) {
    return skipResult(
      REQ_CMD_CANONICAL_URL,
      'No command available in discovery cache; cannot test command canonical URL.',
    );
  }

  try {
    const url = new URL(`/commands/${encodeURIComponent(commandId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CMD_CANONICAL_URL,
        assertionFailure(
          'GET /commands/{id} must return HTTP 200',
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
        REQ_CMD_CANONICAL_URL,
        assertionFailure(
          'Command response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.id !== commandId) {
      return failResult(
        REQ_CMD_CANONICAL_URL,
        assertionFailure(
          'Command response id must match the requested commandId',
          commandId,
          String(body.id ?? '(missing id)'),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_CMD_CANONICAL_URL, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_CMD_CANONICAL_URL,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const controlstreamsTestModule: ConformanceClassTest = {
  classDefinition: controlstreamsClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES_ENDPOINT, execute: testResourcesEndpoint },
      { requirement: REQ_CANONICAL_URL, execute: testCanonicalUrl },
      { requirement: REQ_REF_FROM_SYSTEM, execute: testRefFromSystem },
      { requirement: REQ_SCHEMA_OP, execute: testSchemaOp },
      { requirement: REQ_CMD_RESOURCES_ENDPOINT, execute: testCmdResourcesEndpoint },
      { requirement: REQ_CMD_CANONICAL_URL, execute: testCmdCanonicalUrl },
    ];
  },
};
