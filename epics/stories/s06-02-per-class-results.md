# S06-02: Per-Class Result Display

> Status: Done | Epic: 06 | Last updated: 2026-03-31

## Description
Organize assessment results by conformance class. Present each class as a collapsible/expandable section. Failed classes are expanded by default; passing classes are collapsed. Each class section shows class name, URI, pass/fail/skip counts, and a pass/fail/skip badge. A class passes only if all requirements pass; a class with all skipped tests shows "skip" badge.

## OpenSpec References
- Spec: `openspec/capabilities/reporting/spec.md`
- Requirements: REQ-RPT-002, REQ-RPT-003, REQ-RPT-004, REQ-RPT-005
- Scenarios: SCENARIO-RPT-CLASS-001, SCENARIO-RPT-CLASS-002, SCENARIO-RPT-CLASS-003, SCENARIO-RPT-CLASS-004, SCENARIO-RPT-CLASS-005

## Acceptance Criteria
- [ ] Results are organized by conformance class (REQ-RPT-002)
- [ ] Each class is collapsible/expandable; failed classes expanded, passing collapsed by default (REQ-RPT-003)
- [ ] Each class displays name, URI, passed/failed/skipped counts, and badge (REQ-RPT-004)
- [ ] Class badge is "pass" only if all tests pass; "fail" if any test fails; "skip" if all skipped (REQ-RPT-005)

## Tasks
1. Build conformance class list component with collapsible sections
2. Implement default expand/collapse logic based on class status
3. Build class detail display with counts and badge
4. Implement badge determination logic
5. Write component tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
