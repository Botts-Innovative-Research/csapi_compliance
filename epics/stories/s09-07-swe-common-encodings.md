# S09-07: SWE Common Encodings

> Status: Done | Epic: 09 | Last updated: 2026-03-31

## Description
Implement conformance tests for the SWE Common encoding conformance classes: SWE Common JSON (`/req/swecommon-json`), SWE Common Text (`/req/swecommon-text`), and SWE Common Binary (`/req/swecommon-binary`). Tests verify content negotiation, response structure, and format-specific validation for each encoding. SWE Common JSON tests validate observation results encoded as SWE Common JSON data records. SWE Common Text tests validate CSV-style text encoding. SWE Common Binary tests validate binary-encoded observation results against the datastream schema.

## OpenSpec References
- Spec: `openspec/capabilities/dynamic-data-testing/spec.md`
- Requirements: REQ-DYN-013, REQ-DYN-014, REQ-DYN-018, REQ-DYN-019
- Scenarios: SCENARIO-DYN-SWEJSON-001, SCENARIO-DYN-SWETEXT-001, SCENARIO-DYN-SWEBIN-001

## Acceptance Criteria
- [ ] SWE Common JSON content negotiation verifies `application/swe+json` Content-Type or gracefully skips on HTTP 406 (REQ-DYN-013)
- [ ] SWE Common JSON response validates DataRecord structure with fields matching the datastream schema (REQ-DYN-013)
- [ ] SWE Common Text content negotiation verifies `text/csv` or `text/plain` Content-Type or gracefully skips on HTTP 406 (REQ-DYN-014)
- [ ] SWE Common Text response validates header row matches datastream schema fields (REQ-DYN-014)
- [ ] SWE Common Text response validates data rows parse correctly according to declared separators (REQ-DYN-014)
- [ ] SWE Common Binary content negotiation verifies `application/octet-stream` Content-Type or gracefully skips on HTTP 406 (REQ-DYN-014)
- [ ] SWE Common Binary response validates that binary payload length aligns with the datastream schema encoding definition (REQ-DYN-014)
- [ ] Tests are skipped if Part 2 Common fails (REQ-DYN-018)

## Tasks
1. Register SWE Common JSON, Text, and Binary tests with requirement URIs
2. Implement SWE Common JSON content negotiation test
3. Implement SWE Common JSON DataRecord structure validation
4. Implement SWE Common Text content negotiation test
5. Implement SWE Common Text header and data row validation
6. Implement SWE Common Binary content negotiation test
7. Implement SWE Common Binary payload length validation
8. Handle 406 responses with graceful skip
9. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
