# ADR-010 — Dependency-Skip Verification Strategy: Bash Sabotage (Canonical) + TestNG Unit Test (Fast-Feedback Supplement)

- **Status**: Accepted (forward-looking; binds S-ETS-03-01 implementation)
- **Date**: 2026-04-29
- **Decider**: Architect (Alex)
- **Related**: ADR-001 (TeamEngine SPI registration — provides the testng.xml that ships in the ETS jar), Sprint 2 §14.6 SystemFeatures CRITICAL SCENARIO-ETS-PART1-002-SYSTEMFEATURES-DEPENDENCY-SKIP-001, Quinn s06 CONCERN-1 + Raze s06 CONCERN-1 (live dependency-skip verification deferred from Sprint 2), REQ-ETS-CLEANUP-005 (NEW Sprint 3 — live break-Core verification)
- **Supersedes**: none

## Context

Sprint 2 S-ETS-02-06 wired `dependsOnGroups="core"` for SystemFeatures via the testng.xml `<group name="systemfeatures" depends-on="core"/>` block (per design.md §SystemFeatures conformance class scope). The CRITICAL acceptance criterion #7 — "temporarily make Core FAIL and confirm SystemFeatures @Tests emit SKIP not FAIL/ERROR" — was **deferred** from Sprint 2 because both Quinn and Raze gate runs timed out attempting it (the Docker rebuild + smoke loop hit the 30-min gate budget).

Sprint 3 S-ETS-03-01 must close this gap. Pat enumerated three approaches:

| Option | What it does | Cost | Hermeticity | E2E fidelity |
|---|---|---|---|---|
| (a) TestNG programmatic API + mocked Core failures | Construct a synthetic `XmlSuite` in JUnit/TestNG; inject a Core class whose @Test throws AssertionError; assert SystemFeatures @Tests emit SKIP | ~30 LOC unit test; runs in <2s | High (no Docker, no IUT) | **Low** — bypasses the actual testng.xml shipped in the jar |
| (b) Bash sabotage script + Docker rebuild + smoke + restoration | Edit testng.xml or point IUT to a server returning 500 on `/conformance`; rebuild image; run smoke; assert SKIP in TestNG XML output; restore | ~5 min wall-clock once cache warm; touches Docker | Medium (requires Docker daemon) | **High** — exercises the exact testng.xml + jar that ships to CITE SC |
| (c) BOTH | Run (a) in `mvn test` for fast feedback; run (b) in CI as canonical end-to-end verification | ~5 min CI; ~2s local `mvn test` | Both | Both |

## Decision

**Sprint 3 S-ETS-03-01 SHALL implement BOTH (option c)** with the following role split:

### Canonical artifact: bash sabotage script (option b)

`scripts/verify-dependency-skip.sh` is the **CITE-SC-grade end-to-end verification** of the dependency-skip mechanism. This script:

1. Builds the multi-stage Docker image (per ADR-009).
2. Saves the original ETS jar's `testng.xml` to `/tmp/testng-original.xml`.
3. Crafts a sabotage variant: `<test name="Core">` block contains a single @Test that throws `AssertionError` unconditionally (or, equivalently, points the suite parameter `iut` to a stub HTTP server returning 500 on every request).
4. Re-bundles the jar with the sabotaged testng.xml AND/OR launches the smoke run with the stub-server `iut`.
5. Runs `scripts/smoke-test.sh` against this sabotaged configuration.
6. Parses `target/testng-results.xml` (or container-extracted equivalent) and asserts:
   - At least one `<test name="Core">` test method has `status="FAIL"` (sabotage worked).
   - **Every** test method in `<test name="SystemFeatures">` has `status="SKIP"` (NOT `FAIL`, NOT `ERROR`, NOT `PASS`).
7. Restores the original testng.xml (or simply discards the sabotage image).
8. Archives the sabotaged `target/testng-results.xml` to `ops/test-results/sprint-ets-03-dependency-skip-evidence.xml` so Quinn/Raze can verify by READING the archive (no re-run required — closes the worktree-pollution risk).

