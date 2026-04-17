/**
 * Build-time script to fetch OGC API schemas from the OGC GitHub repository
 * and OGC schemas server, writing them as individual .json files under the
 * schemas/ directory.
 *
 * ADR-005: Bundled OpenAPI Schemas at Build Time
 *
 * The OGC Connected Systems OpenAPI definitions use a modular structure with
 * schemas split across individual JSON files in the repository, rather than
 * inline `components.schemas`. This script fetches those JSON files directly.
 *
 * REQ-SCHEMA-001 (SCENARIO-SCHEMA-REF-001): After fetch, every bundled schema's
 * $ref values must resolve to either (a) a fragment (#...) within the same
 * file, or (b) another bundled file under schemas/. To satisfy this, the
 * script performs a recursive closure walk:
 *   1. Seed with the curated list of CS Part 1 / Part 2 schemas.
 *   2. For each fetched schema, scan every $ref value. Resolve non-fragment
 *      refs against the schema's GitHub source URL to produce an absolute URL.
 *   3. If the absolute URL is not yet bundled, assign it a local path, fetch
 *      it, and enqueue it for processing. Repeat until closure is stable.
 *   4. Rewrite every non-fragment $ref in each fetched schema to a relative
 *      path from the containing file's local path to the referenced file's
 *      local path (preserving the #fragment, if any).
 *
 * Usage: npx tsx scripts/fetch-schemas.ts
 *
 * This script is idempotent and safe to re-run. If fetching from GitHub
 * fails, fallback schemas are preserved and a warning is logged.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const SCHEMAS_DIR = join(PROJECT_ROOT, 'schemas');
const FALLBACK_DIR = join(SCHEMAS_DIR, 'fallback');
const MANIFEST_PATH = join(SCHEMAS_DIR, 'manifest.json');

const GITHUB_REPO_ROOT =
  'https://raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/';

/**
 * Connected Systems Part 1 JSON schema files, organized by sub-directory
 * within the OpenAPI spec repository.
 */
const CS_PART1_SCHEMAS: Record<string, string[]> = {
  'schemas/common': [
    'batch_delete.json',
    'batch_response.json',
    'commonDefs.json',
    'links.json',
    'uris.json',
  ],
  'schemas/geojson': [
    'deployedSystem.json',
    'deployedSystemArray.json',
    'deployedSystemCollection.json',
    'deployment.json',
    'deploymentArray.json',
    'deploymentCollection.json',
    'feature.json',
    'procedure.json',
    'procedureArray.json',
    'procedureCollection.json',
    'samplingFeature.json',
    'samplingFeatureArray.json',
    'samplingFeatureCollection.json',
    'system.json',
    'systemArray.json',
    'systemCollection.json',
  ],
  'schemas/sensorml': [
    'deployedSystem.json',
    'deployedSystemArray.json',
    'deployedSystemCollection.json',
    'deployment.json',
    'deploymentArray.json',
    'deploymentCollection.json',
    'procedure.json',
    'procedureArray.json',
    'procedureCollection.json',
    'property.json',
    'propertyArray.json',
    'propertyCollection.json',
    'sensormlDefs.json',
    'system.json',
    'systemArray.json',
    'systemCollection.json',
  ],
};

/**
 * Connected Systems Part 2 JSON schema files.
 */
const CS_PART2_SCHEMAS: Record<string, string[]> = {
  'schemas/common': [
    'commonDefs.json',
    'sensormlDefs.json',
    'sweCommonDefs.json',
  ],
  'schemas/json': [
    'baseStream.json',
    'command.json',
    'commandCollection.json',
    'commandResult.json',
    'commandResultCollection.json',
    'commandSchema.json',
    'commandSchemaAnyOther.json',
    'commandSchemaJson.json',
    'commandSchemaProtobuf.json',
    'commandSchemaSwe.json',
    'commandStatus.json',
    'commandStatusCode.json',
    'commandStatusCollection.json',
    'controlStream.json',
    'controlStreamCollection.json',
    'controlStream_create.json',
    'dataStream.json',
    'dataStreamCollection.json',
    'dataStreamSchemaDef.json',
    'dataStream_create.json',
    'observation.json',
    'observationCollection.json',
    'observationSchema.json',
    'observationSchemaAnyOther.json',
    'observationSchemaJson.json',
    'observationSchemaProtobuf.json',
    'observationSchemaSwe.json',
    'systemEvent.json',
    'systemEventCollection.json',
  ],
};

