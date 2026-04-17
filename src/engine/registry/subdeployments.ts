// S03-03: Connected Systems Part 1 — Subdeployments conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subdeployment

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

const REQ_COLLECTION: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subdeployment/collection',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subdeployment/collection',
  name: 'Subdeployments Collection',
  priority: 'MUST',
  description: 'GET /deployments/{id}/subdeployments returns HTTP 200.',
};

const REQ_RECURSIVE_PARAM: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subdeployment/recursive-param',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subdeployment/recursive-param',
  name: 'Subdeployments Recursive Parameter',
  priority: 'MUST',
  description: 'Subdeployments endpoint supports recursive=true query parameter.',
};

const REQ_RECURSIVE_SEARCH_DEPLOYMENTS: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subdeployment/recursive-search-deployments',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subdeployment/recursive-search-deployments',
  name: 'Subdeployments Recursive Search',
  priority: 'MUST',
  description: 'Recursive search returns nested subdeployment results.',
};

// REQ-TEST-CITE-002 rubric-6.1 audit (2026-04-17) against OGC 23-001 Part 1:
// - /req/subdeployment/recursive-assoc (clause 11, "Deployment Associations"):
//   "Whenever a `Deployment` resource has subdeployments, the target content
//   of its associations SHALL be adjusted as indicated in
//   <table deployment-assocs-recursive>." The table enumerates
//   `deployedSystems`, `samplingFeatures`, `featuresOfInterest`, `datastreams`,
//   `controlstreams` — it is about RECURSIVE AGGREGATION of child-resource
//   associations on the PARENT, NOT about a rel="parent" or rel="up" link
//   from subdeployment → parent.
// - Clause 11 documents a `parentDeployment` PROPERTY, but that is a resource
//   property, not a link-relation value — the spec never mandates rel="parent"
//   or rel="up".
// Per REQ-TEST-CITE-002 + GH #3 precedent, absence of a parent-link relation
// on a subdeployment is downgraded from FAIL to SKIP-with-reason below.
//
// Caveat (Raze 2026-04-17T03:18Z): the upstream opengeospatial/ogcapi-connected-systems
// repository's api/part1/standard/requirements/subdeployment/ directory has
// NO separate req_recursive_assoc.adoc file; the requirement is defined only
// inline in clause 11 of the compiled spec (the requirements_class lists it
// but no standalone .adoc exists). Citation therefore points at the compiled
// HTML section rather than a requirement-file URL.
// Source: https://docs.ogc.org/is/23-001/23-001.html (clause 11, /req/subdeployment/recursive-assoc).
const REQ_RECURSIVE_ASSOC: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subdeployment/recursive-assoc',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subdeployment/recursive-assoc',
  name: 'Subdeployment Parent Association',
  priority: 'MUST',
  description:
    'Subdeployment has a links array; presence of rel="parent" or rel="up" ' +
    '(or an href pointing back at the parent deployment) is checked but ' +
    'absence produces SKIP (not FAIL) because OGC 23-001 ' +
    '/req/subdeployment/recursive-assoc is about recursive aggregation of ' +
    'deployedSystems / samplingFeatures / featuresOfInterest / datastreams / ' +
    'controlstreams associations on the parent — not a parent-link relation ' +
    'on the subdeployment.',
};

// --- Conformance Class Definition ---

