# Dynamic Data Testing — Specification

> Version: 1.0 | Status: Draft | Last updated: 2026-03-31

## Purpose

This capability defines the conformance test execution logic for OGC 23-002 (Connected Systems API Part 2 — Dynamic Data). It covers the validation logic for all 13 conformance classes defined in Part 2, encompassing 130 requirements across datastreams, observations, control streams, commands, command feasibility, system events, system history, advanced filtering, CRUD, update, and three SWE Common encoding formats. The test engine issues HTTP requests against an Implementation Under Test (IUT), inspects response status codes, headers, and body structures, and produces per-requirement pass/fail/skip verdicts. This capability extends the Part 1 conformance testing capability and shares its verdict model, dependency handling, and write-operation opt-in mechanisms.

## Functional Requirements

### REQ-DYN-001: Part 2 Common Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Part 2 Common conformance class (`/req/dynamic-common`):
  1. **Conformance declaration** -- The IUT's `/conformance` response includes the Part 2 Common conformance class URI (`http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/common`).
  2. **Part 2 resource collection links** -- The landing page `links` array contains entries pointing to Part 2 resource collections (datastreams, observations, control streams, commands) where supported by the IUT.
  3. **Base response structures** -- All Part 2 resource responses include the required base members: `id` (string), `type` (string matching the resource kind), and `links` (array of link objects with `href`, `rel`, `type`, and optional `title`).
  4. **Temporal properties format** -- All Part 2 resources that include temporal properties (`phenomenonTime`, `resultTime`, `validTime`, `issueTime`, `executionTime`) encode them as ISO 8601 date-time strings or time intervals.
- **Rationale**: Part 2 Common is the prerequisite for all other Part 2 conformance classes. It verifies that the server correctly declares Part 2 support and structures Part 2 resources with the required base fields.

### REQ-DYN-002: Datastreams and Observations Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Datastreams & Observations conformance class (`/req/datastream`):
  1. **Datastream collection availability** -- `GET /datastreams` returns HTTP 200 with a JSON body containing a collection of datastream resources.
  2. **System-scoped datastreams** -- For at least one system, `GET /systems/{systemId}/datastreams` returns HTTP 200 with a collection of datastream resources associated with that system.
  3. **Single datastream access** -- For at least one datastream, `GET /datastreams/{id}` returns HTTP 200 with the datastream resource representation.
  4. **Datastream schema validation** -- The datastream resource body validates against the OGC 23-002 datastream JSON schema (required fields: `id`, `type`, `name`, `system@link` or system reference, `observedProperties`, `phenomenonTime` or `resultTime` where applicable).
  5. **Datastream schema endpoint** -- `GET /datastreams/{id}/schema` returns HTTP 200 with a schema description (SWE Common DataRecord or equivalent) defining the structure of observations in the datastream.
  6. **Observation collection availability** -- `GET /observations` returns HTTP 200 with a JSON body containing a collection of observation resources.
  7. **Datastream-scoped observations** -- For at least one datastream, `GET /datastreams/{id}/observations` returns HTTP 200 with a collection of observation resources belonging to that datastream.
  8. **Single observation access** -- For at least one observation, `GET /observations/{id}` returns HTTP 200 with the observation resource representation.
  9. **Observation schema validation** -- The observation resource body validates against the OGC 23-002 observation JSON schema (required fields: `id`, `type`, `phenomenonTime` or `resultTime`, `result`).
  10. **Observation-datastream linkage** -- Each observation resource references its parent datastream via a link or inline reference, and the parent datastream can be resolved via `GET`.
- **Rationale**: Datastreams and observations are the primary data delivery mechanism in Part 2. This class validates the complete sensor data channel from datastream metadata through individual observation readings.

