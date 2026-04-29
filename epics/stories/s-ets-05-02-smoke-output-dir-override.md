# Story: S-ETS-05-02 — Worktree-pollution mitigation v2: SMOKE_OUTPUT_DIR override in smoke-test.sh

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-05
**Priority**: P1 — Quinn GAP-2; Sprint 2 and Sprint 4 worktree-pollution incidents
**Estimated Complexity**: S
**Status**: Active (Sprint 5)

## Description

Sprint 4 Quinn gate run produced a worktree-pollution incident: `scripts/smoke-test.sh` wrote
`ops/test-results/s-ets-01-03-teamengine-smoke-2026-04-29.xml` directly to the user's worktree
at `~/docker/gir/ets-ogcapi-connectedsystems10/`, overwriting the Sprint 1 archive. Quinn had
to restore via `git checkout HEAD --` after capturing evidence. This is the second recurrence
(Sprint 2 systemfeatures gate-run was the first).

Root cause: smoke-test.sh hardcodes the output path as `ops/test-results/` relative to the repo
root. When gates clone to `/tmp/<role>-fresh-sprint/`, the output goes to the `/tmp/` clone's
`ops/test-results/` (correct). But when the script is invoked from the user's worktree directly
(e.g. gate forgets to clone), it overwrites the user's actual `ops/test-results/`.

Fix: add `SMOKE_OUTPUT_DIR` env var to smoke-test.sh. When set, smoke-test.sh writes all TestNG
XML artifacts to `${SMOKE_OUTPUT_DIR}/` instead of `ops/test-results/`. Gate briefings mandate
`SMOKE_OUTPUT_DIR=/tmp/<role>-fresh-sprint5/test-results/`. Default (unset): preserves existing
`ops/test-results/` behavior for normal developer runs.

~10 LOC bash.

## Acceptance Criteria

- [ ] `SMOKE_OUTPUT_DIR=/tmp/smoke-test-out scripts/smoke-test.sh` writes TestNG XML to
      `/tmp/smoke-test-out/` (not to `ops/test-results/`)
- [ ] When `SMOKE_OUTPUT_DIR` is unset, smoke-test.sh writes to `ops/test-results/` as before
      (backward compatibility preserved)
- [ ] Sprint 5 gate briefings reference `SMOKE_OUTPUT_DIR=/tmp/<role>-fresh-sprint5/test-results/`
      as the mandatory gate override in evaluation_focus and evaluation_questions_for_quinn
- [ ] Smoke 26/26 PASS preserved after the change
- [ ] SCENARIO-ETS-CLEANUP-SMOKE-OUTPUT-DIR-001 PASS

## Spec References

- REQ-ETS-CLEANUP-014 (new — SMOKE_OUTPUT_DIR override)

## Technical Notes

Add at the top of smoke-test.sh (after shebang and set -euo pipefail):
```bash
OUTPUT_DIR="${SMOKE_OUTPUT_DIR:-ops/test-results}"
mkdir -p "${OUTPUT_DIR}"
```
Replace all `ops/test-results` references in the script with `${OUTPUT_DIR}`.

Also update sprint-ets-05.yaml's `worktree_pollution_constraint` (already done) and the gate
briefing templates to include `SMOKE_OUTPUT_DIR=/tmp/<role>-fresh-sprint5/test-results/` in
every gate smoke invocation.

## Dependencies

- Sequence after S-ETS-05-01 (both touch smoke-test.sh; minimize merge risk by sequencing)

## Definition of Done

- [ ] SCENARIO-ETS-CLEANUP-SMOKE-OUTPUT-DIR-001 PASS
- [ ] Smoke 26/26 PASS preserved
- [ ] Spec implementation status updated: REQ-ETS-CLEANUP-014 SPECIFIED+IMPLEMENTED

## Implementation Notes (Sprint 5 — to be filled by Dana Generator)

_[Generator fills this section during Sprint 5 implementation]_
