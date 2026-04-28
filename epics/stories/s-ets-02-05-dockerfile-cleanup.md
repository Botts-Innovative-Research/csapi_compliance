# S-ETS-02-05: Multi-stage Dockerfile + non-root USER + tighter `/rest/suites/<code>` parse + CI workflow `git mv`

> Status: Active — Sprint 2 | Epic: ETS-04 | Priority: P1 | Complexity: M | Last updated: 2026-04-28

## Description
Bundles three Raze s03 follow-ups + the long-deferred CI workflow `git mv`:

1. **Multi-stage Dockerfile** (Raze s03 CONCERN-2 + CONCERN-3): bake `mvn dependency:copy-dependencies` deps closure into the build stage (eliminates the smoke-time mvn dependency on host `~/.m2` that Raze flagged as a fresh-CI brittleness); add USER directive (non-root); image-size goal: 600MB → 400MB. Architect ratifies the multi-stage pattern (one of three options listed in Sprint 2 contract `deferred_to_architect` item 4).

2. **Tighter `/rest/suites/<code>` metadata parse** (Raze s03 CONCERN-4): `scripts/smoke-test.sh` step 5 currently only `grep -q '<etscode>${ETS_CODE}</etscode>'`; tighter check parses the metadata XML and asserts `version` matches `project.version`, `title` matches `project.name`, `code` matches ets-code per ets.properties. ~10 LOC.

3. **CI workflow `git mv`** (Quinn s01 + Raze s01 CONCERN-2 + Quinn s02 + Quinn s03 deferred across 3 sprints): one-line move of `ci/github-workflows-build.yml` → `.github/workflows/build.yml` so GitHub Actions actually runs it on push. Requires `gh auth refresh -s workflow` from a session with that scope. **USER ACTION may be needed**: orchestrator should run `gh auth refresh -s workflow` at sprint start; if scope still cannot be granted, this sub-task closes with explicit deferral note (Sprint 2 success_criterion `ci_workflow_live` then converges to a Sprint 3+ carryover with documented rationale).

This story depends on S-ETS-02-01 (ADR-007 lands first so the multi-stage decision has an ADR row to cite).

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-TEAMENGINE-003 (modified — multi-stage Dockerfile pattern), REQ-ETS-TEAMENGINE-005 (modified — tighter smoke-test metadata check), REQ-ETS-CLEANUP-004 (NEW — Dockerfile multi-stage + non-root USER)
- Scenarios: SCENARIO-ETS-CLEANUP-DOCKERFILE-MULTISTAGE-001 (NORMAL), SCENARIO-ETS-CLEANUP-CI-WORKFLOW-LIVE-001 (NORMAL), SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 (CRITICAL)

## Acceptance Criteria
### Sub-task A: Multi-stage Dockerfile
- [ ] Dockerfile has `FROM ... AS build` stage that resolves all Maven dependencies inside the container (no host `~/.m2` dependency at runtime)
- [ ] Dockerfile has `FROM tomcat:8.5-jre17` runtime stage that `COPY --from=build` only the runtime artifacts (no build tools)
- [ ] Dockerfile has `USER tomcat` (or equivalent non-root UID) directive before `CMD`
- [ ] `docker build .` succeeds in a tempdir with NO ~/.m2 mount/cache available (fresh-CI simulation)
- [ ] Final image size < 450MB (target 400MB; soft threshold 450MB)
- [ ] Container runs as non-root (verified via `docker run ... id` showing non-zero UID)

### Sub-task B: Tighter smoke-test.sh
- [ ] scripts/smoke-test.sh step 5 parses `/rest/suites/<ets-code>` XML and asserts: `version` element matches `${PROJECT_VERSION}` (passed via env or extracted from pom.xml), `title` element matches `${PROJECT_NAME}`, `code` element matches `${ETS_CODE}`
- [ ] Adversarial spot-check: temporarily inject a wrong `<version>` into the suite metadata response (mock or via local override) — verify smoke-test.sh fails fast with a clear FATAL message

