# S04-06: HTTP Client, Timeout, and Error Handling

> Status: Done | Epic: 04 | Last updated: 2026-03-31

## Description
Implement the HTTP client used by all tests, with configurable request timeout enforcement (default 30 seconds). Network errors (connection refused, DNS failure, TLS errors) and timeouts produce test failures with descriptive messages rather than crashing the assessment. The assessment continues executing remaining tests after any individual failure.

## OpenSpec References
- Spec: `openspec/capabilities/test-engine/spec.md`
- Requirements: REQ-ENG-011, REQ-ENG-012
- Scenarios: SCENARIO-ENG-TIMEOUT-001, SCENARIO-ENG-TIMEOUT-002

## Acceptance Criteria
- [ ] User-configured timeout is enforced on every HTTP request (REQ-ENG-011)
- [ ] Timed-out requests produce a fail result with message "Request timed out after {timeout}ms for {method} {url}" (REQ-ENG-011)
- [ ] Network errors (ECONNREFUSED, DNS failure, TLS error) produce fail results with error type and URL (REQ-ENG-012)
- [ ] Individual test failures do not terminate the assessment run (REQ-ENG-012)
- [ ] The HTTP client supports GET, POST, PUT, PATCH, DELETE methods
- [ ] Concurrency limits are enforced across all requests

## Tasks
1. Implement HTTP client wrapper with method support
2. Implement timeout configuration and enforcement
3. Implement error handling for network errors
4. Implement concurrency limiter (semaphore)
5. Write unit tests for timeout and error scenarios

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
