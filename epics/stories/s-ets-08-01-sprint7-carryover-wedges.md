# Story: S-ETS-08-01

**Epic**: epic-ets-04-teamengine-integration
**Priority**: P1
**Estimated Complexity**: S

## Description

Bundle all 6 Sprint 7 carryover items (Raze REC-1 + META-GAP-S7-1 + META-GAP-S7-3 + Raze REC-3 + spring-javaformat pin + mvn-test-via-docker wrapper) into a single story. These are small, precisely-bounded fixes (~30-60 LOC total across bash, doc, and pom.xml) that must land FIRST in Sprint 8.

This story does NOT add any new OGC conformance class. It closes open defects and doc-drift from Sprint 7 gates.

## Acceptance Criteria

- SCENARIO-ETS-CLEANUP-SABOTAGE-STDOUT-5CLASS-001 (CRITICAL)
- SCENARIO-ETS-CLEANUP-SPEC-REQ018-5CLASS-EVIDENCE-001 (CRITICAL)
- SCENARIO-ETS-CLEANUP-DESIGN-MD-PROJECTWIDE-GREP-001 (CRITICAL)
- SCENARIO-ETS-CLEANUP-TEST-RESULTS-ETS-POINTER-001 (NORMAL)
- SCENARIO-ETS-CLEANUP-SPRING-JAVAFORMAT-PINNED-001 (NORMAL)
- SCENARIO-ETS-CLEANUP-MVN-TEST-VIA-DOCKER-001 (NORMAL)

## Spec References

- REQ-ETS-CLEANUP-019 (NEW — Sprint 7 carryover wedge bundle)

## Technical Notes

### Wedge 1 — sabotage-test.sh stdout VERDICT-summary tabulator fix (MEDIUM — Raze REC-1)
**File**: `scripts/sabotage-test.sh` (sister repo) — VERDICT-summary section
**Root cause**: Raze GAP-1 (Sprint 7): the human-readable stdout VERDICT-summary after sabotage execution
enumerates only 3 sibling classes (Subsystems, Procedures, Deployments) instead of all 5
(add SamplingFeatures, PropertyDefinitions — added in Sprint 7). The XML evidence is correct
(5-class cascade verified by Raze gate). The stdout summary lags by 2 newly-added classes.
**Fix**: Replace the hard-coded 3-class sibling enumeration in the VERDICT-summary with a
dynamic lookup that reads sibling class names from the cascade XML produced at run time, OR
read the testng.xml `<group depends-on="systemfeatures">` entries to enumerate all sibling
classes at bash time. The simplest approach:
```bash
# After cascade XML is produced, extract all class names that had SKIP from the XML:
SKIP_CLASSES=$(grep -oP '(?<=name=")[^"]+(?="[^>]*status="SKIP")' "$CASCADE_XML" \
  | sort -u | tr '\n' ', ')
echo "CASCADE VERDICT (stdout summary): Core+Common PASS | SystemFeatures FAIL | $SKIP_CLASSES SKIP"
```
Alternatively, grep testng.xml for `depends-on="systemfeatures"` group names at script load time
(more robust — doesn't require XML parse):
```bash
SIBLING_CLASSES=$(grep -oP '(?<=name=")[^"]+(?=" depends-on="systemfeatures")' \
  "$REPO_ROOT/src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/testng.xml" \
  | tr '\n' ' ')
```
**Estimated LOC**: ~5-10 LOC bash (replace 3-class hard-coded verdict line with dynamic enumeration)
**bash -x verification required**: Generator MUST run `bash scripts/sabotage-test.sh --target=systemfeatures`
from a /tmp clone and capture the stdout. Verify: the human-readable VERDICT-summary now lists
ALL 5 sibling classes (subsystems, procedures, deployments, samplingfeatures, propertydefinitions).
Archive the stdout transcript as an evidence artifact.
**Note**: The cascade XML itself is already correct. This is purely the human-readable stdout summary.

### Wedge 2 — spec.md REQ-018 + ADR-010 v4 5-class evidence pointer (LOW-MED — META-GAP-S7-1)
**Files**:
- `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` REQ-ETS-CLEANUP-018 narrative
- `_bmad/adrs/ADR-010-dependency-skip-verification-strategy.md` v3 retroval note / v4 amendment
**Root cause**: meta-Raze META-GAP-S7-1: spec.md REQ-018 narrative currently reads "live 3-class
cascade XML produced end-to-end" (lines ~353); ADR-010 lines 322-324 say "the 3-class verification
at Sprint 7 close is sufficient for the v3 amendment's VERIFIED LIVE status" and "Sprint 8+ sabotage
exec will further verify the 5-class cascade variant." Raze's gate-time 5-class XML (68KB at
`/tmp/raze-fresh-sprint7/test-results/sprint-ets-07-cascade-2026-04-30.xml`) proves 5-class cascade
was ALREADY achieved at Sprint 7. Both documents have spec drift.
**Fix**:
1. spec.md REQ-ETS-CLEANUP-018 narrative: add a parenthetical or append a sentence citing "Raze
   gate-time 5-class cascade XML (Sprint 7 Raze gate run, archived in sprint-ets-07-adversarial-
   cumulative.yaml evidence_artifacts) extends Generator's 3-class evidence to all 5 sibling classes."
   Update "live 3-class cascade" to "live cascade (3-class at Generator run; 5-class at Raze gate)."
