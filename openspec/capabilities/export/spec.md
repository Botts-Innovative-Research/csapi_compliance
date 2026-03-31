# Export & Sharing — Specification

> Version: 1.0 | Status: Draft | Last updated: 2026-03-31

## Purpose

Enable users to extract assessment results in portable, machine-readable (JSON) and human-readable (PDF) formats for archival, sharing with colleagues, inclusion in procurement evidence packages, and integration with external tooling. The JSON export uses a versioned schema to ensure forward-compatible consumption by downstream systems.

## Functional Requirements

### REQ-EXP-001: JSON Export Availability
The system SHALL provide a JSON export action accessible from the results dashboard after an assessment has completed or has been cancelled (partial results).

### REQ-EXP-002: JSON Export Content — Results
The system SHALL include in the JSON export the full assessment results comprising: assessment metadata (server URL, assessment timestamp, tool version, schema version), summary counts (total, passed, failed, skipped, compliance percentage), per-conformance-class results (class name, class URI, pass/fail/skip badge, per-requirement results), and per-test results (requirement ID, requirement URI, test name, status, failure reason if applicable, skip reason if applicable).

### REQ-EXP-003: JSON Export Content — Request/Response Traces
The system SHALL include in the JSON export the complete request/response trace for every executed test, containing: HTTP method, full URL, request headers, request body (if present), response status code, response headers, response body (subject to the same truncation rules as REQ-CAP-008), and response time in milliseconds.

### REQ-EXP-004: JSON Export Credential Masking
The system SHALL apply credential masking to all request/response data included in the JSON export, using the same masking rules defined in REQ-CAP-006 and REQ-CAP-007.

### REQ-EXP-005: JSON Schema Versioning
The system SHALL include a `schemaVersion` field at the root level of every JSON export. The initial schema version SHALL be `"1"`. The schema version SHALL be incremented whenever a breaking change is made to the JSON export structure.

### REQ-EXP-006: JSON Export Schema Stability
The system SHALL treat the JSON export schema as a contract: fields present in a given schema version SHALL NOT be removed or have their type changed within that version. New fields MAY be added without incrementing the version (additive, non-breaking changes).

### REQ-EXP-007: JSON Export File Naming
The system SHALL name the exported JSON file using the pattern `csapi-compliance-{server-hostname}-{YYYYMMDD-HHmmss}.json`, where `{server-hostname}` is derived from the assessed server URL and `{YYYYMMDD-HHmmss}` is the assessment completion timestamp in UTC.

### REQ-EXP-008: JSON Export Valid JSON
The system SHALL produce a JSON export file that is valid JSON (parseable by any standards-conformant JSON parser) and encoded in UTF-8.

### REQ-EXP-009: PDF Export Availability
The system SHALL provide a PDF export action accessible from the results dashboard after an assessment has completed or has been cancelled (partial results).

### REQ-EXP-010: PDF Export Content — Summary Section
The system SHALL include in the PDF export a summary section containing: the assessed server URL, the assessment date and time, the tool version, and the same summary statistics shown on the dashboard (total, passed, failed, skipped, compliance percentage).

### REQ-EXP-011: PDF Export Content — Per-Class Results
The system SHALL include in the PDF export a per-conformance-class section listing each class with its name, URI, pass/fail/skip badge, and individual requirement pass/fail/skip counts.

### REQ-EXP-012: PDF Export Content — Failed Test Details
The system SHALL include in the PDF export a section for failed tests containing: the test name, the requirement ID and URI, the failure reason (including expected vs. actual behavior), and the request URL and response status code associated with the failure.

### REQ-EXP-013: PDF Export Disclaimer
The system SHALL include the unofficial status disclaimer (as defined in REQ-RPT-010) on the first page of every PDF export.

### REQ-EXP-014: PDF Export Readability
The system SHALL produce a PDF export that is text-selectable (not a rasterized image), uses legible font sizes (minimum 9pt body text), and includes page numbers on every page.

### REQ-EXP-015: Partial Results Export
The system SHALL allow both JSON and PDF export of partial results when an assessment has been cancelled before completion. The export SHALL clearly indicate that results are partial (e.g., a `"status": "partial"` field in JSON, a "Partial Results" label in PDF).

### REQ-EXP-016: JSON Export Disclaimer
The system SHALL include the unofficial status disclaimer text (as defined in REQ-RPT-010) as a `disclaimer` field at the root level of the JSON export.

## Acceptance Scenarios

### SCENARIO-EXP-JSON-001: Downloading a JSON Export
**GIVEN** an assessment has completed successfully
**WHEN** the user clicks the JSON export button on the results dashboard
**THEN** the browser downloads a `.json` file named according to the pattern `csapi-compliance-{hostname}-{timestamp}.json`.

### SCENARIO-EXP-JSON-002: JSON Export Contains Summary Data
**GIVEN** an assessment completed with 40 passed, 5 failed, 3 skipped
**WHEN** the user opens the exported JSON file
**THEN** the JSON contains a summary object with `total: 48`, `passed: 40`, `failed: 5`, `skipped: 3`, and `compliancePercent: 88.9`.