### REQ-DYN-003: Control Streams and Commands Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Control Streams & Commands conformance class (`/req/controlstream`):
  1. **Control stream collection availability** -- `GET /controlstreams` returns HTTP 200 with a JSON body containing a collection of control stream resources.
  2. **System-scoped control streams** -- For at least one system, `GET /systems/{systemId}/controlstreams` returns HTTP 200 with a collection of control stream resources associated with that system.
  3. **Single control stream access** -- For at least one control stream, `GET /controlstreams/{id}` returns HTTP 200 with the control stream resource representation.
  4. **Control stream schema validation** -- The control stream resource body validates against the OGC 23-002 control stream JSON schema (required fields: `id`, `type`, `name`, `system@link` or system reference).
  5. **Control stream schema endpoint** -- `GET /controlstreams/{id}/schema` returns HTTP 200 with a schema description defining the structure of commands in the control stream.
  6. **Command collection availability** -- `GET /commands` returns HTTP 200 with a JSON body containing a collection of command resources.
  7. **Control-stream-scoped commands** -- For at least one control stream, `GET /controlstreams/{id}/commands` returns HTTP 200 with a collection of command resources belonging to that control stream.
  8. **Single command access** -- For at least one command, `GET /commands/{id}` returns HTTP 200 with the command resource representation.
  9. **Command schema validation** -- The command resource body validates against the OGC 23-002 command JSON schema (required fields: `id`, `type`, `issueTime`, `parameters` or `params`).
  10. **Command status endpoint** -- For at least one command, `GET /commands/{id}/status` returns HTTP 200 with a status report resource containing `status` (string from the defined status vocabulary: e.g., `PENDING`, `ACCEPTED`, `REJECTED`, `EXECUTING`, `COMPLETED`, `FAILED`, `CANCELED`).
  11. **Command result endpoint** -- For at least one completed command, `GET /commands/{id}/result` returns HTTP 200 with the command result resource, or HTTP 404 if no result is available yet (which is acceptable for non-completed commands).
- **Rationale**: Control streams and commands provide the tasking and actuation interface in Part 2. This class validates the complete command channel from control stream metadata through individual commands and their status/result lifecycle.

### REQ-DYN-004: Command Feasibility Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Command Feasibility conformance class (`/req/commandfeasibility`):
  1. **Feasibility endpoint availability** -- For at least one control stream, `POST /controlstreams/{id}/feasibility` (or the feasibility endpoint declared by the control stream) accepts a feasibility request body and returns HTTP 200 or HTTP 201 with a feasibility result.
  2. **Feasibility result structure** -- The feasibility result body contains `feasible` (boolean) and, when feasible is false, `reason` (string) or a structured explanation of why the command is not feasible.
  3. **Feasibility with valid parameters** -- When submitting a feasibility request with parameters that match the control stream schema, the server returns HTTP 200 or HTTP 201 (not HTTP 400 or HTTP 422).
  4. **Feasibility with invalid parameters** -- When submitting a feasibility request with parameters that violate the control stream schema, the server returns HTTP 400 or HTTP 422 with an error description.
- **Rationale**: Command feasibility provides a pre-flight check mechanism allowing clients to verify whether a command can be executed before actual submission. This is critical for expensive or irreversible actuation operations.

### REQ-DYN-005: System Events Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the System Events conformance class (`/req/systemevent`):
  1. **System events collection availability** -- `GET /systemEvents` returns HTTP 200 with a JSON body containing a collection of system event resources.
  2. **System-scoped events** -- For at least one system, `GET /systems/{systemId}/events` returns HTTP 200 with a collection of event resources associated with that system.
  3. **Single event access** -- For at least one system event, `GET /systems/{systemId}/events/{eventId}` returns HTTP 200 with the event resource representation.
  4. **Event schema validation** -- The system event resource body validates against the OGC 23-002 system event JSON schema (required fields: `id`, `type`, `time`, `system@link` or system reference). The `type` field SHALL contain a recognized event type from the OGC vocabulary (e.g., `deployed`, `undeployed`, `enabled`, `disabled`, `configChanged`).
- **Rationale**: System events provide a lifecycle event log for systems, tracking status changes such as online/offline transitions and configuration changes.

