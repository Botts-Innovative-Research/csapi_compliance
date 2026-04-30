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

(To be filled by Generator at run time.)
