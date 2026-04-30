# Story: S-ETS-07-01

**Epic**: epic-ets-04-teamengine-integration
**Priority**: P1
**Estimated Complexity**: S

## Description

Bundle all 6 Sprint 6 meta-Raze carryover wedges into a single story. These are small, precisely-bounded fixes (~50-80 LOC total) that must land FIRST in Sprint 7 to unblock REQ-ETS-CLEANUP-017 live-verification and clean up status-honesty issues before new conformance classes are added.

This story does NOT add any new OGC conformance class. It closes open defects from Sprint 6 gates.

## Acceptance Criteria

- SCENARIO-ETS-CLEANUP-SABOTAGE-JAVAC-FIX-001 (CRITICAL)
- SCENARIO-ETS-CLEANUP-SABOTAGE-PIPEFAIL-FIX-001 (CRITICAL)
- SCENARIO-ETS-CLEANUP-CRED-LEAK-PRONG-B-FIX-001 (CRITICAL)
- SCENARIO-ETS-CLEANUP-REQ017-STATUS-HONESTY-001 (CRITICAL)
- SCENARIO-ETS-CLEANUP-DESIGN-MD-WRAP-PATTERN-001 (NORMAL)
- SCENARIO-ETS-CLEANUP-ADR010-V4-OR-RETROVAL-001 (NORMAL)

## Spec References

- REQ-ETS-CLEANUP-017 (status corrected from IMPLEMENTED → STRUCTURAL-IMPLEMENTED-LIVE-EXEC-FAILED; live cascade acceptance deferred to Sprint 7 GAP-1 close)
- REQ-ETS-CLEANUP-018 (NEW — Sprint 6 carryover wedge bundle close)
- REQ-ETS-CLEANUP-016 (credential-leak-e2e-test.sh prong-b fix unlocks automated three-fold PASS)

## Technical Notes

### Wedge 1 — Sabotage javac unreachable-statement fix (HIGH P0)
**File**: `scripts/sabotage-test.sh` line ~231-232 (python injector)
**Root cause**: Sprint 5 S-ETS-05-03 python sed-patch injects `throw new AssertionError("SABOTAGED ...")` as first statement of `systemsCollectionReturns200()`. The existing `ETSAssert.assertStatus(...)` line below it becomes unreachable per JLS §14.21. javac rejects with `[210,17] unreachable statement`.
**Fix**: Change the injected marker from:
  `throw new AssertionError("SABOTAGED by --target=systemfeatures Sprint 5 S-ETS-05-03");`
  to:
  `if (true) throw new AssertionError("SABOTAGED by --target=systemfeatures Sprint 5 S-ETS-05-03");`
The `if (true) throw` idiom defeats javac reachability analysis (JLS §14.21 — `if` with a constant expression is reachable in both branches; `true` is a constant). The existing `ETSAssert.assertStatus` line remains reachable in javac's static analysis, satisfying the compiler; at runtime the `if (true)` guard always fires so the test method still throws and the sabotage semantics are preserved.
**Estimated LOC**: ~1-3 LOC python edit (change SABOTAGE_MARKER string, or change the python insertion to wrap with `if (true) { ... }`).
**Verification**: Generator runs `bash scripts/sabotage-test.sh --target=systemfeatures` from a /tmp clone and verifies Docker build succeeds past `mvn clean package` AND a cascade XML is produced showing Core+Common PASS, SystemFeatures FAIL+SKIP, Subsystems+Procedures+Deployments all SKIP. This closes REQ-ETS-CLEANUP-017 live acceptance AND retroactively validates ADR-010 v3 3-class cascade claim.

