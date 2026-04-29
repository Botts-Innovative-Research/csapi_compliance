# Story: S-ETS-05-06 — Implement CS API Deployments (/conf/deployment-features) conformance class end-to-end against GeoRobotix

**Epic**: epic-ets-02-part1-classes
**Sprint**: ets-05
**Priority**: P0 — New feature; mechanical extension of Subsystems pattern; second of two-class batch
**Estimated Complexity**: M
**Status**: Active (Sprint 5)

## Description

Fifth additional Part 1 conformance class beyond Core + SystemFeatures + Common + Subsystems +
Procedures. Mirrors the S-ETS-04-05 / S-ETS-05-05 architectural pattern: new
`conformance.deployments.DeploymentsTests` subpackage, REQ-ETS-PART1-004 expanded from
PLACEHOLDER → SPECIFIED with full per-assertion enumeration, SCENARIO-ETS-PART1-004-* added,
testng.xml wired with `<group name="deployments" depends-on="systemfeatures"/>`.

**OGC 23-001 Annex A `/conf/deployment-features/`** — 5 sub-reqs verified 2026-04-29 via
`raw.githubusercontent.com/.../requirements/deployment/requirements_class_deployment_features.adoc`:
```
identifier:: /req/deployment
requirement:: /req/deployment/canonical-url
requirement:: /req/deployment/resources-endpoint
requirement:: /req/deployment/canonical-endpoint
requirement:: /req/deployment/deployed-system-resource
requirement:: /req/deployment/collections
```

Note on canonical URI: the 5th requirement file is `req_deployed_system_resource.adoc` with
identifier `:: /req/deployment/deployed-system-resource` (hyphen, not underscore). Generator MUST
use the hyphenated form `/req/deployment/deployed-system-resource` in @Test description URIs.

**Unique to Deployments**: `/req/deployment/deployed-system-resource` — the server SHALL implement
at least one encoding requirements class that provides a representation for the `DeployedSystem`
resource. This is NOT a simple structural assertion; it requires checking whether the IUT declares
a `DeployedSystem` encoding conformance class. Generator implements with SKIP-with-reason if the
IUT's /conformance does not declare a related DeployedSystem encoding class.

**GeoRobotix shape-verification** (Pat-time 2026-04-29 — Generator must re-verify at sprint time):
- `GET /deployments` → HTTP 200, **1 item** (id=16sp744ch58g, type=Feature,
  links=[canonical, alternate, alternate])
- `GET /deployments/16sp744ch58g` → HTTP 200, id=16sp744ch58g, type=Feature,
  links=[canonical, alternate, alternate]
- **NOTE**: Only 1 deployment item. Non-empty check (>=1 item) PASSES. Generator MUST NOT
  assume multiple items in per-item assertions. Single-item IUT shape is valid.
- The deployment links=[canonical, alternate, alternate] — no explicit "system" rel link visible
  at Pat-time. Generator checks /conformance for DeployedSystem encoding class before asserting
  deployed-system-resource.

## Acceptance Criteria

- [ ] `curl -sf https://api.georobotix.io/ogc/t18/api/deployments` before writing assertions;
      archive curl evidence into Implementation Notes
- [ ] `curl -sf https://api.georobotix.io/ogc/t18/api/deployments/16sp744ch58g` before writing
      per-item assertions; archive into Implementation Notes
- [ ] `curl -sf https://api.georobotix.io/ogc/t18/api/conformance` to check if GeoRobotix
      declares a DeployedSystem encoding conformance class; archive into Implementation Notes
- [ ] OGC `.adoc` canonical URIs HTTP-200-verified for all 5 sub-reqs at
      `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/deployment/`