### REQ-DYN-006: System History Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the System History conformance class (`/req/systemhistory`):
  1. **System history collection availability** -- For at least one system, `GET /systems/{systemId}/history` returns HTTP 200 with a JSON body containing a collection of historical system description revisions.
  2. **Single revision access** -- For at least one revision, `GET /systems/{systemId}/history/{revId}` returns HTTP 200 with the historical system resource representation.
  3. **Revision schema validation** -- Each historical revision body validates against the CS API system JSON schema (same required fields as a current system resource) and includes a `validTime` indicating the time period for which the revision was the active description.
  4. **Revision ordering** -- The history collection returns revisions in chronological order (oldest first) or reverse chronological order (newest first), and the ordering is consistent across paginated responses.
- **Rationale**: System history provides access to previous versions of system descriptions, enabling temporal queries about how a system was configured at a given point in time.

### REQ-DYN-007: Advanced Filtering Tests (Part 2)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Part 2 Advanced Filtering conformance class (`/req/advanced-filtering-2`):
  1. **Phenomenon time filter** -- `GET /observations?phenomenonTime={ISO8601-interval}` returns HTTP 200 with a valid collection. The test engine SHALL verify the parameter is accepted (not rejected with HTTP 400) and, when possible, confirm that returned observations fall within the specified phenomenon time range.
  2. **Result time filter** -- `GET /observations?resultTime={ISO8601-interval}` returns HTTP 200 with a valid collection. Returned observations, where verifiable, have `resultTime` within the specified range.
  3. **Issue time filter** -- `GET /commands?issueTime={ISO8601-interval}` returns HTTP 200 with a valid collection. Returned commands, where verifiable, have `issueTime` within the specified range.
  4. **Execution time filter** -- `GET /commands?executionTime={ISO8601-interval}` returns HTTP 200 with a valid collection. Returned commands, where verifiable, have `executionTime` within the specified range.
  5. **Property filter on observations** -- `GET /observations?observedProperty={propertyUri}` returns HTTP 200 with a valid collection. The test engine SHALL verify the parameter is accepted and, where possible, confirm that returned observations reference the specified observed property.
  6. **Datastream filter on observations** -- `GET /observations?datastream={datastreamId}` returns HTTP 200 with a valid collection. The test engine SHALL verify that returned observations belong to the specified datastream.
  7. **Control stream filter on commands** -- `GET /commands?controlstream={controlstreamId}` returns HTTP 200 with a valid collection. The test engine SHALL verify that returned commands belong to the specified control stream.
- **Rationale**: Part 2 resources have time-varying nature and require specialized temporal filters beyond the basic `datetime` filter from Part 1. Property and stream filters enable efficient access to specific subsets of dynamic data.

### REQ-DYN-008: Create/Replace/Delete Tests (Part 2)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Part 2 Create/Replace/Delete conformance class (`/req/crud-2`):
  1. **Create datastream (POST)** -- `POST /systems/{systemId}/datastreams` with a valid datastream body returns HTTP 201 with a `Location` header pointing to the newly created datastream. `GET {Location}` returns HTTP 200 with the created datastream.
  2. **Create observation (POST)** -- `POST /datastreams/{id}/observations` with a valid observation body returns HTTP 201 with a `Location` header. `GET {Location}` returns HTTP 200 with the created observation.
  3. **Create control stream (POST)** -- `POST /systems/{systemId}/controlstreams` with a valid control stream body returns HTTP 201 with a `Location` header. `GET {Location}` returns HTTP 200 with the created control stream.
  4. **Create command (POST)** -- `POST /controlstreams/{id}/commands` with a valid command body returns HTTP 201 with a `Location` header. `GET {Location}` returns HTTP 200 with the created command.
  5. **Replace resource (PUT)** -- `PUT /datastreams/{id}` (or equivalent Part 2 resource endpoint) with a complete, modified resource body returns HTTP 200 or HTTP 204. `GET /datastreams/{id}` confirms the resource reflects the replacement.
  6. **Delete resource (DELETE)** -- `DELETE /datastreams/{id}` (or equivalent Part 2 resource endpoint) returns HTTP 200 or HTTP 204. `GET /datastreams/{id}` subsequently returns HTTP 404.
  7. **Error on non-existent resource** -- `PUT /datastreams/{nonExistentId}` returns HTTP 404 (or HTTP 201 if the server supports upsert). `DELETE /datastreams/{nonExistentId}` returns HTTP 404.
