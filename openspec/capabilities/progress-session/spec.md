# Progress & Session Management — Specification

> Version: 1.0 | Status: Frozen — v1.0 web app, superseded by ets-ogcapi-connectedsystems | Last updated: 2026-04-27
>
> **Frozen 2026-04-27.** TeamEngine owns session lifecycle in the new ETS; see `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`.

## Purpose

Provide real-time visibility into assessment execution, allow users to cancel a running assessment gracefully, persist results for later retrieval, and offer a simple, login-free landing page that serves as the entry point for initiating an assessment. Together these capabilities ensure the tool is approachable, responsive during long-running assessments, and useful for asynchronous workflows where results are shared via URL.

## Functional Requirements

### REQ-SESS-001: Real-Time Progress Display
The system SHALL display real-time progress during an assessment, showing at minimum: the name of the conformance class currently being tested, the name of the test currently executing, the count of completed tests versus total tests (e.g., "12 / 58"), and a visual progress bar representing the percentage of tests completed.

### REQ-SESS-002: Progress Update Frequency
The system SHALL update the progress display within 1 second of each test completing, so the user sees near-real-time feedback.

### REQ-SESS-003: Progress Bar Accuracy
The system SHALL compute progress bar completion percentage as (completed tests / total tests) * 100, and the visual bar width SHALL correspond to this percentage.

### REQ-SESS-004: Cancel Running Assessment
The system SHALL provide a clearly labeled "Cancel" button (or equivalent control) visible during assessment execution that allows the user to request cancellation of the running assessment.

### REQ-SESS-005: Graceful Cancellation Behavior
The system SHALL, upon cancellation, stop dispatching new tests, allow the currently executing test to complete (or time out), and then transition to the results view displaying all results collected up to the point of cancellation.

### REQ-SESS-006: Partial Results Marking
The system SHALL clearly mark results from a cancelled assessment as "partial" in both the dashboard view (e.g., a "Partial Results" banner) and in any exported data (e.g., `"status": "partial"` in JSON, "Partial Results" label in PDF).

### REQ-SESS-007: Partial Results Completeness
The system SHALL include in partial results only tests that fully completed (passed, failed, or were skipped) before cancellation. Tests that were not yet started SHALL NOT appear in the results. The in-flight test at cancellation time SHALL appear only if it completed before the cancellation took effect.

### REQ-SESS-008: Results Persistence Duration
The system SHALL persist assessment results for at least 24 hours from the time the assessment completed (or was cancelled), after which the system MAY delete them.

### REQ-SESS-009: Unique Result URL
The system SHALL assign a unique, shareable URL to each completed or cancelled assessment. Navigating to this URL within the persistence window (24 hours) SHALL display the full results dashboard for that assessment.

### REQ-SESS-010: Unique URL Format
The system SHALL generate result URLs using a non-sequential, non-guessable identifier (e.g., UUID v4 or equivalent) to prevent enumeration of other users' results.

### REQ-SESS-011: Expired Result URL Handling
The system SHALL, when a user navigates to a result URL whose data has expired (beyond the 24-hour persistence window), display a clear message stating that the results have expired and are no longer available, rather than showing a generic error page.

### REQ-SESS-012: Landing Page Content
The system SHALL display a landing page at the application root URL that contains: a brief explanation of what the tool does (conformance assessment for OGC API standards), a text input field for the user to enter the base URL of the server to be tested, and a "Start Assessment" button that initiates the assessment.

### REQ-SESS-013: No Login Required
The system SHALL NOT require user authentication, account creation, or login to access the landing page, start an assessment, view results, or export results.

### REQ-SESS-014: Landing Page URL Validation
The system SHALL validate the URL entered on the landing page before starting an assessment. Validation SHALL check that the value is a syntactically valid HTTP or HTTPS URL. If validation fails, the system SHALL display an inline error message and SHALL NOT start the assessment.

### REQ-SESS-015: Landing Page Input Affordances
The system SHALL provide the URL input field with a placeholder example (e.g., `https://example.com/ogcapi`) and SHALL allow the user to submit by pressing Enter in the input field or by clicking the "Start Assessment" button.

### REQ-SESS-016: Concurrent Session Isolation
The system SHALL support multiple concurrent assessments from different users without interference. Each assessment SHALL operate independently, with its own progress tracking, results, and unique URL.

## Acceptance Scenarios

### SCENARIO-SESS-PROG-001: Viewing Real-Time Progress
**GIVEN** the user has started an assessment containing 58 tests
**WHEN** the 12th test completes
**THEN** the progress display updates within 1 second to show the current conformance class name, the name of the next test being executed, "12 / 58" completed, and a progress bar at approximately 20.7%.

### SCENARIO-SESS-PROG-002: Progress Bar at Start
**GIVEN** the user has just started an assessment
**WHEN** no tests have completed yet
**THEN** the progress display shows "0 / {total}" and the progress bar is at 0%.

