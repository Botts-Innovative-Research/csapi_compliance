// S02-02: OGC API Features Part 1 Core conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core

import { PARENT_CONF } from '@/lib/constants';
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

const REQ_COLLECTIONS: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/collections',
  conformanceUri: '/conf/ogcapi-features/collections',
  name: 'Collections Endpoint',
  priority: 'MUST',
  description: 'Collections endpoint (GET /collections) returns HTTP 200 with a JSON response body.',
};

const REQ_COLLECTIONS_ARRAY: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/collections-array',
  conformanceUri: '/conf/ogcapi-features/collections-array',
  name: 'Collections Array',
  priority: 'MUST',
  description: 'Collections response body contains a collections array.',
};

const REQ_SINGLE_COLLECTION: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/single-collection',
  conformanceUri: '/conf/ogcapi-features/single-collection',
  name: 'Single Collection',
  priority: 'MUST',
  description: 'Single collection (GET /collections/{id}) returns HTTP 200 with required fields (id, links).',
};

const REQ_ITEMS: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/items',
  conformanceUri: '/conf/ogcapi-features/items',
  name: 'Items Endpoint',
  priority: 'MUST',
  description: 'Items endpoint (GET /collections/{id}/items) returns HTTP 200.',
};

const REQ_ITEMS_GEOJSON: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/items-geojson',
  conformanceUri: '/conf/ogcapi-features/items-geojson',
  name: 'Items GeoJSON FeatureCollection',
  priority: 'MUST',
  description: 'Items response is a valid GeoJSON FeatureCollection with type and features fields.',
};

const REQ_ITEMS_LIMIT: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/items-limit',
  conformanceUri: '/conf/ogcapi-features/items-limit',
  name: 'Items Limit Parameter',
  priority: 'MUST',
  description: 'Items endpoint supports the limit query parameter.',
};

const REQ_SINGLE_FEATURE: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/single-feature',
  conformanceUri: '/conf/ogcapi-features/single-feature',
  name: 'Single Feature',
  priority: 'MUST',
  description: 'Single feature (GET /collections/{id}/items/{featureId}) returns HTTP 200.',
};

const REQ_ITEMS_LINKS: RequirementDefinition = {
  requirementUri: '/req/ogcapi-features/items-links',
  conformanceUri: '/conf/ogcapi-features/items-links',
  name: 'Items Response Links',
  priority: 'MUST',
  description: 'Items response contains links (self, and next if paginated).',
};

// --- Conformance Class Definition ---

export const featuresCoreClassDef: ConformanceClassDefinition = {
  classUri: PARENT_CONF.FEATURES_CORE,
  name: 'OGC API Features - Core',
  standardPart: 'features',
  dependencies: [PARENT_CONF.COMMON_CORE],
  requirements: [
    REQ_COLLECTIONS,
    REQ_COLLECTIONS_ARRAY,
    REQ_SINGLE_COLLECTION,
    REQ_ITEMS,
    REQ_ITEMS_GEOJSON,
    REQ_ITEMS_LIMIT,
    REQ_SINGLE_FEATURE,
    REQ_ITEMS_LINKS,
  ],
  isWriteOperation: false,
};

// --- Helper ---

function getFirstCollectionId(ctx: TestContext): string | null {
  if (ctx.discoveryCache.collectionIds.length === 0) {
    return null;
  }
  return ctx.discoveryCache.collectionIds[0];
}

