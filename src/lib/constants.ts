// Test engine configuration defaults. From architecture.md ADR-002, ADR-006.

export const ENGINE_DEFAULTS = {
  timeoutMs: 30_000,
  minTimeoutMs: 5_000,
  maxTimeoutMs: 120_000,
  concurrency: 5,
  maxConcurrency: 10,
  paginationMaxPages: 5,
  paginationDefaultLimit: 10,
  maxResponseBodySizeBytes: 5 * 1024 * 1024, // 5 MB
  progressEmitIntervalMs: 250,
} as const;

export const SESSION_DEFAULTS = {
  maxConcurrentSessions: 5,
  resultTtlMs: 24 * 60 * 60 * 1000, // 24 hours
  evictionIntervalMs: 15 * 60 * 1000, // 15 minutes
  sseKeepaliveMs: 15_000,
  maxReplayEvents: 1000,
} as const;

// SSRF protection: blocked IP ranges. From architecture.md Security Architecture.
export const BLOCKED_CIDRS = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '0.0.0.0/8',
  '169.254.0.0/16',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
] as const;

// OGC Conformance Class URIs — Part 1 (OGC 23-001)
export const CS_PART1_CONF = {
  CORE: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
  SYSTEM: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
  SUBSYSTEM: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subsystem',
  DEPLOYMENT: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/deployment',
  SUBDEPLOYMENT: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/subdeployment',
  PROCEDURE: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/procedure',
  SAMPLING_FEATURE: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/sf',
  PROPERTY: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/property',
  ADVANCED_FILTERING: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/advanced-filtering',
  CRUD: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete',
  UPDATE: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/update',
  GEOJSON: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/geojson',
  SENSORML: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/sensorml',
  API_COMMON: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/api-common',
} as const;

// OGC Conformance Class URIs — Part 2 (OGC 23-002)
export const CS_PART2_CONF = {
  COMMON: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/api-common',
  DATASTREAM: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/datastream',
  CONTROLSTREAM: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/controlstream',
  FEASIBILITY: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/feasibility',
  SYSTEM_EVENT: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/system-event',
  SYSTEM_HISTORY: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/system-history',
  ADVANCED_FILTERING: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/advanced-filtering',
  CRUD: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/create-replace-delete',
  UPDATE: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/update',
  JSON: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/json',
  SWE_JSON: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/swecommon-json',
  SWE_TEXT: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/swecommon-text',
  SWE_BINARY: 'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/swecommon-binary',
} as const;

// OGC Parent Standard Conformance Class URIs
export const PARENT_CONF = {
  COMMON_CORE: 'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core',
  COMMON_JSON: 'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/json',
  COMMON_HTML: 'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/html',
  COMMON_OAS30: 'http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/oas30',
  FEATURES_CORE: 'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
  FEATURES_GEOJSON: 'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson',
} as const;
