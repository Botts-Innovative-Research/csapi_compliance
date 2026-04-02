// S02-01: OGC API Common Part 1 Core conformance class test module.
// Conformance class: http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core

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

const REQ_LANDING_PAGE: RequirementDefinition = {
  requirementUri: '/req/ogcapi-common/landing-page',
  conformanceUri: '/conf/ogcapi-common/landing-page',
  name: 'Landing Page Response',
  priority: 'MUST',
  description: 'Landing page (GET /) returns HTTP 200 with a JSON response body.',
};

const REQ_LANDING_PAGE_LINKS: RequirementDefinition = {
  requirementUri: '/req/ogcapi-common/landing-page-links',
  conformanceUri: '/conf/ogcapi-common/landing-page-links',
  name: 'Landing Page Required Links',
  priority: 'MUST',
  description: 'Landing page has required links: self, service-desc, conformance.',
};

const REQ_CONFORMANCE_ENDPOINT: RequirementDefinition = {
  requirementUri: '/req/ogcapi-common/conformance',
  conformanceUri: '/conf/ogcapi-common/conformance',
  name: 'Conformance Endpoint',
  priority: 'MUST',
  description: 'Conformance endpoint (GET /conformance) returns HTTP 200 with a JSON response body.',
};

const REQ_CONFORMANCE_CONFORMS_TO: RequirementDefinition = {
  requirementUri: '/req/ogcapi-common/conformance-conformsTo',
  conformanceUri: '/conf/ogcapi-common/conformance-conformsTo',
  name: 'Conformance conformsTo Array',
  priority: 'MUST',
  description: 'Conformance response body contains a conformsTo array.',
};

const REQ_API_DEFINITION: RequirementDefinition = {
  requirementUri: '/req/ogcapi-common/api-definition',
  conformanceUri: '/conf/ogcapi-common/api-definition',
  name: 'API Definition Link',
  priority: 'MUST',
  description: 'The service-desc link on the landing page returns a valid API definition document.',
};

const REQ_JSON_CONTENT_TYPE: RequirementDefinition = {
  requirementUri: '/req/ogcapi-common/json-content-type',
  conformanceUri: '/conf/ogcapi-common/json-content-type',
  name: 'JSON Content-Type Header',
  priority: 'MUST',
  description: 'JSON responses include a Content-Type header of application/json.',
};

// --- Conformance Class Definition ---

export const commonClassDef: ConformanceClassDefinition = {
  classUri: PARENT_CONF.COMMON_CORE,
  name: 'OGC API Common - Core',
  standardPart: 'common',
  dependencies: [],
  requirements: [
    REQ_LANDING_PAGE,
    REQ_LANDING_PAGE_LINKS,
    REQ_CONFORMANCE_ENDPOINT,
    REQ_CONFORMANCE_CONFORMS_TO,
    REQ_API_DEFINITION,
    REQ_JSON_CONTENT_TYPE,
  ],
  isWriteOperation: false,
};

// --- Test Functions ---

