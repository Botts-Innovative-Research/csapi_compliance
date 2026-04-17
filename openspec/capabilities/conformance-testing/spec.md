# Conformance Testing — Specification

> Version: 1.0 | Status: Implemented | Last updated: 2026-04-16

## Purpose

This capability defines the conformance test execution engine for the CS API Compliance Assessor. It covers the validation logic for every conformance class defined in OGC 23-001 (Connected Systems API Part 1) and its parent standards (OGC API Common Part 1, OGC API Features Part 1). The test engine issues HTTP requests against an Implementation Under Test (IUT), inspects response status codes, headers, and body structures, and produces per-requirement pass/fail/skip verdicts. This capability maps to PRD functional requirements FR-09 through FR-23.

## Functional Requirements

### REQ-TEST-001: OGC API Common Part 1 Tests (FR-09)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the OGC API Common Part 1 conformance class:
  1. **Landing page structure** -- `GET /` returns HTTP 200 with a JSON body containing `title` (string), `description` (string), and `links` (array of link objects each with `href`, `rel`, and `type`).
  2. **Landing page required link relations** -- Per OGC API - Common Part 1 (19-072) `/req/core/root-success`, the landing page `links` array SHALL include (a) a link to the API definition with `rel: "service-desc"` OR `rel: "service-doc"`, AND (b) a link to the conformance declaration with `rel: "conformance"`. The relation `rel: "self"` appears in the informative example landing page in the spec but is NOT a normative requirement and SHALL NOT be asserted as mandatory.
  3. **Conformance endpoint** -- `GET /conformance` returns HTTP 200 with a JSON body containing `conformsTo` (array of URI strings).
  4. **JSON encoding** -- All tested endpoints return `Content-Type: application/json` (or a compatible media type with `+json` suffix) when requested with `Accept: application/json`.
  5. **API definition link** -- The landing page `links` array contains at least one entry with EITHER `rel: "service-desc"` (machine-readable, typically OpenAPI) OR `rel: "service-doc"` (human-readable, typically HTML) whose `href` resolves (GET returns HTTP 200) with a non-empty response body. `service-desc` is preferred when both are present. This aligns with OGC API - Common Part 1 (19-072) `/req/landing-page/root-success` which permits either relation to satisfy the API-definition requirement. Absence of BOTH is the FAIL condition — absence of only one produces PASS via the fallback. **Structural-check tradeoff**: the response-body assertion is deliberately lax (non-empty only). A stricter check that required an `openapi` field would regress the `service-doc` path (which serves HTML, not OpenAPI); a stricter check that required valid HTML would regress `service-desc`. "Non-empty body" is the strongest assertion compatible with both rels, at the cost of admitting pathological bodies (e.g. a single space-character body would still FAIL because `trim().length === 0`, but a body of "Hello" would pass). See SCENARIO-API-DEF-FALLBACK-001.
