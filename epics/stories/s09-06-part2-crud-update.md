# S09-06: Part 2 CRUD + Update

> Status: Done | Epic: 09 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Part 2 Create/Replace/Delete (`/req/dynamic-crud`) and Part 2 Update (`/req/dynamic-update`) conformance classes. Tests cover POST to create, PUT to replace, DELETE to remove, and PATCH to partially update Part 2 resources (datastreams, observations, control streams, commands), with correct HTTP status code verification. These tests require explicit user opt-in and display a data mutation warning. Test cleanup attempts to delete any resources created during testing.

## OpenSpec References
- Spec: `openspec/capabilities/dynamic-data-testing/spec.md`
- Requirements: REQ-DYN-011, REQ-DYN-012, REQ-DYN-018, REQ-DYN-019, REQ-DYN-021
- Scenarios: SCENARIO-DYN-CRUD-001, SCENARIO-DYN-CRUD-002, SCENARIO-DYN-UPDATE-001

## Acceptance Criteria
- [ ] POST creates a datastream and verifies HTTP 201 with Location header (REQ-DYN-011)
- [ ] POST creates an observation and verifies HTTP 201 with Location header (REQ-DYN-011)
- [ ] POST creates a control stream and verifies HTTP 201 with Location header (REQ-DYN-011)
- [ ] POST creates a command and verifies HTTP 201 with Location header (REQ-DYN-011)
- [ ] PUT replaces a Part 2 resource and verifies HTTP 200 or 204 (REQ-DYN-011)
- [ ] DELETE removes a Part 2 resource and verifies HTTP 200/204 followed by 404 on re-fetch (REQ-DYN-011)
- [ ] PATCH partially updates a Part 2 resource with merge-patch+json, falling back to json-patch+json (REQ-DYN-012)
- [ ] Write tests are NOT executed unless the user explicitly opts in (REQ-DYN-011)
- [ ] A mutation warning is displayed when write-operation classes are selected (REQ-DYN-011)
- [ ] Test cleanup attempts to delete created resources after testing (REQ-DYN-021)
- [ ] Tests are skipped if Part 2 Common fails (REQ-DYN-018)

## Tasks
1. Register Part 2 CRUD and Update tests with requirement URIs
2. Implement opt-in check and mutation warning display
3. Implement POST create assertions for each Part 2 resource type
4. Implement PUT replace assertions for Part 2 resources
5. Implement DELETE assertions with re-fetch verification
6. Implement PATCH update assertions with content-type negotiation
7. Implement test cleanup logic for Part 2 resources
8. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
