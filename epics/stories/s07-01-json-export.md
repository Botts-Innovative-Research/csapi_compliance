# S07-01: JSON Export

> Status: Done | Epic: 07 | Last updated: 2026-03-31

## Description
Export the full compliance report as a JSON document containing assessment metadata (server URL, timestamp, tool version, schema version), summary statistics, per-class results, per-test results with request/response traces, credential masking, disclaimer text, and a versioned schema starting at v1. File is named `csapi-compliance-{hostname}-{timestamp}.json` and must be valid UTF-8 JSON.

## OpenSpec References
- Spec: `openspec/capabilities/export/spec.md`
- Requirements: REQ-EXP-001, REQ-EXP-002, REQ-EXP-003, REQ-EXP-004, REQ-EXP-005, REQ-EXP-006, REQ-EXP-007, REQ-EXP-008, REQ-EXP-016
- Scenarios: SCENARIO-EXP-JSON-001 through SCENARIO-EXP-JSON-008, SCENARIO-EXP-EDGE-002

## Acceptance Criteria
- [ ] JSON export action is accessible from the results dashboard (REQ-EXP-001)
- [ ] Export contains summary, per-class results, and per-test results (REQ-EXP-002)
- [ ] Export contains request/response traces for every test (REQ-EXP-003)
- [ ] Credentials are masked in exported data (REQ-EXP-004)
- [ ] Root-level `schemaVersion` field is `"1"` (REQ-EXP-005)
- [ ] Schema is treated as a contract; no breaking changes within a version (REQ-EXP-006)
- [ ] Filename follows `csapi-compliance-{hostname}-{timestamp}.json` pattern (REQ-EXP-007)
- [ ] Output is valid UTF-8 JSON (REQ-EXP-008)
- [ ] Root-level `disclaimer` field contains unofficial status text (REQ-EXP-016)

## Tasks
1. Define JSON export schema (v1)
2. Implement export data assembly from assessment results
3. Implement request/response trace inclusion with masking
4. Implement filename generation with hostname extraction
5. Implement download trigger from dashboard UI
6. Write unit tests for schema compliance and edge cases

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