/**
 * Individual schema files to fetch from the OGC schemas server.
 * These are JSON Schema files published as part of OGC API Common and Features.
 */
const OGC_COMMON_SCHEMAS: Record<string, string> = {
  'landingPage.json':
    'https://schemas.opengis.net/ogcapi/common/part2/1.0/schemas/landingPage.json',
  'confClasses.json':
    'https://schemas.opengis.net/ogcapi/common/part2/1.0/schemas/confClasses.json',
  'link.json':
    'https://schemas.opengis.net/ogcapi/common/part2/1.0/schemas/link.json',
  'exception.json':
    'https://schemas.opengis.net/ogcapi/common/part2/1.0/schemas/exception.json',
};

const OGC_FEATURES_SCHEMAS: Record<string, string> = {
  'collection.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/collection.json',
  'collections.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/collections.json',
  'extent.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/extent.json',
  'featureCollectionGeoJSON.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/featureCollectionGeoJSON.json',
  'featureGeoJSON.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/featureGeoJSON.json',
  'geometryGeoJSON.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/geometryGeoJSON.json',
  'numberMatched.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/numberMatched.json',
  'numberReturned.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/numberReturned.json',
  'timeStamp.json':
    'https://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/schemas/timeStamp.json',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  schemaId: string;
  file: string;
  source: 'github-repo' | 'ogc-schema-server' | 'fallback' | 'github-recursive';
  fetchedAt: string;
}

interface Manifest {
  generatedAt: string;
  schemas: ManifestEntry[];
}

/**
 * A fetched schema pending local storage. We keep the parsed object in memory
 * so we can rewrite its refs after closure completes.
 */
