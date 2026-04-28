# S-ETS-01-01: Generate Archetype, Modernize to JDK 17, First Green Build

> Status: Active — Sprint 1 | Epic: ETS-01 | Priority: P0 | Complexity: M | Last updated: 2026-04-27

## Description
Generate the `ets-ogcapi-connectedsystems10` Maven project from `org.opengis.cite:ets-archetype-testng:2.7`, modernize the resulting scaffold to JDK 17 + Maven 3.9, structure the repo to mirror `opengeospatial/ets-ogcapi-features10`, and prove a fresh `mvn clean install` exits 0 reproducibly. Each archetype-default modification is captured as an ADR.

This is the foundation story. Without a green build there is nothing for the other two Sprint 1 stories to extend.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-SCAFFOLD-001, REQ-ETS-SCAFFOLD-002, REQ-ETS-SCAFFOLD-003, REQ-ETS-SCAFFOLD-004, REQ-ETS-SCAFFOLD-005, REQ-ETS-SCAFFOLD-006, REQ-ETS-SCAFFOLD-007
- Scenarios: SCENARIO-ETS-SCAFFOLD-BUILD-001 (CRITICAL), SCENARIO-ETS-SCAFFOLD-LAYOUT-001, SCENARIO-ETS-SCAFFOLD-REPRODUCIBLE-001

## Acceptance Criteria
- [ ] Maven archetype generation reproduces in `ops/server.md` with the exact command line
- [ ] `pom.xml` declares `maven.compiler.source=17`, `maven.compiler.target=17`, Maven 3.9+
- [ ] All dependencies pinned to specific releases (no `RELEASE`, no `LATEST`)
- [ ] Required dependencies present: `ets-common:17`, `teamengine-spi`, `testng`, `rest-assured`, `openapi-parser`, `jts-core`, `proj4j`, `slf4j-api`, `logback-classic`
- [ ] Repo layout matches `ets-ogcapi-features10` (verified by structural-diff checklist)
- [ ] `mvn clean install` exits 0 on a clean checkout against JDK 17
- [ ] Reproducible build verified: two clean builds of the same commit produce byte-identical jars (excluding META-INF timestamps)
- [ ] Each archetype-default modification has an ADR under `_bmad/adrs/`
- [ ] SCENARIO-ETS-SCAFFOLD-BUILD-001 passes
- [ ] SCENARIO-ETS-SCAFFOLD-LAYOUT-001 passes
- [ ] SCENARIO-ETS-SCAFFOLD-REPRODUCIBLE-001 passes

## Tasks
1. Stand up the sibling repo `ets-ogcapi-connectedsystems10` in our org with branch protection
2. Run `mvn archetype:generate -B -DarchetypeGroupId=org.opengis.cite -DarchetypeArtifactId=ets-archetype-testng -DarchetypeVersion=2.7 -Dets-code=ogcapi-connectedsystems10 -Dets-title='OGC API - Connected Systems Part 1' -DartifactId=ets-ogcapi-connectedsystems10 -DgroupId=org.opengis.cite`
3. Bump compiler source/target to 17, Maven minimum to 3.9
4. Bump 2019-vintage dependency versions to current releases (ADR each)
5. Pin all dependencies to specific releases
6. Copy 126 JSON Schemas from `csapi_compliance/schemas/` into `src/main/resources/schemas/` (Architect to confirm whether symlink, submodule, or copy)
7. Run `mvn clean install` until green
8. Add CI job that builds twice and diffs jars to verify reproducibility
9. Write ADRs documenting each modernization delta

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**: `pom.xml`, `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/testng.xml`, `src/main/resources/schemas/`, `_bmad/adrs/ADR-ETS-001..N.md`
- **Deviations**: TBD
- **Open questions for Architect**: schema-bundling mechanism (symlink/submodule/copy); Java package name (`org.opengis.cite.ogcapiconnectedsystems10` proposed)

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Spec implementation status updated in `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- [ ] Story status set to Done in this file and in `epic-ets-01-scaffold.md`
- [ ] Traceability matrix updated (`_bmad/traceability.md`)
- [ ] Sprint 1 contract evaluation criteria met (`.harness/contracts/sprint-ets-01.yaml`)
