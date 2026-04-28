# Test Engine Infrastructure -- Specification

> Version: 1.0 | Status: Frozen — v1.0 web app, superseded by ets-ogcapi-connectedsystems | Last updated: 2026-04-27
>
> **Frozen 2026-04-27.** TestNG + REST Assured replace the v1.0 TypeScript engine in the new ETS; see `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`.

## Purpose

The test engine provides the core mechanics that all conformance tests rely on: mapping tests to OGC requirement URIs, producing structured results, validating responses against JSON schemas, respecting dependency ordering between conformance classes, and traversing paginated collections. This capability does not define any individual conformance tests; it defines the infrastructure those tests execute within.

Covers PRD functional requirements FR-24 through FR-29.

## Functional Requirements

### REQ-ENG-001: One-to-One Test-Requirement Mapping
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Each executable test SHALL correspond to exactly one abstract test (requirement) identified by its canonical URI. The mapping follows the convention that a test at `/conf/{class}/{test-name}` validates the requirement at `/req/{class}/{test-name}`. No two tests SHALL map to the same requirement URI, and no test SHALL exist without a mapped requirement URI.
- **Rationale**: OGC conformance testing requires full traceability from test results back to normative requirement identifiers so that compliance reports are unambiguous. (PRD FR-24)

### REQ-ENG-002: Three-State Test Result
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Each test execution SHALL produce exactly one of three result states: **pass** (the requirement is satisfied), **fail** (the requirement is violated), or **skip** (the test could not be executed). The result state SHALL be represented as a string enum with values `"pass"`, `"fail"`, and `"skip"`. No other result states are permitted.
- **Rationale**: A well-defined result algebra is necessary for aggregation (class-level pass/fail) and downstream reporting. (PRD FR-25)

### REQ-ENG-003: Structured Failure Messages
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: When a test produces a `"fail"` result, the test engine SHALL record a human-readable failure message that includes: (a) the specific assertion that failed, (b) the expected value or condition, and (c) the actual value or condition observed. The message SHALL be sufficient for a developer to locate and diagnose the non-conformance without re-running the test. Example format: `"Expected status 200 but received 404 for GET /collections/systems/{id}"`.
- **Rationale**: Actionable failure messages reduce the time operators spend diagnosing compliance failures. (PRD FR-26)

### REQ-ENG-004: Skip Reason Recording
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: When a test produces a `"skip"` result, the test engine SHALL record a human-readable reason explaining why the test was skipped. Valid skip reasons include: the conformance class was not declared by the IUT, a prerequisite test failed, or a required resource was unavailable. The skip reason SHALL reference the specific unmet condition.
- **Rationale**: Skip reasons are essential for distinguishing "not applicable" from "broken dependency" in compliance reports. (PRD FR-25, FR-28)

### REQ-ENG-005: JSON Schema Validation via Ajv
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL validate HTTP response bodies against JSON schemas derived from the CS API OpenAPI definition (OGC 23-001 OpenAPI YAML). Validation SHALL use the Ajv library configured with strict mode and full format validation. Schema validation errors SHALL be collected and included in the test failure message, listing each validation error's JSON Pointer path, expected constraint, and actual value.
- **Rationale**: Machine-driven schema validation ensures response structure conformance is checked exhaustively rather than through ad-hoc field checks. (PRD FR-27)

### REQ-ENG-006: Schema Loading from OpenAPI Definition
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL load JSON schemas by dereferencing `$ref` pointers in the OGC 23-001 OpenAPI YAML definition. All `$ref` references SHALL be resolved before validation. The engine SHALL cache resolved schemas for the duration of an assessment run to avoid redundant parsing.
- **Rationale**: The CS API schemas are defined inline within the OpenAPI specification using `$ref`; the engine must resolve these to standalone schemas for Ajv consumption. (PRD FR-27)

### REQ-ENG-007: Conformance Class Dependency Ordering
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL maintain a directed acyclic graph (DAG) of conformance class dependencies. Before executing tests, the engine SHALL compute a topological execution order such that if class B depends on class A, all class A tests execute before any class B tests. The dependency graph SHALL be validated at startup; if a cycle is detected, the engine SHALL raise a configuration error and refuse to start.
- **Rationale**: OGC conformance classes form a dependency hierarchy; testing a dependent class before its prerequisite wastes time and produces misleading results. (PRD FR-28)

