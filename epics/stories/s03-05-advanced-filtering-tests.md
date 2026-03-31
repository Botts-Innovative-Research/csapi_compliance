# S03-05: Advanced Filtering Tests

> Status: Done | Epic: 03 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Advanced Filtering conformance class (`/req/advanced-filtering`). Tests verify that temporal (`datetime`), spatial (`bbox`), keyword (`q`), and CS-API-specific query parameters are accepted and return valid FeatureCollection responses.

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-011, REQ-TEST-018, REQ-TEST-019
- Scenarios: SCENARIO-TEST-FILTER-001

## Acceptance Criteria
- [ ] Temporal filter (`datetime`) with ISO 8601 interval is accepted and returns valid FeatureCollection (REQ-TEST-011)
- [ ] Spatial filter (`bbox`) is accepted and results intersect the bounding box (REQ-TEST-011)
- [ ] Keyword filter (`q`) is accepted or returns HTTP 400 if unsupported (REQ-TEST-011)
- [ ] CS-API-specific query parameters are tested per collection type (REQ-TEST-011)
- [ ] Tests are skipped if CS API Core fails (REQ-TEST-018)

## Tasks
1. Register Advanced Filtering tests with requirement URIs
2. Implement temporal filter test with datetime parameter
3. Implement spatial filter test with bbox parameter
4. Implement keyword filter test with q parameter
5. Implement CS-API-specific parameter tests
6. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