// --- Test Functions ---

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
          'Collections endpoint must return HTTP 200',
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
        REQ_COLLECTIONS,
        assertionFailure(
          'Collections endpoint must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
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

async function testCollectionsArray(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('/collections', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_COLLECTIONS_ARRAY,
        assertionFailure(
          'Collections endpoint must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.collections)) {
      return failResult(
        REQ_COLLECTIONS_ARRAY,
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

    return passResult(REQ_COLLECTIONS_ARRAY, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_COLLECTIONS_ARRAY,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSingleCollection(ctx: TestContext) {
  const start = Date.now();
  const collectionId = getFirstCollectionId(ctx);
  if (!collectionId) {
    return skipResult(
      REQ_SINGLE_COLLECTION,
      'No collections available in discovery cache; cannot test single collection endpoint.',
    );
  }

  try {
    const url = new URL(`/collections/${encodeURIComponent(collectionId)}`, ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SINGLE_COLLECTION,
        assertionFailure(
          'Single collection endpoint must return HTTP 200',
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
        REQ_SINGLE_COLLECTION,
        assertionFailure(
          'Single collection endpoint must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Check required fields: id and links
    const missingFields: string[] = [];
    if (typeof body.id === 'undefined') missingFields.push('id');
    if (!Array.isArray(body.links)) missingFields.push('links');

    if (missingFields.length > 0) {
      return failResult(
        REQ_SINGLE_COLLECTION,
        assertionFailure(
          'Single collection must contain required fields: id, links',
          'id, links',
          `missing: ${missingFields.join(', ')}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SINGLE_COLLECTION, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SINGLE_COLLECTION,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testItems(ctx: TestContext) {
  const start = Date.now();
  const collectionId = getFirstCollectionId(ctx);
  if (!collectionId) {
    return skipResult(
      REQ_ITEMS,
      'No collections available in discovery cache; cannot test items endpoint.',
    );
  }

  try {
    const url = new URL(
      `/collections/${encodeURIComponent(collectionId)}/items`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_ITEMS,
        assertionFailure(
          'Items endpoint must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_ITEMS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_ITEMS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testItemsGeoJson(ctx: TestContext) {
  const start = Date.now();
  const collectionId = getFirstCollectionId(ctx);
  if (!collectionId) {
    return skipResult(
      REQ_ITEMS_GEOJSON,
      'No collections available in discovery cache; cannot test items GeoJSON response.',
    );
  }

  try {
    const url = new URL(
      `/collections/${encodeURIComponent(collectionId)}/items`,
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
        REQ_ITEMS_GEOJSON,
        assertionFailure(
          'Items endpoint must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (body.type !== 'FeatureCollection') {
      return failResult(
        REQ_ITEMS_GEOJSON,
        assertionFailure(
          'Items response type must be "FeatureCollection"',
          'FeatureCollection',
          String(body.type ?? '(missing type property)'),
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.features)) {
      return failResult(
        REQ_ITEMS_GEOJSON,
        assertionFailure(
          'Items response must contain a features array',
          'features array',
          typeof body.features === 'undefined'
            ? 'missing features property'
            : `features is ${typeof body.features}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_ITEMS_GEOJSON, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_ITEMS_GEOJSON,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testItemsLimit(ctx: TestContext) {
  const start = Date.now();
  const collectionId = getFirstCollectionId(ctx);
  if (!collectionId) {
    return skipResult(
      REQ_ITEMS_LIMIT,
      'No collections available in discovery cache; cannot test limit parameter.',
    );
  }

  try {
    const url = new URL(
      `/collections/${encodeURIComponent(collectionId)}/items`,
      ctx.baseUrl,
    );
    url.searchParams.set('limit', '2');
    const response = await ctx.httpClient.get(url.toString());
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_ITEMS_LIMIT,
        assertionFailure(
          'Items endpoint with limit parameter must return HTTP 200',
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
        REQ_ITEMS_LIMIT,
        assertionFailure(
          'Items endpoint with limit must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    // If features are present, verify the limit is respected
    if (Array.isArray(body.features) && body.features.length > 2) {
      return failResult(
        REQ_ITEMS_LIMIT,
        assertionFailure(
          'Items response must respect the limit parameter',
          'at most 2 features',
          `${body.features.length} features returned`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_ITEMS_LIMIT, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_ITEMS_LIMIT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSingleFeature(ctx: TestContext) {
  const start = Date.now();
  const collectionId = getFirstCollectionId(ctx);
  if (!collectionId) {
    return skipResult(
      REQ_SINGLE_FEATURE,
      'No collections available in discovery cache; cannot test single feature endpoint.',
    );
  }

  try {
    // First get items to find a feature ID
    const itemsUrl = new URL(
      `/collections/${encodeURIComponent(collectionId)}/items`,
      ctx.baseUrl,
    );
    itemsUrl.searchParams.set('limit', '1');
    const itemsResponse = await ctx.httpClient.get(itemsUrl.toString());
    const exchangeIds = [itemsResponse.exchange.id];

    let itemsBody: Record<string, unknown>;
    try {
      itemsBody = JSON.parse(itemsResponse.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_SINGLE_FEATURE,
        'Could not parse items response to discover a feature ID.',
        exchangeIds,
        Date.now() - start,
      );
    }

    const features = itemsBody.features;
    if (!Array.isArray(features) || features.length === 0) {
      return skipResult(
        REQ_SINGLE_FEATURE,
        'No features available in the collection; cannot test single feature endpoint.',
      );
    }

    const featureId = (features[0] as Record<string, unknown>).id;
    if (featureId === undefined || featureId === null) {
      return skipResult(
        REQ_SINGLE_FEATURE,
        'First feature has no id property; cannot test single feature endpoint.',
      );
    }

    const featureUrl = new URL(
      `/collections/${encodeURIComponent(collectionId)}/items/${encodeURIComponent(String(featureId))}`,
      ctx.baseUrl,
    ).toString();
    const featureResponse = await ctx.httpClient.get(featureUrl);
    exchangeIds.push(featureResponse.exchange.id);
    const durationMs = Date.now() - start;

    if (featureResponse.statusCode !== 200) {
      return failResult(
        REQ_SINGLE_FEATURE,
        assertionFailure(
          'Single feature endpoint must return HTTP 200',
          '200',
          String(featureResponse.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SINGLE_FEATURE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SINGLE_FEATURE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testItemsLinks(ctx: TestContext) {
  const start = Date.now();
  const collectionId = getFirstCollectionId(ctx);
  if (!collectionId) {
    return skipResult(
      REQ_ITEMS_LINKS,
      'No collections available in discovery cache; cannot test items links.',
    );
  }

  try {
    const url = new URL(
      `/collections/${encodeURIComponent(collectionId)}/items`,
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
        REQ_ITEMS_LINKS,
        assertionFailure(
          'Items endpoint must return valid JSON',
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
        REQ_ITEMS_LINKS,
        assertionFailure(
          'Items response must contain a links array',
          'links array',
          typeof links === 'undefined'
            ? 'missing links property'
            : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    const foundRels = new Set(links.map((l: Record<string, unknown>) => l.rel));
    if (!foundRels.has('self')) {
      return failResult(
        REQ_ITEMS_LINKS,
        assertionFailure(
          'Items response links must include a self link',
          'link with rel="self"',
          'no self link found',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_ITEMS_LINKS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_ITEMS_LINKS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const featuresCoreTestModule: ConformanceClassTest = {
  classDefinition: featuresCoreClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_COLLECTIONS, execute: testCollections },
      { requirement: REQ_COLLECTIONS_ARRAY, execute: testCollectionsArray },
      { requirement: REQ_SINGLE_COLLECTION, execute: testSingleCollection },
      { requirement: REQ_ITEMS, execute: testItems },
      { requirement: REQ_ITEMS_GEOJSON, execute: testItemsGeoJson },
      { requirement: REQ_ITEMS_LIMIT, execute: testItemsLimit },
      { requirement: REQ_SINGLE_FEATURE, execute: testSingleFeature },
      { requirement: REQ_ITEMS_LINKS, execute: testItemsLinks },
    ];
  },
};
