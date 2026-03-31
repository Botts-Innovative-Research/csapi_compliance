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
  requirementUri: '/req/subsystem/collection',
  conformanceUri: '/conf/subsystem/collection',
  name: 'Subsystems Collection',
  priority: 'MUST',
  description: 'GET /systems/{systemId}/subsystems returns HTTP 200.',
};

const REQ_RECURSIVE_PARAM: RequirementDefinition = {
  requirementUri: '/req/subsystem/recursive-param',
  conformanceUri: '/conf/subsystem/recursive-param',
  name: 'Subsystems Recursive Parameter',
  priority: 'MUST',
  description: 'Subsystems endpoint supports recursive=true query parameter.',
};

const REQ_RECURSIVE_SEARCH_SYSTEMS: RequirementDefinition = {
  requirementUri: '/req/subsystem/recursive-search-systems',
  conformanceUri: '/conf/subsystem/recursive-search-systems',
  name: 'Subsystems Recursive Search',
  priority: 'MUST',
  description: 'Recursive search returns nested subsystem results.',
};

const REQ_RECURSIVE_ASSOC: RequirementDefinition = {
  requirementUri: '/req/subsystem/recursive-assoc',
  conformanceUri: '/conf/subsystem/recursive-assoc',
  name: 'Subsystem Parent Association',
  priority: 'MUST',
  description: 'Subsystem links back to parent system.',
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
      `/systems/${encodeURIComponent(systemId)}/subsystems`,
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
      `/systems/${encodeURIComponent(systemId)}/subsystems`,
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
      `/systems/${encodeURIComponent(systemId)}/subsystems`,
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
      `/systems/${encodeURIComponent(systemId)}/subsystems`,
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

    const hasParentLink = links.some(
      (l: Record<string, unknown>) =>
        l.rel === 'parent' || l.rel === 'up' ||
        (typeof l.href === 'string' && (l.href as string).includes(`/systems/${systemId}`)),
    );

    if (!hasParentLink) {
      return failResult(
        REQ_RECURSIVE_ASSOC,
        assertionFailure(
          'Subsystem must link back to parent system',
          'link with rel="parent" or rel="up" referencing parent system',
          'no parent association link found',
        ),
        exchangeIds,
        durationMs,
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
