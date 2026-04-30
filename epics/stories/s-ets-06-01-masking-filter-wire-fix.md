# Story: S-ETS-06-01

**Epic**: epic-ets-04-teamengine-integration
**Priority**: P0
**Estimated Complexity**: M

## Description

Redesign `MaskingRequestLoggingFilter.filter()` so the wire carries the ORIGINAL credential, not the masked form. The Sprint 3 implementation's try/finally structure is architecturally sound in concept but contains a sequencing defect: the header mutation happens BEFORE `super.filter()` calls `ctx.next()` (which performs the HTTP send), and the finally-block restoration happens AFTER the wire send completes. The result — observed by Raze and Quinn at Sprint 5 gate and confirmed by meta-Raze source inspection at lines 105-139 — is that all 12 IUT requests carry `Authorization: Bear***WXYZ` (the masked form) rather than the original `Bearer ABCDEFGH12345678WXYZ`.

The fix follows meta-Raze / primary-Raze approach (i): the masking filter SHALL NOT mutate `requestSpec` before the HTTP send. Instead it SHALL:
1. Snapshot the sensitive headers from `requestSpec`.
2. Build a masked log string directly (without delegating log output to `super.filter()`).
3. Emit the masked log line to the configured `PrintStream`.
4. Call `ctx.next(requestSpec, responseSpec)` directly (bypassing `super.filter()`) with the ORIGINAL spec — the wire carries the original credential.

This story ALSO adds `VerifyWireRestoresOriginalCredential` — a non-stub FilterContext unit test that records the spec passed to `ctx.next()` and asserts it carries the ORIGINAL Authorization value (not the masked form). This test is structurally distinct from the 16 wiring-only tests (VerifyAuthCredentialPropagation 8 + VerifyMaskingRequestLoggingFilter 8) that use a `StubFilterContext` returning null and cannot exercise wire-side ordering.

Finally, spec.md and story Implementation Notes for S-ETS-05-01 SHALL be amended to reclassify the 16 existing wiring-only unit tests as "wiring-only — does NOT prove wire-side credential integrity" so future readers do not conflate PASS counts with credential safety.

## Acceptance Criteria

- SCENARIO-ETS-CLEANUP-MASKING-WIRE-FIX-001 (CRITICAL): Wire carries original credential
- SCENARIO-ETS-CLEANUP-MASKING-WIRE-TEST-001 (CRITICAL): VerifyWireRestoresOriginalCredential test passes
- SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-THREE-FOLD-CLOSE-001 (CRITICAL): Three-fold cross-check (a)+(b)+(c) all PASS
- SCENARIO-ETS-CLEANUP-WIRING-TEST-RECLASSIFIED-001 (NORMAL): 16 existing unit tests reclassified in spec.md

## Spec References

- REQ-ETS-CLEANUP-011 (re-opened → IMPLEMENTED when this story closes)
- REQ-ETS-CLEANUP-016 (NEW — masking filter wire-side correctness; distinct from REQ-ETS-CLEANUP-013 wiring fix)

## Technical Notes

**Fix surface**: `MaskingRequestLoggingFilter.java` lines 100-141 (the `filter()` override).

**Current broken flow** (lines 109-138):
```
try {
  // ... snapshot originals into map
  // mutate requestSpec to masked form  ← WRONG: mutation happens here
  return super.filter(requestSpec, responseSpec, ctx);  ← HTTP send happens INSIDE here with masked spec
} finally {
  // restore originals  ← TOO LATE: wire already sent
}
```

**Fixed flow** (approach i per meta-Raze):
```java
@Override
public Response filter(FilterableRequestSpecification requestSpec,
                       FilterableResponseSpecification responseSpec,
                       FilterContext ctx) {
    // 1. Snapshot + build masked log string (without mutating requestSpec)
    StringBuilder logLine = new StringBuilder("Request: ");
    if (requestSpec != null && requestSpec.getHeaders() != null) {
        requestSpec.getHeaders().forEach(h -> {
            String display = isMasked(h.getName())
                ? h.getName() + "=" + CredentialMaskingFilter.maskValue(h.getValue())
                : h.getName() + "=" + h.getValue();
            logLine.append("\n    ").append(display);
        });
    }
    // 2. Emit masked log line directly to configured stream
    getPrintStream().println(logLine);
    // 3. Call ctx.next with ORIGINAL (unmutated) requestSpec — wire carries original credential
    return ctx.next(requestSpec, responseSpec);
}
```

