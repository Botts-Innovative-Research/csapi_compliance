# S01-02: Conformance Detection and Mapping

> Status: Done | Epic: 01 | Last updated: 2026-03-31

## Description
Fetch the conformance endpoint (discovered or fallback `/conformance`), extract the `conformsTo` array of declared conformance class URIs, map each URI to the corresponding OGC 23-001 Part 1 requirements class and parent standard, and display the results with testability indicators (testable, unsupported, unrecognized).

## OpenSpec References
- Spec: `openspec/capabilities/endpoint-discovery/spec.md`
- Requirements: REQ-DISC-004, REQ-DISC-005, REQ-DISC-006
- Scenarios: SCENARIO-DISC-FLOW-008, SCENARIO-DISC-FLOW-009, SCENARIO-DISC-FLOW-010

## Acceptance Criteria
- [ ] Conformance endpoint is fetched and `conformsTo` array is extracted (REQ-DISC-004)
- [ ] Unreachable conformance endpoint or missing `conformsTo` halts discovery with error (REQ-DISC-004)
- [ ] Each URI is mapped to known OGC 23-001 requirements classes (REQ-DISC-005)
- [ ] Unrecognized URIs are preserved and displayed with an `unrecognized` indicator (REQ-DISC-005)
- [ ] Each class displays URI, human-readable name, parent standard, and testability indicator (REQ-DISC-006)

## Tasks
1. Implement conformance endpoint fetch with error handling
2. Build conformance class URI-to-requirements mapping table
3. Implement testability classification logic
4. Build display model for conformance class list
5. Write unit tests for mapping and classification

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