- [ ] `org.opengis.cite.ogcapiconnectedsystems10.conformance.deployments.DeploymentsTests` class
      created with **4-5 @Test methods** (Sprint-1-style minimal):
  - `deploymentsCollectionReturnsHttp200`: GET /deployments returns 200 + non-empty items array
    per `/req/deployment/resources-endpoint`
  - `deploymentItemHasCanonicalLink`: GET /deployments/{id} returns item with rel="canonical" link
    per `/req/deployment/canonical-url`
  - `deploymentItemHasBaseShape`: GET /deployments/{id} returns item with id, type, links fields
    per `/req/deployment/canonical-endpoint` + REQ-ETS-CORE-004 base shape
  - `deploymentDeployedSystemResource`: IUT declares DeployedSystem encoding conformance class
    OR SKIP-with-reason per `/req/deployment/deployed-system-resource`
    (UNIQUE to Deployments — check /conformance for encoding class declaration)
  - Optional 5th: `deploymentsDiscoverableViaCollections` per `/req/deployment/collections`
    (SKIP-with-reason if /collections doesn't list /deployments)
- [ ] All @Test descriptions prefix OGC document number + canonical `/req/deployment/<X>` URI
      (e.g. `OGC-23-001 /req/deployment/deployed-system-resource` with HYPHEN not underscore)
- [ ] All @Test methods use ETSAssert helpers (zero new bare `throw new AssertionError` or
      `Assert.fail`)
- [ ] testng.xml extended with:
  - Deployments `<class>` entry in single-block consolidation
  - `<group name="deployments" depends-on="systemfeatures"/>` in the `<dependencies>` block
- [ ] Smoke total = 26+P+D PASS against GeoRobotix (where P=Procedures count, D=Deployments count)
- [ ] `mvn clean install` BUILD SUCCESS (surefire 64+N+P+D/0/0/3)
- [ ] SCENARIO-ETS-PART1-004-DEPLOYMENTS-RESOURCES-001, -CANONICAL-001, -CANONICAL-URL-001,
      -DEPLOYED-SYSTEM-001, -DEPENDENCY-SKIP-001 PASS
- [ ] Sprint 5 artifact archived at `ops/test-results/sprint-ets-05-06-deployments-georobotix-smoke-<date>.xml`

## Spec References

- REQ-ETS-PART1-004 (Deployments — expanded from PLACEHOLDER → SPECIFIED)

## Technical Notes

**Pattern template** (mirrors S-ETS-05-05 Procedures exactly; use as reference):
- `conformance/deployments/DeploymentsTests.java` — new class
  - @Groups annotation: `groups = {"deployments"}`
  - SuiteFixture + CommonFixture injection
  - 4 @Test methods listed above
  - ETSAssert helpers throughout
  - OGC canonical URI form: `/req/deployment/deployed-system-resource` (HYPHENATED — verify
    via HTTP-200 check on `req_deployed_system_resource.adoc` before using in @Test)
- `VerifyDeploymentsTests.java` in src/test/java — new unit test class (~5-10 @Tests)
- testng.xml: add `<class name="...conformance.deployments.DeploymentsTests"/>` + `<group
  name="deployments" depends-on="systemfeatures"/>` in `<dependencies>` block.

**deployed-system-resource assertion strategy**:
```java
// Check /conformance for DeployedSystem encoding class
List<String> conformsTo = suiteContext.getSuite().getAttribute("conformsTo");
boolean declaresDeployedSystemEncoding = conformsTo != null &&
    conformsTo.stream().anyMatch(uri -> uri.contains("deployed-system") || uri.contains("geojson") || ...);
if (!declaresDeployedSystemEncoding) {
    throw new SkipException("IUT does not declare DeployedSystem encoding conformance class; " +
        "/req/deployment/deployed-system-resource assertion skipped");
}
// Otherwise: verify the encoding is accessible
```
Architect precedent for SKIP-with-reason is established in SubsystemsTests and SystemFeaturesTests.

**Single-item handling**: GeoRobotix has 1 deployment. Non-empty assertion (`items.size() >= 1`)
passes. For canonical-endpoint + canonical-url assertions: use the single item (index 0).
Do NOT write assertions that require >=2 items.

## Dependencies

- S-ETS-05-05 Procedures should be DONE first (prove single-class pattern; Deployments extends)
- Sprint 4 Subsystems pattern (S-ETS-04-05) already established

## Definition of Done

- [ ] All listed SCENARIO-ETS-PART1-004-* PASS
- [ ] Smoke 26+P+D PASS against GeoRobotix
- [ ] Spec REQ-ETS-PART1-004 updated from PLACEHOLDER → IMPLEMENTED
- [ ] traceability.md updated with S-ETS-05-06 row
- [ ] Sprint 5 artifact archived

## Implementation Notes (Sprint 5 Run 2 — Dana Generator, 2026-04-29)

**Status**: IMPLEMENTED. Sister repo commit `215204a` (HEAD `c25e44a`).

### GeoRobotix curl-verification at sprint time

```
$ curl -sf https://api.georobotix.io/ogc/t18/api/deployments
# 200 OK; items array contains 1 item.
# id=16sp744ch58g, type=Feature,
#   geometry=Polygon (17-vertex Saildrone Arctic Mission flight envelope —
#                     IUT-side: deployments DO have geometry, unlike procedures.
#                     This is by-design per OGC 23-001: Procedures are abstract
#                     definitions; Deployments are physical/temporal/spatial events.
#                     There is NO /req/deployment/location invariant equivalent
#                     to /req/procedure/location — confirmed by inspecting the
#                     deployment requirements directory).
#   properties.name="Saildrone - 2017 Arctic Mission",
#   properties.deployedSystems@link=[{ href:.../systems/17k8rt78j4j0,
#                                       uid:urn:x-osh:saildrone:1001 }]
#   (NOTE: properties.deployedSystems@link is a *vendor extension* — NOT a
#    standard `links` rel; the OGC requirement deployed-system-resource is
#    satisfied at the conformance-class-declaration layer in /conformance,
#    not at this property-key layer.)

$ curl -sf https://api.georobotix.io/ogc/t18/api/deployments/16sp744ch58g
# 200 OK; identical content shape; links=[ canonical(json), alternate(sml3),
#   alternate(html) ]

$ curl -sf https://api.georobotix.io/ogc/t18/api/conformance
# 200 OK; conformsTo array (33 entries) declares:
#   .../ogcapi-connectedsystems-1/1.0/conf/deployment   (the Deployments class itself)
#   .../ogcapi-connectedsystems-1/1.0/conf/geojson      (DeployedSystem GeoJSON encoding)
#   .../ogcapi-connectedsystems-1/1.0/conf/sensorml     (DeployedSystem SensorML encoding)
# /req/deployment/deployed-system-resource SATISFIED (any of {geojson, sensorml}
# providing a DeployedSystem representation is sufficient per OGC 23-001 §Encoding
# requirements).
```

### OGC .adoc HTTP 200 re-verification (5 sub-reqs; HYPHENATED form for
deployed-system-resource)