Note: `getPrintStream()` requires a protected accessor or field — read the `RequestLoggingFilter` superclass to confirm. Alternative: store the `PrintStream` as a private field in the constructor and use it directly (already done via `super(stream)` in the existing constructors; the field may need to be shadowed).

**VerifyWireRestoresOriginalCredential design**: Create a test-scope `CapturingFilterContext` that implements `FilterContext` and records the `requestSpec` argument passed to `ctx.next(requestSpec, responseSpec)`. Assert that the captured spec's `Authorization` header value equals the original (un-masked) value. This test exercises the wire-side ordering that `StubFilterContext` (returning null from `ctx.next`) cannot.

**Log format guidance**: The masked log line format should be sufficient to prove `MaskingRequestLoggingFilter` ran (enabling prong (b) of the three-fold cross-check when it emits to `System.out` / `logback`). Consult the existing `CredentialMaskingFilter` log format for consistency.

**Container-log capture fix (CONCERN-1 from Raze)**:
`scripts/credential-leak-e2e-test.sh` prong (a)+(b) captures `container.log` AFTER `smoke-test.sh` tears down the container (teardown via `cleanup_silent` trap). This makes prong (a) pass vacuously (empty log = 0 hits). Fix: capture `catalina.out` DURING smoke-test.sh step 7 (before validation + teardown) so container.log contains actual filter output. ~10 LOC bash in `smoke-test.sh` or `credential-leak-e2e-test.sh`. This is BUNDLED here (not a separate story) because it's a ~10-LOC bash change that makes prong (b) non-vacuous after the filter fix.

**Prong (b) grep expansion (CONCERN-2 from Raze)**: Add `$STUB_LOGFILE` grep to prong (b) so masked-form hits in the stub-IUT log also count. ~2 LOC bash.

**Sequencing**: Generator MUST run `mvn test` after each Java change to keep surefire green. Live three-fold credential-leak exec is NOT run by Generator (deferred to Quinn/Raze gate per established pattern).

## Dependencies

- Depends on: S-ETS-05-01 (IMPLEMENTED — wiring exists; this story fixes the ordering defect the wiring exposed)
- Depends on: S-ETS-05-02 (IMPLEMENTED — SMOKE_OUTPUT_DIR override in place; gate runs stay hermetic)

## Definition of Done

- [ ] SCENARIO-ETS-CLEANUP-MASKING-WIRE-FIX-001 structural-pass (filter no longer mutates requestSpec before ctx.next)
- [ ] SCENARIO-ETS-CLEANUP-MASKING-WIRE-TEST-001 structural-pass (VerifyWireRestoresOriginalCredential test runs green in mvn test)
- [ ] SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-THREE-FOLD-CLOSE-001 deferred to gate (live exec by Quinn / adversarial exec by Raze)
- [ ] SCENARIO-ETS-CLEANUP-WIRING-TEST-RECLASSIFIED-001 — spec.md + story notes for S-ETS-05-01 note the 16 tests as wiring-only
- [ ] REQ-ETS-CLEANUP-016 status updated to IMPLEMENTED in spec.md
- [ ] REQ-ETS-CLEANUP-011 status updated to IMPLEMENTED in spec.md (finally closes after Sprint 4 + Sprint 5 carryover)
- [ ] No regression: mvn test stays at 78+N/0/0/3 (N = new unit test count, minimum 1 for VerifyWireRestoresOriginalCredential)
- [ ] Container-log capture timing fix bundled (smoke-test.sh captures catalina.out before teardown)
- [ ] Prong (b) grep expanded to include stub-IUT log
- [ ] design.md §"Sprint 3 hardening: MaskingRequestLoggingFilter wrap pattern" updated to reflect the fix (the javadoc claim "IUT receives the real credential header" is now actually true)
