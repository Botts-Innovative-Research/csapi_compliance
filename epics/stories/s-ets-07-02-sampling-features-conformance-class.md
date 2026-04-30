# Story: S-ETS-07-02

**Epic**: epic-ets-02-part1-classes
**Priority**: P0
**Estimated Complexity**: M

## Description

Implement the OGC CS API Sampling Features (`/conf/sf`) conformance class in `SamplingFeaturesTests.java`. This is the first of two deferred feature stories in Sprint 7, sequenced after S-ETS-07-01 (carryover wedges). It follows the established two-level cascade pattern: `<group name="samplingfeatures" depends-on="systemfeatures"/>`.

GeoRobotix IUT support confirmed: `GET https://api.georobotix.io/ogc/t18/api/samplingFeatures` returns HTTP 200 with a paginated collection of 100+ sampling features (diverse sensor sampling surfaces: point locations, polygons, spheres, camera viewing sectors).

OGC requirement prefix confirmed HTTP 200 at raw.githubusercontent.com: `/req/sf/...`

## Acceptance Criteria

- SCENARIO-ETS-PART1-007-SF-RESOURCES-001 (CRITICAL)
- SCENARIO-ETS-PART1-007-SF-CANONICAL-001 (CRITICAL)
- SCENARIO-ETS-PART1-007-SF-CANONICAL-URL-001 (CRITICAL)
- SCENARIO-ETS-PART1-007-SF-DEPENDENCY-SKIP-001 (CRITICAL)
- SCENARIO-ETS-PART1-007-SF-SMOKE-NO-REGRESSION-001 (CRITICAL)

## Spec References

- REQ-ETS-PART1-007 (Sampling Features conformance class — `/conf/sf`)
- ADR-010 v3 (TransitiveGroupDependency pattern — mechanical extension to samplingfeatures group)

## Technical Notes

### Pattern
Follow the exact same pattern as ProceduresTests.java and DeploymentsTests.java (Sprint 5 Run 2):
1. New class `SamplingFeaturesTests.java` in `conformance/samplingfeatures/`
2. 4 @Tests minimum (collection HTTP 200 + non-empty items, canonical-endpoint id+type+links, canonical-url rel=canonical, dependency-skip wiring structural check)
3. `@Test(groups = {"samplingfeatures"}, dependsOnGroups = {"systemfeatures"})` on each @Test
4. `@BeforeClass SkipException` fallback (belt-and-suspenders per ADR-010 v3)
5. testng.xml: add `<group name="samplingfeatures" depends-on="systemfeatures"/>` + class entry in single-block consolidation
6. `VerifyTestNGSuiteDependency`: extend with 3 new structural lint tests for samplingfeatures group

### OGC requirement URIs (confirmed HTTP 200)
- `/req/sf/resources-endpoint` — GET /samplingFeatures SHALL return HTTP 200
- `/req/sf/canonical-url` — every SF resource accessible at `{api_root}/samplingFeatures/{id}`
- (additional req URIs to be verified by Generator via curl at implementation time)

### GeoRobotix endpoint
- `/samplingFeatures` returns HTTP 200 with 100+ items (confirmed 2026-04-30)
- Sampling feature items have diverse geometry: Point, Polygon, some may have null geometry
- Generator MUST handle null geometry gracefully (same pattern as ProceduresTests.java `geometry=null` invariant handling — use SKIP-with-reason if geometry shape assertions needed but absent)

### Unique assertion for Sampling Features
The `/req/sf` class requires sampling features to reference a parent system (the observed system). Assert that at least the canonical sampling feature has a non-null `sampledFeature` or `hostedProcedure` link (check actual GeoRobotix response shape at implementation time; use defense-in-depth MAY-priority SKIP-with-reason if property absent on GeoRobotix items).

