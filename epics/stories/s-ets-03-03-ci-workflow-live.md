# S-ETS-03-03: CI workflow `git mv` to `.github/workflows/build.yml` + workflow_dispatch verification

> Status: Active — Sprint 3 | Epic: ETS-04 | Priority: P1 | Complexity: S | Last updated: 2026-04-29

## Description
Close Sprint 2 success_criterion `ci_workflow_live` (DEFERRED-WITH-RATIONALE for 4 sprints — S-ETS-01-01..03 + S-ETS-02-05). Pure user-action blocker: gh token at orchestrator session-time has scopes `gist`, `read:org`, `repo` only — NO `workflow`. Once user runs `gh auth refresh -s workflow`, this story is a one-line `git mv` + push + workflow_dispatch verification.

If user has NOT granted `workflow` scope before Sprint 3 starts, story is Generator-blocked. Mark DEFERRED-WITH-RATIONALE again, push to Sprint 4, AND flag as 4th-sprint-defer escalation per Sprint 3 contract `risks.medium.GH-WORKFLOW-SCOPE-STILL-MISSING-4TH-SPRINT`.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CLEANUP-007 (NEW — CI workflow live at .github/workflows/build.yml), REQ-ETS-SCAFFOLD-005 (modified — reproducible build CI verification now actually runs on push)
- Scenarios: SCENARIO-ETS-CLEANUP-CI-WORKFLOW-LIVE-001 (NORMAL — Sprint 2 carryover; same SCENARIO retained for Sprint 3 closure)

## Acceptance Criteria
- [ ] **Pre-condition (USER ACTION)**: orchestrator runs `gh auth refresh -s workflow` before sprint start; verified by `gh auth status` showing `workflow` in token scopes
- [ ] If pre-condition NOT met: story marked DEFERRED-WITH-RATIONALE; carryover to Sprint 4; flag in ops/status.md as 4th-sprint-defer (consider hard-stop escalation)
- [ ] Generator action (assuming pre-condition met): `cd ets-ogcapi-connectedsystems10 && mkdir -p .github/workflows && git mv ci/github-workflows-build.yml .github/workflows/build.yml && git commit -m "chore(ci): move CI workflow to .github/workflows/" && git push`
- [ ] `.github/workflows/build.yml` exists at HEAD; `ci/github-workflows-build.yml` no longer exists
- [ ] At least one `workflow_run` exists for `.github/workflows/build.yml` (triggered either by the move-commit push OR by an explicit `gh workflow run build.yml` workflow_dispatch)
- [ ] `workflow_run` status is `completed` + conclusion is `success`
- [ ] GitHub Actions run URL captured in `ops/test-results/sprint-ets-03-ci-workflow-live-<date>.txt` (one-line: full URL + run ID + green-build status)
- [ ] REQ-ETS-CLEANUP-007 status updated PLACEHOLDER → IMPLEMENTED in spec.md
- [ ] SCENARIO-ETS-CLEANUP-CI-WORKFLOW-LIVE-001 PASSes

## Tasks
1. **USER ACTION**: orchestrator runs `gh auth refresh -s workflow`
2. Verify scope: `gh auth status` should show `workflow` in token scopes
3. If scope NOT granted: skip remaining tasks; mark Generator-blocked; defer to Sprint 4
4. Generator: `cd ets-ogcapi-connectedsystems10 && mkdir -p .github/workflows && git mv ci/github-workflows-build.yml .github/workflows/build.yml`
5. Generator: review the workflow file content (sanity-check no Sprint-2-era hardcoded paths broke during move); minor edits if needed
6. Generator: `git commit -m "chore(ci): move CI workflow to .github/workflows/" && git push origin main`
7. Generator: trigger workflow_dispatch via `gh workflow run build.yml --ref main` (OR wait for the push-triggered run)
8. Generator: poll `gh run list --workflow=build.yml --limit 5` until conclusion=success
9. Generator: capture run URL + run ID + status into `ops/test-results/sprint-ets-03-ci-workflow-live-<date>.txt`
10. Update spec.md REQ-ETS-CLEANUP-007 PLACEHOLDER → IMPLEMENTED
11. Update _bmad/traceability.md with REQ-ETS-CLEANUP-007 row

## Dependencies
- **Depends on**: USER ACTION (`gh auth refresh -s workflow`); Generator-blocked otherwise
- Provides foundation for: ongoing CI verification (NFR-ETS-02 mvn build green on JDK 17, NFR-ETS-06 cross-platform CI matrix Sprint 4+)

## Implementation Notes

### What's in the workflow file (per Sprint 1)
The Sprint 1 workflow staged at `ci/github-workflows-build.yml` contains:
- mvn clean install on JDK 17 (verifies build green per NFR-ETS-02)
- Reproducible-build double-build verification (per SCENARIO-ETS-SCAFFOLD-REPRODUCIBLE-001)
- Optional surefire upload (test reports)

The move to `.github/workflows/` activates these checks on every push to main.

### Estimated effort
- If pre-condition met: 30 min Generator wall-clock (`git mv`, push, monitor workflow run, capture URL)
- If pre-condition NOT met: 5 min (mark blocked, document, defer)

### 4th-sprint-defer escalation
If this is the 4th sprint deferring, Pat flags structural concern in Sprint 4 contract: consider whether to (a) ask user for hard-stop time to grant scope; (b) drop the workflow entirely and rely on local mvn verification; (c) move to a different CI provider (Jenkins, CircleCI). Pat's recommendation if Sprint 3 also defers: option (a) — user grants scope in 30 seconds; the alternative paths are higher-friction.

## Definition of Done
- [ ] All acceptance criteria checked OR explicit DEFERRED-WITH-RATIONALE if pre-condition not met
- [ ] If implemented: workflow_run URL captured + green status verified
- [ ] Spec implementation status updated (REQ-ETS-CLEANUP-007 IMPLEMENTED OR PLACEHOLDER-DEFERRED)
- [ ] Story status set to Done in this file and in `epic-ets-04-teamengine-integration.md` (OR Active-DEFERRED if pre-condition blocked)
- [ ] Sprint 3 contract success_criterion `ci_workflow_live: true` met OR DEFERRED-WITH-RATIONALE
