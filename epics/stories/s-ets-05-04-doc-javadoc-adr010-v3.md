# Story: S-ETS-05-04 — SubsystemsTests javadoc fix + ADR-010 v3 amendment (doc-only)

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-05
**Priority**: P2 — Raze low concerns (CONCERN-1 + recommendation); doc-only, no behavior change
**Estimated Complexity**: S
**Status**: Active (Sprint 5)

## Description

Two bundled doc-only items from Sprint 4 gate reports:

### Item A: SubsystemsTests javadoc fix (Raze CONCERN-1)

Raze Sprint 4: SubsystemsTests.java javadoc enumerates **5** verified `.adoc` files but the
GitHub API listing at `api/part1/standard/requirements/subsystem/` shows **6**:
- `req_recursive_param.adoc`
- `req_recursive_search_subsystems.adoc`
- `req_recursive_search_systems.adoc`
- `req_subcollection.adoc`
- `req_subcollection_time.adoc`  ← this one is missing from the javadoc enumeration
- `requirements_class_system_components.adoc`

Additionally, the doc incorrectly lists `recursive-assoc` in one place vs `subcollection_time`
per the actual `.adoc` filename. Fix: update the SubsystemsTests class-level javadoc to enumerate
all 6 `.adoc` files correctly and clarify the distinction between `req_subcollection_time.adoc`
(which exists as a separate file) and `req_subcollection.adoc` (the one asserted via
`REQ_SUBSYSTEM_COLLECTION`). **No Java behavior changes** — this is documentation only.
~5 LOC javadoc.

### Item B: ADR-010 v3 amendment (Raze recommendation)

ADR-010 currently describes the TestNG 7.9.0 transitive cascade as "hypothesized" or based on
design intent. Raze Sprint 4 live-exec demonstrated it empirically:

```
total=26 / passed=16 / failed=1 / skipped=9
- SystemFeaturesTests.systemsCollectionReturns200  FAIL  (sabotaged)
- 5 other SystemFeatures @Tests                    SKIP  (one-level chain)
- all 4 SubsystemsTests @Tests                     SKIP  (TWO-LEVEL chain)
- 12 Core @Tests + 4 Common @Tests                 PASS  (independent)
```

Add an "Amendment v3 (Sprint 5, 2026-04-29)" subsection to ADR-010 stating that the transitive
cascade is now VERIFIED LIVE (not hypothesized), citing the Sprint 4 Raze sabotage evidence, and
noting that Sprint 5 adds Procedures + Deployments to the dependency DAG using the same mechanism.
**No change to the architectural decision itself** — narrow addendum with empirical evidence only.
~10-20 LOC.

## Acceptance Criteria

- [ ] SubsystemsTests.java class-level javadoc enumerates 6 `.adoc` files (not 5)
- [ ] The javadoc clarifies `req_subcollection_time.adoc` as a separate file that exists but
      is NOT part of the `requirements_class_system_components.adoc` requirements class
      (i.e. it exists in the directory but is not enumerated in the class's inherited requirements)
- [ ] ADR-010.md contains "Amendment v3 (Sprint 5)" subsection stating TestNG 7.9.0 transitive
      cascade is VERIFIED LIVE, citing Sprint 4 Raze evidence (total=26/passed=16/failed=1/skipped=9)
- [ ] ADR-010.md amendment does NOT modify the architectural decision text (only adds an
      empirical-evidence addendum)
- [ ] `mvn clean install` BUILD SUCCESS (no compilation errors; javadoc-only change)
- [ ] SCENARIO-ETS-CLEANUP-SUBSYSTEMS-JAVADOC-001 and SCENARIO-ETS-CLEANUP-ADR-010-V3-001 PASS

## Spec References

- REQ-ETS-PART1-003 (minor doc amendment — javadoc accuracy; no behavior change)

## Technical Notes

**SubsystemsTests.java javadoc location**: read the class-level `/** ... */` comment at the
top of the file. Find the `.adoc` enumeration section. Add the missing `req_subcollection_time.adoc`
entry and add a clarification note:
```
 * NOTE: req_subcollection_time.adoc exists in the GitHub directory listing but is NOT
 * enumerated in requirements_class_system_components.adoc's `requirement::` list.
 * It represents a separate, optional sub-requirement not asserted by this class at
 * Sprint 4 minimal scope. Deferred to Sprint 5+ recursive-* expansion.
```

**ADR-010.md location**: `_bmad/adrs/ADR-010.md`. Add at the end (after any existing sections):
```markdown
### Amendment v3 — Sprint 5, 2026-04-29

**TestNG 7.9.0 transitive cascade: VERIFIED LIVE (not hypothesized)**

Sprint 4 Raze gate live-exec (sabotage SystemFeaturesTests.systemsCollectionReturns200 on
/tmp/raze-fresh-s04/ clone, full smoke vs GeoRobotix 2026-04-29T16:40Z) produced:

  total=26 / passed=16 / failed=1 (SystemFeatures sabotage) / skipped=9
  Pattern: SystemFeaturesTests FAIL (×1) + SystemFeaturesTests SKIP (×5) + SubsystemsTests SKIP (×4)
  Core @Tests (×12) + Common @Tests (×4): PASS (independent — no cascade)

This confirms that TestNG 7.9.0 `dependsOnGroups` cascades transitively across multi-level
dependency chains (Subsystems→SystemFeatures→Core: both levels observed to cascade). The
@BeforeClass SkipException defense-in-depth added at Sprint 4 was correctly inert in this
run (TestNG cascade fired first at the testng.xml level; @BeforeClass never instantiated).

Sprint 5 adds Procedures (`<group name="procedures" depends-on="systemfeatures"/>`) and
Deployments (`<group name="deployments" depends-on="systemfeatures"/>`) to the same dependency
DAG using the identical mechanism. No new architectural decision; this is a pattern extension.
```

## Dependencies

None (pure doc changes; parallelizable with conformance class stories)

## Definition of Done

- [ ] SubsystemsTests.java javadoc accuracy fixed (6 .adoc files enumerated)
- [ ] ADR-010.md v3 amendment added
- [ ] No behavior changes; mvn test still 64+N/0/0/3
- [ ] Spec: no spec changes needed for this story (REQ-ETS-PART1-003 status unchanged — IMPLEMENTED)

## Implementation Notes (Sprint 5 — to be filled by Dana Generator)

_[Generator fills this section during Sprint 5 implementation]_
