# Product Requirements Document — CS API Compliance Assessor

> Version: 1.1 | Status: Living Document | Last updated: 2026-03-31

## Functional Requirements

### Endpoint Discovery & Configuration

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-01 | The application shall accept a CS API landing page URL from the user and validate that it is a reachable HTTP(S) endpoint. | `endpoint-input` |
| FR-02 | The application shall fetch the landing page (`/`) and extract all `links` entries, identifying links to conformance, API definition, and resource collections. | `landing-page-discovery` |
| FR-03 | The application shall fetch the conformance declaration (`/conformance`) and extract all declared conformance class URIs. | `conformance-detection` |
| FR-04 | The application shall map each declared conformance class URI to the corresponding set of requirements defined in OGC 23-001 (Part 1), OGC 23-002 (Part 2), and the parent standards (OGC API Common Part 1, OGC API Features Part 1). | `conformance-mapping` |
| FR-05 | The application shall display the list of detected conformance classes to the user, indicating which are testable and which are declared but not yet supported by the test engine. | `conformance-display` |
| FR-06 | The application shall allow the user to select which conformance classes to include in the assessment run, defaulting to all detected-and-testable classes. | `class-selection` |
| FR-07 | The application shall accept optional authentication credentials from the user: Bearer token, API key (header name + value), or Basic auth (username + password). Credentials are sent with every request to the IUT. | `auth-config` |
| FR-08 | The application shall allow the user to configure a request timeout (default 30 seconds) and maximum number of concurrent requests (default 5). | `run-config` |

### Conformance Test Execution

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-09 | The application shall execute tests for the **OGC API Common Part 1** conformance class, covering: landing page structure, conformance endpoint, JSON encoding, and OpenAPI 3.0 definition link. | `test-common` |
| FR-10 | The application shall execute tests for the **OGC API Features Part 1 Core** conformance class, covering: collections endpoint, single collection access, items endpoint with `limit` parameter, single feature access, and GeoJSON response structure. | `test-features-core` |
| FR-11 | The application shall execute tests for the **CS API Core** conformance class, covering: resource endpoint availability, link relations, and base response structures as defined in OGC 23-001 requirements class `/req/core`. | `test-csapi-core` |
| FR-12 | The application shall execute tests for the **System Features** conformance class (`/req/system`), covering: system collection availability, canonical system URL, system schema validation, system links (deployments, subsystems, sampling features, datastreams, controls). | `test-system-features` |
| FR-13 | The application shall execute tests for the **Subsystems** conformance class (`/req/subsystem`), covering: subsystem association link from parent system, subsystem collection endpoint, subsystem response structure. | `test-subsystems` |
| FR-14 | The application shall execute tests for the **Deployment Features** conformance class (`/req/deployment`), covering: deployment collection availability, canonical deployment URL, deployment schema validation, deployment links (deployed systems, subdeployments). | `test-deployment-features` |
| FR-15 | The application shall execute tests for the **Subdeployments** conformance class (`/req/subdeployment`), covering: subdeployment association link, subdeployment collection endpoint, subdeployment response structure. | `test-subdeployments` |
| FR-16 | The application shall execute tests for the **Procedure Features** conformance class (`/req/procedure`), covering: procedure collection availability, canonical procedure URL, procedure schema validation, procedure links. | `test-procedure-features` |
| FR-17 | The application shall execute tests for the **Sampling Features** conformance class (`/req/sampling`), covering: sampling feature collection availability, canonical URL, schema validation, parent system association. | `test-sampling-features` |
| FR-18 | The application shall execute tests for the **Property Definitions** conformance class (`/req/property`), covering: property collection availability, canonical URL, property schema validation. | `test-property-definitions` |
| FR-19 | The application shall execute tests for the **Advanced Filtering** conformance class (`/req/advanced-filtering`), covering: temporal filters (`datetime`), spatial filters (`bbox`), property filters (`q`), and any CS-API-specific query parameters. | `test-advanced-filtering` |
| FR-20 | The application shall execute tests for the **Create/Replace/Delete** conformance class (`/req/crud`), covering: POST to create resources, PUT to replace resources, DELETE to remove resources, and correct HTTP status codes (201, 200, 204, 404). The user must explicitly opt-in to these tests via the class selection UI, and a warning must be displayed that these tests mutate data on the target endpoint. | `test-crud` |
| FR-21 | The application shall execute tests for the **Update** conformance class (`/req/update`), covering: PATCH to partially update resources and correct HTTP status codes. The same opt-in and warning requirements as FR-20 apply. | `test-update` |
| FR-22 | The application shall execute tests for the **GeoJSON Format** conformance class (`/req/geojson`), covering: `Content-Type: application/geo+json` response header, GeoJSON Feature and FeatureCollection structure validation, required GeoJSON members (`type`, `geometry`, `properties`, `id`). | `test-geojson-format` |
| FR-23 | The application shall execute tests for the **SensorML JSON Format** conformance class (`/req/sensorml`), covering: `Content-Type: application/sml+json` response header, SensorML JSON structure validation against the SensorML JSON schema. | `test-sensorml-format` |