### Wedge 2 — Spec.md REQ-ETS-CLEANUP-017 status-honesty correction (HIGH P0)
**File**: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` line ~345
**Root cause**: REQ-ETS-CLEANUP-017 status declared `IMPLEMENTED` at Sprint 6 close but Raze's live exec FAILED (javac error). This is a status-honesty issue (same class as Sprint 5 META-RAZE M-3 framing flattening).
**Fix**: Change status from `IMPLEMENTED` to `STRUCTURAL-IMPLEMENTED-LIVE-EXEC-FAILED (Sprint 6 close 2026-04-30; structural .git fix landed sister c25e44a..c17a534; live cascade unverified because Sprint 5 sabotage-marker injection produces javac unreachable-statement compile error — Sprint 5 GAP-2 .git-exclude previously masked this latent bug; Sprint 7 S-ETS-07-01 targets full close; cross-reference Raze HIGH GAP-1 + meta-review META-GAP-M2)`.
**Note**: After Wedge 1 closes live-verification in Sprint 7, Generator promotes this to `IMPLEMENTED (Sprint 7 S-ETS-07-01 — live cascade verified)`.
**Estimated LOC**: ~5-8 LOC spec.md text edit.

### Wedge 3 — credential-leak-e2e-test.sh prong-b retarget (MEDIUM P1)
**File**: `scripts/credential-leak-e2e-test.sh` line ~127
**Root cause**: Quinn GAP-Q1 — script runs `docker logs $CONTAINER_NAME > $CONTAINER_LOG` AFTER smoke-test.sh's cleanup_silent has torn down the container. `$ARCHIVE_DIR/container.log` = 1 line "Error response from daemon: No such container". Prong-b greps the vacuous log; returns 0 hits; script exits FAIL despite wire-layer fix being correct.
**Fix** (Quinn's recommended fix — see sprint-ets-06-evaluator-cumulative.yaml GAP-Q1 fix_recommendation):
```bash
# At line 127, replace:
docker logs "$CONTAINER_NAME" > "$CONTAINER_LOG" 2>&1 || true
# With:
cp -f "${SMOKE_OUTPUT_DIR:-ops/test-results}"/s-ets-01-03-teamengine-container-*.log "$CONTAINER_LOG" 2>/dev/null \
  || docker logs "$CONTAINER_NAME" > "$CONTAINER_LOG" 2>&1 || true
```
This tries the smoke-test.sh's already-archived container log first (where the Sprint 6 container-log timing fix puts the masked catalina.out content); falls back to live `docker logs` only if the archive doesn't exist.
Also fix GAP-Q2 (bundled): remove the misdirected `$STUB_LOGFILE` grep from prong-b (stub-IUT sees wire only; wire under approach (i) carries original, not masked form; this grep can never produce a hit). Add rationale comment.
**Estimated LOC**: ~5-8 LOC bash.

### Wedge 4 — sabotage-test.sh pipefail unreachable conditional fix (MEDIUM P1)
**File**: `scripts/sabotage-test.sh` lines 287-298 (around `LATEST_REPORT` assignment)
**Root cause**: Raze GAP-3 — bash -x trace confirms that under `set -eo pipefail`, the line:
  `LATEST_REPORT="$(ls -t "${SABOTAGE_TMPDIR}/test-results"/s-ets-01-03-teamengine-smoke-*.xml 2>/dev/null | head -1)"`
exits the script with code 2 when `ls` finds no matching glob (the normal case after Docker build failure — no XML yet). The `|| SMOKE_EXIT_CODE=$?` at line 280 captures the smoke exit code correctly, but the script dies before reaching the disambiguation log message at lines 289-298.
**Fix**: Replace the bare `ls` pipeline with a glob-safe idiom:
```bash
LATEST_REPORT=""
for _f in "${SABOTAGE_TMPDIR}/test-results"/s-ets-01-03-teamengine-smoke-*.xml; do
  [[ -f "$_f" ]] && LATEST_REPORT="$_f"
