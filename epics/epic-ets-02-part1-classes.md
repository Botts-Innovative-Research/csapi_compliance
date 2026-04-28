# Epic ETS-02: CS API Part 1 Conformance Classes

> Status: Active — Sprint 1 implements CS API Core only; the other 13 classes are post-Sprint-1 | Last updated: 2026-04-27

## Goal
Implement TestNG suite classes for all 14 OGC 23-001 conformance classes, with each `@Test` method mapped 1:1 to an OGC ATS assertion via the canonical requirement URI in the test's `description` attribute. Owns sub-deliverable 2 of the new ETS capability.

## Dependencies
- Depends on: `epic-ets-01-scaffold` (need a buildable project)
- Blocks: `epic-ets-03-part2-classes` (Part 2 reuses Part 1 base classes), `epic-ets-05-cite-submission` (need Part 1 feature-complete to submit for beta)

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S-ETS-01-02 | (Sprint 1) Implement CS API Core conformance class against GeoRobotix | Active (Sprint 1) | REQ-ETS-CORE-001..004 |
| S-ETS-02-01 | (placeholder) Implement `/conf/common` suite | Backlog | REQ-ETS-PART1-001 |
| S-ETS-02-02 | (placeholder) Implement `/conf/system-features` suite | Backlog | REQ-ETS-PART1-002 |
| S-ETS-02-03 | (placeholder) Implement `/conf/subsystems` suite | Backlog | REQ-ETS-PART1-003 |
| S-ETS-02-04 | (placeholder) Implement `/conf/deployment-features` suite | Backlog | REQ-ETS-PART1-004 |
| S-ETS-02-05 | (placeholder) Implement `/conf/subdeployments` suite | Backlog | REQ-ETS-PART1-005 |
| S-ETS-02-06 | (placeholder) Implement `/conf/procedure-features` suite | Backlog | REQ-ETS-PART1-006 |
| S-ETS-02-07 | (placeholder) Implement `/conf/sampling-features` suite | Backlog | REQ-ETS-PART1-007 |
| S-ETS-02-08 | (placeholder) Implement `/conf/property-definitions` suite | Backlog | REQ-ETS-PART1-008 |
| S-ETS-02-09 | (placeholder) Implement `/conf/advanced-filtering` suite | Backlog | REQ-ETS-PART1-009 |
| S-ETS-02-10 | (placeholder) Implement `/conf/create-replace-delete` suite | Backlog | REQ-ETS-PART1-010 |
| S-ETS-02-11 | (placeholder) Implement `/conf/update` suite | Backlog | REQ-ETS-PART1-011 |
| S-ETS-02-12 | (placeholder) Implement `/conf/geojson` suite | Backlog | REQ-ETS-PART1-012 |
| S-ETS-02-13 | (placeholder) Implement `/conf/sensorml` suite | Backlog | REQ-ETS-PART1-013 |

## Acceptance Criteria
- [ ] All 14 Part 1 conformance classes have at least one `@Test` per ATS assertion
- [ ] Every `@Test`'s `description` attribute carries the OGC requirement URI
- [ ] Dependency-aware skip semantics: prerequisite-class FAIL → dependent-class SKIP
- [ ] Each test captures full HTTP request/response in TestNG report attachments
- [ ] Schema validation via Kaizen openapi-parser pinned to a specific OGC OpenAPI YAML SHA
- [ ] All 14 classes pass against GeoRobotix demo server for IUT-declared classes
