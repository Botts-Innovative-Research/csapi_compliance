// Tests for DiscoveryService — src/engine/discovery-service.ts
// REQ-DISC-001 through REQ-DISC-006: Endpoint discovery
// SCENARIO-DISC-FLOW-001: Fetch landing page (CRITICAL)
// SCENARIO-DISC-FLOW-002: Parse conformance declaration (CRITICAL)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AuthConfig, RunConfig } from '@/lib/types.js';
import { CS_PART1_CONF, CS_PART2_CONF, PARENT_CONF } from '@/lib/constants.js';

// --- Mocks ---

// Mock the SSRF guard (required by CaptureHttpClient)
const mockValidateUrl = vi.fn<(url: string) => Promise<void>>();
vi.mock('@/server/middleware/ssrf-guard.js', () => ({
  validateUrl: (url: string) => mockValidateUrl(url),
}));

// Mock global fetch
const mockFetch = vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>();
vi.stubGlobal('fetch', mockFetch);

// Import after mocking
import { DiscoveryService, DiscoveryError } from '@/engine/discovery-service.js';

// --- Helpers ---

const noAuth: AuthConfig = { type: 'none' };
const defaultConfig: RunConfig = { timeoutMs: 30_000, concurrency: 5 };
const BASE_URL = 'http://example.com/csapi';

/** Create a mock Response object. */
function mockResponse(opts: {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}): Response {
  const status = opts.status ?? 200;
  const headers = new Headers(opts.headers ?? { 'content-type': 'application/json' });
  const body = opts.body ?? '{}';

  return {
    status,
    headers,
    ok: status >= 200 && status < 300,
    text: vi.fn().mockResolvedValue(body),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(Buffer.byteLength(body))),
  } as unknown as Response;
}

/** Standard landing page JSON with links. */
function landingPageJson(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    title: 'Test CS API',
    links: [
      {
        rel: 'conformance',
        href: '/conformance',
        type: 'application/json',
        title: 'Conformance',
      },
      {
        rel: 'service-desc',
        href: '/api',
        type: 'application/vnd.oai.openapi+json;version=3.0',
        title: 'API Definition',
      },
      {
        rel: 'data',
        href: '/collections',
        type: 'application/json',
        title: 'Collections',
      },
    ],
    ...overrides,
  });
}

/** Standard conformance JSON. */
function conformanceJson(conformsTo?: string[]): string {
  return JSON.stringify({
    conformsTo: conformsTo ?? [
      CS_PART1_CONF.CORE,
      CS_PART1_CONF.SYSTEM,
      CS_PART1_CONF.DEPLOYMENT,
    ],
  });
}

/**
 * Set up mockFetch to respond differently based on the URL.
 * Returns a map-like function configured with URL -> Response mappings.
 */
function setupFetchResponses(
  responses: Record<string, Response>,
  defaultResponse?: Response,
): void {
  // Sort patterns by length descending so more specific patterns match first.
  // e.g., "/systems?limit=1" matches before "/csapi".
  const sortedEntries = Object.entries(responses).sort(
    ([a], [b]) => b.length - a.length,
  );
  mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const [pattern, response] of sortedEntries) {
      if (url.includes(pattern)) {
        return response;
      }
    }
    return defaultResponse ?? mockResponse({ status: 404, body: '{"error":"not found"}' });
  });
}

