# S-ETS-02-06: Implement CS API SystemFeatures Conformance Class End-to-End Against GeoRobotix

> Status: Active — Sprint 2 | Epic: ETS-02 | Priority: P0 | Complexity: M | Last updated: 2026-04-28

## Description
First additional Part 1 conformance class beyond Core. This story proves that the architectural pattern S-ETS-01-02 established (conformance subpackage layout, EtsAssert plumbing, fixture wiring, testng.xml registration, smoke verification against GeoRobotix) extends mechanically to a second class. Once green, the remaining 12 classes follow as sprint-by-sprint mechanical extensions.

**SystemFeatures (`/conf/system-features` per OGC 23-001 Annex A) chosen for these reasons**:
1. Foundational — every CS API endpoint exposes `/systems` collections; getting `/systems` right is a prerequisite for Subsystems, Procedures, Sampling, Properties, Deployments
2. GeoRobotix actually serves a non-empty `/systems` collection (verified by v1.0 web app E2E history)
3. The dependency-skip SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 already references SystemFeatures by name
4. Spec-trap fixture group `asymmetric-feature-type/` already exists in v1.0 (ports to SystemFeatures via epic-ets-06)

**Generator MUST**: (a) use the new EtsAssert helpers from S-ETS-02-02 from day 1 (no new bare-throw sites), (b) use the canonical OGC `.adoc` URI form from S-ETS-02-03 from day 1, (c) curl `https://api.georobotix.io/ogc/t18/api/systems` BEFORE writing assertions to confirm the collection is non-empty + capture the actual response shape into Implementation Notes, (d) sweep `csapi_compliance/src/engine/registry/csapi-system-features.ts` for any v1.0 tolerance comments to preserve.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-PART1-002 (SystemFeatures conformance class — expanded from PLACEHOLDER → SPECIFIED in this sprint), REQ-ETS-CORE-001 (Test Method Per ATS Assertion — applies to SystemFeatures too)
- Scenarios: SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LANDING-001 (CRITICAL), SCENARIO-ETS-PART1-002-SYSTEMFEATURES-DEPENDENCY-SKIP-001 (CRITICAL — closes SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 against SystemFeatures specifically), SCENARIO-ETS-PART1-002-SYSTEMFEATURES-RESOURCE-SHAPE-001 (NORMAL), SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LINKS-NORMATIVE-001 (NORMAL)

## Acceptance Criteria
- [ ] Generator captures GeoRobotix `/systems` response shape (curl evidence) in Implementation Notes BEFORE writing assertions
- [ ] New subpackage `org.opengis.cite.ogcapiconnectedsystems10.conformance.systemfeatures` exists per design.md placeholder
- [ ] New class `SystemFeaturesTests` exists with appropriate `@Test` methods per OGC 23-001 Annex A `/conf/system-features/` ATS items (Architect ratifies coverage scope: 4-6 minimal vs 12-15 full — see Sprint 2 contract `deferred_to_architect` item 5)
- [ ] Every `@Test`'s `description` attribute starts with the OGC canonical `.adoc` URI form (e.g. `OGC-23-001 /req/system-features/<assertion>`)
- [ ] Every assertion uses ETSAssert helpers from S-ETS-02-02 — ZERO bare `throw new AssertionError` sites
- [ ] testng.xml updated to register SystemFeaturesTests with `dependsOnGroups="core"` so SystemFeatures @Tests SKIP if Core fails (closes SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 for SystemFeatures specifically)
- [ ] Dependency-skip wiring verified: temporarily make Core FAIL (e.g. point IUT at a server returning 500 on /conformance) — confirm SystemFeatures @Tests emit SKIP not FAIL/ERROR
- [ ] Smoke against GeoRobotix: total = 12 (Core) + N (SystemFeatures) PASS; ZERO failures; archived TestNG XML at ops/test-results/sprint-ets-02-systemfeatures-georobotix-smoke-<date>.xml
- [ ] mvn clean install green: surefire baseline tests + new VerifySystemFeaturesTests if any
- [ ] Reproducible build preserved
- [ ] REQ-ETS-PART1-002 status updated PLACEHOLDER → IMPLEMENTED in spec.md
- [ ] All 4 SCENARIO-ETS-PART1-002-* pass

## Tasks
1. Generator: `curl -sf https://api.georobotix.io/ogc/t18/api/systems | head -100` — archive output to Implementation Notes; if /systems is empty/404, **PIVOT to /conf/common as fallback per Sprint 2 contract risk mitigation**
2. Generator reads `csapi_compliance/src/engine/registry/csapi-system-features.ts` for v1.0 tolerance comments + assertion list
3. Architect ratifies coverage scope (deferred — see Sprint 2 contract)
4. Pat (or Architect) expands REQ-ETS-PART1-002 in spec.md from PLACEHOLDER → SPECIFIED with full per-assertion enumeration
5. Pat (or Architect) adds the 4 SCENARIO-ETS-PART1-002-* blocks to spec.md
6. Generator creates `conformance/systemfeatures/` subpackage + `SystemFeaturesTests.java`
7. Generator writes @Test methods per ratified coverage scope, all using ETSAssert helpers + canonical URI form
8. Generator updates testng.xml with new `<test>` block referencing SystemFeaturesTests + `dependsOnGroups="core"`
9. Generator verifies dependency-skip wiring (Acceptance Criterion 7)
10. Generator runs full smoke against GeoRobotix; archive TestNG XML
11. Update spec.md Implementation Status to reflect REQ-ETS-PART1-002 implementation + Sub-deliverable 3 expansion
12. Update _bmad/traceability.md with SystemFeatures rows

## Dependencies
- Depends on: S-ETS-02-02 (EtsAssert helpers must exist for SystemFeatures to use), S-ETS-02-03 (canonical URI form must exist for SystemFeatures to follow)
- Provides foundation for: Sprint 3 onwards (the next 12 Part 1 classes follow this pattern; per design.md they are mechanical extensions)

## Implementation Notes
<!-- Fill after implementation -->
- **GeoRobotix `/systems` shape archive**: TBD (Generator captures via curl)
- **v1.0 tolerance reference**: `csapi_compliance/src/engine/registry/csapi-system-features.ts`
- **Coverage scope (Architect-deferred)**: Pat recommends Sprint-1-style minimal-then-expand (4-6 @Tests covering 2-3 highest-priority assertions; PARTIAL-with-deferral notes for the rest) for risk control on first pattern extension
- **Dependency-skip pattern reference**: existing `SuitePreconditions.java` shows the pre-suite skip mechanism; testng.xml `dependsOnGroups` is the per-class skip mechanism
- **Spec-trap fixture port deferred**: `asymmetric-feature-type/` from v1.0 → epic-ets-06 (NOT in this story)
- **Architect deferred**: full per-assertion coverage scope (see Sprint 2 contract `deferred_to_architect` item 5)
- **Deviations**: TBD

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Architect-ratified coverage scope met
- [ ] Smoke total = 12 + N PASS against GeoRobotix
- [ ] Dependency-skip wiring verified live
- [ ] REQ-ETS-PART1-002 IMPLEMENTED status in spec.md
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 2 contract evaluation criteria met
