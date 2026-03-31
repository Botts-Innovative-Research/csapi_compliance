# S01-04: Authentication and Run Configuration

> Status: Done | Epic: 01 | Last updated: 2026-03-31

## Description
Accept optional authentication credentials (Bearer token, API key with header/query placement, Basic auth) and run configuration (request timeout, max concurrent requests). Validate configuration bounds. Apply credentials to all subsequent HTTP requests during the test run. Ensure credentials are not persisted to disk in plaintext.

## OpenSpec References
- Spec: `openspec/capabilities/endpoint-discovery/spec.md`
- Requirements: REQ-DISC-008, REQ-DISC-009, REQ-DISC-010
- Scenarios: SCENARIO-DISC-FLOW-012 through SCENARIO-DISC-FLOW-026

## Acceptance Criteria
- [ ] Bearer token, API key (header or query), and Basic auth credentials are accepted (REQ-DISC-008)
- [ ] Credentials are applied to all HTTP requests during discovery and testing (REQ-DISC-008)
- [ ] Credentials are not persisted to disk in plaintext (REQ-DISC-008)
- [ ] Proceeding without credentials is supported (REQ-DISC-008)
- [ ] Request timeout accepts 1-300 seconds, defaults to 30, rejects out-of-range (REQ-DISC-009)
- [ ] Max concurrent requests accepts 1-50, defaults to 5, rejects out-of-range (REQ-DISC-010)

## Tasks
1. Build authentication configuration form (Bearer, API key, Basic)
2. Implement credential injection into HTTP client
3. Implement timeout and concurrency configuration with validation
4. Ensure in-memory-only credential storage
5. Write unit tests for validation and credential application

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