### SCENARIO-SESS-PROG-003: Progress Bar at Completion
**GIVEN** an assessment has all 58 tests completed
**WHEN** the last test finishes
**THEN** the progress bar reaches 100% and the system transitions to the results dashboard.

### SCENARIO-SESS-PROG-004: Conformance Class Transition in Progress
**GIVEN** an assessment is running and the last test of "Core" conformance class has just completed
**WHEN** the first test of "GeoJSON" conformance class begins
**THEN** the progress display updates the current conformance class name from "Core" to "GeoJSON".

### SCENARIO-SESS-CANCEL-001: Cancelling a Running Assessment
**GIVEN** an assessment is in progress with 30 of 58 tests completed
**WHEN** the user clicks the "Cancel" button
**THEN** the system stops dispatching new tests, waits for the currently executing test to finish, and transitions to the results view.

### SCENARIO-SESS-CANCEL-002: Partial Results After Cancellation
**GIVEN** the user cancelled an assessment after 30 tests completed (and 1 in-flight test completed before cancellation took effect, totaling 31)
**WHEN** the results view is displayed
**THEN** the dashboard shows results for 31 tests, a "Partial Results" banner is displayed, and the summary counts reflect only the 31 completed tests.

### SCENARIO-SESS-CANCEL-003: Partial Results Exclude Unstarted Tests
**GIVEN** the user cancelled an assessment after 31 tests completed out of 58 total
**WHEN** the user inspects the results
**THEN** the results contain exactly 31 test entries; the remaining 27 tests that were never started do not appear.

### SCENARIO-SESS-CANCEL-004: Cancel Button Not Visible After Completion
**GIVEN** an assessment has fully completed
**WHEN** the user views the results dashboard
**THEN** no "Cancel" button is displayed.

### SCENARIO-SESS-PERSIST-001: Accessing Results via Unique URL Within 24 Hours
**GIVEN** an assessment completed at 10:00 UTC on 2026-03-29 and was assigned URL `https://app.example.com/results/a1b2c3d4-e5f6-7890-abcd-ef1234567890`
**WHEN** a user navigates to that URL at 09:00 UTC on 2026-03-31 (23 hours later)
**THEN** the full results dashboard for that assessment is displayed.

### SCENARIO-SESS-PERSIST-002: Sharing a Result URL with Another Person
**GIVEN** User A completed an assessment and received a unique result URL
**WHEN** User A sends the URL to User B and User B opens it in a different browser
**THEN** User B sees the same results dashboard without needing to log in.

### SCENARIO-SESS-PERSIST-003: Expired Results URL
**GIVEN** an assessment completed at 10:00 UTC on 2026-03-28
**WHEN** a user navigates to the result URL at 11:00 UTC on 2026-03-29 (25 hours later)
**THEN** the system displays a message such as "These results have expired and are no longer available" instead of a generic error or blank page.

### SCENARIO-SESS-PERSIST-004: Non-Guessable URL
**GIVEN** an assessment has completed and been assigned a result URL
**WHEN** an attacker attempts to enumerate results by incrementing or decrementing the identifier in the URL
**THEN** the attacker receives "not found" or "expired" messages for all guessed URLs, because identifiers are non-sequential (e.g., UUID v4).

### SCENARIO-SESS-LAND-001: Landing Page Initial View
**GIVEN** a user navigates to the application root URL for the first time
**WHEN** the page loads
**THEN** the page displays an explanation of the tool's purpose, a URL input field with a placeholder example URL, and a "Discover Endpoint" button (disabled until a valid URL is entered).

### SCENARIO-SESS-LAND-002: Starting Discovery from the Landing Page
**GIVEN** the user is on the landing page
**WHEN** the user enters `https://demo.ogc.org/api` in the URL field and clicks "Discover Endpoint"
**THEN** the system performs synchronous endpoint discovery (landing page + conformance + collections), creates a session, and transitions to `/assess/configure?session={id}` where the user reviews discovered conformance classes, selects which to run, configures auth and run settings, and then clicks a separate **"Start Assessment"** button to launch the test execution and transition to the progress view. Rationale for two-step flow: surfaced 2026-04-02 to give users explicit class-selection control and to detect unreachable IUTs before committing to a long test run.

### SCENARIO-SESS-LAND-003: Starting Discovery via Enter Key
**GIVEN** the user is on the landing page and has entered a valid URL in the input field
**WHEN** the user presses the Enter key while the input field is focused
**THEN** the system performs discovery and transitions to the configure page, equivalent to clicking "Discover Endpoint".

### SCENARIO-SESS-LAND-004: Invalid URL Rejection
**GIVEN** the user is on the landing page
**WHEN** the user enters `not-a-url` in the URL field and blurs the input
**THEN** the system displays an inline error message such as "Please enter a valid HTTP or HTTPS URL", marks the input `aria-invalid="true"`, and keeps the "Discover Endpoint" button disabled.

