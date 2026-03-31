# S09-02: Datastreams & Observations

> Status: Done | Epic: 09 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Datastream Features (`/req/datastream`) and Observation Features (`/req/observation`) conformance classes. Datastream tests cover collection availability, items listing, canonical URL, schema validation, association links to parent systems and observations, and the datastream schema endpoint. Observation tests cover collection availability, items listing, canonical URL, schema validation, temporal queries (phenomenonTime, resultTime), and result structure validation.

## OpenSpec References
- Spec: `openspec/capabilities/dynamic-data-testing/spec.md`
- Requirements: REQ-DYN-003, REQ-DYN-004, REQ-DYN-018, REQ-DYN-019, REQ-DYN-020
- Scenarios: SCENARIO-DYN-DS-001, SCENARIO-DYN-OBS-001, SCENARIO-DYN-OBS-002

## Acceptance Criteria
- [ ] Datastream collection availability and items listing tests produce correct verdicts (REQ-DYN-003)
- [ ] Canonical datastream URL test verifies GET returns HTTP 200 (REQ-DYN-003)
- [ ] Datastream schema validation checks required fields (`id`, `type`, `name`, `observedProperty`, `resultType`) (REQ-DYN-003)
- [ ] Datastream links test verifies association links to parent system and observations collection (REQ-DYN-003)
- [ ] Datastream schema endpoint (`/schema`) returns a valid result schema definition (REQ-DYN-003)
- [ ] Observation collection availability and items listing tests produce correct verdicts (REQ-DYN-004)
- [ ] Canonical observation URL test verifies GET returns HTTP 200 (REQ-DYN-004)
- [ ] Observation schema validation checks required fields (`id`, `type`, `phenomenonTime`, `result`) (REQ-DYN-004)
- [ ] Temporal query with `phenomenonTime` filter returns matching observations (REQ-DYN-004)
- [ ] Temporal query with `resultTime` filter returns matching observations (REQ-DYN-004)
- [ ] Empty collections skip resource-level tests (REQ-DYN-020)
- [ ] Tests are skipped if Part 2 Common fails (REQ-DYN-018)

## Tasks
1. Register Datastream and Observation tests with requirement URIs
2. Implement datastream collection and items assertions
3. Implement canonical URL and schema validation for datastreams
4. Implement datastream association link assertions
5. Implement datastream schema endpoint validation
6. Implement observation collection and items assertions
7. Implement canonical URL and schema validation for observations
8. Implement temporal query assertions for phenomenonTime and resultTime
9. Handle empty collection edge cases
10. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
