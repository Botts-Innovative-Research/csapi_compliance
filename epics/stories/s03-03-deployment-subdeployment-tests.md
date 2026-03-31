# S03-03: Deployment and Subdeployment Tests

> Status: Done | Epic: 03 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Deployment Features (`/req/deployment`) and Subdeployments (`/req/subdeployment`) conformance classes. Deployment tests cover collection availability, items listing, canonical URL, schema validation, and deployment links (deployed systems, subdeployments). Subdeployment tests cover association links, subdeployment collection endpoints, and recursive search.

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-006, REQ-TEST-007, REQ-TEST-018, REQ-TEST-019, REQ-TEST-020
- Scenarios: SCENARIO-TEST-PASS-001

## Acceptance Criteria
- [ ] Deployment collection availability and items listing tests produce correct verdicts (REQ-TEST-006)
- [ ] Canonical deployment URL test verifies GET returns HTTP 200 (REQ-TEST-006)
- [ ] Deployment schema validation checks required fields (REQ-TEST-006)
- [ ] Deployment links test verifies deployed systems and subdeployments links (REQ-TEST-006)
- [ ] Subdeployment association link is verified on at least one deployment (REQ-TEST-007)
- [ ] Subdeployment collection endpoint returns valid FeatureCollection (REQ-TEST-007)
- [ ] Empty collections skip resource-level tests (REQ-TEST-020)
- [ ] Subdeployment tests are skipped if Deployment Features fails (REQ-TEST-018)

## Tasks
1. Register Deployment and Subdeployment tests with requirement URIs
2. Implement deployment collection and items assertions
3. Implement canonical URL and schema validation
4. Implement deployment links assertions
5. Implement subdeployment association and collection assertions
6. Handle empty collection edge cases
7. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
