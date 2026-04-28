# S-ETS-02-03: URI form drift sweep — spec.md + traceability.md + Java @Test descriptions to OGC canonical .adoc form

> Status: Active — Sprint 2 | Epic: ETS-02 | Priority: P0 | Complexity: M | Last updated: 2026-04-28

## Description
Close the inherited PARTIAL on the Sprint 1 contract's `uri_mapping_fidelity_preserved` success_criterion — the only outstanding Sprint 1 success_criterion. Quinn s02 GAP-2 + Raze s02 GAP-2 + Quinn s03 + Raze s03 (INHERITED PARTIAL) all flag the same gap: there are THREE different URI forms in play across the project:

| Layer | URI form example |
|-------|------------------|
| v1.0 TS web app (`csapi_compliance/src/engine/registry/common.ts`) | `/req/ogcapi-common/landing-page` |
| Java port (`conformance/core/*.java` `REQ_*` constants) | `/req/core/root-success` |
| OGC normative `.adoc` (verified-canonical) | `/req/landing-page/root-success` |

Source of the discrepancy is upstream of S-ETS-01-02: spec.md text already used the `/req/core/<X>-success` form when Dana implemented; she faithfully reflected the spec. The OGC `.adoc` canonical form was independently verified by Raze on 2026-04-17 at `https://raw.githubusercontent.com/opengeospatial/ogcapi-common/master/19-072/requirements/landing-page/REQ_root-success.adoc` (recorded at `.harness/evaluations/sprint-api-def-fallback-adversarial.yaml`). A CITE SC reviewer dereferencing the @Test description URIs against the OGC normative document will get HTTP 404 — real audit risk.

This sweep canonicalizes ~30-40 sites across 2 repos to the OGC `.adoc` form. After this sweep, dereferencing any @Test description URI against the OGC normative document SHOULD return 200 (not 404). Closing this story flips Sprint 1's `uri_mapping_fidelity_preserved` from PARTIAL → PASS.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` (REQ-ETS-CORE-002, REQ-ETS-CORE-003, REQ-ETS-CORE-004 URI strings updated)
- Requirements: REQ-ETS-CORE-001..004 (modified — URI strings to OGC canonical form), REQ-ETS-CLEANUP-002 (NEW — URI canonicalization)
- Scenarios: SCENARIO-ETS-CLEANUP-URI-CANONICALIZATION-001 (CRITICAL — closes Sprint 1 inherited PARTIAL), SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 (CRITICAL)

## Acceptance Criteria
- [ ] Generator produces a verified-canonical-URI mapping table BEFORE editing any code: for each Java `REQ_*` constant + each spec.md REQ block + each traceability.md row, fetch the OGC `.adoc` source (mirroring Raze's 2026-04-17 methodology) and record the canonical URI
- [ ] Mapping table archived in this story's Implementation Notes section (or as a separate audit artifact under `ops/test-results/`)
- [ ] Java `static final String REQ_*` constants in `conformance/core/{LandingPageTests,ConformanceTests,ResourceShapeTests}.java` updated to OGC canonical `.adoc` form
- [ ] Java @Test description attributes updated to match the new constants (the descriptions reference the constants, so this should be automatic if constants are the single source of truth — verify)
- [ ] csapi_compliance `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` REQ blocks updated: REQ-ETS-CORE-002 (landing-page URIs), REQ-ETS-CORE-003 (conformance URIs), REQ-ETS-CORE-004 (resource-shape URIs)
- [ ] csapi_compliance `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` Scenarios section updated: SCENARIO-ETS-CORE-LANDING-001, SCENARIO-ETS-CORE-CONFORMANCE-001, SCENARIO-ETS-CORE-RESOURCE-SHAPE-001, SCENARIO-ETS-CORE-LINKS-NORMATIVE-001, SCENARIO-ETS-CORE-API-DEF-FALLBACK-001 — URI references updated
- [ ] csapi_compliance `_bmad/traceability.md` URI cross-references updated (in BOTH the v2.0 ETS section AND any v1.0 frozen-section references that still point to spec.md REQ blocks)
- [ ] mvn clean install green
- [ ] scripts/smoke-test.sh STILL exits 0 with 12/12 PASS against GeoRobotix
- [ ] Spot-check: dereference 3 randomly-chosen updated URIs against OGC's normative document (curl returns HTTP 200 not 404)
- [ ] SCENARIO-ETS-CLEANUP-URI-CANONICALIZATION-001 passes
- [ ] SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 passes
- [ ] **Sprint 1 contract `uri_mapping_fidelity_preserved` flips PARTIAL → PASS**

## Tasks
1. Generator builds the verified-canonical-URI mapping table (per Acceptance Criterion 1) — FIRST, before any code edits
2. Quinn or orchestrator spot-checks the table for sanity (catches OGC `.adoc` lookup errors before they propagate)
3. Generator updates Java `REQ_*` constants in `conformance/core/*.java` (commit 1)
4. Generator runs smoke-test.sh — verify still 12/12 PASS
5. Generator updates spec.md REQ blocks (commit 2)
6. Generator updates spec.md Scenarios (commit 3)
7. Generator updates traceability.md cross-references (commit 4)
8. Generator runs `grep -hoE 'http://www\\.opengis\\.net/spec/[^ "]+' src/main/java/.../conformance/*/*.java | sort -u` — verify ALL URIs match the canonical table
9. Update spec.md Implementation Status to reflect uri_mapping_fidelity_preserved closure

## Dependencies
- Depends on: (no story-level deps; can begin in parallel with S-ETS-02-01 + S-ETS-02-04)
- Provides foundation for: S-ETS-02-06 (SystemFeaturesTests MUST use the canonical URI form from day 1)

## Implementation Notes
<!-- Fill after implementation -->
- **Mapping methodology**: for each Java `REQ_*` constant, identify the OGC requirement number (e.g. `REQ_ROOT_SUCCESS` → OGC 19-072 `/req/landing-page/root-success`), construct the .adoc URL (`https://raw.githubusercontent.com/opengeospatial/ogcapi-common/master/19-072/requirements/<class>/REQ_<X>.adoc`), curl-verify the file exists (HTTP 200) and parse the canonical URI from its `=== Requirement {counter:req-id}` block
- **Site count**: ~30-40 across (a) 4-5 Java constants, (b) every @Test description that names them (might be 0 if descriptions reference constants), (c) ~6 REQ blocks in spec.md, (d) ~6 SCENARIO blocks in spec.md, (e) ~6 rows in traceability.md
- **Risk**: if the OGC canonical form for any URI differs from what we ASSUME (e.g. /conformance might be `/req/core/conformance-success` not `/req/conformance/conformance-success`), we'll silent-regress audit-trail integrity — every URI MUST be fetched, not pattern-extrapolated
- **Reference for prior canonical-fetch evidence**: `.harness/evaluations/sprint-api-def-fallback-adversarial.yaml` (Raze 2026-04-17 verified `/req/landing-page/root-success`)
- **Deviations**: TBD

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Verified-canonical-URI mapping table archived
- [ ] All ~30-40 sites updated cleanly (zero regressions)
- [ ] Smoke 12/12 PASS preserved
- [ ] Sprint 1 inherited `uri_mapping_fidelity_preserved` PARTIAL → PASS
- [ ] Spec implementation status updated
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 2 contract evaluation criteria met
