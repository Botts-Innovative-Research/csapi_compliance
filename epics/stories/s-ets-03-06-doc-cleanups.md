# S-ETS-03-06: Documentation cleanups — VerifySystemFeaturesTests reference + ops/test-results/ convention

> Status: Implemented (pending Quinn+Raze) — Sprint 3 | Epic: ETS-02 | Priority: P2 | Complexity: S | Last updated: 2026-04-29

## Description
Close 2 LOW-severity documentation concerns from Sprint 2 SystemFeatures gates. Pure documentation; no production-code changes (unless Generator picks doc-cleanup option (a) below — adds a small unit-test class).

**Concern 1 (Quinn s06 CONCERN-2)**: story line 30 in `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md` acceptance criterion lists "VerifySystemFeaturesTests" as a baseline surefire item. No such test class exists in `src/test/java/`. Coverage actually lives in `VerifyETSAssert` (which exercises the helpers SystemFeaturesTests uses). Two paths:
- **(a)** Create `src/test/java/.../conformance/systemfeatures/VerifySystemFeaturesTests.java` with at least 2-3 tests covering SystemFeatures business logic (e.g. `extractFirstSystemId` edge cases — empty items array, malformed item, missing id). Adds substantive coverage.
- **(b)** Amend the s-ets-02-06 story acceptance criterion to remove the VerifySystemFeaturesTests reference (the spec.md + helper-layer coverage IS the SystemFeatures regression check per ADR-008 mandate; the story-language was over-specific).

Pat recommends (a) — adds substantive ~5 LOC test class + closes the concern with real coverage rather than removing the criterion. Generator's call.

**Concern 2 (Raze s06 CONCERN-2)**: clarify which repo's `ops/test-results/` the contract references. Sprint 1+2 archived smoke artifacts to the new repo (`ets-ogcapi-connectedsystems10/ops/test-results/`); the `csapi_compliance/ops/test-results/` directory does not exist. Sprint 3 contract (`.harness/contracts/sprint-ets-03.yaml`) explicitly states the convention upfront in `evaluation_artifacts_required`. This story applies the same clarification retroactively to Sprint 1+2 contracts via one-line footnote.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` (no changes)
- Requirements: none (pure doc cleanup; closes 2 LOW-severity gate concerns)
- Scenarios: SCENARIO-ETS-CLEANUP-DOC-CLEANUPS-001 (NORMAL)

## Acceptance Criteria
- [ ] **Concern 1** (Generator picks one):
  - Option (a): `src/test/java/.../conformance/systemfeatures/VerifySystemFeaturesTests.java` exists with at least 2-3 tests covering SystemFeatures business logic (extract* helpers, edge cases). All tests PASS in mvn test.
  - Option (b): `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md` line 30 amended to remove the "VerifySystemFeaturesTests" reference; rationale captured inline.
- [ ] **Concern 2**:
  - `.harness/contracts/sprint-ets-01.yaml` `evaluation_artifacts_required` annotated with one-line footnote: "Smoke artifacts archive to `ets-ogcapi-connectedsystems10/ops/test-results/`, not `csapi_compliance/ops/test-results/`."
  - `.harness/contracts/sprint-ets-02.yaml` same footnote.
  - Sprint 3 contract `evaluation_artifacts_required` already has the convention explicit (verify Pat's authoring stayed honest).
- [ ] mvn clean install green: surefire 49+M (where M depends on Concern 1 choice — option (a) adds 2-3 tests; option (b) adds 0)
- [ ] Smoke 12+6+N PASS preserved (no regression)
- [ ] SCENARIO-ETS-CLEANUP-DOC-CLEANUPS-001 PASSes

## Tasks
1. Generator picks Concern 1 approach (a or b)
2. If (a): Generator creates `VerifySystemFeaturesTests.java` with edge-case tests; verifies mvn test green
3. If (b): Generator edits `epics/stories/s-ets-02-06-*.md` line 30; documents rationale
4. Generator adds footnote to `.harness/contracts/sprint-ets-01.yaml` evaluation_artifacts_required
5. Generator adds footnote to `.harness/contracts/sprint-ets-02.yaml` evaluation_artifacts_required
6. Generator verifies Sprint 3 contract convention is explicit (no change needed if Pat authored it correctly)
7. No spec.md / traceability.md changes needed (pure doc cleanup)

## Dependencies
- Depends on: nothing
- Provides: clean audit trail for Sprint 1+2+3 evaluator/auditor expectations

## Implementation Notes

### Generator Run 1 (2026-04-29) — IMPLEMENTED

**Concern 1 (Quinn s06 CONCERN-2)** — picked option (b) (amend story criterion to remove `VerifySystemFeaturesTests` reference). Rationale: creating a fake unit-test class just to satisfy a doc-criterion is wasteful — SystemFeatures business-logic helpers are already covered by `VerifyETSAssert` at the helper layer per ADR-008 mandate; the conformance class itself is verified end-to-end via smoke against GeoRobotix per design.md §"SystemFeatures conformance class scope" (16/16 PASS at Sprint 2 close). Adding a new VerifySystemFeaturesTests would double-cover and add maintenance cost without strengthening the regression check. Edit landed at `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md` line 30 with inline rationale.

**Concern 2 (Raze s06 CONCERN-2)** — added explicit Convention section to Sprint 3 contract (Pat had partially documented the convention inline at line 463; this run elevated it into a stand-alone Convention header for unambiguous visibility going forward). Sprint 1 + Sprint 2 contracts also got the same one-line Convention footnote for retroactive clarity per the story acceptance criterion. Sprint 1 + Sprint 2 contracts are otherwise frozen audit artifacts — only the footnote was added; the rest of the contract surface is unchanged.

**Files touched (csapi_compliance)**:
- `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md` (line 30 amended)
- `.harness/contracts/sprint-ets-01.yaml` (Convention footnote at evaluation_artifacts_required)
- `.harness/contracts/sprint-ets-02.yaml` (Convention footnote at evaluation_artifacts_required)
- This story (Implementation Notes + status)

**Files touched (new repo)**: none — pure doc cleanup.

**mvn test result**: not applicable (no Java change).

**Doc-only sprint impact**: zero risk to smoke baseline (no Java changes); zero new ADR; zero spec.md changes (REQ-* surface unchanged).

### Concern 1 option (a) sample test class
```java
@Test
public class VerifySystemFeaturesTests {
  @Test public void extractFirstSystemId_returnsIdFromFirstItem() { ... }
  @Test public void extractFirstSystemId_returnsNullOnEmptyItems() { ... }
  @Test public void extractFirstSystemId_skipsItemsWithoutId() { ... }
}
```
~30 LOC. ~30 min Generator wall-clock.

### Concern 2 footnote sample
Add to Sprint 1 + Sprint 2 contract `evaluation_artifacts_required`:
```yaml
# Convention: smoke artifacts archive to ets-ogcapi-connectedsystems10/ops/test-results/
# (the artifact-producing repo's ops/), NOT csapi_compliance/ops/test-results/
# (which does not exist). Clarified retroactively per S-ETS-03-06.
```

### Estimated effort
30-60 min total Generator wall-clock for both concerns (option (a) = upper bound; option (b) = lower bound).

## Definition of Done
- [ ] Both Concerns closed
- [ ] mvn green; smoke 12+6+N PASS preserved
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 3 contract SCENARIO-ETS-CLEANUP-DOC-CLEANUPS-001 PASSes
