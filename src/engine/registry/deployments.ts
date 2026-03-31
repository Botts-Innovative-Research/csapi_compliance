// S03-03: Connected Systems Part 1 — Deployment Features conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment

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

// --- Requirement Definitions ---

const REQ_RESOURCES_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/deployment/resources-endpoint',
  conformanceUri: '/conf/deployment/resources-endpoint',
  name: 'Deployments Resources Endpoint',
  priority: 'MUST',
  description: 'GET /deployments returns HTTP 200 with a JSON response body.',
};

const REQ_CANONICAL_URL: RequirementDefinition = {
  requirementUri: '/req/deployment/canonical-url',
  conformanceUri: '/conf/deployment/canonical-url',
  name: 'Deployment Canonical URL',
  priority: 'MUST',
  description: 'GET /deployments/{id} returns HTTP 200 with the correct deployment id.',
};

const REQ_CANONICAL_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/deployment/canonical-endpoint',
  conformanceUri: '/conf/deployment/canonical-endpoint',
  name: 'Deployment Canonical Endpoint',
  priority: 'MUST',
  description: 'Deployment resource has a self link.',
};

const REQ_REF_FROM_SYSTEM: RequirementDefinition = {
  requirementUri: '/req/deployment/ref-from-system',
  conformanceUri: '/conf/deployment/ref-from-system',
  name: 'Deployments Referenced from System',
  priority: 'MUST',
  description: 'GET /systems/{id}/deployments returns HTTP 200.',
};

const REQ_COLLECTIONS: RequirementDefinition = {
  requirementUri: '/req/deployment/collections',
  conformanceUri: '/conf/deployment/collections',
  name: 'Deployments in Collections',
  priority: 'MUST',
  description: 'Deployments appear in /collections.',
};

// --- Conformance Class Definition ---

export const deploymentsClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.DEPLOYMENT,
  name: 'Connected Systems - Deployment Features',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.CORE],
  requirements: [
    REQ_RESOURCES_ENDPOINT,
    REQ_CANONICAL_URL,
    REQ_CANONICAL_ENDPOINT,
    REQ_REF_FROM_SYSTEM,
    REQ_COLLECTIONS,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testResourcesEndpoint(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('/deployments', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /deployments must return HTTP 200',
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
        REQ_RESOURCES_ENDPOINT,
        assertionFailure(
          'GET /deployments must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
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
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_CANONICAL_URL,
      'No deployments available in discovery cache; cannot test canonical URL.',
    );
  }

  try {
    const url = new URL(
      `/deployments/${encodeURIComponent(deploymentId)}`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'GET /deployments/{id} must return HTTP 200',
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
          'Deployment response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.id !== deploymentId) {
      return failResult(
        REQ_CANONICAL_URL,
        assertionFailure(
          'Deployment response id must match the requested deploymentId',
          deploymentId,
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

async function testCanonicalEndpoint(ctx: TestContext) {
  const start = Date.now();
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_CANONICAL_ENDPOINT,
      'No deployments available in discovery cache; cannot test canonical endpoint.',
    );
  }

  try {
    const url = new URL(
      `/deployments/${encodeURIComponent(deploymentId)}`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'Deployment response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    const links = body.links;
    if (!Array.isArray(links)) {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'Deployment resource must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    const hasSelf = links.some((l: Record<string, unknown>) => l.rel === 'self');
    if (!hasSelf) {
      return failResult(
        REQ_CANONICAL_ENDPOINT,
        assertionFailure(
          'Deployment resource must have a self link',
          'link with rel="self"',
          'no self link found',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_CANONICAL_ENDPOINT, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_CANONICAL_ENDPOINT,
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
      'No systems available in discovery cache; cannot test deployments referenced from system.',
    );
  }

  try {
    const url = new URL(
      `/systems/${encodeURIComponent(systemId)}/deployments`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'GET /systems/{id}/deployments must return HTTP 200',
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
        REQ_REF_FROM_SYSTEM,
        assertionFailure(
          'System deployments response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
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

async function testCollections(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('/collections', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_COLLECTIONS,
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
        REQ_COLLECTIONS,
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
        REQ_COLLECTIONS,
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

    const collections = body.collections as Record<string, unknown>[];
    const hasDeploymentCollection = collections.some(
      (c) => c.id === 'deployments' || c.id === 'deployment' ||
        (typeof c.itemType === 'string' && c.itemType.toLowerCase().includes('deployment')),
    );

    if (!hasDeploymentCollection) {
      return failResult(
        REQ_COLLECTIONS,
        assertionFailure(
          'Deployments must appear in /collections',
          'a collection for deployments',
          'no deployment-related collection found',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_COLLECTIONS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_COLLECTIONS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const deploymentsTestModule: ConformanceClassTest = {
  classDefinition: deploymentsClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_RESOURCES_ENDPOINT, execute: testResourcesEndpoint },
      { requirement: REQ_CANONICAL_URL, execute: testCanonicalUrl },
      { requirement: REQ_CANONICAL_ENDPOINT, execute: testCanonicalEndpoint },
      { requirement: REQ_REF_FROM_SYSTEM, execute: testRefFromSystem },
      { requirement: REQ_COLLECTIONS, execute: testCollections },
    ];
  },
};
