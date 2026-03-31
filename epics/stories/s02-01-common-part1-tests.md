# S02-01: OGC API Common Part 1 Tests

> Status: Done | Epic: 02 | Last updated: 2026-03-31

## Description
Implement conformance tests for the OGC API Common Part 1 conformance class. Tests cover landing page structure (title, description, links), conformance endpoint (`conformsTo` array), JSON encoding (Content-Type verification), and OpenAPI 3.0 definition link (service-desc link resolution and version check).

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-001, REQ-TEST-017, REQ-TEST-019
- Scenarios: SCENARIO-TEST-PASS-001, SCENARIO-TEST-SKIP-001, SCENARIO-TEST-DEPGRAPH-001

## Acceptance Criteria
- [ ] Landing page structure test verifies `title`, `description`, and `links` fields (REQ-TEST-001)
- [ ] Conformance endpoint test verifies `conformsTo` array exists (REQ-TEST-001)
- [ ] JSON encoding test verifies `application/json` or `+json` Content-Type (REQ-TEST-001)
- [ ] OpenAPI definition link test resolves `service-desc` href and checks `openapi` field (REQ-TEST-001)
- [ ] Each test maps to a canonical requirement URI and produces pass/fail/skip (REQ-TEST-019)
- [ ] Tests are skipped when the conformance class is not declared by the server (REQ-TEST-017)

## Tasks
1. Register Common Part 1 tests in the test registry with requirement URIs
2. Implement landing page structure assertions
3. Implement conformance endpoint assertions
4. Implement JSON encoding assertions
5. Implement OpenAPI definition link resolution and validation
6. Write unit tests for each assertion function

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
