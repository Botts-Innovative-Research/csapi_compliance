# S04-01: Test Registry and Traceability

> Status: Done | Epic: 04 | Last updated: 2026-03-31

## Description
Build a test registry that enforces a one-to-one mapping between executable tests and canonical OGC requirement URIs. Each test must declare its `requirementUri` and `conformanceUri`. The registry validates at startup that no test lacks a mapping, no two tests share the same requirement URI, and the URI pattern `/req/{class}/{test-name}` is followed.

## OpenSpec References
- Spec: `openspec/capabilities/test-engine/spec.md`
- Requirements: REQ-ENG-001, REQ-ENG-013
- Scenarios: SCENARIO-ENG-TRACE-001, SCENARIO-ENG-TRACE-002

## Acceptance Criteria
- [ ] Every registered test has a non-empty `requirementUri` matching `/req/{class}/{test-name}` (REQ-ENG-001)
- [ ] Every registered test has a corresponding `conformanceUri` matching `/conf/{class}/{test-name}` (REQ-ENG-001)
- [ ] No two tests share the same `requirementUri` (REQ-ENG-001)
- [ ] Tests without a requirement URI are rejected at startup with an error (REQ-ENG-001)
- [ ] Test result structure includes `requirementUri`, `conformanceUri`, `status`, `message`, `durationMs`, `timestamp` (REQ-ENG-013)

## Tasks
1. Define test registration interface/decorator
2. Implement test registry with startup validation
3. Define TestResult data structure
4. Implement duplicate URI detection
5. Write unit tests for registry validation

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
