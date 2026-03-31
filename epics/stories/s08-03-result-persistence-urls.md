# S08-03: Result Persistence and Unique URLs

> Status: Done | Epic: 08 | Last updated: 2026-03-31

## Description
Persist assessment results for at least 24 hours. Assign each assessment a unique, non-guessable URL (UUID v4). Allow any user to view results by navigating to the URL within the persistence window. Display a clear expiration message for expired URLs. Support concurrent session isolation.

## OpenSpec References
- Spec: `openspec/capabilities/progress-session/spec.md`
- Requirements: REQ-SESS-008, REQ-SESS-009, REQ-SESS-010, REQ-SESS-011, REQ-SESS-016
- Scenarios: SCENARIO-SESS-PERSIST-001, SCENARIO-SESS-PERSIST-002, SCENARIO-SESS-PERSIST-003, SCENARIO-SESS-PERSIST-004, SCENARIO-SESS-CONC-001

## Acceptance Criteria
- [ ] Results are persisted for at least 24 hours from completion (REQ-SESS-008)
- [ ] Each assessment has a unique, shareable URL (REQ-SESS-009)
- [ ] URL identifiers are non-sequential and non-guessable (UUID v4) (REQ-SESS-010)
- [ ] Expired URLs show "results have expired" message, not a generic error (REQ-SESS-011)
- [ ] Multiple concurrent assessments operate independently (REQ-SESS-016)

## Tasks
1. Implement result storage with TTL (24-hour expiration)
2. Implement UUID v4 generation for assessment identifiers
3. Implement GET /api/assessments/:id endpoint for result retrieval
4. Implement expiration detection and user-friendly message
5. Implement concurrent session isolation
6. Write tests for persistence, expiration, and concurrency

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
