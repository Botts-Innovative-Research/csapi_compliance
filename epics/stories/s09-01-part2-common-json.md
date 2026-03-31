# S09-01: Part 2 Common + JSON Encoding

> Status: Done | Epic: 09 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Part 2 Common (`/req/dynamic-common`) and Part 2 JSON Encoding (`/req/dynamic-json`) conformance classes. Common tests verify that the landing page links to Part 2 dynamic resource collections (datastreams, observations, control streams, commands), that resources include required base members, and that Part 2 dependency on Part 1 Core is enforced. JSON Encoding tests verify standard JSON content negotiation and response structure for all Part 2 resource types.

## OpenSpec References
- Spec: `openspec/capabilities/dynamic-data-testing/spec.md`
- Requirements: REQ-DYN-001, REQ-DYN-002, REQ-DYN-018, REQ-DYN-019
- Scenarios: SCENARIO-DYN-COMMON-001, SCENARIO-DYN-JSON-001

## Acceptance Criteria
- [ ] Landing page links are checked for Part 2 dynamic resource collection entries (REQ-DYN-001)
- [ ] Part 2 resource representations include `self` and `alternate` link relations (REQ-DYN-001)
- [ ] Base response structure validation checks `id`, `type`, and `links` members for dynamic resources (REQ-DYN-001)
- [ ] Part 2 Common tests are skipped if Part 1 Core tests fail (dependency enforcement, REQ-DYN-001)
- [ ] JSON content negotiation verifies `application/json` Content-Type for Part 2 resources (REQ-DYN-002)
- [ ] JSON response structure validates required members per resource type (REQ-DYN-002)
- [ ] Each test produces pass/fail/skip with structured messages (REQ-DYN-019)

## Tasks
1. Register Part 2 Common tests with requirement URIs
2. Implement landing page link detection for dynamic resource collections
3. Implement link relation assertions for Part 2 resources
4. Implement base response structure validation for Part 2 resource types
5. Implement Part 1 Core dependency check
6. Register JSON Encoding tests with requirement URIs
7. Implement JSON content negotiation assertions
8. Implement JSON response structure validation per resource type
9. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