- **Rationale**: CRUD operations for Part 2 resources are destructive and must be validated carefully. These tests confirm correct status codes and resource lifecycle behavior for dynamic data resources.

### REQ-DYN-009: Write-Operation Opt-In Requirement (Part 2)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL NOT execute any Part 2 write-operation tests (POST, PUT, PATCH, DELETE against Part 2 resource endpoints) unless the user has explicitly opted in by selecting the corresponding Part 2 conformance class (Part 2 Create/Replace/Delete or Part 2 Update) in the class selection UI. When a Part 2 write-operation class is selected, the system SHALL display a warning message stating: "These tests will create, modify, and delete resources on the target endpoint. Only run against a test or staging environment." This uses the same opt-in mechanism as Part 1 write-operation tests (REQ-TEST-013).
- **Rationale**: Write operations mutate data on the IUT. Part 2 write operations are especially sensitive because they may create or delete time-series observations and commands.

### REQ-DYN-010: Update Tests (Part 2)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Part 2 Update conformance class (`/req/update-2`):
  1. **Partial update (PATCH)** -- `PATCH /datastreams/{id}` (or equivalent Part 2 resource endpoint) with a partial JSON body returns HTTP 200 or HTTP 204. `GET /datastreams/{id}` confirms the patched fields are updated and non-patched fields are unchanged.
  2. **PATCH Content-Type** -- The PATCH request is sent with `Content-Type: application/merge-patch+json` (RFC 7396) or `Content-Type: application/json-patch+json` (RFC 6902), depending on server support. The test engine SHALL attempt `merge-patch+json` first and fall back to `json-patch+json` if the server responds with HTTP 415 (Unsupported Media Type).
  3. **PATCH on non-existent resource** -- `PATCH /datastreams/{nonExistentId}` returns HTTP 404.
- **Rationale**: PATCH provides efficient partial updates for Part 2 resources without requiring a full resource replacement.

### REQ-DYN-011: JSON Encoding Tests (Part 2)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the Part 2 JSON Encoding conformance class (`/req/json-2`):
  1. **Content-Type header** -- When requesting Part 2 resource endpoints with `Accept: application/json`, the response returns `Content-Type: application/json` (or a compatible media type with `+json` suffix).
  2. **Datastream JSON structure** -- Datastream resources returned as JSON contain the required members defined in the OGC 23-002 JSON encoding: `id`, `type`, `name`, and resource-specific fields.
  3. **Observation JSON structure** -- Observation resources returned as JSON contain the required members: `id`, `type`, `phenomenonTime` or `resultTime`, and `result`.
  4. **Control stream JSON structure** -- Control stream resources returned as JSON contain the required members: `id`, `type`, `name`, and resource-specific fields.
  5. **Command JSON structure** -- Command resources returned as JSON contain the required members: `id`, `type`, `issueTime`, and `parameters` or `params`.
  6. **Schema validation** -- All Part 2 resource JSON responses validate against the OGC 23-002 OpenAPI JSON schemas for their respective resource types.
- **Rationale**: JSON is the standard encoding for Part 2 resources. This class validates that the server produces structurally correct JSON representations.

### REQ-DYN-012: SWE Common JSON Encoding Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the SWE Common JSON conformance class (`/req/swecommon-json`):
  1. **Content-Type header** -- When requesting an observation or command endpoint with `Accept: application/swe+json` (or the SWE Common JSON media type declared by the server), the response returns the corresponding SWE Common JSON Content-Type.
  2. **SWE Common DataRecord structure** -- The datastream schema endpoint (`GET /datastreams/{id}/schema`) returns a valid SWE Common DataRecord (or equivalent) with `type`, `fields` (array of field definitions each with `name`, `type`, and encoding details).
  3. **Observation result encoding** -- Observation results encoded in SWE Common JSON contain values structured according to the datastream schema (field names and types match the schema definition).
  4. **Schema validation** -- SWE Common JSON responses validate against the OGC SWE Common JSON schema definitions.
