// S03-06: Create/Replace/Delete conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete

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

// --- Minimal test payload ---

const MINIMAL_GEOJSON_BODY = {
  type: 'Feature',
  properties: { name: 'CSAPI Compliance Test Resource' },
  geometry: null,
};

// --- Requirement Definitions ---

const REQ_CRUD_SYSTEM: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/system',
  conformanceUri: '/conf/create-replace-delete/system',
  name: 'Create and Delete System',
  priority: 'MUST',
  description: 'POST /systems creates a system (201 + Location header), DELETE removes it (204).',
};

const REQ_CRUD_SYSTEM_DELETE_CASCADE: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/system-delete-cascade',
  conformanceUri: '/conf/create-replace-delete/system-delete-cascade',
  name: 'Delete System Cascade',
  priority: 'MUST',
  description: 'DELETE /systems/{id} removes the system and returns 204.',
};

const REQ_CRUD_DEPLOYMENT: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/deployment',
  conformanceUri: '/conf/create-replace-delete/deployment',
  name: 'Create and Delete Deployment',
  priority: 'MUST',
  description: 'POST /deployments creates a deployment (201 + Location header).',
};

const REQ_CRUD_PROCEDURE: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/procedure',
  conformanceUri: '/conf/create-replace-delete/procedure',
  name: 'Create and Delete Procedure',
  priority: 'MUST',
  description: 'POST /procedures creates a procedure (201 + Location header).',
};

const REQ_CRUD_SAMPLING_FEATURE: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/sampling-feature',
  conformanceUri: '/conf/create-replace-delete/sampling-feature',
  name: 'Create and Delete Sampling Feature',
  priority: 'MUST',
  description: 'POST /samplingFeatures creates a sampling feature (201 + Location header).',
};

const REQ_CRUD_PROPERTY: RequirementDefinition = {
  requirementUri: '/req/create-replace-delete/property',
  conformanceUri: '/conf/create-replace-delete/property',
  name: 'Create and Delete Property',
  priority: 'MUST',
  description: 'POST /properties creates a property (201 + Location header).',
};

// --- Conformance Class Definition ---

export const crudClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.CRUD,
  name: 'Create/Replace/Delete',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_CRUD_SYSTEM,
    REQ_CRUD_SYSTEM_DELETE_CASCADE,
    REQ_CRUD_DEPLOYMENT,
    REQ_CRUD_PROCEDURE,
    REQ_CRUD_SAMPLING_FEATURE,
    REQ_CRUD_PROPERTY,
  ],
  isWriteOperation: true,
};

// --- Helper: CRUD lifecycle test ---

/**
 * Executes the full create-get-delete-get lifecycle for a resource type.
 * 1. POST to create with minimal GeoJSON body -> expect 201 + Location
 * 2. GET created resource via Location -> expect 200
 * 3. DELETE created resource -> expect 204 or 200
 * 4. GET again -> expect 404
 */
