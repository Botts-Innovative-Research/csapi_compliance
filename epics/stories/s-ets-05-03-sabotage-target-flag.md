# Story: S-ETS-05-03 — sabotage-test.sh --target=systemfeatures mode (native flag for gate invocation)

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-05
**Priority**: P2 — Raze carryover; lets Quinn invoke without Java edits
**Estimated Complexity**: S
**Status**: Active (Sprint 5)

## Description

Sprint 4 used adversarial in-place sabotage of SystemFeaturesTests.java to demonstrate the
two-level cascade. Raze modified the Java source directly; Quinn read the archived XML rather
than re-running the script. A native `--target=<class>` flag would let Quinn invoke the
sabotage script hermetically at gate time without manual Java edits.

Implementation: `scripts/sabotage-test.sh --target=systemfeatures` causes the script to:
1. Create a temp directory with the source tree
2. Use `sed` (or equivalent) to inject `throw new AssertionError("SABOTAGED");` into the
   first `@Test` method of the target class (SystemFeaturesTests.java)
3. Recompile the modified source and rebuild the ETS jar (or use a pre-built WAR + bytecode
   patch if recompile is too heavy)
4. Run smoke against GeoRobotix with the sabotaged build
5. Archive the TestNG XML showing the cascade pattern
6. Restore the original (temp dir approach: original is never modified)

Pat recommends the sed-patch-and-recompile approach (~30-50 LOC bash). If mvn recompile in
the temp dir takes >5 min, fall back to the pre-sabotaged-source approach (Generator
picks the lighter option after timing the mvn step).

## Acceptance Criteria

- [ ] `bash scripts/sabotage-test.sh --target=systemfeatures` runs end-to-end without
      manual Java edits
- [ ] The produced TestNG XML shows SystemFeatures FAIL + SystemFeatures SKIP (other 5 @Tests)
      + Subsystems SKIP (4 @Tests) + Procedures SKIP (if Procedures is wired) + Deployments SKIP
      (if Deployments is wired); Core + Common PASS
- [ ] The original SystemFeaturesTests.java is NOT modified at the end of the run (temp-dir
      or restore-on-exit approach)
- [ ] SCENARIO-ETS-CLEANUP-SABOTAGE-TARGET-001 PASS

## Spec References

- REQ-ETS-CLEANUP-015 (new — sabotage --target flag)

## Technical Notes

The existing sabotage-test.sh already:
- Creates a stub IUT server
- Runs smoke against it
- Archives TestNG XML to /tmp/sabotage-fresh-<ts>/

The `--target` flag adds:
```bash
if [[ "${1:-}" == "--target=systemfeatures" ]]; then
  # patch SystemFeaturesTests.java in a temp copy
  TEMP_SRC=$(mktemp -d)
  cp -r . "${TEMP_SRC}/"
  sed -i 's/@Test\n.*public void systemsCollectionReturns200/@Test\n  public void systemsCollectionReturns200/' "${TEMP_SRC}/src/..."
  # OR: inject unconditional throw before the first @Test body
fi
```

The exact sed incantation depends on the current SystemFeaturesTests.java structure. Generator
reads the file before writing the patch. The cleanest approach is a heredoc replacement of just
the first @Test method body with `throw new AssertionError("SABOTAGED by --target flag");`.

Sequence LAST in the sprint (after all conformance work) to avoid disrupting smoke runs used
to verify Procedures + Deployments.

## Dependencies

- S-ETS-05-05 and S-ETS-05-06 should be DONE before implementing this story (so the sabotage
  XML correctly shows Procedures + Deployments as SKIP in the cascade)

## Definition of Done

- [ ] SCENARIO-ETS-CLEANUP-SABOTAGE-TARGET-001 PASS
- [ ] No modification to production Java source (temp-dir approach)
- [ ] Spec implementation status updated: REQ-ETS-CLEANUP-015 SPECIFIED+IMPLEMENTED

## Implementation Notes (Sprint 5 — to be filled by Dana Generator)

_[Generator fills this section during Sprint 5 implementation]_
