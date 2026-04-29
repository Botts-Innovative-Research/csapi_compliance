# S-ETS-03-01: Live break-Core dependency-skip sabotage test

> Status: Active — Sprint 3 | Epic: ETS-02 | Priority: P0 | Complexity: S | Last updated: 2026-04-29

## Description
Close Quinn s06 CONCERN-1 + Raze s06 CONCERN-1 (both flagged the same gap independently). Sprint 2 verified TestNG group-dependency wiring at 3 STATIC layers (source `groups = "core"` annotations + testng.xml `<group depends-on="core"/>` declaration + smoke XML `depends-on-groups="core"` attribute on each of the 4 SystemFeatures @Tests at runtime) but the actual cascading-SKIP behavior under a FAILing Core test was NEVER live-exercised. Prior Raze run TIMED OUT (~13 min) attempting this exact test, blocking Gate 4 completion in the first parallel-spawn attempt.

Sprint 3 closes the gap via two parallel approaches (Architect ratifies which — see Sprint 3 contract `deferred_to_architect`):
- **(a) TestNG programmatic-API unit test** — `src/test/java/.../VerifyTestNGSuiteDependency.java` using TestNG's `XmlSuite` + `TestNG` programmatic API with a mocked Core test that throws `AssertionError`. Assert SystemFeatures @Tests report `status=SKIP` not `FAIL`/`ERROR`. ~30-50 LOC, runs in <5s, hermetic, no Docker, no IUT.
- **(b) Bash sabotage script** — `scripts/sabotage-test.sh` that injects `ETSAssert.assertStatus(landingResponse, 999, REQ_ROOT_SUCCESS)` (always-fail) into LandingPageTests, rebuilds via multi-stage Dockerfile, runs smoke against GeoRobotix, parses TestNG XML, asserts the 4 SystemFeatures @Tests show `status="SKIP"` (not FAIL/ERROR), then restores LandingPageTests + verifies recovery. Mirrors Raze cleanup sabotage pattern.

Pat recommends both (defense-in-depth: unit test for fast feedback during day-to-day development; bash script for end-to-end behavioral verification at gate time). Architect picks. Acceptance Criterion: the cascading SKIP is observably true at runtime, not just declared at static layers.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CLEANUP-005 (NEW — live break-Core dependency-skip verification), REQ-ETS-PART1-002 (SystemFeatures dependency wiring — verified in Sprint 2; this story closes the live-runtime gap)
- Scenarios: SCENARIO-ETS-CLEANUP-DEPENDENCY-SKIP-LIVE-001 (CRITICAL — closes Quinn s06 CONCERN-1 + Raze s06 CONCERN-1)

## Acceptance Criteria
- [ ] Architect ratifies approach (a / b / both) — see Sprint 3 contract `deferred_to_architect` item 1
- [ ] If (a): `VerifyTestNGSuiteDependency.java` exists with at least 2 tests: (i) PASS-path verifying SystemFeatures runs when Core PASSes; (ii) FAIL-path verifying SystemFeatures @Tests SKIP when Core FAILs (via mocked Core throwing AssertionError)
- [ ] If (b): `scripts/sabotage-test.sh` exists, executable, idempotent (LandingPageTests restored on success AND on failure via `trap` cleanup); produces archived TestNG XML at `ops/test-results/sprint-ets-03-dependency-skip-sabotage-<date>.xml` showing `status="SKIP"` on all 4 SystemFeatures @Tests when Core fails
- [ ] If both: both artifacts above
- [ ] No regression in baseline smoke (12+6+N PASS preserved when Core is NOT sabotaged)
- [ ] mvn clean install green: surefire 49+M (where M is +2-5 from VerifyTestNGSuiteDependency if approach (a) chosen)
- [ ] Reproducible build preserved
- [ ] REQ-ETS-CLEANUP-005 status updated PLACEHOLDER → IMPLEMENTED in spec.md
- [ ] SCENARIO-ETS-CLEANUP-DEPENDENCY-SKIP-LIVE-001 PASSes

## Tasks
1. Architect ratifies approach (a / b / both)
2. If (a): Generator implements `VerifyTestNGSuiteDependency.java` with TestNG XmlSuite programmatic API + mocked Core failure; verify SkipException cascade
3. If (b): Generator implements `scripts/sabotage-test.sh` with `trap` cleanup; verify cascading SKIP via TestNG XML parsing
4. Generator runs the test/script — PASS observed
5. Generator archives the result XML/log to `ops/test-results/sprint-ets-03-dependency-skip-sabotage-<date>.{xml,log}`
6. Update spec.md REQ-ETS-CLEANUP-005 PLACEHOLDER → IMPLEMENTED
7. Update _bmad/traceability.md with REQ-ETS-CLEANUP-005 row

## Dependencies
- Depends on: Architect ratification of approach
- Provides foundation for: Sprint 4+ multi-class dependency-DAG (Subsystems → SystemFeatures, Procedures → Common, etc — all rely on the group-dependency mechanism being LIVE-VERIFIED, not just static-verified)

## Implementation Notes

### Approach (a) — TestNG programmatic API unit test sketch

```java
@Test
public void systemFeaturesSkipsWhenCoreFails() throws Exception {
  XmlSuite suite = new XmlSuite();
  suite.setName("dep-skip-test-suite");
  // Add a mock Core test that throws AssertionError
  XmlTest coreTest = new XmlTest(suite);
  coreTest.setName("MockCore");
  coreTest.setXmlClasses(List.of(new XmlClass(MockFailingCoreTest.class)));
  // ... wire dependencies, run suite, parse ITestResult, assert SKIP status on SystemFeatures
  TestNG tng = new TestNG();
  tng.setXmlSuites(List.of(suite));
  tng.run();
  // Assert SystemFeatures method ITestResult.getStatus() == ITestResult.SKIP
}
```

### Approach (b) — Bash sabotage script sketch

```bash
#!/usr/bin/env bash
set -euo pipefail
trap 'git -C ets-ogcapi-connectedsystems10 checkout -- src/main/java/.../conformance/core/LandingPageTests.java' EXIT
# 1. Inject failure
sed -i 's|assertStatus(landingResponse, 200, REQ_ROOT_SUCCESS);|assertStatus(landingResponse, 999, REQ_ROOT_SUCCESS);|' \
  ets-ogcapi-connectedsystems10/src/main/java/.../conformance/core/LandingPageTests.java
# 2. Rebuild + smoke
cd ets-ogcapi-connectedsystems10 && bash scripts/smoke-test.sh
# 3. Parse TestNG XML; assert SKIP on SystemFeatures @Tests
xmllint --xpath '//test-method[@name="systemsCollectionReturns200"]/@status' ops/test-results/*.xml
# 4. Verify exit-code (script will exit non-zero if smoke "fails" — expected for the Core breakage; need to inspect the XML)
```

### v1.0 known-issue cross-references applied
- TestNG SkipException semantics per design.md §"Dependency-skip semantics" (test classes that `dependsOnGroups("core")` auto-skip on group failure)

### Estimated effort
30 min - 1 hour Generator wall-clock. Architect's choice of approach drives the lower vs upper bound (unit test = 30 min; bash sabotage = 60 min including a Docker rebuild cycle).

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Live cascading-SKIP behavior observably verified (not just static layers)
- [ ] Smoke baseline 12+6+N PASS preserved when Core is NOT sabotaged
- [ ] Spec implementation status updated (REQ-ETS-CLEANUP-005 IMPLEMENTED, traceability.md row Active → Implemented)
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 3 contract success_criterion `live_dependency_skip_verified: true` met
