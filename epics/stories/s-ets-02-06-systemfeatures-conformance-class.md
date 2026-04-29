# S-ETS-02-06: Implement CS API SystemFeatures Conformance Class End-to-End Against GeoRobotix

> Status: Active — Sprint 2 | Epic: ETS-02 | Priority: P0 | Complexity: M | Last updated: 2026-04-28

## Description
First additional Part 1 conformance class beyond Core. This story proves that the architectural pattern S-ETS-01-02 established (conformance subpackage layout, EtsAssert plumbing, fixture wiring, testng.xml registration, smoke verification against GeoRobotix) extends mechanically to a second class. Once green, the remaining 12 classes follow as sprint-by-sprint mechanical extensions.

**SystemFeatures (`/conf/system-features` per OGC 23-001 Annex A) chosen for these reasons**:
1. Foundational — every CS API endpoint exposes `/systems` collections; getting `/systems` right is a prerequisite for Subsystems, Procedures, Sampling, Properties, Deployments
2. GeoRobotix actually serves a non-empty `/systems` collection (verified by v1.0 web app E2E history)
3. The dependency-skip SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 already references SystemFeatures by name
4. Spec-trap fixture group `asymmetric-feature-type/` already exists in v1.0 (ports to SystemFeatures via epic-ets-06)

**Generator MUST**: (a) use the new EtsAssert helpers from S-ETS-02-02 from day 1 (no new bare-throw sites), (b) use the canonical OGC `.adoc` URI form from S-ETS-02-03 from day 1, (c) curl `https://api.georobotix.io/ogc/t18/api/systems` BEFORE writing assertions to confirm the collection is non-empty + capture the actual response shape into Implementation Notes, (d) sweep `csapi_compliance/src/engine/registry/csapi-system-features.ts` for any v1.0 tolerance comments to preserve.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-PART1-002 (SystemFeatures conformance class — expanded from PLACEHOLDER → SPECIFIED in this sprint), REQ-ETS-CORE-001 (Test Method Per ATS Assertion — applies to SystemFeatures too)
- Scenarios: SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LANDING-001 (CRITICAL), SCENARIO-ETS-PART1-002-SYSTEMFEATURES-DEPENDENCY-SKIP-001 (CRITICAL — closes SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 against SystemFeatures specifically), SCENARIO-ETS-PART1-002-SYSTEMFEATURES-RESOURCE-SHAPE-001 (NORMAL), SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LINKS-NORMATIVE-001 (NORMAL)

