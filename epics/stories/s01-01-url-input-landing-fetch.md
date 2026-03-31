# S01-01: URL Input and Landing Page Fetch

> Status: Done | Epic: 01 | Last updated: 2026-03-31

## Description
Accept a CS API landing page URL from the user, validate it syntactically and by scheme (HTTP/HTTPS only), fetch the landing page via GET, verify it returns HTTP 200 with JSON content type, and extract links from the `links` array (conformance, API definition, collections). Resolve relative URLs against the landing page URL. Fall back to well-known paths if the `links` array is missing.

## OpenSpec References
- Spec: `openspec/capabilities/endpoint-discovery/spec.md`
- Requirements: REQ-DISC-001, REQ-DISC-002, REQ-DISC-003
- Scenarios: SCENARIO-DISC-FLOW-001 through SCENARIO-DISC-FLOW-007, SCENARIO-DISC-FLOW-025

## Acceptance Criteria
- [ ] URL is validated syntactically before any network request (REQ-DISC-001)
- [ ] Non-HTTP/HTTPS schemes are rejected with a clear error (REQ-DISC-001)
- [ ] GET request to the URL verifies HTTP 200 and JSON content type (REQ-DISC-002)
- [ ] Unreachable hosts and non-200 responses produce descriptive errors (REQ-DISC-002)
- [ ] Links array is parsed to extract conformance, API definition, and collections links (REQ-DISC-003)
- [ ] Relative URLs in the links array are resolved against the landing page URL (REQ-DISC-003)
- [ ] Missing links array triggers a warning and fallback to `/conformance` and `/collections` (REQ-DISC-003)

## Tasks
1. Implement URL validation (syntax, scheme check)
2. Implement landing page GET request with error handling
3. Implement JSON response parsing and link extraction
4. Implement relative URL resolution
5. Implement fallback path discovery when links array is absent
6. Write unit tests for each validation and parsing path

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
