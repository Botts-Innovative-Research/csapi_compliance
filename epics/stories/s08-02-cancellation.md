# S08-02: Assessment Cancellation

> Status: Done | Epic: 08 | Last updated: 2026-03-31

## Description
Provide a clearly labeled "Cancel" button during assessment execution. On cancellation, stop dispatching new tests, allow the in-flight test to complete (or time out), transition to the results view with all completed results. Mark results as "partial" in the dashboard and exports. Only include fully completed tests in partial results.

## OpenSpec References
- Spec: `openspec/capabilities/progress-session/spec.md`
- Requirements: REQ-SESS-004, REQ-SESS-005, REQ-SESS-006, REQ-SESS-007
- Scenarios: SCENARIO-SESS-CANCEL-001, SCENARIO-SESS-CANCEL-002, SCENARIO-SESS-CANCEL-003, SCENARIO-SESS-CANCEL-004, SCENARIO-SESS-EDGE-001, SCENARIO-SESS-EDGE-002

## Acceptance Criteria
- [ ] "Cancel" button is visible during assessment execution (REQ-SESS-004)
- [ ] Cancellation stops new test dispatch and waits for in-flight test to finish (REQ-SESS-005)
- [ ] Results view displays after cancellation with "Partial Results" banner (REQ-SESS-006)
- [ ] Only fully completed tests appear in partial results (REQ-SESS-007)
- [ ] Cancel button is not visible after assessment completes (SCENARIO-SESS-CANCEL-004)
- [ ] Cancellation during last test shows complete (not partial) results

## Tasks
1. Implement cancel API endpoint (POST /api/assessments/:id/cancel)
2. Implement cancellation signal in test engine pipeline
3. Build Cancel button component with visibility logic
4. Implement partial results assembly
5. Add "Partial Results" banner to dashboard
6. Write tests for cancellation scenarios

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
