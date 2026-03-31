# S05-01: HTTP Request and Response Capture

> Status: Done | Epic: 05 | Last updated: 2026-03-31

## Description
Capture every HTTP request and response exchanged during an assessment. Record method, full URL, headers, body, status code, response headers, response body, and response time in milliseconds. Maintain 1:1 request/response pairing. Handle large bodies (>10 MB truncation with notice) and binary bodies (placeholder display). Ensure capture integrity (no modification beyond masking/truncation).

## OpenSpec References
- Spec: `openspec/capabilities/request-capture/spec.md`
- Requirements: REQ-CAP-001, REQ-CAP-002, REQ-CAP-003, REQ-CAP-004, REQ-CAP-008, REQ-CAP-009, REQ-CAP-010
- Scenarios: SCENARIO-CAP-BASIC-001, SCENARIO-CAP-BASIC-002, SCENARIO-CAP-BASIC-003, SCENARIO-CAP-POST-004, SCENARIO-CAP-LARGE-001, SCENARIO-CAP-LARGE-002, SCENARIO-CAP-BINARY-001, SCENARIO-CAP-TIMING-001, SCENARIO-CAP-ERROR-001, SCENARIO-CAP-ERROR-002

## Acceptance Criteria
- [ ] Every request captures method, full URL, headers, and body if present (REQ-CAP-001)
- [ ] Every response captures status code, headers, body, and response time in milliseconds (REQ-CAP-002)
- [ ] Response time has at least millisecond precision as a non-negative integer (REQ-CAP-003)
- [ ] Each request is paired 1:1 with its response (REQ-CAP-004)
- [ ] Bodies >10 MB are truncated with a size notice (REQ-CAP-008)
- [ ] Binary bodies display a placeholder with content type and size (REQ-CAP-009)
- [ ] Captured data is not modified beyond masking and truncation (REQ-CAP-010)
- [ ] Timeout and connection errors are captured with descriptive messages

## Tasks
1. Implement request capture interceptor in the HTTP client
2. Implement response capture with timing measurement
3. Implement request/response pairing data structure
4. Implement large body truncation logic
5. Implement binary content detection and placeholder
6. Write unit tests for capture integrity and edge cases

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
