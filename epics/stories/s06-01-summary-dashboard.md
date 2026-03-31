# S06-01: Summary Dashboard

> Status: Done | Epic: 06 | Last updated: 2026-03-31

## Description
Display a summary dashboard upon assessment completion showing total tests run, passed, failed, skipped counts, and overall compliance percentage (passed / (passed + failed) * 100, excluding skipped from denominator). Include a clearly visible unofficial status disclaimer above the fold. Handle the empty state (zero tests executed) with an appropriate message.

## OpenSpec References
- Spec: `openspec/capabilities/reporting/spec.md`
- Requirements: REQ-RPT-001, REQ-RPT-010, REQ-RPT-011, REQ-RPT-012
- Scenarios: SCENARIO-RPT-DASH-001, SCENARIO-RPT-DASH-002, SCENARIO-RPT-DASH-003, SCENARIO-RPT-DISC-001, SCENARIO-RPT-DISC-002, SCENARIO-RPT-EMPTY-001, SCENARIO-RPT-EDGE-001

## Acceptance Criteria
- [ ] Dashboard displays total, passed, failed, skipped counts (REQ-RPT-001)
- [ ] Compliance percentage calculated as passed/(passed+failed)*100, rounded to 1 decimal (REQ-RPT-001)
- [ ] Unofficial disclaimer is visible without scrolling, in a visually distinct style (REQ-RPT-010, REQ-RPT-011)
- [ ] Disclaimer includes "unofficial", "not endorsed", "OGC" text (REQ-RPT-010)
- [ ] Zero-test assessments show "no tests executed" message instead of empty dashboard (REQ-RPT-012)

## Tasks
1. Build summary statistics component
2. Implement compliance percentage calculation
3. Build disclaimer banner component with styling
4. Implement empty state handling
5. Write component tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