### CS API Part 2 Conformance Testing

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-46 | The application shall execute tests for the **Part 2 Common** conformance class (`/conf/api-common`), covering: Part 2 landing page links, conformance declaration for Part 2 classes, and base response structures as defined in OGC 23-002. | `test-dynamic-data` |
| FR-47 | The application shall execute tests for the **Datastreams & Observations** conformance class (`/conf/datastream`), covering: datastream collection endpoints (`/datastreams`, `/systems/{id}/datastreams`), datastream schema endpoint (`/datastreams/{id}/schema`), observation collection endpoints (`/observations`, `/datastreams/{id}/observations`), single observation access, and `phenomenonTime`, `resultTime`, `foi`, `observedProperty` query parameters. | `test-dynamic-data` |
| FR-48 | The application shall execute tests for the **Control Streams & Commands** conformance class (`/conf/controlstream`), covering: control stream collection endpoints (`/controlstreams`, `/systems/{id}/controlstreams`), control stream schema endpoint (`/controlstreams/{id}/schema`), command collection endpoints (`/commands`, `/controlstreams/{id}/commands`), single command access, command status (`/commands/{id}/status`), command result (`/commands/{id}/result`), and `issueTime`, `executionTime`, `sender`, `statusCode`, `controlledProperty` query parameters. | `test-dynamic-data` |
| FR-49 | The application shall execute tests for the **Command Feasibility** conformance class (`/conf/feasibility`), covering: feasibility request submission and feasibility result validation. | `test-dynamic-data` |
| FR-50 | The application shall execute tests for the **System Events** conformance class (`/conf/system-event`), covering: system event collection endpoints (`/systemEvents`, `/systems/{id}/events`), event schema validation, and `eventType` query parameter. | `test-dynamic-data` |
| FR-51 | The application shall execute tests for the **System History** conformance class (`/conf/system-history`), covering: system history endpoint (`/systems/{id}/history`), historical revision access, and temporal ordering of revisions. | `test-dynamic-data` |
| FR-52 | The application shall execute tests for the **Part 2 Advanced Filtering** conformance class (`/conf/advanced-filtering`), covering: temporal filters (`phenomenonTime`, `resultTime`, `issueTime`, `executionTime`), property filters (`observedProperty`, `controlledProperty`, `foi`), and format negotiation parameters (`obsFormat`, `cmdFormat`). | `test-dynamic-data` |
| FR-53 | The application shall execute tests for the **Part 2 Create/Replace/Delete** conformance class (`/conf/create-replace-delete`), covering: POST to create datastreams, observations, control streams, commands, and related resources; PUT to replace; DELETE to remove; and correct HTTP status codes. The user must explicitly opt-in to these tests via the class selection UI, and a warning must be displayed that these tests mutate data on the target endpoint. | `test-dynamic-data` |
| FR-54 | The application shall execute tests for the **Part 2 Update** conformance class (`/conf/update`), covering: PATCH to partially update Part 2 resources and correct HTTP status codes. The same opt-in and warning requirements as FR-53 apply. | `test-dynamic-data` |
| FR-55 | The application shall execute tests for the **JSON Encoding** conformance class (`/conf/json`), covering: `Content-Type: application/json` and `application/geo+json` response headers, and JSON structure validation for Part 2 resource types. | `test-dynamic-data` |
| FR-56 | The application shall execute tests for the **SWE Common JSON** conformance class (`/conf/swecommon-json`), covering: `Content-Type: application/swe+json` response header and SWE Common JSON encoding validation for observation and command data. | `test-dynamic-data` |
| FR-57 | The application shall execute tests for the **SWE Common Text** conformance class (`/conf/swecommon-text`), covering: `Content-Type: application/swe+text` response header and SWE Common text/CSV encoding validation for observation and command data. | `test-dynamic-data` |
| FR-58 | The application shall execute tests for the **SWE Common Binary** conformance class (`/conf/swecommon-binary`), covering: `Content-Type: application/swe+binary` response header and SWE Common binary encoding validation for observation and command data. | `test-dynamic-data` |
| FR-59 | The test engine shall validate Part 2 responses against JSON schemas derived from the CS API Part 2 OpenAPI definition (OGC 23-002 OpenAPI YAML) using a JSON Schema validator. | `test-dynamic-data` |