- **Rationale**: SWE Common JSON is the rich structured encoding for observation results and command parameters, providing self-describing data with full type and unit metadata.

### REQ-DYN-013: SWE Common Text Encoding Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the SWE Common Text conformance class (`/req/swecommon-text`):
  1. **Content-Type header** -- When requesting an observation endpoint with `Accept: text/csv` or `Accept: application/swe+text` (or the SWE Common Text media type declared by the server), the response returns a text-based Content-Type (e.g., `text/csv`, `text/plain`, or `application/swe+text`).
  2. **Non-empty body** -- The response body is non-empty (length > 0) when the queried datastream or observation collection contains at least one observation.
  3. **Delimiter consistency** -- If the response uses CSV/delimited format, the delimiter character is consistent throughout the response body (commonly comma or tab).
  4. **Encoding not supported graceful skip** -- If the server responds with HTTP 406 (Not Acceptable) when SWE Common Text is requested, the test is marked SKIP with reason "SWE Common Text encoding not supported by server."
- **Rationale**: SWE Common Text provides a compact, human-readable encoding suitable for bulk data transfer. Deep parsing of the binary-like text format is not in scope; the test validates Content-Type and non-empty body.

### REQ-DYN-014: SWE Common Binary Encoding Tests
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL execute the following tests for the SWE Common Binary conformance class (`/req/swecommon-binary`):
  1. **Content-Type header** -- When requesting an observation endpoint with `Accept: application/swe+binary` (or the SWE Common Binary media type declared by the server), the response returns a binary Content-Type (e.g., `application/octet-stream`, `application/swe+binary`).
  2. **Non-empty body** -- The response body is non-empty (length > 0) when the queried datastream or observation collection contains at least one observation.
  3. **Encoding not supported graceful skip** -- If the server responds with HTTP 406 (Not Acceptable) when SWE Common Binary is requested, the test is marked SKIP with reason "SWE Common Binary encoding not supported by server."
- **Rationale**: SWE Common Binary provides a compact binary encoding for high-volume data transfer. Deep binary parsing is not in scope for conformance testing; the test validates Content-Type and non-empty body to confirm the server can produce the encoding.

### REQ-DYN-015: Part 2 Dependency Handling
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The test engine SHALL enforce conformance class dependency ordering for Part 2 classes. When a prerequisite class fails (any test in the class produces a FAIL verdict), all tests in dependent classes SHALL be skipped with reason "Dependency class '{className}' failed." The Part 2 dependency graph is:
  - Part 1 CS API Core is a prerequisite for Part 2 Common.
  - Part 2 Common is a prerequisite for: Datastreams & Observations, Control Streams & Commands, System Events, System History, Part 2 Advanced Filtering, Part 2 JSON Encoding, Part 2 Create/Replace/Delete, Part 2 Update.
  - Part 1 System Features is a prerequisite for: Datastreams & Observations (system-scoped datastreams), Control Streams & Commands (system-scoped control streams), System Events (system-scoped events), System History (system history endpoint).
  - Datastreams & Observations is a prerequisite for: Command Feasibility (requires control streams, tested via Control Streams & Commands, but feasibility also depends on observation patterns).
  - Control Streams & Commands is a prerequisite for: Command Feasibility.
  - Datastreams & Observations is a prerequisite for: SWE Common JSON, SWE Common Text, SWE Common Binary (encoding tests require observation data).
- **Rationale**: Running Part 2 tests whose prerequisites have failed produces noisy, unhelpful results. The cross-part dependency (Part 1 Core -> Part 2 Common) ensures Part 1 infrastructure is verified before Part 2 testing begins.

### REQ-DYN-016: Part 2 Test Verdict Production
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Each individual Part 2 test executed by the test engine SHALL produce exactly one of three verdicts, using the same verdict model as Part 1 (REQ-TEST-019):
  - **PASS** -- The requirement is satisfied. The HTTP response status code, headers, and body all match expectations.
  - **FAIL** -- The requirement is violated. The test SHALL include a human-readable failure reason referencing the specific assertion that failed (e.g., "Expected status 200 but received 404 for GET /datastreams/{id}").
  - **SKIP** -- The test could not be executed. The test SHALL include a reason (e.g., "Conformance class not declared", "Dependency class failed", "No datastreams available to test against", "SWE Common Binary encoding not supported by server").
