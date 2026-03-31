# S03-01: CS API Core Tests

> Status: Done | Epic: 03 | Last updated: 2026-03-31

## Description
Implement conformance tests for the CS API Core conformance class (`/req/core`). Tests verify that the landing page links to CS API resource collections, that resource representations include `self` and `alternate` link relations, and that all resources contain required base members (`id`, `type`, `links`).

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-003, REQ-TEST-018, REQ-TEST-019
- Scenarios: SCENARIO-TEST-PASS-001, SCENARIO-TEST-SKIP-002

## Acceptance Criteria
- [ ] Landing page links are checked for CS API resource collection entries (REQ-TEST-003)
- [ ] Resource representations include `self` and `alternate` link relations (REQ-TEST-003)
- [ ] Base response structure validation checks `id`, `type`, and `links` members (REQ-TEST-003)
- [ ] Tests are skipped if Features Part 1 Core fails (dependency enforcement, REQ-TEST-018)
- [ ] Each test produces pass/fail/skip with structured messages (REQ-TEST-019)

## Tasks
1. Register CS API Core tests with requirement URIs
2. Implement resource endpoint availability assertions
3. Implement link relation assertions
4. Implement base response structure validation
5. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
