// S03-06: Update conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/update

import { CS_PART1_CONF } from '@/lib/constants';
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

// --- Payloads ---

const CREATE_BODY = {
  type: 'Feature',
  properties: { name: 'CSAPI Compliance Test Resource' },
  geometry: null,
};

const PATCH_BODY = {
  properties: { name: 'CSAPI Compliance Test Resource Updated' },
};

// --- Requirement Definitions ---

const REQ_UPDATE_SYSTEM: RequirementDefinition = {
  requirementUri: '/req/update/system',
  conformanceUri: '/conf/update/system',
  name: 'Update System',
  priority: 'MUST',
  description: 'PATCH /systems/{id} updates a system (200 or 204).',
};

const REQ_UPDATE_DEPLOYMENT: RequirementDefinition = {
  requirementUri: '/req/update/deployment',
  conformanceUri: '/conf/update/deployment',
  name: 'Update Deployment',
  priority: 'MUST',
  description: 'PATCH /deployments/{id} updates a deployment (200 or 204).',
};

const REQ_UPDATE_PROCEDURE: RequirementDefinition = {
  requirementUri: '/req/update/procedure',
  conformanceUri: '/conf/update/procedure',
  name: 'Update Procedure',
  priority: 'MUST',
  description: 'PATCH /procedures/{id} updates a procedure (200 or 204).',
};

// --- Conformance Class Definition ---

export const updateClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.UPDATE,
  name: 'Update',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.CRUD],
  requirements: [
    REQ_UPDATE_SYSTEM,
    REQ_UPDATE_DEPLOYMENT,
    REQ_UPDATE_PROCEDURE,
  ],
  isWriteOperation: true,
};

// --- Helper: Update lifecycle test ---

/**
 * Create resource, PATCH with updated name, verify with GET, clean up with DELETE.
 */
async function testUpdateLifecycle(
  ctx: TestContext,
  requirement: RequirementDefinition,
  collectionPath: string,
) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdLocation: string | null = null;

  try {
    // Step 1: Create resource via POST
    const createUrl = new URL(collectionPath, ctx.baseUrl).toString();
    const createResponse = await ctx.httpClient.post(
      createUrl,
      CREATE_BODY,
      { 'Content-Type': 'application/geo+json' },
    );
    exchangeIds.push(createResponse.exchange.id);

    if (createResponse.statusCode !== 201) {
      return failResult(
        requirement,
        assertionFailure(
          `POST ${collectionPath} must return HTTP 201 to set up update test`,
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
        requirement,
        assertionFailure(
          `POST ${collectionPath} must return a Location header`,
          'Location header present',
          'Location header missing',
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    createdLocation = new URL(location, ctx.baseUrl).toString();

    // Step 2: PATCH the resource
    const patchResponse = await ctx.httpClient.patch(
      createdLocation,
      PATCH_BODY,
      { 'Content-Type': 'application/merge-patch+json' },
    );
    exchangeIds.push(patchResponse.exchange.id);

    if (patchResponse.statusCode !== 200 && patchResponse.statusCode !== 204) {
      return failResult(
        requirement,
        assertionFailure(
          `PATCH ${collectionPath}/{id} must return HTTP 200 or 204`,
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
        requirement,
        assertionFailure(
          'GET after PATCH must return HTTP 200',
          '200',
          String(getResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Verify the name was updated
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(getResponse.body) as Record<string, unknown>;
    } catch {
      return failResult(
        requirement,
        assertionFailure(
          'GET after PATCH must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    const props = body.properties as Record<string, unknown> | undefined;
    const updatedName = props?.name ?? (body as Record<string, unknown>).name;
    if (updatedName !== 'CSAPI Compliance Test Resource Updated') {
      return failResult(
        requirement,
        assertionFailure(
          'PATCH must update the resource name',
          'CSAPI Compliance Test Resource Updated',
          String(updatedName ?? '(name not found in response)'),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 4: Clean up via DELETE
    const deleteResponse = await ctx.httpClient.delete(createdLocation);
    exchangeIds.push(deleteResponse.exchange.id);
    createdLocation = null;

    return passResult(requirement, exchangeIds, Date.now() - start);
  } catch (error) {
    return failResult(
      requirement,
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

// --- Test Functions ---

async function testUpdateSystem(ctx: TestContext) {
  return testUpdateLifecycle(ctx, REQ_UPDATE_SYSTEM, '/systems');
}

async function testUpdateDeployment(ctx: TestContext) {
  return testUpdateLifecycle(ctx, REQ_UPDATE_DEPLOYMENT, '/deployments');
}

async function testUpdateProcedure(ctx: TestContext) {
  return testUpdateLifecycle(ctx, REQ_UPDATE_PROCEDURE, '/procedures');
}

// --- Test Module Export ---

export const updateTestModule: ConformanceClassTest = {
  classDefinition: updateClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_UPDATE_SYSTEM, execute: testUpdateSystem },
      { requirement: REQ_UPDATE_DEPLOYMENT, execute: testUpdateDeployment },
      { requirement: REQ_UPDATE_PROCEDURE, execute: testUpdateProcedure },
    ];
  },
};
