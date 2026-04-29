# Story: S-ETS-04-02 — Image-size v2: chown-layer attack + ADR-009 v2 amendment

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-04
**Priority**: P1 — Sprint 3 PARTIAL with empirical analysis identifying chown-layer as next target
**Estimated Complexity**: M
**Status**: Active (Sprint 4)

## Description

Sprint 3 S-ETS-03-04 PARTIAL closed at 660MB vs <550MB stretch target (3MB savings from 4-jar exact-basename dedupe). Empirical analysis at `sprint-ets-03-04-empirical-dedupe-list-2026-04-29.txt` established two truths:

1. **ADR-009's illustrative 200-300MB jar-dedupe projection was EMPIRICALLY FALSIFIED**: exact-basename overlap between `/usr/local/tomcat/lib` (TE common-libs) and `WEB-INF/lib` (ETS deps closure) is only 4 jars / 1.8MB on the actual TE 5.6.1 + ETS 0.1-SNAPSHOT post-ADR-006 (Jersey 3.x) layout. The illustrative numbers were off by an order of magnitude given the ADR-006 Jersey port already moved heavy jars to WEB-INF/lib.
2. **The dominant cost is an 80MB `RUN chown -R tomcat:tomcat /usr/local/tomcat` layer** that creates a duplicate copy of the entire tomcat tree (Docker COW snapshots the layer at file-attribute change, materializing the duplicate).

Sprint 4 attacks the chown layer via Docker buildkit `COPY --chown=tomcat:tomcat` syntax on each `COPY` directive — the chown happens in-place during COPY, no second layer materializes. Estimated savings: ~80MB → ~580MB image (Sprint 4 PASS target <600MB).

If the chown-layer attack alone doesn't reach <600MB, Generator may layer in iterative version-overlap dedupe per Sprint 3 empirical-dedupe-list tier-2 analysis (~7-8MB additional, smoke verification cycle required after each version excluded due to runtime-classloader binding risk per ADR-009 §"DO NOT dedupe" rule).

ADR-009 v2 amendment (or new ADR-011 superseding) records the empirical falsification + chown-layer attack rationale + Sprint 5+ next-target roadmap. Architect ratifies the ADR approach (in-place amendment vs new ADR) per Sprint 4 contract `deferred_to_architect` item 1.

## Acceptance Criteria

- [ ] Baseline current image size pre-change: `docker images <smoke-built-image> --format '{{.Size}}'` records the pre-Sprint-4 value (Sprint 3 close was 660MB)
- [ ] Every `COPY` directive in the Dockerfile refactored to add `--chown=tomcat:tomcat` (or equivalent user)
- [ ] Standalone `RUN chown -R tomcat:tomcat /usr/local/tomcat` directive DELETED
- [ ] Image rebuild (cache cold) succeeds; new size <600MB (Sprint 4 PASS target)
- [ ] If <600MB unreachable via chown-layer alone, layer in iterative version-overlap dedupe with smoke verification per excluded version
- [ ] Smoke 22+M PASS preserved (where M = Subsystems @Test count from S-ETS-04-05)
- [ ] ADR-009 amended in-place (Pat hypothesis) OR new ADR-011 authored (Architect's call) recording empirical falsification + chown-layer rationale + jar-list
- [ ] Sprint 4 close artifact at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-04-image-size-v2-<date>.txt` records pre/post sizes + chown-layer diff
- [ ] SCENARIO-ETS-CLEANUP-IMAGE-SIZE-V2-001 + SCENARIO-ETS-CLEANUP-ADR-009-V2-001 PASS

## Spec References

- REQ-ETS-CLEANUP-008 (modified) — extended with chown-layer attack v2
- REQ-ETS-CLEANUP-010 (NEW) — Image-size v2 chown-layer attack + ADR-009 v2 amendment

## Technical Notes

- Docker buildkit `COPY --chown=user:group <src> <dst>` syntax requires `# syntax=docker/dockerfile:1.4` (or higher) in the Dockerfile header; verify or add.
- Order of optimization: (1) baseline measure, (2) chown-layer attack, (3) re-measure, (4) tier-2 version-overlap dedupe ONLY if needed and ONLY with smoke verification per version excluded.
- Architect cycle expected before Generator starts: ADR-009 amendment vs new ADR-011 ratification + optional 5-min Architect scratch rebuild to verify the chown-layer attack actually materializes the predicted ~80MB savings.

## Dependencies

- Architect ratification of ADR-009 v2 amendment (or new ADR-011) approach

## Definition of Done

- [ ] Image size <600MB OR PARTIAL with explicit rationale at 600-650MB OR GAP at >650MB
- [ ] Smoke regression check: 22+M PASS post-optimization
- [ ] ADR-009 amended OR new ADR-011 authored + accepted
- [ ] Spec implementation status updated
- [ ] Sprint 4 close artifact archived
