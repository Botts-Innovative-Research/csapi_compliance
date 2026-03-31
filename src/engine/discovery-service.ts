// DiscoveryService — discovers an IUT's capabilities by fetching its landing page,
// conformance declaration, and probing for available resources.
// REQ-DISC-001 through REQ-DISC-006

import { CaptureHttpClient } from '@/engine/http-client.js';
import { mapConformanceClasses, type DeclaredConformanceClass } from '@/engine/conformance-mapper.js';
import { CS_PART1_CONF, CS_PART2_CONF } from '@/lib/constants.js';
import type {
  AuthConfig,
  RunConfig,
  DiscoveryCache,
  HttpExchange,
  LinkObject,
} from '@/lib/types.js';

/** Result returned by the discovery process. */
export interface DiscoveryResult {
  cache: DiscoveryCache;
  declaredClasses: DeclaredConformanceClass[];
  exchanges: Map<string, HttpExchange>;
}

/** Error thrown when discovery encounters an unrecoverable problem. */
export class DiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

/** Known link relations for the conformance endpoint. */
const CONFORMANCE_RELS = [
  'conformance',
  'http://www.opengis.net/def/rel/ogc/1.0/conformance',
];

/**
 * Mapping from conformance class URIs to the resource probe configuration.
 * Each entry specifies which path to probe and which cache field to populate.
 */
interface ResourceProbe {
  path: string;
  cacheField: keyof DiscoveryCache;
  requiredClasses: string[];
}

const RESOURCE_PROBES: ResourceProbe[] = [
  {
    path: '/systems',
    cacheField: 'systemId',
    requiredClasses: [CS_PART1_CONF.SYSTEM],
  },
  {
    path: '/deployments',
    cacheField: 'deploymentId',
    requiredClasses: [CS_PART1_CONF.DEPLOYMENT],
  },
  {
    path: '/procedures',
    cacheField: 'procedureId',
    requiredClasses: [CS_PART1_CONF.PROCEDURE],
  },
  {
    path: '/samplingFeatures',
    cacheField: 'samplingFeatureId',
    requiredClasses: [CS_PART1_CONF.SAMPLING_FEATURE],
  },
  {
    path: '/properties',
    cacheField: 'propertyId',
    requiredClasses: [CS_PART1_CONF.PROPERTY],
  },
  {
    path: '/datastreams',
    cacheField: 'datastreamId',
    requiredClasses: [CS_PART2_CONF.DATASTREAM],
  },
  {
    path: '/controlstreams',
    cacheField: 'controlStreamId',
    requiredClasses: [CS_PART2_CONF.CONTROLSTREAM],
  },
];