2. ADR-010 v3 retroval note: replace "Sprint 8+ will further verify the 5-class cascade" with
   "5-class cascade VERIFIED at Sprint 7 Raze gate (2026-04-30T17:32Z; 5 sibling classes cascade-SKIP
   in Raze's /tmp/raze-fresh-sprint7/ run — Core+Common 12 PASS, SystemFeatures 1 FAIL+5 SKIP,
   Subsystems+Procedures+Deployments+SamplingFeatures+PropertyDefinitions all SKIP, total 25 SKIP).
   The ADR-010 v3 'Sprint 8+ will further verify' sentence is now RETIRED."
   This can be framed as an ADR-010 v4 amendment block appended to the file.
**Estimated LOC**: ~20 LOC doc edits across 2 files
**Note**: These are documentation-only edits. No Java or bash changes.

### Wedge 3 — design.md project-wide self-audit grep (MEDIUM — META-GAP-S7-3)
**File**: `openspec/capabilities/ets-ogcapi-connectedsystems/design.md` (and cross-check spec.md + ADRs)
**Root cause**: meta-Raze META-GAP-S7-3: Generator's Sprint 7 self-audit was scoped to design.md
lines 531-636 (the meta-Raze-flagged section). Raze Q12 found design.md lines 666-667 reference
historical try/finally and super.filter() in a "unit + integration test rules" block — Raze
classified these as "under the Historical section header at line 559" but meta-review noted this
classification was a judgment call (lines 666-667 are 100+ lines below the Historical header).
**Fix**:
1. Run the full project-wide grep:
   ```bash
   grep -n "super\.filter\|try/finally pattern guarantees\|ThrowingFilterContext\|mutate.*restore\|restore.*mutate" \
     openspec/capabilities/ets-ogcapi-connectedsystems/design.md \
     _bmad/adrs/*.md \
     openspec/capabilities/ets-ogcapi-connectedsystems/spec.md \
     | grep -v "Historical\|historical\|HISTORICAL\|superseded\|SUPERSEDED\|INVALIDATED"
   ```
2. For each hit, decide: (a) already bracketed by Historical header → add explicit INVALIDATED
   annotation at the hit line; (b) not bracketed → update or mark historical.
3. Specifically adjudicate design.md lines 666-667: the "unit test rules" block references
   `try/finally restoration even when super.filter() throws` — this describes a DELETED test.
   Either annotate with `// NOTE: try/finally test deleted in Sprint 6 — approach (i) eliminates
   super.filter() entirely; see Historical block above` or remove the stale rule entirely.
