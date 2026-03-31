# S06-03: Per-Test Detail and Request/Response Links

> Status: Done | Epic: 06 | Last updated: 2026-03-31

## Description
Display individual test results within each conformance class section. Each test shows requirement ID, requirement URI, test name, status (pass/fail/skip), failure reason (with expected vs. actual), skip reason, and a navigable link to the captured request/response exchange for that test.

## OpenSpec References
- Spec: `openspec/capabilities/reporting/spec.md`
- Requirements: REQ-RPT-006, REQ-RPT-007, REQ-RPT-008, REQ-RPT-009
- Scenarios: SCENARIO-RPT-TEST-001, SCENARIO-RPT-TEST-002, SCENARIO-RPT-TEST-003, SCENARIO-RPT-LINK-001, SCENARIO-RPT-FAIL-001

## Acceptance Criteria
- [ ] Each test displays requirement ID, URI, name, and status (REQ-RPT-006)
- [ ] Failed tests show failure reason with expected and actual behavior (REQ-RPT-006, REQ-RPT-007)
- [ ] Skipped tests show skip reason explaining why not executed (REQ-RPT-006, REQ-RPT-008)
- [ ] Each test has a link/expansion to view the captured request/response data (REQ-RPT-009)
- [ ] Clicking the request/response link shows full HTTP exchange details

## Tasks
1. Build per-test result row component
2. Implement failure reason display with expected/actual
3. Implement skip reason display
4. Build request/response link or in-place expansion
5. Wire to request/response viewer component (Epic 05)
6. Write component tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
