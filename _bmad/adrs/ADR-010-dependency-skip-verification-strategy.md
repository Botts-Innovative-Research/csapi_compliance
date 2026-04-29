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
