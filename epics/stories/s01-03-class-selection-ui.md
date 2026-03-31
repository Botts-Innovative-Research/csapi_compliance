# S01-03: Conformance Class Selection UI

> Status: Done | Epic: 01 | Last updated: 2026-03-31

## Description
Allow the user to select which testable conformance classes to include in the assessment run. Default to all testable classes selected. Prevent selection of unsupported or unrecognized classes. Support individual deselection of testable classes.

## OpenSpec References
- Spec: `openspec/capabilities/endpoint-discovery/spec.md`
- Requirements: REQ-DISC-007
- Scenarios: SCENARIO-DISC-FLOW-011

## Acceptance Criteria
- [ ] All testable classes are pre-selected by default (REQ-DISC-007)
- [ ] User can deselect individual testable classes (REQ-DISC-007)
- [ ] Unsupported and unrecognized classes cannot be selected for testing (REQ-DISC-007)
- [ ] Selected classes are passed to the test engine as the run configuration

## Tasks
1. Build conformance class selection component with checkboxes
2. Implement default selection logic (all testable)
3. Disable selection for unsupported/unrecognized classes
4. Wire selection state to assessment run configuration
5. Write component tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
