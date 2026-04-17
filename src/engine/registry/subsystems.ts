// S03-02: Connected Systems Part 1 — Subsystems conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subsystem

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
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subsystem/collection',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subsystem/collection',
  name: 'Subsystems Collection',
  priority: 'MUST',
  description: 'GET /systems/{systemId}/subsystems returns HTTP 200.',
};

const REQ_RECURSIVE_PARAM: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subsystem/recursive-param',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subsystem/recursive-param',
  name: 'Subsystems Recursive Parameter',
  priority: 'MUST',
  description: 'Subsystems endpoint supports recursive=true query parameter.',
};

const REQ_RECURSIVE_SEARCH_SYSTEMS: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subsystem/recursive-search-systems',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subsystem/recursive-search-systems',
  name: 'Subsystems Recursive Search',
  priority: 'MUST',
  description: 'Recursive search returns nested subsystem results.',
};

// REQ-TEST-CITE-002 rubric-6.1 audit (2026-04-17) against OGC 23-001 Part 1:
// - /req/subsystem/recursive-assoc (clause 9, "System Associations"):
//   "Whenever a `System` resource has subsystems, the target content of its
//   associations SHALL be adjusted as indicated in <table system-assocs-recursive>."
//   The table enumerates `samplingFeatures`, `datastreams`, `controlstreams` —
//   it is about RECURSIVE AGGREGATION of child-resource associations on the
//   PARENT, NOT about a rel="parent" or rel="up" link from subsystem → parent.
// - Clause 9 does document a `parentSystem` PROPERTY (inverse of
//   sosa:hasSubSystem), but `parentSystem` is a resource property, not a
//   link-relation value — the spec never mandates rel="parent" or rel="up".
// Per REQ-TEST-CITE-002 + GH #3 precedent, absence of a parent-link relation
// on a subsystem is downgraded from FAIL to SKIP-with-reason below.
//
// Caveat (Raze 2026-04-17T03:18Z): the upstream opengeospatial/ogcapi-connected-systems
// repository's api/part1/standard/requirements/subsystem/ directory has NO
// separate req_recursive_assoc.adoc file; the requirement is defined only
// inline in clause 9 of the compiled spec (the requirements_class lists it
// but no standalone .adoc exists). Citation therefore points at the compiled
// HTML section rather than a requirement-file URL.
// Source: https://docs.ogc.org/is/23-001/23-001.html (clause 9, /req/subsystem/recursive-assoc).
const REQ_RECURSIVE_ASSOC: RequirementDefinition = {
  requirementUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/req/subsystem/recursive-assoc',
  conformanceUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subsystem/recursive-assoc',
  name: 'Subsystem Parent Association',
  priority: 'MUST',
  description:
    'Subsystem has a links array; presence of rel="parent" or rel="up" (or ' +
    'an href pointing back at the parent system) is checked but absence ' +
    'produces SKIP (not FAIL) because OGC 23-001 /req/subsystem/recursive-assoc ' +
    'is about recursive aggregation of sampling-feature / datastream / ' +
    'controlstream associations on the parent — not a parent-link relation ' +
    'on the subsystem.',
};

// --- Conformance Class Definition ---

