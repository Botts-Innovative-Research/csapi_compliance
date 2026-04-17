// S09-06: Part 2 Create/Replace/Delete conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/create-replace-delete
//
// REQ-CRUD-001 (SCENARIO-CRUD-BODY-001): Every CRUD test's request body
//   validates against the OGC create-schema at test-authoring time.
// REQ-TEST-DYNAMIC-001 (SCENARIO-OBS-SCHEMA-001): The observation-insert
//   test builds its observation body from the same resultType/resultSchema
//   used to create the parent datastream (dynamic-schema coupling,
//   authoring layer).
// REQ-TEST-DYNAMIC-002 (SCENARIO-OBS-SCHEMA-002/003): The observation-insert
//   test fetches the server's view of the datastream after POST and feeds
//   that (not the request fixture) into the observation-body builder —
//   runtime layer, catches servers that rewrite resultType.
// REQ-PART2-BASEURL-001 (SCENARIO-PART2-BASEURL-001): all Part 2 requests
//   resolve against the IUT's full base URL including any path segments.

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

// --- Test payloads (validate against OGC CS Part 2 create schemas) ---

/**
 * Build a dataStream_create.json-compliant request body. Uses a Quantity
 * component so the observation body (see {@link buildObservationBodyFor})
 * can be derived deterministically from this datastream's schema. Clients
 * that need a different observation-schema shape should mirror the
 * resultSchema they put here in the observation body they POST.
 */
export const DATASTREAM_CREATE_BODY = {
  id: 'csapi-compliance-test-ds',
  name: 'CSAPI Compliance Test Datastream',
  outputName: 'test-output',
  formats: ['application/json'],
  'system@link': {
    href: 'https://example.com/systems/csapi-compliance-test',
  },
  observedProperties: [
    {
      definition: 'https://example.com/properties/test-temperature',
      label: 'Test Temperature',
    },
  ],
  phenomenonTime: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'],
  resultTime: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'],
  resultType: 'measure' as const,
  live: false,
  schema: {
    obsFormat: 'application/json',
    resultSchema: {
      type: 'Quantity',
      definition: 'https://example.com/properties/test-temperature',
      label: 'Test Temperature',
      uom: { code: 'Cel' },
    },
  },
} as const;

/**
 * Minimal structural view of a datastream for the purposes of deriving a
 * conforming observation body. Loosened from `typeof DATASTREAM_CREATE_BODY`
 * so the same builder can accept EITHER the client's fixture (authoring
 * layer, REQ-TEST-DYNAMIC-001) OR a datastream parsed from the IUT's own
 * response to a POST /datastreams (runtime layer, REQ-TEST-DYNAMIC-002).
 */
export interface DatastreamShapeForObservation {
  resultType?: unknown;
  schema?: unknown;
  [key: string]: unknown;
}

/**
 * Build an observation body whose result matches the SWE Quantity schema
 * declared in {@link DATASTREAM_CREATE_BODY} — or, at runtime, in the
 * server's returned datastream. REQ-TEST-DYNAMIC-001 (authoring-layer call
 * at module load) and REQ-TEST-DYNAMIC-002 (runtime call inside
 * {@link testCrudObservation}).
 *
 * Exposed so the companion regression tests can verify both layers:
 * - `tests/unit/engine/registry/observation-dynamic-schema.test.ts` —
 *   authoring-layer coupling
 * - `tests/unit/engine/registry/observation-runtime-coupling.test.ts` —
 *   runtime-layer coupling (feeds a mock server-returned datastream with
 *   a different resultType and asserts the builder matches the server's
 *   shape, not the client's fixture)
 */
export function buildObservationBodyForDatastream(
  datastream: DatastreamShapeForObservation,
): {
  phenomenonTime: string;
  resultTime: string;
  result: number;
} {
  const resultType = datastream.resultType;
  // Current impl handles 'measure' (SWE Quantity) → numeric result.
  // Extending to Count/Text/Category requires synthesizing a matching
  // result value AND the builder's return type widens to a union.
  if (resultType !== 'measure') {
    throw new Error(
      `Unsupported datastream resultType "${String(resultType)}"; observation builder only handles 'measure' (Quantity).`,
    );
  }
  return {
    phenomenonTime: '2024-01-01T00:00:00Z',
    resultTime: '2024-01-01T00:00:00Z',
    result: 42.5,
  };
}

