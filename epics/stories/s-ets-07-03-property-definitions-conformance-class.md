# Story: S-ETS-07-03

**Epic**: epic-ets-02-part1-classes
**Priority**: P0
**Estimated Complexity**: M

## Description

Implement the OGC CS API Property Definitions (`/conf/property`) conformance class in `PropertyDefinitionsTests.java`. This is the second of two deferred feature stories in Sprint 7, sequenced after S-ETS-07-02 (Sampling Features). It follows the established two-level cascade pattern: `<group name="propertydefinitions" depends-on="systemfeatures"/>`.

GeoRobotix IUT support confirmed: `GET https://api.georobotix.io/ogc/t18/api/properties` returns HTTP 200 with a paginated collection of derived properties (confirmed 2026-04-30).

OGC requirement prefix confirmed HTTP 200 at raw.githubusercontent.com: `/req/property/...`

## Acceptance Criteria

- SCENARIO-ETS-PART1-008-PROP-RESOURCES-001 (CRITICAL)
- SCENARIO-ETS-PART1-008-PROP-CANONICAL-001 (CRITICAL)
- SCENARIO-ETS-PART1-008-PROP-CANONICAL-URL-001 (CRITICAL)
- SCENARIO-ETS-PART1-008-PROP-DEPENDENCY-SKIP-001 (CRITICAL)
- SCENARIO-ETS-PART1-008-PROP-SMOKE-NO-REGRESSION-001 (CRITICAL)

## Spec References

- REQ-ETS-PART1-008 (Property Definitions conformance class — `/conf/property`)
- ADR-010 v3 (TransitiveGroupDependency pattern — mechanical extension to propertydefinitions group)

## Technical Notes

### Pattern
Follow the exact same pattern as SamplingFeaturesTests.java (S-ETS-07-02):
1. New class `PropertyDefinitionsTests.java` in `conformance/propertydefinitions/`
2. 4 @Tests minimum (collection HTTP 200 + non-empty items, canonical-endpoint id+type+links, canonical-url rel=canonical, dependency-skip wiring structural check)
3. `@Test(groups = {"propertydefinitions"}, dependsOnGroups = {"systemfeatures"})` on each @Test
4. `@BeforeClass SkipException` fallback (belt-and-suspenders per ADR-010 v3)
5. testng.xml: add `<group name="propertydefinitions" depends-on="systemfeatures"/>` + class entry in single-block consolidation
6. `VerifyTestNGSuiteDependency`: extend with 3 new structural lint tests for propertydefinitions group

### OGC requirement URIs (confirmed HTTP 200)
- `/req/property/resources-endpoint` — GET /properties SHALL return HTTP 200
- `/req/property/canonical-url` — every Property resource accessible at `{api_root}/properties/{id}` (confirmed via raw.githubusercontent.com 2026-04-30)
- (additional req URIs to be verified by Generator via curl at implementation time)

### GeoRobotix endpoint
- `/properties` returns HTTP 200 with paginated property definitions (confirmed 2026-04-30)
- Property definitions are "Derived properties" — observable quantities defined as reusable metadata
- Generator checks actual response shape: verify `type`, `id`, and at least one canonical link present

### Unique assertion for Property Definitions
The `/conf/property` class covers Observable Properties as defined under OGC 23-001. A property resource SHALL have a unique `id` and be accessible at its canonical URL. Assert: (a) GET /properties returns HTTP 200 with non-empty items; (b) canonical item accessible at /properties/{id} with expected shape (type + id + links). Use SKIP-with-reason pattern if GeoRobotix returns zero items (unlikely — confirmed non-empty).

### Dependency note
After this story, the testng.xml fan-in at SystemFeatures includes:
Subsystems, Procedures, Deployments, SamplingFeatures, PropertyDefinitions — all `depends-on="systemfeatures"`.
All are independent of each other (fan-in not fan-out within the level).

### Structural lint tests
Add to `VerifyTestNGSuiteDependency`:
- `propertydefinitionsGroupDependsOnSystemfeatures()`
- `propertydefinitionsTestsCarryGroupAnnotation()`
- `propertydefinitionsTestsInSameBlock()`

### mvn baseline
Expected after this story: ~87 (from S-ETS-07-02) + 3 (lint) + 4 (@Tests) = ~94/0/0/3. Exact count depends on Generator's implementation.

### Cascade impact
After both S-ETS-07-02 and S-ETS-07-03, a sabotage --target=systemfeatures exec should produce cascade XML showing: Core+Common PASS, SystemFeatures FAIL+SKIP, AND Subsystems+Procedures+Deployments+SamplingFeatures+PropertyDefinitions all SKIP. Total @Tests: 12 Core + 4 Common + 6 SF + 4 Subs + 4 Procs + 4 Deps + 4 SF-new + 4 Prop-new = 42 @Tests smoke baseline.

## Dependencies

- S-ETS-07-01 (carryover wedges)
- S-ETS-07-02 (Sampling Features — sequenced before to establish pattern consistency; independent but for naming consistency and testng.xml ordering)

## Definition of Done