- **Rationale**: Consistency with the Part 1 verdict model ensures uniform reporting across both parts.

### REQ-DYN-017: Part 2 Empty Collection Handling
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: When a Part 2 resource collection is empty (the collection endpoint returns an empty array of resources), the test engine SHALL skip tests that require an existing resource (e.g., single-resource access, schema validation on a resource body, datastream schema endpoint, observation linkage) with reason "Collection is empty; no resources available to test." The collection-level tests (collection endpoint availability, system-scoped collection access) SHALL still execute normally.
- **Rationale**: An empty collection is a valid server state. A server may declare Part 2 conformance but have no datastreams, observations, or commands at the time of testing.

### REQ-DYN-018: Part 2 Test Cleanup for Write Operations
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: After executing Part 2 Create/Replace/Delete or Update tests, the test engine SHOULD attempt to delete any Part 2 resources it created during testing (datastreams, observations, control streams, commands), restoring the IUT to its pre-test state. If cleanup fails, the test engine SHALL log a warning including the IDs and URLs of resources that could not be removed.
- **Rationale**: Leaving test artifacts on the IUT is especially problematic for dynamic data resources, as orphaned datastreams or observations may pollute time-series queries.

### REQ-DYN-019: Conformance Class Not Declared Handling (Part 2)
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: When a Part 2 conformance class is not listed in the IUT's `/conformance` response AND the user has not manually selected it for testing, the test engine SHALL skip all tests for that class and report each test with status SKIP and reason "Conformance class not declared by server." This uses the same mechanism as Part 1 (REQ-TEST-017).
- **Rationale**: Testing undeclared Part 2 conformance classes produces misleading results. Servers may implement Part 1 without Part 2, or implement only a subset of Part 2 classes.

## Acceptance Scenarios

### SCENARIO-DYN-PASS-001: All Part 2 Tests Pass for a Fully Conformant Server
- **Priority**: CRITICAL
- **References**: REQ-DYN-001 through REQ-DYN-014, REQ-DYN-016
- **Preconditions**: The IUT declares all Part 2 conformance classes in its `/conformance` response. All Part 2 resource collections contain at least one resource. Write-operation tests are opted into by the user. The IUT also passes all Part 1 prerequisite tests.

**Given** a CS API endpoint at `https://example.org/csapi` that fully conforms to OGC 23-001 Part 1 and OGC 23-002 Part 2
**When** the test engine executes all Part 2 conformance class tests with write operations enabled
**Then** every Part 2 test produces a PASS verdict, no test produces FAIL or SKIP, and the per-class results show 100% pass rate for each Part 2 conformance class

### SCENARIO-DYN-PASS-002: Datastream with Observations End-to-End Flow
- **Priority**: CRITICAL
- **References**: REQ-DYN-001, REQ-DYN-002, REQ-DYN-011, REQ-DYN-016
- **Preconditions**: The IUT has at least one system with a datastream containing observations.

**Given** a CS API endpoint with a system `sys-001` that has a datastream `ds-001` containing 5 observations
**When** the test engine executes the Datastreams & Observations tests
**Then** the "Datastream collection availability" test produces PASS for `GET /datastreams`, the "System-scoped datastreams" test produces PASS for `GET /systems/sys-001/datastreams`, the "Single datastream access" test produces PASS for `GET /datastreams/ds-001`, the "Datastream schema endpoint" test produces PASS for `GET /datastreams/ds-001/schema`, the "Observation collection availability" test produces PASS for `GET /observations`, and the "Observation-datastream linkage" test produces PASS confirming observations reference datastream `ds-001`

### SCENARIO-DYN-PASS-003: Control Stream with Commands End-to-End Flow
- **Priority**: CRITICAL
- **References**: REQ-DYN-001, REQ-DYN-003, REQ-DYN-016
- **Preconditions**: The IUT has at least one system with a control stream containing commands.