### SCENARIO-SESS-LAND-005: FTP URL Rejection
**GIVEN** the user is on the landing page
**WHEN** the user enters `ftp://example.com/data` in the URL field and blurs the input
**THEN** the system displays an inline error message indicating only HTTP and HTTPS URLs are accepted, and keeps the "Discover Endpoint" button disabled.

### SCENARIO-SESS-LAND-006: Empty URL Rejection
**GIVEN** the user is on the landing page
**WHEN** no URL has been entered
**THEN** the "Discover Endpoint" button remains disabled (the system gates submission at the button rather than at click time, so no error message is shown until the user types and blurs an invalid value).

### SCENARIO-SESS-CONFIRM-001: Destructive-Operation Confirmation Gate (Client UX)
**GIVEN** the user is on the configure page after discovering an IUT that advertises a mutating conformance class (e.g., `create-replace-delete` or `update`)
**WHEN** the mutating class is selected (auto-selected by default if supported)
**THEN** the system displays a destructive-confirmation checkbox labeled "I understand these tests will mutate data on the target endpoint", keeps the Start Assessment button disabled until the checkbox is checked, re-disables Start if the checkbox is unchecked again, and removes the checkbox entirely if no mutating class remains selected.

### SCENARIO-SESS-CONFIRM-002: Destructive-Operation Confirmation Gate (Backend Enforcement)
**GIVEN** a POST /api/assessments/:id/start request arrives at the server from any HTTP client (including curl, scripts, or third-party tools bypassing the browser UX)
**WHEN** the request body selects one or more conformance classes whose URI ends in `/conf/create-replace-delete` or `/conf/update`
**THEN** the server returns HTTP 400 with `{ "code": "DESTRUCTIVE_CONFIRM_REQUIRED", "error": "..." }` and the test run is **not** started — unless the request body also includes `destructiveConfirmed: true`, in which case the run proceeds normally. This mirrors the client UX gate and provides defense-in-depth against curl-bypass of the checkbox. Traced by `tests/unit/server/assessments.test.ts` (3 tests covering non-destructive happy path, destructive-without-confirm 400, and destructive-with-confirm 200).

### SCENARIO-SESS-AUTH-001: No Login Required for Any Action
**GIVEN** a user has never visited the application before and has no account
**WHEN** the user navigates to the landing page, enters a URL, starts an assessment, views results, and exports results
**THEN** at no point is the user prompted to log in, create an account, or authenticate.

### SCENARIO-SESS-CONC-001: Two Concurrent Assessments
**GIVEN** User A starts an assessment against `https://server-a.example.com`
**WHEN** User B simultaneously starts an assessment against `https://server-b.example.com`
**THEN** both assessments run independently, each with its own progress display and result URL, and neither assessment's results contain data from the other.

### SCENARIO-SESS-EDGE-001: Cancellation During First Test
**GIVEN** an assessment has just started and the first test is executing
**WHEN** the user clicks "Cancel"
**THEN** the system waits for the first test to complete, then shows partial results with 1 test result and a "Partial Results" banner.

### SCENARIO-SESS-EDGE-002: Cancellation During Last Test
**GIVEN** an assessment is executing its final test (test 58 of 58)
**WHEN** the user clicks "Cancel"
**THEN** the system waits for the final test to complete and shows complete results (not marked as partial, since all tests completed).

## Implementation Status (2026-04-17)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-SESS-001 to REQ-SESS-003: SSEBroadcaster with event history and replay (`src/engine/sse-broadcaster.ts`, 8 tests)
- REQ-SESS-004 to REQ-SESS-007: CancelToken + cancel API endpoint (`src/engine/cancel-token.ts`, `src/server/routes/assessments.ts`)
- REQ-SESS-008 to REQ-SESS-011: SessionManager with 24h TTL + ResultStore with file-backed persistence (`src/engine/session-manager.ts`, `src/engine/result-store.ts`, 27 tests)
- REQ-SESS-012 to REQ-SESS-015: Landing page with URL input, no login required (`src/app/page.tsx`)
- Frontend progress view page at `src/app/assess/[id]/progress/page.tsx` — consumes SSE via `createSSEClient`, renders progress bar, counter, current class/test, test log, cancel dialog.

### Deviations from Spec
- None

### Scenario Verification
- SCENARIO-SESS-PROG-001 ("within 1s, counter + bar + class + test name update"): **PASS** 2026-04-17. Covered by hermetic `tests/e2e/assessment-flow.spec.ts` TC-E2E-007 which installs a FakeEventSource, drives staged events, and asserts counter/percent/aria-valuenow/class-name/test-name with a `<1000ms` emit→visible latency budget. Chromium 674ms / firefox 1.6s. See `_bmad/traceability.md`.
- SCENARIO-SESS-PROG-004 (class transition) covered incidentally by the same test.
