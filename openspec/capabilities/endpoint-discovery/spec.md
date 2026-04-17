# Endpoint Discovery & Configuration — Specification

> Version: 1.0 | Status: Implemented | Last updated: 2026-04-16

## Purpose

Provide the entry point for all CS API compliance testing by accepting a user-supplied landing page URL, discovering the API's structure and declared conformance classes, and collecting the configuration (authentication, timeouts, concurrency) needed to execute subsequent test runs. Without reliable endpoint discovery the tool cannot determine which conformance classes to test or how to reach the API under test.

## Functional Requirements

### REQ-DISC-001: Accept and Validate Landing Page URL
The system SHALL accept a CS API landing page URL from the user and validate that the URL is syntactically well-formed (scheme, host, optional port and path) before any network request is made. The system SHALL reject URLs that use schemes other than `http` or `https`.

### REQ-DISC-002: Verify Landing Page Reachability
The system SHALL issue an HTTP GET request to the validated landing page URL and confirm that the server returns an HTTP 200 response with a JSON content type (`application/json` or a `+json` media type). If the server is unreachable, returns a non-200 status, or returns a non-JSON content type, the system SHALL report a clear error identifying the failure reason.

### REQ-DISC-003: Extract Landing Page Links
The system SHALL parse the JSON landing page response and extract links (from the `links` array) to at least the following resources when present:
- Conformance declaration (`rel: "conformance"` or `/conformance`)
- API definition (`rel: "service-desc"` or `rel: "service-doc"`)
- Collections (`rel: "data"` or `/collections`)

The system SHALL resolve any relative URLs against the landing page URL. If the `links` array is missing or empty, the system SHALL report a warning and attempt well-known fallback paths (`/conformance`, `/collections`).

### REQ-DISC-004: Fetch Conformance Declaration
The system SHALL fetch the conformance endpoint (discovered in REQ-DISC-003 or the fallback path `/conformance`) and extract the list of declared conformance class URIs from the `conformsTo` array. If the conformance endpoint is unreachable or returns a response without a `conformsTo` array, the system SHALL report an error and halt discovery.

### REQ-DISC-005: Map Conformance URIs to Requirements
The system SHALL map each declared conformance class URI to the corresponding requirements class defined in OGC 23-001 (Common Security API) Part 1 and identify the parent standard for each. URIs that do not match any known requirements class SHALL be reported as unrecognized but preserved for display.

### REQ-DISC-006: Display Conformance Classes with Testability Indicators
The system SHALL display the full list of detected conformance classes, showing for each:
- The conformance class URI
- The human-readable name
- The parent standard
- A testability indicator: one of `testable`, `unsupported`, or `unrecognized`

A conformance class is `testable` if the tool has implemented tests for it, `unsupported` if it is recognized but no tests exist, and `unrecognized` if the URI does not match any known class.

### REQ-DISC-007: Allow Conformance Class Selection
The system SHALL allow the user to select which testable conformance classes to include in the test run. The default selection SHALL include all classes marked `testable`. The system SHALL prevent selection of classes marked `unsupported` or `unrecognized` for testing. The user SHALL be able to deselect individual testable classes.

### REQ-DISC-008: Accept Authentication Credentials
The system SHALL accept optional authentication credentials in one of the following forms:
- **Bearer token**: a string value sent as an `Authorization: Bearer <token>` header
- **API key**: a key name and value pair sent as a query parameter or custom header (user-specified placement)
- **Basic auth**: a username and password pair sent as an `Authorization: Basic <base64>` header

The system SHALL apply the configured credentials to all subsequent requests made during the test run. If no credentials are provided, the system SHALL proceed without authentication. The system SHALL NOT persist credentials to disk in plaintext.

### REQ-AUTH-002: Authentication Before Discovery for Protected IUTs
- **Status**: Implemented 2026-04-16
- **Description**: When discovery against an IUT returns HTTP 401 (Unauthorized) or 403 (Forbidden), the system SHALL present an inline authentication form on the landing page immediately — without requiring the user to reach the configure page (which is unreachable until discovery succeeds). The inline form SHALL accept the same auth types as the configure-page form (bearer, api-key, basic). On retry submission, the system SHALL re-issue the discovery request with the provided credentials; a subsequent 401/403 SHALL display a distinct "credentials rejected" error that keeps the auth form visible for correction. Credentials that succeeded against discovery SHALL be persisted via sessionStorage under key `auth:{sessionId}` and SHALL be pre-loaded into the configure-page auth form when the user reaches it. Credentials SHALL NOT be persisted beyond the browser session.
- **Rationale**: Reporter of issue #2 (earocorn, 2026-04-16): "if you put a URL to a protected CS API endpoint, the assessor will fail to progress to the next page and show a 401 error. However, the next page asks for authentication, so there is no way to get to this next page on protected endpoints." The original design assumed unauthenticated public IUTs; real-world protected deployments need an earlier opportunity to provide credentials.

