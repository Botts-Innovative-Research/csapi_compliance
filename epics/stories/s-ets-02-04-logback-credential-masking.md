# S-ETS-02-04: Add logback.xml + CredentialMaskingFilter (REST-Assured request filter) wired via SuiteFixtureListener

> Status: Active — Sprint 2 | Epic: ETS-04 | Priority: P1 | Complexity: M | Last updated: 2026-04-28

## Description
Close architect-handoff `should` constraint #3 ("Use logback.xml configured to NEVER log Authorization or X-API-Key headers; CredentialMaskingFilter pattern equivalent to v1.0's CredentialMasker"). Sprint 1 didn't exercise auth (GeoRobotix is open IUT) so this stayed deferred-without-blocker, but Sprint 2 onwards needs it because:

1. **Audit safety as Part 1 expands**: Sprint 2's SystemFeatures (S-ETS-02-06) and Sprint 3+ classes (Subsystems, CRUD, Update) increasingly target IUTs that are auth-protected. ANY accidental Authorization-header logging once auth is wired becomes an audit incident.
2. **Cleanest moment is BEFORE auth-bearing assertions land**: rather than retrofit masking onto a suite that already has auth flowing, land the filter while the only IUT exercised is open (GeoRobotix) — the filter itself can be unit-tested independently and integration-tested with a synthetic Authorization header.
3. **v1.0 reference pattern exists**: `csapi_compliance/src/lib/credential-masker.ts` shows the masking semantics (first 4 + last 4 chars; full redaction below 8 chars).

Raze s02 CONCERN-3 explicitly flagged this for Sprint 2 scope.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CLEANUP-003 (NEW — logback.xml + CredentialMaskingFilter), NFR-ETS-08 (Credential masker unit tests), NFR-ETS-10 (slf4j + logback structured logging)
- Scenarios: SCENARIO-ETS-CLEANUP-LOGBACK-MASKING-001 (NORMAL — Authorization or X-API-Key headers in REST-Assured logging are masked)

## Acceptance Criteria
- [ ] `src/main/resources/logback.xml` exists with a `<configuration>` block that excludes `Authorization`, `X-API-Key`, `Cookie`, `Set-Cookie` headers from log output (via `<pattern>` filter or via the CredentialMaskingFilter forwarding to logback)
- [ ] New REST-Assured Filter class `CredentialMaskingFilter` (proposed package `org.opengis.cite.ogcapiconnectedsystems10.listener` or `.util` — Architect ratifies in next handoff) implements the masking semantics: first 4 + last 4 chars visible, middle replaced with `...`; full redaction (`***`) when credential is < 8 chars
- [ ] CredentialMaskingFilter wired into the REST-Assured baseline config via `SuiteFixtureListener` (or wherever REST-Assured filters are currently registered — verify by reading existing SuiteFixtureListener code)
- [ ] Unit tests under `src/test/java/.../VerifyCredentialMaskingFilter.java` cover: (a) Bearer token of 24+ chars masked correctly, (b) API key of 16+ chars masked correctly, (c) credential of < 8 chars fully redacted, (d) non-credential header (e.g. `Content-Type`) passed through unchanged
- [ ] mvn clean install green
- [ ] scripts/smoke-test.sh STILL exits 0 with 12/12 PASS against GeoRobotix (no auth exercised but filter must not break the existing flow)
- [ ] Credential-leak integration test: smoke-test.sh run with `auth-credential=Bearer ABCDEFGH12345678WXYZ` (synthetic) — grep TestNG report attachments + container log for the literal substring `EFGH12345678WXYZ` (would-be-unmasked middle); ZERO hits required
- [ ] SCENARIO-ETS-CLEANUP-LOGBACK-MASKING-001 passes

## Tasks
1. Generator reads `csapi_compliance/src/lib/credential-masker.ts` to understand v1.0 masking semantics + edge cases
2. Generator reads existing `SuiteFixtureListener.java` to find where REST-Assured filters are currently registered
3. Generator writes CredentialMaskingFilter.java with masking logic
4. Generator writes VerifyCredentialMaskingFilter.java unit tests
5. Generator writes logback.xml with appropriate `<pattern>` and any logback-classic encoder config
6. Generator wires CredentialMaskingFilter into SuiteFixtureListener (or wherever appropriate)
7. Run smoke-test.sh — verify 12/12 PASS preserved
8. Run credential-leak integration test (Acceptance Criterion last bullet) — archive grep evidence to ops/test-results/
9. Update spec.md Implementation Status to reflect REQ-ETS-CLEANUP-003 closure

## Dependencies
- Depends on: (no story-level deps; can begin in parallel with S-ETS-02-01, S-ETS-02-02, S-ETS-02-03)
- Provides foundation for: S-ETS-02-06 (SystemFeatures may exercise restricted-system fixtures requiring auth in real deployments — having masking ready avoids retrofit cost), and Sprint 3+ classes that exercise CRUD/Update against auth-protected IUTs

## Implementation Notes
<!-- Fill after implementation -->
- **Reference for masking semantics**: `csapi_compliance/src/lib/credential-masker.ts` — port logic verbatim; preserve edge cases (empty string, null, < 8 chars)
- **Reference for REST-Assured Filter pattern**: search existing `ReusableEntityFilter` in `listener/` subpackage — it implements `io.restassured.filter.Filter` interface
- **Logback configuration approach**: easiest pattern is a logback `<encoder>` with `<pattern>` that excludes header names from MDC; alternatively a `<turboFilter>` that drops log events containing the header names. Architect may have a preferred pattern — flag in Implementation Notes during execution
- **Architect deferred**: whether CredentialMaskingFilter needs its own ADR (Pat's recommendation: yes, because masking semantics carry security-audit weight — Quinn s02 CONCERN-3 implies this)
- **Deviations**: TBD

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Credential-leak integration test passes (zero leak in synthetic auth scenario)
- [ ] Smoke 12/12 PASS preserved
- [ ] Spec implementation status updated
- [ ] Story status set to Done in this file and in `epic-ets-04-teamengine-integration.md`
- [ ] Sprint 2 contract evaluation criteria met