**Given** a CS API endpoint with a system `sys-002` that has a control stream `cs-001` containing 3 commands, at least one of which has status `COMPLETED`
**When** the test engine executes the Control Streams & Commands tests
**Then** the "Control stream collection availability" test produces PASS for `GET /controlstreams`, the "Single command access" test produces PASS for `GET /commands/{id}`, the "Command status endpoint" test produces PASS for `GET /commands/{id}/status` returning a recognized status value, and the "Command result endpoint" test produces PASS for `GET /commands/{id}/result` returning the command result

### SCENARIO-DYN-PASS-004: System Events Validation
- **Priority**: NORMAL
- **References**: REQ-DYN-005, REQ-DYN-016
- **Preconditions**: The IUT has at least one system with lifecycle events recorded.

**Given** a CS API endpoint with a system `sys-001` that has 2 system events (e.g., `deployed` and `enabled`)
**When** the test engine executes the System Events tests
**Then** the "System events collection availability" test produces PASS for `GET /systemEvents`, the "System-scoped events" test produces PASS for `GET /systems/sys-001/events`, and the "Event schema validation" test produces PASS confirming each event has `id`, `type`, `time`, and a recognized event type value

### SCENARIO-DYN-PASS-005: SWE Common Encoding Negotiation
- **Priority**: NORMAL
- **References**: REQ-DYN-012, REQ-DYN-013, REQ-DYN-014, REQ-DYN-016
- **Preconditions**: The IUT supports all three SWE Common encodings and has at least one datastream with observations.

**Given** a CS API endpoint that supports SWE Common JSON, SWE Common Text, and SWE Common Binary encodings
**When** the test engine requests observations with `Accept: application/swe+json`, `Accept: text/csv`, and `Accept: application/swe+binary` respectively
**Then** the SWE Common JSON test validates the response against the SWE Common JSON schema and produces PASS, the SWE Common Text test confirms a text-based Content-Type and non-empty body and produces PASS, and the SWE Common Binary test confirms a binary Content-Type and non-empty body and produces PASS

### SCENARIO-DYN-OPTIN-001: Part 2 Write-Operation Opt-In Warning Displayed
- **Priority**: CRITICAL
- **References**: REQ-DYN-009
- **Preconditions**: The user is on the class selection UI and selects a Part 2 write-operation conformance class.

**Given** a user viewing the conformance class selection interface
**When** the user selects the "Part 2 Create/Replace/Delete" or "Part 2 Update" conformance class for testing
**Then** the system displays a warning message containing the text "These tests will create, modify, and delete resources on the target endpoint. Only run against a test or staging environment." and the user must acknowledge the warning before the assessment can proceed

### SCENARIO-DYN-OPTIN-002: Part 2 Write Operations Not Executed Without Opt-In
- **Priority**: CRITICAL
- **References**: REQ-DYN-009
- **Preconditions**: The user has not selected Part 2 write-operation conformance classes. The IUT declares Part 2 CRUD support in its conformance response.

**Given** a CS API endpoint that declares Part 2 CRUD and Update conformance classes
**When** the test engine runs with default class selection (Part 2 write-operation classes not opted into)
**Then** all Part 2 Create/Replace/Delete and Update tests are assigned SKIP status with reason "Write-operation tests require explicit opt-in" and no POST, PUT, PATCH, or DELETE requests are made to Part 2 resource endpoints

### SCENARIO-DYN-SKIP-001: Part 2 Conformance Class Not Declared
- **Priority**: CRITICAL
- **References**: REQ-DYN-019
- **Preconditions**: The IUT's `/conformance` response includes Part 1 classes but does not include any Part 2 conformance class URIs. The user has not manually selected Part 2 classes.

**Given** a CS API endpoint whose `/conformance` `conformsTo` array contains Part 1 class URIs but no Part 2 class URIs
**When** the test engine determines which Part 2 tests to execute
**Then** all Part 2 tests are assigned SKIP status with reason "Conformance class not declared by server" and no HTTP requests are made for Part 2 endpoints