### SCENARIO-AUTH-PROTECTED-001: Inline Auth Retry After 401 at Discovery
**GIVEN** the user submits `https://protected.example.com/ogcapi` on the landing page and the IUT returns HTTP 401 with `WWW-Authenticate: Bearer`
**WHEN** the client receives the 401 from `POST /api/assessments`
**THEN** the landing page displays an inline "Authentication required" panel containing an auth-type selector (bearer/api-key/basic) and the appropriate fields; the URL input remains populated with the pending URL; the user can enter a bearer token and click "Discover with credentials" to retry; on retry success, discovery proceeds, the user is routed to `/assess/configure?session={id}`, and the configure-page auth form pre-populates with the successful credentials. If the retry also 401s, the panel stays visible with the "Authentication rejected" message so the user can correct the token.

### REQ-DISC-009: Configure Request Timeout
The system SHALL accept an optional request timeout value in seconds. The default timeout SHALL be 30 seconds. The system SHALL reject timeout values less than 1 second or greater than 300 seconds. The configured timeout SHALL apply to every HTTP request made during the test run.

### REQ-DISC-010: Configure Maximum Concurrent Requests
The system SHALL accept an optional maximum concurrent requests value. The default SHALL be 5 concurrent requests. The system SHALL reject values less than 1 or greater than 50. The configured concurrency limit SHALL be enforced across all HTTP requests made during the test run.

## Acceptance Scenarios

### SCENARIO-DISC-FLOW-001: Successful Discovery of a Fully Conformant CS API
**GIVEN** a running CS API server at `https://example.org/csapi` that returns a valid landing page with links to `/conformance` and `/collections`, and the `/conformance` endpoint returns a `conformsTo` array containing known OGC 23-001 Part 1 URIs
**WHEN** the user provides `https://example.org/csapi` as the landing page URL
**THEN** the system validates the URL, fetches the landing page, extracts links, fetches the conformance declaration, maps all declared URIs to known requirements classes, and displays each with a `testable` or `unsupported` indicator and all testable classes pre-selected.

### SCENARIO-DISC-FLOW-002: Invalid URL Syntax Rejected Before Network Request
**GIVEN** the user provides the string `not-a-url` as the landing page URL
**WHEN** the system processes the input
**THEN** the system rejects the input with an error message indicating the URL is not well-formed, and no HTTP request is made.

### SCENARIO-DISC-FLOW-003: Non-HTTP Scheme Rejected
**GIVEN** the user provides `ftp://example.org/csapi` as the landing page URL
**WHEN** the system processes the input
**THEN** the system rejects the input with an error message indicating that only `http` and `https` schemes are supported.

### SCENARIO-DISC-FLOW-004: Unreachable Host
**GIVEN** the user provides `https://nonexistent.invalid/csapi` as the landing page URL
**WHEN** the system attempts to fetch the landing page
**THEN** the system reports an error indicating the host could not be reached (DNS resolution failure or connection timeout) and does not proceed to discovery.

### SCENARIO-DISC-FLOW-005: Non-200 HTTP Response
**GIVEN** a server at `https://example.org/csapi` that returns HTTP 404
**WHEN** the system fetches the landing page
**THEN** the system reports an error stating the server returned status 404 and does not proceed to discovery.

### SCENARIO-DISC-FLOW-006: Non-JSON Content Type Returned
**GIVEN** a server at `https://example.org/csapi` that returns HTTP 200 with `Content-Type: text/html`
**WHEN** the system fetches the landing page
**THEN** the system reports an error indicating the response is not JSON and the URL may not point to a CS API endpoint.

### SCENARIO-DISC-FLOW-007: Landing Page Missing Links Array
**GIVEN** a server that returns a valid JSON response at the landing page URL but the response body does not contain a `links` array
**WHEN** the system parses the landing page
**THEN** the system reports a warning about the missing `links` array and attempts to discover conformance and collections via the fallback paths `/conformance` and `/collections`.

### SCENARIO-DISC-FLOW-008: Conformance Endpoint Unreachable
**GIVEN** a valid landing page that includes a link to `/conformance`, but the conformance endpoint returns HTTP 500
**WHEN** the system fetches the conformance endpoint
**THEN** the system reports an error indicating the conformance endpoint is unreachable or returned an error, and halts discovery.

### SCENARIO-DISC-FLOW-009: Conformance Response Missing conformsTo Array
**GIVEN** a conformance endpoint that returns valid JSON but without a `conformsTo` property
**WHEN** the system parses the conformance response
**THEN** the system reports an error indicating the conformance response is malformed (missing `conformsTo`) and halts discovery.

### SCENARIO-DISC-FLOW-010: Unrecognized Conformance URIs Preserved
**GIVEN** a conformance endpoint that returns a `conformsTo` array containing URIs not present in the known OGC 23-001 Part 1 mapping
**WHEN** the system maps URIs to requirements classes
**THEN** the unrecognized URIs are displayed with an `unrecognized` indicator and cannot be selected for testing.

