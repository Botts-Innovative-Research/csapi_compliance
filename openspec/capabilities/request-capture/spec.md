# Request/Response Capture — Specification

> Version: 1.0 | Status: Implemented | Last updated: 2026-04-16

## Purpose

Provide full observability into the HTTP traffic exchanged during a conformance assessment. Every request sent to the server under test and every response received must be captured, timestamped, and made available to the user so that failures can be diagnosed, evidence can be exported, and sensitive credentials are never inadvertently exposed.

## Functional Requirements

### REQ-CAP-001: Full Request Capture
The system SHALL capture every HTTP request dispatched during an assessment, recording at minimum the HTTP method, the fully-qualified URL (including query parameters), all request headers, and the complete request body (if present).

### REQ-CAP-002: Full Response Capture
The system SHALL capture every HTTP response received during an assessment, recording at minimum the HTTP status code, all response headers, the complete response body, and the response time measured in milliseconds from request dispatch to final byte received.

### REQ-CAP-003: Response Time Precision
The system SHALL measure response time with at least millisecond precision and SHALL record the value as a non-negative integer representing elapsed milliseconds.

### REQ-CAP-004: Request/Response Pairing
The system SHALL maintain a one-to-one association between each captured request and its corresponding captured response, so that a user can always view them together as a single exchange.

### REQ-CAP-005: Viewable Request/Response per Test
The system SHALL allow the user to view the captured request/response exchange for any individual test that has been executed, accessible from the test detail view.

### REQ-CAP-006: Credential Masking
The system SHALL mask credential values (tokens, passwords, API keys) wherever they appear in captured request or response data presented to the user or included in exports. Masking SHALL reveal only the first 4 characters and the last 4 characters of the original value, replacing all intermediate characters with asterisks (`*`). Values with 12 or fewer characters SHALL be fully masked (all characters replaced with asterisks) to prevent reconstruction.

### REQ-CAP-007: Credential Detection Scope
The system SHALL detect credentials for masking in at minimum the following locations: the `Authorization` header value, the `X-Api-Key` header value, the `Cookie` header value, URL query parameters named `token`, `access_token`, `api_key`, `key`, or `password`, and any JSON body field whose key contains the substring `token`, `password`, `secret`, or `api_key` (case-insensitive).

### REQ-CAP-008: Large Response Body Handling
The system SHALL capture response bodies up to at least 10 MB in size. For response bodies exceeding 10 MB, the system SHALL capture the first 10 MB and append a truncation notice indicating the original size and that the body was truncated.

### REQ-CAP-009: Binary Body Indication
The system SHALL detect non-textual (binary) response bodies based on the `Content-Type` header and SHALL display a placeholder message (e.g., "[Binary content, {size} bytes, Content-Type: {type}]") instead of rendering raw binary data.

### REQ-CAP-010: Capture Integrity
The system SHALL NOT modify, reorder, or omit any portion of captured request or response data (apart from credential masking and large-body truncation as specified) so that the capture accurately represents the actual HTTP exchange.

## Acceptance Scenarios

### SCENARIO-CAP-BASIC-001: Viewing a Captured GET Request
**GIVEN** an assessment has completed containing a test that issued a GET request to `/collections`
**WHEN** the user navigates to the detail view for that test
**THEN** the system displays the request method as `GET`, the full URL including `/collections`, all request headers, and an indication that no request body was sent.

### SCENARIO-CAP-BASIC-002: Viewing a Captured Response
**GIVEN** an assessment has completed containing a test whose server responded with HTTP 200
**WHEN** the user views the captured response for that test
**THEN** the system displays the status code `200`, all response headers, the complete response body, and the response time in milliseconds as a non-negative integer.

### SCENARIO-CAP-BASIC-003: Request/Response Pairing Consistency
**GIVEN** an assessment has completed with 15 executed tests
**WHEN** the user views any one of the 15 test detail views
**THEN** the displayed request URL and method correspond to exactly one response, and no response is shared across multiple tests.

### SCENARIO-CAP-POST-004: Capturing a POST Request with Body
**GIVEN** a test requires sending a POST request with a JSON body to create a resource
**WHEN** that test executes
**THEN** the captured request includes the method `POST`, the target URL, all headers (including `Content-Type: application/json`), and the complete JSON body as sent.

