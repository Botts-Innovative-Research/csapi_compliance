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
| S-ETS-01-02 | (Sprint 1, CLOSED) Implement CS API Core conformance class against GeoRobotix | Done (Sprint 1, Quinn 0.85, Raze 0.82) | REQ-ETS-CORE-001..004 |
| S-ETS-02-02 | (Sprint 2) Extend ETSAssert with REST-friendly helpers + refactor 21 bare-throw sites | Active (Sprint 2) | REQ-ETS-CORE-001, REQ-ETS-CLEANUP-001 |
| S-ETS-02-03 | (Sprint 2) URI form drift sweep — spec.md + traceability.md + Java @Test descriptions to OGC canonical .adoc form | Active (Sprint 2) | REQ-ETS-CORE-001..004, REQ-ETS-CLEANUP-002 |
| S-ETS-02-06 | (Sprint 2, CLOSED) Implement CS API SystemFeatures conformance class end-to-end against GeoRobotix | Done (Sprint 2, Quinn 0.96, Raze 0.92) | REQ-ETS-PART1-002 |
| S-ETS-03-01 | (Sprint 3) Live break-Core dependency-skip sabotage test | Active (Sprint 3) | REQ-ETS-CLEANUP-005 |
| S-ETS-03-05 | (Sprint 3) SystemFeatures expansion: `/req/system/collections` + `/req/system/location-time` | Active (Sprint 3) | REQ-ETS-PART1-002 (modified) |
| S-ETS-03-06 | (Sprint 3) Doc cleanups: VerifySystemFeaturesTests reference + ops/test-results/ convention | Active (Sprint 3) | (none — pure doc) |
| S-ETS-03-07 | (Sprint 3, CLOSED) Implement CS API Common (`/conf/common`) conformance class end-to-end against GeoRobotix | Done (Sprint 3, Quinn 0.95, Raze 0.93) | REQ-ETS-PART1-001 |
| S-ETS-04-05 | (Sprint 4, CLOSED) Implement CS API Subsystems (`/conf/subsystem`) conformance class — first TWO-LEVEL dependency chain | Done (Sprint 4, Quinn 0.84 / Raze 0.84 APPROVE_WITH_GAPS — 4 @Tests PASS 26/26 smoke) | REQ-ETS-PART1-003 |
| S-ETS-05-05 | (Sprint 5) Implement CS API Procedures (`/conf/procedure-features`) conformance class — geometry=null invariant unique assertion | Active (Sprint 5) | REQ-ETS-PART1-006 |
| S-ETS-05-06 | (Sprint 5) Implement CS API Deployments (`/conf/deployment-features`) conformance class — deployed-system-resource SKIP-with-reason | Active (Sprint 5) | REQ-ETS-PART1-004 |
| S-ETS-07-02 | **(Sprint 7 Active)** Implement `/conf/sf` (Sampling Features) suite — depends on SystemFeatures; GeoRobotix /samplingFeatures HTTP 200 confirmed | **Active (Sprint 7)** | REQ-ETS-PART1-007 |
| S-ETS-07-03 | **(Sprint 7 Active)** Implement `/conf/property` (Property Definitions) suite — depends on SystemFeatures; GeoRobotix /properties HTTP 200 confirmed | **Active (Sprint 7)** | REQ-ETS-PART1-008 |
| S-ETS-08-01 | (placeholder) Implement `/conf/subdeployments` suite | Backlog | REQ-ETS-PART1-005 |
| S-ETS-07-01 | (placeholder) Implement `/conf/advanced-filtering` suite | Backlog | REQ-ETS-PART1-009 |
| S-ETS-07-02 | (placeholder) Implement `/conf/create-replace-delete` suite | Backlog | REQ-ETS-PART1-010 |
| S-ETS-07-03 | (placeholder) Implement `/conf/update` suite | Backlog | REQ-ETS-PART1-011 |
| S-ETS-07-04 | (placeholder) Implement `/conf/geojson` suite | Backlog | REQ-ETS-PART1-012 |
| S-ETS-07-05 | (placeholder) Implement `/conf/sensorml` suite | Backlog | REQ-ETS-PART1-013 |
| S-ETS-06-04 | (optional) Common conformance class expansion 4 → 8 @Tests (Sprint 3+ minimal-then-expand by design per Quinn CONCERN-2) | Backlog | REQ-ETS-PART1-001 (modified) |

## Acceptance Criteria
- [ ] All 14 Part 1 conformance classes have at least one `@Test` per ATS assertion
- [ ] Every `@Test`'s `description` attribute carries the OGC requirement URI
- [ ] Dependency-aware skip semantics: prerequisite-class FAIL → dependent-class SKIP
- [ ] Each test captures full HTTP request/response in TestNG report attachments
- [ ] Schema validation via Kaizen openapi-parser pinned to a specific OGC OpenAPI YAML SHA
- [ ] All 14 classes pass against GeoRobotix demo server for IUT-declared classes