### SCENARIO-DISC-FLOW-011: User Deselects a Testable Class
**GIVEN** the system has completed discovery and displays three testable conformance classes, all pre-selected
**WHEN** the user deselects one of the testable classes
**THEN** only the two remaining selected classes are included in the test run configuration.

### SCENARIO-DISC-FLOW-012: Bearer Token Authentication Applied
**GIVEN** the user provides a Bearer token value of `abc123`
**WHEN** the system makes any HTTP request during discovery or testing
**THEN** the request includes the header `Authorization: Bearer abc123`.

### SCENARIO-DISC-FLOW-013: API Key Authentication as Query Parameter
**GIVEN** the user provides an API key with name `x-api-key` and value `secret` and specifies query parameter placement
**WHEN** the system makes any HTTP request during discovery or testing
**THEN** the request URL includes the query parameter `x-api-key=secret`.

### SCENARIO-DISC-FLOW-014: API Key Authentication as Header
**GIVEN** the user provides an API key with name `X-Api-Key` and value `secret` and specifies header placement
**WHEN** the system makes any HTTP request during discovery or testing
**THEN** the request includes the header `X-Api-Key: secret`.

### SCENARIO-DISC-FLOW-015: Basic Auth Credentials Applied
**GIVEN** the user provides username `admin` and password `pass`
**WHEN** the system makes any HTTP request during discovery or testing
**THEN** the request includes the header `Authorization: Basic YWRtaW46cGFzcw==`.

### SCENARIO-DISC-FLOW-016: No Credentials Provided
**GIVEN** the user does not provide any authentication credentials
**WHEN** the system makes HTTP requests during discovery
**THEN** no `Authorization` header or API key parameter is added to requests.

### SCENARIO-DISC-FLOW-017: Custom Timeout Accepted
**GIVEN** the user sets the request timeout to 60 seconds
**WHEN** the system makes HTTP requests
**THEN** each request uses a 60-second timeout.

### SCENARIO-DISC-FLOW-018: Timeout Below Minimum Rejected
**GIVEN** the user sets the request timeout to 0 seconds
**WHEN** the system validates the configuration
**THEN** the system rejects the value with an error indicating the timeout must be between 1 and 300 seconds.

### SCENARIO-DISC-FLOW-019: Timeout Above Maximum Rejected
**GIVEN** the user sets the request timeout to 500 seconds
**WHEN** the system validates the configuration
**THEN** the system rejects the value with an error indicating the timeout must be between 1 and 300 seconds.

### SCENARIO-DISC-FLOW-020: Default Timeout Applied
**GIVEN** the user does not provide a custom timeout value
**WHEN** the system makes HTTP requests
**THEN** each request uses the default 30-second timeout.

### SCENARIO-DISC-FLOW-021: Custom Concurrency Accepted
**GIVEN** the user sets maximum concurrent requests to 10
**WHEN** the system executes HTTP requests during the test run
**THEN** no more than 10 requests are in flight at any given time.

### SCENARIO-DISC-FLOW-022: Concurrency Below Minimum Rejected
**GIVEN** the user sets maximum concurrent requests to 0
**WHEN** the system validates the configuration
**THEN** the system rejects the value with an error indicating concurrency must be between 1 and 50.

### SCENARIO-DISC-FLOW-023: Concurrency Above Maximum Rejected
**GIVEN** the user sets maximum concurrent requests to 100
**WHEN** the system validates the configuration
**THEN** the system rejects the value with an error indicating concurrency must be between 1 and 50.

### SCENARIO-DISC-FLOW-024: Default Concurrency Applied
**GIVEN** the user does not provide a custom concurrency value
**WHEN** the system executes HTTP requests during the test run
**THEN** no more than 5 requests are in flight at any given time.

### SCENARIO-DISC-FLOW-025: Relative URLs in Links Array Resolved
**GIVEN** a landing page at `https://example.org/csapi` that includes a link with `href: "/conformance"` (relative path)
**WHEN** the system extracts links from the landing page
**THEN** the system resolves the relative URL to `https://example.org/conformance` and uses the absolute URL for subsequent requests.

### SCENARIO-DISC-FLOW-026: Credentials Not Persisted in Plaintext
**GIVEN** the user provides a Bearer token for authentication
**WHEN** the system stores or logs configuration state
**THEN** the credential value is not written to disk in plaintext.

## Implementation Status (2026-03-31)

<!-- MANDATORY: Update this section after implementation. -->

**Status**: Implemented

### What's Built
- REQ-DISC-001 to REQ-DISC-010: DiscoveryService with landing page fetch, conformance detection, URI mapping, resource probing (`src/engine/discovery-service.ts`, `src/engine/conformance-mapper.ts`, 48 tests)
- Frontend: URL input form, conformance class selector, auth config, run config (`src/components/assessment-wizard/`, `src/app/page.tsx`, `src/app/assess/configure/page.tsx`)
- API: POST /api/assessments triggers discovery (`src/server/routes/assessments.ts`)

### Deviations from Spec
- None

### Deferred
- None — all 10 requirements implemented