### REQ-ENG-008: Dependency Failure Cascading
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: If a conformance class fails (any test in the class produces a `"fail"` result), all conformance classes that directly or transitively depend on the failed class SHALL have their tests skipped. Each skipped test SHALL record a skip reason in the format: `"Dependency not met: conformance class '{class-uri}' failed"`. The skip reason SHALL identify the specific failed dependency class URI.
- **Rationale**: Running tests for a class whose prerequisites failed produces noise rather than signal; skipping with a clear reason preserves report clarity. (PRD FR-28)

### REQ-ENG-009: Pagination Traversal
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: When a collection endpoint returns a paginated response containing a `next` link (a link object with `rel: "next"` in the `links` array), the test engine SHALL follow the `next` link to retrieve subsequent pages. The engine SHALL continue following `next` links until either: (a) no `next` link is present in the response, or (b) the maximum page limit is reached (REQ-ENG-010). Each page response SHALL be independently validated.
- **Rationale**: Many CS API collections are paginated; tests must traverse all pages to validate completeness and structural consistency. (PRD FR-29)

### REQ-ENG-010: Pagination Safety Limits
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL enforce a configurable maximum page limit (default: 100 pages) when traversing paginated collections. If the page limit is reached before exhausting `next` links, the engine SHALL log a warning indicating that pagination was truncated and proceed with validation of the pages already retrieved. The engine SHALL also detect pagination loops (revisiting a previously seen URL) and terminate traversal immediately with a warning.
- **Rationale**: Unbounded pagination traversal could cause excessive runtime or infinite loops against misconfigured servers. (PRD FR-29, NFR-10)

### REQ-ENG-011: Request Timeout Enforcement
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL enforce the user-configured request timeout (default: 30 seconds, as specified in PRD FR-08) on every HTTP request made during test execution. If a request exceeds the timeout, the engine SHALL abort the request and record a test failure with the message: `"Request timed out after {timeout}ms for {method} {url}"`.
- **Rationale**: Unresponsive IUTs must not block the entire assessment run; bounded timeouts ensure the run completes in finite time. (PRD FR-08, NFR-10)

### REQ-ENG-012: Graceful Error Handling
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: If an individual test encounters a network error (connection refused, DNS resolution failure, TLS error), the test SHALL produce a `"fail"` result with a descriptive error message rather than terminating the assessment run. The error message SHALL include the error type and the request URL. The assessment SHALL continue executing remaining tests.
- **Rationale**: A single unreachable endpoint must not crash the entire assessment. (PRD NFR-10)

