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
| S-ETS-02-05 | (Sprint 2) Multi-stage Dockerfile + non-root USER + tighter `/rest/suites/<code>` parse + CI workflow `git mv` | Active (Sprint 2) | REQ-ETS-TEAMENGINE-003, REQ-ETS-TEAMENGINE-005, REQ-ETS-CLEANUP-004 |
| S-ETS-04-01 | (placeholder) docker-compose stack with healthchecks (extended beyond Sprint 1 baseline) | Backlog | REQ-ETS-TEAMENGINE-004 |
| S-ETS-04-02 | (placeholder) CTL wrapper supports auth-type parameters end-to-end | Backlog | REQ-ETS-TEAMENGINE-002 |
| S-ETS-04-03 | (placeholder) TeamEngine integration regression suite (CI) | Backlog | NFR-ETS-04 |

## Acceptance Criteria
- [ ] ETS jar registers with TeamEngine 5.6.x (currently 5.6.1) via SPI without errors
- [ ] CTL wrapper exposes `iut-url` + auth parameters in TeamEngine UI
- [ ] Dockerfile produces a working image extending `ogccite/teamengine-production:5.6.1`
- [ ] `docker-compose up` brings the stack up at http://localhost:8081/teamengine/
- [ ] Smoke test against GeoRobotix produces a non-empty TestNG report with zero suite-registration errors