export const OBSERVATION_CREATE_BODY =
  buildObservationBodyForDatastream(DATASTREAM_CREATE_BODY);

/**
 * Build a controlStream_create.json-compliant request body.
 */
export const CONTROLSTREAM_CREATE_BODY = {
  id: 'csapi-compliance-test-cs',
  name: 'CSAPI Compliance Test Control Stream',
  inputName: 'test-input',
  formats: ['application/json'],
  'system@link': {
    href: 'https://example.com/systems/csapi-compliance-test',
  },
  controlledProperties: [
    {
      definition: 'https://example.com/properties/test-setpoint',
      label: 'Test Setpoint',
    },
  ],
  issueTime: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'],
  executionTime: ['2024-01-01T00:00:00Z', '2024-01-01T01:00:00Z'],
  live: false,
  async: false,
  schema: {
    commandFormat: 'application/json',
    parametersSchema: {
      type: 'Quantity',
      definition: 'https://example.com/properties/test-setpoint',
      label: 'Test Setpoint',
      uom: { code: 'Cel' },
    },
  },
} as const;

// Legacy aliases kept for existing test imports (will be removed in a
// later sprint once all references migrate to the explicit *_CREATE_BODY
// names above).
const MINIMAL_DATASTREAM_BODY = DATASTREAM_CREATE_BODY;
// (Legacy MINIMAL_OBSERVATION_BODY alias removed 2026-04-17:
// testCrudObservation now derives the body from the server's datastream
// shape at runtime — REQ-TEST-DYNAMIC-002.)
const MINIMAL_CONTROLSTREAM_BODY = CONTROLSTREAM_CREATE_BODY;

// --- Requirement Definitions ---

const REQ_CRUD_DATASTREAM: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/create-replace-delete/datastream',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete/datastream',
  name: 'Create and Delete Datastream',
  priority: 'MUST',
  description:
    'POST to create datastream (201 + Location header), DELETE removes it.',
};

const REQ_CRUD_OBSERVATION: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/create-replace-delete/observation',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete/observation',
  name: 'Create Observation',
  priority: 'MUST',
  description: 'POST to create observation (201).',
};

const REQ_CRUD_CONTROLSTREAM: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/create-replace-delete/controlstream',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete/controlstream',
  name: 'Create and Delete Control Stream',
  priority: 'MUST',
  description:
    'POST to create control stream (201 + Location header), DELETE removes it.',
};

// --- Conformance Class Definition ---

export const part2CrudClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.CRUD,
  name: 'Part 2 Create/Replace/Delete',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.DATASTREAM],
  requirements: [
    REQ_CRUD_DATASTREAM,
    REQ_CRUD_OBSERVATION,
    REQ_CRUD_CONTROLSTREAM,
  ],
  isWriteOperation: true,
};

// --- Test Functions ---