async function testCrudLifecycle(
  ctx: TestContext,
  requirement: RequirementDefinition,
  collectionPath: string,
) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdLocation: string | null = null;

  try {
    // Step 1: POST to create
    const createUrl = new URL(collectionPath, ctx.baseUrl).toString();
    const createResponse = await ctx.httpClient.post(
      createUrl,
      MINIMAL_GEOJSON_BODY,
      { 'Content-Type': 'application/geo+json' },
    );
    exchangeIds.push(createResponse.exchange.id);

    if (createResponse.statusCode !== 201) {
      return failResult(
        requirement,
        assertionFailure(
          `POST ${collectionPath} must return HTTP 201`,
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

    // Resolve relative Location against base URL
    createdLocation = new URL(location, ctx.baseUrl).toString();

    // Step 2: GET created resource
    const getResponse = await ctx.httpClient.get(createdLocation);
    exchangeIds.push(getResponse.exchange.id);

    if (getResponse.statusCode !== 200) {
      return failResult(
        requirement,
        assertionFailure(
          'GET created resource must return HTTP 200',
          '200',
          String(getResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 3: DELETE created resource
    const deleteResponse = await ctx.httpClient.delete(createdLocation);
    exchangeIds.push(deleteResponse.exchange.id);

    if (deleteResponse.statusCode !== 204 && deleteResponse.statusCode !== 200) {
      return failResult(
        requirement,
        assertionFailure(
          'DELETE created resource must return HTTP 204 or 200',
          '204 or 200',
          String(deleteResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Step 4: GET again - expect 404
    const getAfterDeleteResponse = await ctx.httpClient.get(createdLocation);
    exchangeIds.push(getAfterDeleteResponse.exchange.id);

    if (getAfterDeleteResponse.statusCode !== 404) {
      return failResult(
        requirement,
        assertionFailure(
          'GET after DELETE must return HTTP 404',
          '404',
          String(getAfterDeleteResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // All steps passed, resource already cleaned up
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
    // Clean up: attempt DELETE if resource was created but not yet deleted
    if (createdLocation) {
      try {
        await ctx.httpClient.delete(createdLocation);
      } catch {
        // Best-effort cleanup; ignore errors
      }
    }
  }
}

// --- Test Functions ---

async function testCrudSystem(ctx: TestContext) {
  return testCrudLifecycle(ctx, REQ_CRUD_SYSTEM, 'systems');
}

async function testCrudSystemDeleteCascade(ctx: TestContext) {
  const start = Date.now();
  const exchangeIds: string[] = [];
  let createdLocation: string | null = null;

  try {
    // Create a system
    const createUrl = new URL('systems', ctx.baseUrl).toString();
    const createResponse = await ctx.httpClient.post(
      createUrl,
      MINIMAL_GEOJSON_BODY,
      { 'Content-Type': 'application/geo+json' },
    );
    exchangeIds.push(createResponse.exchange.id);

    if (createResponse.statusCode !== 201) {
      return failResult(
        REQ_CRUD_SYSTEM_DELETE_CASCADE,
        assertionFailure(
          'POST /systems must return HTTP 201 to set up cascade delete test',
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
        REQ_CRUD_SYSTEM_DELETE_CASCADE,
        assertionFailure(
          'POST /systems must return a Location header',
          'Location header present',
          'Location header missing',
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    createdLocation = new URL(location, ctx.baseUrl).toString();

    // DELETE the system
    const deleteResponse = await ctx.httpClient.delete(createdLocation);
    exchangeIds.push(deleteResponse.exchange.id);

    if (deleteResponse.statusCode !== 204 && deleteResponse.statusCode !== 200) {
      return failResult(
        REQ_CRUD_SYSTEM_DELETE_CASCADE,
        assertionFailure(
          'DELETE /systems/{id} must return HTTP 204',
          '204 or 200',
          String(deleteResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Verify system is gone
    const verifyResponse = await ctx.httpClient.get(createdLocation);
    exchangeIds.push(verifyResponse.exchange.id);

    if (verifyResponse.statusCode !== 404) {
      return failResult(
        REQ_CRUD_SYSTEM_DELETE_CASCADE,
        assertionFailure(
          'GET after DELETE must return HTTP 404',
          '404',
          String(verifyResponse.statusCode),
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    createdLocation = null;
    return passResult(REQ_CRUD_SYSTEM_DELETE_CASCADE, exchangeIds, Date.now() - start);
  } catch (error) {
    return failResult(
      REQ_CRUD_SYSTEM_DELETE_CASCADE,
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

async function testCrudDeployment(ctx: TestContext) {
  return testCrudLifecycle(ctx, REQ_CRUD_DEPLOYMENT, 'deployments');
}

async function testCrudProcedure(ctx: TestContext) {
  return testCrudLifecycle(ctx, REQ_CRUD_PROCEDURE, 'procedures');
}

async function testCrudSamplingFeature(ctx: TestContext) {
  return testCrudLifecycle(ctx, REQ_CRUD_SAMPLING_FEATURE, 'samplingFeatures');
}

async function testCrudProperty(ctx: TestContext) {
  return testCrudLifecycle(ctx, REQ_CRUD_PROPERTY, 'properties');
}

// --- Test Module Export ---

export const crudTestModule: ConformanceClassTest = {
  classDefinition: crudClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_CRUD_SYSTEM, execute: testCrudSystem },
      { requirement: REQ_CRUD_SYSTEM_DELETE_CASCADE, execute: testCrudSystemDeleteCascade },
      { requirement: REQ_CRUD_DEPLOYMENT, execute: testCrudDeployment },
      { requirement: REQ_CRUD_PROCEDURE, execute: testCrudProcedure },
      { requirement: REQ_CRUD_SAMPLING_FEATURE, execute: testCrudSamplingFeature },
      { requirement: REQ_CRUD_PROPERTY, execute: testCrudProperty },
    ];
  },
};
