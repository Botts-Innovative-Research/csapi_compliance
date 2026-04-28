# Result Reporting & Dashboard — Specification

> Version: 1.0 | Status: Frozen — v1.0 web app, superseded by ets-ogcapi-connectedsystems | Last updated: 2026-04-27
>
> **Frozen 2026-04-27.** TestNG report rendering in TeamEngine supersedes this capability; see `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`.

## Purpose

Present conformance assessment results in a structured, navigable dashboard that gives users immediate insight into overall compliance posture, per-class outcomes, and individual test details. The reporting capability must make it clear which conformance classes pass or fail, surface actionable detail for failures, and include an explicit disclaimer about the unofficial nature of the assessment.

## Functional Requirements

### REQ-RPT-001: Summary Dashboard
The system SHALL display a summary dashboard upon assessment completion that includes: the total number of tests executed, the count of tests passed, the count of tests failed, the count of tests skipped, and the overall compliance percentage (calculated as passed / (passed + failed) * 100, rounded to one decimal place; skipped tests are excluded from the denominator).

### REQ-RPT-002: Conformance Class Organization
The system SHALL organize assessment results by conformance class, listing every conformance class defined in the loaded test suite.

### REQ-RPT-003: Expandable Class Sections
The system SHALL present each conformance class as a collapsible/expandable section. By default, failed classes SHALL be expanded and passing classes SHALL be collapsed.

### REQ-RPT-004: Per-Class Detail Display
The system SHALL display the following information for each conformance class: the class name, the class URI (as defined in the OGC standard), the count of tests passed within the class, the count of tests failed within the class, the count of tests skipped within the class, and a pass/fail badge.

### REQ-RPT-005: Class Pass/Fail Determination
The system SHALL determine a conformance class as "pass" if and only if every requirement within that class has a passing test result. If any single requirement within the class has a failing test result, the entire class SHALL be marked as "fail". Skipped tests SHALL NOT cause a class to fail, but a class with all tests skipped and none passing SHALL be marked as "skip" rather than "pass".

### REQ-RPT-006: Per-Test Detail Display
The system SHALL display the following information for each individual test: the requirement ID it validates, the requirement URI, the test name, the test status (pass, fail, or skip), the failure reason (if status is fail), the skip reason (if status is skip), and a navigable link to the captured request/response exchange for that test.

### REQ-RPT-007: Failure Reason Content
The system SHALL ensure that every failed test includes a failure reason that contains at minimum: a human-readable description of the expected behavior and a description of the actual behavior observed.

### REQ-RPT-008: Skip Reason Content
The system SHALL ensure that every skipped test includes a skip reason that explains why the test was not executed (e.g., "Prerequisite conformance class X not supported", "Optional endpoint not available").

### REQ-RPT-009: Request/Response Link from Test Detail
The system SHALL provide a direct link or in-place expansion from each test detail entry to the full captured request/response data for that test, as specified by the Request/Response Capture capability (REQ-CAP-005).

### REQ-RPT-010: Unofficial Status Disclaimer
The system SHALL display a clearly visible disclaimer on the summary dashboard and on every exported report stating: "This assessment is unofficial and is not endorsed, certified, or approved by the Open Geospatial Consortium (OGC). Results do not constitute official OGC conformance certification."

### REQ-RPT-011: Disclaimer Placement and Visibility
The system SHALL position the disclaimer so it is visible without scrolling on the summary dashboard (above the fold or in a fixed/sticky banner). The disclaimer SHALL use a visually distinct style (e.g., bordered callout, colored background) to differentiate it from regular content.

### REQ-RPT-012: Empty State Handling
The system SHALL display an appropriate message when an assessment completes with zero tests executed, indicating that no tests were applicable or the test suite was empty, rather than showing an empty dashboard.

## Acceptance Scenarios

### SCENARIO-RPT-DASH-001: Summary Dashboard After Successful Assessment
**GIVEN** an assessment has completed with 50 tests passed, 5 tests failed, and 3 tests skipped
**WHEN** the user views the summary dashboard
**THEN** the dashboard displays: Total: 58, Passed: 50, Failed: 5, Skipped: 3, Compliance: 90.9%.

### SCENARIO-RPT-DASH-002: Compliance Percentage Excludes Skipped Tests
**GIVEN** an assessment has completed with 20 tests passed, 0 tests failed, and 10 tests skipped
**WHEN** the user views the summary dashboard
**THEN** the compliance percentage is displayed as 100.0% (20 / (20 + 0) * 100).

### SCENARIO-RPT-DASH-003: Compliance Percentage with All Tests Failed
**GIVEN** an assessment has completed with 0 tests passed and 12 tests failed
**WHEN** the user views the summary dashboard
**THEN** the compliance percentage is displayed as 0.0%.

### SCENARIO-RPT-CLASS-001: Conformance Classes Listed and Expandable
**GIVEN** an assessment has completed covering 4 conformance classes
**WHEN** the user views the results page
**THEN** all 4 conformance classes are listed, each as a collapsible section, with failed classes expanded and passing classes collapsed by default.

