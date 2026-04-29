# S-ETS-03-02: CredentialMaskingFilter integration test + REST-Assured RequestLoggingFilter wrap

> Status: Active — Sprint 3 | Epic: ETS-04 | Priority: P0 | Complexity: M | Last updated: 2026-04-29

## Description
Close two related credential-leak surfaces deferred from Sprint 2:

**(1) Integration test** (Sprint 2 PARTIAL `no_credential_leak_in_test_logs`): Sprint 2 verified the 15-test unit-test layer with substantive leak guards (literal `EFGH12345678WXYZ` not in masked output). End-to-end smoke claim from SCENARIO-ETS-CLEANUP-LOGBACK-MASKING-001 ("literal substring MUST NOT appear anywhere in TestNG report attachments + container logs") was NEVER live-verified because the suite did not yet wire `auth-credential` as a CTL/TestNG suite parameter — no synthetic credential flowed through REST-Assured at smoke time → no end-to-end check possible.

**(2) REST-Assured RequestLoggingFilter wrap** (Raze cleanup CONCERN-2 + design.md §529 deferral): Current CredentialMaskingFilter emits a parallel FINE-level masked log but does NOT wrap REST-Assured's built-in `RequestLoggingFilter`. design.md §529 explicitly flags this as Sprint 3 hardening: "wrap or replace REST-Assured's RequestLoggingFilter with a masking variant so the unmasked side channel is closed." If any future test class adds RequestLoggingFilter, the unmasked Authorization header surfaces in the request log — defeating the masking entirely.

Sprint 3 implementation: (a) wire `auth-credential` as a CTL parameter + TestNG suite parameter; (b) extend CredentialMaskingFilter (or subclass `MaskingRequestLoggingFilter extends RequestLoggingFilter`) per Architect's ratified pattern; (c) add integration smoke that sets `auth-credential=Bearer ABCDEFGH12345678WXYZ` and grep-asserts zero leaks of the literal middle in BOTH TestNG XML attachments AND container logs.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CLEANUP-006 (NEW — CredentialMaskingFilter integration test + REST-Assured RequestLoggingFilter wrap), REQ-ETS-CLEANUP-003 (modified — extends Sprint 2 logback+filter scope with the wrap)
- Scenarios: SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-INTEGRATION-001 (CRITICAL — closes Sprint 2 PARTIAL), SCENARIO-ETS-CLEANUP-REST-ASSURED-LOGGING-WRAPPED-001 (NORMAL — closes Raze cleanup CONCERN-2)

## Acceptance Criteria
- [ ] Architect ratifies REST-Assured RequestLoggingFilter wrap pattern: subclass `MaskingRequestLoggingFilter` (recommended) OR chained-filter-with-registration-order OR replace-RequestLoggingFilter-entirely — see Sprint 3 contract `deferred_to_architect` item 2
- [ ] CTL wrapper at `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl` accepts new `auth-credential` parameter (REST-Assured-friendly form: full credential value including any `Bearer ` prefix; passed to TestNG suite as `auth-credential`)
- [ ] testng.xml exposes `auth-credential` as a TestNG suite parameter (default: empty string for unauth IUTs)
- [ ] SuiteFixtureListener.onStart() reads `auth-credential` and registers it via REST-Assured's auth-config (for synthetic-credential smoke testing only — production use would replace this with proper bearer/api-key handling per REQ-ETS-TEAMENGINE-002 future work)
- [ ] Architect's ratified wrap pattern implemented; CredentialMaskingFilter (or MaskingRequestLoggingFilter) intercepts BOTH the parallel FINE log AND REST-Assured's RequestLoggingFilter output (verify: enable RequestLoggingFilter explicitly, send a request with synthetic auth, observe the request-log line shows `Bear***WXYZ` not `Bearer ABCDEFGH12345678WXYZ`)
- [ ] Integration smoke: scripts/smoke-test.sh modified to accept `--auth-credential <value>` flag (or env var `AUTH_CREDENTIAL`); runs full smoke against GeoRobotix with `auth-credential=Bearer ABCDEFGH12345678WXYZ`; archives TestNG XML AND container logs
- [ ] Grep verification: literal `EFGH12345678WXYZ` returns ZERO hits in TestNG report XML attachments AND container logs; masked form `Bear***WXYZ` (or whatever the masking semantics produce) DOES appear at least once (proves filter ran rather than dropping the field)
- [ ] mvn clean install green: surefire 49+M (where M is +5-10 from new VerifyMaskingRequestLoggingFilter unit tests)
- [ ] Smoke 12+6+N PASS preserved with NO auth-credential set (sentinel: integration test wiring must not break baseline)
- [ ] Reproducible build preserved
- [ ] design.md §529 amendment: drop Sprint 3 deferral language; document the wrap pattern; remove the "unmasked side channel" caveat
- [ ] REQ-ETS-CLEANUP-006 status updated PLACEHOLDER → IMPLEMENTED in spec.md
- [ ] Both SCENARIOs PASS: SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-INTEGRATION-001 + SCENARIO-ETS-CLEANUP-REST-ASSURED-LOGGING-WRAPPED-001