### SCENARIO-CAP-MASK-001: Masking a Bearer Token in Authorization Header
**GIVEN** a test request includes the header `Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.longtoken`
**WHEN** the user views the captured request
**THEN** the Authorization header value is displayed as `Bearer eyJh****oken` (first 4 and last 4 characters of the token portion visible, intermediate characters replaced with asterisks).

### SCENARIO-CAP-MASK-002: Masking a Short Token Entirely
**GIVEN** a test request includes the header `Authorization: Bearer abc123`
**WHEN** the user views the captured request
**THEN** the token portion is displayed as fully masked (e.g., `Bearer ******`) because the token value is 6 characters (12 or fewer).

### SCENARIO-CAP-MASK-003: Masking a Password in a JSON Body
**GIVEN** a test request includes a JSON body containing `{"user": "admin", "password": "MyS3cretP@ssw0rd!"}`
**WHEN** the user views the captured request body
**THEN** the password field value is displayed as `MyS3***0rd!` (first 4 and last 4 visible) while the `user` field value remains unmasked.

### SCENARIO-CAP-MASK-004: Masking a Token in a URL Query Parameter
**GIVEN** a test request targets the URL `https://example.com/api?access_token=abcdefghijklmnopqrstuvwxyz`
**WHEN** the user views the captured request URL
**THEN** the `access_token` parameter value is displayed as `abcd******************wxyz`.

### SCENARIO-CAP-MASK-005: Masking Credentials in Exported Data
**GIVEN** an assessment has completed and the user exports results to JSON
**WHEN** the exported JSON includes request/response traces
**THEN** all credential values in the export are masked using the same rules (first 4 + last 4 visible, or fully masked if 12 characters or fewer).

### SCENARIO-CAP-LARGE-001: Capturing a Response Body Exceeding 10 MB
**GIVEN** a test receives a response with a body of 15 MB
**WHEN** the user views the captured response
**THEN** the displayed body contains the first 10 MB of content followed by a truncation notice stating the original size (15 MB) and that the body was truncated.

### SCENARIO-CAP-LARGE-002: Capturing a Response Body Under the Limit
**GIVEN** a test receives a response with a body of 2 MB
**WHEN** the user views the captured response
**THEN** the full 2 MB body is displayed without any truncation notice.

### SCENARIO-CAP-BINARY-001: Binary Response Body Display
**GIVEN** a test receives a response with `Content-Type: image/png` and a body of 45,312 bytes
**WHEN** the user views the captured response
**THEN** the system displays a placeholder such as `[Binary content, 45312 bytes, Content-Type: image/png]` instead of rendering raw binary data.

### SCENARIO-CAP-TIMING-001: Response Time Accuracy
**GIVEN** a test is executed against a server that takes approximately 250 ms to respond
**WHEN** the user views the captured response
**THEN** the displayed response time is a non-negative integer within a reasonable tolerance of 250 ms (e.g., 200-350 ms) and is labeled in milliseconds.

### SCENARIO-CAP-ERROR-001: Capture on Network Timeout
**GIVEN** a test request is dispatched but the server does not respond within the configured timeout
**WHEN** the user views the captured data for that test
**THEN** the request is fully captured, and the response section indicates a timeout error with no response body, no status code, and the elapsed time until timeout.

### SCENARIO-CAP-ERROR-002: Capture on Connection Refused
**GIVEN** a test request is dispatched but the connection is refused by the server
**WHEN** the user views the captured data for that test
**THEN** the request is fully captured, and the response section indicates a connection error with a descriptive message.

## Implementation Status (2026-03-31)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-CAP-001 to REQ-CAP-003: CaptureHttpClient records all requests/responses with timing (`src/engine/http-client.ts`)
- REQ-CAP-005: Request/response viewer (frontend, partial — backend API returns exchanges)
- REQ-CAP-006, REQ-CAP-007: CredentialMasker with first4+last4, auth header/URL/body detection (`src/engine/credential-masker.ts`, 11 tests)
- REQ-CAP-008 to REQ-CAP-010: Large body truncation, binary detection, capture integrity (`src/engine/http-client.ts`)

### Deviations from Spec
- None

### Deferred
- REQ-CAP-005 frontend viewer component (partial — data available via API, UI in Sprint 3)
