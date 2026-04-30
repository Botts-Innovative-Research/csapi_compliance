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

**Fixed flow** (approach i per meta-Raze) — PRIMARY PATTERN (shadowed PrintStream field):

> **Note**: `RequestLoggingFilter` (REST-Assured 5.5.0) declares `private final PrintStream stream;` with NO public or protected accessor (verified by Plan-Raze source inspection of rest-assured-5.5.0 sources jar). Calling `getPrintStream()` WILL NOT COMPILE. The working pattern is to shadow the field with a `private final PrintStream stream;` declared in `MaskingRequestLoggingFilter` itself and captured in each constructor via `super(stream)`.

```java
public class MaskingRequestLoggingFilter extends RequestLoggingFilter {
    // Shadow parent's private field — no accessor exists in REST-Assured 5.5.0
    private final PrintStream stream;

    public MaskingRequestLoggingFilter() {
        super();
        this.stream = System.out;
    }

    public MaskingRequestLoggingFilter(Set<String> headersToMask, PrintStream stream) {
        super(stream);
        this.stream = stream;  // capture for direct use in filter()
    }

    @Override
    public Response filter(FilterableRequestSpecification requestSpec,
                           FilterableResponseSpecification responseSpec,
                           FilterContext ctx) {
        // 1. Snapshot + build masked log string (WITHOUT mutating requestSpec)
        StringBuilder logLine = new StringBuilder("Request: ");
        if (requestSpec != null && requestSpec.getHeaders() != null) {
            requestSpec.getHeaders().forEach(h -> {
                String display = isMasked(h.getName())
                    ? h.getName() + "=" + CredentialMaskingFilter.maskValue(h.getValue())
                    : h.getName() + "=" + h.getValue();
                logLine.append("\n    ").append(display);
            });
        }
        // 2. Emit masked log line directly via shadowed field (compiles; parent field inaccessible)
        this.stream.println(logLine);
        // 3. Call ctx.next with ORIGINAL (unmutated) requestSpec — wire carries original credential
        return ctx.next(requestSpec, responseSpec);
    }
}
```

**Rejected alternative — won't compile**:

```java
// DO NOT USE: getPrintStream() does NOT exist in REST-Assured 5.5.0
// RequestLoggingFilter.stream is private final with no accessor.
getPrintStream().println(logLine);   // ← compile error: cannot find symbol
```

This approach was considered but is REJECTED because `RequestLoggingFilter.stream` is `private final` (line 48 of RequestLoggingFilter.java, 5.5.0 sources) with no `getPrintStream()` accessor. Generator MUST use the shadowed field pattern above.

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
- [ ] S-06-03 finer-granularity disposition — Generator audits the 8 VerifyMaskingRequestLoggingFilter tests; DELETES the ones that verify try/finally semantics that approach (i) eliminates; KEEPS and reclassifies (as "wiring-only") the ones that verify mask format, isMasked(), and DEFAULT_HEADERS_TO_MASK set membership. (Plan-Raze recommendation: partial-delete is healthier than preserving tests for non-existent code.)

## Implementation Notes (Sprint 6 Generator Run 1 — 2026-04-30)

**Status**: IMPLEMENTED (live three-fold deferred to Quinn closure-proof exec at Sprint 6 gate)

**Sister repo commits**:
- `3ccc24e` — MaskingRequestLoggingFilter approach (i) wire-fix + new VerifyWireRestoresOriginalCredential + VerifyMaskingRequestLoggingFilter audit
- `cb87feb` — smoke-test.sh container-log capture timing fix + credential-leak-e2e-test.sh prong-b grep expansion
- Sister repo HEAD post-S-06-01: `cb87feb` (subsequently `c17a534` after S-06-02)

**Approach (i) implementation** (`MaskingRequestLoggingFilter.java`):
1. Added `private final PrintStream stream` field shadowing the parent's `private final PrintStream stream` (REST-Assured 5.5.0; no accessor — Plan-Raze verified via Maven Central source-jar inspection). Captured in the 2-arg constructor via `this.stream = stream` after `super(stream)`.
2. `filter()` rewritten: no try/finally, no spec mutation. Builds `StringBuilder logLine = new StringBuilder("Request: ")` containing HTTP method + URI on the first line, then one indented `Header=Value` line per header. Sensitive header values are passed through `CredentialMaskingFilter.maskValue` for log emission only; non-sensitive headers pass through unchanged. Defensive try/catch around the log build wraps a fallback "log-emission failed" line so a logging-side failure never breaks the actual request.
3. `return ctx.next(requestSpec, responseSpec)` — call delegated to next filter / transport with unmutated requestSpec. Wire carries ORIGINAL credential.
4. `super.filter()` removed entirely. Per Plan-Raze source inspection, parent filter was 2 ops (`RequestPrinter.print` + `return ctx.next`); we replace the log emission and retain the ctx.next call.
5. Javadoc rewritten: now accurately describes approach (i); explains shadowed-PrintStream-field rationale; documents the `super.filter` bypass with a TODO for any rest-assured upgrade past 5.5.x.

