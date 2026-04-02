// S09-06: Part 2 Create/Replace/Delete conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/create-replace-delete

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

// --- Minimal test payloads ---

const MINIMAL_DATASTREAM_BODY = {
  name: 'CSAPI Compliance Test Datastream',
  outputName: 'test-output',
  schema: {
    obsFormat: 'application/om+json',
  },
};

const MINIMAL_OBSERVATION_BODY = {
  phenomenonTime: '2024-01-01T00:00:00Z',
  resultTime: '2024-01-01T00:00:00Z',
  result: 42,
};

const MINIMAL_CONTROLSTREAM_BODY = {
  name: 'CSAPI Compliance Test Control Stream',
  inputName: 'test-input',
  schema: {
    commandFormat: 'application/json',
  },
};

// --- Requirement Definitions ---

const REQ_CRUD_DATASTREAM: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/datastream',
  conformanceUri: '/conf/create-replace-delete/datastream',
  name: 'Create and Delete Datastream',
  priority: 'MUST',
  description:
    'POST to create datastream (201 + Location header), DELETE removes it.',
};

const REQ_CRUD_OBSERVATION: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/observation',
  conformanceUri: '/conf/create-replace-delete/observation',
  name: 'Create Observation',
  priority: 'MUST',
  description: 'POST to create observation (201).',
};

const REQ_CRUD_CONTROLSTREAM: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/controlstream',
  conformanceUri: '/conf/create-replace-delete/controlstream',
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

    // Step 2: POST observation
    const obsResponse = await ctx.httpClient.post(
      obsUrl,
      MINIMAL_OBSERVATION_BODY,
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
