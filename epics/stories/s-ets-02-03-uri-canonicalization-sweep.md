# S-ETS-02-03: URI form drift sweep — spec.md + traceability.md + Java @Test descriptions to OGC canonical .adoc form

> Status: **Implemented** — Sprint 2 | Epic: ETS-02 | Priority: P0 | Complexity: M | Last updated: 2026-04-28

## Description
Close the inherited PARTIAL on the Sprint 1 contract's `uri_mapping_fidelity_preserved` success_criterion — the only outstanding Sprint 1 success_criterion. Quinn s02 GAP-2 + Raze s02 GAP-2 + Quinn s03 + Raze s03 (INHERITED PARTIAL) all flag the same gap: there are THREE different URI forms in play across the project:

| Layer | URI form example |
|-------|------------------|
| v1.0 TS web app (`csapi_compliance/src/engine/registry/common.ts`) | `/req/ogcapi-common/landing-page` |
| Java port (`conformance/core/*.java` `REQ_*` constants) | `/req/core/root-success` |
| OGC normative `.adoc` (verified-canonical) | `/req/landing-page/root-success` |

Source of the discrepancy is upstream of S-ETS-01-02: spec.md text already used the `/req/core/<X>-success` form when Dana implemented; she faithfully reflected the spec. The OGC `.adoc` canonical form was independently verified by Raze on 2026-04-17 at `https://raw.githubusercontent.com/opengeospatial/ogcapi-common/master/19-072/requirements/landing-page/REQ_root-success.adoc` (recorded at `.harness/evaluations/sprint-api-def-fallback-adversarial.yaml`). A CITE SC reviewer dereferencing the @Test description URIs against the OGC normative document will get HTTP 404 — real audit risk.

This sweep canonicalizes ~30-40 sites across 2 repos to the OGC `.adoc` form. After this sweep, dereferencing any @Test description URI against the OGC normative document SHOULD return 200 (not 404). Closing this story flips Sprint 1's `uri_mapping_fidelity_preserved` from PARTIAL → PASS.

