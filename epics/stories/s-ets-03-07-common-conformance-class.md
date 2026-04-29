# S-ETS-03-07: Implement CS API Common (`/conf/common`) conformance class end-to-end against GeoRobotix

> Status: Implemented (pending Quinn+Raze) — Sprint 3 | Epic: ETS-02 | Priority: P0 | Complexity: M | Last updated: 2026-04-29

## Description
Second additional Part 1 conformance class beyond Core + SystemFeatures. Mirrors the proven S-ETS-01-02 / S-ETS-02-06 architectural pattern: new `conformance.common.*` subpackage with at least one TestNG @Test per ATS assertion in OGC 23-001 Annex A `/conf/common/`, REQ-ETS-PART1-001 expanded from PLACEHOLDER → SPECIFIED with full per-assertion enumeration, SCENARIO-ETS-PART1-001-* added, testng.xml wired (Common is INDEPENDENT of Core — same group-dependency-DAG-root level as Core; no `dependsOnGroups` entry needed; Common runs in parallel with Core), smoke verified against GeoRobotix.

**Why Common over Subsystems/Procedures/Sampling/Properties/Deployments** (Pat's pick — single class for Sprint 3, NOT pair):
1. **Highest dependency-leverage**: every remaining 11 Part 1 class inherits from Common's base assertions. Landing Common in Sprint 3 unlocks all 11 cleanly for Sprint 4+.
2. **GeoRobotix readily exercises Common**: assertions are at IUT-root level (landing-page link relations, collections endpoint, content negotiation) — GeoRobotix's open IUT serves all of these.
3. **Subsystems pair would force the multi-class testng.xml consolidation pattern earlier** (>2 dependent classes need BeforeSuite SkipException pattern per design.md). With Common+Subsystems both in Sprint 3, the testng.xml strategy revisit is Sprint-3-early; better postponed to Sprint 4.
4. **Common has the smallest assertion surface** of the foundational choices (~5-7 ATS items per OGC 23-001 Annex A `/conf/common`); per-class new-feature effort ~30-40% the cost of S-ETS-01-02 (S-ETS-02-06 was ~50% as design.md predicted; Common will be smaller because Core's landing-page+conformance assertions overlap with Common's discovery assertions).

**Generator MUST**: (a) curl GeoRobotix's `/`, `/conformance`, and `/collections` (if it exists) BEFORE writing assertions; archive curl evidence; (b) verify OGC `.adoc` canonical URI form for each Common sub-requirement (5 sub-requirements expected: `/req/common/landing-page`, `/req/common/conformance`, `/req/common/collections`, `/req/common/content-negotiation`, `/req/common/json-html` — Generator's first step is to confirm via OGC `.adoc` source); (c) use ETSAssert helpers + canonical URI form from day 1 (Sprint 2 invariants preserved); (d) preserve any v1.0 known-issue handling for Common (sweep `csapi_compliance/src/engine/registry/common.ts` for tolerance comments).

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-PART1-001 (Common conformance class — expanded from PLACEHOLDER → SPECIFIED in this sprint), REQ-ETS-CORE-001 (Test Method Per ATS Assertion — applies to Common too)
- Scenarios: SCENARIO-ETS-PART1-001-COMMON-LANDING-001 (CRITICAL), SCENARIO-ETS-PART1-001-COMMON-CONFORMANCE-001 (NORMAL), SCENARIO-ETS-PART1-001-COMMON-COLLECTIONS-001 (NORMAL), SCENARIO-ETS-PART1-001-COMMON-CONTENT-NEGOTIATION-001 (NORMAL)