4. Archive the grep output as an evidence artifact: e.g. `docs/sprint-ets-08-01-self-audit-grep.txt`
   in sister repo (or in csapi_compliance ops/test-results/).
**Estimated LOC**: ~30-50 LOC doc edits (mostly annotation/deletion of stale lines)
**bash evidence required**: Generator MUST archive the grep output as proof that project-wide
search was performed. Quinn+Raze verify the archived grep output at gate time.
**Critical**: This is now a SUCCESS CRITERION in the contract (`generator_design_md_adr_self_audit_projectwide`).
Generator MUST produce the grep evidence artifact AT INITIAL CLOSE COMMIT, not as a Self-Raze follow-up.

### Wedge 4 — ops/test-results.md ETS-pointer block (LOW — Raze REC-3)
**File**: `ops/test-results.md` (csapi_compliance repo)
**Root cause**: Raze GAP-3 (Sprint 7): `ops/test-results.md` last updated 2026-04-17 — 13 days stale
at Sprint 7 close. This file was last updated during the web-app v1.0 era. All ETS test evidence
migrated to sister repo `ets-ogcapi-connectedsystems10/ops/test-results/` but csapi's file has
no pointer to the new location. CLAUDE.md step 5 mandate is weakly enforced for ETS work.
**Fix**: Prepend a prominent header block to `ops/test-results.md`:
```markdown
## ETS Test Evidence (Sprint 1 onward)

> **For ETS (Java/TestNG TeamEngine) test evidence, see sister repo:**
> `ets-ogcapi-connectedsystems10/ops/test-results/` at
> `https://github.com/Botts-Innovative-Research/ets-ogcapi-connectedsystems10/tree/main/ops/test-results/`
>
> Sprint 1–7 ETS test results archived in sister repo per ADR-005 (sibling-repo architecture).
> This file (`csapi_compliance/ops/test-results.md`) covers v1.0 web-app test results only.
> Last web-app test update: 2026-04-17T21:30Z (sprint sess-prog-001-assertion-depth).
```
**Estimated LOC**: ~8-10 LOC text prepend
**Note**: Documentation-only edit in csapi_compliance repo.

### Wedge 5 — spring-javaformat version pin (LOW — Quinn W3)
**File**: `pom.xml` (sister repo `ets-ogcapi-connectedsystems10/pom.xml`)
**Root cause**: Quinn W3 (Sprint 7): spring-javaformat-maven-plugin version is inherited
transitively without explicit pin. Sprint 7 demonstrated that a specific version (0.0.43) was
required for the two-line `if (true)` sabotage marker to pass formatting validation. If the
transitive version bumps to a future release with different formatting rules, the sabotage marker
injection might break again. Explicitly pinning prevents silent version drift.
**Fix**: Find the current transitive spring-javaformat version in pom.xml dependency management,
then add an explicit `<plugin>` declaration in `<build><pluginManagement>`:
```xml
<plugin>
  <groupId>io.spring.javaformat</groupId>
  <artifactId>spring-javaformat-maven-plugin</artifactId>
  <version>0.0.43</version>  <!-- explicit pin: Sprint 7 proved this version accepts two-line
                                   if (true) throw pattern; bump only after sabotage-test.sh verify -->