The bash script is the **single source of truth** for the CRITICAL SCENARIO. CI workflow (S-ETS-03-03) runs this script as a `verify-dependency-skip` job after the smoke job; failure of either job FAILs the workflow.

**Approach to sabotage** (Generator picks one; both acceptable):

- **Stub-server sabotage (preferred for CI)**: Launch a 20-line Python or `nc` HTTP stub that responds 500 to every request. Set `iut=http://stub:5000` in the smoke-run TestNG suite parameters. Core's landing-page `@Test` fails on the first GET; SystemFeatures' `dependsOnGroups="core"` chains the SKIP. Hermetic — no testng.xml mutation, no jar rebundling.
- **Testng.xml mutation sabotage (backup)**: Use `sed` or `xmlstarlet` to inject a forced-fail @Test class into the Core block. Requires careful restoration. Use only if the stub-server path proves problematic in CI.

### Fast-feedback supplement: TestNG unit test (option a)

`src/test/java/.../listener/VerifyDependencySkipWiring.java` is a **fast-feedback unit test** that runs in `mvn test` (<2s). It:

1. Loads the canonical `src/main/resources/testng.xml` from the classpath (the same file that ships in the jar).
2. Parses it via `org.testng.xml.Parser` → `XmlSuite` API.
3. Asserts the **structural invariants** the bash script verifies behaviorally:
   - `<test name="SystemFeatures">` exists.
   - Its `<groups><dependencies>` block contains `<group name="systemfeatures" depends-on="core"/>` (or equivalent: dependency declared via `<test depends-on-groups="core"/>`).
   - The `<test name="Core">` block exists and is referenced by the `depends-on="core"` attribute.
   - When Sprint 4+ adds Subsystems/Common/etc., the test extends mechanically: `<test name="Subsystems">` must declare `depends-on="systemfeatures"` per OGC 23-001 ATS dependency DAG.

This unit test is a **structural lint** for the testng.xml dependency wiring. It does NOT verify SKIP semantics at runtime (TestNG's actual skip mechanism requires a full suite execution — option b's domain). It catches the regression "someone deleted the `<group depends-on>` block during a refactor" before the slow bash script runs in CI.

### Role boundary

| Verification level | Owner | Cadence | Failure mode |
|---|---|---|---|
| Structural lint (testng.xml dependency declarations exist) | `VerifyDependencySkipWiring` (unit test) | Every `mvn test` (~30s into the build) | Build fails; developer sees error <2 min after commit |
| Behavioral verification (SKIP semantics actually fire when Core fails) | `scripts/verify-dependency-skip.sh` (CI job) | Every PR + main push | CI workflow fails; PR cannot merge |
| Archive for gate review | `ops/test-results/sprint-ets-03-dependency-skip-evidence.xml` | Once per sprint close | Quinn/Raze read archive; no re-run required |

## Alternatives considered

- **Option (a) only — TestNG programmatic API alone.** Rejected. Structural lint without behavioral verification leaves the CRITICAL SCENARIO unverified — a future TestNG version change to dependency semantics, or a TeamEngine 6.x port that re-routes the suite execution path, would silently break SKIP behavior with no signal until a CITE SC reviewer runs the suite. Bash sabotage is the canonical evidence.
- **Option (b) only — bash sabotage alone.** Rejected. Slow (~5 min) feedback loop forces developers to "wait for CI" to discover that they accidentally removed the `<group depends-on>` block in a testng.xml edit. The unit test catches 80% of regressions in <2s and unblocks day-to-day refactoring.
- **Defer to Sprint 4 with mocked-only verification.** Rejected. The CRITICAL SCENARIO has been deferred since Sprint 2 (Quinn s06 CONCERN-1, Raze s06 CONCERN-1). Sprint 3 must close it; the contract `success_criteria.live_dependency_skip_verified` mandates the bash script artifact.
- **Run the sabotage against the user's worktree at `~/docker/gir/ets-ogcapi-connectedsystems10/`.** REJECTED per Sprint 3 contract `worktree_pollution_constraint`. The sabotage script MUST clone the repo into `/tmp/sabotage-fresh-<sprint>/` (orchestrator-style) OR operate purely on the built Docker image without touching the source tree. Restoration must be guaranteed even on script abort (use `trap` for cleanup).
- **Mock TestNG's IInvokedMethodListener directly in a unit test.** Considered for option (a). Rejected as too implementation-detail-coupled — testing TestNG's listener wiring rather than our spec's dependency declaration. The XmlSuite parser approach tests the artifact (testng.xml) we actually ship, not the framework's internals.

