# S-ETS-02-02: Extend ETSAssert with REST-friendly helpers + refactor 21 bare-throw sites

> Status: Active — Sprint 2 | Epic: ETS-02 | Priority: P1 | Complexity: M | Last updated: 2026-04-28

## Description
Close architect-handoff `must` constraint #9 ("Use EtsAssert with structured FAIL messages including the /req/* URI; do not throw bare TestNG AssertionError") which was letter-violated in S-ETS-01-02. Quinn s02 GAP-1 + Raze s02 GAP-1 both flagged 21 bare `throw new AssertionError(...)` sites across the 3 conformance.core test classes (`LandingPageTests` 7 sites, `ConformanceTests` 6 sites, `ResourceShapeTests` 8 sites). Intent of the constraint was met (every FAIL message embeds the `/req/*` URI); the helper layer was missing.

The existing `ETSAssert.java` (191 LOC, archetype-retained) is XML/Schematron-oriented (`assertQualifiedName`, `assertXPath`, `assertSchemaValid`, `assertSchematronValid`) with no REST-Assured / JSON-friendly methods. This story extends ETSAssert with 4 new helper methods (signatures ratified by Architect — see Sprint 2 contract `deferred_to_architect` item 3) and mechanically refactors the 21 bare-throw sites to use them.

Doing this refactor now (when there are 21 sites) is materially cheaper than after Sprint 5 when SystemFeatures + 4 other classes will have grown the count to ~80-100 sites. Sprint 2 also adds SystemFeatures (S-ETS-02-06) which MUST use the new helpers from day 1 — this story unblocks that constraint.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CORE-001 (Test Method Per ATS Assertion — structured FAIL messages with URI), REQ-ETS-CLEANUP-001 (NEW — EtsAssert helper API contract)
- Scenarios: SCENARIO-ETS-CLEANUP-ETSASSERT-REFACTOR-001 (NORMAL — zero bare `throw new AssertionError` sites in conformance.core.* + .systemfeatures.*), SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 (CRITICAL — smoke 12/12 PASS preserved post-refactor)

## Acceptance Criteria
- [ ] ETSAssert.java extended with 4 helper methods (signatures per Architect ratification — Pat's proposal: `assertStatus(Response resp, int expected, String reqUri)`, `assertJsonObjectHas(Map<String,Object> body, String key, Class<?> type, String reqUri)`, `assertJsonArrayContains(List<?> array, Predicate<Object> pred, String desc, String reqUri)`, `failWithUri(String reqUri, String message)`)
- [ ] Each new helper method has at least one unit test under `src/test/java/.../VerifyETSAssert.java` covering both PASS and FAIL paths
- [ ] All 21 bare `throw new AssertionError(...)` sites in `conformance/core/{LandingPageTests,ConformanceTests,ResourceShapeTests}.java` migrated to call the new ETSAssert helpers
- [ ] grep -E "throw new AssertionError" conformance/core/*.java returns ZERO hits
- [ ] grep -E "Assert\\.fail" conformance/core/*.java returns ZERO hits
- [ ] FAIL message structure preserved: every `throw` from inside an ETSAssert helper carries the `/req/*` URI prefix exactly as the bare-throws did
- [ ] mvn clean install green: surefire 22+N tests / 0 failures / 0 errors / 3 skipped (where N is the new VerifyETSAssert tests)
- [ ] scripts/smoke-test.sh STILL exits 0 with 12/12 PASS against GeoRobotix post-refactor
- [ ] Reproducible build preserved (sha256 of main jar still byte-identical across two consecutive fresh-clone builds)
- [ ] SCENARIO-ETS-CLEANUP-ETSASSERT-REFACTOR-001 passes
- [ ] SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 passes

## Tasks
1. Architect ratifies the 4 helper method signatures (deferred — see Sprint 2 contract)
2. Generator extends ETSAssert.java with the 4 helper methods + Javadoc documenting the URI-traceability invariant
3. Generator writes VerifyETSAssert.java unit tests (PASS + FAIL paths for each new helper)
4. Generator migrates LandingPageTests.java's 7 bare-throw sites to ETSAssert helpers (commit 1)
5. Generator runs smoke-test.sh — verify still 12/12 PASS — before continuing
6. Generator migrates ConformanceTests.java's 6 bare-throw sites (commit 2)
7. Generator runs smoke-test.sh — verify still 12/12 PASS
8. Generator migrates ResourceShapeTests.java's 8 bare-throw sites (commit 3)
9. Generator runs smoke-test.sh — verify still 12/12 PASS
10. Update spec.md Implementation Status to reflect REQ-ETS-CORE-001 GAP-1 closure

## Dependencies
- Depends on: Architect ratification of helper API surface
- Provides foundation for: S-ETS-02-06 (SystemFeaturesTests MUST use the new helpers from day 1)

## Implementation Notes
<!-- Fill after implementation -->
- **Refactor discipline**: one commit per test class (3 commits total). Generator MUST NOT batch all 21 site migrations into a single commit (Quinn-bisectability requirement)
- **Smoke-between-commits**: run `bash scripts/smoke-test.sh` after each test class migration; rollback the commit if smoke regresses
- **Reference for naming**: existing ETSAssert helper naming conventions (`assertQualifiedName`, `assertXPath`, etc.) — mirror the verb-first pattern
- **Architect deferred**: helper method signatures (Pat's proposal in Sprint 2 contract; Architect may propose alternatives mirroring ets-common helpers if a closer-to-OGC-convention form exists)
- **Deviations**: TBD

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] All 21 bare-throw sites migrated cleanly (zero regressions)
- [ ] Smoke 12/12 PASS preserved at every commit boundary
- [ ] Spec implementation status updated
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 2 contract evaluation criteria met
