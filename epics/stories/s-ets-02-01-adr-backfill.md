# S-ETS-02-01: ADR-006 (Jersey 1.x → Jakarta EE 9 / Jersey 3.x port) + ADR-007 (Dockerfile base image deviation), retroactive

> Status: **Implemented (Architect-completed)** — Sprint 2 | Epic: ETS-04 | Priority: P1 | Complexity: S | Last updated: 2026-04-28

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
- [x] `_bmad/adrs/ADR-006-jersey-1-to-jakarta-port.md` exists with sections: Context, Decision, Status (Accepted), Consequences, Alternatives Considered (Architect-authored 2026-04-28)
- [x] ADR-006 references the 6 Sprint 1 commits by SHA (`8e031ef`, `3979709`, `9ca229f`, `87c6fe2`, `9b42cb7`, `d01c187`) — see ADR-006 §"Evidence inspected (post-hoc)" table
- [x] ADR-006 cross-references the `ets-ogcapi-features10@java17Tomcat10TeamEngine6` branch as the reference pattern (cited in ADR-006 §Decision + §Notes)
- [x] `_bmad/adrs/ADR-007-dockerfile-base-image-deviation.md` exists with the same standard sections
- [x] ADR-007 includes empirical evidence (Docker Hub tag enumeration showing only `:latest` + `:1.0-SNAPSHOT`; `java -version` output showing JDK 8 on production image; `javap -v` output showing JDK 17 class file version 61.0 on our ETS jar; Jakarta EE 9 import grep) — see ADR-007 §"Evidence inspected" table
- [x] ADR-007 lists the 3 secondary patches (VirtualWebappLoader strip, JAXB jars in shared `lib/`, full deps closure with `teamengine-*-6.0.0.jar` filter) with the empirical root-cause for each
- [x] ADR-007 alternatives section covers: build TE 5.6.1 from source, use `tomcat:10.1-jre17` with jakarta-ee9 shim, fork `ogccite/teamengine-production` with JDK 17 base
- [x] ADR-001 amended with a cross-reference paragraph (Architect applied 2026-04-28; see `_bmad/adrs/ADR-001-teamengine-spi-registration.md` line 61 — Sprint 2 amendment cross-referencing ADR-007)
- [x] SCENARIO-ETS-CLEANUP-ADR-006-007-001 passes (Quinn audit verifies both ADR files conform to the template and cross-reference correctly — Generator self-verified pre-gate)

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
- **Architect-completed**: Pat scoped this story as "Generator authoring ADRs 006-007", but Architect (Alex) authored the full ADR-006 + ADR-007 text content during his Sprint 2 ratification turn (handoff at `.harness/handoffs/architect-handoff.yaml`, timestamp 2026-04-28T21:30:00Z). Generator (Dana) verified at start of Sprint 2 cleanup batch that:
  1. ADR-006 (`_bmad/adrs/ADR-006-jersey-1-to-jakarta-port.md`) exists with full content covering all 8 acceptance-criteria checkboxes for the Jersey port retro-doc.
  2. ADR-007 (`_bmad/adrs/ADR-007-dockerfile-base-image-deviation.md`) exists with full content covering the Dockerfile-base-image-deviation retro-doc + the 3 secondary patches table + the alternatives table.
  3. ADR-001 amendment (lightweight footnote per design.md §"ADR-001 cross-reference amendment") was applied directly by Architect in the same turn — verified at `_bmad/adrs/ADR-001-teamengine-spi-registration.md` line 61, "**Note (Sprint 2 amendment, 2026-04-28):**" paragraph cross-referencing ADR-007.
  4. Traceability table at `_bmad/traceability.md` line 36 already reflects S-ETS-02-01 + REQ-ETS-SCAFFOLD-006 ADR audit cross-reference.
- **No Generator code/edit work needed** — all 4 ADR files (006, 007, 008, 009) and the ADR-001 footnote landed in csapi_compliance@HEAD before Generator-Dana started this batch. Generator's only task for S-ETS-02-01 is this story-status mark-complete edit.
- **ADR template reference**: existing ADR-001..005 at `_bmad/adrs/` — Architect followed the same section structure and tone for ADR-006/007.
- **Empirical evidence sources for ADR-007**: Quinn s03 evaluator report + Raze s03 adversarial report (`.harness/evaluations/sprint-ets-01-evaluator-s03.yaml` + `sprint-ets-01-adversarial-s03.yaml`); ADR-007 reproduces the verification commands.
- **Deviations**: none.

## Definition of Done
- [x] All acceptance criteria checked
- [x] Both ADRs reviewed by Architect for accuracy + completeness (Architect authored them — implicit completion)
- [x] Spec implementation status updated (already at HEAD; REQ-ETS-TEAMENGINE-003 reconcile note in spec.md, ADR-006/007 cross-refs in traceability.md)
- [x] Traceability matrix updated (`_bmad/traceability.md` line 36 row for REQ-ETS-SCAFFOLD-006 + S-ETS-02-01 already present at HEAD)
- [x] Story status set to Done in this file
- [x] Sprint 2 contract evaluation criteria for SCENARIO-ETS-CLEANUP-ADR-006-007-001 met