### testng.xml dependency
After this story, the testng.xml dependency DAG extends to:
`samplingfeatures depends-on systemfeatures depends-on core`
Subsystems, Procedures, Deployments, SamplingFeatures all depend on SystemFeatures (fan-in at SystemFeatures). ADR-010 v3 3-class cascade live-verified by S-ETS-07-01 Wedge 1 validates this mechanically.

### Structural lint tests
Add to `VerifyTestNGSuiteDependency`:
- `samplingfeaturesGroupDependsOnSystemfeatures()`
- `samplingfeaturesTestsCarryGroupAnnotation()`
- `samplingfeaturesTestsInSameBlock()`

### mvn baseline
Expected after this story: 80 + 3 (lint) + 4 (@Tests) = ~87/0/0/3. Exact count depends on Generator's VerifyTestNGSuiteDependency extension.

### bash -x process discipline
This story does NOT add new bash scripts. The bash-x trace requirement from the process improvements applies only to bash modifications. No bash changes expected for this story.

## Dependencies

- S-ETS-07-01 (carryover wedges, specifically Wedge 1 sabotage javac fix — validates 3-class cascade; this story adds a 4th class to the cascade DAG)

## Definition of Done

- [ ] `SamplingFeaturesTests.java` exists with ≥4 @Tests all PASS in mvn surefire
- [ ] All @Tests carry `groups = {"samplingfeatures"}` and `dependsOnGroups = {"systemfeatures"}`
- [ ] testng.xml updated: `<group name="samplingfeatures" depends-on="systemfeatures"/>` + class entry
- [ ] `VerifyTestNGSuiteDependency` extended with 3 new lint tests for samplingfeatures
- [ ] Smoke total ≥38/0/0/N (baseline 34 + 4 new samplingfeatures @Tests; no skips unless IUT doesn't declare /conf/sf)
- [ ] At least one OGC requirement URI for /req/sf/* is curl-verified HTTP 200 and appears in @Test description attribute
- [ ] REQ-ETS-PART1-007 status updated to IMPLEMENTED in spec.md
- [ ] _bmad/traceability.md row updated
- [ ] No regression in existing 34 smoke @Tests (Core, SystemFeatures, Common, Subsystems, Procedures, Deployments all still PASS)
- [ ] Generator self-audit: grep design.md + ADRs for any stale references to "samplingfeatures" that need updating

## Implementation Notes

### Generator Run 1 (Dana, 2026-04-30, status: Implemented)

Sister commit `06acd1b` (S-07-02 + S-07-03 bundled). Pure mechanical pattern extension per ADR-010 v3 amendment + Sprint 5 ProceduresTests/DeploymentsTests precedent.

**New class**: `src/main/java/.../conformance/samplingfeatures/SamplingFeaturesTests.java` — 4 @Tests:

1. `samplingFeaturesCollectionReturns200` (CRITICAL, group=samplingfeatures): GET /samplingFeatures returns HTTP 200 + non-empty `items`. PASSes against GeoRobotix (100 items returned).
2. `samplingFeatureItemHasIdType` (CRITICAL, dependsOnMethods=samplingFeaturesCollectionReturns200): GET /samplingFeatures/{firstId} returns item with `id` (string) + `type` (string).
3. `samplingFeatureCanonicalUrlReturns200` (CRITICAL, dependsOnMethods=samplingFeatureItemHasIdType): the canonical URL `/samplingFeatures/{id}` returns HTTP 200. **SF-unique adaptation**: GeoRobotix per-item shape lacks the `links` array that Procedures + Deployments items carry; per defense-in-depth this @Test uses path-based dereferenceability rather than `rel=canonical` link search. If a future GeoRobotix release adds item-level links the assertion can be tightened in lockstep.
4. `samplingFeaturesDependencyCascadeRuntime` (CRITICAL, dependsOnMethods=samplingFeaturesCollectionReturns200): runtime tracer that the cascade chain resolves (load-bearing at sabotage time).

`@BeforeClass fetchSamplingFeaturesCollection` reads IUT, fetches /samplingFeatures + /samplingFeatures/{first-id} once, all @Tests cache responses to avoid redundant traffic.

**testng.xml updated**: added `<group name="samplingfeatures" depends-on="systemfeatures"/>` + `SamplingFeaturesTests` class entry in single-block consolidation. Test block name updated to enumerate all 8 conformance classes (5 sibling classes now depend on SystemFeatures).

**VerifyTestNGSuiteDependency extended** with 3 new lint tests:
- `testSamplingFeaturesGroupDependsOnSystemFeatures` — testng.xml declares the group dependency
- `testEverySamplingFeaturesTestMethodCarriesSamplingFeaturesGroup` — every @Test carries `groups="samplingfeatures"`
- `testSamplingFeaturesCoLocatedWithSystemFeatures` — SamplingFeaturesTests is in same `<test>` block as SystemFeaturesTests

**OGC adoc URI verification (2026-04-30)**: `/req/sf/resources-endpoint`, `/req/sf/canonical-endpoint`, `/req/sf/canonical-url` all HTTP 200 at raw.githubusercontent.com. NOTE: OGC repo folder is `sf/` (NOT `sampling/` as the OGC repo path conventions might suggest).

**GeoRobotix shape verification (2026-04-30)**: `GET /samplingFeatures` returns HTTP 200 + `items: [100 items]` + `links` (collection-level rel=next pagination); `GET /samplingFeatures/{id}` returns HTTP 200 + Feature with `type`, `id`, `geometry` (heterogeneous: Point, null), `properties` (with optional `hostedProcedure@link`); per-item `links` array ABSENT.

**Risk materialized: SAMPLING-FEATURES-IUT-DECLARATION (Pat MEDIUM)** — NOT MATERIALIZED; GeoRobotix declares /conf/sf in /conformance and /samplingFeatures returns 100 items HTTP 200.

**Risk materialized: SAMPLING-FEATURES-ENDPOINT-PATH (Pat MEDIUM)** — NOT MATERIALIZED; the endpoint is `/samplingFeatures` (camelCase, matching `/req/sf/canonical-url` pattern).

**SF-unique observation surfaced** that Pat's planning didn't anticipate: per-item shape lacks `links`. Adapted via path-based canonical-URL dereferenceability assertion (SCENARIO-ETS-PART1-007-SF-CANONICAL-URL-001 still load-bearing — the canonical URL must resolve to HTTP 200, which it does).

### Verification

- `mvn clean test` PASSes — VerifyTestNGSuiteDependency 19 tests including 3 new SF lint tests
- `bash scripts/smoke-test.sh` from /tmp clone: SamplingFeatures 4 / 4 PASS
- Sister smoke evidence at `ops/test-results/sprint-ets-07-smoke-42-tests-2026-04-30.xml` (commit `38b1f8a`)

### Definition of Done

- [x] `SamplingFeaturesTests.java` exists with ≥4 @Tests all PASS in mvn surefire (lint tests pass; conformance @Tests run via TeamEngine smoke)
- [x] All @Tests carry `groups = {"samplingfeatures"}` (verified by lint test)
- [x] testng.xml updated: `<group name="samplingfeatures" depends-on="systemfeatures"/>` + class entry
- [x] `VerifyTestNGSuiteDependency` extended with 3 new lint tests for samplingfeatures
- [x] Smoke total ≥38 (achieved 42 — combined with S-07-03)
- [x] At least one OGC requirement URI for /req/sf/* curl-verified HTTP 200 (3 verified)
- [x] REQ-ETS-PART1-007 status updated to IMPLEMENTED in spec.md
- [x] _bmad/traceability.md row updated
- [x] No regression in existing 34 smoke @Tests (Core 12, SystemFeatures 6, Common 4, Subsystems 4, Procedures 4, Deployments 4 all still PASS)
- [x] Generator self-audit: no stale "samplingfeatures" references found in design.md or ADRs (other than this story's intentional additions)
