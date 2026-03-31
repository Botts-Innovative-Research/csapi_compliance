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
 * Usage: npx tsx scripts/fetch-schemas.ts
 *
 * This script is idempotent and safe to re-run. If fetching from GitHub
 * fails, fallback schemas are preserved and a warning is logged.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const SCHEMAS_DIR = join(PROJECT_ROOT, 'schemas');
const FALLBACK_DIR = join(SCHEMAS_DIR, 'fallback');
const MANIFEST_PATH = join(SCHEMAS_DIR, 'manifest.json');

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api';

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
  source: 'github-repo' | 'ogc-schema-server' | 'fallback';
  fetchedAt: string;
}

interface Manifest {
  generatedAt: string;
  schemas: ManifestEntry[];
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

async function fetchJsonText(url: string): Promise<string | null> {
  const text = await fetchText(url);
  if (!text) return null;
  // Validate it's parseable JSON
  try {
    JSON.parse(text);
    return text;
  } catch {
    warn(`Invalid JSON from ${url}`);
    return null;
  }
}

async function writeSchema(filePath: string, content: string): Promise<void> {
  // Re-format for consistent style
  const schema = JSON.parse(content);
  const formatted = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(filePath, formatted, 'utf-8');
}

async function writeSchemaObject(filePath: string, schema: unknown): Promise<void> {
  const content = JSON.stringify(schema, null, 2) + '\n';
  await writeFile(filePath, content, 'utf-8');
}

// ---------------------------------------------------------------------------
// Phase 1: Fetch Connected Systems schema files from GitHub
// ---------------------------------------------------------------------------

async function fetchGitHubSchemas(
  partName: string,
  partDir: string,
  schemaMap: Record<string, string[]>,
  manifest: ManifestEntry[],
): Promise<number> {
  let count = 0;

  for (const [subDir, files] of Object.entries(schemaMap)) {
    // Local output: schemas/connected-systems-1/{subDir}/{file}
    // e.g. schemas/connected-systems-1/geojson/system.json
    const localSubDir = subDir.replace('schemas/', '');
    const outDir = join(SCHEMAS_DIR, partName, localSubDir);
    await ensureDir(outDir);

    for (const fileName of files) {
      const url = `${GITHUB_RAW_BASE}/${partDir}/openapi/${subDir}/${fileName}`;
      log(`  Fetching ${partName}/${localSubDir}/${fileName}`);
      const content = await fetchJsonText(url);
      if (!content) {
        warn(`  Could not fetch ${fileName} from ${url}`);
        continue;
      }
      const filePath = join(outDir, fileName);
      await writeSchema(filePath, content);
      const schemaId = `${partName}/${localSubDir}/${fileName}`;
      manifest.push({
        schemaId,
        file: schemaId,
        source: 'github-repo',
        fetchedAt: new Date().toISOString(),
      });
      count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Phase 2: Fetch individual OGC schema files from schemas server
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
    const content = await fetchJsonText(url);
    if (!content) {
      warn(`  Could not fetch ${fileName} from ${url}`);
      continue;
    }
    const filePath = join(outDir, fileName);
    await writeSchema(filePath, content);
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
// Phase 3: Ensure fallback schemas exist
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  log('Starting OGC schema fetch pipeline');
  log(`Output directory: ${SCHEMAS_DIR}`);

  const manifest: ManifestEntry[] = [];
  let totalFetched = 0;

  // Phase 1: Connected Systems Part 1 schemas from GitHub
  log('--- Phase 1: Connected Systems Part 1 schemas ---');
  const p1Count = await fetchGitHubSchemas(
    'connected-systems-1',
    'part1',
    CS_PART1_SCHEMAS,
    manifest,
  );
  totalFetched += p1Count;
  log(`  Total: ${p1Count} schemas for Part 1`);

  // Phase 2: Connected Systems Part 2 schemas from GitHub
  log('--- Phase 2: Connected Systems Part 2 schemas ---');
  const p2Count = await fetchGitHubSchemas(
    'connected-systems-2',
    'part2',
    CS_PART2_SCHEMAS,
    manifest,
  );
  totalFetched += p2Count;
  log(`  Total: ${p2Count} schemas for Part 2`);

  // Phase 3: OGC API Common schemas from schemas server
  log('--- Phase 3: OGC API Common schemas ---');
  totalFetched += await fetchOgcSchemas('ogc-api-common', OGC_COMMON_SCHEMAS, manifest);

  // Phase 4: OGC API Features schemas from schemas server
  log('--- Phase 4: OGC API Features schemas ---');
  totalFetched += await fetchOgcSchemas('ogc-api-features', OGC_FEATURES_SCHEMAS, manifest);

  // Phase 5: Write fallback schemas (always written, regardless of fetch success)
  log('--- Phase 5: Fallback schemas ---');
  await writeFallbackSchemas(manifest);

  // Write manifest
  const manifestData: Manifest = {
    generatedAt: new Date().toISOString(),
    schemas: manifest,
  };
  await writeFile(MANIFEST_PATH, JSON.stringify(manifestData, null, 2) + '\n', 'utf-8');
  log(`Manifest written to ${MANIFEST_PATH}`);

  log(
    `Done. ${totalFetched} schemas fetched from remote sources, ` +
      `${manifest.length} total entries (including fallbacks).`,
  );
}

main().catch((err) => {
  console.error('[fetch-schemas] Fatal error:', err);
  process.exit(1);
});