interface FetchedSchema {
  /** The absolute source URL this schema was fetched from. */
  sourceUrl: string;
  /** The local path (relative to SCHEMAS_DIR) where this schema will be written. */
  localPath: string;
  /** Parsed schema object. */
  body: unknown;
  /** Where it came from, for manifest reporting. */
  source: ManifestEntry['source'];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string): void {
  console.log(`[fetch-schemas] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[fetch-schemas] WARNING: ${msg}`);
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      warn(`HTTP ${res.status} fetching ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    warn(`Failed to fetch ${url}: ${(err as Error).message}`);
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown | null> {
  const text = await fetchText(url);
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    warn(`Invalid JSON from ${url}`);
    return null;
  }
}

async function writeSchemaObject(
  filePath: string,
  schema: unknown,
): Promise<void> {
  await ensureDir(dirname(filePath));
  const content = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Given a source URL on the OGC Connected Systems repo, compute a canonical
 * local path (within schemas/) to store the schema file at.
 *
 * Known mappings:
 *   api/part1/openapi/schemas/<sub>/<file> -> connected-systems-1/<sub>/<file>
 *   api/part2/openapi/schemas/<sub>/<file> -> connected-systems-2/<sub>/<file>
 *
 * Everything else (e.g. common/, sensorml/schemas/json/, swecommon/schemas/json/)
 * goes under connected-systems-shared/<repo-relative-path>.
 */
function computeLocalPathForSource(sourceUrl: string): string {
  if (sourceUrl.startsWith(GITHUB_REPO_ROOT)) {
    const rel = sourceUrl.slice(GITHUB_REPO_ROOT.length);
    const part1 = rel.match(/^api\/part1\/openapi\/schemas\/(.+)$/);
    if (part1) {
      return posix.join('connected-systems-1', part1[1]);
    }
    const part2 = rel.match(/^api\/part2\/openapi\/schemas\/(.+)$/);
    if (part2) {
      return posix.join('connected-systems-2', part2[1]);
    }
    return posix.join('connected-systems-shared', rel);
  }
  // Schemas fetched from the OGC schemas server: store under dedicated dirs
  // (handled separately by fetchOgcSchemas so we shouldn't hit this).
  const u = new URL(sourceUrl);
  return posix.join('external', u.hostname, u.pathname.replace(/^\//, ''));
}

/**
 * Walk an arbitrary JSON value and invoke `visit` for every `$ref` string
 * encountered at any nesting depth.
 */
function walkRefs(
  node: unknown,
  visit: (refValue: string, setValue: (next: string) => void) => void,
): void {
  if (Array.isArray(node)) {
    for (const item of node) walkRefs(item, visit);
    return;
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (key === '$ref' && typeof value === 'string') {
        visit(value, (next) => {
          obj[key] = next;
        });
      } else {
        walkRefs(value, visit);
      }
    }
  }
}

/**
 * Split a ref value into its URL part and (optional) fragment.
 * e.g. "foo.json#/$defs/X" -> ["foo.json", "/$defs/X"]
 *      "#/$defs/X"         -> ["", "/$defs/X"]
 *      "foo.json"          -> ["foo.json", ""]
 */
function splitRef(ref: string): [string, string] {
  const idx = ref.indexOf('#');
  if (idx < 0) return [ref, ''];
  return [ref.slice(0, idx), idx < ref.length - 1 ? ref.slice(idx) : '#'];
}

/**
 * Return true if a URL lives on the OGC connected-systems GitHub repo root.
 * Absolute external URLs (geojson.org, swecommon schemas, etc.) are treated
 * as "leave as-is" refs and are not recursively fetched.
 */
function isRepoUrl(url: string): boolean {
  return url.startsWith(GITHUB_REPO_ROOT);
}

// ---------------------------------------------------------------------------
// Recursive fetch closure
// ---------------------------------------------------------------------------

/**
 * Fetch the closure of schemas starting from the given seeds. Returns a
 * map of sourceUrl → FetchedSchema. All refs inside the returned schemas
 * are rewritten to be relative paths between local files.
 */
async function fetchClosure(
  seeds: Array<{ url: string; localPath: string; source: ManifestEntry['source'] }>,
): Promise<Map<string, FetchedSchema>> {
  const bySourceUrl = new Map<string, FetchedSchema>();
  const queue: Array<{ url: string; localPath: string; source: ManifestEntry['source'] }> = [];

  for (const seed of seeds) {
    if (bySourceUrl.has(seed.url)) continue;
    bySourceUrl.set(seed.url, {
      sourceUrl: seed.url,
      localPath: seed.localPath,
      body: undefined,
      source: seed.source,
    });
    queue.push(seed);
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    const existing = bySourceUrl.get(item.url);
    if (existing && existing.body !== undefined) continue;

    const body = await fetchJson(item.url);
    if (body === null) {
      warn(`  Could not fetch ${item.url}; dropping`);
      bySourceUrl.delete(item.url);
      continue;
    }

    // Record the fetched body.
    const entry = bySourceUrl.get(item.url);
    if (!entry) continue;
    entry.body = body;

    // Discover refs and enqueue new targets.
    walkRefs(body, (refValue) => {
      const [refPath, fragment] = splitRef(refValue);
      if (refPath === '') return; // pure fragment — local to same file
      if (/^https?:/i.test(refPath)) {
        // Absolute external URL — if it points to the same repo root, we
        // can recursively fetch. Otherwise (e.g. https://geojson.org/...)
        // leave as-is; Ajv will either resolve via network or ignore.
        if (isRepoUrl(refPath)) {
          if (!bySourceUrl.has(refPath)) {
            const localPath = computeLocalPathForSource(refPath);
            bySourceUrl.set(refPath, {
              sourceUrl: refPath,
              localPath,
              body: undefined,
              source: 'github-recursive',
            });
            queue.push({ url: refPath, localPath, source: 'github-recursive' });
          }
        }
        return;
      }

      // Relative ref — resolve against the containing file's source URL.
      let targetUrl: URL;
      try {
        targetUrl = new URL(refPath, item.url);
      } catch {
        warn(`  Invalid ref "${refValue}" in ${item.url}`);
        return;
      }

      const targetUrlStr = targetUrl.toString();
      if (!bySourceUrl.has(targetUrlStr)) {
        if (!isRepoUrl(targetUrlStr)) {
          warn(`  Ref target outside repo: ${targetUrlStr} (from ${item.url})`);
          return;
        }
        const localPath = computeLocalPathForSource(targetUrlStr);
        bySourceUrl.set(targetUrlStr, {
          sourceUrl: targetUrlStr,
          localPath,
          body: undefined,
          source: 'github-recursive',
        });
        queue.push({ url: targetUrlStr, localPath, source: 'github-recursive' });
      }
      void fragment; // fragment is preserved during rewrite below
    });
  }

  // Now rewrite refs in every fetched schema to use relative local paths.
  // Relative paths (e.g. "../../foo/bar.json") are resolved by Ajv against
  // the schema's base URI. Because our registration IDs don't use a URI
  // scheme, we assign each schema an explicit $id using the dedicated
  // `BUNDLE_IRI_BASE` namespace so Ajv's URI resolver can dereference
  // relative and sibling refs reliably.
  for (const schema of bySourceUrl.values()) {
    if (schema.body === undefined) continue;
    walkRefs(schema.body, (refValue, setValue) => {
      const [refPath, fragment] = splitRef(refValue);
      if (refPath === '') return; // pure fragment, unchanged

      // Resolve to absolute URL
      let absoluteUrl: string;
      if (/^https?:/i.test(refPath)) {
        absoluteUrl = refPath;
      } else {
        try {
          absoluteUrl = new URL(refPath, schema.sourceUrl).toString();
        } catch {
          return;
        }
      }

      const target = bySourceUrl.get(absoluteUrl);
      if (!target) return; // kept as external (e.g. geojson.org)
      // Rewrite to a canonical bundle IRI so Ajv's URI resolver can
      // dereference regardless of where the file is registered from.
      const bundledIri = `${BUNDLE_IRI_BASE}${target.localPath}`;
      setValue(fragment ? `${bundledIri}${fragment}` : bundledIri);
    });

    // Set / overwrite $id to the canonical bundle IRI so refs resolve.
    if (schema.body && typeof schema.body === 'object' && !Array.isArray(schema.body)) {
      (schema.body as Record<string, unknown>).$id = `${BUNDLE_IRI_BASE}${schema.localPath}`;
    }
  }

  return bySourceUrl;
}

/**
 * All bundled OGC schemas are assigned an $id in this dedicated IRI
 * namespace so Ajv's URI resolver can dereference any $ref regardless of
 * on-disk layout. The IRI is not dereferenceable (no HTTP fetch); it is
 * purely a stable key used during schema registration and validation.
 */
const BUNDLE_IRI_BASE = 'https://csapi-compliance.local/schemas/';

// ---------------------------------------------------------------------------
// OGC schema server fetch (no recursion — these are leaf schemas)
// ---------------------------------------------------------------------------

async function fetchOgcSchemas(
  dirName: string,
  schemaUrls: Record<string, string>,
  manifest: ManifestEntry[],
): Promise<number> {
  const outDir = join(SCHEMAS_DIR, dirName);
  await ensureDir(outDir);

  let count = 0;
  for (const [fileName, url] of Object.entries(schemaUrls)) {
    log(`  Fetching ${dirName}/${fileName}`);
    const body = await fetchJson(url);
    if (body === null) {
      warn(`  Could not fetch ${fileName} from ${url}`);
      continue;
    }
    const filePath = join(outDir, fileName);
    await writeSchemaObject(filePath, body);
    manifest.push({
      schemaId: `${dirName}/${fileName}`,
      file: `${dirName}/${fileName}`,
      source: 'ogc-schema-server',
      fetchedAt: new Date().toISOString(),
    });
    count++;
  }

  log(`  Fetched ${count}/${Object.keys(schemaUrls).length} schemas for ${dirName}`);
  return count;
}

// ---------------------------------------------------------------------------
// Fallback schemas
// ---------------------------------------------------------------------------

async function writeFallbackSchemas(manifest: ManifestEntry[]): Promise<void> {
  await ensureDir(FALLBACK_DIR);

  const fallbacks: Record<string, object> = {
    'landing-page.json': {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'fallback/landing-page.json',
      title: 'OGC API Landing Page',
      description:
        'Minimal schema for an OGC API landing page response (OGC API - Common Part 1).',
      type: 'object',
      required: ['title', 'links'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        links: {
          type: 'array',
          items: {
            type: 'object',
            required: ['href'],
            properties: {
              href: { type: 'string', format: 'uri-reference' },
              rel: { type: 'string' },
              type: { type: 'string' },
              title: { type: 'string' },
              hreflang: { type: 'string' },
            },
          },
        },
      },
    },
    'conf-classes.json': {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'fallback/conf-classes.json',
      title: 'OGC API Conformance Declaration',
      description:
        'Minimal schema for an OGC API conformance declaration (OGC API - Common Part 1).',
      type: 'object',
      required: ['conformsTo'],
      properties: {
        conformsTo: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    'collection.json': {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'fallback/collection.json',
      title: 'OGC API Collection',
      description:
        'Minimal schema for an OGC API collection resource (OGC API - Features Part 1).',
      type: 'object',
      required: ['id', 'links'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
        links: {
          type: 'array',
          items: {
            type: 'object',
            required: ['href'],
            properties: {
              href: { type: 'string', format: 'uri-reference' },
              rel: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        extent: {
          type: 'object',
          properties: {
            spatial: {
              type: 'object',
              properties: {
                bbox: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: { type: 'number' },
                  },
                },
                crs: { type: 'string', format: 'uri' },
              },
            },
            temporal: {
              type: 'object',
              properties: {
                interval: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: {
                      type: ['string', 'null'],
                    },
                  },
                },
                trs: { type: 'string', format: 'uri' },
              },
            },
          },
        },
        itemType: { type: 'string' },
        crs: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    'feature.json': {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'fallback/feature.json',
      title: 'GeoJSON Feature',
      description: 'Minimal schema for a GeoJSON Feature (RFC 7946).',
      type: 'object',
      required: ['type', 'geometry', 'properties'],
      properties: {
        type: { type: 'string', const: 'Feature' },
        id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
        geometry: {
          oneOf: [
            { type: 'null' },
            {
              type: 'object',
              required: ['type', 'coordinates'],
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'Point',
                    'MultiPoint',
                    'LineString',
                    'MultiLineString',
                    'Polygon',
                    'MultiPolygon',
                    'GeometryCollection',
                  ],
                },
                coordinates: {},
              },
            },
          ],
        },
        properties: {
          oneOf: [{ type: 'null' }, { type: 'object' }],
        },
        links: {
          type: 'array',
          items: {
            type: 'object',
            required: ['href'],
            properties: {
              href: { type: 'string', format: 'uri-reference' },
              rel: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
      },
    },
    'feature-collection.json': {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'fallback/feature-collection.json',
      title: 'GeoJSON FeatureCollection',
      description:
        'Minimal schema for a GeoJSON FeatureCollection (RFC 7946 / OGC API - Features).',
      type: 'object',
      required: ['type', 'features'],
      properties: {
        type: { type: 'string', const: 'FeatureCollection' },
        features: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'geometry', 'properties'],
            properties: {
              type: { type: 'string', const: 'Feature' },
              id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
              geometry: {},
              properties: {
                oneOf: [{ type: 'null' }, { type: 'object' }],
              },
            },
          },
        },
        links: {
          type: 'array',
          items: {
            type: 'object',
            required: ['href'],
            properties: {
              href: { type: 'string', format: 'uri-reference' },
              rel: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        timeStamp: { type: 'string', format: 'date-time' },
        numberMatched: { type: 'integer', minimum: 0 },
        numberReturned: { type: 'integer', minimum: 0 },
      },
    },
  };

  for (const [fileName, schema] of Object.entries(fallbacks)) {
    const filePath = join(FALLBACK_DIR, fileName);
    await writeSchemaObject(filePath, schema);
    manifest.push({
      schemaId: `fallback/${fileName}`,
      file: `fallback/${fileName}`,
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
    });
  }

  log(`  Wrote ${Object.keys(fallbacks).length} fallback schemas`);
}

/**
 * Write stub schemas for external $refs that aren't dereferenced over the
 * network (e.g. https://geojson.org/schema/*). These permissive stubs allow
 * Ajv to compile bundled schemas that reference them without network access.
 */
async function writeExternalStubs(manifest: ManifestEntry[]): Promise<void> {
  const geoJsonTargets = [
    'Feature.json',
    'FeatureCollection.json',
    'Geometry.json',
    'Point.json',
  ];
  const stubDir = join(SCHEMAS_DIR, 'external', 'geojson.org', 'schema');
  await ensureDir(stubDir);
  for (const fileName of geoJsonTargets) {
    const id = `https://geojson.org/schema/${fileName}`;
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: id,
      title: `GeoJSON ${fileName.replace(/\.json$/, '')} (stub)`,
      description: `Permissive stub for GeoJSON ${fileName.replace(/\.json$/, '')}, bundled so OGC CS schemas with $ref to ${id} can be compiled offline.`,
      type: 'object',
    };
    const filePath = join(stubDir, fileName);
    await writeSchemaObject(filePath, schema);
    manifest.push({
      schemaId: `external/geojson.org/schema/${fileName}`,
      file: `external/geojson.org/schema/${fileName}`,
      source: 'fallback',
      fetchedAt: new Date().toISOString(),
    });
  }
  log(`  Wrote ${geoJsonTargets.length} external stub schemas`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function buildSeeds(
  partName: string,
  partDir: string,
  schemaMap: Record<string, string[]>,
): Array<{ url: string; localPath: string; source: ManifestEntry['source'] }> {
  const seeds: Array<{ url: string; localPath: string; source: ManifestEntry['source'] }> = [];
  for (const [subDir, files] of Object.entries(schemaMap)) {
    const localSubDir = subDir.replace('schemas/', '');
    for (const fileName of files) {
      const url = `${GITHUB_REPO_ROOT}api/${partDir}/openapi/${subDir}/${fileName}`;
      const localPath = posix.join(partName, localSubDir, fileName);
      seeds.push({ url, localPath, source: 'github-repo' });
    }
  }
  return seeds;
}

async function main(): Promise<void> {
  log('Starting OGC schema fetch pipeline (recursive closure)');
  log(`Output directory: ${SCHEMAS_DIR}`);

  const manifest: ManifestEntry[] = [];

  // Phases 1+2: Connected Systems Part 1 & Part 2 — fetch recursive closure.
  log('--- Phase 1+2: Connected Systems Part 1 & Part 2 (recursive closure) ---');
  const seeds = [
    ...buildSeeds('connected-systems-1', 'part1', CS_PART1_SCHEMAS),
    ...buildSeeds('connected-systems-2', 'part2', CS_PART2_SCHEMAS),
  ];
  const closure = await fetchClosure(seeds);

  let cs1Count = 0;
  let cs2Count = 0;
  let sharedCount = 0;
  for (const entry of closure.values()) {
    if (entry.body === undefined) continue;
    const filePath = join(SCHEMAS_DIR, entry.localPath);
    await writeSchemaObject(filePath, entry.body);
    manifest.push({
      schemaId: entry.localPath,
      file: entry.localPath,
      source: entry.source,
      fetchedAt: new Date().toISOString(),
    });
    if (entry.localPath.startsWith('connected-systems-1/')) cs1Count++;
    else if (entry.localPath.startsWith('connected-systems-2/')) cs2Count++;
    else sharedCount++;
  }
  log(`  Part 1: ${cs1Count} schemas; Part 2: ${cs2Count} schemas; shared/recursive: ${sharedCount}`);

  // Phase 3: OGC API Common schemas from schemas server
  log('--- Phase 3: OGC API Common schemas ---');
  await fetchOgcSchemas('ogc-api-common', OGC_COMMON_SCHEMAS, manifest);

  // Phase 4: OGC API Features schemas from schemas server
  log('--- Phase 4: OGC API Features schemas ---');
  await fetchOgcSchemas('ogc-api-features', OGC_FEATURES_SCHEMAS, manifest);

  // Phase 5: Write fallback schemas (always written, regardless of fetch success)
  log('--- Phase 5: Fallback schemas ---');
  await writeFallbackSchemas(manifest);

  // Phase 6: External stubs (geojson.org, etc.) so Ajv can compile offline.
  log('--- Phase 6: External stub schemas ---');
  await writeExternalStubs(manifest);

  // Write manifest
  const manifestData: Manifest = {
    generatedAt: new Date().toISOString(),
    schemas: manifest,
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifestData, null, 2) + '\n', 'utf-8');
  log(`Manifest written to ${MANIFEST_PATH}`);

  log(
    `Done. ${manifest.length} total manifest entries (including fallbacks).`,
  );
}

// Silence an unused-variable warning for `relative` (kept for potential
// extension; prefer posix path helpers elsewhere).
void relative;

main().catch((err) => {
  console.error('[fetch-schemas] Fatal error:', err);
  process.exit(1);
});