### Sub-task C: CI workflow live
- [ ] `gh auth refresh -s workflow` succeeded OR is documented as still-blocked
- [ ] If unblocked: `git mv ci/github-workflows-build.yml .github/workflows/build.yml` committed; `git push` succeeds
- [ ] If unblocked: GitHub Actions UI shows at least one workflow_run on a Sprint 2 commit with status SUCCESS
- [ ] If still blocked: ops/status.md documents the carryover with clear rationale; Sprint 2 success_criterion `ci_workflow_live` flagged as deferred-with-rationale

### Sub-task D: Integration
- [ ] mvn clean install green
- [ ] scripts/smoke-test.sh STILL exits 0 with 12/12 PASS against GeoRobotix (multi-stage Dockerfile + tighter smoke-test must not regress the smoke pipeline)
- [ ] Reproducible build preserved
- [ ] SCENARIO-ETS-CLEANUP-DOCKERFILE-MULTISTAGE-001 passes
- [ ] SCENARIO-ETS-CLEANUP-CI-WORKFLOW-LIVE-001 passes (or deferred-with-rationale)
- [ ] SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 passes

## Tasks
1. Architect ratifies the multi-stage Dockerfile pattern (deferred — see Sprint 2 contract)
2. Generator rewrites Dockerfile per Architect's pattern (commit 1)
3. Generator runs smoke-test.sh — verify 12/12 PASS preserved
4. Generator runs `docker build` in a tempdir without ~/.m2 — verify build succeeds (proves multi-stage actually eliminated host dep)
5. Generator extends smoke-test.sh step 5 with tighter metadata parse (commit 2)
6. Generator runs adversarial spot-check on the new metadata parse (Sub-task B last bullet)
7. Generator (or orchestrator if scope-blocked): `gh auth refresh -s workflow` then `git mv` the CI workflow (commit 3 if successful)
8. Generator triggers a workflow_dispatch run + archives the workflow_run URL to ops/status.md
9. Update spec.md Implementation Status to reflect REQ-ETS-TEAMENGINE-003/005 amendments + REQ-ETS-CLEANUP-004 closure

## Dependencies
- Depends on: S-ETS-02-01 (ADR-007 should land first to formalize the Dockerfile assembly strategy)
- Provides foundation for: future Part 1 sprints that need fresh-CI builds (S-ETS-02-06 onwards)

## Implementation Notes
<!-- Fill after implementation -->
- **Multi-stage pattern options** (Architect picks one):
  - (a) `FROM maven:3.9-eclipse-temurin-17 AS build` + `--mount=type=cache,target=/root/.m2 mvn dependency:resolve` + `COPY src` + `mvn package`. Cleanest end-to-end; ~30-60s cold builds.
  - (b) Build-stage uses pre-staged `target/lib-runtime/` (current approach, just split across stages). Doesn't fix host `~/.m2` dependency.
  - (c) Build-stage `mvn dependency:copy-dependencies` with cache mount; runtime-stage `COPY --from=build target/lib-runtime/`. Hybrid; eliminates host dep but doesn't bake full mvn into image.
- **CI workflow scope**: if `gh auth refresh -s workflow` fails (e.g. user is on read-only token), Generator MUST NOT try to work around with shell tricks; document the blocker and continue
- **Smoke metadata parse implementation**: bash with `xmllint --xpath` (TE container has libxml2-utils) is cleanest; fall back to grep+sed if xmllint unavailable
- **Deviations**: TBD

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Smoke 12/12 PASS preserved through all 3 sub-tasks
- [ ] CI workflow live OR deferred-with-rationale documented
- [ ] Spec implementation status updated
- [ ] Story status set to Done in this file and in `epic-ets-04-teamengine-integration.md`
- [ ] Sprint 2 contract evaluation criteria met