### REQ-SSRF-002: Opt-In Private-Network Allowlist
- **Priority**: MUST
- **Status**: Implemented 2026-04-16
- **Description**: The SSRF guard SHALL reject URLs targeting localhost (hostname `localhost`, `::1`, `[::1]`) and private/reserved IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 0.0.0.0/8, 169.254.0.0/16, fc00::/7, fe80::/10, ::1/128) by default. The operator MAY opt into accepting private-network IUTs by setting the environment variable `ALLOW_PRIVATE_NETWORKS=true` at server startup. When the opt-in is active: (a) the server log SHALL emit a prominent warning, (b) `GET /api/health` SHALL return `{allowPrivateNetworks: true}`, (c) the landing page SHALL display a "Local-dev mode" banner, (d) the client-side URL validator SHALL accept private addresses, (e) the server-side SSRF guard SHALL still block non-HTTP(S) schemes (file://, ftp://, data:, etc.). The default (unset or any value other than the literal string `true`) SHALL preserve the production-safe blocking behaviour.
- **Rationale**: Developers iterating on their own CS API implementations need to assess `http://localhost:4000` — the compliance tool is unusable for this primary workflow without an escape hatch. Gate 2 "Developer-testing-local-server" persona (github-issues-audit item 4). The env-var gate keeps production deployments safe: an unconfigured hosted instance cannot be tricked into fetching internal resources.

### SCENARIO-SSRF-LOCAL-001: Private-Network Opt-In Accepts Localhost
**GIVEN** the server was started with `ALLOW_PRIVATE_NETWORKS=true` in the environment
**WHEN** a user submits `http://localhost:8080/ogcapi` on the landing page
**THEN** the client-side validator accepts the URL (no "Private and reserved IP addresses are not allowed" message), the server-side SSRF guard accepts the URL, the discovery request is made, and the workflow proceeds normally; the landing page displays a "Local-dev mode" banner explaining the relaxation; non-HTTP(S) schemes (e.g., `ftp://localhost/`) are still rejected.

### SCENARIO-SSRF-LOCAL-002: Default Mode Still Blocks Private Networks
**GIVEN** the server was started without `ALLOW_PRIVATE_NETWORKS` (or with the flag set to any value other than `true`)
**WHEN** a user submits `http://192.168.1.50/api` on the landing page
**THEN** the client-side validator rejects it with the "Private and reserved IP addresses are not allowed" message; if bypassed (e.g., via curl to `POST /api/assessments`), the server-side SSRF guard returns HTTP 400 with an SsrfError message and no request is made to the target; the landing page does NOT display a "Local-dev mode" banner.

### REQ-ENG-013: Test Result Data Structure
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Each test result SHALL be represented as a structured object containing at minimum: (a) `requirementUri` -- the canonical requirement URI being tested, (b) `conformanceUri` -- the corresponding conformance test URI, (c) `status` -- one of `"pass"`, `"fail"`, or `"skip"`, (d) `message` -- failure reason or skip reason (empty string for pass), (e) `durationMs` -- test execution time in milliseconds, and (f) `timestamp` -- ISO 8601 timestamp of when the test completed.
- **Rationale**: A standardized result structure enables consistent aggregation, reporting, and export across all conformance classes.

### REQ-ENG-014: Conformance Class Result Aggregation
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL aggregate individual test results into conformance class results. A conformance class SHALL be considered `"pass"` only if all of its constituent tests produce `"pass"` results. If any test produces `"fail"`, the class result is `"fail"`. If all tests are `"skip"`, the class result is `"skip"`. If a mix of `"pass"` and `"skip"` results exist (with no failures), the class result is `"pass"`.
- **Rationale**: OGC conformance requires all requirements in a class to be met for class-level conformance. (PRD FR-36)

## Acceptance Scenarios

### SCENARIO-ENG-TRACE-001: Test-to-Requirement URI Mapping Is Verifiable
- **Priority**: CRITICAL
- **References**: REQ-ENG-001
- **Preconditions**: The test engine is loaded with all registered tests.

**Given** the test registry contains all implemented conformance tests
**When** the registry is inspected programmatically
**Then** every test has a non-empty `requirementUri` field matching the pattern `/req/{class}/{test-name}`, every test has a corresponding `conformanceUri` matching `/conf/{class}/{test-name}`, no two tests share the same `requirementUri`, and the total count of registered tests equals the total count of unique requirement URIs.

### SCENARIO-ENG-TRACE-002: Unregistered Test Detection
- **Priority**: CRITICAL
- **References**: REQ-ENG-001
- **Preconditions**: A test function exists that has not been assigned a requirement URI.

**Given** a test function that lacks a `requirementUri` annotation
**When** the test registry is loaded at startup
**Then** the engine SHALL reject the test with an error message `"Test '{testName}' has no requirementUri mapping"` and refuse to start the assessment run.

### SCENARIO-ENG-RESULT-001: Test Produces Pass Result
- **Priority**: CRITICAL
- **References**: REQ-ENG-002, REQ-ENG-013
- **Preconditions**: The IUT returns a valid response for a conformance test.

**Given** a test for `/req/system/canonical-url` that expects HTTP status 200 and a valid system resource body
**When** the IUT responds with status 200 and a body conforming to the system schema
**Then** the test result `status` is `"pass"`, the `message` is an empty string, the `requirementUri` is `/req/system/canonical-url`, the `durationMs` is a non-negative integer, and the `timestamp` is a valid ISO 8601 string.

### SCENARIO-ENG-RESULT-002: Test Produces Fail Result with Assertion Detail
- **Priority**: CRITICAL
- **References**: REQ-ENG-002, REQ-ENG-003, REQ-ENG-013
- **Preconditions**: The IUT returns an invalid response for a conformance test.

**Given** a test for `/req/system/canonical-url` that expects HTTP status 200
**When** the IUT responds with status 404
**Then** the test result `status` is `"fail"`, and the `message` contains at minimum the expected status (`200`), the actual status (`404`), and the request path (e.g., `GET /collections/systems/{id}`).

### SCENARIO-ENG-RESULT-003: Test Produces Skip Result with Reason
- **Priority**: CRITICAL
- **References**: REQ-ENG-002, REQ-ENG-004
- **Preconditions**: The conformance class for the test was not declared by the IUT.

**Given** a test for `/req/subsystem/collection` whose conformance class `/conf/subsystem` is not in the IUT's conformance declaration
**When** the test engine evaluates whether to run the test
**Then** the test result `status` is `"skip"`, and the `message` is `"Conformance class '/conf/subsystem' not declared by IUT"`.

### SCENARIO-ENG-SCHEMA-001: Schema Validation Passes for Conformant Response
- **Priority**: CRITICAL
- **References**: REQ-ENG-005, REQ-ENG-006
- **Preconditions**: The IUT returns a JSON response body for a systems collection request.

**Given** the test engine has loaded the system feature schema from the OGC 23-001 OpenAPI definition
**When** the IUT responds with a JSON body that contains all required fields (`type`, `id`, `properties`, `geometry`, `links`) with valid types and values
**Then** Ajv validation returns zero errors, and the test result `status` is `"pass"`.

### SCENARIO-ENG-SCHEMA-002: Schema Validation Fails with Detailed Error Paths
- **Priority**: CRITICAL
- **References**: REQ-ENG-005, REQ-ENG-003
- **Preconditions**: The IUT returns a JSON response body with schema violations.

**Given** the test engine has loaded the system feature schema from the OGC 23-001 OpenAPI definition
**When** the IUT responds with a JSON body where the `type` field is missing and the `properties.name` field is an integer instead of a string
**Then** Ajv validation returns at least two errors, the test result `status` is `"fail"`, and the `message` includes each error's JSON Pointer path (e.g., `/type`, `/properties/name`), the violated constraint (e.g., `required`, `type`), and the actual value or its absence.

### SCENARIO-ENG-SCHEMA-003: Schema Ref Resolution
- **Priority**: NORMAL
- **References**: REQ-ENG-006
- **Preconditions**: The OpenAPI definition contains schemas with `$ref` pointers.

**Given** the OpenAPI definition defines a `SystemFeature` schema that `$ref`s a `Link` schema and a `GeometryPoint` schema
**When** the test engine loads the `SystemFeature` schema
**Then** all `$ref` pointers are fully resolved, and the resulting schema can validate a complete system feature object including nested `links` and `geometry` structures without unresolved reference errors.

### SCENARIO-ENG-DEP-001: Dependency Chain Execution Order
- **Priority**: CRITICAL
- **References**: REQ-ENG-007
- **Preconditions**: The dependency graph defines: `test-features-core` depends on `test-common`, and `test-system-features` depends on `test-features-core`.

**Given** the test engine has conformance classes `test-common`, `test-features-core`, and `test-system-features` selected for execution
**When** the engine computes the execution order
**Then** `test-common` tests execute first, followed by `test-features-core` tests, followed by `test-system-features` tests. No test in a dependent class begins before all tests in its prerequisite class have completed.

### SCENARIO-ENG-DEP-002: Dependency Failure Causes Cascade Skip
- **Priority**: CRITICAL
- **References**: REQ-ENG-008, REQ-ENG-004
- **Preconditions**: `test-features-core` depends on `test-common`, and `test-system-features` depends on `test-features-core`.

**Given** the `test-common` class has just completed with at least one `"fail"` result
**When** the engine evaluates whether to execute `test-features-core` and `test-system-features`
**Then** all tests in `test-features-core` are skipped with message `"Dependency not met: conformance class '/conf/common' failed"`, and all tests in `test-system-features` are also skipped with a message referencing the transitive dependency failure.

### SCENARIO-ENG-DEP-003: Cycle Detection in Dependency Graph
- **Priority**: NORMAL
- **References**: REQ-ENG-007
- **Preconditions**: A misconfigured dependency graph where class A depends on class B and class B depends on class A.

**Given** the dependency graph contains a cycle between two conformance classes
**When** the test engine validates the dependency graph at startup
**Then** the engine raises a configuration error with a message identifying the classes involved in the cycle, and the assessment run does not start.

### SCENARIO-ENG-PAGE-001: Pagination Traversal Follows Next Links
- **Priority**: CRITICAL
- **References**: REQ-ENG-009
- **Preconditions**: The IUT returns a systems collection paginated across 3 pages.

**Given** a GET request to `/collections/systems/items?limit=10` returns 10 items and a `links` array containing `{"rel": "next", "href": "/collections/systems/items?limit=10&offset=10"}`
**When** the test engine processes the paginated response
**Then** the engine issues a GET request to the `next` URL, receives the second page (10 items with another `next` link), follows the second `next` link to the third page (5 items with no `next` link), stops traversal, and the test validates all 25 items across all 3 pages.

### SCENARIO-ENG-PAGE-002: Pagination Respects Maximum Page Limit
- **Priority**: NORMAL
- **References**: REQ-ENG-010
- **Preconditions**: The IUT returns paginated responses where every page includes a `next` link (simulating an extremely large collection or a misconfigured server).

**Given** the maximum page limit is configured to 5
**When** the test engine begins traversing a collection that returns a `next` link on every page
**Then** the engine follows `next` links for exactly 5 pages, logs a warning `"Pagination truncated: reached maximum page limit of 5"`, stops traversal, and validates only the items retrieved from the 5 pages.

### SCENARIO-ENG-PAGE-003: Pagination Loop Detection
- **Priority**: NORMAL
- **References**: REQ-ENG-010
- **Preconditions**: The IUT returns a `next` link that points back to a previously visited URL.

**Given** page 1 links to page 2 and page 2 links back to page 1
**When** the test engine follows the `next` link from page 2
**Then** the engine detects that the URL has already been visited, logs a warning `"Pagination loop detected: URL already visited"`, terminates traversal, and validates only the items retrieved so far without producing a test failure solely due to the loop.

### SCENARIO-ENG-TIMEOUT-001: Request Timeout Produces Failure
- **Priority**: CRITICAL
- **References**: REQ-ENG-011
- **Preconditions**: The IUT is configured with a 5-second request timeout.

**Given** the request timeout is set to 5000 milliseconds
**When** a test issues a GET request to `/collections/systems` and the IUT does not respond within 5000 milliseconds
**Then** the request is aborted, the test result `status` is `"fail"`, the `message` is `"Request timed out after 5000ms for GET /collections/systems"`, and the assessment continues executing the remaining tests.

### SCENARIO-ENG-TIMEOUT-002: Network Error Produces Failure Without Crash
- **Priority**: CRITICAL
- **References**: REQ-ENG-012
- **Preconditions**: The IUT endpoint becomes unreachable mid-assessment.

**Given** an assessment run is in progress with 20 tests remaining
**When** a test issues a GET request to `/collections/deployments` and receives a `ECONNREFUSED` error
**Then** the test result `status` is `"fail"`, the `message` includes the error type (`ECONNREFUSED`) and the request URL, and the assessment continues executing the remaining 19 tests without termination.

### SCENARIO-ENG-AGG-001: Class-Level Pass Aggregation
- **Priority**: CRITICAL
- **References**: REQ-ENG-014
- **Preconditions**: A conformance class has 5 tests.

**Given** a conformance class `/conf/system` with 5 registered tests
**When** all 5 tests produce `"pass"` results
**Then** the class-level result is `"pass"`.

### SCENARIO-ENG-AGG-002: Class-Level Fail Aggregation
- **Priority**: CRITICAL
- **References**: REQ-ENG-014
- **Preconditions**: A conformance class has 5 tests.

**Given** a conformance class `/conf/system` with 5 registered tests
**When** 4 tests produce `"pass"` and 1 test produces `"fail"`
**Then** the class-level result is `"fail"`.

### SCENARIO-ENG-AGG-003: Class-Level Skip Aggregation
- **Priority**: NORMAL
- **References**: REQ-ENG-014
- **Preconditions**: A conformance class has all tests skipped.

**Given** a conformance class `/conf/subsystem` with 3 registered tests
**When** all 3 tests produce `"skip"` results
**Then** the class-level result is `"skip"`.

## Implementation Status (2026-03-31)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-ENG-001: TestRegistry with 1:1 requirement URI mapping (`src/engine/registry/registry.ts`, 10 tests)
- REQ-ENG-002, REQ-ENG-003, REQ-ENG-004: Result model with pass/fail/skip, failure messages, skip reasons (`src/engine/result-aggregator.ts`, 10 tests)
- REQ-ENG-005, REQ-ENG-006: SchemaValidator with Ajv, $ref resolution, directory loading (`src/engine/schema-validator.ts`, 18 tests)
- REQ-ENG-007, REQ-ENG-008: DependencyResolver with Kahn's topo sort, cycle detection, cascade skip (`src/engine/dependency-resolver.ts`, 13 tests)
- REQ-ENG-009, REQ-ENG-010: Pagination traversal with loop detection, max pages (`src/engine/pagination.ts`, 12 tests)
- REQ-ENG-011, REQ-ENG-012: CaptureHttpClient with timeout, SSRF guard, error handling (`src/engine/http-client.ts`, 38 tests + `src/server/middleware/ssrf-guard.ts`, 23 tests)
- REQ-ENG-013: Standardized TestResult structure in shared types (`src/lib/types.ts`)
- REQ-ENG-014: Class-level result aggregation (`src/engine/result-aggregator.ts`)

### Deviations from Spec
- Used Node.js built-in `fetch` instead of `undici` directly — same underlying engine, simpler API
- SSRF guard is async (DNS resolution required for hostname checking) vs. spec implied sync

### Deferred
- None — all 14 requirements implemented
