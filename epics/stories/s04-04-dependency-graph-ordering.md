# S04-04: Dependency Graph and Execution Ordering

> Status: Done | Epic: 04 | Last updated: 2026-03-31

## Description
Implement the conformance class dependency DAG. Compute topological execution order so prerequisite classes run first. Detect cycles at startup and refuse to run if found. When a class fails, cascade-skip all directly and transitively dependent classes with a descriptive skip reason.

## OpenSpec References
- Spec: `openspec/capabilities/test-engine/spec.md`
- Requirements: REQ-ENG-007, REQ-ENG-008
- Scenarios: SCENARIO-ENG-DEP-001, SCENARIO-ENG-DEP-002, SCENARIO-ENG-DEP-003

## Acceptance Criteria
- [ ] Conformance class dependencies are represented as a directed acyclic graph (REQ-ENG-007)
- [ ] Topological sort produces correct execution order (prerequisites before dependents) (REQ-ENG-007)
- [ ] Cycle detection raises a configuration error and prevents assessment startup (REQ-ENG-007)
- [ ] When a class fails, dependent classes are skipped with reason "Dependency not met: conformance class '{uri}' failed" (REQ-ENG-008)
- [ ] Transitive dependencies are correctly cascaded (REQ-ENG-008)

## Tasks
1. Define the conformance class dependency graph data structure
2. Implement topological sort algorithm
3. Implement cycle detection
4. Implement cascade-skip logic on class failure
5. Wire dependency graph into the test execution pipeline
6. Write unit tests for ordering, cycle detection, and cascading

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
