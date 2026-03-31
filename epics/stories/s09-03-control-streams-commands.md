# S09-03: Control Streams & Commands

> Status: Done | Epic: 09 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Control Stream Features (`/req/controlstream`) and Command Features (`/req/command`) conformance classes. Control stream tests cover collection availability, items listing, canonical URL, schema validation, and association links to parent systems and commands. Command tests cover collection availability, items listing, canonical URL, schema validation, command status tracking, and command result retrieval.

## OpenSpec References
- Spec: `openspec/capabilities/dynamic-data-testing/spec.md`
- Requirements: REQ-DYN-005, REQ-DYN-006, REQ-DYN-018, REQ-DYN-019, REQ-DYN-020
- Scenarios: SCENARIO-DYN-CS-001, SCENARIO-DYN-CMD-001, SCENARIO-DYN-CMD-002

## Acceptance Criteria
- [ ] Control stream collection availability and items listing tests produce correct verdicts (REQ-DYN-005)
- [ ] Canonical control stream URL test verifies GET returns HTTP 200 (REQ-DYN-005)
- [ ] Control stream schema validation checks required fields (`id`, `type`, `name`, `inputSchema`) (REQ-DYN-005)
- [ ] Control stream links test verifies association links to parent system and commands collection (REQ-DYN-005)
- [ ] Command collection availability and items listing tests produce correct verdicts (REQ-DYN-006)
- [ ] Canonical command URL test verifies GET returns HTTP 200 (REQ-DYN-006)
- [ ] Command schema validation checks required fields (`id`, `type`, `issueTime`, `parameters`) (REQ-DYN-006)
- [ ] Command status endpoint returns valid status values (REQ-DYN-006)
- [ ] Command result endpoint returns result data matching the control stream schema (REQ-DYN-006)
- [ ] Empty collections skip resource-level tests (REQ-DYN-020)
- [ ] Tests are skipped if Part 2 Common fails (REQ-DYN-018)

## Tasks
1. Register Control Stream and Command tests with requirement URIs
2. Implement control stream collection and items assertions
3. Implement canonical URL and schema validation for control streams
4. Implement control stream association link assertions
5. Implement command collection and items assertions
6. Implement canonical URL and schema validation for commands
7. Implement command status endpoint assertions
8. Implement command result endpoint assertions
9. Handle empty collection edge cases
10. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
