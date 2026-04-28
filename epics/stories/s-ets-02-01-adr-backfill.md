# S-ETS-02-01: ADR-006 (Jersey 1.x → Jakarta EE 9 / Jersey 3.x port) + ADR-007 (Dockerfile base image deviation), retroactive

> Status: Active — Sprint 2 | Epic: ETS-04 | Priority: P1 | Complexity: S | Last updated: 2026-04-28

## Description
Author two retroactive Architecture Decision Records to formalize the Sprint 1 deviations that were empirically justified but lacked the ADR audit-trail rigor required by `architect-handoff.yaml` `must` constraints.

**ADR-006 — Jersey 1.x → Jakarta EE 9 / Jersey 3.x port for the JDK 17 archetype util layer**: retroactively covers the 6 Sprint 1 commits (`8e031ef`, `3979709`, `9ca229f`, `87c6fe2`, `9b42cb7`, `d01c187`) that ported the archetype's `javax.ws.rs.*` Jersey 1.x usage to `jakarta.ws.rs.*` Jersey 3.x. Raze s01 CONCERN-1 flagged the missing ADR; the architect-handoff `must` constraint ("each commit message citing the ADR row") was letter-violated for these 6 commits because no ADR-row existed to cite. Pattern was modeled on `ets-ogcapi-features10@java17Tomcat10TeamEngine6` branch.

**ADR-007 — Dockerfile base image deviation (`tomcat:8.5-jre17` not `ogccite/teamengine-production:5.6.1`)**: retroactively covers Sprint 1 commit `d910808` (the Dockerfile that deviates from REQ-ETS-TEAMENGINE-003's original wording). Quinn s03 GAP-1 + Raze s03 CONCERN-1 both independently confirmed the deviation is necessary: (a) the `:5.6.1` tag does not exist on Docker Hub (only `:latest` and `:1.0-SNAPSHOT`), (b) the production image runs JDK 8 (`JAVA_VERSION=8u212`), incompatible with our JDK 17 ETS jar (`UnsupportedClassVersionError class file version 61.0`).

This story is doc-only; no code changes. Architect (Alex) authors the actual ADR text content; Generator (Dana) commits and cross-references existing decisions (ADR-001, ADR-004, REQ-ETS-TEAMENGINE-003).

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-SCAFFOLD-006 (Modernization ADRs — every dependency-version bump or generated-scaffold modification beyond archetype defaults SHALL be recorded as an ADR)
- Scenarios: SCENARIO-ETS-CLEANUP-ADR-006-007-001 (NORMAL — both ADRs exist with the standard ADR template and cross-reference Sprint 1 commits)

## Acceptance Criteria
- [ ] `_bmad/adrs/ADR-006-jersey-3x-jakarta-port.md` exists with sections: Context, Decision, Status (Accepted), Consequences, Alternatives Considered
- [ ] ADR-006 references the 6 Sprint 1 commits by SHA (`8e031ef`, `3979709`, `9ca229f`, `87c6fe2`, `9b42cb7`, `d01c187`)
- [ ] ADR-006 cross-references the `ets-ogcapi-features10@java17Tomcat10TeamEngine6` branch as the reference pattern
- [ ] `_bmad/adrs/ADR-007-dockerfile-base-image-deviation.md` exists with the same standard sections
- [ ] ADR-007 includes empirical evidence (Docker Hub tag enumeration showing only `:latest` + `:1.0-SNAPSHOT`; `java -version` output showing JDK 8 on production image; `javap -v` output showing JDK 17 class file version 61.0 on our ETS jar; Jakarta EE 9 import grep)
- [ ] ADR-007 lists the 3 secondary patches (VirtualWebappLoader strip, JAXB jars in shared `lib/`, full deps closure with `teamengine-*-6.0.0.jar` filter) with the empirical root-cause for each
- [ ] ADR-007 alternatives section covers: build TE 5.6.1 from source, use `tomcat:10.1-jre17` with jakarta-ee9 shim, fork `ogccite/teamengine-production` with JDK 17 base
- [ ] ADR-001 amended with a cross-reference paragraph: "Note: the production-docker 5.6.1 image runs JDK 8 and cannot host our JDK 17 ETS jar; see ADR-007 for the Sprint 1 Dockerfile assembly strategy."
- [ ] SCENARIO-ETS-CLEANUP-ADR-006-007-001 passes (Quinn audit verifies both ADR files conform to the template and cross-reference correctly)

## Tasks
1. Architect produces ADR-006 + ADR-007 text content (deferred to Architect agent prior to Generator start)
2. Generator commits ADR-006 to `_bmad/adrs/ADR-006-jersey-3x-jakarta-port.md`
3. Generator commits ADR-007 to `_bmad/adrs/ADR-007-dockerfile-base-image-deviation.md`
4. Generator amends ADR-001 with cross-reference to ADR-007
5. Generator updates `_bmad/traceability.md` to add REQ-ETS-SCAFFOLD-006 cross-reference rows for ADR-006 + ADR-007
6. Update spec.md Implementation Status Deviations section to flag ADR-006 + ADR-007 as Sprint 2 closure of Sprint 1 audit-trail gaps

## Dependencies
- Depends on: (Architect must produce ADR text content first)
- Provides foundation for: S-ETS-02-05 (multi-stage Dockerfile rationale can cite ADR-007); enables ETS-04 epic acceptance criterion update

## Implementation Notes
<!-- Fill after implementation -->
- **ADR template reference**: existing ADR-001..005 at `_bmad/adrs/` — use the same section structure and tone
- **Empirical evidence sources for ADR-007**: Quinn s03 evaluator report sections §6.1 + §6.2; Raze s03 adversarial report sections §6.1 + §6.2; commands documented therein for reproducibility
- **Deviations**: TBD

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Both ADRs reviewed by Architect for accuracy + completeness
- [ ] Spec implementation status updated
- [ ] Traceability matrix updated
- [ ] Story status set to Done in this file and in `epic-ets-04-teamengine-integration.md`
- [ ] Sprint 2 contract evaluation criteria for SCENARIO-ETS-CLEANUP-ADR-006-007-001 met
