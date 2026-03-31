# S05-03: Request/Response Viewer UI

> Status: Done | Epic: 05 | Last updated: 2026-03-31

## Description
Build a UI component that allows users to view the captured request/response exchange for any individual test. The viewer shows the request (method, URL, headers, body) and response (status code, headers, body, response time) side by side or in sequence, with credential masking applied.

## OpenSpec References
- Spec: `openspec/capabilities/request-capture/spec.md`
- Requirements: REQ-CAP-005
- Scenarios: SCENARIO-CAP-BASIC-001, SCENARIO-CAP-BASIC-002, SCENARIO-CAP-BASIC-003

## Acceptance Criteria
- [ ] User can view request/response data for any individual executed test (REQ-CAP-005)
- [ ] Request display includes method, full URL, headers, and body (or "no body" indicator)
- [ ] Response display includes status code, headers, body, and response time in milliseconds
- [ ] Credential values are masked in the displayed data
- [ ] Binary bodies show a placeholder instead of raw data
- [ ] Truncated bodies show a truncation notice

## Tasks
1. Build request/response viewer component
2. Integrate with test detail view navigation
3. Apply credential masking to displayed data
4. Handle binary and truncated body display
5. Write component tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