async function testLandingPage(ctx: TestContext) {
  const start = Date.now();
  try {
    const response = await ctx.httpClient.get(ctx.baseUrl);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_LANDING_PAGE,
        assertionFailure(
          'Landing page must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Verify response body is valid JSON
    try {
      JSON.parse(response.body);
    } catch {
      return failResult(
        REQ_LANDING_PAGE,
        assertionFailure(
          'Landing page must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_LANDING_PAGE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_LANDING_PAGE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testLandingPageLinks(ctx: TestContext) {
  const start = Date.now();
  try {
    const response = await ctx.httpClient.get(ctx.baseUrl);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_LANDING_PAGE_LINKS,
        assertionFailure(
          'Landing page must return valid JSON',
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
        REQ_LANDING_PAGE_LINKS,
        assertionFailure(
          'Landing page must contain a links array',
          'links array',
          typeof links === 'undefined' ? 'missing links property' : `links is ${typeof links}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    const requiredRels = ['self', 'service-desc', 'conformance'];
    const foundRels = new Set(links.map((l: Record<string, unknown>) => l.rel));
    const missingRels = requiredRels.filter((r) => !foundRels.has(r));

    if (missingRels.length > 0) {
      return failResult(
        REQ_LANDING_PAGE_LINKS,
        assertionFailure(
          'Landing page must contain links with rel: self, service-desc, conformance',
          requiredRels.join(', '),
          `missing: ${missingRels.join(', ')}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_LANDING_PAGE_LINKS, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_LANDING_PAGE_LINKS,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testConformanceEndpoint(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('conformance', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode !== 200) {
      return failResult(
        REQ_CONFORMANCE_ENDPOINT,
        assertionFailure(
          'Conformance endpoint must return HTTP 200',
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
        REQ_CONFORMANCE_ENDPOINT,
        assertionFailure(
          'Conformance endpoint must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_CONFORMANCE_ENDPOINT, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_CONFORMANCE_ENDPOINT,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testConformanceConformsTo(ctx: TestContext) {
  const start = Date.now();
  try {
    const url = new URL('conformance', ctx.baseUrl).toString();
    const response = await ctx.httpClient.get(url);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_CONFORMANCE_CONFORMS_TO,
        assertionFailure(
          'Conformance endpoint must return valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!Array.isArray(body.conformsTo)) {
      return failResult(
        REQ_CONFORMANCE_CONFORMS_TO,
        assertionFailure(
          'Conformance response must contain a conformsTo array',
          'conformsTo array',
          typeof body.conformsTo === 'undefined'
            ? 'missing conformsTo property'
            : `conformsTo is ${typeof body.conformsTo}`,
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_CONFORMANCE_CONFORMS_TO, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_CONFORMANCE_CONFORMS_TO,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testApiDefinition(ctx: TestContext) {
  const start = Date.now();
  try {
    // First, find the service-desc link from the landing page
    const landingResponse = await ctx.httpClient.get(ctx.baseUrl);
    const exchangeIds = [landingResponse.exchange.id];

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(landingResponse.body) as Record<string, unknown>;
    } catch {
      return failResult(
        REQ_API_DEFINITION,
        'Landing page did not return valid JSON; cannot locate service-desc link.',
        exchangeIds,
        Date.now() - start,
      );
    }

    const links = body.links;
    if (!Array.isArray(links)) {
      return failResult(
        REQ_API_DEFINITION,
        'Landing page does not contain a links array; cannot locate service-desc link.',
        exchangeIds,
        Date.now() - start,
      );
    }

    const serviceDescLink = links.find(
      (l: Record<string, unknown>) => l.rel === 'service-desc',
    );
    if (!serviceDescLink || !serviceDescLink.href) {
      return failResult(
        REQ_API_DEFINITION,
        assertionFailure(
          'Landing page must include a service-desc link',
          'link with rel="service-desc"',
          'no service-desc link found',
        ),
        exchangeIds,
        Date.now() - start,
      );
    }

    // Resolve relative URL against base
    const apiDefUrl = new URL(serviceDescLink.href as string, ctx.baseUrl).toString();
    const apiResponse = await ctx.httpClient.get(apiDefUrl);
    exchangeIds.push(apiResponse.exchange.id);
    const durationMs = Date.now() - start;

    if (apiResponse.statusCode !== 200) {
      return failResult(
        REQ_API_DEFINITION,
        assertionFailure(
          'API definition endpoint must return HTTP 200',
          '200',
          String(apiResponse.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Verify the body is non-empty (valid document)
    if (!apiResponse.body || apiResponse.body.trim().length === 0) {
      return failResult(
        REQ_API_DEFINITION,
        assertionFailure(
          'API definition must return a non-empty document',
          'non-empty response body',
          'empty response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_API_DEFINITION, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_API_DEFINITION,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testJsonContentType(ctx: TestContext) {
  const start = Date.now();
  try {
    const response = await ctx.httpClient.get(ctx.baseUrl);
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json')) {
      return failResult(
        REQ_JSON_CONTENT_TYPE,
        assertionFailure(
          'JSON responses must include Content-Type: application/json',
          'application/json',
          contentType || '(no Content-Type header)',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_JSON_CONTENT_TYPE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_JSON_CONTENT_TYPE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

// --- Test Module Export ---

export const commonTestModule: ConformanceClassTest = {
  classDefinition: commonClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_LANDING_PAGE, execute: testLandingPage },
      { requirement: REQ_LANDING_PAGE_LINKS, execute: testLandingPageLinks },
      { requirement: REQ_CONFORMANCE_ENDPOINT, execute: testConformanceEndpoint },
      { requirement: REQ_CONFORMANCE_CONFORMS_TO, execute: testConformanceConformsTo },
      { requirement: REQ_API_DEFINITION, execute: testApiDefinition },
      { requirement: REQ_JSON_CONTENT_TYPE, execute: testJsonContentType },
    ];
  },
};
