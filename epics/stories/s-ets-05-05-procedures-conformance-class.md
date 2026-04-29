# Story: S-ETS-05-05 — Implement CS API Procedures (/conf/procedure-features) conformance class end-to-end against GeoRobotix

**Epic**: epic-ets-02-part1-classes
**Sprint**: ets-05
**Priority**: P0 — New feature; mechanical extension of Subsystems pattern
**Estimated Complexity**: M
**Status**: Active (Sprint 5)

## Description

Fourth additional Part 1 conformance class beyond Core (Sprint 1) + SystemFeatures (Sprint 2) +
Common (Sprint 3) + Subsystems (Sprint 4). Mirrors the S-ETS-04-05 architectural pattern exactly:
new `conformance.procedures.ProceduresTests` subpackage, REQ-ETS-PART1-006 expanded from
PLACEHOLDER → SPECIFIED with full per-assertion enumeration, SCENARIO-ETS-PART1-006-* added,
testng.xml wired with `<group name="procedures" depends-on="systemfeatures"/>`.

**OGC 23-001 Annex A `/conf/procedure-features/`** — 5 sub-reqs verified 2026-04-29 via
`raw.githubusercontent.com/.../requirements/procedure/requirements_class_procedure_features.adoc`:
```
identifier:: /req/procedure
requirement:: /req/procedure/location
requirement:: /req/procedure/canonical-url
requirement:: /req/procedure/resources-endpoint
requirement:: /req/procedure/canonical-endpoint
requirement:: /req/procedure/collections
```

**Unique to Procedures**: `/req/procedure/location` states that a Procedure feature resource
SHALL NOT include a location or geometry. This is NOT present in Subsystems, SystemFeatures, or
Core. Generator MUST assert the geometry=null invariant for each Procedure item.

**GeoRobotix shape-verification** (Pat-time 2026-04-29 — Generator must re-verify at sprint time):
- `GET /procedures` → HTTP 200, 19 items (first id=164p7ed8l47g, type=Feature,
  links=[canonical, alternate, alternate])
- `GET /procedures/164p7ed8l47g` → HTTP 200, id=164p7ed8l47g, type=Feature,
  links=[canonical, alternate, alternate]
- **Generator MUST check geometry field** in /procedures/{id} response before writing the
  location assertion. If geometry=null: assert null (PASS for conformant IUT). If geometry
  is non-null: flag as IUT conformance gap and use SKIP-with-reason.

## Acceptance Criteria

- [ ] `curl -sf https://api.georobotix.io/ogc/t18/api/procedures` before writing assertions;
      archive curl evidence into Implementation Notes
- [ ] `curl -sf https://api.georobotix.io/ogc/t18/api/procedures/164p7ed8l47g` before writing
      per-item assertions; verify geometry field value; archive into Implementation Notes
- [ ] OGC `.adoc` canonical URIs HTTP-200-verified for all 5 sub-reqs at
      `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/procedure/`
