# Epic ETS-01: Maven Archetype Scaffold + JDK 17 Modernization

> Status: Active — Sprint 1 target | Last updated: 2026-04-27

## Goal
Generate the `ets-ogcapi-connectedsystems10` Maven project from `org.opengis.cite:ets-archetype-testng:2.7`, modernize it to JDK 17 + Maven 3.9, structure the repository to mirror `opengeospatial/ets-ogcapi-features10`, and prove `mvn clean install` builds green and reproducibly. This epic owns sub-deliverable 1 of the new ETS capability.

## Dependencies
- Depends on: (none — this epic is the foundation; the v1.0 web-app capabilities are frozen and irrelevant here)
- Blocks: All other ETS epics — without the scaffold there is nothing to add tests to.

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S-ETS-01-01 | Generate archetype + modernize to JDK 17 + first green build | Active (Sprint 1) | REQ-ETS-SCAFFOLD-001..006 |
| S-ETS-01-02 | (Sprint 1) Implement CS API Core conformance class — see epic-ets-02 | Active (Sprint 1, cross-epic) | REQ-ETS-CORE-001..004 |
| S-ETS-01-03 | (Sprint 1) TeamEngine Docker smoke test against GeoRobotix — see epic-ets-04 | Active (Sprint 1, cross-epic) | REQ-ETS-TEAMENGINE-001..005 |
| S-ETS-01-04 | (placeholder) ADR catalog for archetype modernization deltas | Backlog | REQ-ETS-SCAFFOLD-006 |
| S-ETS-01-05 | (placeholder) Reproducible-build CI job | Backlog | REQ-ETS-SCAFFOLD-005, NFR-ETS-01 |

## Acceptance Criteria
- [ ] `mvn clean install` exits 0 on JDK 17 / Maven 3.9
- [ ] Repository structure mirrors `ets-ogcapi-features10` (verified via structural-diff checklist)
- [ ] All dependencies pinned to specific versions; no RELEASE/LATEST
- [ ] Two builds from same commit produce byte-identical jars (excluding META-INF timestamps)
- [ ] Each archetype-default modernization is captured as an ADR