### SCENARIO-EXP-JSON-003: JSON Export Contains Per-Class Results
**GIVEN** an assessment covered 3 conformance classes
**WHEN** the user opens the exported JSON file
**THEN** the JSON contains an array of 3 conformance class objects, each with `name`, `uri`, `badge`, `passedCount`, `failedCount`, and `skippedCount` fields.

### SCENARIO-EXP-JSON-004: JSON Export Contains Request/Response Traces
**GIVEN** an assessment executed 20 tests
**WHEN** the user opens the exported JSON file
**THEN** each of the 20 test result objects includes a `trace` object containing `request` (with `method`, `url`, `headers`, `body`) and `response` (with `statusCode`, `headers`, `body`, `responseTimeMs`).

### SCENARIO-EXP-JSON-005: JSON Export Credentials Are Masked
**GIVEN** a test request included an `Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.longtoken` header
**WHEN** the user opens the exported JSON file and inspects that test's request headers
**THEN** the Authorization header value shows the token masked with only the first 4 and last 4 characters visible.

### SCENARIO-EXP-JSON-006: JSON Export Schema Version Present
**GIVEN** an assessment has completed
**WHEN** the user opens the exported JSON file
**THEN** the root object contains `"schemaVersion": "1"`.

### SCENARIO-EXP-JSON-007: JSON Export Is Valid UTF-8 JSON
**GIVEN** an assessment has completed and the JSON file has been downloaded
**WHEN** the file is parsed by a JSON parser (e.g., `JSON.parse()` or `jq .`)
**THEN** parsing succeeds without errors and the file encoding is UTF-8.

### SCENARIO-EXP-JSON-008: JSON Export Contains Disclaimer
**GIVEN** an assessment has completed
**WHEN** the user opens the exported JSON file
**THEN** the root object contains a `disclaimer` field whose value includes "unofficial" and "not endorsed" and "OGC".

### SCENARIO-EXP-PDF-001: Downloading a PDF Export
**GIVEN** an assessment has completed successfully
**WHEN** the user clicks the PDF export button on the results dashboard
**THEN** the browser downloads a `.pdf` file.

### SCENARIO-EXP-PDF-002: PDF Export Contains Summary Section
**GIVEN** an assessment completed with 40 passed, 5 failed, 3 skipped against `https://demo.ogc.org/api`
**WHEN** the user opens the exported PDF
**THEN** the first page contains the server URL `https://demo.ogc.org/api`, the assessment date, and summary statistics matching the dashboard.

### SCENARIO-EXP-PDF-003: PDF Export Contains Per-Class Results
**GIVEN** an assessment covered 3 conformance classes, 2 passing and 1 failing
**WHEN** the user opens the exported PDF
**THEN** all 3 conformance classes are listed with their names, URIs, and pass/fail badges.

### SCENARIO-EXP-PDF-004: PDF Export Contains Failed Test Details
**GIVEN** 2 tests failed during the assessment
**WHEN** the user opens the exported PDF
**THEN** a "Failed Tests" section lists both tests with their names, requirement IDs, failure reasons (expected vs. actual), and the request URL and response status code for each.

### SCENARIO-EXP-PDF-005: PDF Export Includes Disclaimer on First Page
**GIVEN** an assessment has completed
**WHEN** the user opens the exported PDF
**THEN** the first page contains the unofficial status disclaimer text including "unofficial", "not endorsed", and "OGC".

### SCENARIO-EXP-PDF-006: PDF Is Text-Selectable with Page Numbers
**GIVEN** the exported PDF has been opened in a PDF reader
**WHEN** the user attempts to select text on any page
**THEN** the text is selectable (not a rasterized image) and every page displays a page number.

### SCENARIO-EXP-PARTIAL-001: JSON Export of Cancelled Assessment
**GIVEN** an assessment was cancelled after 25 of 50 tests completed
**WHEN** the user exports results as JSON
**THEN** the JSON file contains results for the 25 completed tests and includes `"status": "partial"` at the root level.

### SCENARIO-EXP-PARTIAL-002: PDF Export of Cancelled Assessment
**GIVEN** an assessment was cancelled after 25 of 50 tests completed
**WHEN** the user exports results as PDF
**THEN** the PDF clearly indicates "Partial Results" and includes only the 25 completed test results.

### SCENARIO-EXP-EDGE-001: Export with No Failed Tests
**GIVEN** an assessment completed with all tests passing
**WHEN** the user exports results as PDF
**THEN** the PDF omits the "Failed Tests" detail section or displays a message such as "No failed tests" in that section.

### SCENARIO-EXP-EDGE-002: Export with Server Hostname Containing Port
**GIVEN** the assessed server URL is `https://example.com:8443/api`
**WHEN** the user exports results as JSON
**THEN** the filename includes the hostname portion `example.com-8443` (port separated by hyphen, not colon, for filesystem compatibility).

## Implementation Status (2026-03-31)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-EXP-001 to REQ-EXP-008: JSON export with versioned schema (v1), credential masking, disclaimer, Map serialization, filename convention — `src/engine/export-engine.ts`, 15 tests
- REQ-EXP-009 to REQ-EXP-014: PDF export with PDFKit (A4, summary page, per-class sections, failed test details, disclaimer) — `src/engine/export-engine.ts`
- API routes: GET /api/assessments/:id/export?format=json|pdf — `src/server/routes/assessments.ts`

### Deviations from Spec
- None

### Deferred
- None — all 16 requirements implemented