- **Rationale**: OGC API Common Part 1 is a prerequisite for all other conformance classes. If these tests fail, dependent classes cannot be reliably assessed. The normative link-relation list is narrow (API definition OR API doc, plus conformance); asserting additional example relations such as `self` as required causes false-positive failures against real-world conformant servers (see issue #3).

### REQ-TEST-002: OGC API Features Part 1 Core Tests (FR-10)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the OGC API Features Part 1 Core conformance class:
  1. **Collections endpoint** -- `GET /collections` returns HTTP 200 with a JSON body containing `collections` (array) where each entry has `id` (string), `title` (string), and `links` (array).
  2. **Single collection access** -- For at least one collection, `GET /collections/{collectionId}` returns HTTP 200 with a JSON body containing `id`, `title`, and `links`.
  3. **Items endpoint with limit** -- `GET /collections/{collectionId}/items?limit=10` returns HTTP 200 with a JSON body containing `type: "FeatureCollection"`, `features` (array with at most 10 entries), and `numberMatched` or `numberReturned`.
  4. **Single feature access** -- For at least one feature, `GET /collections/{collectionId}/items/{featureId}` returns HTTP 200 with a JSON body containing `type: "Feature"`, `id`, `geometry`, and `properties`.
  5. **Items response links (REQ-TEST-002.5)** -- Items response SHALL include a link with `rel="self"` pointing to the response itself. This assertion cites OGC API Features Part 1 (OGC 17-069r4) §7.15 Requirement 28 `/req/core/fc-links` A, which normatively states "The response SHALL include a link to this resource (i.e. `self`)." Unlike the Common landing-page `self` (which is example-only — see issue #3 and SCENARIO-LINKS-NORMATIVE-001), `self` on the Features items response IS normative. See SCENARIO-FEATURES-LINKS-001.
  6. **GeoJSON response structure** -- Items endpoint responses conform to GeoJSON FeatureCollection schema; individual feature responses conform to GeoJSON Feature schema.
- **Rationale**: OGC API Features Part 1 Core provides the collection and item access patterns that all CS API resource types inherit.

### REQ-TEST-CITE-002: Source-Citation for Link-Relation Assertions
- **Priority**: MUST
- **Status**: Implemented 2026-04-17 — sprint `rubric-6-1-sweep` audited the remaining 7 registry files (`procedures.ts`, `properties.ts`, `sampling.ts`, `deployments.ts`, `system-features.ts`, `subsystems.ts`, `subdeployments.ts`) plus re-audited `common.ts`. Findings per file: (a) for the 5 single-resource modules, `rel="self"` at canonical URLs (`/systems/{id}`, `/deployments/{id}`, `/procedures/{id}`, `/properties/{id}`, `/samplingFeatures/{id}`) is NOT normatively required by OGC 23-001 `/req/<X>/canonical-url` (which only mandates `rel="canonical"` on non-canonical URLs); (b) for subsystems/subdeployments, `rel="parent"`/`rel="up"` on child resources is NOT normatively required by OGC 23-001 `/req/sub<Y>/recursive-assoc` (which governs recursive aggregation of child-resource associations on the parent). All 7 assertions are downgraded from FAIL to SKIP-with-reason per GH #3 precedent; inline citation comments point at `docs.ogc.org/is/23-001/23-001.html`. Additionally, a latent deviation was found and documented: `testApiDefinition` in `common.ts` requires `rel="service-desc"` only whereas OGC 19-072 `/req/core/root-success` permits `service-desc` OR `service-doc` — logged as `api-definition-service-doc-fallback` in `ops/known-issues.md`, deferred to a follow-up sprint. Regression tests at `tests/unit/engine/registry/registry-links-normative.test.ts` lock in the citation pattern for all 7 modules (28 tests).
- **Description**: Every conformance assertion in `src/engine/registry/**/*.ts` that requires the presence of a specific `rel=*` link SHALL include an inline comment immediately above the assertion citing the normative source: either a `/req/...` requirement identifier or a direct OGC-spec section reference (e.g., "OGC 17-069r4 §7.15 Requirement 28"). If the cited source is only an illustrative example (not a SHALL/MUST/REQUIRED clause), the assertion SHALL NOT flag absence as a FAIL — consistent with the fix applied to issue #3.
- **Rationale**: Raze Section 6.1 rubric demands that every assertion be traceable to a normative clause. Explicit citation in the source code makes the review mechanical: a grep for "rel=" that has no nearby citation is a candidate for audit. This requirement was generalized from the GH #3 fix and the sprint user-testing-followup audit of `features-core.ts`.
- **Verification**: `grep -rn "rel.*===\|foundRels\.has\|l\.rel" src/engine/registry/` — every match has an adjacent `OGC \d{2}-\d+` or `/req/...` citation comment.

### REQ-TEST-003: CS API Core Tests (FR-11)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the CS API Core conformance class (`/req/core`):
  1. **Resource endpoint availability** -- The landing page `links` array contains entries with `rel` values pointing to CS API resource collections (systems, deployments, procedures, sampling features, properties).
  2. **Link relations** -- Each resource representation includes `links` entries with at minimum `self` and `alternate` relations.
  3. **Base response structures** -- All resource responses include the required CS API base members: `id` (string), `type` (string matching the resource kind), and `links` (array of link objects with `href`, `rel`, `type`, and optional `title`).
- **Rationale**: CS API Core defines the foundational patterns shared by all CS API resource types.

### REQ-TEST-004: System Features Tests (FR-12)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the System Features conformance class (`/req/system`):
  1. **System collection availability** -- `GET /collections/systems` (or the collection whose `id` matches the system collection) returns HTTP 200.
  2. **System items listing** -- `GET /collections/systems/items` returns HTTP 200 with `type: "FeatureCollection"` and a `features` array.
  3. **Canonical system URL** -- For at least one system, `GET /systems/{systemId}` returns HTTP 200 with the system resource representation.
  4. **System schema validation** -- The system resource body validates against the CS API system JSON schema (required fields: `id`, `type`, `properties` containing at minimum `name` and `description`).
  5. **System links** -- The system resource contains `links` entries for related resources: deployments (`rel: "deployments"` or equivalent), subsystems (`rel: "subsystems"`), sampling features, datastreams, and command streams where supported.
- **Rationale**: Systems are the primary resource type in the CS API. Correct system resource structure is essential for downstream conformance classes.

### REQ-TEST-005: Subsystems Tests (FR-13)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Subsystems conformance class (`/req/subsystem`):
  1. **Subsystem association link** -- At least one system resource contains a `links` entry with `rel: "subsystems"` whose `href` is a valid URL.
  2. **Subsystem collection endpoint** -- `GET {subsystems-href}` returns HTTP 200 with `type: "FeatureCollection"` and a `features` array where each entry has `type: "Feature"` and system-compatible structure.
  3. **Recursive subsystem search** -- If the implementation supports recursive search, `GET /systems?recursive=true` or equivalent does not return HTTP 4xx/5xx (the parameter is accepted even if the result set is the same as non-recursive).
- **Rationale**: Subsystem associations enable hierarchical system composition, a key CS API modeling pattern.

### REQ-TEST-006: Deployment Features Tests (FR-14)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Deployment Features conformance class (`/req/deployment`):
  1. **Deployment collection availability** -- `GET /collections/deployments` (or the deployment collection endpoint) returns HTTP 200.
  2. **Deployment items listing** -- `GET /collections/deployments/items` returns HTTP 200 with `type: "FeatureCollection"` and a `features` array.
  3. **Canonical deployment URL** -- For at least one deployment, `GET /deployments/{deploymentId}` returns HTTP 200 with the deployment resource representation.
  4. **Deployment schema validation** -- The deployment resource body validates against the CS API deployment JSON schema (required fields: `id`, `type`, `properties` containing deployment-specific members).
  5. **Deployment links** -- The deployment resource contains `links` entries for deployed systems (`rel: "deployedSystems"` or equivalent) and subdeployments (`rel: "subdeployments"`) where supported.
- **Rationale**: Deployments represent the physical or operational instantiation of systems at a location and time.

### REQ-TEST-007: Subdeployments Tests (FR-15)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Subdeployments conformance class (`/req/subdeployment`):
  1. **Subdeployment association link** -- At least one deployment resource contains a `links` entry with `rel: "subdeployments"` whose `href` is a valid URL.
  2. **Subdeployment collection endpoint** -- `GET {subdeployments-href}` returns HTTP 200 with `type: "FeatureCollection"` and a `features` array where each entry has deployment-compatible structure.
  3. **Recursive subdeployment search** -- If the implementation supports recursive search, `GET /deployments?recursive=true` or equivalent does not return HTTP 4xx/5xx.
- **Rationale**: Subdeployment associations enable hierarchical deployment composition.

### REQ-TEST-008: Procedure Features Tests (FR-16)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Procedure Features conformance class (`/req/procedure`):
  1. **Procedure collection availability** -- `GET /collections/procedures` (or the procedure collection endpoint) returns HTTP 200.
  2. **Procedure items listing** -- `GET /collections/procedures/items` returns HTTP 200 with `type: "FeatureCollection"` and a `features` array.
  3. **Canonical procedure URL** -- For at least one procedure, `GET /procedures/{procedureId}` returns HTTP 200 with the procedure resource representation.
  4. **Procedure schema validation** -- The procedure resource body validates against the CS API procedure JSON schema (required fields: `id`, `type`, `properties`).
  5. **Procedure links** -- The procedure resource contains a `links` array with at minimum `self` and `alternate` link relations.
- **Rationale**: Procedures define the methods or algorithms used by systems to produce observations or execute commands.

### REQ-TEST-009: Sampling Features Tests (FR-17)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Sampling Features conformance class (`/req/sampling`):
  1. **Sampling feature collection availability** -- `GET /collections/samplingFeatures` (or the sampling feature collection endpoint) returns HTTP 200.
  2. **Sampling feature items listing** -- `GET /collections/samplingFeatures/items` returns HTTP 200 with `type: "FeatureCollection"` and a `features` array.
  3. **Canonical sampling feature URL** -- For at least one sampling feature, `GET /samplingFeatures/{featureId}` returns HTTP 200 with the resource representation.
  4. **Sampling feature schema validation** -- The sampling feature resource body validates against the CS API sampling feature JSON schema (required fields: `id`, `type`, `geometry`, `properties`).
  5. **Parent system association** -- The sampling feature resource contains a `links` entry with `rel` indicating the parent system, or the `properties` object contains a `system` reference (URI or inline).
- **Rationale**: Sampling features describe the spatial or physical context where observations are made, and must be linked to their parent system.

### REQ-TEST-010: Property Definitions Tests (FR-18)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Property Definitions conformance class (`/req/property`):
  1. **Property collection availability** -- `GET /collections/properties` (or the property collection endpoint) returns HTTP 200.
  2. **Property items listing** -- `GET /collections/properties/items` returns HTTP 200 with `type: "FeatureCollection"` and a `features` array.
  3. **Canonical property URL** -- For at least one property definition, `GET /properties/{propertyId}` returns HTTP 200 with the property resource representation.
  4. **Property schema validation** -- The property resource body validates against the CS API property JSON schema (required fields: `id`, `type`, `properties` containing `definition` or `label`).
- **Rationale**: Property definitions provide semantic identifiers for observed or controllable quantities.

### REQ-TEST-011: Advanced Filtering Tests (FR-19)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Advanced Filtering conformance class (`/req/advanced-filtering`):
  1. **Temporal filter (`datetime`)** -- `GET /collections/{collectionId}/items?datetime={ISO8601-interval}` returns HTTP 200 with a valid FeatureCollection. The test engine SHALL verify the parameter is accepted (not rejected with HTTP 400) and, when possible, confirm that returned features fall within the specified time range.
  2. **Spatial filter (`bbox`)** -- `GET /collections/{collectionId}/items?bbox={minLon},{minLat},{maxLon},{maxLat}` returns HTTP 200 with a valid FeatureCollection. The test engine SHALL verify that returned features have geometries intersecting the bounding box, where geometry is non-null.
  3. **Keyword filter (`q`)** -- `GET /collections/{collectionId}/items?q={keyword}` returns HTTP 200 (or HTTP 400 if the parameter is not supported, which is acceptable as `q` is optional in some profiles). If HTTP 200, the response is a valid FeatureCollection.
  4. **CS-API-specific query parameters** -- For each CS-API-specific filter parameter applicable to the collection type (e.g., `procedure`, `foi`, `observedProperty` for observation collections), `GET /collections/{collectionId}/items?{param}={value}` returns HTTP 200 with a valid FeatureCollection, or HTTP 400 with a descriptive error if the parameter is not supported.
- **Rationale**: Filtering is essential for practical use of CS API endpoints that may contain large volumes of data.

### REQ-TEST-012: Create/Replace/Delete Tests (FR-20)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Create/Replace/Delete conformance class (`/req/crud`):
  1. **Create resource (POST)** -- `POST /collections/{collectionId}/items` with a valid resource body returns HTTP 201 with a `Location` header pointing to the newly created resource. `GET {Location}` returns HTTP 200 with the created resource.
  2. **Replace resource (PUT)** -- `PUT /collections/{collectionId}/items/{id}` with a complete, modified resource body returns HTTP 200 or HTTP 204. `GET /collections/{collectionId}/items/{id}` confirms the resource reflects the replacement.
  3. **Delete resource (DELETE)** -- `DELETE /collections/{collectionId}/items/{id}` returns HTTP 200 or HTTP 204. `GET /collections/{collectionId}/items/{id}` subsequently returns HTTP 404.
  4. **Error on non-existent resource** -- `PUT /collections/{collectionId}/items/{nonExistentId}` returns HTTP 404 (or HTTP 201 if the server supports upsert). `DELETE /collections/{collectionId}/items/{nonExistentId}` returns HTTP 404.
- **Rationale**: CRUD operations are destructive and must be validated carefully. These tests confirm correct status codes and resource lifecycle behavior.

### REQ-TEST-013: Write-Operation Opt-In Requirement (FR-20, FR-21)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL NOT execute any write-operation tests (POST, PUT, PATCH, DELETE) unless the user has explicitly opted in by selecting the corresponding conformance class (Create/Replace/Delete or Update) in the class selection UI. When a write-operation class is selected, the system SHALL display a warning message stating: "These tests will create, modify, and delete resources on the target endpoint. Only run against a test or staging environment."
- **Rationale**: Write operations mutate data on the IUT. Accidental execution against a production endpoint could cause data loss.

### REQ-TEST-014: Update Tests (FR-21)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Update conformance class (`/req/update`):
  1. **Partial update (PATCH)** -- `PATCH /collections/{collectionId}/items/{id}` with a partial JSON body (containing only the fields to modify) returns HTTP 200 or HTTP 204. `GET /collections/{collectionId}/items/{id}` confirms the patched fields are updated and non-patched fields are unchanged.
  2. **PATCH Content-Type** -- The PATCH request is sent with `Content-Type: application/merge-patch+json` (RFC 7396) or `Content-Type: application/json-patch+json` (RFC 6902), depending on server support. The test engine SHALL attempt `merge-patch+json` first and fall back to `json-patch+json` if the server responds with HTTP 415 (Unsupported Media Type).
  3. **PATCH on non-existent resource** -- `PATCH /collections/{collectionId}/items/{nonExistentId}` returns HTTP 404.
- **Rationale**: PATCH provides efficient partial updates without requiring a full resource replacement.

### REQ-TEST-015: GeoJSON Format Tests (FR-22)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the GeoJSON Format conformance class (`/req/geojson`):
  1. **Content-Type header** -- When requesting a collection items endpoint with `Accept: application/geo+json`, the response returns `Content-Type: application/geo+json` (or a compatible subtype).
  2. **FeatureCollection structure** -- The items endpoint response body contains `type: "FeatureCollection"` and `features` (array).
  3. **Feature structure** -- Each feature in the `features` array (and individual feature responses) contains the required GeoJSON members: `type: "Feature"`, `id` (string or integer), `geometry` (GeoJSON geometry object or null), and `properties` (object).
  4. **Geometry validity** -- If `geometry` is non-null, it contains `type` (one of Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection) and `coordinates` (array of appropriate depth for the geometry type).
- **Rationale**: GeoJSON is the default response encoding for OGC API Features and CS API resources with spatial extent.

### REQ-TEST-016: SensorML JSON Format Tests (FR-23)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the SensorML JSON Format conformance class (`/req/sensorml`):
  1. **Content-Type header** -- When requesting a system or procedure resource with `Accept: application/sml+json`, the response returns `Content-Type: application/sml+json` (or a compatible subtype). If the server does not support this media type, it returns HTTP 406 (Not Acceptable) and the test is marked as SKIP with reason "SensorML JSON not supported by server."
  2. **SensorML JSON structure** -- The response body contains the required SensorML JSON members: `type` (e.g., `"PhysicalSystem"`, `"SimpleProcess"`), `id`, and relevant SensorML sections (e.g., `identification`, `classification`, `inputs`, `outputs`).
  3. **Schema validation** -- The response body validates against the SensorML JSON schema. The test engine SHALL validate using the canonical SensorML JSON schema or a locally bundled copy derived from the OGC SensorML 2.1 / JSON encoding specification.
- **Rationale**: SensorML JSON is an alternative encoding for systems and procedures that provides richer metadata than GeoJSON.

### REQ-TEST-017: Conformance Class Not Declared Handling
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: When a conformance class is not listed in the IUT's `/conformance` response AND the user has not manually selected it for testing, the test engine SHALL skip all tests for that class and report each test with status SKIP and reason "Conformance class not declared by server."
- **Rationale**: Testing undeclared conformance classes produces misleading results. Servers are not required to implement all classes.

### REQ-TEST-018: Dependency Failure Handling
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL enforce conformance class dependency ordering. When a prerequisite class fails (any test in the class produces a FAIL verdict), all tests in dependent classes SHALL be skipped with reason "Dependency class '{className}' failed." The dependency graph is:
  - OGC API Common Part 1 is a prerequisite for OGC API Features Part 1 Core.
  - OGC API Features Part 1 Core is a prerequisite for CS API Core.
  - CS API Core is a prerequisite for: System Features, Deployment Features, Procedure Features, Sampling Features, Property Definitions, Advanced Filtering, GeoJSON Format, SensorML Format.
  - System Features is a prerequisite for: Subsystems.
  - Deployment Features is a prerequisite for: Subdeployments.
  - CS API Core is a prerequisite for: Create/Replace/Delete, Update.
- **Rationale**: Running tests whose prerequisites have failed produces noisy, unhelpful results and wastes time.

### REQ-TEST-019: Test Verdict Production
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Each individual test executed by the test engine SHALL produce exactly one of three verdicts:
  - **PASS** -- The requirement is satisfied. The HTTP response status code, headers, and body all match expectations.
  - **FAIL** -- The requirement is violated. The test SHALL include a human-readable failure reason referencing the specific assertion that failed (e.g., "Expected status 200 but received 404 for GET /collections/systems/{id}").
  - **SKIP** -- The test could not be executed. The test SHALL include a reason (e.g., "Conformance class not declared", "Dependency class failed", "No resources available to test against", "SensorML JSON not supported by server").
- **Rationale**: A three-state verdict model ensures every test produces an actionable result with no ambiguity.

### REQ-TEST-020: Empty Collection Handling
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: When a resource collection is empty (the items endpoint returns an empty `features` array), the test engine SHALL skip tests that require an existing resource (e.g., single-resource access, schema validation on a resource body, link inspection) with reason "Collection is empty; no resources available to test." The collection-level tests (collection endpoint availability, items endpoint returning valid FeatureCollection) SHALL still execute normally.
- **Rationale**: An empty collection is a valid server state and should not cause test failures for resource-level checks.

### REQ-SCHEMA-001: Bundled OGC Schemas are Fully Resolved (FR-09, FR-10, FR-11)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Every JSON schema bundled under `schemas/` SHALL have its `$ref` targets resolvable without network access. For every `$ref` value in every bundled schema, the target SHALL either (a) resolve to another file within the bundle (by relative path or by matching an `$id` of another bundled schema), or (b) be a pure fragment (`#...`) within the same file. The fetch pipeline (`scripts/fetch-schemas.ts`) SHALL walk every fetched schema's refs recursively, enqueue transitively-referenced files, and continue fetching until the closure is stable. The resulting bundle is covered by a Gate 1 integrity test (`tests/unit/engine/schema-bundle-integrity.test.ts`) so regressions are caught mechanically.
- **Rationale**: Issue #4 — `dataStream_create.json`'s `$ref: "dataStream.json"` resolved but `dataStream.json`'s `$ref: "../../../../../common/timePeriod.json"` dangled. Schema validation silently weakened; invalid bodies passed. A closed, integrity-checked bundle restores validator fidelity.

### REQ-CRUD-001: CRUD Request Bodies Validate Against OGC Create-Schemas (FR-20)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Every CRUD conformance test that POSTs a resource body SHALL use a body that passes JSON Schema validation against the corresponding OGC `*_create.json` schema at test-authoring time. Module-owned body builders (`DATASTREAM_CREATE_BODY`, `CONTROLSTREAM_CREATE_BODY`, etc. in `src/engine/registry/part2-crud.ts`) SHALL be unit-tested against the bundled schema so that schema evolution or body drift produces a failing test, not a silent server-side rejection during live assessments.
- **Rationale**: Issue #6 — the previous minimal Datastream create body (`name`, `outputName`, `schema.obsFormat` only) failed validation against `dataStream_create.json` once the schema closure was restored (REQ-SCHEMA-001). A compliant server SHOULD reject the malformed body, and the conformance test was therefore not exercising create-replace-delete.

### REQ-PART2-BASEURL-001: Part 2 Tests Preserve the IUT Base Path (FR-11)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Every Part 2 test module SHALL construct outbound request URLs using `new URL(relativePath, ctx.baseUrl)` where `relativePath` does NOT begin with a slash. This guarantees the full path segment of the IUT base URL (e.g. `/sensorhub/api/`) is preserved. A leading slash makes WHATWG URL resolution strip the base path, rerouting requests to the origin root. The invariant is covered by `tests/unit/engine/registry/part2-url-construction.test.ts`, which asserts every outbound URL emitted by every Part 2 module begins with the configured IUT base URL.
- **Rationale**: Issue #5 — the Part 1 URL fix in commit 168c032 rewrote leading-slash patterns to relative paths across all Part 1 modules but missed `part2-common.ts` (`['/datastreams', '/observations', ...]`), `crud.ts` (`testCrudLifecycle(…, '/systems')`), and `update.ts`. Assessments against IUTs with non-root base paths silently hit the wrong URLs and returned 404s.

### REQ-TEST-021: Test Cleanup for Write Operations
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: After executing Create/Replace/Delete or Update tests, the test engine SHOULD attempt to delete any resources it created during testing, restoring the IUT to its pre-test state. If cleanup fails, the test engine SHALL log a warning including the IDs and URLs of resources that could not be removed.
- **Rationale**: Leaving test artifacts on the IUT is undesirable, especially if the user inadvertently runs write tests against a shared environment.

## Acceptance Scenarios

### SCENARIO-TEST-PASS-001: All Tests Pass for a Fully Conformant Server
- **Priority**: CRITICAL
- **References**: REQ-TEST-001 through REQ-TEST-016, REQ-TEST-019
- **Preconditions**: The IUT declares all testable conformance classes in its `/conformance` response. All resource collections contain at least one resource. Write-operation tests are opted into by the user.

**Given** a CS API endpoint at `https://example.org/csapi` that fully conforms to OGC 23-001 Part 1
**When** the test engine executes all conformance class tests with write operations enabled
**Then** every test produces a PASS verdict, no test produces FAIL or SKIP, and the per-class results show 100% pass rate for each conformance class

### SCENARIO-TEST-PASS-002: Parent Standard Tests Pass, CS API Class Fails
- **Priority**: CRITICAL
- **References**: REQ-TEST-001, REQ-TEST-002, REQ-TEST-004, REQ-TEST-019
- **Preconditions**: The IUT passes OGC API Common Part 1 and Features Part 1 Core tests. The system collection endpoint returns an invalid schema (missing required `properties.name`).

**Given** a CS API endpoint where `GET /systems/{systemId}` returns a body missing the required `properties.name` field
**When** the test engine executes the System Features conformance class tests
**Then** the "System schema validation" test produces a FAIL verdict with reason containing "missing required field 'name' in properties" and all OGC API Common Part 1 and Features Part 1 Core tests produce PASS verdicts

### SCENARIO-API-DEF-FALLBACK-001: API Definition Link Accepts Either service-desc Or service-doc
- **Priority**: CRITICAL
- **References**: REQ-TEST-001 (item 5)
- **Preconditions**: The IUT's landing page includes an API-definition link using either `rel: "service-desc"` (machine-readable, typically OpenAPI) or `rel: "service-doc"` (human-readable, typically HTML). OGC API Common Part 1 (19-072) `/req/landing-page/root-success` permits either relation.

**Given** a conformant landing page whose `links` array contains `rel: "service-doc"` but no `rel: "service-desc"`
**When** the test engine executes the "API Definition Link" test (REQ_API_DEFINITION, item 5 of REQ-TEST-001)
**Then** the test produces PASS because the fallback lookup finds the `service-doc` link, fetches it (HTTP 200), and verifies a non-empty body; AND a landing page with `rel: "service-desc"` only also produces PASS (`service-desc` is preferred when both are present); AND a landing page with BOTH produces PASS and the `service-desc` URL is the one fetched; AND a landing page with NEITHER produces FAIL with a message naming both rels.

### SCENARIO-LINKS-NORMATIVE-001: Landing Page Links Test Respects Normative /req/core/root-success Only
- **Priority**: CRITICAL
- **References**: REQ-TEST-001 (item 2), REQ-TEST-019
- **Preconditions**: The IUT returns a conformant landing page per OGC API Common Part 1 (19-072) `/req/core/root-success`: it includes an API-definition link (`rel: "service-desc"` OR `rel: "service-doc"`) and a conformance link (`rel: "conformance"`), but omits the informative-example relation `rel: "self"`.

**Given** a landing page whose `links` array contains `rel: "service-desc"` and `rel: "conformance"` but no `rel: "self"`
**When** the test engine executes the "Landing page required link relations" test
**Then** the test produces a PASS verdict because `rel: "self"` is not listed as a normative requirement in 19-072 `/req/core/root-success` (it appears only as an illustrative example); AND a landing page that substitutes `rel: "service-doc"` for `rel: "service-desc"` also produces PASS (the relation is an OR); AND a landing page missing `rel: "conformance"` produces FAIL with a message citing the missing `conformance` relation

### SCENARIO-FEATURES-LINKS-001: Items Response Self-Link Is Normative Per OGC 17-069 §7.15
- **Priority**: CRITICAL
- **References**: REQ-TEST-002 (item 5), REQ-TEST-CITE-002
- **Preconditions**: The IUT is being tested against OGC API Features Part 1 Core conformance class and serves items at `/collections/{id}/items`. The spec source is OGC 17-069r4 §7.15 Requirement 28 `/req/core/fc-links` A: "The response SHALL include a link to this resource (i.e. `self`) and to the alternate representations of this resource (`alternate`) (permitted only if the resource is represented in alternate formats)."

**Given** the `/req/ogcapi-features/items-links` rubric-6.1 audit was performed 2026-04-17 against OGC 17-069r4 §7.15
**When** a reviewer asks "is `self` a normative requirement here, or a spec example?"
**Then** the answer is NORMATIVE — the OGC text says "SHALL include a link ... (i.e. `self`)" — distinguishing this case from SCENARIO-LINKS-NORMATIVE-001 (where `self` on the Common landing page is example-only). The existing `testItemsLinks` assertion in `src/engine/registry/features-core.ts` is therefore retained, with an added source-citation comment per REQ-TEST-CITE-002 and regression tests in `tests/unit/engine/registry/features-core-links-normative.test.ts` that lock in: (a) PASS when items response includes `self`, (b) FAIL when `self` missing with a message citing the 17-069 §7.15 source, (c) PASS when the links array is non-empty and contains `self` even if other relations are absent (alternate/next/prev are conditional).

### SCENARIO-FEATURES-LINKS-002: Audit Trail For rel-Link Assertions
- **Priority**: MUST
- **References**: REQ-TEST-CITE-002
- **Preconditions**: A code-review tool (Raze sub-agent or human reviewer) is auditing `src/engine/registry/**/*.ts` for link-relation assertions.

**Given** the reviewer greps `foundRels.has('...')` or `rel === '...'` across `src/engine/registry/`
**When** the reviewer finds each assertion site
**Then** the lines immediately above the assertion contain either (a) a `/req/...` requirement identifier that can be cross-referenced to an OGC spec section, or (b) an explicit OGC-document section citation (e.g., `OGC 17-069r4 §7.15 Requirement 28`); AND grep for `rel=` in the codebase produces zero matches where the cited source is only an informative example; AND the project `ops/known-issues.md` has no pending rubric-6.1-follow-up entry naming any of the audited files

### SCENARIO-TEST-SKIP-001: Conformance Class Not Declared by Server
- **Priority**: CRITICAL
- **References**: REQ-TEST-017
- **Preconditions**: The IUT's `/conformance` response does not include the SensorML JSON Format conformance class URI. The user has not manually selected SensorML for testing.

**Given** a CS API endpoint whose `/conformance` `conformsTo` array does not contain the SensorML JSON Format class URI
**When** the test engine determines which tests to execute
**Then** all SensorML JSON Format tests are assigned SKIP status with reason "Conformance class not declared by server" and no HTTP requests are made for SensorML-specific tests

### SCENARIO-TEST-SKIP-002: Dependency Failure Cascades to Dependent Classes
- **Priority**: CRITICAL
- **References**: REQ-TEST-018
- **Preconditions**: The IUT declares CS API Core and System Features conformance classes. CS API Core tests fail because the landing page lacks required link relations.

**Given** a CS API endpoint where the CS API Core test "Resource endpoint availability" fails because required link relations are missing
**When** the test engine evaluates the dependency graph after CS API Core tests complete
**Then** all tests in System Features, Deployment Features, Procedure Features, Sampling Features, Property Definitions, Advanced Filtering, GeoJSON Format, SensorML Format, Create/Replace/Delete, and Update classes are assigned SKIP status with reason "Dependency class 'CS API Core' failed" and no HTTP requests are made for those classes

### SCENARIO-TEST-SKIP-003: Empty Collection Skips Resource-Level Tests
- **Priority**: NORMAL
- **References**: REQ-TEST-020
- **Preconditions**: The IUT's system collection exists but contains zero items.

**Given** a CS API endpoint where `GET /collections/systems/items` returns `{"type":"FeatureCollection","features":[]}`
**When** the test engine executes System Features tests
**Then** the "System collection availability" and "System items listing" tests produce PASS verdicts, and the "Canonical system URL", "System schema validation", and "System links" tests produce SKIP verdicts with reason "Collection is empty; no resources available to test"

### SCENARIO-TEST-WARN-001: Write-Operation Opt-In Warning Displayed
- **Priority**: CRITICAL
- **References**: REQ-TEST-013
- **Preconditions**: The user is on the class selection UI and selects the Create/Replace/Delete conformance class.

**Given** a user viewing the conformance class selection interface
**When** the user selects the "Create/Replace/Delete" or "Update" conformance class for testing
**Then** the system displays a warning message containing the text "These tests will create, modify, and delete resources on the target endpoint. Only run against a test or staging environment." and the user must acknowledge the warning before the assessment can proceed

### SCENARIO-TEST-WARN-002: Write Operations Not Executed Without Opt-In
- **Priority**: CRITICAL
- **References**: REQ-TEST-013
- **Preconditions**: The user has not selected write-operation conformance classes. The IUT declares CRUD support in its conformance response.

**Given** a CS API endpoint that declares `/req/crud` and `/req/update` in its conformance classes
**When** the test engine runs with default class selection (write-operation classes not opted into)
**Then** all Create/Replace/Delete and Update tests are assigned SKIP status with reason "Write-operation tests require explicit opt-in" and no POST, PUT, PATCH, or DELETE requests are made to the IUT

### SCENARIO-TEST-CRUD-001: Full Create-Read-Update-Delete Lifecycle
- **Priority**: NORMAL
- **References**: REQ-TEST-012, REQ-TEST-014, REQ-TEST-021
- **Preconditions**: Write-operation tests are opted into. The IUT supports CRUD and Update conformance classes.

**Given** a CS API endpoint with CRUD support and the user has opted into write-operation tests
**When** the test engine executes the Create/Replace/Delete and Update test sequence
**Then** the engine creates a test resource via POST (verifying HTTP 201 and Location header), reads it back via GET (verifying HTTP 200 and matching body), patches it via PATCH (verifying HTTP 200 or 204 and field update), replaces it via PUT (verifying HTTP 200 or 204), and finally deletes it via DELETE (verifying HTTP 200 or 204 followed by HTTP 404 on re-fetch), and after all tests the engine attempts cleanup of any remaining test resources

### SCENARIO-TEST-GEOJSON-001: GeoJSON Content Negotiation and Validation
- **Priority**: NORMAL
- **References**: REQ-TEST-015
- **Preconditions**: The IUT supports GeoJSON encoding.

**Given** a CS API endpoint with at least one non-empty resource collection
**When** the test engine requests `GET /collections/{collectionId}/items` with `Accept: application/geo+json`
**Then** the response has `Content-Type: application/geo+json`, the body contains `type: "FeatureCollection"` with a `features` array, each feature contains `type: "Feature"`, `id`, `geometry`, and `properties`, and if geometry is non-null it has a valid `type` and `coordinates`

### SCENARIO-TEST-SENSORML-001: SensorML JSON Format Negotiation
- **Priority**: NORMAL
- **References**: REQ-TEST-016
- **Preconditions**: The IUT declares SensorML JSON Format support.

**Given** a CS API endpoint that declares `/req/sensorml` conformance and has at least one system resource
**When** the test engine requests `GET /systems/{systemId}` with `Accept: application/sml+json`
**Then** the response has `Content-Type: application/sml+json`, the body contains `type` (a valid SensorML type such as `"PhysicalSystem"`), `id`, and SensorML-specific sections, and the body validates against the SensorML JSON schema

### SCENARIO-TEST-SENSORML-002: SensorML Not Supported Graceful Skip
- **Priority**: NORMAL
- **References**: REQ-TEST-016, REQ-TEST-017
- **Preconditions**: The IUT does not support SensorML JSON encoding.

**Given** a CS API endpoint that does not support `application/sml+json` content negotiation
**When** the test engine requests a system resource with `Accept: application/sml+json` and receives HTTP 406
**Then** the SensorML JSON structure and schema validation tests are assigned SKIP status with reason "SensorML JSON not supported by server"

### SCENARIO-TEST-FILTER-001: Advanced Filtering Parameters Accepted
- **Priority**: NORMAL
- **References**: REQ-TEST-011
- **Preconditions**: The IUT declares Advanced Filtering conformance. At least one collection contains items with temporal and spatial extent.

**Given** a CS API endpoint with a non-empty system collection containing resources with temporal validity and geometry
**When** the test engine sends `GET /collections/systems/items?datetime=2024-01-01T00:00:00Z/2024-12-31T23:59:59Z` and `GET /collections/systems/items?bbox=-180,-90,180,90`
**Then** both requests return HTTP 200 with valid FeatureCollection responses and the `datetime` filtered results contain only features within the specified time range (where verifiable from response content)

### SCENARIO-TEST-DEPGRAPH-001: Full Dependency Chain Validation
- **Priority**: CRITICAL
- **References**: REQ-TEST-018
- **Preconditions**: The IUT fails the OGC API Common Part 1 tests (landing page returns invalid structure).

**Given** a CS API endpoint where `GET /` returns HTTP 200 but the body is missing the required `links` array
**When** the test engine executes OGC API Common Part 1 tests and at least one test FAILS
**Then** OGC API Features Part 1 Core tests are all SKIPPED with reason "Dependency class 'OGC API Common Part 1' failed", and CS API Core tests are all SKIPPED with reason "Dependency class 'OGC API Features Part 1 Core' failed" (transitive), and all subsequent CS API resource class tests are similarly SKIPPED

### SCENARIO-SCHEMA-REF-001: Every bundled $ref resolves locally
- **Priority**: CRITICAL
- **References**: REQ-SCHEMA-001

**Given** the schemas directory populated by `npx tsx scripts/fetch-schemas.ts`
**When** the Gate 1 integrity test walks every `.json` file and inspects every `$ref` value
**Then** every `$ref` either starts with `#` (pure fragment), resolves to another file in the bundle by relative path, or matches the `$id` of another bundled schema — no external or dangling targets remain

### SCENARIO-CRUD-BODY-001: CRUD request bodies pass schema validation at authoring time
- **Priority**: CRITICAL
- **References**: REQ-CRUD-001, REQ-SCHEMA-001

**Given** the CRUD body builders exported from `src/engine/registry/part2-crud.ts`
**When** a unit test loads the schema bundle and validates `DATASTREAM_CREATE_BODY` against `connected-systems-2/json/dataStream_create.json` and `CONTROLSTREAM_CREATE_BODY` against `connected-systems-2/json/controlStream_create.json`
**Then** both validations return `{ valid: true, errors: [] }` without the validator needing to fall back to permissive defaults

### SCENARIO-PART2-BASEURL-001: Part 2 tests keep the IUT base path
- **Priority**: CRITICAL
- **References**: REQ-PART2-BASEURL-001

**Given** a TestContext configured with `baseUrl = 'https://example.com/path/segment/api/'`
**When** every Part 2 conformance class test module runs its executable tests against a URL-capturing mock HTTP client
**Then** every captured request URL starts with `https://example.com/path/segment/api/…` — no request drops any path segment of the base URL

## Implementation Status (2026-03-31)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-TEST-001: OGC API Common Part 1 (6 reqs, 24 tests) — `registry/common.ts`
- REQ-TEST-002: OGC API Features Core (8 reqs, 31 tests) — `registry/features-core.ts`
- REQ-TEST-003: CS API Core (3 reqs, 15 tests) — `registry/csapi-core.ts`
- REQ-TEST-004: System Features (5 reqs, 30 tests) — `registry/system-features.ts`
- REQ-TEST-005: Subsystems (4 reqs, 21 tests) — `registry/subsystems.ts`
- REQ-TEST-006: Deployment Features (5 reqs, 26 tests) — `registry/deployments.ts`
- REQ-TEST-007: Subdeployments (4 reqs, 23 tests) — `registry/subdeployments.ts`
- REQ-TEST-008: Procedure Features (5 reqs, 24 tests) — `registry/procedures.ts`
- REQ-TEST-009: Sampling Features (5 reqs, 24 tests) — `registry/sampling.ts`
- REQ-TEST-010: Property Definitions (4 reqs, 21 tests) — `registry/properties.ts`
- REQ-TEST-011: Advanced Filtering (6 reqs, 28 tests) — `registry/filtering.ts`
- REQ-TEST-012/013: Create/Replace/Delete (6 reqs, 22 tests) — `registry/crud.ts`
- REQ-TEST-014: Update (3 reqs, 14 tests) — `registry/update.ts`
- REQ-TEST-015: GeoJSON Format (4 reqs, 21 tests) — `registry/geojson.ts`
- REQ-TEST-016: SensorML Format (3 reqs, 20 tests) — `registry/sensorml.ts`
- REQ-TEST-017 to REQ-TEST-021: Cross-cutting (dependency, verdicts, empty, cleanup)

### Deviations from Spec
- SensorML tests gracefully skip with 406 (optional encoding, per spec)
- CRUD tests use try/finally for cleanup even on assertion failure

### Deferred
- None — all 21 requirements implemented

## Change History

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-03-31 | Initial specification created | Covers PRD FR-09 through FR-23 conformance test execution requirements |