**VerifyWireRestoresOriginalCredential** (4 @Tests) — `src/test/java/.../listener/VerifyWireRestoresOriginalCredential.java`:
- `wireCarriesOriginalAuthorizationCredential` — primary; asserts the Authorization header value snapshotted DURING ctx.next equals `Bearer ABCDEFGH12345678WXYZ` (not `Bear***WXYZ`).
- `wireCarriesOriginalApiKeyAndCookie` — multi-header coverage.
- `filterDoesNotMutateRequestSpec` — companion: post-filter spec carries originals (subsumes the legacy try/finally invariant which is now vacuous).
- `streamOutputContainsMaskedFormNotLiteralCredential` — prong (b) at unit-test layer; masked form present in stream output, literal credential middle absent.

`CapturingFilterContext` records header values BY VALUE at ctx.next time (via `req.getHeaders().forEach(...)` into a `Map<String, String>`) — NOT by-reference. **Critical**: an initial draft of the test stored the FilterableRequestSpecification ref and read header values at assertion time; with the legacy filter this passed because the try/finally had restored originals before assertion. Snapshot-by-value at ctx.next call time is the only structurally-sound pattern; documented in the field javadoc to prevent future regressions.

**VerifyMaskingRequestLoggingFilter audit** (Pat's S-06-03 finer-granularity DoD):
- DELETED `filter_restoresOriginalAuthorizationHeaderAfterMaskedSuperFilterCall` — verified try/finally semantics that approach (i) eliminates; testing non-existent code under the new implementation.
- DELETED `filter_restoresOriginalApiKeyAndCookieEvenWhenSuperFilterThrows` — same rationale; also eliminated `ThrowingFilterContext` helper (only this test used it).
- RETAINED-AND-RECLASSIFIED `isMasked_authorizationHeaderRecognized` (case-insensitivity), `isMasked_supersetOfCredentialMaskingFilterDefaults`, `isMasked_nonCredentialHeaderNotMasked`, `filter_streamOutputContainsMaskedFormNotLiteralCredential` (mask format), `filter_apiKeyMaskedInStreamOutput` (mask format), `constructor_nullHeaderSetThrows` — all add explicit "wiring-only — does NOT prove wire-side credential integrity" caveat in class javadoc + cross-reference to VerifyWireRestoresOriginalCredential.

**Bundled bash fixes**:
- `scripts/smoke-test.sh` — added `docker logs "$CONTAINER_NAME" > "$LOG_FILE" 2>&1 || true` IMMEDIATELY after the TestNG-stats parse and BEFORE the `total=0` / `failed>0` `die()` triggers (which call `cleanup_silent` and tear down the container). Pre-Sprint-6 the log was empty post-die because the container was already removed. Step 8 still does a refresh capture for any post-parse log lines. Capture is non-fatal (`|| true`).
- `scripts/credential-leak-e2e-test.sh` — prong (b) grep target expanded to include `$STUB_LOGFILE` (CONCERN-2 from Sprint 5 Raze). Now sums hits across container.log + testng-results.xml + smoke.log + stub-iut.log; any one ≥1 satisfies the prong.

**TDD evidence**: with the legacy filter (Sprint 3 implementation), `wireCarriesOriginalAuthorizationCredential` FAILed: `expected:<Bear[er ABCDEFGH12345678]WXYZ> but was:<Bear[***]WXYZ>`. With approach (i), all 4 wire-side @Tests PASS. This proves the snapshot-at-ctx.next test pattern actually catches the GAP-1' bug — closing the META-GAP-1 concern that the existing 16 wiring tests could PASS while the wire was poisoned.

**mvn test result**: 78 → 80 / 0 failures / 0 errors / 3 skipped. BUILD SUCCESS. (+4 VerifyWireRestoresOriginalCredential tests; -2 try/finally tests deleted from VerifyMaskingRequestLoggingFilter.)

**Live execution deferred**: per Sprint 5 Run 2 deferral precedent, Generator does NOT run the credential-leak three-fold cross-check (`scripts/credential-leak-e2e-test.sh`) — that's Quinn's gate-time closure-proof live-exec. Generator does NOT run sabotage-test.sh --target=systemfeatures cascade verification — that's Raze's gate-time adversarial sabotage live-exec.

**Risk note**: approach (i) bypasses `super.filter()`. If REST-Assured is upgraded past 5.5.x and the parent's filter() method gains additional behavior between log emission and `ctx.next` (e.g. retry logic, response caching, interceptor chaining), the bypass MUST be re-evaluated. TODO comment added to the javadoc.
