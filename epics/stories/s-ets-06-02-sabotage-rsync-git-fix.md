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

## Implementation Notes (Sprint 6 Generator Run 1 — 2026-04-30)

**Status**: IMPLEMENTED (live cascade verification deferred to Raze adversarial sabotage exec at Sprint 6 gate)

**Sister repo commit**: `c17a534` — sabotage-test.sh rsync .git fix + honest log message

**Option A applied** (Pat's recommendation; sister `.git` measured 5.2MB via `du -sh` at Generator start, well under any reasonable size threshold):

```diff
-    rsync -a --exclude='.git/' --exclude='target/' --exclude='node_modules/' \
+    rsync -a --exclude='target/' --exclude='node_modules/' \
       --exclude='ops/test-results/*.xml' --exclude='ops/test-results/*.log' \
       "$REPO_ROOT/" "$SABOTAGE_WORKTREE/"
```

The cp -a fallback path also updated for symmetry: `rm -rf "$SABOTAGE_WORKTREE/.git" "$SABOTAGE_WORKTREE/target"` → `rm -rf "$SABOTAGE_WORKTREE/target"` (no longer strips .git from the cp-fallback temp tree either).

**Honest log message conditional** at step 4: smoke exit code captured into `SMOKE_EXIT_CODE` via `|| SMOKE_EXIT_CODE=$?`. After the smoke run, the script tries to locate the latest TestNG report; presence/absence disambiguates failure modes:
- No report + non-zero exit → "Docker build FAILED (not a sabotage-marker hit)" + advisory message about COPY/.git or other Docker errors; then `die`.
- Report present + non-zero exit → "EXPECTED — SystemFeatures FAIL on first @Test" (the legitimate sabotage-cascade outcome).
- Report present + zero exit → silent (proceeds to cascade parse).

**Verification**:
- `bash -n scripts/sabotage-test.sh` PASS (syntax clean).
- `bash scripts/sabotage-test.sh --help` exits 0 with usage banner unchanged.
- `bash scripts/sabotage-test.sh --target=foo` exits 2 with the existing FATAL message unchanged.
- Live cascade execution NOT run by Generator — gate-deferred per Sprint 5 Run 2 precedent (Raze's gate-time adversarial sabotage live-exec).

**No regression risk**: the `.git`-include change increases temp-tree size by ~5.2MB (negligible vs the existing target/ exclude that prunes ~tens of MB). The honest log message only applies when smoke fails; the success path is unchanged.
