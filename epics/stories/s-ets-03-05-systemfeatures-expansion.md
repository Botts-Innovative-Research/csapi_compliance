# S-ETS-03-05: SystemFeatures expansion — `/req/system/collections` + `/req/system/location-time`

> Status: Active — Sprint 3 | Epic: ETS-02 | Priority: P1 | Complexity: S | Last updated: 2026-04-29

## Description
Sprint 2 S-ETS-02-06 shipped 4 SystemFeatures @Tests covering 3 of 5 v1.0 `system-features.ts` URIs (resources-endpoint, canonical-endpoint, canonical-url). Sprint 3 extends with the 2 deferred URIs per design.md §"Coverage scope rationale" Sprint 3 expansion roadmap:

- **`/req/system/collections`** — REQ-ETS-PART1-002 / OGC `.adoc` source at `req_collections.adoc` (HTTP-200-verified at S-ETS-02-06 Generator turn). Verifies `/systems` collection appears in the `/collections` endpoint discovery (requires Common's `/collections` to be implemented OR independent collection-discovery via the `/systems` landing-page link discipline). Marked MUST priority per OGC 23-001.
- **`/req/system/location-time`** — REQ-ETS-PART1-002 / OGC `.adoc` source at `req_location_time.adoc`. Verifies system items have geometry + validTime. GeoRobotix curl evidence at S-ETS-02-06 Implementation Notes line 76-80 confirms `validTime` is present on representative items: `validTime: ["2023-05-14T15:22:00Z", "now"]`. Marked MAY priority per v1.0 — handle gracefully when absent (SKIP-with-reason, not FAIL).

Generator extends `SystemFeaturesTests.java` with 2 new @Test methods OR spins into a sibling `SystemFeaturesExtendedTests.java` (Generator's call based on file size growth — design.md §"Subpackage layout" notes "if Sprint 3+ expansion grows the @Test count beyond ~10, split into `SystemFeaturesCollectionTests` + `SystemFeaturesItemTests`"; with 4+2=6 tests, single-file is still appropriate — Pat recommends extending the existing file).

Both new @Tests use ETSAssert helpers + `/req/system/<X>` canonical URI form from day 1 (Sprint 2 invariants preserved).

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-PART1-002 (modified — extended with /req/system/collections + /req/system/location-time)
- Scenarios: SCENARIO-ETS-PART1-002-SYSTEMFEATURES-COLLECTIONS-001 (CRITICAL — new), SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LOCATION-TIME-001 (NORMAL — new, MAY-priority handling)

## Acceptance Criteria
- [ ] Generator curls `https://api.georobotix.io/ogc/t18/api/collections` BEFORE writing `systemAppearsInCollections` assertion; if 404, narrow scope to landing-page link `rel="collection"` discovery instead (or SKIP-with-reason if neither path available)
- [ ] New @Test method `systemAppearsInCollections` (or equivalent) added to SystemFeaturesTests.java; uses ETSAssert helpers; `description` attribute references `/req/system/collections`
- [ ] New @Test method `systemHasGeometryAndValidTime` (or equivalent) added to SystemFeaturesTests.java; uses ETSAssert helpers; `description` references `/req/system/location-time`; SKIP-with-reason path for items missing validTime (MAY priority)
- [ ] Both new @Tests have `groups = "systemfeatures"` annotation (preserved from Sprint 2)
- [ ] Smoke against GeoRobotix: total = 12 (Core) + 4 (existing SystemFeatures) + 2 (new SystemFeatures) + N (Common from S-ETS-03-07) = 18+N PASS; no regressions on existing 4 SystemFeatures @Tests
- [ ] Zero new bare-throw sites (Sprint 2 invariant preserved)
- [ ] OGC canonical URI form for both new URIs (Sprint 2 invariant preserved); both .adoc URLs HTTP-200-verified by Generator (curl evidence in Implementation Notes)
- [ ] mvn clean install green: surefire 49+M (where M is +0-3 from optional VerifySystemFeaturesTests if Generator chooses S-ETS-03-06 doc-cleanup option a; otherwise M=0)
- [ ] Reproducible build preserved
- [ ] REQ-ETS-PART1-002 description text in spec.md amended to reflect 5/5 coverage (was 3/5 at Sprint 2 close)
- [ ] Both SCENARIOs PASS

## Tasks
1. Generator curls `/collections` on GeoRobotix; archives response to Implementation Notes
2. Generator reads v1.0 `csapi_compliance/src/engine/registry/system-features.ts` for any tolerance comments on the 2 expansion URIs
3. Generator HTTP-200-verifies the 2 OGC `.adoc` source URLs (cross-check with Sprint 2 mapping table at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-02-uri-canonical-mapping-2026-04-28.md`):
   - `https://raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/system/req_collections.adoc`
   - `https://raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/system/req_location_time.adoc`
4. Generator implements `systemAppearsInCollections` @Test (using `assertJsonArrayContains` per ADR-008 — collection list contains entry with `id="systems"` or canonical IUT path; SKIP if `/collections` 404 AND no landing-page `rel="collection"` link)
5. Generator implements `systemHasGeometryAndValidTime` @Test (using `assertJsonObjectHas` for `geometry` field + custom validTime validation; SKIP if both absent — MAY priority)
6. Generator runs full smoke against GeoRobotix; verifies 18+N PASS (or 18 if S-ETS-03-07 not yet landed at story-execution time)
7. Generator archives smoke XML
8. Update spec.md REQ-ETS-PART1-002 description (3/5 → 5/5 coverage) + SCENARIO-ETS-PART1-002-SYSTEMFEATURES-COLLECTIONS-001 + SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LOCATION-TIME-001 added
9. Update _bmad/traceability.md row for REQ-ETS-PART1-002 (extend description with Sprint 3 expansion)

## Dependencies
- Depends on: nothing (independent extension; uses Sprint 2 ETSAssert + URI canonicalization already landed)
- Provides: 5/5 v1.0 SystemFeatures URI coverage (final SystemFeatures expansion before potential Sprint 4+ pagination/filter coverage)

## Implementation Notes

### v1.0 reference (system-features.ts)
Generator reads `csapi_compliance/src/engine/registry/system-features.ts` for:
- Any tolerance comments on `/req/system/collections` (e.g. "GeoRobotix doesn't implement /collections" → SKIP-with-reason path)
- Any tolerance comments on `/req/system/location-time` (e.g. "validTime is MAY-priority — SKIP if absent")

### GeoRobotix /collections curl (Generator's first step)
```bash
$ curl -sL -w "\nHTTP_STATUS: %{http_code}\n" https://api.georobotix.io/ogc/t18/api/collections | head -50
# If 200: parse for `id="systems"` entry
# If 404: pivot to landing-page rel="collection" discovery
```

### Estimated effort
1-2 hours Generator wall-clock. Both @Tests are mechanical extensions of the proven S-ETS-02-06 pattern; the only novel work is the SKIP-with-reason path for MAY-priority assertions.

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] 5/5 v1.0 SystemFeatures URI coverage achieved
- [ ] Smoke 12+6+N PASS preserved (no regression on existing 4 SystemFeatures @Tests)
- [ ] Spec implementation status updated (REQ-ETS-PART1-002 description amended; traceability.md row extended)
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 3 contract success_criterion `smoke_test_green_against_georobotix: true` met (12+6+N PASS)