done
```
OR use `compgen -G`:
```bash
LATEST_REPORT="$(compgen -G "${SABOTAGE_TMPDIR}/test-results/s-ets-01-03-teamengine-smoke-*.xml" 2>/dev/null | head -1)" || true
```
The `for` idiom is more portable; the `compgen -G` idiom is more concise. Generator chooses; both are correct.
**Estimated LOC**: ~3-5 LOC bash (replace 1 line with 3-4).
**bash -x verification required**: Generator MUST run `bash -x scripts/sabotage-test.sh --target=systemfeatures` (or a dry-run equivalent that exercises the pipefail path) and capture the trace, confirming the disambiguation block fires when Docker build fails. This is a Sprint 7 contract success criterion.

### Wedge 5 — design.md §Sprint 3 hardening wrap-pattern doc-lag (MEDIUM P1)
**File**: `openspec/capabilities/ets-ogcapi-connectedsystems/design.md` lines 531-636
**Root cause**: meta-Raze META-GAP-M1 — design.md §"Sprint 3 hardening: MaskingRequestLoggingFilter wrap pattern" still describes the OLD subclass-based super.filter() wrap pattern. Sprint 6 approach (i) bypasses super.filter() entirely and calls ctx.next(unmutatedSpec) directly.
Specific stale prose (confirmed by meta-Raze grep):
- Line ~533: "Architect ratifies: subclass-based wrap (Pat's option (a))" — still accurate as historical ratification, but misleading post-Sprint 6
- Line ~586: example code shows `return super.filter(requestSpec, responseSpec, ctx);` — this is the OLD code
- Line ~603: "The try/finally pattern guarantees the IUT receives the real credential header even if super.filter() throws" — FALSE claim (Sprint 5 GAP-1' diagnosis; Sprint 6 approach (i) eliminates the try/finally entirely)
- Line ~634: unit-test descriptions for try/finally tests that were DELETED in Sprint 6

**Fix**: Add a new subsection IMMEDIATELY BEFORE the old wrap-pattern code block:
```
#### Sprint 6 redesign: approach (i) — wire-side correctness via no-spec-mutation (S-ETS-06-01)