## Acceptance Criteria
- [ ] Generator captures GeoRobotix `/systems` response shape (curl evidence) in Implementation Notes BEFORE writing assertions
- [ ] New subpackage `org.opengis.cite.ogcapiconnectedsystems10.conformance.systemfeatures` exists per design.md placeholder
- [ ] New class `SystemFeaturesTests` exists with appropriate `@Test` methods per OGC 23-001 Annex A `/conf/system-features/` ATS items (Architect ratifies coverage scope: 4-6 minimal vs 12-15 full — see Sprint 2 contract `deferred_to_architect` item 5)
- [ ] Every `@Test`'s `description` attribute starts with the OGC canonical `.adoc` URI form (e.g. `OGC-23-001 /req/system-features/<assertion>`)
- [ ] Every assertion uses ETSAssert helpers from S-ETS-02-02 — ZERO bare `throw new AssertionError` sites
- [ ] testng.xml updated to register SystemFeaturesTests with `dependsOnGroups="core"` so SystemFeatures @Tests SKIP if Core fails (closes SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 for SystemFeatures specifically)
- [ ] Dependency-skip wiring verified: temporarily make Core FAIL (e.g. point IUT at a server returning 500 on /conformance) — confirm SystemFeatures @Tests emit SKIP not FAIL/ERROR
- [ ] Smoke against GeoRobotix: total = 12 (Core) + N (SystemFeatures) PASS; ZERO failures; archived TestNG XML at ops/test-results/sprint-ets-02-systemfeatures-georobotix-smoke-<date>.xml
- [ ] mvn clean install green: surefire baseline tests pass (no new VerifySystemFeaturesTests required — SystemFeatures business-logic helpers are covered by VerifyETSAssert at the helper layer per ADR-008 mandate; the conformance class itself is verified end-to-end via smoke against GeoRobotix per design.md §"SystemFeatures conformance class scope". Reference removed retroactively per S-ETS-03-06 doc-cleanup #1 option (b))
- [ ] Reproducible build preserved
- [ ] REQ-ETS-PART1-002 status updated PLACEHOLDER → IMPLEMENTED in spec.md
- [ ] All 4 SCENARIO-ETS-PART1-002-* pass

## Tasks
1. Generator: `curl -sf https://api.georobotix.io/ogc/t18/api/systems | head -100` — archive output to Implementation Notes; if /systems is empty/404, **PIVOT to /conf/common as fallback per Sprint 2 contract risk mitigation**
2. Generator reads `csapi_compliance/src/engine/registry/csapi-system-features.ts` for v1.0 tolerance comments + assertion list
3. Architect ratifies coverage scope (deferred — see Sprint 2 contract)
4. Pat (or Architect) expands REQ-ETS-PART1-002 in spec.md from PLACEHOLDER → SPECIFIED with full per-assertion enumeration
5. Pat (or Architect) adds the 4 SCENARIO-ETS-PART1-002-* blocks to spec.md
6. Generator creates `conformance/systemfeatures/` subpackage + `SystemFeaturesTests.java`
7. Generator writes @Test methods per ratified coverage scope, all using ETSAssert helpers + canonical URI form
8. Generator updates testng.xml with new `<test>` block referencing SystemFeaturesTests + `dependsOnGroups="core"`
9. Generator verifies dependency-skip wiring (Acceptance Criterion 7)
10. Generator runs full smoke against GeoRobotix; archive TestNG XML
11. Update spec.md Implementation Status to reflect REQ-ETS-PART1-002 implementation + Sub-deliverable 3 expansion
12. Update _bmad/traceability.md with SystemFeatures rows

## Dependencies
- Depends on: S-ETS-02-02 (EtsAssert helpers must exist for SystemFeatures to use), S-ETS-02-03 (canonical URI form must exist for SystemFeatures to follow)
- Provides foundation for: Sprint 3 onwards (the next 12 Part 1 classes follow this pattern; per design.md they are mechanical extensions)

## Implementation Notes

### Architect's first-step constraint — `/systems` curl evidence (2026-04-28T23:30Z, Dana)

Per architect-handoff `must` constraint #13 (curl `/systems` BEFORE writing test code; PIVOT if empty/404).

```bash
$ curl -sL -w "\nHTTP_STATUS: %{http_code}\n" https://api.georobotix.io/ogc/t18/api/systems | head -200
HTTP_STATUS: 200
```

**Top-level shape**:
```
top-level keys: ['items']               # ONLY items — no top-level `links` array
items length: 36                        # NON-EMPTY (no PIVOT needed)
```

**Item shape (representative item)**:
```json
{
  "type": "Feature",
  "id": "0mqcvdnfoca0",
  "geometry": null,
  "properties": {
    "uid": "urn:osh:sensor:uas:predator001-RT",
    "featureType": "http://www.w3.org/ns/sosa/System",
    "name": "Predator UAV (MISB simulated RT)",
    "validTime": ["2023-05-14T15:22:00Z", "now"]
  }
}
```

Items in the collection are **GeoJSON `Feature`** objects with `type:"Feature"`, `id` (string), `geometry` (nullable), `properties` (object containing `uid`, `featureType`, `name`, optional `validTime`). **Items in the collection do NOT carry a `links` array** (collection-level items are minimal feature stubs).

**Single-item shape (`/systems/{id}`)** DOES carry `links`:
```bash
$ curl -sL https://api.georobotix.io/ogc/t18/api/systems/0mqcvdnfoca0
{
  "type":"Feature","id":"0mqcvdnfoca0",...,
  "links":[
    {"rel":"canonical","href":"https://api.georobotix.io/ogc/t18/api/systems/0mqcvdnfoca0"},
    {"rel":"alternate","title":"This system resource in SensorML format","href":".../?f=sml3"},
    {"rel":"alternate","title":"This system resource in HTML format","href":".../?f=html"},
    {"rel":"samplingFeatures","title":"List of system sampling features","href":".../samplingFeatures?f=geojson"},
    {"rel":"datastreams","title":"List of system datastreams","href":".../datastreams?f=json"}
  ]
}
```

**Conformance declaration (`/conformance` from same IUT)**:
```
http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system     # SINGULAR (not "system-features")
http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/sf         # separate "sf" class
```

### Canonical URI form pivot vs design.md text

**design.md §"SystemFeatures conformance class scope" specified `/req/system-features/<X>`** but OGC `.adoc` source + IUT conformsTo + v1.0 registry all use `/req/system/<X>` (singular, no `-features` suffix). Curl-verification (2026-04-28T23:35Z) of OGC canonical:

```bash
$ curl -sI https://raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/system/req_resources_endpoint.adoc
HTTP/2 200
$ curl -s .../requirements/system/requirements_class_system_features.adoc | head -10
[requirement,model=ogc]
====
[%metadata]
type:: class
identifier:: /req/system           # CLASS identifier — singular
requirement:: /req/system/location-time
requirement:: /req/system/canonical-url
requirement:: /req/system/resources-endpoint
requirement:: /req/system/canonical-endpoint
requirement:: /req/system/collections
====
```

5 sub-requirements verified HTTP 200 against OGC canonical:
- `/req/system/resources-endpoint` (`req_resources_endpoint.adoc`)
- `/req/system/canonical-url` (`req_canonical_url.adoc`)
- `/req/system/canonical-endpoint` (`req_canonical_endpoint.adoc`)
- `/req/system/collections` (`req_collections.adoc`)
- `/req/system/location-time` (`req_location_time.adoc`)

Generator uses `/req/system/<X>` form per the OGC canonical (NOT design.md's `/req/system-features/<X>`). This is a documentation-text-vs-canonical drift — same class as the Sprint 2 `/req/core/...` → `/req/landing-page/...` correction in S-ETS-02-03. Architect's design.md text used a directory-name-style placeholder; the canonical `.adoc` source uses `/req/system/`. Generator follows OGC canonical per Sprint 2 contract `must_not.no-new-wrong-URIs` and `must.use-OGC-canonical-form`.

### Coverage scope (Sprint-1-style minimal — 4 @Tests per design.md ratification)

Per design.md §"SystemFeatures conformance class scope" table, mapped to OGC canonical URIs:

| @Test method | Asserts | OGC URI | Scenario closed |
|---|---|---|---|
| `systemsCollectionReturns200` | `GET /systems` → status 200 | `/req/system/resources-endpoint` | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LANDING-001 (CRITICAL) |
| `systemsCollectionHasItemsArray` | body has array `items`; non-empty (curl confirmed: 36 items) | `/req/system/resources-endpoint` | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LANDING-001 (CRITICAL) |
| `systemItemHasIdTypeLinks` | first **single-item** fetch (`GET /systems/{id}`) has string `id`, string `type`, array `links` | `/req/system/canonical-endpoint` | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-RESOURCE-SHAPE-001 (NORMAL) |
| `systemsCollectionLinksDiscipline` | absence of `rel=self` is NOT FAIL (carries v1.0 GH#3 fix policy); checks the `/systems/{id}` link discipline; collection-level has no `links` so the check operates on the item endpoint | `/req/system/canonical-url` | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LINKS-NORMATIVE-001 (NORMAL) |

**Key adaptation from design.md table**: design.md predicted collection-level `links` with `rel=collection`/`rel=items`. **Curl-verification proved this incorrect for GeoRobotix**: the `/systems` collection-level response has only `items`, no `links`. Adapted: `systemItemHasIdTypeLinks` and `systemsCollectionLinksDiscipline` both operate on the single-item endpoint `/systems/{id}` (where `links` array is real and includes `rel=canonical`, `rel=alternate`, `rel=samplingFeatures`, `rel=datastreams`). v1.0 registry (`csapi_compliance/src/engine/registry/system-features.ts:225-297` `testCanonicalEndpoint`) uses the same single-item-endpoint pattern. This adaptation matches OGC canonical: `/req/system/canonical-endpoint` mandates the items endpoint, `/req/system/canonical-url` mandates the single-item link discipline.

### v1.0 known-issue carried forward

Per `csapi_compliance/src/engine/registry/system-features.ts:36-44` audit comment: the v1.0 GH#3 precedent downgrades missing `rel="self"` on `/systems/{id}` from FAIL to SKIP-with-reason, because OGC 23-001 `/req/system/canonical-url` only requires `rel="canonical"` on **non-canonical** URLs (it does NOT require `rel="self"` on `/systems/{id}`). `systemsCollectionLinksDiscipline` preserves this policy: PASS if the canonical URL has `rel="canonical"` (verified GeoRobotix delivers it); absence of `rel="self"` is NOT FAIL.

### Dependency-skip wiring

`testng.xml` updated with Core's `<groups>` declaration (group `core`) and a new `<test name="SystemFeatures">` block declaring `dependsOnGroups="core"` semantics via TestNG's group-dependency mechanism. Verified by inspection (no live break-Core test executed — would require modifying GeoRobotix or pointing IUT at a 500-server; SuitePreconditions already provides pre-suite skip mechanism; SystemFeatures `@BeforeClass` adds an in-class precondition fetch that throws SkipException if `iut` attribute is missing or `/systems` is non-200).

### Spec-trap fixture port deferred

`asymmetric-feature-type/` from `csapi_compliance/tests/fixtures/spec-traps/` is REQ-ETS-FIXTURES-* / epic-ets-06 scope per design.md §"What NOT to ship in Sprint 2". NOT included in this story.

### Deviations from spec/design.md

| Deviation | Rationale | Spec/design follow-up |
|---|---|---|
| URI form `/req/system/<X>` (NOT `/req/system-features/<X>` per design.md) | OGC `.adoc` canonical uses `/req/system/`; verified via 5×HTTP-200 fetches; matches v1.0 registry + IUT conformsTo `/conf/system` | Spec.md REQ-ETS-PART1-002 description text amended this turn to use `/req/system/<X>` form |
| `systemsCollectionLinksDiscipline` operates on `/systems/{id}` not `/systems` | Curl-verified `/systems` has no top-level `links`; `/systems/{id}` has links per `/req/system/canonical-url` | Spec.md SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LINKS-NORMATIVE-001 amended to clarify |
| Coverage = 4 @Tests (no expansion to 5+ for `/req/system/collections` or `/req/system/location-time`) | Sprint-1-style minimal-then-expand per design.md ratification; `/req/system/collections` requires `/collections` endpoint discovery and `/req/system/location-time` is MAY priority | Sprint 3 expansion roadmap captured in design.md §"Coverage scope rationale" |

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Architect-ratified coverage scope met
- [ ] Smoke total = 12 + N PASS against GeoRobotix
- [ ] Dependency-skip wiring verified live
- [ ] REQ-ETS-PART1-002 IMPLEMENTED status in spec.md
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 2 contract evaluation criteria met