## Consequences

**Positive**:
- Closes Quinn s06 CONCERN-1 + Raze s06 CONCERN-1 (deferred since Sprint 2 close).
- CRITICAL SCENARIO-ETS-PART1-002-SYSTEMFEATURES-DEPENDENCY-SKIP-001 now has CI-verified evidence (the archived testng-results.xml).
- Defense-in-depth: structural lint catches refactor regressions; bash script catches semantic regressions. Two independent failure modes are unlikely to coincide.
- Sets precedent for future conformance-class additions (Common in S-ETS-03-07; Subsystems in Sprint 4): every new `dependsOnGroups` wiring extends both the unit test (add `<test name="X" depends-on="...">` assertion) and the bash sabotage matrix (add a sabotage scenario for X).
- Archive-based gate verification eliminates worktree-pollution risk that derailed Sprint 2 SystemFeatures gate run.

**Negative**:
- ~5 min CI cost added per workflow run (cold cache; warm-cache faster). Mitigated by running the sabotage job in parallel with the main smoke job (both consume the same built image).
- Bash script complexity (HTTP stub launch + cleanup `trap` + jar rebundling fallback) is non-trivial; risk of script fragility. Mitigated by keeping the stub-server path as primary (no jar mutation) and the testng.xml-mutation path as documented backup only.

**Risks**:
- **TestNG `XmlSuite` parser API drift**. TestNG has moved this API across major versions (5.x → 6.x → 7.x); the unit test must pin the TestNG version per ets-common (currently 7.x). Mitigation: assertion failure messages in the unit test explicitly reference `org.testng.xml.Parser` so a future migration knows where to look.
- **Stub-server port collision in CI**. GitHub Actions runners may have port 5000 occupied. Mitigation: bind stub to ephemeral port (Python `socket.bind(('', 0))`) and pass the resolved port to TestNG via an env var.
- **Sabotaged testng.xml leaking into the canonical jar**. If the script aborts mid-run, restoration could fail. Mitigation: sabotage operates on a copied jar in `/tmp/`, never on `target/`; `trap cleanup EXIT` removes `/tmp/sabotage-*` directories unconditionally.

## Notes / references

- Sprint 2 §14.6 SystemFeatures conformance class: `_bmad/architecture.md`
- Sprint 2 design.md §"SystemFeatures conformance class scope" / `dependsOnGroups` wiring: `openspec/capabilities/ets-ogcapi-connectedsystems/design.md`
- Quinn s06 CONCERN-1 (deferred dependency-skip verification): `.harness/evaluations/sprint-ets-02-evaluator-systemfeatures.yaml`
- Raze s06 CONCERN-1 (same): `.harness/evaluations/sprint-ets-02-adversarial-systemfeatures.yaml`
- TestNG XmlSuite API: https://javadoc.io/doc/org.testng/testng/latest/org/testng/xml/XmlSuite.html
- S-ETS-03-01 acceptance criteria (the work this ADR ratifies): `epics/stories/s-ets-03-01-dependency-skip-sabotage-test.md`
- Sprint 3 contract worktree-pollution constraint: `.harness/contracts/sprint-ets-03.yaml` (`worktree_pollution_constraint` field)

---

## Sprint 4 v2 amendment (2026-04-29) — Two-level dependency-skip cascade (Subsystems → SystemFeatures → Core)

