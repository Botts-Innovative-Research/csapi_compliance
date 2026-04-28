# Epic 03: CS API Part 1 Conformance Testing

> Status: Closed — v1.0 web app shipped at HEAD ab53658, no further sprints. Superseded by `epic-ets-02-part1-classes` (Java/TestNG port). | Last updated: 2026-04-27

## Goal
Implement conformance tests for all 13 CS API Part 1 conformance classes defined in OGC 23-001, covering resource types (systems, deployments, procedures, sampling features, properties), hierarchical associations (subsystems, subdeployments), query filtering, write operations (CRUD, update), and encoding formats (GeoJSON, SensorML JSON).

## Dependencies
- Depends on: Epic 02 (Parent Standard Testing), Epic 04 (Test Engine Infrastructure)
- Blocks: None

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S03-01 | CS API Core Tests | Done | REQ-TEST-003 |
| S03-02 | System and Subsystem Tests | Done | REQ-TEST-004, REQ-TEST-005 |
| S03-03 | Deployment and Subdeployment Tests | Done | REQ-TEST-006, REQ-TEST-007 |
| S03-04 | Procedure, Sampling Feature, and Property Tests | Done | REQ-TEST-008, REQ-TEST-009, REQ-TEST-010 |
| S03-05 | Advanced Filtering Tests | Done | REQ-TEST-011 |
| S03-06 | CRUD and Update Tests | Done | REQ-TEST-012, REQ-TEST-013, REQ-TEST-014 |
| S03-07 | GeoJSON and SensorML Format Tests | Done | REQ-TEST-015, REQ-TEST-016 |

## Acceptance Criteria
- [ ] All 13 CS API conformance classes have executable tests producing pass/fail/skip verdicts
- [ ] Resource type tests validate collection availability, canonical URLs, schema compliance, and link relations
- [ ] Write-operation tests require explicit user opt-in and display a mutation warning
- [ ] Empty collections result in resource-level test skips, not failures
- [ ] Test cleanup attempts to remove resources created during CRUD/Update tests
- [ ] GeoJSON and SensorML format tests validate content negotiation and response structure