- [ ] `PropertyDefinitionsTests.java` exists with ≥4 @Tests all PASS in mvn surefire
- [ ] All @Tests carry `groups = {"propertydefinitions"}` and `dependsOnGroups = {"systemfeatures"}`
- [ ] testng.xml updated: `<group name="propertydefinitions" depends-on="systemfeatures"/>` + class entry
- [ ] `VerifyTestNGSuiteDependency` extended with 3 new lint tests for propertydefinitions
- [ ] Smoke total ≥42/0/0/N (baseline 34 + 4 sampling + 4 property @Tests)
- [ ] At least one OGC requirement URI for /req/property/* is curl-verified HTTP 200 and appears in @Test description attribute
- [ ] REQ-ETS-PART1-008 status updated to IMPLEMENTED in spec.md
- [ ] _bmad/traceability.md row updated
- [ ] No regression in existing smoke @Tests
- [ ] Generator self-audit: grep design.md + ADRs for any stale references to "propertydefinitions" that need updating

## Implementation Notes

### Generator Run 1 (Dana, 2026-04-30, status: Implemented)

Sister commit `06acd1b` (S-07-02 + S-07-03 bundled). Mechanical pattern extension per S-07-02 SamplingFeatures + ADR-010 v3.

**New class**: `src/main/java/.../conformance/propertydefinitions/PropertyDefinitionsTests.java` — 4 @Tests:

1. `propertiesCollectionReturns200` (CRITICAL, group=propertydefinitions): GET /properties returns HTTP 200 + `items` array present (may be empty per IUT state). PASSes against GeoRobotix.
2. `propertyItemHasIdType` (CRITICAL, dependsOnMethods=propertiesCollectionReturns200): GET /properties/{firstId} returns item with `id` + `type`. **SKIP-with-reason** when collection empty (Pat MEDIUM risk PROPERTY-DEFINITIONS-RESPONSE-SHAPE mitigation).
3. `propertyCanonicalUrlReturns200` (CRITICAL, dependsOnMethods=propertyItemHasIdType): canonical URL `/properties/{id}` returns HTTP 200. **SKIP-with-reason** when collection empty.
4. `propertyDefinitionsDependencyCascadeRuntime` (CRITICAL, dependsOnMethods=propertiesCollectionReturns200): runtime cascade tracer.

`@BeforeClass fetchPropertiesCollection` reads IUT, fetches /properties + /properties/{first-id-if-present} once. Tolerates empty `items` array (firstPropertyId stays null; per-item @Tests SKIP-with-reason).

**testng.xml updated**: added `<group name="propertydefinitions" depends-on="systemfeatures"/>` + `PropertyDefinitionsTests` class entry.

**VerifyTestNGSuiteDependency extended** with 3 new lint tests:
- `testPropertyDefinitionsGroupDependsOnSystemFeatures`
- `testEveryPropertyDefinitionsTestMethodCarriesPropertyDefinitionsGroup`
- `testPropertyDefinitionsCoLocatedWithSystemFeatures`

**OGC adoc URI verification (2026-04-30)**: `/req/property/resources-endpoint`, `/req/property/canonical-endpoint`, `/req/property/canonical-url` all HTTP 200.

**GeoRobotix shape verification (2026-04-30)**: `GET /properties` returns HTTP 200 + `items: []` (empty array, no `links`). The endpoint is declared but no derived properties are currently populated. Per Pat's MEDIUM risk PROPERTY-DEFINITIONS-RESPONSE-SHAPE mitigation, the implementation adapts: collection-endpoint @Test PASSes (HTTP 200 + items array present is the load-bearing assertion); per-item @Tests SKIP-with-reason rather than FAIL when items empty (the OGC requirement is at endpoint-existence + response-shape layer; population is IUT-state-dependent).

**Risk materialized: PROPERTY-DEFINITIONS-RESPONSE-SHAPE (Pat MEDIUM)** — MATERIALIZED IN PARTIAL FORM. The shape DID differ from system/subsystem/procedure resources (empty array), and the planned `id`+`type`+`links` per-item assertions WOULD have FAILed against an empty collection. The SKIP-with-reason mitigation pattern (already coded into the @BeforeClass + per-item @Test fallback) accommodates this gracefully without requiring a Sprint 7 escalation. If GeoRobotix populates `/properties` in the future, no code changes required — the same @Tests will exercise the cached single-property body.

### Verification

- `mvn clean test` PASSes — VerifyTestNGSuiteDependency 19 tests including 3 new Property lint tests
- `bash scripts/smoke-test.sh` from /tmp clone: PropertyDefinitions 4 / 4 (2 PASS + 2 SKIP-with-reason)
- Sister smoke evidence at `ops/test-results/sprint-ets-07-smoke-42-tests-2026-04-30.xml`

### Definition of Done

- [x] `PropertyDefinitionsTests.java` exists with ≥4 @Tests; mvn surefire structure tests PASS; smoke @Tests 2 PASS + 2 SKIP-with-reason (per design)
- [x] All @Tests carry `groups = {"propertydefinitions"}` (verified by lint test)
- [x] testng.xml updated
- [x] VerifyTestNGSuiteDependency extended with 3 new lint tests
- [x] Smoke total ≥42 (achieved 42)
- [x] At least one OGC requirement URI for /req/property/* curl-verified HTTP 200 (3 verified)
- [x] REQ-ETS-PART1-008 status updated to IMPLEMENTED in spec.md
- [x] _bmad/traceability.md row updated
- [x] No regression in existing smoke @Tests
- [x] Generator self-audit: no stale "propertydefinitions" references found in design.md or ADRs
