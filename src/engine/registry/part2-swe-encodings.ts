// S09-07: SWE Common Encodings conformance class test modules (Part 2).
// Three conformance classes in one file: SWE JSON, SWE Text, SWE Binary.

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

// ============================================================
// SWE Common JSON
// ============================================================

const REQ_SWE_JSON_MEDIATYPE: RequirementDefinition = {
  requirementUri: '/req/swecommon-json/mediatype',
  conformanceUri: '/conf/swecommon-json/mediatype',
  name: 'SWE Common JSON Media Type',
  priority: 'MUST',
  description:
    'Accept: application/swe+json returns correct Content-Type.',
};

const REQ_SWE_JSON_SCHEMA: RequirementDefinition = {
  requirementUri: '/req/swecommon-json/schema',
  conformanceUri: '/conf/swecommon-json/schema',
  name: 'SWE Common JSON Schema',
  priority: 'MUST',
  description: 'Response has valid SWE Common JSON structure.',
};

export const sweJsonClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.SWE_JSON,
  name: 'SWE Common JSON',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.DATASTREAM],
  requirements: [REQ_SWE_JSON_MEDIATYPE, REQ_SWE_JSON_SCHEMA],
  isWriteOperation: false,
};

async function testSweJsonMediaType(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_SWE_JSON_MEDIATYPE,
      'No datastreams available on the server',
    );
  }

  try {
    const datastreamId = ctx.discoveryCache.datastreamId;
    const url = new URL(
      `datastreams/${datastreamId}/observations`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url, {
      Accept: 'application/swe+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    // If server returns 406, SWE JSON is not supported
    if (response.statusCode === 406) {
      return skipResult(
        REQ_SWE_JSON_MEDIATYPE,
        'Server returned 406 Not Acceptable for application/swe+json (not supported)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SWE_JSON_MEDIATYPE,
        assertionFailure(
          'GET with Accept: application/swe+json must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/swe+json')) {
      return failResult(
        REQ_SWE_JSON_MEDIATYPE,
        assertionFailure(
          'Response Content-Type must include application/swe+json',
          'application/swe+json',
          contentType || '(no Content-Type header)',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SWE_JSON_MEDIATYPE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SWE_JSON_MEDIATYPE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSweJsonSchema(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_SWE_JSON_SCHEMA,
      'No datastreams available on the server',
    );
  }

  try {
    const datastreamId = ctx.discoveryCache.datastreamId;
    const url = new URL(
      `datastreams/${datastreamId}/observations`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url, {
      Accept: 'application/swe+json',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    // If server returns 406, SWE JSON is not supported
    if (response.statusCode === 406) {
      return skipResult(
        REQ_SWE_JSON_SCHEMA,
        'Server returned 406 Not Acceptable for application/swe+json (not supported)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SWE_JSON_SCHEMA,
        assertionFailure(
          'GET with Accept: application/swe+json must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    // Validate the body is valid JSON
    try {
      JSON.parse(response.body);
    } catch {
      return failResult(
        REQ_SWE_JSON_SCHEMA,
        assertionFailure(
          'SWE Common JSON response must be valid JSON',
          'valid JSON body',
          'non-JSON response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SWE_JSON_SCHEMA, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SWE_JSON_SCHEMA,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

export const sweJsonTestModule: ConformanceClassTest = {
  classDefinition: sweJsonClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_SWE_JSON_MEDIATYPE, execute: testSweJsonMediaType },
      { requirement: REQ_SWE_JSON_SCHEMA, execute: testSweJsonSchema },
    ];
  },
};

// ============================================================
// SWE Common Text
// ============================================================

const REQ_SWE_TEXT_MEDIATYPE: RequirementDefinition = {
  requirementUri: '/req/swecommon-text/mediatype',
  conformanceUri: '/conf/swecommon-text/mediatype',
  name: 'SWE Common Text Media Type',
  priority: 'MUST',
  description:
    'Accept: application/swe+text returns correct Content-Type.',
};

const REQ_SWE_TEXT_NON_EMPTY: RequirementDefinition = {
  requirementUri: '/req/swecommon-text/non-empty',
  conformanceUri: '/conf/swecommon-text/non-empty',
  name: 'SWE Common Text Non-Empty',
  priority: 'MUST',
  description: 'Response body is non-empty.',
};

export const sweTextClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.SWE_TEXT,
  name: 'SWE Common Text',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.DATASTREAM],
  requirements: [REQ_SWE_TEXT_MEDIATYPE, REQ_SWE_TEXT_NON_EMPTY],
  isWriteOperation: false,
};

async function testSweTextMediaType(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_SWE_TEXT_MEDIATYPE,
      'No datastreams available on the server',
    );
  }

  try {
    const datastreamId = ctx.discoveryCache.datastreamId;
    const url = new URL(
      `datastreams/${datastreamId}/observations`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url, {
      Accept: 'application/swe+text',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode === 406) {
      return skipResult(
        REQ_SWE_TEXT_MEDIATYPE,
        'Server returned 406 Not Acceptable for application/swe+text (not supported)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SWE_TEXT_MEDIATYPE,
        assertionFailure(
          'GET with Accept: application/swe+text must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/swe+text')) {
      return failResult(
        REQ_SWE_TEXT_MEDIATYPE,
        assertionFailure(
          'Response Content-Type must include application/swe+text',
          'application/swe+text',
          contentType || '(no Content-Type header)',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SWE_TEXT_MEDIATYPE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SWE_TEXT_MEDIATYPE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSweTextNonEmpty(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_SWE_TEXT_NON_EMPTY,
      'No datastreams available on the server',
    );
  }

  try {
    const datastreamId = ctx.discoveryCache.datastreamId;
    const url = new URL(
      `datastreams/${datastreamId}/observations`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url, {
      Accept: 'application/swe+text',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode === 406) {
      return skipResult(
        REQ_SWE_TEXT_NON_EMPTY,
        'Server returned 406 Not Acceptable for application/swe+text (not supported)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SWE_TEXT_NON_EMPTY,
        assertionFailure(
          'GET with Accept: application/swe+text must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!response.body || response.body.trim().length === 0) {
      return failResult(
        REQ_SWE_TEXT_NON_EMPTY,
        assertionFailure(
          'SWE Common Text response body must be non-empty',
          'non-empty response body',
          'empty response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SWE_TEXT_NON_EMPTY, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SWE_TEXT_NON_EMPTY,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

export const sweTextTestModule: ConformanceClassTest = {
  classDefinition: sweTextClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      { requirement: REQ_SWE_TEXT_MEDIATYPE, execute: testSweTextMediaType },
      { requirement: REQ_SWE_TEXT_NON_EMPTY, execute: testSweTextNonEmpty },
    ];
  },
};

// ============================================================
// SWE Common Binary
// ============================================================

const REQ_SWE_BINARY_MEDIATYPE: RequirementDefinition = {
  requirementUri: '/req/swecommon-binary/mediatype',
  conformanceUri: '/conf/swecommon-binary/mediatype',
  name: 'SWE Common Binary Media Type',
  priority: 'MUST',
  description:
    'Accept: application/swe+binary returns correct Content-Type.',
};

const REQ_SWE_BINARY_NON_EMPTY: RequirementDefinition = {
  requirementUri: '/req/swecommon-binary/non-empty',
  conformanceUri: '/conf/swecommon-binary/non-empty',
  name: 'SWE Common Binary Non-Empty',
  priority: 'MUST',
  description: 'Response body is non-empty.',
};

export const sweBinaryClassDef: ConformanceClassDefinition = {
  classUri: CS_PART2_CONF.SWE_BINARY,
  name: 'SWE Common Binary',
  standardPart: 'cs-part2',
  dependencies: [CS_PART2_CONF.DATASTREAM],
  requirements: [REQ_SWE_BINARY_MEDIATYPE, REQ_SWE_BINARY_NON_EMPTY],
  isWriteOperation: false,
};

async function testSweBinaryMediaType(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_SWE_BINARY_MEDIATYPE,
      'No datastreams available on the server',
    );
  }

  try {
    const datastreamId = ctx.discoveryCache.datastreamId;
    const url = new URL(
      `datastreams/${datastreamId}/observations`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url, {
      Accept: 'application/swe+binary',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode === 406) {
      return skipResult(
        REQ_SWE_BINARY_MEDIATYPE,
        'Server returned 406 Not Acceptable for application/swe+binary (not supported)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SWE_BINARY_MEDIATYPE,
        assertionFailure(
          'GET with Accept: application/swe+binary must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/swe+binary')) {
      return failResult(
        REQ_SWE_BINARY_MEDIATYPE,
        assertionFailure(
          'Response Content-Type must include application/swe+binary',
          'application/swe+binary',
          contentType || '(no Content-Type header)',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SWE_BINARY_MEDIATYPE, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SWE_BINARY_MEDIATYPE,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

async function testSweBinaryNonEmpty(ctx: TestContext) {
  const start = Date.now();

  if (!ctx.discoveryCache.datastreamId) {
    return skipResult(
      REQ_SWE_BINARY_NON_EMPTY,
      'No datastreams available on the server',
    );
  }

  try {
    const datastreamId = ctx.discoveryCache.datastreamId;
    const url = new URL(
      `datastreams/${datastreamId}/observations`,
      ctx.baseUrl,
    ).toString();
    const response = await ctx.httpClient.get(url, {
      Accept: 'application/swe+binary',
    });
    const durationMs = Date.now() - start;
    const exchangeIds = [response.exchange.id];

    if (response.statusCode === 406) {
      return skipResult(
        REQ_SWE_BINARY_NON_EMPTY,
        'Server returned 406 Not Acceptable for application/swe+binary (not supported)',
      );
    }

    if (response.statusCode !== 200) {
      return failResult(
        REQ_SWE_BINARY_NON_EMPTY,
        assertionFailure(
          'GET with Accept: application/swe+binary must return HTTP 200',
          '200',
          String(response.statusCode),
        ),
        exchangeIds,
        durationMs,
      );
    }

    if (!response.body || response.body.length === 0) {
      return failResult(
        REQ_SWE_BINARY_NON_EMPTY,
        assertionFailure(
          'SWE Common Binary response body must be non-empty',
          'non-empty response body',
          'empty response body',
        ),
        exchangeIds,
        durationMs,
      );
    }

    return passResult(REQ_SWE_BINARY_NON_EMPTY, exchangeIds, durationMs);
  } catch (error) {
    return failResult(
      REQ_SWE_BINARY_NON_EMPTY,
      `Request failed: ${error instanceof Error ? error.message : String(error)}`,
      [],
      Date.now() - start,
    );
  }
}

export const sweBinaryTestModule: ConformanceClassTest = {
  classDefinition: sweBinaryClassDef,
  createTests(_ctx: TestContext): ExecutableTest[] {
    return [
      {
        requirement: REQ_SWE_BINARY_MEDIATYPE,
        execute: testSweBinaryMediaType,
      },
      {
        requirement: REQ_SWE_BINARY_NON_EMPTY,
        execute: testSweBinaryNonEmpty,
      },
    ];
  },
};
