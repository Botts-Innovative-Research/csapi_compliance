// S09-06: Part 2 Update conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/update
//
// REQ-CRUD-001 (SCENARIO-CRUD-BODY-001): Update tests reuse the same
// dataStream_create.json / controlStream_create.json-compliant bodies as
// the CRUD module so the initial POST succeeds against a spec-strict server.

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
import {
  DATASTREAM_CREATE_BODY,
  CONTROLSTREAM_CREATE_BODY,
} from '@/engine/registry/part2-crud';

// --- Payloads ---

const CREATE_DATASTREAM_BODY = DATASTREAM_CREATE_BODY;

const CREATE_CONTROLSTREAM_BODY = CONTROLSTREAM_CREATE_BODY;

const PATCH_DATASTREAM_BODY = {
  name: 'CSAPI Compliance Test Datastream Updated',
};

const PATCH_CONTROLSTREAM_BODY = {
  name: 'CSAPI Compliance Test Control Stream Updated',
};

// --- Requirement Definitions ---

const REQ_UPDATE_DATASTREAM: RequirementDefinition = {
  requirementUri: '/req/update/datastream',
  conformanceUri: '/conf/update/datastream',
  name: 'Update Datastream',
  priority: 'MUST',
  description: 'PATCH /datastreams/{id} returns 200/204.',
};

const REQ_UPDATE_CONTROLSTREAM: RequirementDefinition = {
  requirementUri: '/req/update/controlstream',
  conformanceUri: '/conf/update/controlstream',
  name: 'Update Control Stream',
  priority: 'MUST',
  description: 'PATCH /controlstreams/{id} returns 200/204.',
};

// --- Conformance Class Definition ---

export const part2UpdateClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.UPDATE,
  name: 'Part 2 Update',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.CRUD],
  requirements: [REQ_UPDATE_DATASTREAM, REQ_UPDATE_CONTROLSTREAM],
  isWriteOperation: true,
};

// --- Test Functions ---

async function testUpdateDatastream(ctx: TestContext) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdLocation: string | null = null;

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_UPDATE_DATASTREAM,
      'No systems available on the server to create datastream under',
    );
  }

  try {
    // Step 1: Create datastream via POST
    const systemId = ctx.discoveryCache.systemId;
    const createUrl = new URL(
      `systems/${systemId}/datastreams`,
      ctx.baseUrl,
    ).toString();
    const createResponse = await ctx.httpClient.post(
      createUrl,
      CREATE_DATASTREAM_BODY,
      { 'Content-Type': 'application/json' },
    );
    exchangeIds.push(createResponse.exchange.id);

    if (createResponse.statusCode !== 201) {
      return failResult(
        REQ_UPDATE_DATASTREAM,
        assertionFailure(
          'POST /systems/{id}/datastreams must return HTTP 201 to set up update test',
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
        REQ_UPDATE_DATASTREAM,
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

    // Step 2: PATCH the datastream
    const patchResponse = await ctx.httpClient.patch(
      createdLocation,
      PATCH_DATASTREAM_BODY,
      { 'Content-Type': 'application/merge-patch+json' },
    );
    exchangeIds.push(patchResponse.exchange.id);

    if (patchResponse.statusCode !== 200 && patchResponse.statusCode !== 204) {
      return failResult(
        REQ_UPDATE_DATASTREAM,
        assertionFailure(
          'PATCH /datastreams/{id} must return HTTP 200 or 204',
          '200 or 204',
          String(patchResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 3: GET to verify update
    const getResponse = await ctx.httpClient.get(createdLocation);
    exchangeIds.push(getResponse.exchange.id);

    if (getResponse.statusCode !== 200) {
      return failResult(
        REQ_UPDATE_DATASTREAM,
        assertionFailure(
          'GET after PATCH must return HTTP 200',
          '200',
          String(getResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 4: Clean up via DELETE
    const deleteResponse = await ctx.httpClient.delete(createdLocation);
    exchangeIds.push(deleteResponse.exchange.id);
    createdLocation = null;

    return passResult(REQ_UPDATE_DATASTREAM, exchangeIds, Date.now() - start);
  } catch (error) {
    return failResult(
      REQ_UPDATE_DATASTREAM,
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

async function testUpdateControlStream(ctx: TestContext) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdLocation: string | null = null;

  if (!ctx.discoveryCache.systemId) {
    return skipResult(
      REQ_UPDATE_CONTROLSTREAM,
      'No systems available on the server to create control stream under',
    );
  }

  try {
    // Step 1: Create control stream via POST
    const systemId = ctx.discoveryCache.systemId;
    const createUrl = new URL(
      `systems/${systemId}/controlstreams`,
      ctx.baseUrl,
    ).toString();
    const createResponse = await ctx.httpClient.post(
      createUrl,
      CREATE_CONTROLSTREAM_BODY,
      { 'Content-Type': 'application/json' },
    );
    exchangeIds.push(createResponse.exchange.id);

    if (createResponse.statusCode !== 201) {
      return failResult(
        REQ_UPDATE_CONTROLSTREAM,
        assertionFailure(
          'POST /systems/{id}/controlstreams must return HTTP 201 to set up update test',
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
        REQ_UPDATE_CONTROLSTREAM,
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

    // Step 2: PATCH the control stream
    const patchResponse = await ctx.httpClient.patch(
      createdLocation,
      PATCH_CONTROLSTREAM_BODY,
      { 'Content-Type': 'application/merge-patch+json' },
    );
    exchangeIds.push(patchResponse.exchange.id);

    if (patchResponse.statusCode !== 200 && patchResponse.statusCode !== 204) {
      return failResult(
        REQ_UPDATE_CONTROLSTREAM,
        assertionFailure(
          'PATCH /controlstreams/{id} must return HTTP 200 or 204',
          '200 or 204',
          String(patchResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 3: GET to verify update
    const getResponse = await ctx.httpClient.get(createdLocation);
    exchangeIds.push(getResponse.exchange.id);

    if (getResponse.statusCode !== 200) {
      return failResult(
        REQ_UPDATE_CONTROLSTREAM,
        assertionFailure(
          'GET after PATCH must return HTTP 200',
          '200',
          String(getResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 4: Clean up via DELETE
    const deleteResponse = await ctx.httpClient.delete(createdLocation);
    exchangeIds.push(deleteResponse.exchange.id);
    createdLocation = null;

    return passResult(
      REQ_UPDATE_CONTROLSTREAM,
      exchangeIds,
      Date.now() - start,
    );
  } catch (error) {
    return failResult(
      REQ_UPDATE_CONTROLSTREAM,
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

export const part2UpdateTestModule: ConformanceClassTest = {
  classDefinition: part2UpdateClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_UPDATE_DATASTREAM, execute: testUpdateDatastream },
      {
        requirement: REQ_UPDATE_CONTROLSTREAM,
        execute: testUpdateControlStream,
      },
    ];
  },
};
