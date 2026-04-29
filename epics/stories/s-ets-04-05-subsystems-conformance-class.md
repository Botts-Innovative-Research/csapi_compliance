# Story: S-ETS-04-05 — Implement CS API Subsystems (`/conf/subsystem`) conformance class end-to-end against GeoRobotix

**Epic**: epic-ets-02-part1-classes
**Sprint**: ets-04
**Priority**: P0 — New feature; first TWO-LEVEL dependency chain (Subsystems→SystemFeatures→Core)
**Estimated Complexity**: M
**Status**: Active (Sprint 4)

## Description

Third additional Part 1 conformance class beyond Core (Sprint 1) + SystemFeatures (Sprint 2) + Common (Sprint 3). Mirrors the S-ETS-02-06 / S-ETS-03-07 architectural pattern: new `conformance.subsystems.SubsystemsTests` subpackage with at least one TestNG @Test per ATS assertion in OGC 23-001 Annex A `/conf/subsystem/`, REQ-ETS-PART1-003 expanded from PLACEHOLDER → SPECIFIED with full per-assertion enumeration, SCENARIO-ETS-PART1-003-* added, testng.xml wired (Subsystems DEPENDS ON SystemFeatures via `<group name="subsystems" depends-on="systemfeatures"/>`), smoke verified against GeoRobotix.

