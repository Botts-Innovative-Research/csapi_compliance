# Story: S-ETS-06-02

**Epic**: epic-ets-04-teamengine-integration
**Priority**: P1
**Estimated Complexity**: S

## Description

Fix the `sabotage-test.sh --target=systemfeatures` Docker build failure introduced in Sprint 5 (S-ETS-05-03). The script rsync-copies the repo to a temp worktree using `--exclude='.git/'`, but the project's `Dockerfile` line 59 has `COPY .git ./.git` (for git-commit-sha manifest pinning, per ADR-002 / Sprint 2). The temp worktree therefore has no `.git`, causing the Docker build to fail at `COPY .git ./.git` with `"/.git": not found`.

Root cause cross-corroborated by Quinn (MEDIUM severity), primary Raze (HIGH, reclassified to MEDIUM by meta-Raze), and confirmed reproducible by meta-Raze from a third independent clone.

Fix: remove `--exclude='.git/'` from the rsync call at line 205 of `scripts/sabotage-test.sh`, OR (alternatively) preserve the exclude for performance/space reasons and add an explicit `cp -a "$REPO_ROOT/.git" "$SABOTAGE_WORKTREE/.git"` step immediately after the rsync. Pat recommends removing the exclude (simpler; the `.git` directory for a fresh clone is ~5-10MB and does not meaningfully affect temp-tree size given that `target/` and `node_modules/` are excluded).

This story also improves the misleading log message at line 266 of `sabotage-test.sh` which currently logs `"smoke exited non-zero (EXPECTED — SystemFeatures FAIL on first @Test)"` regardless of WHY smoke exited non-zero — it would trigger even if Docker build failed. After the fix, the script should detect Docker build failure vs smoke @Test failure distinctly and log accordingly.

## Acceptance Criteria

- SCENARIO-ETS-CLEANUP-SABOTAGE-TARGET-DOCKER-FIX-001 (CRITICAL): `bash scripts/sabotage-test.sh --target=systemfeatures` completes the Docker build step successfully
- SCENARIO-ETS-CLEANUP-SABOTAGE-CASCADE-THREE-CLASS-001 (CRITICAL): Live cascade evidence shows Core+Common PASS, SystemFeatures 1×FAIL+Nx SKIP, Subsystems+Procedures+Deployments all SKIP
- SCENARIO-ETS-CLEANUP-SABOTAGE-LOG-HONEST-001 (NORMAL): Log message correctly distinguishes Docker build failure vs smoke @Test failure

## Spec References

- REQ-ETS-CLEANUP-015 (re-opened from IMPLEMENTED → FULLY-IMPLEMENTED when cascade runs end-to-end)
- REQ-ETS-CLEANUP-017 (NEW — sabotage cascade three-class verified; closes ADR-010 v3 "forward-extends to Procedures + Deployments" claim at the live-exec layer)

## Technical Notes

**Fix location**: `scripts/sabotage-test.sh` line 205 (verified from Raze adversarial report):
```bash
# BEFORE (broken):
rsync -a --exclude='.git/' --exclude='target/' --exclude='node_modules/' \
  --exclude='ops/test-results/*.xml' --exclude='ops/test-results/*.log' \
  "$REPO_ROOT/" "$SABOTAGE_WORKTREE/"

# AFTER (fixed) — Option A: remove .git exclude:
rsync -a --exclude='target/' --exclude='node_modules/' \
  --exclude='ops/test-results/*.xml' --exclude='ops/test-results/*.log' \
  "$REPO_ROOT/" "$SABOTAGE_WORKTREE/"
```

Option B (add explicit copy, preserving the exclude for performance):
```bash
rsync -a --exclude='.git/' --exclude='target/' ...
cp -a "$REPO_ROOT/.git" "$SABOTAGE_WORKTREE/.git"
```

Pat recommends Option A. Generator MAY choose Option B if `.git` rsync causes performance issues in the temp tree (unlikely at ~5-10MB).

**Log message fix location**: around line 266. Currently:
```bash
log "smoke exited non-zero (EXPECTED — SystemFeatures FAIL on first @Test)"
```
Should detect docker build failure first:
```bash
if [[ $DOCKER_BUILD_EXIT -ne 0 ]]; then
  log "smoke exited non-zero: Docker build FAILED (not a sabotage-marker hit)"
else
  log "smoke exited non-zero (EXPECTED — SystemFeatures FAIL on first @Test)"
fi
```

Generator should read the full script flow to identify the correct variable names for docker build exit code. Raze's report confirms the worktree-pollution guard and rsync/cp sabotage marker injection both work correctly — only the Docker build path is broken.

**Live exec verification**: The cascade expected outcome after fix is:
- Core suite: all PASS (12 @Tests)
- Common suite: all PASS (4 @Tests)
- SystemFeatures: 1st @Test `systemsCollectionReturns200` → FAIL (sabotage marker); remaining 5 SystemFeatures @Tests → SKIP (within-class cascade); cascade to dependent groups fires
- Subsystems: all 4 @Tests → SKIP (dependsOnGroups="systemfeatures")
- Procedures: all 4 @Tests → SKIP (dependsOnGroups="systemfeatures")
- Deployments: all 4 @Tests → SKIP (dependsOnGroups="systemfeatures")

**Archive requirement**: Gate runs SHALL archive the cascade XML to prove the three-class (Subsystems+Procedures+Deployments) skip pattern — this closes the "forward-extends to Procedures + Deployments" claim in ADR-010 v3 at the live-exec layer.

**No Docker build/run by Generator**: Generator verifies the bash syntax change with `bash -n` + reads the sabotage script flow to confirm the SABOTAGE_WORKTREE path will contain `.git` after the fix. Live Docker exec is deferred to Quinn/Raze gate per established pattern.

## Dependencies

- Depends on: S-ETS-05-03 (IMPLEMENTED but BROKEN at Docker step — this story fixes the broken mode)
- Depends on: S-ETS-05-02 (SMOKE_OUTPUT_DIR in place for gate-time pollution mitigation)

## Definition of Done

- [ ] SCENARIO-ETS-CLEANUP-SABOTAGE-TARGET-DOCKER-FIX-001 structural-pass (rsync fix verified by reading script; .git directory will be present in temp tree after the change)
- [ ] SCENARIO-ETS-CLEANUP-SABOTAGE-CASCADE-THREE-CLASS-001 deferred to gate (live exec by Quinn / adversarial exec by Raze)
- [ ] SCENARIO-ETS-CLEANUP-SABOTAGE-LOG-HONEST-001 structural-pass (log message updated; bash -n validates syntax)
- [ ] REQ-ETS-CLEANUP-015 status promoted from IMPLEMENTED (broken) to FULLY-IMPLEMENTED in spec.md
- [ ] REQ-ETS-CLEANUP-017 status SPECIFIED in spec.md (IMPLEMENTED when gate produces live cascade XML)
- [ ] No regression: bash -n PASS; --help exits 0; --target=foo exits 2 (all existing sub-paths preserved)
- [ ] Generator wall-clock: ≤20 minutes (this is a 1-2 LOC fix + log message improvement)