**Trigger**: Sprint 4 S-ETS-04-05 introduces the **first two-level group-dependency chain** in the project — Subsystems depends on SystemFeatures, which depends on Core. Sprint 3's S-ETS-03-01 sabotage exec proved one-level cascade live (SystemFeatures→Core) but did NOT exercise multi-level cascade behavior. Pat surfaced TWO-LEVEL-DEPENDENCY-CASCADE-MAY-NOT-WORK as the highest-severity Sprint 4 risk (TestNG's `<group depends-on>` mechanism is not explicitly documented as transitive across three-or-more levels).

### Decision (Sprint 4 v2 amendment)

**Architect ratifies option (c): BOTH (defense-in-depth)** — start with (a) testng.xml `<group depends-on>` extension AND add (b) `BeforeSuite` SkipException pattern in the Subsystems class as a fallback if TestNG's transitive cascade does not actually skip Subsystems when Core fails.

Justification:

1. **TestNG group dependencies are NOT documented as transitive across multi-level chains.** TestNG documentation (https://testng.org/#_dependent_methods, https://testng.org/#_groups) describes `dependsOnGroups` and `<group depends-on>` semantics for **direct** dependencies (group A depends on group B = if B has any FAIL/SKIP, A's methods become SKIP). Transitive cascade (B depends on C; A depends on B; C fails → does A skip?) is not explicitly stated as supported. Empirical observation in TestNG 7.9.0 source (`org.testng.internal.MethodHelper.calculateDependentExpressionMethods`) suggests it works for `dependsOnMethods` but the group-level cascade across multiple `<group depends-on>` declarations in `<dependencies>` is uncertain. **We must not bet Sprint 4 on undocumented behavior.**
2. **Defense-in-depth aligns with the project's hardening pattern.** Sprint 3's CredentialMaskingFilter + MaskingRequestLoggingFilter wrap pair (§14.5 + §15.3) used the same defense-in-depth principle. Two independent failure modes are unlikely to coincide; either one alone closes the SCENARIO.
3. **The cost of (b) is negligible** (~10 LOC `@BeforeSuite` annotation + SkipException; reusable pattern documented in design.md "Sprint 3+ migration path"). Adding it as a belt-and-braces fallback is cheap insurance.
4. **Generator runtime verification is mandated** (Sprint 4 contract `success_criteria.two_level_dependency_skip_verified`) — extended bash sabotage (Core sabotage → assert SystemFeatures AND Subsystems both SKIP) is the canonical verification. If (a) alone passes the test, (b) is documented but inert (no harm; ready for next two-level chain in Sprint 5+); if (a) FAILs (Subsystems reports FAIL/ERROR instead of SKIP when Core fails), (b) activates and re-verifies. Either way, Sprint 4 ships green without an Architect re-cycle.

Reject option (a) alone: bets Sprint 4 on undocumented TestNG transitive cascade behavior. Reject option (b) alone: structural lint + bash sabotage exec already prove (a)'s pattern works for one-level chains; deprecating (a) in favor of (b) for two-level would create implementation drift between Subsystems' wiring and SystemFeatures' (Sprint 2/3 baseline).

### Implementation pattern

**(a) testng.xml extension** (S-ETS-04-05 sub-task):

Extend the canonical `src/main/resources/testng.xml` `<dependencies>` block to include the Subsystems group:

```xml
<test name="Subsystems">
  <packages>
    <package name="org.opengis.cite.ogcapiconnectedsystems10.conformance.subsystems"/>
  </packages>
  <groups>
    <dependencies>
      <group name="subsystems" depends-on="systemfeatures"/>
    </dependencies>
  </groups>
</test>
```

**Critical**: keep the SystemFeatures `<group name="systemfeatures" depends-on="core"/>` declaration in the SystemFeatures `<test>` block (Sprint 2 baseline) AND add the Subsystems declaration in the Subsystems `<test>` block. Some TestNG versions process group dependencies per-`<test>`-block and transitive cascade requires the entire chain to be visible at suite-load time.

**Alternative single-block consolidation** (Pat's option (a) hypothesis — also valid; Generator picks based on TestNG runtime behavior):

Some TestNG documentation suggests consolidating `<dependencies>` into a single suite-level block:

```xml
<suite name="ets-ogcapi-connectedsystems10">
  <groups>
    <dependencies>
      <group name="systemfeatures" depends-on="core"/>
      <group name="subsystems" depends-on="systemfeatures"/>
    </dependencies>
  </groups>
  <test name="Core">...</test>
  <test name="SystemFeatures">...</test>
  <test name="Subsystems">...</test>
</suite>
```

Generator MUST verify which form actually triggers transitive cascade in TestNG 7.9.0 (the version ets-common 17 enforces). The per-`<test>` form is the conservative default (mirrors Sprint 2/3 baseline); the consolidated form is the cleaner pattern if it works.

**(b) `@BeforeSuite` SkipException fallback** (S-ETS-04-05 sub-task; conditionally activated):

`org.opengis.cite.ogcapiconnectedsystems10.conformance.subsystems.SubsystemsTests`:

```java
package org.opengis.cite.ogcapiconnectedsystems10.conformance.subsystems;

import org.testng.SkipException;
import org.testng.annotations.BeforeSuite;
import org.testng.ITestContext;
// ... existing imports

public class SubsystemsTests {

    /**
     * Sprint 4 v2 amendment defense-in-depth: if TestNG's group-level transitive
     * cascade does NOT auto-skip Subsystems when Core OR SystemFeatures fails,
     * this @BeforeSuite explicitly checks the upstream conformance state from
     * SuiteAttribute and throws SkipException.
     *
     * NOTE: only activates if Generator empirically verifies that
     * `<group depends-on>` transitive cascade is not delivered by TestNG 7.9.0.
     * Otherwise this method is a no-op (safe to leave in for forward compatibility
     * with Sprint 5+ multi-level chains).
     *
     * Per ADR-010 v2 amendment §"Implementation pattern (b)".
     */
    @BeforeSuite(alwaysRun = true)
    public void verifyUpstreamConformancePassed(ITestContext context) {
        // SuiteFixtureListener stashes upstream pass/fail state into SuiteAttribute
        // (Generator extends SuiteFixtureListener if not already present).
        Boolean coreFailed = (Boolean) context.getSuite().getAttribute("core.failed");
        Boolean systemFeaturesFailed = (Boolean) context.getSuite().getAttribute("systemfeatures.failed");
        if (Boolean.TRUE.equals(coreFailed)) {
            throw new SkipException("Subsystems SKIPPED — upstream Core conformance class FAILed; two-level cascade fallback (ADR-010 v2)");
        }
        if (Boolean.TRUE.equals(systemFeaturesFailed)) {
            throw new SkipException("Subsystems SKIPPED — upstream SystemFeatures conformance class FAILed; two-level cascade fallback (ADR-010 v2)");
        }
    }
}
```

This pattern requires SuiteFixtureListener to track per-conformance-class pass/fail state (Generator extends if not already present per a Sprint 3+ migration-path design.md note). For Sprint 4, the conditional activation criterion: if (a) testng.xml form alone passes the extended bash sabotage test, leave the @BeforeSuite in place as forward-compat insurance but document it as "INERT — TestNG transitive cascade verified working in TestNG 7.9.0 against this suite".

### Test verification approach (Generator MUST implement at runtime)

S-ETS-04-05 acceptance criterion: extend `scripts/verify-dependency-skip.sh` (or add a sibling `scripts/verify-two-level-dependency-skip.sh`) to:

1. Sabotage Core (per existing Sprint 3 stub-server pattern — ADR-010 §Decision option b "stub-server sabotage").
2. Run smoke against the sabotaged config.
3. Parse `target/testng-results.xml`:
   - Assert `<test name="Core">` has at least one method with `status="FAIL"` (sabotage worked).
   - Assert **EVERY** method in `<test name="SystemFeatures">` has `status="SKIP"` (one-level cascade — Sprint 3 baseline).
   - Assert **EVERY** method in `<test name="Subsystems">` has `status="SKIP"` (TWO-LEVEL cascade — NEW for Sprint 4; closes SCENARIO-ETS-PART1-003-SUBSYSTEMS-DEPENDENCY-SKIP-001).
4. **If step 3's third assertion FAILs** (Subsystems reports FAIL/ERROR/PASS instead of SKIP): TestNG transitive cascade does NOT work; activate (b) `@BeforeSuite` fallback in `SubsystemsTests`; re-run; assert SKIP this time.
5. Archive the sabotaged `target/testng-results.xml` to `ops/test-results/sprint-ets-04-two-level-dependency-skip-evidence.xml` for gate-review.

### Extension to VerifyDependencySkipWiring unit test

`src/test/java/.../listener/VerifyDependencySkipWiring.java` (Sprint 3 baseline) SHALL be extended with a Subsystems structural assertion:

- Assert `<test name="Subsystems">` exists in the canonical testng.xml.
- Assert its `<groups><dependencies>` block contains `<group name="subsystems" depends-on="systemfeatures"/>` (or, if consolidated-block form is adopted, the suite-level `<dependencies>` block contains it).
- Assert the dependency chain SystemFeatures→Core remains intact (no regression).

Lightweight; ~10 LOC addition to the existing test class.

### Consequences (Sprint 4 v2 amendment increment)

**Positive**:
- Defense-in-depth: testng.xml structural pattern (cheap to extend mechanically) + explicit `@BeforeSuite` (cheap insurance) cover both happy-path and fallback.
- Forward-compatible with Sprint 5+ multi-level chains (Procedures→SystemFeatures→Core; Sampling→SystemFeatures→Core; etc.) — `@BeforeSuite` pattern ports cleanly.
- Closes Pat's TWO-LEVEL-DEPENDENCY-CASCADE-MAY-NOT-WORK risk pre-emptively without an Architect re-cycle if TestNG cascade underperforms.
- Sets the canonical pattern for the project's group-dependency depth (one or two levels covered; deeper chains would extend the `@BeforeSuite` check, not introduce new architectural ratifications).

**Negative**:
- ~10 LOC `@BeforeSuite` overhead per conformance class (post-Sprint-4) if defense-in-depth is retained for forward chains. Acceptable.
- SuiteFixtureListener may need a small extension to populate `core.failed` / `systemfeatures.failed` SuiteAttribute keys (TestNG's `ITestListener.onTestFailure` hook). ~15 LOC; carry as a Sprint 4 sub-task within S-ETS-04-05 IF the (b) fallback activates; defer otherwise.

**Risks**:
- **TestNG 7.9.0 transitive cascade behavior may surprise**. Mitigation: Generator runtime verification is mandatory; archived `target/testng-results.xml` is the canonical evidence (no theoretical assumption; binary observed-or-not result).
- **`@BeforeSuite` activation order vs `dependsOnGroups` interaction**. If both fire and Subsystems' upstream-check throws SkipException, but TestNG already would have SKIPPED via group-dependency, the result is still SKIP (idempotent). If only `@BeforeSuite` is the active mechanism, all Subsystems @Tests are SKIPPED at suite startup. Either way: net effect = Subsystems methods report `status="SKIP"`. No conflict.

### Notes / references (Sprint 4 v2 amendment)

- TestNG 7.9.0 group dependencies docs: https://testng.org/#_groups (§"Dependencies")
- Sprint 4 contract success criterion: `.harness/contracts/sprint-ets-04.yaml` `success_criteria.two_level_dependency_skip_verified`
- S-ETS-04-05 acceptance criteria: `epics/stories/s-ets-04-05-subsystems-conformance-class.md`
- SCENARIO-ETS-PART1-003-SUBSYSTEMS-DEPENDENCY-SKIP-001: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Architecture v2.0.3 §16: `_bmad/architecture.md`
