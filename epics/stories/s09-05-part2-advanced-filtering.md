# S09-05: Part 2 Advanced Filtering

> Status: Done | Epic: 09 | Last updated: 2026-03-31

## Description
Implement conformance tests for the Part 2 Advanced Filtering conformance class (`/req/dynamic-advanced-filtering`). Tests verify that Part 2 temporal filters (`phenomenonTime`, `resultTime`, `issueTime`, `executionTime`) and property filters are accepted and return valid filtered responses for observations, commands, and other dynamic resources. This extends the Part 1 advanced filtering with Part-2-specific query parameters.

## OpenSpec References
- Spec: `openspec/capabilities/dynamic-data-testing/spec.md`
- Requirements: REQ-DYN-010, REQ-DYN-018, REQ-DYN-019
- Scenarios: SCENARIO-DYN-FILTER-001, SCENARIO-DYN-FILTER-002

## Acceptance Criteria
- [ ] `phenomenonTime` filter with ISO 8601 interval is accepted and returns observations within range (REQ-DYN-010)
- [ ] `resultTime` filter with ISO 8601 interval is accepted and returns observations within range (REQ-DYN-010)
- [ ] `issueTime` filter with ISO 8601 interval is accepted and returns commands within range (REQ-DYN-010)
- [ ] `executionTime` filter with ISO 8601 interval is accepted and returns commands within range (REQ-DYN-010)
- [ ] Property filter queries on observation result fields are accepted or return HTTP 400 if unsupported (REQ-DYN-010)
- [ ] Combination of temporal and property filters returns correctly intersected results (REQ-DYN-010)
- [ ] Tests are skipped if Part 2 Common fails (REQ-DYN-018)

## Tasks
1. Register Part 2 Advanced Filtering tests with requirement URIs
2. Implement phenomenonTime filter test with ISO 8601 interval
3. Implement resultTime filter test with ISO 8601 interval
4. Implement issueTime filter test with ISO 8601 interval
5. Implement executionTime filter test with ISO 8601 interval
6. Implement property filter test on observation results
7. Implement combined filter test
8. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
