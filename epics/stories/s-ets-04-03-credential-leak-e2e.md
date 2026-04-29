# Story: S-ETS-04-03 — Deeper E2E credential-leak smoke (S-ETS-03-02 PARTIAL → PASS at IUT-auth layer)

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-04
**Priority**: P1 — Sprint 3 PARTIAL closure: deeper E2E IUT-auth wiring deferred to Sprint 4 per Dana verdict + Quinn CONCERN-1
**Estimated Complexity**: M
**Status**: Active (Sprint 4)

## Description

Sprint 3 S-ETS-03-02 closed `credential_leak_integration_test_green` at the unit-test integration layer (8/8 VerifyMaskingRequestLoggingFilter @Tests + grep mvn output + grep surefire XML for literal credential body, all zero hits) but explicitly deferred the deeper E2E vision: synthetic auth-credential flowing through REST-Assured against an authenticated IUT at smoke time, with grep against ops/test-results/ XML AND container catalina.out for the literal substring (zero hits) AND for the masked form (>=1 hit, proving filter ran rather than dropping the field entirely).

Quinn cumulative CONCERN-1 explicitly identified Sprint 4 as the path to close this gap. Raze cumulative CONCERN-2 corroborated.

Sprint 4 wires `auth-credential` CTL/TestNG suite parameter end-to-end in `scripts/smoke-test.sh` (or new `scripts/credential-leak-e2e-test.sh`). Architect ratifies the IUT path per Sprint 4 contract `deferred_to_architect` item 3:

**Path A (Pat recommends)** — **Stub IUT in /tmp/** per Sprint 3 sabotage-script pattern: spin up a Python http.server (or equivalent) bound to 0.0.0.0 on ephemeral OS-assigned port, configured to require Bearer auth. Hermetic; reproducible in CI; defense-in-depth same as ADR-010 dual-pattern (~30 LOC bash). Composable with S-ETS-04-04 sabotage-script bug fixes (stub bind 0.0.0.0 + docker --add-host).

**Path B** — Pivot to a different IUT that requires auth (e.g., a GeoRobotix-with-auth endpoint if one exists, or another OSH deployment). Higher real-world signal; lower hermeticity (depends on external IUT availability + the IUT honoring auth).

**Path C** — Extended unit-layer verification (more VerifyMaskingRequestLoggingFilter @Tests covering REST-Assured RequestLoggingFilter activation paths). Falls back if Path A and Path B both prove infeasible. Closer to Sprint 3 outcome but with explicit "infrastructure unavailable" deferral.

## Acceptance Criteria

- [ ] `auth-credential` CTL/TestNG suite parameter wired end-to-end through `scripts/smoke-test.sh` (or new dedicated script)
- [ ] E2E smoke executes against Path A (stub IUT) OR Path B (alt IUT) per Architect's ratification
- [ ] Synthetic auth-credential `Bearer ABCDEFGH12345678WXYZ` flows through REST-Assured to the IUT
- [ ] `grep -r 'EFGH12345678WXYZ' ets-ogcapi-connectedsystems10/ops/test-results/` returns ZERO hits
- [ ] `docker logs <container> 2>&1 | grep 'EFGH12345678WXYZ'` returns ZERO hits
- [ ] `grep -rE 'Bear\*\*\*WXYZ' ets-ogcapi-connectedsystems10/ops/test-results/` returns at least one hit (proves filter ran, didn't drop the field)
- [ ] Sprint 4 close artifact at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-04-credential-leak-e2e-<date>.txt` records grep evidence
- [ ] SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-E2E-001 PASSES

## Spec References

- REQ-ETS-CLEANUP-006 (modified) — extended from unit-layer to IUT-auth-layer
- REQ-ETS-CLEANUP-011 (NEW) — Deeper E2E credential-leak smoke at IUT-auth layer
- REQ-ETS-CLEANUP-003 (modified) — extended with E2E IUT-auth wiring

## Technical Notes

- Path A (stub IUT) requires S-ETS-04-04 sabotage-script bug fixes (stub bind 0.0.0.0 + docker `--add-host=host.docker.internal:host-gateway`) as prerequisites. Sequence S-ETS-04-04 BEFORE S-ETS-04-03 if Architect picks Path A.
- Path B may pivot to a stub if no authenticated IUT is available. Architect surfaces fallback at ratification.
- Closes design.md §529 deferral text fully on Path A or Path B success.

## Dependencies

- Architect ratification of stub vs alternative-IUT path
- If Path A: depends on S-ETS-04-04 sabotage-script bug fixes

## Definition of Done

- [ ] E2E smoke produces zero-hit grep on literal credential AND >=1-hit grep on masked form
- [ ] Spec implementation status updated
- [ ] Sprint 4 close artifact archived
- [ ] design.md §529 deferral text REMOVED (closure)