## Acceptance Criteria
- [ ] Architect ratifies coverage scope (Sprint-1-style minimal — 4-5 @Tests; Pat recommends) vs full coverage from day 1 — see Sprint 3 contract `deferred_to_architect`
- [ ] Architect ratifies testng.xml strategy: extend single-block consolidation (Pat recommends; defer multi-class migration to Sprint 4) vs split into separate `<test>` blocks vs adopt BeforeSuite SkipException pattern
- [ ] Generator captures GeoRobotix `/`, `/conformance`, `/collections` curl evidence in Implementation Notes BEFORE writing assertions
- [ ] Generator HTTP-200-verifies all Common sub-requirement OGC `.adoc` URLs (cross-reference Sprint 2 cleanup-batch verification methodology)
- [ ] New subpackage `org.opengis.cite.ogcapiconnectedsystems10.conformance.common` exists per design.md placeholder
- [ ] New class `CommonTests` exists with @Test methods per ratified coverage scope; each @Test's `description` attribute starts with the OGC canonical `/req/common/<X>` URI form
- [ ] Each @Test annotated with `groups = "common"` (parallel to Core's `"core"` and SystemFeatures' `"systemfeatures"`)
- [ ] Common is INDEPENDENT of Core (no `dependsOnGroups` declaration in testng.xml for the `common` group; runs in parallel with Core)
- [ ] Every assertion uses ETSAssert helpers from Sprint 2 ADR-008 — ZERO new bare-throw sites (Sprint 2 invariant `zero_bare_assertionerror_in_conformance` extended)
- [ ] testng.xml updated to register CommonTests per Architect's ratified strategy
- [ ] Smoke against GeoRobotix: total = 12 (Core) + 6 (SystemFeatures = 4 + 2 from S-ETS-03-05) + N (Common) PASS; ZERO failures; archived TestNG XML at `ops/test-results/sprint-ets-03-common-georobotix-smoke-<date>.xml`
- [ ] mvn clean install green: surefire 49+M (where M includes optional VerifyCommonTests if Generator adds substantive coverage)
- [ ] Reproducible build preserved
- [ ] REQ-ETS-PART1-001 status updated PLACEHOLDER → SPECIFIED → IMPLEMENTED in spec.md
- [ ] All 4 SCENARIO-ETS-PART1-001-* PASS

## Tasks
1. Architect ratifies coverage scope + testng.xml strategy
2. Pat (or Architect) expands REQ-ETS-PART1-001 in spec.md from PLACEHOLDER → SPECIFIED with per-assertion enumeration
3. Pat (or Architect) adds 4 SCENARIO-ETS-PART1-001-* blocks to spec.md
4. Generator curls GeoRobotix `/`, `/conformance`, `/collections` (latter handles 404 gracefully); archives to Implementation Notes
5. Generator HTTP-200-verifies Common sub-requirement OGC `.adoc` URLs
6. Generator reads `csapi_compliance/src/engine/registry/common.ts` for v1.0 tolerance comments
7. Generator creates `conformance/common/` subpackage + `CommonTests.java`
8. Generator writes @Test methods per ratified coverage scope, all using ETSAssert helpers + canonical URI form
9. Generator updates testng.xml per Architect's strategy
10. Generator runs full smoke against GeoRobotix; archive TestNG XML; verify 18+N PASS
11. Update spec.md REQ-ETS-PART1-001 PLACEHOLDER → IMPLEMENTED + Sub-deliverable 3 expansion
12. Update _bmad/traceability.md with REQ-ETS-PART1-001 row (replace placeholder with active row)