export const subdeploymentsClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.SUBDEPLOYMENT,
  name: 'Connected Systems - Subdeployments',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.DEPLOYMENT],
  requirements: [
    REQ_COLLECTION,
    REQ_RECURSIVE_PARAM,
    REQ_RECURSIVE_SEARCH_DEPLOYMENTS,
    REQ_RECURSIVE_ASSOC,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testCollection(ctx: TestContext) {
  const start = Date.now();
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_COLLECTION,
      'No deployments available in discovery cache; cannot test subdeployments collection.',
    );
  }

  try {
    const url = new URL(
      `deployments/${encodeURIComponent(deploymentId)}/subdeployments`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_COLLECTION,
        assertionFailure(
          'GET /deployments/{id}/subdeployments must return HTTP 200',
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
        REQ_COLLECTION,
        assertionFailure(
          'Subdeployments response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_COLLECTION, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_COLLECTION,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testRecursiveParam(ctx: TestContext) {
  const start = Date.now();
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_RECURSIVE_PARAM,
      'No deployments available in discovery cache; cannot test recursive parameter.',
    );
  }

  try {
    const url = new URL(
      `deployments/${encodeURIComponent(deploymentId)}/subdeployments`,
      ctx.baseUrl,
    );
    url.searchParams.set('recursive', 'true');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RECURSIVE_PARAM,
        assertionFailure(
          'GET /deployments/{id}/subdeployments?recursive=true must return HTTP 200',
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
        REQ_RECURSIVE_PARAM,
        assertionFailure(
          'Recursive subdeployments response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RECURSIVE_PARAM, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RECURSIVE_PARAM,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testRecursiveSearchDeployments(ctx: TestContext) {
  const start = Date.now();
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_RECURSIVE_SEARCH_DEPLOYMENTS,
      'No deployments available in discovery cache; cannot test recursive search.',
    );
  }

  try {
    const url = new URL(
      `deployments/${encodeURIComponent(deploymentId)}/subdeployments`,
      ctx.baseUrl,
    );
    url.searchParams.set('recursive', 'true');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RECURSIVE_SEARCH_DEPLOYMENTS,
        assertionFailure(
          'Recursive subdeployments search must return HTTP 200',
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
        REQ_RECURSIVE_SEARCH_DEPLOYMENTS,
        assertionFailure(
          'Recursive subdeployments response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.items)) {
      return failResult(
        REQ_RECURSIVE_SEARCH_DEPLOYMENTS,
        assertionFailure(
          'Recursive subdeployments response must contain an items array',
          'items array',
          typeof body.items === 'undefined'
            ? 'missing items property'
            : `items is ${typeof body.items}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RECURSIVE_SEARCH_DEPLOYMENTS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RECURSIVE_SEARCH_DEPLOYMENTS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testRecursiveAssoc(ctx: TestContext) {
  const start = Date.now();
  const deploymentId = ctx.discoveryCache.deploymentId;
  if (!deploymentId) {
    return skipResult(
      REQ_RECURSIVE_ASSOC,
      'No deployments available in discovery cache; cannot test subdeployment parent association.',
    );
  }

  try {
    const url = new URL(
      `deployments/${encodeURIComponent(deploymentId)}/subdeployments`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RECURSIVE_ASSOC,
        assertionFailure(
          'GET /deployments/{id}/subdeployments must return HTTP 200',
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
        REQ_RECURSIVE_ASSOC,
        assertionFailure(
          'Subdeployments response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return skipResult(
        REQ_RECURSIVE_ASSOC,
        'No subdeployments found; cannot verify parent association links.',
      );
    }

    // Check that the first subdeployment has a link back to the parent deployment
    const firstSubdeployment = items[0] as Record<string, unknown>;
    const links = firstSubdeployment.links;
    if (!Array.isArray(links)) {
      return failResult(
        REQ_RECURSIVE_ASSOC,
        assertionFailure(
          'Subdeployment must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // REQ-TEST-CITE-002: OGC 23-001 /req/subdeployment/recursive-assoc governs
    // recursive aggregation of associations on the parent (deployedSystems,
    // samplingFeatures, featuresOfInterest, datastreams, controlstreams) — it
    // does NOT mandate rel="parent" or rel="up" on subdeployment resources.
    // The parentDeployment property exists per clause 11 but is a resource
    // property, not a link relation. Downgrade missing parent-link relation
    // from FAIL to SKIP-with-reason per GH #3 precedent.
    const hasParentLink = links.some(
      (l: Record<string, unknown>) =>
        l.rel === 'parent' || l.rel === 'up' ||
        (typeof l.href === 'string' && (l.href as string).includes(`/deployments/${deploymentId}`)),
    );

    if (!hasParentLink) {
      return skipResult(
        REQ_RECURSIVE_ASSOC,
        'Subdeployment has no rel="parent"/"up" link and no href pointing at ' +
          'the parent deployment, but OGC 23-001 ' +
          '/req/subdeployment/recursive-assoc does not mandate such a link ' +
          'relation (it governs recursive aggregation of deployedSystems / ' +
          'samplingFeatures / featuresOfInterest / datastreams / ' +
          'controlstreams). Per REQ-TEST-CITE-002 and GH #3 precedent, ' +
          'absence is not FAIL.',
      );
    }

    return passResult(REQ_RECURSIVE_ASSOC, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RECURSIVE_ASSOC,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const subdeploymentsTestModule: ConformanceClassTest = {
  classDefinition: subdeploymentsClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_COLLECTION, execute: testCollection },
      { requirement: REQ_RECURSIVE_PARAM, execute: testRecursiveParam },
      { requirement: REQ_RECURSIVE_SEARCH_DEPLOYMENTS, execute: testRecursiveSearchDeployments },
      { requirement: REQ_RECURSIVE_ASSOC, execute: testRecursiveAssoc },
    ];
  },
};
