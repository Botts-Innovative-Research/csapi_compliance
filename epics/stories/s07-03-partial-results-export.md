# S07-03: Partial Results Export

> Status: Done | Epic: 07 | Last updated: 2026-03-31

## Description
Support export of partial results when an assessment has been cancelled before completion. Both JSON and PDF exports clearly indicate partial status: JSON includes `"status": "partial"` at root level; PDF includes a "Partial Results" label. Only completed tests are included in the export.

## OpenSpec References
- Spec: `openspec/capabilities/export/spec.md`
- Requirements: REQ-EXP-015
- Scenarios: SCENARIO-EXP-PARTIAL-001, SCENARIO-EXP-PARTIAL-002

## Acceptance Criteria
- [ ] JSON export of cancelled assessments includes `"status": "partial"` (REQ-EXP-015)
- [ ] PDF export of cancelled assessments displays "Partial Results" label (REQ-EXP-015)
- [ ] Only completed tests are included in partial exports
- [ ] Export actions are available for cancelled assessments

## Tasks
1. Add assessment status check in export pipeline
2. Include `status` field in JSON export schema
3. Add "Partial Results" banner to PDF layout for cancelled assessments
4. Filter out incomplete tests from export data
5. Write tests for partial export scenarios

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
