# S03-02: System and Subsystem Tests

> Status: Done | Epic: 03 | Last updated: 2026-03-31

## Description
Implement conformance tests for the System Features (`/req/system`) and Subsystems (`/req/subsystem`) conformance classes. System tests cover collection availability, items listing, canonical URL, schema validation, and system links. Subsystem tests cover association links, subsystem collection endpoints, and recursive search support.

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-004, REQ-TEST-005, REQ-TEST-018, REQ-TEST-019, REQ-TEST-020
- Scenarios: SCENARIO-TEST-PASS-002, SCENARIO-TEST-SKIP-003

## Acceptance Criteria
- [ ] System collection availability and items listing tests produce correct verdicts (REQ-TEST-004)
- [ ] Canonical system URL test verifies GET returns HTTP 200 (REQ-TEST-004)
- [ ] System schema validation checks required fields (`id`, `type`, `properties.name`, `properties.description`) (REQ-TEST-004)
- [ ] System links test verifies links for deployments, subsystems, sampling features, datastreams (REQ-TEST-004)
- [ ] Subsystem association link is verified on at least one system resource (REQ-TEST-005)
- [ ] Subsystem collection endpoint returns valid FeatureCollection (REQ-TEST-005)
- [ ] Empty collections skip resource-level tests (REQ-TEST-020)
- [ ] Subsystem tests are skipped if System Features fails (REQ-TEST-018)

## Tasks
1. Register System and Subsystem tests with requirement URIs
2. Implement system collection and items assertions
3. Implement canonical URL and schema validation
4. Implement system links assertions
5. Implement subsystem association and collection assertions
6. Handle empty collection edge cases
7. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
