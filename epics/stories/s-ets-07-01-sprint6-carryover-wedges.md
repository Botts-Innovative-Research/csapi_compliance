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

(To be filled by Generator at run time.)
