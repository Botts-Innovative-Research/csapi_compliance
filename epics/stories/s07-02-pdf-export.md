# S07-02: PDF Export

> Status: Done | Epic: 07 | Last updated: 2026-03-31

## Description
Export the compliance report as a PDF document containing a summary section (server URL, date, tool version, statistics), per-class results with pass/fail badges, failed test details with request/response excerpts, and the unofficial status disclaimer on the first page. The PDF must be text-selectable, use minimum 9pt font, and include page numbers.

## OpenSpec References
- Spec: `openspec/capabilities/export/spec.md`
- Requirements: REQ-EXP-009, REQ-EXP-010, REQ-EXP-011, REQ-EXP-012, REQ-EXP-013, REQ-EXP-014
- Scenarios: SCENARIO-EXP-PDF-001 through SCENARIO-EXP-PDF-006, SCENARIO-EXP-EDGE-001

## Acceptance Criteria
- [ ] PDF export action is accessible from the results dashboard (REQ-EXP-009)
- [ ] Summary section includes server URL, date, tool version, and statistics (REQ-EXP-010)
- [ ] Per-class section lists each class with name, URI, badge, and counts (REQ-EXP-011)
- [ ] Failed test section includes test name, requirement ID/URI, failure reason, request URL, and response status (REQ-EXP-012)
- [ ] Disclaimer appears on the first page (REQ-EXP-013)
- [ ] PDF is text-selectable, minimum 9pt font, with page numbers (REQ-EXP-014)
- [ ] Assessments with no failures omit or indicate empty failed tests section

## Tasks
1. Select and integrate PDF generation library
2. Implement summary page layout
3. Implement per-class results layout
4. Implement failed test detail layout
5. Add disclaimer to first page
6. Implement page numbering and font sizing
7. Write tests for PDF generation

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
