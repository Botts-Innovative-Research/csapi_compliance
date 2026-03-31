# S02-02: OGC API Features Part 1 Core Tests

> Status: Done | Epic: 02 | Last updated: 2026-03-31

## Description
Implement conformance tests for the OGC API Features Part 1 Core conformance class. Tests cover the collections endpoint, single collection access, items endpoint with `limit` parameter, single feature access, and GeoJSON response structure validation for FeatureCollection and Feature schemas.

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-002, REQ-TEST-017, REQ-TEST-018, REQ-TEST-019, REQ-TEST-020
- Scenarios: SCENARIO-TEST-PASS-001, SCENARIO-TEST-SKIP-002

## Acceptance Criteria
- [ ] Collections endpoint test verifies `collections` array with `id`, `title`, `links` per entry (REQ-TEST-002)
- [ ] Single collection access test verifies HTTP 200 with `id`, `title`, `links` (REQ-TEST-002)
- [ ] Items endpoint test verifies FeatureCollection structure with `limit` enforcement (REQ-TEST-002)
- [ ] Single feature access test verifies Feature structure with `type`, `id`, `geometry`, `properties` (REQ-TEST-002)
- [ ] GeoJSON structure validation confirms FeatureCollection and Feature schema compliance (REQ-TEST-002)
- [ ] Tests are skipped if Common Part 1 fails (dependency enforcement, REQ-TEST-018)
- [ ] Empty collections skip resource-level tests with appropriate reason (REQ-TEST-020)

## Tasks
1. Register Features Core tests in the test registry with requirement URIs
2. Implement collections endpoint assertions
3. Implement single collection and items endpoint assertions
4. Implement single feature access assertions
5. Implement GeoJSON structure validation
6. Handle empty collection edge case
7. Write unit tests for each assertion function

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