async function testCrudDatastream(ctx: TestContext) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdLocation: string | null = null;

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_CRUD_DATASTREAM,
      'No systems available on the server to create datastream under',
    );
  }

  try {
    // Step 1: POST to create datastream
    const systemId = ctx.discoveryCache.systemId;
    const createUrl = new URL(
      `systems/${systemId}/datastreams`,
      ctx.baseUrl,
    ).toString();
    const createResponse = await ctx.httpClient.post(
      createUrl,
      MINIMAL_DATASTREAM_BODY,
      { 'Content-Type': 'application/json' },
    );
    exchangeIds.push(createResponse.exchange.id);

    if (createResponse.statusCode !== 201) {
      return failResult(
        REQ_CRUD_DATASTREAM,
        assertionFailure(
          'POST /systems/{id}/datastreams must return HTTP 201',
          '201',
          String(createResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    const location = createResponse.headers['location'];
    if (!location) {
      return failResult(
        REQ_CRUD_DATASTREAM,
        assertionFailure(
          'POST must return a Location header',
          'Location header present',
          'Location header missing',
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    createdLocation = new URL(location, ctx.baseUrl).toString();

    // Step 2: GET to verify
    const getResponse = await ctx.httpClient.get(createdLocation);
    exchangeIds.push(getResponse.exchange.id);

    if (getResponse.statusCode !== 200) {
      return failResult(
        REQ_CRUD_DATASTREAM,
        assertionFailure(
          'GET created datastream must return HTTP 200',
          '200',
          String(getResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 3: DELETE cleanup
    const deleteResponse = await ctx.httpClient.delete(createdLocation);
    exchangeIds.push(deleteResponse.exchange.id);

    if (deleteResponse.statusCode !== 204 && deleteResponse.statusCode !== 200) {
      return failResult(
        REQ_CRUD_DATASTREAM,
        assertionFailure(
          'DELETE created datastream must return HTTP 204 or 200',
          '204 or 200',
          String(deleteResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    createdLocation = null;
    return passResult(REQ_CRUD_DATASTREAM, exchangeIds, Date.now() - start);
  } catch (error) {
    return failResult(
      REQ_CRUD_DATASTREAM,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      exchangeIds,
      Date.now() - start,
    );
  } finally {
    if (createdLocation) {
      try {
        await ctx.httpClient.delete(createdLocation);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

async function testCrudObservation(ctx: TestContext) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdDsLocation: string | null = null;
  let createdObsLocation: string | null = null;

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_CRUD_OBSERVATION,
      'No systems available on the server to create observation under',
    );
  }

  try {
    // Step 1: Create a datastream to host the observation
    const systemId = ctx.discoveryCache.systemId;
    const dsUrl = new URL(
      `systems/${systemId}/datastreams`,
      ctx.baseUrl,
    ).toString();
    const dsResponse = await ctx.httpClient.post(
      dsUrl,
      MINIMAL_DATASTREAM_BODY,
      { 'Content-Type': 'application/json' },
    );
    exchangeIds.push(dsResponse.exchange.id);

    if (dsResponse.statusCode !== 201 || !dsResponse.headers['location']) {
      // If we cannot create the datastream, use an existing one
      if (ctx.discoveryCache.datastreamId) {
        createdDsLocation = null;
      } else {
        return failResult(
          REQ_CRUD_OBSERVATION,
          assertionFailure(
            'Must be able to create a datastream for observation test',
            '201',
            String(dsResponse.statusCode),
          ),
          exchangeIds,
          Date.now() - start,
        );
      }
    } else {
      createdDsLocation = new URL(
        dsResponse.headers['location'],
        ctx.baseUrl,
      ).toString();
    }

    // Determine the datastream observations endpoint
    const dsId = createdDsLocation
      ? dsResponse.headers['location']
      : ctx.discoveryCache.datastreamId;
    const obsUrl = createdDsLocation
      ? new URL(`${createdDsLocation}/observations`).toString()
      : new URL(`datastreams/${dsId}/observations`, ctx.baseUrl).toString();

    // REQ-TEST-DYNAMIC-002: runtime coupling — fetch the server's view of
    // the datastream we just created (or the existing one we're reusing)
    // and feed THAT into the observation-body builder. If the server
    // rewrote resultType/schema during POST, we need the server's version
    // so the observation we POST next matches what the server holds.
    const dsGetUrl = createdDsLocation
      ? createdDsLocation
      : new URL(`datastreams/${dsId}`, ctx.baseUrl).toString();
    const dsGetResponse = await ctx.httpClient.get(dsGetUrl);
    exchangeIds.push(dsGetResponse.exchange.id);

    if (dsGetResponse.statusCode !== 200) {
      return failResult(
        REQ_CRUD_OBSERVATION,
        assertionFailure(
          'Observation body must derive from server-returned datastream ' +
            '(REQ-TEST-DYNAMIC-002), so GET datastream must return 200',
          '200',
          String(dsGetResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    let serverDatastream: DatastreamShapeForObservation;
    try {
      serverDatastream = JSON.parse(
        dsGetResponse.body,
      ) as DatastreamShapeForObservation;
    } catch (parseErr) {
      return failResult(
        REQ_CRUD_OBSERVATION,
        assertionFailure(
          'Server-returned datastream body must be parseable JSON so the ' +
            'observation body can derive from its resultType ' +
            '(REQ-TEST-DYNAMIC-002)',
          'parseable JSON datastream',
          `parse error: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    let observationBody: ReturnType<typeof buildObservationBodyForDatastream>;
    try {
      observationBody = buildObservationBodyForDatastream(serverDatastream);
    } catch (builderErr) {
      return failResult(
        REQ_CRUD_OBSERVATION,
        `Server-returned datastream has a resultType the observation ` +
          `builder cannot mirror (REQ-TEST-DYNAMIC-002). Extend ` +
          `buildObservationBodyForDatastream to support this resultType, or ` +
          `investigate why the server rewrote the client's proposed shape. ` +
          `Builder said: ${builderErr instanceof Error ? builderErr.message : String(builderErr)}`,
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 2: POST observation (body derived from SERVER's datastream shape)
    const obsResponse = await ctx.httpClient.post(
      obsUrl,
      observationBody,
      { 'Content-Type': 'application/json' },
    );
    exchangeIds.push(obsResponse.exchange.id);

    if (obsResponse.statusCode !== 201) {
      return failResult(
        REQ_CRUD_OBSERVATION,
        assertionFailure(
          'POST observation must return HTTP 201',
          '201',
          String(obsResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    if (obsResponse.headers['location']) {
      createdObsLocation = new URL(
        obsResponse.headers['location'],
        ctx.baseUrl,
      ).toString();
    }

    return passResult(REQ_CRUD_OBSERVATION, exchangeIds, Date.now() - start);
  } catch (error) {
    return failResult(
      REQ_CRUD_OBSERVATION,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      exchangeIds,
      Date.now() - start,
    );
  } finally {
    // Cleanup: delete observation first, then datastream
    if (createdObsLocation) {
      try {
        await ctx.httpClient.delete(createdObsLocation);
      } catch {
        // Best-effort cleanup
      }
    }
    if (createdDsLocation) {
      try {
        await ctx.httpClient.delete(createdDsLocation);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

async function testCrudControlStream(ctx: TestContext) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdLocation: string | null = null;

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_CRUD_CONTROLSTREAM,
      'No systems available on the server to create control stream under',
    );
  }

  try {
    // Step 1: POST to create control stream
    const systemId = ctx.discoveryCache.systemId;
    const createUrl = new URL(
      `systems/${systemId}/controlstreams`,
      ctx.baseUrl,
    ).toString();
    const createResponse = await ctx.httpClient.post(
      createUrl,
      MINIMAL_CONTROLSTREAM_BODY,
      { 'Content-Type': 'application/json' },
    );
    exchangeIds.push(createResponse.exchange.id);

    if (createResponse.statusCode !== 201) {
      return failResult(
        REQ_CRUD_CONTROLSTREAM,
        assertionFailure(
          'POST /systems/{id}/controlstreams must return HTTP 201',
          '201',
          String(createResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    const location = createResponse.headers['location'];
    if (!location) {
      return failResult(
        REQ_CRUD_CONTROLSTREAM,
        assertionFailure(
          'POST must return a Location header',
          'Location header present',
          'Location header missing',
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    createdLocation = new URL(location, ctx.baseUrl).toString();

    // Step 2: GET to verify
    const getResponse = await ctx.httpClient.get(createdLocation);
    exchangeIds.push(getResponse.exchange.id);

    if (getResponse.statusCode !== 200) {
      return failResult(
        REQ_CRUD_CONTROLSTREAM,
        assertionFailure(
          'GET created control stream must return HTTP 200',
          '200',
          String(getResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 3: DELETE cleanup
    const deleteResponse = await ctx.httpClient.delete(createdLocation);
    exchangeIds.push(deleteResponse.exchange.id);

    if (deleteResponse.statusCode !== 204 && deleteResponse.statusCode !== 200) {
      return failResult(
        REQ_CRUD_CONTROLSTREAM,
        assertionFailure(
          'DELETE created control stream must return HTTP 204 or 200',
          '204 or 200',
          String(deleteResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    createdLocation = null;
    return passResult(
      REQ_CRUD_CONTROLSTREAM,
      exchangeIds,
      Date.now() - start,
    );
  } catch (error) {
    return failResult(
      REQ_CRUD_CONTROLSTREAM,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      exchangeIds,
      Date.now() - start,
    );
  } finally {
    if (createdLocation) {
      try {
        await ctx.httpClient.delete(createdLocation);
      } catch {
        // Best-effort cleanup
      }
    }
  }
}

// --- Test Module Export ---

export const part2CrudTestModule: ConformanceClassTest = {
  classDefinition: part2CrudClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_CRUD_DATASTREAM, execute: testCrudDatastream },
      { requirement: REQ_CRUD_OBSERVATION, execute: testCrudObservation },
      { requirement: REQ_CRUD_CONTROLSTREAM, execute: testCrudControlStream },
    ];
  },
};