```
deployment/resources-endpoint:        200
deployment/canonical-url:             200
deployment/canonical-endpoint:        200
deployment/deployed-system-resource:  200  (verbatim: "The server SHALL implement
                                            at least one encoding requirements
                                            class that provides a representation
                                            for the `DeployedSystem` resource.")
deployment/collections:               200  (deferred to Sprint 6+)
```

### Implementation summary

- **New file**: `src/main/java/org/opengis/cite/ogcapiconnectedsystems10/conformance/deployments/DeploymentsTests.java` (~430 LOC; 4 @Test methods + @BeforeClass-with-conformance-fetch + helpers; class is slightly larger than ProceduresTests because it also fetches /conformance for the deployed-system-resource encoding-class assertion).
- **testng.xml**: added `<group name="deployments" depends-on="systemfeatures"/>` + DeploymentsTests `<class>` entry (same commit as Procedures; both classes added at once).
- **VerifyTestNGSuiteDependency**: 3 new structural lint tests added (testDeploymentsGroupDependsOnSystemFeatures, testEveryDeploymentsTestMethodCarriesDeploymentsGroup, testDeploymentsCoLocatedWithSystemFeatures).

### @Test methods (4)

1. `deploymentsCollectionReturns200` — /req/deployment/resources-endpoint — 200 + non-empty items (single-item shape OK; items.size() >= 1 passes).
2. `deploymentItemHasIdTypeLinks` — /req/deployment/canonical-endpoint — single-item id+type+links shape.
3. `deploymentItemHasCanonicalLink` — /req/deployment/canonical-url — rel=canonical link discipline.
4. `deploymentDeployedSystemEncodingDeclared` — /req/deployment/deployed-system-resource (HYPHENATED form) — UNIQUE-to-Deployments. Checks IUT /conformance for any of {`/conf/geojson`, `/conf/sensorml`, `/conf/json`, `/conf/html`}. SKIP-with-reason if /conformance unavailable or no matching encoding class declared. GeoRobotix declares both geojson and sensorml — assertion PASSES.

### Single-item shape handling

GeoRobotix has 1 deployment. The acceptance criterion "non-empty items" passes trivially. No assertions assume >=2 items. canonical-endpoint + canonical-url use `items[0]` deference. No structural shifts vs Subsystems/Procedures pattern were needed.

### Acceptance criteria checklist

- [x] curl /deployments BEFORE writing assertions; archived above
- [x] curl /deployments/16sp744ch58g BEFORE per-item assertions
- [x] curl /conformance for DeployedSystem encoding-class check; conf/geojson + conf/sensorml present
- [x] OGC .adoc 5 sub-reqs HTTP-200 verified (HYPHENATED deployed-system-resource form)
- [x] DeploymentsTests class with 4 @Test methods (Sprint-1-style minimal)
- [x] All @Test descriptions prefix `OGC-23-001 /req/deployment/<X>` canonical URI; deployed-system-resource HYPHENATED
- [x] All @Test methods use ETSAssert helpers (zero new bare-throw sites)
- [x] testng.xml extended with `<class>` + `<group depends-on="systemfeatures">`
- [ ] Smoke 26+P+D=34 PASS against GeoRobotix — **deferred to Quinn/Raze gate**
- [x] mvn clean install BUILD SUCCESS (surefire 78/0/0/3)
- [x] SCENARIO-ETS-PART1-004-DEPLOYMENTS-RESOURCES/CANONICAL/CANONICAL-URL/DEPLOYED-SYSTEM-001 covered by @Test methods
- [ ] SCENARIO-ETS-PART1-004-DEPLOYMENTS-DEPENDENCY-SKIP-001 — **deferred to Quinn/Raze gate** (sabotage --target=systemfeatures shipped under S-ETS-05-03; cascade asserted on Deployments bucket)
- [ ] Sprint 5 artifact archive — deferred to gate