### SCENARIO-RPT-CLASS-002: Per-Class Detail Content
**GIVEN** an assessment has completed and the conformance class "OGC API - Features - Part 1: Core" has 18 tests passed, 2 tests failed, and 1 test skipped
**WHEN** the user expands that conformance class section
**THEN** the section displays the class name "OGC API - Features - Part 1: Core", its URI, Passed: 18, Failed: 2, Skipped: 1, and a "fail" badge.

### SCENARIO-RPT-CLASS-003: Class Passes Only When All Requirements Pass
**GIVEN** a conformance class contains 10 requirements, 9 of which have passing tests and 1 of which has a failing test
**WHEN** the user views that class in the results
**THEN** the class badge shows "fail", not "pass".

### SCENARIO-RPT-CLASS-004: Class with All Tests Passing Shows Pass Badge
**GIVEN** a conformance class contains 8 requirements, all of which have passing tests
**WHEN** the user views that class in the results
**THEN** the class badge shows "pass".

### SCENARIO-RPT-CLASS-005: Class with All Tests Skipped Shows Skip Badge
**GIVEN** a conformance class contains 5 requirements, all of which are skipped and none have passing or failing results
**WHEN** the user views that class in the results
**THEN** the class badge shows "skip" rather than "pass" or "fail".

### SCENARIO-RPT-TEST-001: Per-Test Detail for a Failing Test
**GIVEN** a test named "Validate Landing Page Content-Type" has failed
**WHEN** the user views the detail for that test
**THEN** the detail shows: Requirement ID (e.g., `/req/core/root-success`), Requirement URI, Test Name "Validate Landing Page Content-Type", Status: fail, Failure Reason containing expected and actual behavior descriptions, and a link to the request/response capture.

### SCENARIO-RPT-TEST-002: Per-Test Detail for a Skipped Test
**GIVEN** a test named "Validate Tiles TileMatrixSet" has been skipped because the Tiles conformance class is not supported
**WHEN** the user views the detail for that test
**THEN** the detail shows Status: skip and a skip reason such as "Prerequisite conformance class Tiles not supported", with no failure reason displayed.

### SCENARIO-RPT-TEST-003: Per-Test Detail for a Passing Test
**GIVEN** a test named "Validate API Definition Accessibility" has passed
**WHEN** the user views the detail for that test
**THEN** the detail shows Status: pass, no failure reason, no skip reason, and a link to the request/response capture.

### SCENARIO-RPT-LINK-001: Navigating from Test Detail to Request/Response
**GIVEN** a completed test has a captured request/response exchange
**WHEN** the user clicks the request/response link in the test detail view
**THEN** the system displays the full captured HTTP request and response for that test, including method, URL, headers, bodies, status code, and response time.

### SCENARIO-RPT-DISC-001: Disclaimer Visible on Dashboard
**GIVEN** an assessment has completed
**WHEN** the user views the summary dashboard without scrolling
**THEN** a visually distinct disclaimer is visible stating that the assessment is unofficial and not endorsed by OGC.

### SCENARIO-RPT-DISC-002: Disclaimer Text Content
**GIVEN** an assessment has completed
**WHEN** the user reads the disclaimer on the summary dashboard
**THEN** the disclaimer text includes all of: "unofficial", "not endorsed", "not certified", "not approved", "Open Geospatial Consortium", and "OGC".

### SCENARIO-RPT-EMPTY-001: No Tests Executed
**GIVEN** an assessment has completed with 0 tests executed (no passes, no failures, no skips)
**WHEN** the user views the summary dashboard
**THEN** the system displays a message such as "No tests were executed" instead of an empty or zero-filled dashboard.

### SCENARIO-RPT-EDGE-001: Single Test Assessment
**GIVEN** an assessment has completed with exactly 1 test that passed
**WHEN** the user views the summary dashboard
**THEN** the dashboard displays Total: 1, Passed: 1, Failed: 0, Skipped: 0, Compliance: 100.0%, and the single conformance class is listed.

### SCENARIO-RPT-FAIL-001: Failure Reason Contains Expected and Actual
**GIVEN** a test has failed because the response Content-Type was `text/html` instead of `application/json`
**WHEN** the user views the failure reason for that test
**THEN** the failure reason includes text describing the expected behavior (e.g., "Expected Content-Type: application/json") and the actual behavior (e.g., "Received Content-Type: text/html").

## Implementation Status (2026-03-31)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-RPT-001: Summary dashboard with compliance %, stat cards, bar chart — `src/components/results/summary-dashboard.tsx`
- REQ-RPT-002, REQ-RPT-003: Results organized by conformance class with expand/collapse — `src/components/results/conformance-class-panel.tsx`
- REQ-RPT-004, REQ-RPT-005: Per-class detail with pass/fail badges (class passes only if ALL tests pass) — `src/components/results/conformance-class-panel.tsx`
- REQ-RPT-006 to REQ-RPT-009: Per-test detail with drawer, req/res viewer, prev/next navigation — `src/components/results/test-detail-drawer.tsx`, `src/components/results/http-exchange-viewer.tsx`
- REQ-RPT-010, REQ-RPT-011: Disclaimer in footer and results page — `src/app/layout.tsx`, `src/app/assess/[id]/results/page.tsx`

### Deviations from Spec
- None

### Deferred
- None — all 12 requirements implemented
