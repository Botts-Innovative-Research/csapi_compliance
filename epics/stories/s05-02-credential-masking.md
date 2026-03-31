# S05-02: Credential Masking

> Status: Done | Epic: 05 | Last updated: 2026-03-31

## Description
Mask credential values wherever they appear in captured request/response data shown to users or included in exports. Reveal only the first 4 and last 4 characters, replacing intermediate characters with asterisks. Values of 12 or fewer characters are fully masked. Detect credentials in Authorization headers, API key headers, Cookie headers, URL query parameters, and JSON body fields containing "token", "password", "secret", or "api_key".

## OpenSpec References
- Spec: `openspec/capabilities/request-capture/spec.md`
- Requirements: REQ-CAP-006, REQ-CAP-007
- Scenarios: SCENARIO-CAP-MASK-001, SCENARIO-CAP-MASK-002, SCENARIO-CAP-MASK-003, SCENARIO-CAP-MASK-004, SCENARIO-CAP-MASK-005

## Acceptance Criteria
- [ ] Long credentials show first 4 + last 4 chars with asterisks in between (REQ-CAP-006)
- [ ] Credentials of 12 or fewer characters are fully masked (REQ-CAP-006)
- [ ] Authorization header values are detected and masked (REQ-CAP-007)
- [ ] X-Api-Key and Cookie header values are detected and masked (REQ-CAP-007)
- [ ] URL query params named token, access_token, api_key, key, password are masked (REQ-CAP-007)
- [ ] JSON body fields with keys containing token, password, secret, api_key are masked (REQ-CAP-007)
- [ ] Masking is applied consistently in UI display and exported data

## Tasks
1. Implement masking function (first 4 + last 4, full mask for short values)
2. Implement credential detection for headers
3. Implement credential detection for URL query parameters
4. Implement credential detection for JSON body fields
5. Integrate masking into capture display pipeline
6. Write unit tests for all detection and masking scenarios

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
