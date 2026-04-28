# Epic ETS-03: CS API Part 2 Conformance Classes

> Status: Deferred — Part 1 first per user gate 2026-04-27. Will activate after epic-ets-02 lands the 14 Part 1 classes. | Last updated: 2026-04-27

## Goal
Implement TestNG suite classes for all 14 OGC 23-002 conformance classes (Dynamic Data: datastreams, observations, control streams, commands, system events, system history, SWE Common formats, plus Part 2 Common/JSON/CRUD/Update/advanced-filtering). Owns sub-deliverable 3 of the new ETS capability.

## Dependencies
- Depends on: `epic-ets-02-part1-classes` (Part 2 references Part 1 resources, e.g. systems own datastreams; also reuses base test infrastructure)
- Blocks: `epic-ets-05-cite-submission` (Part 2 must be feature-complete for the beta submission to cover the full standard)

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S-ETS-03-01 | (placeholder) Implement `/conf/api-common` (Part 2) suite | Deferred | REQ-ETS-PART2-001 |
| S-ETS-03-02 | (placeholder) Implement `/conf/datastream` suite | Deferred | REQ-ETS-PART2-002 |
| S-ETS-03-03 | (placeholder) Implement `/conf/controlstream` suite | Deferred | REQ-ETS-PART2-003 |
| S-ETS-03-04 | (placeholder) Implement `/conf/feasibility` suite | Deferred | REQ-ETS-PART2-004 |
| S-ETS-03-05 | (placeholder) Implement `/conf/system-event` suite | Deferred | REQ-ETS-PART2-005 |
| S-ETS-03-06 | (placeholder) Implement `/conf/system-history` suite | Deferred | REQ-ETS-PART2-006 |
| S-ETS-03-07 | (placeholder) Implement `/conf/advanced-filtering` (Part 2) suite | Deferred | REQ-ETS-PART2-007 |
| S-ETS-03-08 | (placeholder) Implement `/conf/create-replace-delete` (Part 2) suite | Deferred | REQ-ETS-PART2-008 |
| S-ETS-03-09 | (placeholder) Implement `/conf/update` (Part 2) suite | Deferred | REQ-ETS-PART2-009 |
| S-ETS-03-10 | (placeholder) Implement `/conf/json` (Part 2) suite | Deferred | REQ-ETS-PART2-010 |
| S-ETS-03-11 | (placeholder) Implement `/conf/swecommon-json` suite | Deferred | REQ-ETS-PART2-011 |
| S-ETS-03-12 | (placeholder) Implement `/conf/swecommon-text` suite | Deferred | REQ-ETS-PART2-012 |
| S-ETS-03-13 | (placeholder) Implement `/conf/swecommon-binary` suite | Deferred | REQ-ETS-PART2-013 |
| S-ETS-03-14 | (placeholder) Implement `/conf/observation-binding` cross-class (Observation body schema derives from Datastream schema, per v1.0 GH#7) | Deferred | REQ-ETS-PART2-014 |

## Acceptance Criteria
- [ ] All 14 Part 2 conformance classes have at least one `@Test` per ATS assertion
- [ ] Cross-class dynamic schema coupling (REQ-ETS-PART2-014) is enforced — Observation/Command bodies validate against parent-resource schema
- [ ] Same dependency-aware skip semantics as Part 1
- [ ] Same HTTP capture, schema validation, credential masking semantics as Part 1
- [ ] Part 2 suite pass rate ≥95% against GeoRobotix demo server for IUT-declared classes

## Notes
- Sprint 1 explicitly **excludes** Part 2 work per user decision 2026-04-27.
- Per-assertion REQ-* IDs to be drafted at epic activation time, not now.
