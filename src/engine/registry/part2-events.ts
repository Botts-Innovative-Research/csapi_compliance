// S09-04: System Events conformance class test module (Part 2).
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/system-event

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

const REQ_SYSTEM_EVENT_RESOURCES_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/system-event/resources-endpoint',
  conformanceUri: '/conf/system-event/resources-endpoint',
  name: 'System Events Resources Endpoint',
  priority: 'MUST',
  description: 'GET /systemEvents returns HTTP 200.',
};

const REQ_SYSTEM_EVENT_REF_FROM_SYSTEM: RequirementDefinition = {
  requirementUri: '/req/system-event/ref-from-system',
  conformanceUri: '/conf/system-event/ref-from-system',
  name: 'System Events Reference from System',
  priority: 'MUST',
  description: 'GET /systems/{id}/events returns HTTP 200.',
};

const REQ_SYSTEM_EVENT_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/system-event/event-schema',
  conformanceUri: '/conf/system-event/event-schema',
  name: 'System Event Schema',
  priority: 'MUST',
  description:
    'Event response has required structure (id, eventType, time).',
};

// --- Conformance Class Definition ---

export const part2EventsClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.SYSTEM_EVENT,
  name: 'System Events',
  standardPart: 'cs-part2',
  dependencies: [CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_SYSTEM_EVENT_RESOURCES_ENDPOINT,
    REQ_SYSTEM_EVENT_REF_FROM_SYSTEM,
    REQ_SYSTEM_EVENT_SCHEMA,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testSystemEventsEndpoint(ctx: TestContext) {
  const start = Date.now();

  try {
    const url = new URL('systemEvents', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SYSTEM_EVENT_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /systemEvents must return HTTP 200',
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
        REQ_SYSTEM_EVENT_RESOURCES_ENDPOINT,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(
      REQ_SYSTEM_EVENT_RESOURCES_ENDPOINT,
      exchangeIds,
      durationMs,
    );
  } catch (error) {
    return failResult(
      REQ_SYSTEM_EVENT_RESOURCES_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSystemEventRefFromSystem(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_SYSTEM_EVENT_REF_FROM_SYSTEM,
      'No systems available on the server',
    );
  }

  try {
    const systemId = ctx.discoveryCache.systemId;
    const url = new URL(
      `systems/${systemId}/events`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SYSTEM_EVENT_REF_FROM_SYSTEM,
        assertionFailure(
          'GET /systems/{id}/events must return HTTP 200',
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
        REQ_SYSTEM_EVENT_REF_FROM_SYSTEM,
        assertionFailure(
          'Response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(
      REQ_SYSTEM_EVENT_REF_FROM_SYSTEM,
      exchangeIds,
      durationMs,
    );
  } catch (error) {
    return failResult(
      REQ_SYSTEM_EVENT_REF_FROM_SYSTEM,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSystemEventSchema(ctx: TestContext) {
  const start = Date.now();

  try {
    const url = new URL('systemEvents', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SYSTEM_EVENT_SCHEMA,
        assertionFailure(
          'GET /systemEvents must return HTTP 200',
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
        REQ_SYSTEM_EVENT_SCHEMA,
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
      // No events to validate schema against; pass since endpoint responded correctly
      return passResult(REQ_SYSTEM_EVENT_SCHEMA, exchangeIds, durationMs);
    }

    // Validate the first event has required fields
    const event = items[0] as Record<string, unknown>;
    const missingFields: string[] = [];

    if (event.id === undefined) missingFields.push('id');
    if (event.eventType === undefined) missingFields.push('eventType');
    if (event.time === undefined) missingFields.push('time');

    if (missingFields.length > 0) {
      return failResult(
        REQ_SYSTEM_EVENT_SCHEMA,
        assertionFailure(
          'Event must have required fields: id, eventType, time',
          'id, eventType, time',
          `missing: ${missingFields.join(', ')}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SYSTEM_EVENT_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SYSTEM_EVENT_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const part2EventsTestModule: ConformanceClassTest = {
  classDefinition: part2EventsClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      {
        requirement: REQ_SYSTEM_EVENT_RESOURCES_ENDPOINT,
        execute: testSystemEventsEndpoint,
      },
      {
        requirement: REQ_SYSTEM_EVENT_REF_FROM_SYSTEM,
        execute: testSystemEventRefFromSystem,
      },
      {
        requirement: REQ_SYSTEM_EVENT_SCHEMA,
        execute: testSystemEventSchema,
      },
    ];
  },
};