### Test Mechanics

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-24 | Each executable test shall correspond to exactly one abstract test (requirement) identified by its canonical URI (e.g., `/conf/system/canonical-url` tests `/req/system/canonical-url`). | `test-traceability` |
| FR-25 | Each test shall produce one of three results: **pass** (requirement satisfied), **fail** (requirement violated, with a specific failure reason), or **skip** (test could not be executed because a prerequisite was not met or the conformance class was not declared). | `test-result-status` |
| FR-26 | Each test shall record the failure reason as a human-readable message referencing the specific assertion that failed (e.g., "Expected status 200 but received 404 for GET /collections/systems/{id}"). | `test-failure-detail` |
| FR-27 | The test engine shall validate response bodies against JSON schemas derived from the CS API OpenAPI definition (OGC 23-001 OpenAPI YAML) using a JSON Schema validator. | `schema-validation` |
| FR-28 | The test engine shall respect dependency ordering: if conformance class B depends on class A, class A tests run first. If class A fails critically, class B tests are skipped with reason "dependency not met". | `test-dependency-order` |
| FR-29 | The test engine shall support pagination: when a collection endpoint returns paginated results, tests shall follow `next` links to retrieve subsequent pages as needed for validation. | `pagination-support` |

### Request/Response Capture

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-30 | For every HTTP request made during testing, the application shall capture and store: HTTP method, full URL (including query parameters), request headers, and request body (if any). | `request-capture` |
| FR-31 | For every HTTP response received during testing, the application shall capture and store: HTTP status code, response headers, response body, and response time in milliseconds. | `response-capture` |
| FR-32 | The user shall be able to view the captured request and response details for any individual test in the results UI. | `request-response-view` |
| FR-33 | Captured authentication credentials (Bearer tokens, API keys, passwords) shall be masked in the UI display and in exported reports, showing only the first 4 and last 4 characters. | `credential-masking` |

### Result Reporting

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-34 | The application shall display a summary dashboard showing: total tests run, total passed, total failed, total skipped, overall compliance percentage, and a per-conformance-class breakdown. | `result-summary` |
| FR-35 | The application shall display results organized by conformance class, with each class expandable to show individual requirement test results. | `result-by-class` |
| FR-36 | Each conformance class in the results shall show: class name, class URI, number of tests passed/failed/skipped, and a pass/fail badge. A class passes only if all its requirements pass. | `class-result-detail` |
| FR-37 | Each individual test result shall display: requirement ID, requirement URI, test name, result status (pass/fail/skip), failure reason (if failed), skip reason (if skipped), and a link to view the request/response exchange. | `test-result-detail` |
| FR-38 | The results page shall include a disclaimer stating: "This assessment is unofficial and does not constitute OGC certification. Results are based on automated testing against the OGC 23-001 and OGC 23-002 standards and may not cover all edge cases." | `compliance-disclaimer` |

### Export

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-39 | The application shall export the full compliance report as a JSON document containing: endpoint URL, assessment timestamp, conformance classes tested, and per-requirement results with request/response traces. | `export-json` |
| FR-40 | The application shall export the compliance report as a PDF document containing: summary dashboard, per-class results, and failed-test details with request/response excerpts. | `export-pdf` |
| FR-41 | The JSON export format shall use a stable, versioned schema (starting at v1) so that downstream tools can parse results programmatically. | `export-schema-versioning` |

### Progress & Session Management

| ID | Requirement | OpenSpec Capability |
|----|-------------|---------------------|
| FR-42 | During test execution, the application shall display real-time progress: current conformance class being tested, current test name, number of tests completed out of total, and a progress bar. | `progress-display` |
| FR-43 | The user shall be able to cancel a running assessment. Cancellation stops further test execution and presents results collected so far, clearly marked as "partial". | `cancel-assessment` |
| FR-44 | Completed assessment results shall be persisted on the server for at least 24 hours, allowing the user to return to the results page via a unique URL. | `result-persistence` |
| FR-45 | The landing page of the application shall display a brief explanation of what the tool does, a URL input field, and a "Start Assessment" button. No account creation or login is required. | `app-landing-page` |

## Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | **Response time (endpoint discovery)**: Landing page fetch, conformance fetch, and collection discovery shall complete within 15 seconds for a responsive IUT. | < 15 seconds for discovery phase |
| NFR-02 | **Test execution throughput**: The test engine shall execute at least 10 individual tests per second against a responsive IUT with default concurrency settings. | >= 10 tests/second |
| NFR-03 | **Full assessment time**: A full Part 1 + Part 2 assessment (233 requirements) shall complete within 10 minutes against a responsive IUT. | < 10 minutes |
| NFR-04 | **Concurrent users**: The application shall support at least 5 concurrent assessment sessions without degradation. | >= 5 concurrent sessions |
| NFR-05 | **Credential security**: User-provided authentication credentials shall be transmitted only over HTTPS (when deployed in production), stored only in server memory for the duration of the assessment, and never written to persistent storage or logs. | Zero credential persistence; HTTPS-only in production |
| NFR-06 | **Input validation**: All user inputs (URL, credentials, configuration) shall be validated and sanitized to prevent SSRF, injection, and XSS attacks. The URL input shall reject private/internal IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1) to prevent SSRF. | All inputs validated; SSRF protection active |
| NFR-07 | **Accessibility**: The web UI shall meet WCAG 2.1 Level AA. All interactive elements shall be keyboard-navigable. Color shall not be the only indicator of pass/fail status (use icons/text alongside color). | WCAG 2.1 AA compliance |
| NFR-08 | **Browser support**: The application shall work in the latest two major versions of Chrome, Firefox, Edge, and Safari. | 4 browsers, latest 2 versions each |
| NFR-09 | **Availability**: The application shall have an uptime target of 99% (allowing approximately 7 hours downtime per month for a hosted deployment). | 99% uptime |
| NFR-10 | **Error resilience**: If an individual test encounters a network error or unexpected response, it shall fail gracefully with a descriptive error message and not crash the entire assessment run. | Zero cascading failures; all tests produce a result |
| NFR-11 | **Logging**: The backend shall log all assessment runs (endpoint URL, timestamp, result summary) for operational monitoring. Logs shall not contain authentication credentials or full response bodies. | Structured logging; no credential leakage |
| NFR-12 | **Docker deployment**: The application shall be deployable via a single `docker-compose up` command with no additional host dependencies. | Single-command deployment |
| NFR-13 | **Code quality**: The codebase shall maintain at least 80% unit test coverage for the test engine module (where each test function has its own unit test). | >= 80% test engine unit coverage |
| NFR-14 | **Report export performance**: JSON and PDF report generation shall complete within 10 seconds for a full assessment report. | < 10 seconds per export |
| NFR-15 | **Localization readiness**: All user-facing strings shall be externalized (not hardcoded) to support future internationalization (i18n), though v1.0 ships English-only. | Externalized strings |

## Interface Contracts

| Interface | Protocol | Notes |
|-----------|----------|-------|
| User to Frontend | HTTPS (browser) | Single-page application served over HTTPS. User interacts via forms, buttons, and result views. |
| Frontend to Backend API | REST over HTTPS | Frontend calls backend endpoints to create assessment runs, poll/stream progress, and retrieve results. JSON request/response bodies. |
| Backend to IUT | HTTP/HTTPS | Test engine makes HTTP requests to the Implementation Under Test. Supports GET, POST, PUT, PATCH, DELETE. Carries user-provided auth credentials. |
| Progress streaming | Server-Sent Events (SSE) | Backend streams test progress events to the frontend: `test-started`, `test-completed`, `class-started`, `class-completed`, `assessment-completed`. |
| Backend API: POST /api/assessments | REST | Create a new assessment run. Request body: `{ "endpointUrl": string, "conformanceClasses": string[], "auth": { "type": "bearer"|"apikey"|"basic", ... }, "config": { "timeout": number, "concurrency": number } }`. Returns: `{ "id": string, "status": "running" }`. |
| Backend API: GET /api/assessments/:id | REST | Retrieve assessment status and results. Returns: `{ "id": string, "status": "running"|"completed"|"cancelled"|"partial", "progress": { ... }, "results": { ... } }`. |
| Backend API: GET /api/assessments/:id/events | SSE | Stream real-time progress events for a running assessment. |
| Backend API: POST /api/assessments/:id/cancel | REST | Cancel a running assessment. Returns: `{ "id": string, "status": "cancelled" }`. |
| Backend API: GET /api/assessments/:id/export?format=json | REST | Download the full report as JSON. Returns `Content-Type: application/json`. |
| Backend API: GET /api/assessments/:id/export?format=pdf | REST | Download the full report as PDF. Returns `Content-Type: application/pdf`. |
| Backend API: GET /api/health | REST | Health check endpoint. Returns `{ "status": "ok" }`. |