### SCENARIO-DYN-DEP-001: Part 1 Failure Cascades to Part 2 Classes
- **Priority**: CRITICAL
- **References**: REQ-DYN-015
- **Preconditions**: The IUT declares both Part 1 and Part 2 conformance classes. Part 1 CS API Core tests fail.

**Given** a CS API endpoint where the Part 1 CS API Core test "Resource endpoint availability" fails because required link relations are missing
**When** the test engine evaluates the dependency graph after CS API Core tests complete
**Then** the Part 2 Common class and all classes that depend on it (Datastreams & Observations, Control Streams & Commands, Command Feasibility, System Events, System History, Part 2 Advanced Filtering, Part 2 JSON Encoding, Part 2 CRUD, Part 2 Update, SWE Common JSON, SWE Common Text, SWE Common Binary) are all assigned SKIP status with reason "Dependency class 'CS API Core' failed"

### SCENARIO-DYN-EMPTY-001: Empty Datastream Collection Skips Resource-Level Tests
- **Priority**: NORMAL
- **References**: REQ-DYN-017
- **Preconditions**: The IUT declares Datastreams & Observations conformance but the datastream collection is empty.

**Given** a CS API endpoint where `GET /datastreams` returns an empty collection with zero datastream resources
**When** the test engine executes Datastreams & Observations tests
**Then** the "Datastream collection availability" test produces PASS (empty collection is valid), the "Single datastream access", "Datastream schema validation", "Datastream schema endpoint", "Observation-datastream linkage" tests produce SKIP with reason "Collection is empty; no resources available to test", and the observation collection availability test still executes normally

### SCENARIO-DYN-ENCODING-001: SWE Common Encoding Not Supported Graceful Skip
- **Priority**: NORMAL
- **References**: REQ-DYN-013, REQ-DYN-014
- **Preconditions**: The IUT does not support SWE Common Text or SWE Common Binary encodings.

**Given** a CS API endpoint that responds with HTTP 406 when `Accept: text/csv` or `Accept: application/swe+binary` is requested for observations
**When** the test engine executes SWE Common Text and SWE Common Binary tests
**Then** the SWE Common Text tests are assigned SKIP with reason "SWE Common Text encoding not supported by server" and the SWE Common Binary tests are assigned SKIP with reason "SWE Common Binary encoding not supported by server"

## Implementation Status (2026-03-31)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-DYN-001: Part 2 Common (2 reqs, 18 tests) — `registry/part2-common.ts`
- REQ-DYN-002: Part 2 JSON Encoding (3 reqs, 29 tests) — `registry/part2-json.ts`
- REQ-DYN-003/004: Datastreams & Observations (6 reqs, 38 tests) — `registry/datastreams.ts`
- REQ-DYN-005/006: Control Streams & Commands (6 reqs, 38 tests) — `registry/controlstreams.ts`
- REQ-DYN-007: Command Feasibility (2 reqs, 17 tests) — `registry/part2-feasibility.ts`
- REQ-DYN-008: System Events (3 reqs, 18 tests) — `registry/part2-events.ts`
- REQ-DYN-009: System History (2 reqs, 17 tests) — `registry/part2-history.ts`
- REQ-DYN-010: Part 2 Advanced Filtering (4 reqs, 21 tests) — `registry/part2-filtering.ts`
- REQ-DYN-011: Part 2 CRUD (3 reqs, 18 tests) — `registry/part2-crud.ts`
- REQ-DYN-012: Part 2 Update (2 reqs, 16 tests) — `registry/part2-update.ts`
- REQ-DYN-013/014: SWE Common JSON/Text/Binary (6 reqs, 43 tests) — `registry/part2-swe-encodings.ts`
- REQ-DYN-015 to REQ-DYN-019: Cross-cutting (dependency, verdict, empty, cleanup, undeclared)

### Deviations from Spec
- SWE Text/Binary: Content-Type + non-empty body check only (no deep parsing), per design spec
- Command Feasibility: skips with 404 (optional feature per spec)

### Deferred
- None — all 19 requirements implemented

## Change History

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-03-31 | Initial specification created | Covers OGC 23-002 Part 2 Dynamic Data conformance test execution requirements across 13 conformance classes |