**Sprint 6 update (2026-04-30)**: The Sprint 3 subclass-based wrap pattern was diagnosed
as DEFECTIVE by Sprint 5 Raze adversarial review (GAP-1'): `super.filter()` internally
calls `ctx.next()` (HTTP send) while the header swap is in effect, so the wire carries
the masked credential. Approach (i) was ratified by meta-Raze + primary Raze + Quinn.

**Approach (i) — now canonical**:
MaskingRequestLoggingFilter no longer calls `super.filter()`. Instead:
1. Build masked log string from header snapshot (READ-ONLY: `requestSpec.getHeaders()`)
2. Emit to shadowed `private final PrintStream stream` (parent's stream is private
   final with no accessor in REST-Assured 5.5.0)
3. Call `ctx.next(requestSpec, responseSpec)` directly with unmutated spec
   — wire carries ORIGINAL credential

`super.filter()` is never called. No try/finally. No header mutation.
Wire-side correctness proven by `VerifyWireRestoresOriginalCredential` (4 @Tests,
CapturingFilterContext snapshots header values BY VALUE at ctx.next call time).
```
Then mark the old code block as historical with a header change:
`**Historical (Sprint 3 baseline — superseded by Sprint 6 approach (i) above):**`
Update the "why subclass" bullet #4 to note: "This rationale was invalidated by Sprint 5 GAP-1'. The try/finally pattern does NOT guarantee IUT receives real credentials — see approach (i) above."
**Estimated LOC**: ~30-50 LOC design.md text edit.

### Wedge 6 — ADR-010 v3 3-class cascade gap (LOW)
**Disposition**: NATURAL FALL-THROUGH. If Wedge 1 (sabotage javac fix) closes, Generator runs sabotage --target=systemfeatures and produces the 3-class cascade XML. This retroactively validates ADR-010 v3's "forward-extends to Procedures + Deployments" claim at the live-exec layer. No separate ADR-010 v4 amendment needed — just add a note to ADR-010 v3 at the bottom: "3-class cascade live-verified in Sprint 7 S-ETS-07-01 [date]; cascade XML archived at [path]."
If Wedge 1 does NOT close in Sprint 7 (extremely unlikely given the simple fix), add ADR-010 v4 amendment recording "3-class live-verification attempt failed in Sprint 6 due to sabotage-marker compile error; Sprint 7 carryover."

## Dependencies

None (this is the first story in Sprint 7; all subsequent stories depend on this).

## Definition of Done

- [ ] `bash scripts/sabotage-test.sh --target=systemfeatures` (from /tmp clone) completes WITHOUT javac error; Docker build succeeds at builder 8/8
- [ ] Cascade XML produced and parsed: Core+Common all PASS, SystemFeatures 1×FAIL+Nx SKIP, Subsystems+Procedures+Deployments all SKIP
- [ ] `bash -x scripts/sabotage-test.sh` trace captured by Generator showing disambiguation block fires when Docker build fails (Wedge 4 verification)
- [ ] `bash -x scripts/credential-leak-e2e-test.sh` trace (or manual test) shows prong-b greps the correct archived container log
- [ ] spec.md REQ-ETS-CLEANUP-017 status updated to STRUCTURAL-IMPLEMENTED-LIVE-EXEC-FAILED (before Wedge 1 close) then promoted to IMPLEMENTED (after live cascade verified)
- [ ] design.md §"Sprint 3 hardening" updated: approach (i) subsection added; old code marked historical; false try/finally claim corrected
- [ ] ADR-010 v3 receives a "Sprint 7 live-verification note" confirming 3-class cascade XML produced
- [ ] All existing tests continue to pass (mvn 80/0/0/3; smoke 34/34 baseline preserved)
- [ ] Spec implementation status updated; traceability.md rows updated
- [ ] No regression in existing conformance classes

## Implementation Notes

### Generator Run 1 (Dana, 2026-04-30, status: Implemented)

All 6 wedges CLOSED. Sister repo HEAD `c17a534 → 38b1f8a` after 6 commits.

**Wedge 1 (HIGH P0) — sabotage-test.sh javac unreachable-statement fix**: Closed in 2 attempts.

- **First attempt** (sister `a17c6ec`): single-line `if (true) throw new AssertionError(...)`. javac PASSes (defeats reachability analysis per JLS §14.21) but Dockerfile builder stage 8/8 FAILed at `mvn clean package` because spring-javaformat-maven-plugin:0.0.43:validate rejected the formatting: spring-javaformat mandates that an `if`-without-block construct's body lives on its own line indented one tab deeper than the `if`.
- **Second attempt** (sister `94a4971`): two-line `if (true)\n\t\t\tthrow new AssertionError(...);` shape. PASSes javac AND spring-javaformat:validate.
- **Verification**: ran `bash scripts/sabotage-test.sh --target=systemfeatures` from `/tmp/dana-fresh-sprint7/` (clean clone of sister at `94a4971`). Cascade XML produced at `/tmp/dana-sabotage-sprint7/sprint-ets-05-03-sabotage-systemfeatures-cascade-2026-04-30T163634Z.xml`. Cascade verdict: Core 8 PASS, Common 4 PASS, SystemFeatures 1 FAIL + 5 SKIP, Subsystems 4 SKIP, Procedures 4 SKIP, Deployments 4 SKIP. Step 5/6 verdict: "PASS — two-level cascade verified end-to-end".
- Cascade XML archived at sister `ops/test-results/sprint-ets-07-01-wedge1-sabotage-cascade-2026-04-30.xml` (commit `c68b803`).

**Wedge 2 (HIGH P0) — REQ-ETS-CLEANUP-017 status honesty**: Pat completed status correction at planning time. Generator promoted to IMPLEMENTED in this commit after Wedge 1 cascade XML produced. spec.md REQ-017 now reads `IMPLEMENTED (Sprint 7 S-ETS-07-01 Wedge 1 close 2026-04-30 ... cascade verdict: Core 8 PASS, Common 4 PASS, SystemFeatures 1 FAIL + 5 SKIP, ...)` with cascade XML evidence path.

**Wedge 3 (MEDIUM P1) — credential-leak-e2e-test.sh prong-b retarget**: Replaced `docker logs $CONTAINER_NAME > $CONTAINER_LOG` with glob-safe lookup of `${SMOKE_OUTPUT_DIR}/s-ets-01-03-teamengine-container-*.log` archive (Sprint 6 timing fix output) with fallback to `docker logs`. bash -x trace at sister `ops/test-results/sprint-ets-07-01-wedge3-cred-leak-prong-b-bash-x-trace.log` (commit `bd6fa9b`) shows the for-loop sets `SMOKE_CONTAINER_LOG_HIT` to the archive path, `cp -f` copies the archive (NOT the docker logs fallback), and prong-b grep `Bear***WXYZ` finds 1 hit.

**Wedge 4 (MEDIUM P1) — sabotage-test.sh pipefail-unreachable fix**: Replaced `LATEST_REPORT="$(ls -t ... | head -1)"` pipeline with glob-safe `for _f in ...; do [[ -e "$_f" ]] && LATEST_REPORT="$_f"; done` idiom. Verified live at first sabotage attempt (Wedge 1 v1 single-line shape FAILed Dockerfile builder stage 8/8): the disambiguation log line "smoke exited non-zero with NO TestNG report — Docker build FAILED (not a sabotage-marker hit)" fired correctly. Pre-Wedge-4 the script would have died silently before reaching the disambiguation block.

**Wedge 5 (MEDIUM P1) — design.md §Sprint 3 hardening doc-lag fix**: Added `Sprint 6 redesign: approach (i) — wire-side correctness via no-spec-mutation (S-ETS-06-01) — CANONICAL` subsection BEFORE the old wrap-pattern code (~50 LOC of new prose explaining why super.filter() invocation was DEFECTIVE under Sprint 3 design and how approach (i) fixes it). Marked the old block "Historical (Sprint 3 baseline — superseded by Sprint 6 approach (i) above)". Explicitly invalidated the false try/finally claim by referencing the Sprint 5 GAP-1' diagnosis. Implements the Sprint 7 contract `generator_design_md_adr_self_audit` success criterion.

**Wedge 6 (LOW) — ADR-010 v3 retroval**: Natural fall-through. Added `Sprint 7 v3 retroval note (2026-04-30)` to ADR-010 v3 section recording the live 3-class cascade verdict (with table of class/PASS/FAIL/SKIP counts), citing sister cascade XML + bash -x trace as evidence, and noting that the v3 amendment's "forward-extends to Procedures + Deployments" claim is now empirically VERIFIED LIVE (was empirical inference at Sprint 5 close).

### Verification

- `mvn clean test` 86/0/0/3 BUILD SUCCESS (was 80; +6 lint tests for SF + Property in S-07-02 + S-07-03)
- `bash scripts/sabotage-test.sh --target=systemfeatures` from /tmp clone: exit 0, cascade XML produced
- `bash scripts/smoke-test.sh` from /tmp clone: 42/42 PASS (40 PASS + 2 SKIP-with-reason for empty PropertyDefinitions per-item @Tests)
- bash -x traces archived for both modified scripts (sabotage-test.sh + credential-leak-e2e-test.sh)

### Sprint 7 contract success criteria met

- `sabotage_cascade_xml_produced: true` ✓ (Wedge 1)
- `credential_leak_e2e_full_pass: true` ✓ (Wedge 3 — prong-b targeting verified via bash -x trace)
- `sabotage_disambiguation_block_fires: true` ✓ (Wedge 4 — verified live at Wedge 1 v1 attempt)
- `req017_status_honesty_corrected: true` ✓ (Wedge 2 — promoted IMPLEMENTED after live-exec)
- `design_md_approach_i_documented: true` ✓ (Wedge 5)
- `bash_x_trace_evidence_for_bash_changes: true` ✓ (sister `ops/test-results/sprint-ets-07-01-wedge1-bash-x-trace.log` + `sprint-ets-07-01-wedge3-cred-leak-prong-b-bash-x-trace.log`)
- `generator_design_md_adr_self_audit: true` ✓ (Wedge 5 + Wedge 6)
- `spec_status_honesty_principle: true` ✓ (Wedge 2 promotion only AFTER cascade XML produced)