</plugin>
```
**Estimated LOC**: ~5 LOC pom.xml addition
**Note**: PIN the version currently in use (verify by running `mvn help:effective-pom | grep spring-javaformat -A2` to find current transitive version). Document the version choice in an inline XML comment referencing Sprint 7 lesson.

### Wedge 6 — scripts/mvn-test-via-docker.sh (Quinn mvn host PATH gap — META-GAP-S7-2)
**File**: `scripts/mvn-test-via-docker.sh` (NEW in sister repo)
**Root cause**: Quinn recurring limitation across ALL 7 ETS sprints: Quinn cannot run `mvn clean test`
on host because `mvn` is not on PATH (only available inside Docker). This means Quinn defers
surefire count verification to the Docker-baked path, weakening Quinn's independent mvn check.
meta-Raze META-GAP-S7-2 explicitly names this as a recurring pattern requiring a wrapper script.
**Fix**: Create `scripts/mvn-test-via-docker.sh` in sister repo. The script:
1. Builds a minimal Maven+JDK17 Docker image (or uses `maven:3.9-eclipse-temurin-17-alpine`)
2. Mounts the repo at `/workspace`
3. Runs `mvn clean test` inside the container with `-Dmaven.test.failure.ignore=false`
4. Streams stdout/stderr so the caller sees the surefire output
5. Exits with the Maven exit code
```bash
#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker run --rm \
  -v "$REPO_ROOT":/workspace \
  -w /workspace \
  maven:3.9-eclipse-temurin-17-alpine \
  mvn clean test -B "$@"
```
Usage: `bash scripts/mvn-test-via-docker.sh` from the sister repo root.
Update `ops/e2e-test-plan.md` (csapi_compliance) to reference this script in the Quinn evaluation
questions context. Update Sprint 8 contract `evaluation_questions_for_quinn` to require:
`bash scripts/mvn-test-via-docker.sh` from `/tmp/quinn-fresh-sprint8/` as the mvn test step.
**Estimated LOC**: ~20-30 LOC bash (wrapper) + ~5-10 LOC doc (e2e-test-plan.md update)

## Dependencies

None — this is the first story in Sprint 8. S-ETS-08-02 depends on this story.

## Definition of Done

- [ ] `bash scripts/sabotage-test.sh --target=systemfeatures` stdout VERDICT-summary enumerates ALL 5 sibling classes (not just 3)
- [ ] Generator archives stdout transcript from sabotage run as evidence artifact
- [ ] spec.md REQ-ETS-CLEANUP-018 narrative updated to cite Raze gate-time 5-class XML
- [ ] ADR-010 v4 amendment block added (or v3 retroval note amended) retiring "Sprint 8+ will verify" sentence
- [ ] Project-wide grep across design.md + all ADRs + spec.md for `super.filter` / `try/finally pattern guarantees` archived as grep evidence artifact
- [ ] design.md lines 666-667 adjudicated and annotated/corrected per grep results
- [ ] `ops/test-results.md` (csapi_compliance) has ETS-pointer header block
- [ ] spring-javaformat version explicitly pinned in pom.xml (sister repo)
- [ ] `scripts/mvn-test-via-docker.sh` exists and runs `mvn clean test` via Docker
- [ ] REQ-ETS-CLEANUP-019 status updated to IMPLEMENTED with evidence citations
- [ ] All existing tests continue to pass (mvn 86/0/0/3 baseline preserved)
- [ ] No regression in existing conformance classes

## Implementation Notes

Sprint 8 wedges are mostly documentation and small bash/config edits (~30-60 LOC total).
The critical verification step for Wedge 1 (sabotage stdout fix) requires a full Docker
build cycle (~5-8 min) from a /tmp clone. Wedge 6 (mvn-test-via-docker.sh) requires a
Docker pull of `maven:3.9-eclipse-temurin-17-alpine` the first time.

Generator sequencing recommendation (dependency-aware):
1. Wedge 4 (ops/test-results.md pointer — fastest, doc-only)
2. Wedge 2 (spec.md REQ-018 + ADR-010 v4 — doc-only; can be done while Docker context loads)
3. Wedge 3 (project-wide grep + design.md adjudication — run grep, review hits, annotate)
4. Wedge 5 (spring-javaformat pin — pom.xml edit + `mvn help:effective-pom` verify)
5. Wedge 6 (mvn-test-via-docker.sh — create script, test from /tmp clone)
6. Wedge 1 (sabotage stdout fix — requires full Docker build; last because longest)