export const subsystemsClassDef: ConformanceClassDefinition = {
  classUri: CS_PART1_CONF.SUBSYSTEM,
  name: 'Connected Systems - Subsystems',
  standardPart: 'cs-part1',
  dependencies: [CS_PART1_CONF.SYSTEM],
  requirements: [
    REQ_COLLECTION,
    REQ_RECURSIVE_PARAM,
    REQ_RECURSIVE_SEARCH_SYSTEMS,
    REQ_RECURSIVE_ASSOC,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testCollection(ctx: TestContext) {
  const start = Date.now();
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_COLLECTION,
      'No systems available in discovery cache; cannot test subsystems collection.',
    );
  }

  try {
    const url = new URL(
      `systems/${encodeURIComponent(systemId)}/subsystems`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_COLLECTION,
        assertionFailure(
          'GET /systems/{systemId}/subsystems must return HTTP 200',
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
          'Subsystems response must be valid JSON',
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
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_RECURSIVE_PARAM,
      'No systems available in discovery cache; cannot test recursive parameter.',
    );
  }

  try {
    const url = new URL(
      `systems/${encodeURIComponent(systemId)}/subsystems`,
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
          'GET /systems/{systemId}/subsystems?recursive=true must return HTTP 200',
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
          'Recursive subsystems response must be valid JSON',
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

async function testRecursiveSearchSystems(ctx: TestContext) {
  const start = Date.now();
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_RECURSIVE_SEARCH_SYSTEMS,
      'No systems available in discovery cache; cannot test recursive search.',
    );
  }

  try {
    const url = new URL(
      `systems/${encodeURIComponent(systemId)}/subsystems`,
      ctx.baseUrl,
    );
    url.searchParams.set('recursive', 'true');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RECURSIVE_SEARCH_SYSTEMS,
        assertionFailure(
          'Recursive subsystems search must return HTTP 200',
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
        REQ_RECURSIVE_SEARCH_SYSTEMS,
        assertionFailure(
          'Recursive subsystems response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // The response should contain an items array (may be empty if no nested subsystems)
    if (!Array.isArray(body.items)) {
      return failResult(
        REQ_RECURSIVE_SEARCH_SYSTEMS,
        assertionFailure(
          'Recursive subsystems response must contain an items array',
          'items array',
          typeof body.items === 'undefined'
            ? 'missing items property'
            : `items is ${typeof body.items}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_RECURSIVE_SEARCH_SYSTEMS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_RECURSIVE_SEARCH_SYSTEMS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testRecursiveAssoc(ctx: TestContext) {
  const start = Date.now();
  const systemId = ctx.discoveryCache.systemId;
  if (!systemId) {
    return skipResult(
      REQ_RECURSIVE_ASSOC,
      'No systems available in discovery cache; cannot test subsystem parent association.',
    );
  }

  try {
    const url = new URL(
      `systems/${encodeURIComponent(systemId)}/subsystems`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_RECURSIVE_ASSOC,
        assertionFailure(
          'GET /systems/{systemId}/subsystems must return HTTP 200',
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
          'Subsystems response must be valid JSON',
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
        'No subsystems found; cannot verify parent association links.',
      );
    }

    // Check that the first subsystem has a link back to the parent system
    const firstSubsystem = items[0] as Record<string, unknown>;
    const links = firstSubsystem.links;
    if (!Array.isArray(links)) {
      return failResult(
        REQ_RECURSIVE_ASSOC,
        assertionFailure(
          'Subsystem must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    // REQ-TEST-CITE-002: OGC 23-001 /req/subsystem/recursive-assoc governs
    // recursive aggregation of associations on the parent (samplingFeatures,
    // datastreams, controlstreams) — it does NOT mandate rel="parent" or
    // rel="up" on subsystem resources. The parentSystem property exists per
    // clause 9 but is a resource property, not a link relation. Downgrade
    // missing parent-link relation from FAIL to SKIP-with-reason per GH #3
    // precedent.
    const hasParentLink = links.some(
      (l: Record<string, unknown>) =>
        l.rel === 'parent' || l.rel === 'up' ||
        (typeof l.href === 'string' && (l.href as string).includes(`/systems/${systemId}`)),
    );

    if (!hasParentLink) {
      return skipResult(
        REQ_RECURSIVE_ASSOC,
        'Subsystem has no rel="parent"/"up" link and no href pointing at the ' +
          'parent system, but OGC 23-001 /req/subsystem/recursive-assoc does ' +
          'not mandate such a link relation (it governs recursive aggregation ' +
          'of samplingFeatures/datastreams/controlstreams). Per ' +
          'REQ-TEST-CITE-002 and GH #3 precedent, absence is not FAIL.',
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

export const subsystemsTestModule: ConformanceClassTest = {
  classDefinition: subsystemsClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_COLLECTION, execute: testCollection },
      { requirement: REQ_RECURSIVE_PARAM, execute: testRecursiveParam },
      { requirement: REQ_RECURSIVE_SEARCH_SYSTEMS, execute: testRecursiveSearchSystems },
      { requirement: REQ_RECURSIVE_ASSOC, execute: testRecursiveAssoc },
    ];
  },
};