## OpenSpec Capability Mapping

### Epic 1: Endpoint Discovery & Configuration

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-01 | `endpoint-input` | Epic 1 |
| FR-02 | `landing-page-discovery` | Epic 1 |
| FR-03 | `conformance-detection` | Epic 1 |
| FR-04 | `conformance-mapping` | Epic 1 |
| FR-05 | `conformance-display` | Epic 1 |
| FR-06 | `class-selection` | Epic 1 |
| FR-07 | `auth-config` | Epic 1 |
| FR-08 | `run-config` | Epic 1 |

### Epic 2: Parent Standard Conformance Testing

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-09 | `test-common` | Epic 2 |
| FR-10 | `test-features-core` | Epic 2 |

### Epic 3: CS API Part 1 Conformance Testing

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-11 | `test-csapi-core` | Epic 3 |
| FR-12 | `test-system-features` | Epic 3 |
| FR-13 | `test-subsystems` | Epic 3 |
| FR-14 | `test-deployment-features` | Epic 3 |
| FR-15 | `test-subdeployments` | Epic 3 |
| FR-16 | `test-procedure-features` | Epic 3 |
| FR-17 | `test-sampling-features` | Epic 3 |
| FR-18 | `test-property-definitions` | Epic 3 |
| FR-19 | `test-advanced-filtering` | Epic 3 |
| FR-20 | `test-crud` | Epic 3 |
| FR-21 | `test-update` | Epic 3 |
| FR-22 | `test-geojson-format` | Epic 3 |
| FR-23 | `test-sensorml-format` | Epic 3 |

### Epic 4: Test Engine Infrastructure

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-24 | `test-traceability` | Epic 4 |
| FR-25 | `test-result-status` | Epic 4 |
| FR-26 | `test-failure-detail` | Epic 4 |
| FR-27 | `schema-validation` | Epic 4 |
| FR-28 | `test-dependency-order` | Epic 4 |
| FR-29 | `pagination-support` | Epic 4 |

### Epic 5: Request/Response Capture & Debugging

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-30 | `request-capture` | Epic 5 |
| FR-31 | `response-capture` | Epic 5 |
| FR-32 | `request-response-view` | Epic 5 |
| FR-33 | `credential-masking` | Epic 5 |

### Epic 6: Result Reporting & Dashboard

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-34 | `result-summary` | Epic 6 |
| FR-35 | `result-by-class` | Epic 6 |
| FR-36 | `class-result-detail` | Epic 6 |
| FR-37 | `test-result-detail` | Epic 6 |
| FR-38 | `compliance-disclaimer` | Epic 6 |

### Epic 7: Export & Sharing

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-39 | `export-json` | Epic 7 |
| FR-40 | `export-pdf` | Epic 7 |
| FR-41 | `export-schema-versioning` | Epic 7 |

### Epic 8: Progress & Session Management

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-42 | `progress-display` | Epic 8 |
| FR-43 | `cancel-assessment` | Epic 8 |
| FR-44 | `result-persistence` | Epic 8 |
| FR-45 | `app-landing-page` | Epic 8 |

### Epic 9: CS API Part 2 Conformance Testing

| PRD Requirement | OpenSpec Capability | Epic |
|-----------------|---------------------|------|
| FR-46 | `test-dynamic-data` | Epic 9 |
| FR-47 | `test-dynamic-data` | Epic 9 |
| FR-48 | `test-dynamic-data` | Epic 9 |
| FR-49 | `test-dynamic-data` | Epic 9 |
| FR-50 | `test-dynamic-data` | Epic 9 |
| FR-51 | `test-dynamic-data` | Epic 9 |
| FR-52 | `test-dynamic-data` | Epic 9 |
| FR-53 | `test-dynamic-data` | Epic 9 |
| FR-54 | `test-dynamic-data` | Epic 9 |
| FR-55 | `test-dynamic-data` | Epic 9 |
| FR-56 | `test-dynamic-data` | Epic 9 |
| FR-57 | `test-dynamic-data` | Epic 9 |
| FR-58 | `test-dynamic-data` | Epic 9 |
| FR-59 | `test-dynamic-data` | Epic 9 |
