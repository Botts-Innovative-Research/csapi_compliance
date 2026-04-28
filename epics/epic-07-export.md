# Epic 07: Export & Sharing

> Status: Closed — v1.0 web app shipped at HEAD ab53658, no further sprints. TeamEngine export (HTML/EARL) supersedes. | Last updated: 2026-04-27

## Goal
Enable users to export assessment results as portable JSON (machine-readable, versioned schema) and PDF (human-readable) documents for archival, sharing, and integration with external tooling.

## Dependencies
- Depends on: Epic 06 (Result Reporting & Dashboard)
- Blocks: None

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S07-01 | JSON Export | Done | REQ-EXP-001, REQ-EXP-002, REQ-EXP-003, REQ-EXP-004, REQ-EXP-005, REQ-EXP-006, REQ-EXP-007, REQ-EXP-008, REQ-EXP-016 |
| S07-02 | PDF Export | Done | REQ-EXP-009, REQ-EXP-010, REQ-EXP-011, REQ-EXP-012, REQ-EXP-013, REQ-EXP-014 |
| S07-03 | Partial Results Export | Done | REQ-EXP-015 |

## Acceptance Criteria
- [ ] JSON export contains summary, per-class results, per-test results, and request/response traces
- [ ] JSON export uses versioned schema (v1), valid UTF-8 JSON, with credential masking
- [ ] JSON filename follows `csapi-compliance-{hostname}-{timestamp}.json` pattern
- [ ] PDF export contains summary, per-class results, failed test details, and disclaimer on first page
- [ ] PDF is text-selectable with page numbers and minimum 9pt font
- [ ] Partial (cancelled) assessments can be exported with clear "partial" indication