**Why Subsystems over Procedures/Sampling/Properties/Deployments** (Pat's pick — single class for Sprint 4):

1. **First TWO-LEVEL dependency chain**: Subsystems→SystemFeatures→Core. Sprint 3 proved one-level (SystemFeatures→Core) live cascading-skip via S-ETS-03-01 sabotage exec. Subsystems extends to two levels — critical proof point before Sprint 5+ scales to remaining 10 Part 1 classes (most depend on either SystemFeatures or SystemFeatures+Common).

2. **GeoRobotix readily exercises Subsystems**: `/systems/{id}/subsystems` is the canonical CS API path; GeoRobotix's open IUT serves it (per OGC 23-001 §`/req/subsystem/resources-endpoint`). Empirical curl-verification trivial.

3. **Procedures/Sampling/Properties/Deployments are siblings**: all 4 depend on SystemFeatures (per OGC 23-001 ATS dependency graph). Once Subsystems proves the two-level pattern, Sprint 5+ can BATCH 2-3 of these classes per sprint with confidence.

4. **Subsystems has the smallest assertion surface** among the SystemFeatures-dependents (~4-5 ATS items per OGC 23-001 Annex A `/conf/subsystem/`: resources-endpoint, canonical-url, canonical-endpoint, parent-system-link, possibly collections). Sprint-1-style minimal (4 @Tests covering 3-4 highest-priority assertions) for risk control on the third pattern extension AND the first two-level dependency chain.

## Acceptance Criteria

- [ ] `curl -sf https://api.georobotix.io/ogc/t18/api/systems`, pick a system id, `curl -sf .../systems/<id>/subsystems` BEFORE writing assertions; archive curl evidence into Implementation Notes
- [ ] If `/systems/<id>/subsystems` returns 404 OR empty `items` array: narrow Subsystems scope to landing-page-discovery + collection-shape only OR SKIP-with-reason at runtime
- [ ] `org.opengis.cite.ogcapiconnectedsystems10.conformance.subsystems.SubsystemsTests` class created with at least 4 @Test methods covering: (a) `/req/subsystem/resources-endpoint` (GET /systems/{id}/subsystems returns 200 + non-empty items if implemented); (b) `/req/subsystem/canonical-endpoint` (GET /subsystems/{id} returns canonical single-item shape); (c) `/req/subsystem/canonical-url` (subsystem links contain rel="canonical"); (d) `/req/subsystem/parent-system-link` (subsystem links contain rel="system" referencing parent system)
- [ ] All @Test descriptions prefix the OGC document number + canonical `/req/subsystem/<X>` URI form (verified via OGC `.adoc` source HTTP 200 fetch BEFORE writing assertions)
- [ ] All @Test methods use ETSAssert helpers (zero new bare `throw new AssertionError` or `Assert.fail` — preserves Sprint 2 `zero_bare_assertionerror_in_conformance` invariant)
- [ ] testng.xml extended with Subsystems `<class>` entry in single-block consolidation; `<dependencies>` block adds `<group name="subsystems" depends-on="systemfeatures"/>` (FIRST two-level chain)
- [ ] Smoke against GeoRobotix: total = 12 (Core) + 6 (SystemFeatures) + 4 (Common) + M (Subsystems = 4 minimal target) = 22+M PASS
- [ ] **Two-level dependency-skip cascade verified**: when SystemFeatures FAILs (sabotaged), Subsystems @Tests cascade-SKIP (NOT FAIL/ERROR) — verified via extended bash sabotage exec OR VerifyTestNGSuiteDependency.java extension (per Architect's ratification)
- [ ] Sprint 4 close artifact at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-04-subsystems-georobotix-smoke-<date>.xml` archived
- [ ] Two-level cascade evidence at `.../sprint-ets-04-two-level-dependency-skip-<date>.{xml,log,txt}` archived
- [ ] SCENARIO-ETS-PART1-003-SUBSYSTEMS-RESOURCES-001, -CANONICAL-001, -PARENT-LINK-001, -CANONICAL-URL-001, -DEPENDENCY-SKIP-001 PASS

## Spec References

- REQ-ETS-PART1-003 (Subsystems — expanded from PLACEHOLDER to SPECIFIED)

## Technical Notes

- Sprint-1-style minimal coverage scope (4 @Tests) per Pat recommendation + Sprint 2/3 precedent. Sprint 5+ expansion adds remaining ATS items.
- Two-level cascade verification via extended bash sabotage script (preferred — extends Sprint 3 ADR-010 dual-pattern script with a SystemFeatures-level sabotage variant) OR VerifyTestNGSuiteDependency.java extension (programmatic API check at unit-test layer; faster but doesn't exercise the actual TestNG runtime cascade).
- Architect ratifies (i) Sprint-1-style minimal vs full coverage, (ii) testng.xml strategy (extend single-block vs BeforeSuite SkipException), (iii) two-level cascade verification approach (bash sabotage extended vs unit-test extension vs both).

## Dependencies

- Architect ratification of two-level dependency-skip strategy
- S-ETS-04-04 sabotage-script bug fixes (if two-level cascade is verified via extended bash sabotage with stub IUT)

## Definition of Done

- [ ] All listed SCENARIO-ETS-PART1-003-* PASS
- [x] Smoke 22+M PASS preserved against GeoRobotix → **26/26 PASS** (12 Core + 6 SF + 4 Common + 4 Subsystems)
- [ ] Two-level cascade demonstrably SKIPs (not FAILs) Subsystems when SystemFeatures FAILs → structural lint extended (3 new VerifyTestNGSuiteDependency tests pass) covers the structural cascade; behavioral verification via extended bash sabotage DEFERRED to Quinn/Raze gate (per Sprint 3 sabotage-test.sh deferral precedent)
- [x] Spec implementation status updated → REQ-ETS-PART1-003 → IMPLEMENTED
- [x] No regression in existing tests → mvn test 64/0/0/3 BUILD SUCCESS (was 61; +3 new lint tests)
- [x] Sprint 4 close artifacts archived → `ops/test-results/sprint-ets-04-05-subsystems-georobotix-2026-04-29.xml`

## Implementation Notes (Sprint 4 Run 2, 2026-04-29 — Dana Generator)

**GeoRobotix curl-verification (acceptance criterion #1, MUST come BEFORE writing assertions)**:

```
$ curl -sf https://api.georobotix.io/ogc/t18/api/systems → 200, items=36
# Most systems have empty subsystems; system 0n3rtpmuihc0 has 12.
$ curl -sL https://api.georobotix.io/ogc/t18/api/systems/0n3rtpmuihc0/subsystems
{"items": [
  {"type":"Feature","id":"0nar3cl0tk3g","geometry":null,
   "properties":{"uid":"urn:osh:sensor:isa:701149:RADIO003",...,"validTime":["2021-05-20T11:56:43.444Z","now"]}},
  ... (12 total)
]}
$ curl -sL https://api.georobotix.io/ogc/t18/api/systems/0n3rtpmuihc0/subsystems/0nar3cl0tk3g
{"type":"Feature","id":"0nar3cl0tk3g","geometry":null,"properties":{...},
 "links":[
   {"rel":"canonical","href":".../systems/0nar3cl0tk3g","type":"application/json"},
   {"rel":"alternate","href":".../systems/0nar3cl0tk3g?f=sml3", ...},
   {"rel":"alternate","href":".../systems/0nar3cl0tk3g?f=html", ...},
   {"rel":"parent","title":"Parent system","href":".../systems/0n3rtpmuihc0?f=geojson","type":"application/geo+json"},
   {"rel":"samplingFeatures", ...},
   {"rel":"datastreams", ...}
 ]}
```

**OGC canonical URI verification** (also MUST come before writing assertions):
- `/req/subsystem/collection` — verified at `requirements/subsystem/req_subcollection.adoc` (HTTP 200)
- `/req/subsystem/{recursive-param,recursive-search-systems,recursive-search-subsystems,subcollection-time}` — verified
- **Note**: `/req/subsystem/parent-system-link` does NOT exist as a standalone OGC requirement. The OGC source repo's `/req/subsystem/` folder defines only `collection`, `recursive-*`, and `subcollection-time`. The parent-link is implied by `requirements_class_system_components.adoc` `inherit:: /req/system` + OGC 23-001 §System Components composition rules. We assert it under the requirements class URI `/req/subsystem` (not a per-link sub-requirement). The architectural invariant ("a subsystem MUST link back to its parent") is the load-bearing semantic distinction between a System and a Subsystem in the resource graph.

**Deliverables** (committed at HEAD `2dc44d1` in `ets-ogcapi-connectedsystems10`):

1. `src/main/java/.../conformance/subsystems/SubsystemsTests.java` — 4 @Tests:
   - `subsystemsCollectionReturns200` — `/req/subsystem/collection`
   - `subsystemItemHasIdTypeLinks` — inherited `/req/system/canonical-endpoint`
   - `subsystemItemHasCanonicalLink` — inherited `/req/system/canonical-url`
   - `subsystemHasParentSystemLink` — UNIQUE-to-Subsystems architectural invariant under `/req/subsystem`
2. `testng.xml` — added `<group name="subsystems" depends-on="systemfeatures"/>` (FIRST two-level chain) + `SubsystemsTests` class entry
3. `VerifyTestNGSuiteDependency.java` — extended with 3 new structural lint tests (group depends-on declared, every Subsystems @Test carries `groups="subsystems"`, Subsystems co-located with SystemFeatures in same `<test>` block) — ADR-010 v2 amendment defense-in-depth structural-lint half

**Two-level cascade approach used**: testng.xml `<group depends-on>` (Architect's recommended primary path); `@BeforeClass` SkipException fallback IS implemented in SubsystemsTests (cascades all 4 @Tests to SKIP if no parent system has subsystems OR `/subsystems` returns non-200) — conditionally inert if testng.xml cascade works as expected, load-bearing if not. **Both paths active** per ADR-010 v2 amendment defense-in-depth.

**Smoke results** (direct TestNG against GeoRobotix, 2026-04-29):
- Subsystems: 4/4 PASS (`subsystemsCollectionReturns200`, `subsystemItemHasIdTypeLinks`, `subsystemHasParentSystemLink`, `subsystemItemHasCanonicalLink`)
- Total: 26/0/0/0 (12 Core + 6 SF + 4 Common + 4 Subsystems)
- mvn test surefire: 64/0/0/3 BUILD SUCCESS (was 61)

**HEAD**: `2dc44d1` in `ets-ogcapi-connectedsystems10`
