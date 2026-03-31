# S03-04: Procedure, Sampling Feature, and Property Tests

> Status: Done | Epic: 03 | Last updated: 2026-03-31

## Description
Implement conformance tests for three CS API resource type conformance classes: Procedure Features (`/req/procedure`), Sampling Features (`/req/sampling`), and Property Definitions (`/req/property`). Each class covers collection availability, items listing, canonical URL, schema validation, and resource-specific link/association checks.

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-008, REQ-TEST-009, REQ-TEST-010, REQ-TEST-018, REQ-TEST-019, REQ-TEST-020
- Scenarios: SCENARIO-TEST-PASS-001

## Acceptance Criteria
- [ ] Procedure collection availability, items, canonical URL, schema, and links tests pass (REQ-TEST-008)
- [ ] Sampling feature collection, items, canonical URL, schema, and parent system association tests pass (REQ-TEST-009)
- [ ] Property collection, items, canonical URL, and schema validation tests pass (REQ-TEST-010)
- [ ] Empty collections skip resource-level tests with appropriate reason (REQ-TEST-020)
- [ ] Tests are skipped if CS API Core fails (REQ-TEST-018)
- [ ] Each test maps to a canonical requirement URI (REQ-TEST-019)

## Tasks
1. Register Procedure, Sampling, and Property tests with requirement URIs
2. Implement procedure collection, items, canonical URL, schema, and links assertions
3. Implement sampling feature collection, items, canonical URL, schema, and parent system assertions
4. Implement property collection, items, canonical URL, and schema assertions
5. Handle empty collection edge cases
6. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
