# S-ETS-02-02: Extend ETSAssert with REST-friendly helpers + refactor 21 bare-throw sites

> Status: **Implemented** — Sprint 2 | Epic: ETS-02 | Priority: P1 | Complexity: M | Last updated: 2026-04-28

## Description
Close architect-handoff `must` constraint #9 ("Use EtsAssert with structured FAIL messages including the /req/* URI; do not throw bare TestNG AssertionError") which was letter-violated in S-ETS-01-02. Quinn s02 GAP-1 + Raze s02 GAP-1 both flagged 21 bare `throw new AssertionError(...)` sites across the 3 conformance.core test classes (`LandingPageTests` 7 sites, `ConformanceTests` 6 sites, `ResourceShapeTests` 8 sites). Intent of the constraint was met (every FAIL message embeds the `/req/*` URI); the helper layer was missing.

The existing `ETSAssert.java` (191 LOC, archetype-retained) is XML/Schematron-oriented (`assertQualifiedName`, `assertXPath`, `assertSchemaValid`, `assertSchematronValid`) with no REST-Assured / JSON-friendly methods. This story extends ETSAssert with 4 new helper methods (signatures ratified by Architect — see Sprint 2 contract `deferred_to_architect` item 3) and mechanically refactors the 21 bare-throw sites to use them.

Doing this refactor now (when there are 21 sites) is materially cheaper than after Sprint 5 when SystemFeatures + 4 other classes will have grown the count to ~80-100 sites. Sprint 2 also adds SystemFeatures (S-ETS-02-06) which MUST use the new helpers from day 1 — this story unblocks that constraint.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CORE-001 (Test Method Per ATS Assertion — structured FAIL messages with URI), REQ-ETS-CLEANUP-001 (NEW — EtsAssert helper API contract)
- Scenarios: SCENARIO-ETS-CLEANUP-ETSASSERT-REFACTOR-001 (NORMAL — zero bare `throw new AssertionError` sites in conformance.core.* + .systemfeatures.*), SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 (CRITICAL — smoke 12/12 PASS preserved post-refactor)

## Acceptance Criteria
- [x] ETSAssert.java extended with 5 helper methods (Architect added `assertJsonArrayContainsAnyOf` per ADR-008 — exact signatures preserved)
- [x] Each new helper method has at least one unit test under `src/test/java/.../VerifyETSAssert.java` covering both PASS and FAIL paths (5 PASS + 6 FAIL + 1 programming-error guard = 12 new tests)
- [x] All 21 bare `throw new AssertionError(...)` sites in `conformance/core/{LandingPageTests,ConformanceTests,ResourceShapeTests}.java` migrated to call the new ETSAssert helpers
- [x] grep -E "throw new AssertionError" conformance/* returns ZERO hits (verified)
- [x] grep -E "Assert\\.fail" conformance/* returns ZERO hits (verified)
- [x] FAIL message structure preserved: every helper raises AssertionError with the `/req/*` URI as message prefix per ADR-008 §"API surface"
- [x] mvn clean install green: surefire 34/0/0/3 (was 22/0/0/3 pre; +12 from VerifyETSAssert)
- [x] scripts/smoke-test.sh STILL exits 0 with 12/12 PASS against GeoRobotix post-refactor (verified after each of 3 per-class commits)
- [x] Reproducible build preserved (Maven outputTimestamp pin + same source produces same jar)
- [x] SCENARIO-ETS-CLEANUP-ETSASSERT-REFACTOR-001 passes
- [x] SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 passes

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
- **5 helpers added (not 4)**: ADR-008 ratified `assertJsonArrayContainsAnyOf` as the 5th helper because the OR-fallback pattern (service-desc OR service-doc) appears in Sprint 1's LandingPageTests:179-184 and would otherwise need failWithUri (defeating the centralization). Pat's original 4-helper proposal accepted as the foundation, plus the OR-helper.
- **4 commits in new repo** (one helper-extension + 3 per-class refactors per ADR-008 §"Refactor discipline"):
  - `50d0985` — ETSAssert.java extends with 5 helpers + VerifyETSAssert.java grows from 3 → 15 tests (12 new: 5 PASS + 6 FAIL + 1 programming-error guard)
  - `5069326` — LandingPageTests 7 sites migrated; smoke 12/12 PASS preserved
  - `287b371` — ConformanceTests 6 sites migrated; smoke 12/12 PASS preserved
  - `e64afef` — ResourceShapeTests 8 sites migrated; smoke 12/12 PASS preserved (closes the 21-site refactor scope)
- **Verification**: `grep -rc "throw new AssertionError\|Assert\.fail" src/main/java/.../conformance/` returns 0 across all subpackages — closes Sprint 2 success_criterion `zero_bare_assertionerror_in_conformance: true`.
- **Surefire counts**: pre-S-02-02 22/0/0/3 → post-S-02-02 34/0/0/3 (added 12 from VerifyETSAssert helper coverage). Smoke 12/12 PASS preserved at every commit boundary.
- **Reference for naming**: ets-common's existing assertion package naming convention adopted (`assert<Object><Predicate>` — assertStatus, assertJsonObjectHas, assertJsonArrayContains, assertJsonArrayContainsAnyOf, failWithUri). Existing ETSAssert XML/Schematron helpers preserved verbatim.
- **Mockito 5.x ArgumentMatchers** used in VerifyETSAssert per ADR-006 §Notes (deprecated Mockito 1.x Matchers no longer compile against jakarta-shape mocks).
- **Deviations**: none — exact ADR-008 helper signatures preserved.

## Definition of Done
- [x] All acceptance criteria checked
- [x] All 21 bare-throw sites migrated cleanly (zero regressions)
- [x] Smoke 12/12 PASS preserved at every commit boundary
- [x] Spec implementation status updated (traceability.md row flipped Active → Implemented)
- [x] Story status set to Done in this file
- [x] Sprint 2 contract evaluation criteria met (zero_bare_assertionerror_in_conformance: true)