- [ ] `org.opengis.cite.ogcapiconnectedsystems10.conformance.procedures.ProceduresTests` class
      created with **4-5 @Test methods** (Sprint-1-style minimal):
  - `proceduresCollectionReturnsHttp200`: GET /procedures returns 200 + non-empty items array
    per `/req/procedure/resources-endpoint`
  - `procedureItemHasCanonicalLink`: GET /procedures/{id} returns item with rel="canonical" link
    per `/req/procedure/canonical-url`
  - `procedureItemHasBaseShape`: GET /procedures/{id} returns item with id, type, links fields
    per `/req/procedure/canonical-endpoint` + REQ-ETS-CORE-004 base shape
  - `procedureItemHasNoGeometry`: Each Procedure item's geometry field is null or absent
    per `/req/procedure/location` (UNIQUE to Procedures — not in Subsystems pattern)
  - Optional 5th: `proceduresDiscoverableViaCollections` per `/req/procedure/collections`
    (SKIP-with-reason if /collections doesn't list /procedures)
- [ ] All @Test descriptions prefix OGC document number + canonical `/req/procedure/<X>` URI
      (e.g. `OGC-23-001 /req/procedure/resources-endpoint`)
- [ ] All @Test methods use ETSAssert helpers (zero new bare `throw new AssertionError` or
      `Assert.fail`)
- [ ] testng.xml extended with:
  - Procedures `<class>` entry in single-block consolidation
  - `<group name="procedures" depends-on="systemfeatures"/>` in the `<dependencies>` block
- [ ] Smoke total = 26 (existing) + P (Procedures @Test count, target 4-5) PASS against GeoRobotix
- [ ] `mvn clean install` BUILD SUCCESS (surefire 64+N+P/0/0/3)
- [ ] SCENARIO-ETS-PART1-006-PROCEDURES-RESOURCES-001, -LOCATION-001, -CANONICAL-001,
      -CANONICAL-URL-001, -DEPENDENCY-SKIP-001 PASS
- [ ] Sprint 5 artifact archived at `ops/test-results/sprint-ets-05-05-procedures-georobotix-smoke-<date>.xml`

## Spec References

- REQ-ETS-PART1-006 (Procedures — expanded from PLACEHOLDER → SPECIFIED)

## Technical Notes

**Pattern template** (mirrors S-ETS-04-05 Subsystems exactly; use as reference):
- `conformance/procedures/ProceduresTests.java` — new class
  - @Groups annotation: `groups = {"procedures"}` (matches testng.xml group name)
  - SuiteFixture + CommonFixture injection (same pattern as SubsystemsTests)
  - 4 @Test methods listed above
  - ETSAssert helpers throughout (zero bare-throw sites)
  - OGC canonical URI form from day 1 per S-ETS-02-03 discipline
- `VerifyProceduresTests.java` in src/test/java — new unit test class
  - ~5-10 @Test methods covering: class compiles, @Test annotations present, group
    declaration correct, testng.xml dependency declared
- testng.xml extension: add `<class name="...conformance.procedures.ProceduresTests"/>` to
  the existing single-block consolidation; add `<group name="procedures"
  depends-on="systemfeatures"/>` to the `<dependencies>` block.

**geometry=null invariant**: After verifying GeoRobotix /procedures/{id} geometry value,
implement:
```java
// If geometry confirmed null in GeoRobotix:
Object geometry = response.jsonPath().get("geometry");
ETSAssert.assertNull(geometry, OGC_23001 + "/req/procedure/location",
    "Procedure feature SHALL NOT include a geometry");
```
If GeoRobotix returns non-null: use SKIP-with-reason pattern and document in Implementation Notes.

**dependency-skip verification**: testng.xml structural lint (VerifyTestNGSuiteDependency
extension) covers the structural dependency. Behavioral verification (bash sabotage cascade)
will be done via S-ETS-05-03 --target=systemfeatures flag (after Procedures is wired, the
sabotage cascade XML will show Procedures @Tests SKIPping).

## Dependencies

- Sprint 4 Subsystems pattern (S-ETS-04-05) already established — use as template
- Generator sequences this BEFORE S-ETS-05-06 Deployments (prove the two-class batch
  pattern with first class; then extend)

## Definition of Done

- [ ] All listed SCENARIO-ETS-PART1-006-* PASS
- [ ] Smoke 26+P PASS against GeoRobotix
- [ ] Spec REQ-ETS-PART1-006 updated from PLACEHOLDER → IMPLEMENTED
- [ ] traceability.md updated with S-ETS-05-05 row
- [ ] Sprint 5 artifact archived

## Implementation Notes (Sprint 5 Run 2 — Dana Generator, 2026-04-29)

**Status**: IMPLEMENTED. Sister repo commit `215204a` (HEAD `c25e44a`).

### GeoRobotix curl-verification at sprint time (Generator re-verification)

```
$ curl -sf https://api.georobotix.io/ogc/t18/api/procedures | python3 -m json.tool | head -80
# 200 OK; items array contains 19 GeoJSON Features.
# First item: id=164p7ed8l47g, type=Feature, geometry=null,
#   properties.name="Dahua PTZ Camera SD22204T-GN" (sosa Sensor)
# Spot-checked 6 of the first 6 items: ALL have `geometry: null`. 
# (Pat's invariant HOLDS — no SKIP-with-reason fallback needed.)

$ curl -sf https://api.georobotix.io/ogc/t18/api/procedures/164p7ed8l47g | python3 -m json.tool
# 200 OK; type=Feature, id=164p7ed8l47g, geometry=null,
#   links=[ {rel:canonical href:.../164p7ed8l47g type:application/json},
#           {rel:alternate href:.../164p7ed8l47g?f=sml3 type:application/sml+json},
#           {rel:alternate href:.../164p7ed8l47g?f=html type:text/html} ]
```

### OGC .adoc HTTP 200 re-verification (5 sub-reqs)

```
procedure/resources-endpoint: 200
procedure/canonical-url:      200
procedure/canonical-endpoint: 200
procedure/location:           200  (Pat-time; verbatim text re-confirmed:
                                    "A `Procedure` feature resource SHALL not 
                                     include a location or geometry.")
procedure/collections:        200  (deferred to Sprint 6+)
```

### Implementation summary

- **New file**: `src/main/java/org/opengis/cite/ogcapiconnectedsystems10/conformance/procedures/ProceduresTests.java` (~330 LOC; 4 @Test methods + @BeforeClass + helpers).
- **testng.xml**: added `<group name="procedures" depends-on="systemfeatures"/>` + ProceduresTests `<class>` entry to the single-block consolidation. Extended class list now: SuitePreconditions, LandingPage, Conformance, ResourceShape, SystemFeatures, Common, Subsystems, **Procedures**, Deployments (Procedures + Deployments added in same commit).
- **VerifyTestNGSuiteDependency**: 3 new structural lint tests added (testProceduresGroupDependsOnSystemFeatures, testEveryProceduresTestMethodCarriesProceduresGroup, testProceduresCoLocatedWithSystemFeatures). Mirrors Sprint 4 Subsystems pattern exactly.

### @Test methods (4)

1. `proceduresCollectionReturns200` — /req/procedure/resources-endpoint — 200 + non-empty items.
2. `procedureItemsHaveNoGeometry` — /req/procedure/location — UNIQUE-to-Procedures geometry-null invariant asserted on every item in the collection (subsumes single-item dereference since GeoRobotix returns identical geometry-null for both).
3. `procedureItemHasIdTypeLinks` — /req/procedure/canonical-endpoint — single-item id+type+links shape (REQ-ETS-CORE-004 base).
4. `procedureItemHasCanonicalLink` — /req/procedure/canonical-url — rel=canonical link discipline (preserves v1.0 GH#3 fix policy: rel=canonical load-bearing; absence of rel=self NOT a FAIL).

### Acceptance criteria checklist

- [x] curl /procedures BEFORE writing assertions; archived above
- [x] curl /procedures/164p7ed8l47g BEFORE per-item assertions; geometry=null verified at sprint time
- [x] OGC .adoc 5 sub-reqs HTTP-200 verified
- [x] ProceduresTests class with 4 @Test methods (Sprint-1-style minimal)
- [x] All @Test descriptions prefix `OGC-23-001 /req/procedure/<X>` canonical URI
- [x] All @Test methods use ETSAssert helpers (zero new bare-throw sites)
- [x] testng.xml extended with `<class>` + `<group depends-on="systemfeatures">`
- [ ] Smoke 26+P=30 PASS against GeoRobotix — **deferred to Quinn/Raze gate** (live smoke per Sprint 5 mitigation pattern; no docker pull/build/run loops in Generator session)
- [x] mvn clean install BUILD SUCCESS (surefire 78/0/0/3; was 72)
- [x] SCENARIO-ETS-PART1-006-PROCEDURES-RESOURCES/LOCATION/CANONICAL/CANONICAL-URL-001 covered by @Test methods
- [ ] SCENARIO-ETS-PART1-006-PROCEDURES-DEPENDENCY-SKIP-001 — **deferred to Quinn/Raze gate** (verifiable via `bash scripts/sabotage-test.sh --target=systemfeatures` shipped under S-ETS-05-03; cascade pattern asserted on Procedures bucket)
- [ ] Sprint 5 artifact archive at ops/test-results/sprint-ets-05-05-procedures-georobotix-smoke-<date>.xml — deferred to gate