## OpenSpec References
- Spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` (REQ-ETS-CORE-002, REQ-ETS-CORE-003, REQ-ETS-CORE-004 URI strings updated)
- Requirements: REQ-ETS-CORE-001..004 (modified — URI strings to OGC canonical form), REQ-ETS-CLEANUP-002 (NEW — URI canonicalization)
- Scenarios: SCENARIO-ETS-CLEANUP-URI-CANONICALIZATION-001 (CRITICAL — closes Sprint 1 inherited PARTIAL), SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 (CRITICAL)

## Acceptance Criteria
- [x] Generator produced verified-canonical-URI mapping table BEFORE editing code (curl-verified each .adoc URL returned HTTP 200)
- [x] Mapping table archived at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-02-uri-canonical-mapping-2026-04-28.md`
- [x] Java `static final String REQ_*` constants updated (3 of 4; REQ_OAS30_OAS_IMPL already canonical)
- [x] Java @Test description attributes updated automatically via constants (LandingPageTests/ConformanceTests/ResourceShapeTests verified by `grep -hoE 'http://www\.opengis\.net/spec/[^ "]+' ... | sort -u` returning only canonical URIs)
- [x] csapi_compliance spec.md REQ-ETS-CORE-001 + REQ-ETS-CORE-002 description text updated with canonical /req/landing-page/* citations
- [x] csapi_compliance spec.md SCENARIO-ETS-CORE-LANDING-001 then-clause URI updated to canonical form
- [x] csapi_compliance _bmad/traceability.md SCENARIO-LINKS-NORMATIVE-001 row updated; S-ETS-02-02 + S-ETS-02-03 row statuses flipped Active → Implemented
- [x] mvn clean install green (49/0/0/3 surefire — was 22/0/0/3 at Sprint 1 close)
- [x] scripts/smoke-test.sh STILL exits 0 with 12/12 PASS against GeoRobotix
- [x] Spot-check passed: 4 canonical URLs return HTTP 200 against the OGC normative source (mapping-table doc records the verification commands)
- [x] SCENARIO-ETS-CLEANUP-URI-CANONICALIZATION-001 passes
- [x] SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 passes
- [x] **Sprint 1 contract `uri_mapping_fidelity_preserved` flips PARTIAL → PASS** (closed at this story's commit)

## Tasks
1. Generator builds the verified-canonical-URI mapping table (per Acceptance Criterion 1) — FIRST, before any code edits
2. Quinn or orchestrator spot-checks the table for sanity (catches OGC `.adoc` lookup errors before they propagate)
3. Generator updates Java `REQ_*` constants in `conformance/core/*.java` (commit 1)
4. Generator runs smoke-test.sh — verify still 12/12 PASS
5. Generator updates spec.md REQ blocks (commit 2)
6. Generator updates spec.md Scenarios (commit 3)
7. Generator updates traceability.md cross-references (commit 4)
8. Generator runs `grep -hoE 'http://www\\.opengis\\.net/spec/[^ "]+' src/main/java/.../conformance/*/*.java | sort -u` — verify ALL URIs match the canonical table
9. Update spec.md Implementation Status to reflect uri_mapping_fidelity_preserved closure

## Dependencies
- Depends on: (no story-level deps; can begin in parallel with S-ETS-02-01 + S-ETS-02-04)
- Provides foundation for: S-ETS-02-06 (SystemFeaturesTests MUST use the canonical URI form from day 1)

## Implementation Notes
- **Verified-canonical-URI mapping table archived** at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-02-uri-canonical-mapping-2026-04-28.md` per acceptance criterion #1. Methodology: curl `raw.githubusercontent.com/opengeospatial/ogcapi-common/master/19-072/requirements/<class>/REQ_<X>.adoc` and inspect the `*Requirement {counter:req-id}* |*/req/<class>/<X>*` line. Quinn spot-checks during gate review.
- **Empirical finding**: OGC 19-072's `requirements/` directory has ONLY 4 subdirs (html, json, landing-page, oas30) — there is NO `core/` subdir. Sprint 1's `/req/core/...` form was a Java-side convention error; the v1.0 TS used `/req/ogcapi-common/...` which was a different drift. Both forms 404 on the OGC normative source.
- **Mapping table** (3 of 4 Java REQ_* required updates):
  - `REQ_ROOT_SUCCESS`: `/req/core/root-success` → `/req/landing-page/root-success`
  - `REQ_CONFORMANCE_SUCCESS`: `/req/core/conformance-success` → `/req/landing-page/conformance-success`
  - `REQ_API_DEFINITION_SUCCESS`: `/req/core/api-definition-success` → `/req/landing-page/api-definition-success`
  - `REQ_OAS30_OAS_IMPL`: already canonical (`/req/oas30/oas-impl`), no change
  - `CS_CORE_CONFORMANCE_URI`: `/conf/core` (CS API conformance class identifier — not a /req, no .adoc lookup; preserved verbatim)
- **2 commits**:
  - `1abdaa2` (ets-ogcapi-connectedsystems10@main) — Java REQ_* constants + Javadoc references + mapping table archive
  - `3405931` (csapi_compliance@main) — spec.md REQ-ETS-CORE-001/002 description text + SCENARIO-ETS-CORE-LANDING-001 then-clause + traceability.md SCENARIO-LINKS-NORMATIVE-001 row + S-ETS-02-* row status flips
- **Spot-check (post-sweep)**: all 4 canonical URLs return HTTP 200 against the OGC `.adoc` source — verified 2026-04-28; spot-check methodology preserved in the mapping-table doc.
- **Sprint 1 inherited PARTIAL `uri_mapping_fidelity_preserved` flips PARTIAL → PASS** at this story's close per Sprint 1 contract.
- **Reference for prior canonical-fetch evidence**: `.harness/evaluations/sprint-api-def-fallback-adversarial.yaml` (Raze 2026-04-17 verified `/req/landing-page/root-success`).
- **Deviations**: none.

## Definition of Done
- [x] All acceptance criteria checked
- [x] Verified-canonical-URI mapping table archived
- [x] All sites updated cleanly (zero regressions; smoke 12/12 PASS preserved)
- [x] Smoke 12/12 PASS preserved
- [x] Sprint 1 inherited `uri_mapping_fidelity_preserved` PARTIAL → PASS (closed)
- [x] Spec implementation status updated
- [x] Story status set to Done in this file
- [x] Sprint 2 contract evaluation criteria met (`uri_form_matches_ogc_adoc_canonical: true`, `uri_mapping_fidelity_preserved: true`)
