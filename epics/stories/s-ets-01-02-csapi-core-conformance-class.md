# S-ETS-01-02: Implement CS API Core Conformance Class End-to-End

> Status: Active — Sprint 1 | Epic: ETS-02 (cross-listed under ETS-01 for Sprint 1) | Priority: P0 | Complexity: M | Last updated: 2026-04-27

## Description
Implement the first conformance class — CS API Core (`/conf/core` per OGC 23-001 Annex A) — as a fully-working TestNG suite. The suite runs against the GeoRobotix demo server (`https://api.georobotix.io/ogc/t18/api`) and produces PASS verdicts for landing-page, conformance-endpoint, and resource-base-shape assertions. This story proves the test-authoring pattern that the other 13 Part 1 classes will follow.

Spec-knowledge ports as design reference from `csapi_compliance/src/engine/registry/common.ts` and `csapi_compliance/src/engine/registry/csapi-core.ts`. Specifically: the link-relations fix from v1.0 GH#3 (don't require `rel=self` on landing page) and the API-definition fallback (accept `service-desc` OR `service-doc`) are preserved by REQ-ETS-CORE-002.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- Requirements: REQ-ETS-CORE-001, REQ-ETS-CORE-002, REQ-ETS-CORE-003, REQ-ETS-CORE-004
- Scenarios: SCENARIO-ETS-CORE-LANDING-001 (CRITICAL), SCENARIO-ETS-CORE-CONFORMANCE-001 (CRITICAL), SCENARIO-ETS-CORE-RESOURCE-SHAPE-001, SCENARIO-ETS-CORE-LINKS-NORMATIVE-001, SCENARIO-ETS-CORE-API-DEF-FALLBACK-001

## Acceptance Criteria
- [ ] TestNG suite class `org.opengis.cite.ogcapiconnectedsystems10.core.CoreTests` exists with at least one `@Test` per `/conf/core/<assertion>` ATS item
- [ ] Every `@Test`'s `description` attribute starts with `OGC-23-001 /req/core/<assertion>`
- [ ] Each test produces exactly one of PASS, FAIL (with structured message), SKIP (with reason)
- [ ] Landing-page assertion: HTTP 200 + JSON + `title`/`description`/`links` + `rel=conformance` + (`rel=service-desc` OR `rel=service-doc`)
- [ ] Landing-page assertion does NOT require `rel=self` (preserves v1.0 GH#3 fix)
- [ ] API-definition fallback: tests pass when only `service-doc` exists (preserves v1.0 SCENARIO-API-DEF-FALLBACK-001)
- [ ] Conformance endpoint assertion: HTTP 200 + body has `conformsTo` (URI array) + URIs captured into TestNG suite context for downstream classes
- [ ] Resource-base-shape assertion: every resource fetched from a landing-page link has `id`, `type`, `links`
- [ ] HTTP request/response captured in TestNG report attachments
- [ ] Auth credentials masked (first 4 + last 4 chars) when present in attachments
- [ ] Schema validation invoked via Kaizen openapi-parser against pinned OGC OpenAPI YAML
- [ ] All five referenced SCENARIOs pass against GeoRobotix
- [ ] JaCoCo coverage on the Core test class ≥80% line coverage

## Tasks
1. Define TestNG suite XML at `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/testng.xml` registering CoreTests
2. Write `CoreTests.java` with `@BeforeSuite` that fetches landing page + conformance and stores in suite context
3. Write `@Test`-annotated methods, one per `/conf/core/<assertion>`, with `description` attributes
4. Implement HTTP capture utility (REST Assured filter) that attaches request/response to TestNG result
5. Implement credential masker utility (port logic from v1.0 `src/lib/credential-masker.ts`)
6. Wire schema validator: load OGC OpenAPI YAML from pinned commit, validate response bodies via Kaizen
7. Add SCENARIO-* unit tests under `src/test/java/`
8. Run suite against GeoRobotix; capture report
9. Update spec implementation status

## Dependencies
- Depends on: S-ETS-01-01 (need a buildable scaffold)
- Provides foundation for: S-ETS-01-03 (smoke test runs this suite end-to-end)

## Implementation Notes
<!-- Fill after implementation -->
- **Spec-knowledge port references**:
  - `csapi_compliance/src/engine/registry/common.ts` — landing page, conformance, link-relations
  - `csapi_compliance/src/engine/registry/csapi-core.ts` — base resource shape
  - `csapi_compliance/openspec/capabilities/conformance-testing/spec.md` (frozen) — REQ-TEST-001, REQ-TEST-CITE-002, REQ-TEST-003 carry the spec rationale
- **GH#3 fix to preserve**: `rel=self` on landing page is example-only per OGC 19-072; do not assert as mandatory
- **Open questions for Architect**: REST Assured filter pattern for HTTP capture; whether to use `ets-common` `RequirementUtils` for `description` strings

## Definition of Done
- [ ] All acceptance criteria checked
- [ ] All five Core SCENARIOs pass against GeoRobotix
- [ ] Spec implementation status updated
- [ ] Story status set to Done in this file and in `epic-ets-02-part1-classes.md`
- [ ] Sprint 1 contract evaluation criteria met
