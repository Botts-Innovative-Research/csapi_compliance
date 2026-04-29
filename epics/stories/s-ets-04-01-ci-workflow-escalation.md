# Story: S-ETS-04-01 — CI workflow `git mv` ESCALATION (5th-sprint-defer-risk; binary close)

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-04
**Priority**: P0 — Raze cumulative CONCERN-3 escalation territory; 4-sprint defer in a row = structural risk
**Estimated Complexity**: S
**Status**: Active (Sprint 4)

## Description

Sprint 4 inherits a 4-CONSECUTIVE-SPRINT defer on the user-action `gh auth refresh -s workflow` (S-ETS-01-01..03 + S-ETS-02-05 + S-ETS-03-03). Raze cumulative APPROVE_WITH_CONCERNS verdict explicitly flagged this as ESCALATION TERRITORY with the recommendation: "EITHER the user grants the scope before Sprint 4 start... AND Sprint 4 lands the git-mv + workflow_dispatch verification cleanly (~30 min Generator), OR Sprint 4 explicitly drops `ci_workflow_live` from the Sprint contract and tracks it as a perpetual-blocker outside the sprint cadence (similar to 'user must provision IUT' — environmental rather than story-scope)."

This story enforces the BINARY close: no more 4-sprint-style "we'll try again next sprint" deferrals. Sprint 4 success_criterion `ci_workflow_live_or_formally_dropped` resolves to TRUE via either path:

**Path A (preferred — user-action complete)**: orchestrator runs `gh auth refresh -s workflow` from a session at the terminal where the user can complete the OAuth browser flow. Generator then executes `cd ets-ogcapi-connectedsystems10 && mkdir -p .github/workflows && git mv ci/github-workflows-build.yml .github/workflows/build.yml && git commit -m "chore: move CI workflow to .github/workflows/" && git push`. Verification: at least one `workflow_run` with `conclusion=success` on a Sprint 4 commit; URL captured in `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-04-01-ci-workflow-live-<date>.txt`.

**Path B (formal drop)**: if user CANNOT or DOES NOT grant the scope before the next Generator run, S-ETS-04-01 closes with formal deferral note in `ops/status.md` documenting `ci_workflow_live` as DROPPED from sprint cadence (perpetual environmental blocker). Pat documents alternative: manual GitHub UI move via web (open `.github/workflows/build.yml` in browser, paste contents from `ci/github-workflows-build.yml`, commit via web — ~5 min user-time; bypasses the gh-cli-scope blocker entirely). User can adopt this alternative at any point post-Sprint-4.

## Acceptance Criteria

- [ ] **PATH A or PATH B**: One of two outcomes — NOT a continuation of the 4-sprint defer pattern.
- [ ] PATH A acceptance: GitHub Actions UI shows at least one workflow_run on a Sprint 4 commit with `conclusion=success`. Verifiable via `gh api repos/Botts-Innovative-Research/ets-ogcapi-connectedsystems10/actions/runs?per_page=5 | jq '.workflow_runs[].html_url + " " + .conclusion'`.
- [ ] PATH B acceptance: `ops/status.md` contains a section "Perpetual Environmental Blockers (DROPPED from sprint cadence)" listing `ci_workflow_live` with rationale + link to alternative paths (manual GitHub UI move via web).
- [ ] Sprint 4 close artifact at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-04-01-ci-workflow-<path-a-or-b>-<date>.txt` documents the chosen path.
- [ ] SCENARIO-ETS-CLEANUP-CI-WORKFLOW-ESCALATION-001 PASSES.

## Spec References

- REQ-ETS-CLEANUP-007 (modified) — escalated to user-action hard-stop OR formally dropped
- REQ-ETS-CLEANUP-009 (NEW) — CI workflow ESCALATION 5th-sprint-defer-risk

## Technical Notes

- Pre-condition (USER ACTION): orchestrator runs `gh auth refresh -s workflow` from a session at the terminal where the user can complete the OAuth browser flow. Without this, story closes via Path B.
- Path B is NOT a deferral — it is a contract decision to remove the criterion from sprint cadence. Future sprints will not re-litigate.
- Manual GitHub UI move via web alternative: documented in story for the user to adopt at any point post-Sprint-4 if they later wish to enable CI without the gh-cli scope.

## Dependencies

- None (orthogonal to all other Sprint 4 stories)

## Definition of Done

- [x] Path A OR Path B closure complete (PATH B chosen — see notes below)
- [x] Spec implementation status updated (pending Quinn+Raze)
- [x] No regression in existing tests (mvn test 61/0/0/3 surefire — unchanged)
- [x] `ops/status.md` updated reflecting outcome (formal-drop note added; CI URL N/A on Path B)
- [x] Sprint 4 close artifact archived (ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-04-01-ci-workflow-path-b-2026-04-29.txt)

## Implementation Notes (Generator Run 1, 2026-04-29)

**Path chosen: PATH B (formal-drop / structural escalation close)**

Probe at the start of Generator Run 1:
```
$ gh auth status 2>&1 | grep -i scopes
  - Token scopes: 'gist', 'read:org', 'repo'
```

The `workflow` scope was ABSENT — the user did not run `gh auth refresh -s workflow` between Sprint 3 close (HEAD ed45643 in csapi_compliance / c56df10 in ets-ogcapi-connectedsystems10) and Sprint 4 Generator Run 1 start (2026-04-29T15:53Z). With 5 sprints of carryover (S-ETS-01-01..03 + S-ETS-02-05 + S-ETS-03-03 + would-be S-ETS-04-01) accumulated, continuing the defer pattern is structurally invalid per Pat's binary-close design and Raze's Sprint 3 cumulative APPROVE_WITH_CONCERNS ESCALATION TERRITORY recommendation.

Path B actions (commit 18dbe1a in ets-ogcapi-connectedsystems10):
  1. `ci/README.md` added — documents WHY the workflow is staged at `ci/github-workflows-build.yml` instead of `.github/workflows/build.yml` (the OAuth-scope blocker), AND two activation paths for any future session:
     - **Option 1**: `gh auth refresh -s workflow` + `git mv ci/github-workflows-build.yml .github/workflows/build.yml` + push
     - **Option 2**: GitHub web UI upload (`Settings → Actions → Workflows → New workflow`) — bypasses the gh-cli scope entirely, ~5 min user-time
  2. `ci/github-workflows-build.yml` PRESERVED (not deleted) — keeps one-line activation cheap if user later wants CI; no work lost
  3. `ops/test-results/sprint-ets-04-01-ci-workflow-path-b-2026-04-29.txt` archived — Sprint 4 close evidence with the auth-scope probe transcript and the binary-close rationale
  4. `ops/status.md` updated with "Perpetual Environmental Blockers (DROPPED from sprint cadence)" section listing `ci_workflow_live` with rationale + link to ci/README.md activation paths

`ci_workflow_live` is now formally dropped from the sprint cadence as a perpetual environmental blocker. Future sprints will not re-litigate. SCENARIO-ETS-CLEANUP-CI-WORKFLOW-ESCALATION-001 PASSES via the Path B branch.