describe('DiscoveryService', () => {
  let service: DiscoveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateUrl.mockResolvedValue(undefined);
    service = new DiscoveryService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Successful full discovery ---

  describe('successful discovery', () => {
    it('fetches landing page, conformance, and returns populated result', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson() }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      // Landing page data is cached
      expect(result.cache.landingPage).toBeDefined();
      expect(result.cache.landingPage.title).toBe('Test CS API');

      // conformsTo is extracted
      expect(result.cache.conformsTo).toEqual([
        CS_PART1_CONF.CORE,
        CS_PART1_CONF.SYSTEM,
        CS_PART1_CONF.DEPLOYMENT,
      ]);

      // Links are parsed
      expect(result.cache.links).toHaveLength(3);
      expect(result.cache.links[0].rel).toBe('conformance');

      // Declared classes are mapped
      expect(result.declaredClasses).toHaveLength(3);
      expect(result.declaredClasses[0].name).toBe('Core');
      expect(result.declaredClasses[1].name).toBe('System Features');
      expect(result.declaredClasses[2].name).toBe('Deployment Features');

      // Exchanges are captured
      expect(result.exchanges.size).toBeGreaterThanOrEqual(2);
    });

    it('extracts API definition URL from service-desc link', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson() }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      expect(result.cache.apiDefinitionUrl).toContain('/api');
    });
  });

  // --- URL normalization ---

  describe('URL normalization', () => {
    it('strips trailing slash from base URL', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson([CS_PART1_CONF.CORE]) }),
      });

      const result = await service.discover(
        'http://example.com/csapi/',
        noAuth,
        defaultConfig,
      );

      // Verify the landing page fetch used the normalized URL
      const firstCallUrl = mockFetch.mock.calls[0][0] as string;
      expect(firstCallUrl).toBe('http://example.com/csapi');

      expect(result.cache.conformsTo).toContain(CS_PART1_CONF.CORE);
    });

    it('strips multiple trailing slashes from base URL', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson([CS_PART1_CONF.CORE]) }),
      });

      await service.discover('http://example.com/csapi///', noAuth, defaultConfig);

      const firstCallUrl = mockFetch.mock.calls[0][0] as string;
      expect(firstCallUrl).toBe('http://example.com/csapi');
    });
  });

  // --- Conformance link discovery ---

  describe('conformance link discovery', () => {
    it('finds conformance link via rel="conformance"', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson() }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.conformsTo).toHaveLength(3);
    });

    it('finds conformance link via OGC rel URI', async () => {
      const lp = JSON.stringify({
        title: 'Test',
        links: [
          {
            rel: 'http://www.opengis.net/def/rel/ogc/1.0/conformance',
            href: '/conformance',
            type: 'application/json',
          },
        ],
      });
      setupFetchResponses({
        '/csapi': mockResponse({ body: lp }),
        '/conformance': mockResponse({ body: conformanceJson() }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.conformsTo).toHaveLength(3);
    });

    it('falls back to /conformance when links array is missing', async () => {
      const lpNoLinks = JSON.stringify({ title: 'Test' });
      setupFetchResponses({
        '/csapi': mockResponse({ body: lpNoLinks }),
        '/conformance': mockResponse({ body: conformanceJson() }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.conformsTo).toHaveLength(3);
    });

    it('falls back to /conformance when no conformance link exists', async () => {
      const lpOtherLinks = JSON.stringify({
        title: 'Test',
        links: [
          { rel: 'self', href: '/csapi', type: 'application/json' },
        ],
      });
      setupFetchResponses({
        '/csapi': mockResponse({ body: lpOtherLinks }),
        '/conformance': mockResponse({ body: conformanceJson() }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.conformsTo).toHaveLength(3);
    });

    it('resolves relative URLs in links against the base URL', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson([CS_PART1_CONF.CORE]) }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      // The conformance link href="/conformance" should be resolved to absolute
      const confLink = result.cache.links.find((l) => l.rel === 'conformance');
      expect(confLink).toBeDefined();
      expect(confLink!.href).toMatch(/^http:\/\//);
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('throws DiscoveryError for non-JSON landing page body even with non-JSON content type', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          headers: { 'content-type': 'text/html' },
          body: '<html></html>',
        }),
      );

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(DiscoveryError);

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(/not valid JSON/);
    });

    it('throws DiscoveryError for non-200 landing page status', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          status: 404,
          body: '{"error":"not found"}',
        }),
      );

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(DiscoveryError);

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(/HTTP 404/);
    });

    it('throws DiscoveryError when landing page body is not valid JSON', async () => {
      mockFetch.mockResolvedValue(
        mockResponse({
          body: 'this is not json {{{',
        }),
      );

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(DiscoveryError);

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(/not valid JSON/);
    });

    it('throws DiscoveryError when conformance endpoint returns non-200', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ status: 500, body: '{"error":"server error"}' }),
      });

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(DiscoveryError);

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(/HTTP 500/);
    });

    it('throws DiscoveryError when conformance response is not valid JSON', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: 'not-json' }),
      });

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(DiscoveryError);

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(/not valid JSON/);
    });

    it('throws DiscoveryError when conformsTo array is missing', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: '{"otherKey":"value"}' }),
      });

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(DiscoveryError);

      await expect(
        service.discover(BASE_URL, noAuth, defaultConfig),
      ).rejects.toThrow(/conformsTo/);
    });
  });

  // --- Conformance class mapping ---

  describe('conformance class mapping', () => {
    it('maps known CS API Part 1 URIs correctly', async () => {
      const part1Uris = [
        CS_PART1_CONF.CORE,
        CS_PART1_CONF.SYSTEM,
        CS_PART1_CONF.DEPLOYMENT,
        CS_PART1_CONF.PROCEDURE,
      ];
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson(part1Uris) }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      expect(result.declaredClasses).toHaveLength(4);
      for (const cls of result.declaredClasses) {
        expect(cls.standardPart).toBe('cs-part1');
        expect(cls.supported).toBe(true);
      }
    });

    it('maps known CS API Part 2 URIs correctly', async () => {
      const part2Uris = [
        CS_PART2_CONF.DATASTREAM,
        CS_PART2_CONF.CONTROLSTREAM,
        CS_PART2_CONF.JSON,
      ];
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson(part2Uris) }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      expect(result.declaredClasses).toHaveLength(3);
      for (const cls of result.declaredClasses) {
        expect(cls.standardPart).toBe('cs-part2');
        expect(cls.supported).toBe(true);
      }
    });

    it('maps parent standard URIs correctly', async () => {
      const parentUris = [PARENT_CONF.COMMON_CORE, PARENT_CONF.FEATURES_CORE];
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson(parentUris) }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      expect(result.declaredClasses).toHaveLength(2);
      expect(result.declaredClasses[0].standardPart).toBe('ogcapi-common');
      expect(result.declaredClasses[1].standardPart).toBe('ogcapi-features');
      for (const cls of result.declaredClasses) {
        expect(cls.supported).toBe(true);
      }
    });

    it('marks unknown URIs as unsupported', async () => {
      const uris = [
        CS_PART1_CONF.CORE,
        'http://example.com/unknown/conformance',
      ];
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({ body: conformanceJson(uris) }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      expect(result.declaredClasses).toHaveLength(2);
      expect(result.declaredClasses[0].supported).toBe(true);
      expect(result.declaredClasses[1].supported).toBe(false);
      expect(result.declaredClasses[1].name).toBe('Unknown Conformance Class');
      expect(result.declaredClasses[1].standardPart).toBe('unknown');
    });
  });

  // --- Resource probing ---

  describe('resource probing', () => {
    it('populates cache with systemId when system class is declared', async () => {
      const systemsResponse = JSON.stringify({
        items: [{ id: 'system-001', name: 'Test System' }],
      });
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART1_CONF.SYSTEM]),
        }),
        '/systems?limit=1': mockResponse({ body: systemsResponse }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.systemId).toBe('system-001');
    });

    it('populates cache with deploymentId when deployment class is declared', async () => {
      const deploymentsResponse = JSON.stringify({
        items: [{ id: 'dep-001', name: 'Test Deployment' }],
      });
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART1_CONF.DEPLOYMENT]),
        }),
        '/deployments?limit=1': mockResponse({ body: deploymentsResponse }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.deploymentId).toBe('dep-001');
    });

    it('populates cache with procedureId when procedure class is declared', async () => {
      const proceduresResponse = JSON.stringify({
        items: [{ id: 'proc-001' }],
      });
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART1_CONF.PROCEDURE]),
        }),
        '/procedures?limit=1': mockResponse({ body: proceduresResponse }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.procedureId).toBe('proc-001');
    });

    it('populates cache with datastreamId when Part 2 datastream class is declared', async () => {
      const datastreamsResponse = JSON.stringify({
        items: [{ id: 'ds-001' }],
      });
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART2_CONF.DATASTREAM]),
        }),
        '/datastreams?limit=1': mockResponse({ body: datastreamsResponse }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.datastreamId).toBe('ds-001');
    });

    it('populates cache with controlStreamId when Part 2 controlstream class is declared', async () => {
      const controlstreamsResponse = JSON.stringify({
        items: [{ id: 'cs-001' }],
      });
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART2_CONF.CONTROLSTREAM]),
        }),
        '/controlstreams?limit=1': mockResponse({ body: controlstreamsResponse }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.controlStreamId).toBe('cs-001');
    });

    it('handles 404 gracefully during resource probing (leaves ID undefined)', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART1_CONF.SYSTEM, CS_PART1_CONF.DEPLOYMENT]),
        }),
        // All resource probes return 404
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      expect(result.cache.systemId).toBeUndefined();
      expect(result.cache.deploymentId).toBeUndefined();
    });

    it('does not probe resources whose conformance class is not declared', async () => {
      // Only declare Core (no System, Deployment, etc.)
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART1_CONF.CORE]),
        }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      // Should not have made any resource probe requests
      // Calls: 1 landing page + 1 conformance = 2 total
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.cache.systemId).toBeUndefined();
      expect(result.cache.deploymentId).toBeUndefined();
    });

    it('handles empty items array from resource probe', async () => {
      const emptyItemsResponse = JSON.stringify({ items: [] });
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART1_CONF.SYSTEM]),
        }),
        '/systems?limit=1': mockResponse({ body: emptyItemsResponse }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.systemId).toBeUndefined();
    });

    it('handles network error during resource probing gracefully', async () => {
      mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/csapi') && !url.includes('/conformance') && !url.includes('/systems')) {
          return mockResponse({ body: landingPageJson() });
        }
        if (url.includes('/conformance')) {
          return mockResponse({
            body: conformanceJson([CS_PART1_CONF.SYSTEM]),
          });
        }
        if (url.includes('/systems')) {
          throw new TypeError('fetch failed');
        }
        return mockResponse({ status: 404 });
      });

      // Should not throw despite the probe failing
      const result = await service.discover(BASE_URL, noAuth, defaultConfig);
      expect(result.cache.systemId).toBeUndefined();
      // Discovery still completed
      expect(result.cache.conformsTo).toContain(CS_PART1_CONF.SYSTEM);
    });
  });

  // --- Exchange capture ---

  describe('exchange capture', () => {
    it('captures all HTTP exchanges during discovery', async () => {
      setupFetchResponses({
        '/csapi': mockResponse({ body: landingPageJson() }),
        '/conformance': mockResponse({
          body: conformanceJson([CS_PART1_CONF.CORE]),
        }),
      });

      const result = await service.discover(BASE_URL, noAuth, defaultConfig);

      // At minimum: landing page + conformance = 2 exchanges
      expect(result.exchanges.size).toBeGreaterThanOrEqual(2);
    });
  });
});
