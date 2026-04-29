# S-ETS-03-04: Docker image size optimization (Sprint 3 stretch <550MB)

> Status: Active — Sprint 3 | Epic: ETS-04 | Priority: P1 | Complexity: M | Last updated: 2026-04-29

## Description
Close Sprint 2 cleanup GAP-1 (image size 815MB build-test variant / 663MB smoke variant; ADR-009 §"Image size target" soft target ≤450MB; missed by 47-81%). ADR-009 §"Negative" explicitly allows Sprint 3 deferral with rationale. Quinn cleanup GAP-1 enumerated three approach options:

- **(a) TE common-libs ↔ deps-closure dedupe** (recommended): the 60-80 jars in `/usr/local/tomcat/lib` (from `teamengine-web-common-libs.zip`) overlap with the 96 jars in `/usr/local/tomcat/webapps/teamengine/WEB-INF/lib` (from `mvn dependency:copy-dependencies` closure). De-dupe by listing TE common-libs and excluding from `COPY --from=builder lib-runtime`. **Estimate: 200-300MB savings → ~363-463MB runtime image**. Minimal layout change; smoke verification straightforward.
- **(b) Distroless runtime stage** (`gcr.io/distroless/java17-debian12`): ~60-100MB image. **Rejected for Sprint 2** per ADR-009 §Alternatives (TomCat 8.5 + TE 5.6.1's bash-script-based startup may not work in no-shell distroless). Defer to Sprint 5+.
- **(c) Multi-stage refinement** (alpine variant of tomcat:8.5-jre17 base OR `mvn dependency:copy-dependencies -DincludeScope=runtime` to drop test-scope transitives): ~50-100MB savings, smaller impact than (a) but lower risk.

Architect ratifies which approach (or combination) — see Sprint 3 contract `deferred_to_architect` item 3. Pat recommends (a) per Quinn's recommendation. Sprint 3 acceptance: image size <550MB (Sprint 3 stretch goal — more permissive than ADR-009's 450MB; if Generator hits 450MB, even better; if Generator misses 550MB, mark PARTIAL with explicit rationale and defer the residual to Sprint 4).

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CLEANUP-008 (NEW — Docker image size <550MB), REQ-ETS-CLEANUP-004 (modified — extends Sprint 2 multi-stage Dockerfile scope with size optimization)
- Scenarios: SCENARIO-ETS-CLEANUP-IMAGE-SIZE-001 (NORMAL)

## Acceptance Criteria
- [ ] Architect ratifies optimization approach (a / b / c / combination) — see Sprint 3 contract `deferred_to_architect` item 3
- [ ] Dockerfile updated per ratified approach
- [ ] If approach (a) — TE common-libs dedupe: `COPY --from=builder` step explicitly excludes the jars also present in `/usr/local/tomcat/lib` (from `teamengine-web-common-libs.zip`); list-of-excluded-jars documented inline OR in ADR-009 amendment / ADR-010
- [ ] Image size measured via `docker images <smoke-built-image> --format '{{.Size}}'` shows <550MB (Sprint 3 stretch); IDEAL <450MB (ADR-009 soft target); PARTIAL acceptable if 550-700MB with explicit rationale
- [ ] Smoke must still 12+6+N PASS post-optimization (16+N for Common count; verify exit 0 + non-empty TestNG report + zero ERROR-level container logs)
- [ ] Reproducible build preserved (jar sha256 byte-identical across two consecutive fresh-clone builds)
- [ ] Non-root USER tomcat preserved (Sprint 2 invariant)
- [ ] Multi-stage architecture preserved (Sprint 2 invariant — no regression to single-stage)
- [ ] mvn clean install green: surefire same as pre-optimization (no new tests required by this story; image-size verification is a `docker images` check)
- [ ] design.md §"Sprint 2 Ratifications" / "Dockerfile multi-stage build" amended OR new §"Sprint 3 image-size optimization" subsection added documenting the dedupe approach
- [ ] Optional ADR-009 amendment documenting empirical Dockerfile adjustments (per Raze cleanup CONCERN-3 anticipation) OR new ADR-010 if Architect prefers separate ADR
- [ ] REQ-ETS-CLEANUP-008 status updated PLACEHOLDER → IMPLEMENTED in spec.md
- [ ] SCENARIO-ETS-CLEANUP-IMAGE-SIZE-001 PASSes (PASS at <550MB; PARTIAL with rationale acceptable at 550-700MB)

## Tasks
1. Architect ratifies optimization approach (a / b / c / combination)
2. Generator measures baseline: `docker images <Sprint-2-smoke-built-image>` reports current size
3. If approach (a): Generator catalogs TE common-libs jars (`unzip -l teamengine-web-common-libs.zip | grep '\.jar$' | awk '{print $4}' | sort -u`); compares to `target/lib-runtime/*.jar`; identifies overlap set
4. Generator updates Dockerfile to exclude overlap set from `COPY --from=builder lib-runtime/`
5. Generator rebuilds via multi-stage Dockerfile + measures new image size
6. Generator runs smoke against GeoRobotix; verifies 12+6+N PASS
7. Generator iterates if size still >550MB (or accepts PARTIAL with rationale)
8. Generator updates design.md (and optionally ADR-009 amendment / new ADR-010) per Architect's ratified approach
9. Update spec.md REQ-ETS-CLEANUP-008 PLACEHOLDER → IMPLEMENTED (or PARTIAL with rationale)
10. Update _bmad/traceability.md with REQ-ETS-CLEANUP-008 row

## Dependencies
- Depends on: Architect ratification of approach
- May benefit from sequencing AFTER S-ETS-03-07 (Common conformance class) to verify image-size optimization preserves smoke 18+N PASS, not just 16/16

## Implementation Notes

### TE common-libs catalog (approach a primer)
Pat hasn't run this; Generator's first task:
```bash
$ unzip -l ets-ogcapi-connectedsystems10/<somewhere>/teamengine-web-5.6.1-common-libs.zip \
  | awk '$4 ~ /\.jar$/ {print $4}' | sort -u | head -20
# Expect: jaxb-api-*.jar, jersey-*-*.jar, jackson-*.jar, slf4j-api-*.jar, etc — overlap with our deps closure
```

The dedupe excludes from `target/lib-runtime/*.jar` any jar whose basename also appears in the TE common-libs zip. Caveat: version mismatches (TE common-libs may have older Jersey 2.x vs our Jersey 3.1.8 — keeping ours is required for ADR-006 Jakarta EE 9 compatibility); the dedupe must compare basename + version, not just basename. Architect ratifies the matching strategy in advance.

### Estimated effort
2-4 hours Generator wall-clock. Approach (a) dominant time-sink: cataloging the overlap set + testing dedupe doesn't break smoke. ~4 dedupe iterations expected (each iteration: rebuild + smoke + measure).

### Sprint 4 carryover risk
If Generator hits 550-700MB, that's PARTIAL acceptable. If Generator hits >700MB, that's a Sprint 3 GAP — defer to Sprint 4 with explicit Quinn cleanup GAP-1 Option (b) distroless investigation as the next step.

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Image size <550MB (PASS) OR 550-700MB (PARTIAL with rationale) measured + documented
- [ ] Smoke 12+6+N PASS preserved post-optimization
- [ ] Reproducibility preserved
- [ ] Spec implementation status updated (REQ-ETS-CLEANUP-008 IMPLEMENTED or PARTIAL)
- [ ] Story status set to Done in this file and in `epic-ets-04-teamengine-integration.md`
- [ ] Sprint 3 contract success_criterion `image_size_under_550mb: true` met OR PARTIAL with rationale
