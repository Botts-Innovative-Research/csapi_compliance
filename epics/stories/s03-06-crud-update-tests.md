# S03-06: CRUD and Update Tests

> Status: Done | Epic: 03 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Create/Replace/Delete (`/req/crud`) and Update (`/req/update`) conformance classes. Tests cover POST to create, PUT to replace, DELETE to remove, and PATCH to partially update resources, with correct HTTP status code verification. These tests require explicit user opt-in and display a data mutation warning. Test cleanup attempts to delete any resources created during testing.

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-012, REQ-TEST-013, REQ-TEST-014, REQ-TEST-018, REQ-TEST-019, REQ-TEST-021
- Scenarios: SCENARIO-TEST-WARN-001, SCENARIO-TEST-WARN-002, SCENARIO-TEST-CRUD-001

## Acceptance Criteria
- [ ] POST creates a resource and verifies HTTP 201 with Location header (REQ-TEST-012)
- [ ] PUT replaces a resource and verifies HTTP 200 or 204 (REQ-TEST-012)
- [ ] DELETE removes a resource and verifies HTTP 200/204 followed by 404 on re-fetch (REQ-TEST-012)
- [ ] Error responses for non-existent resources return HTTP 404 (REQ-TEST-012)
- [ ] PATCH partially updates a resource with merge-patch+json, falling back to json-patch+json (REQ-TEST-014)
- [ ] Write tests are NOT executed unless the user explicitly opts in (REQ-TEST-013)
- [ ] A mutation warning is displayed when write-operation classes are selected (REQ-TEST-013)
- [ ] Test cleanup attempts to delete created resources after testing (REQ-TEST-021)
- [ ] Tests are skipped if CS API Core fails (REQ-TEST-018)

## Tasks
1. Register CRUD and Update tests with requirement URIs
2. Implement opt-in check and mutation warning display
3. Implement POST create assertions with Location header verification
4. Implement PUT replace assertions
5. Implement DELETE assertions with re-fetch verification
6. Implement PATCH update assertions with content-type negotiation
7. Implement test cleanup logic
8. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