## Dependencies
- Depends on: Architect ratification of coverage scope + testng.xml strategy
- Provides foundation for: Sprint 4+ remaining 11 Part 1 classes (Subsystems, Procedures, Sampling, Properties, Deployments, etc — all inherit Common's base assertions; the `groups="common"` annotation lets future classes declare `depends-on="common"` if they need Common to PASS first)

## Implementation Notes

### Sprint 3 close (Dana Run 3, 2026-04-29) — IMPLEMENTED

**Status**: All 4 @Tests PASS against GeoRobotix. Smoke total = 22/22 (12 Core + 6 SystemFeatures + 4 Common) at HEAD commit `c56df10` (new repo).

**GeoRobotix curl evidence (architect-handoff hard constraint — captured BEFORE writing assertions)**:

| Endpoint | Status | Key shape |
|---|---|---|
| `GET /` | 200 | `{title, serviceProvider, links: [{rel:"service-desc",type:"application/vnd.oai.openapi;version=3.1"}, {rel:"conformance",type:"application/json"}, {rel:"collections",type:"application/json"}, {rel:"systems",...}, ...]}` |
| `GET /conformance` | 200 | declares `ogcapi-common-1/1.0/conf/core` + `ogcapi-common-2/0.0/conf/collections` + 31 other URIs |
| `GET /collections` | 200 | `{collections: [{id:"all_systems", itemType:"feature", featureType:"system", links:[...]}, {id:"all_datastreams",...}, ...]}` |
| `GET /?f=json` | 200 | landing page JSON body |
| `GET /?f=html` | 400 | "Unsupported format: text/html" — IUT explicitly handles parameter (HTML class is OPTIONAL) |

**URI canonical-form audit** (4 OGC `.adoc` URLs HTTP-200-verified at OGC source):
| URI | OGC `.adoc` source | Status |
|---|---|---|
| `/req/json/definition` | `raw.githubusercontent.com/opengeospatial/ogcapi-common/master/19-072/requirements/json/REQ_definition.adoc` | 200 |
| `/req/landing-page/conformance-success` | `…/19-072/requirements/landing-page/REQ_conformance-success.adoc` | 200 (also used by Core) |
| `/req/collections/collections-list-success` | `…/collections/requirements/collections/REQ_collections-collections-list-success.adoc` | 200 |
| `/req/json/content` | `…/19-072/requirements/json/REQ_content.adoc` | 200 |

**4 @Test methods (per architect-handoff item 17 minimal-then-expand)**:
| @Test | URI | Status | Scenario closed |
|---|---|---|---|
| `commonLandingPageConformanceLinkHasJsonType` | `/req/json/definition` | PASS | LANDING-001 |
| `commonConformanceDeclaresCommonCore` | `/req/landing-page/conformance-success` | PASS | CONFORMANCE-001 |
| `commonCollectionsEndpointReturnsCollectionsArray` | `/req/collections/collections-list-success` | PASS | COLLECTIONS-001 |
| `commonContentNegotiationHonoursFJsonParameter` | `/req/json/content` | PASS | CONTENT-NEGOTIATION-001 |

**testng.xml strategy**: per architect-handoff S-ETS-03-07 readiness rationale + must-item 18, single-block consolidation extended (Common added to existing `<test>` block alongside Core + SystemFeatures). Common is INDEPENDENT of Core — `<group name="common"/>` declared in @Test annotations but NO `dependsOnGroups` declaration in testng.xml `<dependencies>` section. Common runs in parallel with Core. BeforeSuite SkipException pattern still deferred to Sprint 4 (when 4+ classes need it).

**Distinct surface from Core** (avoids duplication): Core (Sprint 1) covers SUCCESS-side at landing-page+oas30 layer (`/req/landing-page/{root,conformance,api-definition}-success` + `/req/oas30/oas-impl`). Common (Sprint 3) covers JSON encoding class (`/req/json/{definition,content}`) + Common Part 2 collections-list (`/req/collections/collections-list-success`) + reuses `/req/landing-page/conformance-success` at Common-class layer (asserts `ogcapi-common-1/1.0/conf/core` IS in the conformsTo array — Core does NOT make this assertion).

**Verification approach** (per mitigation pattern — no Docker round-trip): direct TestNG invocation against the AIO jar at `/tmp/dana-run3-out/`:
```
java -cp target/ets-ogcapi-connectedsystems10-0.1-SNAPSHOT-aio.jar org.testng.TestNG \
  -d /tmp/dana-run3-out /tmp/dana-run3-suite.xml
```
Smoke artifact archived at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-03-{common,full}-georobotix-smoke-2026-04-29.xml` per architect-handoff worktree-pollution constraint.

**Commits**:
- `f384509` — CommonTests + testng.xml single-block consolidation extension
- `c56df10` — live smoke evidence (combined with S-ETS-03-05 nested-properties fix)

### Expected Common sub-requirements (Generator HTTP-200-verifies)
Per OGC API Common Part 1 (19-072) and OGC 23-001 Annex A `/conf/common/` mapping:
1. `/req/common/landing-page` (or `/req/landing-page/<X>` if Common Part 1 uses the existing canonical form Sprint 2 swept to)
2. `/req/common/conformance`
3. `/req/common/collections`
4. `/req/common/content-negotiation` (or `/req/json-html/<X>` per OGC API Common Part 2)
5. `/req/common/json-html` (the `f=json` / `f=html` query parameter discipline)

**Generator's first step is to verify the canonical form** — the `/req/common/<X>` form may or may not exist; Sprint 2 S-ETS-02-03 swept Core's `/req/core/<X>` to `/req/landing-page/<X>` because the OGC `.adoc` source uses class-specific subdirectories. Generator follows the same pattern: curl `https://api.github.com/repos/opengeospatial/ogcapi-common/contents/19-072/requirements?ref=master` to list the actual directories, then derive the canonical form from the `.adoc` `identifier::` line.

### Sprint-1-style minimal coverage (Pat's recommendation)
| @Test method | Asserts | OGC URI | Scenario closed |
|---|---|---|---|
| `commonLandingPageBaseShape` | extends REQ-ETS-CORE-002 with Common-specific link discipline (e.g. `rel="conformance"` mandatory; `rel="data"` or `rel="collections"` if collections endpoint exists) | `/req/common/landing-page` (or canonical equivalent) | SCENARIO-ETS-PART1-001-COMMON-LANDING-001 (CRITICAL) |
| `commonConformanceLists` | extends REQ-ETS-CORE-003 with Common-specific conformance class enumeration (Common's classes appear in `conformsTo`) | `/req/common/conformance` | SCENARIO-ETS-PART1-001-COMMON-CONFORMANCE-001 (NORMAL) |
| `commonCollectionsEndpoint` | `GET /collections` returns 200 + JSON object with `collections` array (SKIP-with-reason if 404) | `/req/common/collections` | SCENARIO-ETS-PART1-001-COMMON-COLLECTIONS-001 (NORMAL) |
| `commonContentNegotiation` | `GET /?f=json` returns `application/json`; `GET /?f=html` returns `text/html` (SKIP if either format not supported) | `/req/common/content-negotiation` | SCENARIO-ETS-PART1-001-COMMON-CONTENT-NEGOTIATION-001 (NORMAL) |

4 @Tests covering the 4 highest-priority Common assertions. Sprint 4+ expansion adds the remaining 1-3 ATS items + parameter validation + paging discipline.

### v1.0 known-issue cross-reference
Sweep `csapi_compliance/src/engine/registry/common.ts` for tolerance comments; v1.0 likely has known-issue handling for content-negotiation edge cases (e.g. servers that return `application/json` but with `;charset=utf-8` parameter; SKIP-with-reason vs FAIL discipline).

### Estimated effort
3-4 hours Generator wall-clock. Per-class new-feature effort ~30-40% the cost of S-ETS-01-02 (~6h) since architectural pattern + ETSAssert + URI canonicalization are all in place.

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] Architect-ratified coverage scope met
- [ ] Smoke total = 12 + 6 + N PASS against GeoRobotix
- [ ] Common is INDEPENDENT of Core verified at runtime (Common runs in parallel; doesn't SKIP if Core fails)
- [ ] REQ-ETS-PART1-001 IMPLEMENTED status in spec.md
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 3 contract success_criterion `common_conformance_class_passes: true` met
