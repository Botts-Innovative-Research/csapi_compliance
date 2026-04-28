# Epic 06: Result Reporting & Dashboard

> Status: Closed — v1.0 web app shipped at HEAD ab53658, no further sprints. TestNG/EARL HTML report rendering in TeamEngine supersedes. | Last updated: 2026-04-27

## Goal
Present conformance assessment results in a structured, navigable dashboard with summary statistics, per-class breakdowns, per-test details with request/response links, and an explicit unofficial status disclaimer.

## Dependencies
- Depends on: Epic 04 (Test Engine Infrastructure), Epic 05 (Request/Response Capture)
- Blocks: Epic 07

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S06-01 | Summary Dashboard | Done | REQ-RPT-001, REQ-RPT-010, REQ-RPT-011, REQ-RPT-012 |
| S06-02 | Per-Class Result Display | Done | REQ-RPT-002, REQ-RPT-003, REQ-RPT-004, REQ-RPT-005 |
| S06-03 | Per-Test Detail and Request/Response Links | Done | REQ-RPT-006, REQ-RPT-007, REQ-RPT-008, REQ-RPT-009 |

## Acceptance Criteria
- [ ] Summary dashboard shows total/passed/failed/skipped counts and compliance percentage
- [ ] Unofficial status disclaimer is visible without scrolling
- [ ] Results are organized by conformance class with expandable sections (failed expanded by default)
- [ ] Each class shows pass/fail/skip badge; class passes only if all requirements pass
- [ ] Per-test details include requirement ID/URI, status, failure/skip reason, and request/response link
- [ ] Empty assessments display an appropriate "no tests executed" message