## Tasks
1. Architect ratifies wrap pattern (subclass / chained-filter / replace) — see Sprint 3 contract
2. Generator implements ratified pattern — extends `CredentialMaskingFilter.java` OR creates `MaskingRequestLoggingFilter.java`
3. Generator writes `VerifyMaskingRequestLoggingFilter.java` unit tests covering the wrap + the leak guard
4. Generator wires `auth-credential` as CTL parameter + TestNG suite parameter
5. Generator extends scripts/smoke-test.sh with `--auth-credential` flag (or env var)
6. Generator runs smoke with synthetic `Bearer ABCDEFGH12345678WXYZ` against GeoRobotix
7. Generator greps TestNG XML + container log for `EFGH12345678WXYZ` (zero hits required) AND `Bear***WXYZ` (at least one hit required)
8. Generator updates design.md §529 to drop Sprint 3 deferral language
9. Update spec.md REQ-ETS-CLEANUP-006 PLACEHOLDER → IMPLEMENTED + REQ-ETS-CLEANUP-003 modified description
10. Update _bmad/traceability.md with REQ-ETS-CLEANUP-006 row

## Dependencies
- Depends on: Architect ratification of wrap pattern
- Provides foundation for: Future auth-protected IUT testing (Sprint 4+ when Subsystems / Procedures need IUTs that aren't open like GeoRobotix)

## Implementation Notes

### Wrap pattern reference — REST-Assured public API

`io.restassured.filter.log.RequestLoggingFilter` is non-final, public, and Pat verified that `print()` (or the package-private `applyRelaxedHTTPSValidation()` family) can be overridden. Subclass approach:

```java
public class MaskingRequestLoggingFilter extends RequestLoggingFilter {
  private final CredentialMaskingFilter masker;

  @Override
  public Response filter(FilterableRequestSpecification reqSpec,
                         FilterableResponseSpecification respSpec,
                         FilterContext ctx) {
    // Mutate reqSpec.headers to mask BEFORE the parent filter logs them
    reqSpec.headers().asList().forEach(h -> {
      if (masker.isSensitive(h.getName())) {
        reqSpec.replaceHeader(h.getName(), masker.maskValue(h.getValue()));
      }
    });
    Response r = super.filter(reqSpec, respSpec, ctx);
    // Restore original headers (mutating in-flight breaks auth) — but the log already captured the masked form
    return r;
  }
}
```

Architect ratifies whether this approach is correct (the in-place mutate-then-restore pattern may have race conditions in concurrent test runs); if not, picks chained-filter or replace approach. See Sprint 3 contract `deferred_to_architect` item 2.

### Integration smoke grep verification
```bash
# After smoke runs:
grep -r 'EFGH12345678WXYZ' ets-ogcapi-connectedsystems10/ops/test-results/   # MUST be empty
grep -r 'EFGH12345678WXYZ' ~/.docker-volumes/teamengine/logs/                # MUST be empty (or wherever container logs)
grep -r 'Bear\*\*\*WXYZ\|Bearer.*\*\*\*' ets-ogcapi-connectedsystems10/ops/test-results/   # MUST have at least one hit
```

### Estimated effort
2-4 hours Generator wall-clock. Architect's wrap-pattern choice drives complexity:
- Subclass approach: ~2h (clean, well-trodden)
- Chained filter: ~3h (registration-order edge cases)
- Replace approach: ~4h (most invasive)

Plus 1h for `auth-credential` CTL wiring + smoke-test.sh integration + grep evidence collection.

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Synthetic auth-credential flows through smoke without literal-middle leak in either log surface
- [ ] design.md §529 amendment landed (Sprint 3 deferral language dropped)
- [ ] Smoke 12+6+N PASS preserved with NO auth-credential set
- [ ] Spec implementation status updated (REQ-ETS-CLEANUP-006 IMPLEMENTED, traceability.md row Active → Implemented)
- [ ] Story status set to Done in this file and in `epic-ets-04-teamengine-integration.md`
- [ ] Sprint 3 contract success_criteria `credential_leak_integration_test_green: true` AND `rest_assured_logging_filter_wrapped: true` met
