# Story: S-ETS-05-01 — GAP-1 wedge fix: wire SMOKE_AUTH_CREDENTIAL through smoke-test.sh → CTL → Java → REST-Assured header

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-05
**Priority**: P0 — GAP-1 cross-corroborated HIGH gap; closes S-ETS-04-03 PARTIAL
**Estimated Complexity**: M
**Status**: Active (Sprint 5)

## Description

Sprint 4 GAP-1 (cross-corroborated by Quinn 0.84 + Raze 0.84): `scripts/smoke-test.sh` has ZERO
references to `SMOKE_AUTH_CREDENTIAL`, `auth-credential`, or `Authorization`. The synthetic
credential set in `scripts/credential-leak-e2e-test.sh:118` is silently dropped when smoke-test.sh
runs as a child process. The MaskingRequestLoggingFilter is never exercised; the stub-IUT log shows
11 inbound requests ALL with `Authorization=<absent>`.

This story wires the missing plumbing so `SMOKE_AUTH_CREDENTIAL` flows end-to-end:

```
SMOKE_AUTH_CREDENTIAL (env) → smoke-test.sh (bash curl POST --data-urlencode)
  → TeamEngine CTL suite param `auth-credential`
  → Java SuiteFixtureListener reads suite param
  → CommonFixture or new AuthFixture injects into REST-Assured RequestSpec
  → MaskingRequestLoggingFilter intercepts the outgoing request log
  → masked form (Bear***WXYZ) appears in log; unmasked credential never in artifacts
```

Fix size: ~5 LOC bash (smoke-test.sh) + ~30-50 LOC Java (fixture reading param + injecting into
RequestSpec) + ~10-15 LOC Java unit test (VerifyAuthCredentialPropagation).

## Acceptance Criteria

- [ ] `grep -nE 'SMOKE_AUTH_CREDENTIAL|auth-credential' scripts/smoke-test.sh` returns non-empty
      (proves the wiring landed in code, not just in the wrapper script)
- [ ] `scripts/credential-leak-e2e-test.sh` runs end-to-end and produces three-fold verdict:
  - (a) `grep -r 'EFGH12345678WXYZ' $SMOKE_OUTPUT_DIR` returns ZERO hits
  - (b) `grep -rE 'Bear\*\*\*WXYZ' $SMOKE_OUTPUT_DIR` returns AT LEAST ONE hit
  - (c) stub-IUT log shows AT LEAST ONE request with `Authorization: Bearer ABCDEFGH12345678WXYZ`
        (proves the wire carried the credential to the IUT)
- [ ] New unit test `VerifyAuthCredentialPropagation.java` covers: SMOKE_AUTH_CREDENTIAL reads
      correctly; param passed to TestNG suite; REST-Assured RequestSpec includes Authorization header
- [ ] `mvn clean install` BUILD SUCCESS (surefire 64+N/0/0/3, where N is new unit tests)
- [ ] Smoke 26/26 PASS preserved after wiring changes (regression check)
- [ ] SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-WIRING-001 and SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-THREE-FOLD-001 PASS

## Spec References

- REQ-ETS-CLEANUP-013 (new — SMOKE_AUTH_CREDENTIAL wiring)
- REQ-ETS-CLEANUP-011 (modified — re-opened from PARTIAL to IMPLEMENTED when this wiring fix lands)
- REQ-ETS-CLEANUP-006 (closes final deferral: deeper E2E at IUT-auth layer)

## Technical Notes

**Implementation path** (Generator must read each layer before editing):

1. **CTL file** (`src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl`): Verify that
   `auth-credential` is already declared as a `ctl:form-param`. Per REQ-ETS-TEAMENGINE-002, the
   CTL wrapper already accepts `auth-credential`. If absent, add it as an optional param with
   default empty-string.

2. **smoke-test.sh**: In the `curl POST /suite/.../run` call, add:
   ```bash
   if [ -n "${SMOKE_AUTH_CREDENTIAL:-}" ]; then
     AUTH_PARAM="--data-urlencode auth-credential=${SMOKE_AUTH_CREDENTIAL}"
   fi
   curl ... $AUTH_PARAM ...
   ```
   ~5 LOC. The env var name matches what credential-leak-e2e-test.sh already sets.

3. **Java layer** (read SuiteFixtureListener.java and CommonFixture.java first):
   - If SuiteFixtureListener already reads `auth-credential` suite param and stores it
     in suite context, add the REST-Assured RequestSpec injection there or in CommonFixture.
   - If not present: add `String authCredential = suiteContext.getSuite().getParameter("auth-credential")`
     and inject into RequestSpec as `header("Authorization", authCredential)` ONLY when
     authCredential is non-null/non-empty. The MaskingRequestLoggingFilter is already wired
     to the RequestSpec (Sprint 3); it will intercept this header.

4. **Unit test** `VerifyAuthCredentialPropagation.java`:
   - Test 1: smoke-test.sh includes auth-credential in curl POST when SMOKE_AUTH_CREDENTIAL set
     (bash-level; use test fixture or parse script directly)
   - Test 2: SuiteFixtureListener correctly reads auth-credential param from TestNG suite context
   - Test 3: RequestSpec includes Authorization header when auth-credential is set

**Stub IUT pre-condition**: `scripts/stub-iut.sh` (from Sprint 4 S-ETS-04-03) must be running
on 0.0.0.0 (already fixed in Sprint 4 S-ETS-04-04); `scripts/smoke-test.sh` uses
`--add-host=host.docker.internal:host-gateway` (also already fixed). Both prerequisites are in
place at Sprint 5 start.

**Do NOT break the no-credential case**: When `SMOKE_AUTH_CREDENTIAL` is unset, smoke-test.sh
must behave identically to Sprint 4 close (no auth header injected; all existing smoke tests pass).

## Dependencies

- Sprint 4 S-ETS-04-04 bug fixes already in place (stub bind 0.0.0.0 + --add-host)
- Sprint 4 S-ETS-04-03 artifacts (stub-iut.sh + credential-leak-e2e-test.sh) already in place

## Definition of Done

- [ ] All three-fold cross-check SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-* PASS
- [ ] VerifyAuthCredentialPropagation unit test PASS
- [ ] Smoke 26/26 PASS preserved (no regression)
- [ ] Spec implementation status updated: REQ-ETS-CLEANUP-013 SPECIFIED+IMPLEMENTED; REQ-ETS-CLEANUP-011 IMPLEMENTED
- [ ] Artifact: `ops/test-results/sprint-ets-05-01-credential-leak-full-<date>.txt` (three-fold live-exec evidence)

## Implementation Notes (Sprint 5 — to be filled by Dana Generator)

_[Generator fills this section during Sprint 5 implementation]_
