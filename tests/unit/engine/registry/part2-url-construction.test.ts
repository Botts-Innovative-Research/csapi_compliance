// REQ-PART2-BASEURL-001 (SCENARIO-PART2-BASEURL-001): every Part 2 test
// module builds outbound URLs relative to the IUT's full base URL,
// preserving any path segments (e.g. /sensorhub/api/). Mechanical check
// for issue #5.
//
// If this test fails, audit the offending module for a leading-slash
// template literal (e.g. `new URL('/datastreams', ctx.baseUrl)`) — per
// WHATWG URL semantics, a leading slash drops the base path. Rewrite as
// a relative path ('datastreams') so the IUT-provided sub-path survives.

import { describe, it, expect, vi } from 'vitest';
import type {
  TestContext,
  DiscoveryCache,
  HttpResponse,
  HttpExchange,
} from '@/lib/types';

import { part2CommonTestModule } from '@/engine/registry/part2-common';
import { part2JsonTestModule } from '@/engine/registry/part2-json';
import { datastreamsTestModule } from '@/engine/registry/datastreams';
import { controlstreamsTestModule } from '@/engine/registry/controlstreams';
import { part2FeasibilityTestModule } from '@/engine/registry/part2-feasibility';
import { part2EventsTestModule } from '@/engine/registry/part2-events';
import { part2HistoryTestModule } from '@/engine/registry/part2-history';
import { part2FilteringTestModule } from '@/engine/registry/part2-filtering';
import { part2CrudTestModule } from '@/engine/registry/part2-crud';
import { part2UpdateTestModule } from '@/engine/registry/part2-update';
import {
  sweJsonTestModule,
  sweTextTestModule,
  sweBinaryTestModule,
} from '@/engine/registry/part2-swe-encodings';

const PART2_MODULES = [
  part2CommonTestModule,
  part2JsonTestModule,
  datastreamsTestModule,
  controlstreamsTestModule,
  part2FeasibilityTestModule,
  part2EventsTestModule,
  part2HistoryTestModule,
  part2FilteringTestModule,
  part2CrudTestModule,
  part2UpdateTestModule,
  sweJsonTestModule,
  sweTextTestModule,
  sweBinaryTestModule,
];

const IUT_BASE = 'https://example.com/path/segment/api/';

let exchangeCounter = 0;
function makeExchange(url: string): HttpExchange {
  return {
    id: `ex-${++exchangeCounter}`,
    request: { method: 'GET', url, headers: {} },
    response: { statusCode: 201, headers: {}, body: '', responseTimeMs: 1 },
    metadata: { truncated: false, binaryBody: false, bodySize: 0 },
  };
}

function makeResponse(
  url: string,
  overrides: Partial<HttpResponse> = {},
): HttpResponse {
  return {
    statusCode: 201,
    headers: {
      'content-type': 'application/json',
      // Location is a path relative to IUT base so re-resolution exercises
      // the same potential-drop bug.
      location: `${new URL('datastreams/created-123', IUT_BASE).toString()}`,
    },
    body: '{"items":[],"collections":[{"id":"datastreams","itemType":"datastream"}]}',
    responseTimeMs: 1,
    exchange: makeExchange(url),
    ...overrides,
  };
}

function makeDiscoveryCache(): DiscoveryCache {
  return {
    landingPage: {},
    conformsTo: [],
    collectionIds: ['datastreams'],
    links: [],
    systemId: 'sys-1',
    datastreamId: 'ds-1',
    controlStreamId: 'cs-1',
    observationId: 'obs-1',
  } as DiscoveryCache;
}

interface CapturedCall {
  method: string;
  url: string;
}

function makeCapturingContext(): { ctx: TestContext; calls: CapturedCall[] } {
  const calls: CapturedCall[] = [];
  const capture = (method: string) =>
    vi.fn(async (url: string) => {
      calls.push({ method, url });
      return makeResponse(url);
    });

  const ctx: TestContext = {
    httpClient: {
      request: vi.fn(),
      get: capture('GET'),
      post: capture('POST'),
      put: capture('PUT'),
      patch: capture('PATCH'),
      delete: capture('DELETE'),
    },
    schemaValidator: {
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
    },
    baseUrl: IUT_BASE,
    auth: { type: 'none' },
    config: { timeoutMs: 30_000, concurrency: 5 },
    discoveryCache: makeDiscoveryCache(),
    cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: vi.fn() },
  };
  return { ctx, calls };
}

describe('Part 2 modules preserve the IUT base path (REQ-PART2-BASEURL-001)', () => {
  for (const mod of PART2_MODULES) {
    it(`${mod.classDefinition.name} emits requests starting with the IUT base URL (SCENARIO-PART2-BASEURL-001)`, async () => {
      const { ctx, calls } = makeCapturingContext();
      const execs = mod.createTests(ctx);
      for (const exec of execs) {
        try {
          await exec.execute(ctx);
        } catch {
          // Tests may throw on synthetic responses; URL capture happens
          // eagerly before any failure, which is all we care about here.
        }
      }

      expect(
        calls.length,
        `${mod.classDefinition.name} produced no outbound requests; the mock likely isn't being exercised.`,
      ).toBeGreaterThan(0);

      const violations = calls.filter((c) => !c.url.startsWith(IUT_BASE));
      expect(
        violations,
        `${mod.classDefinition.name} dropped the IUT base path on these URLs:\n${violations
          .map((v) => `  ${v.method} ${v.url}`)
          .join('\n')}`,
      ).toEqual([]);
    });
  }
});
