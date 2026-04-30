# Epic ETS-04: TeamEngine Integration (SPI / CTL / Docker)

> Status: Active — Sprint 1 lands the smoke-test path | Last updated: 2026-04-27

## Goal
Wire the ETS into TeamEngine 5.6.x (currently 5.6.1) via the TestNG SPI, ship a CTL wrapper that exposes the suite to the TeamEngine UI, package the integration in a Dockerfile + docker-compose snippet, and prove the round-trip via a smoke test against GeoRobotix. Owns sub-deliverable 4 of the new ETS capability.

## Dependencies
- Depends on: `epic-ets-01-scaffold` (jar must exist), `epic-ets-02-part1-classes` (Sprint 1's CS API Core suite is the smoke target)
- Blocks: `epic-ets-05-cite-submission` (cannot submit to CITE without a working TeamEngine integration)

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S-ETS-01-03 | (Sprint 1, CLOSED) TeamEngine 5.6.x (currently 5.6.1) Docker smoke test runs CS API Core suite against GeoRobotix | Done (Sprint 1, Quinn 0.91, Raze 0.88) | REQ-ETS-TEAMENGINE-001..005 |
| S-ETS-02-01 | (Sprint 2) ADR-006 (Jersey 1.x → Jakarta EE 9 / Jersey 3.x port) + ADR-007 (Dockerfile base image deviation), retroactive | Active (Sprint 2) | REQ-ETS-SCAFFOLD-006 |
| S-ETS-02-04 | (Sprint 2) Add logback.xml + CredentialMaskingFilter wired via SuiteFixtureListener | Active (Sprint 2) | REQ-ETS-CLEANUP-003, NFR-ETS-08, NFR-ETS-10 |
| S-ETS-02-05 | (Sprint 2, CLOSED) Multi-stage Dockerfile + non-root USER + tighter `/rest/suites/<code>` parse + CI workflow `git mv` | Done (Sprint 2 PARTIAL — image size + CI workflow deferred) | REQ-ETS-TEAMENGINE-003, REQ-ETS-TEAMENGINE-005, REQ-ETS-CLEANUP-004 |
| S-ETS-03-02 | (Sprint 3) CredentialMaskingFilter integration test + REST-Assured RequestLoggingFilter wrap | Active (Sprint 3) | REQ-ETS-CLEANUP-006, REQ-ETS-CLEANUP-003 (modified) |
| S-ETS-03-03 | (Sprint 3) CI workflow `git mv` to `.github/workflows/build.yml` + workflow_dispatch verification | Active (Sprint 3 — USER ACTION required) | REQ-ETS-CLEANUP-007 |
| S-ETS-03-04 | (Sprint 3, CLOSED PARTIAL) Docker image size optimization (Sprint 3 stretch <550MB; closed at 660MB; ADR-009 illustrative table empirically falsified; chown-layer attack identified for Sprint 4) | Done PARTIAL (Sprint 3, Quinn 0.95 / Raze 0.93) | REQ-ETS-CLEANUP-008, REQ-ETS-CLEANUP-004 (modified) |
| S-ETS-04-01 | (Sprint 4) CI workflow `git mv` ESCALATION (5th-sprint-defer-risk; binary close — Path A user-action OR Path B formal drop) | Active (Sprint 4 — USER ACTION required) | REQ-ETS-CLEANUP-007 (modified), REQ-ETS-CLEANUP-009 |
| S-ETS-04-02 | (Sprint 4) Image-size v2: chown-layer attack (target <600MB) + ADR-009 v2 amendment | Active (Sprint 4) | REQ-ETS-CLEANUP-008 (modified), REQ-ETS-CLEANUP-010 |
| S-ETS-04-03 | (Sprint 4) Deeper E2E credential-leak smoke (S-ETS-03-02 PARTIAL → PASS at IUT-auth layer) | Active (Sprint 4) | REQ-ETS-CLEANUP-006 (modified), REQ-ETS-CLEANUP-011, REQ-ETS-CLEANUP-003 (modified) |
| S-ETS-04-04 | (Sprint 4, CLOSED) Sabotage-script bug fixes (stub bind 0.0.0.0 + docker --add-host=host.docker.internal) for hermetic CITE-SC-grade execution | Done (Sprint 4, PASS) | REQ-ETS-CLEANUP-005 (modified), REQ-ETS-CLEANUP-012 |
| S-ETS-05-01 | (Sprint 5) GAP-1 wedge fix: wire SMOKE_AUTH_CREDENTIAL through smoke-test.sh → CTL → Java → REST-Assured header | **PARTIAL / REOPENED** — wiring mechanically correct; filter-ordering defect exposed (MaskingRequestLoggingFilter mutates requestSpec before ctx.next wire-send). Sprint 6 S-ETS-06-01 fixes filter. | REQ-ETS-CLEANUP-013, REQ-ETS-CLEANUP-011 (modified) |
| S-ETS-05-02 | (Sprint 5) Worktree-pollution mitigation v2: SMOKE_OUTPUT_DIR override in smoke-test.sh | Done (Sprint 5, PASS — verified SMOKE_OUTPUT_DIR works in 2 live execs at gate; user worktree clean) | REQ-ETS-CLEANUP-014 |
| S-ETS-05-03 | (Sprint 5) sabotage-test.sh --target=systemfeatures mode (native flag for gate invocation) | **PARTIAL / REOPENED** — flag mechanics correct (injection, pollution-guard, exit codes); Docker build fails on COPY .git missing. Sprint 6 S-ETS-06-02 fixes rsync. | REQ-ETS-CLEANUP-015 |
| S-ETS-05-04 | (Sprint 5) SubsystemsTests javadoc fix (6 not 5 .adoc files) + ADR-010 v3 amendment (cascade VERIFIED LIVE) | Done (Sprint 5, PASS) | REQ-ETS-PART1-003 (minor doc) |
| S-ETS-06-01 | **(Sprint 6 WEDGE)** MaskingRequestLoggingFilter wire-fix: log masked form directly; ctx.next(originalSpec); new VerifyWireRestoresOriginalCredential test; 16 wiring-only tests reclassified; container-log capture timing fix bundled | **Active (Sprint 6)** | REQ-ETS-CLEANUP-016, REQ-ETS-CLEANUP-011 (closes), REQ-ETS-CLEANUP-013 (amended notes) |
| S-ETS-06-02 | **(Sprint 6 WEDGE)** sabotage-test.sh rsync .git include fix (~1-2 LOC) + log message honest-failure detection; enables three-class cascade live-exec verification | **Active (Sprint 6)** | REQ-ETS-CLEANUP-017, REQ-ETS-CLEANUP-015 (promotes to FULLY-IMPLEMENTED) |
| S-ETS-06-03 | **(Sprint 6 WEDGE)** Wire-side unit test reclassification: spec.md + story notes amended; VerifyWireRestoresOriginalCredential companion story | **Active (Sprint 6)** | REQ-ETS-CLEANUP-016 (spec-side) |
| S-ETS-07-05 | (placeholder) docker-compose stack with healthchecks (extended beyond Sprint 1 baseline) | Backlog | REQ-ETS-TEAMENGINE-004 |
| S-ETS-07-06 | (placeholder) CTL wrapper supports auth-type parameters end-to-end | Backlog | REQ-ETS-TEAMENGINE-002 |
| S-ETS-07-07 | (placeholder) TeamEngine integration regression suite (CI) | Backlog | NFR-ETS-04 |

## Acceptance Criteria
- [ ] ETS jar registers with TeamEngine 5.6.x (currently 5.6.1) via SPI without errors
- [ ] CTL wrapper exposes `iut-url` + auth parameters in TeamEngine UI
- [ ] Dockerfile produces a working image extending `ogccite/teamengine-production:5.6.1`
- [ ] `docker-compose up` brings the stack up at http://localhost:8081/teamengine/
- [ ] Smoke test against GeoRobotix produces a non-empty TestNG report with zero suite-registration errors