export class DiscoveryService {
  /**
   * Discover an IUT's capabilities.
   * 1. Fetch landing page (GET /) -- extract links
   * 2. Fetch conformance (GET /conformance) -- extract conformsTo URIs
   * 3. Map URIs to known conformance classes
   * 4. Probe for available resources to populate discoveryCache with sample resource IDs
   */
  async discover(
    baseUrl: string,
    auth: AuthConfig,
    config: RunConfig,
  ): Promise<DiscoveryResult> {
    // Normalize base URL: strip trailing slash
    const normalizedBase = baseUrl.replace(/\/+$/, '');

    // Create HTTP client internally for the discovery phase
    const httpClient = new CaptureHttpClient(auth, config.timeoutMs);

    // --- Step 1: Fetch landing page ---
    const landingPageResponse = await httpClient.get(normalizedBase);

    // Verify 200 status
    if (landingPageResponse.statusCode !== 200) {
      throw new DiscoveryError(
        `Landing page returned HTTP ${landingPageResponse.statusCode}, expected 200`,
      );
    }

    // Parse JSON body first, then check content type (REQ-DISC-002).
    // Some servers (e.g., OGC reference implementation) return non-standard
    // Content-Type values like "auto" while still serving valid JSON.
    let landingPage: Record<string, unknown>;
    try {
      landingPage = JSON.parse(landingPageResponse.body) as Record<string, unknown>;
    } catch {
      throw new DiscoveryError('Landing page response is not valid JSON');
    }

    // Warn about non-JSON content type but do not abort discovery.
    // The conformance tests themselves will flag this as a failure.
    const contentType = landingPageResponse.headers['content-type'] ?? '';
    if (!contentType.includes('json')) {
      console.warn(
        `[discovery] Landing page Content-Type is "${contentType || '(none)'}" — expected a JSON media type. Proceeding with parsed JSON body.`,
      );
    }

    // --- Step 2: Extract links (REQ-DISC-003) ---
    const rawLinks = Array.isArray(landingPage.links) ? landingPage.links : [];
    const links: LinkObject[] = rawLinks
      .filter(
        (l: unknown): l is { rel: string; href: string; type?: string; title?: string } =>
          typeof l === 'object' &&
          l !== null &&
          typeof (l as Record<string, unknown>).rel === 'string' &&
          typeof (l as Record<string, unknown>).href === 'string',
      )
      .map((l) => ({
        rel: l.rel,
        href: resolveUrl(normalizedBase, l.href),
        type: l.type,
        title: l.title,
      }));

    // Find conformance link
    let conformanceUrl: string | undefined;
    for (const link of links) {
      if (CONFORMANCE_RELS.includes(link.rel)) {
        conformanceUrl = link.href;
        break;
      }
    }

    // Fallback: use well-known path (REQ-DISC-003)
    if (!conformanceUrl) {
      conformanceUrl = `${normalizedBase}/conformance`;
    }

    // Find API definition link
    let apiDefinitionUrl: string | undefined;
    for (const link of links) {
      if (link.rel === 'service-desc' || link.rel === 'service-doc') {
        apiDefinitionUrl = link.href;
        break;
      }
    }

    // --- Step 3: Fetch conformance declaration (REQ-DISC-004) ---
    const conformanceResponse = await httpClient.get(conformanceUrl);

    if (conformanceResponse.statusCode !== 200) {
      throw new DiscoveryError(
        `Conformance endpoint returned HTTP ${conformanceResponse.statusCode}, expected 200`,
      );
    }

    let conformanceBody: Record<string, unknown>;
    try {
      conformanceBody = JSON.parse(conformanceResponse.body) as Record<string, unknown>;
    } catch {
      throw new DiscoveryError('Conformance endpoint response is not valid JSON');
    }

    const conformsTo = conformanceBody.conformsTo;
    if (!Array.isArray(conformsTo)) {
      throw new DiscoveryError(
        'Conformance response is missing the conformsTo array',
      );
    }

    const conformsToStrings = conformsTo.filter(
      (item): item is string => typeof item === 'string',
    );

    // --- Step 4: Map URIs to known conformance classes (REQ-DISC-005) ---
    const declaredClasses = mapConformanceClasses(conformsToStrings);

    // Build set of declared URIs for fast lookup during resource probing
    const declaredUriSet = new Set(conformsToStrings);

    // --- Step 5: Probe for available resources ---
    const cache: DiscoveryCache = {
      landingPage,
      conformsTo: conformsToStrings,
      apiDefinitionUrl,
      collectionIds: [],
      links,
    };

    await this.probeResources(
      normalizedBase,
      httpClient,
      declaredUriSet,
      cache,
    );

    return {
      cache,
      declaredClasses,
      exchanges: httpClient.getExchanges(),
    };
  }

  /**
   * Probe for available resources by issuing GET requests with ?limit=1.
   * Only probes resources whose corresponding conformance class is declared.
   * Silently ignores 404s and other errors.
   */
  private async probeResources(
    baseUrl: string,
    httpClient: CaptureHttpClient,
    declaredUris: Set<string>,
    cache: DiscoveryCache,
  ): Promise<void> {
    for (const probe of RESOURCE_PROBES) {
      // Only probe if the corresponding conformance class is declared
      const shouldProbe = probe.requiredClasses.some((cls) => declaredUris.has(cls));
      if (!shouldProbe) continue;

      try {
        const response = await httpClient.get(`${baseUrl}${probe.path}?limit=1`);

        if (response.statusCode === 200) {
          const body = JSON.parse(response.body) as Record<string, unknown>;
          const items = Array.isArray(body.items) ? body.items : [];
          if (items.length > 0) {
            const firstItem = items[0] as Record<string, unknown>;
            const id = firstItem.id;
            if (typeof id === 'string') {
              // Use type assertion to set the dynamic cache field
              (cache as unknown as Record<string, unknown>)[probe.cacheField] = id;
            }
          }
        }
      } catch {
        // Probing failures are non-fatal — leave the cache field undefined
      }
    }
  }
}

/**
 * Resolve a potentially relative URL against a base URL.
 * Handles both absolute and relative hrefs.
 */
function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    // If URL construction fails, return href as-is
    return href;
  }
}
