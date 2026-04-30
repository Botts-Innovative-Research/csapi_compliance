# OGC API Connected Systems ETS — Specification

> Version: 1.0 | Status: Draft (Sprint 1 contract pending) | Last updated: 2026-04-27
>
> **Capability scope**: A Java/TestNG Executable Test Suite for OGC TeamEngine that validates
> conformance against OGC 23-001 (Part 1: Feature Resources) and OGC 23-002 (Part 2: Dynamic Data),
> packaged as the certification-track deliverable for OGC CITE submission. Supersedes the v1.0
> web-app capabilities (`endpoint-discovery`, `conformance-testing`, `dynamic-data-testing`,
> `test-engine`, `request-capture`, `reporting`, `export`, `progress-session`), all of which are
> now `Frozen — v1.0 web app, superseded by ets-ogcapi-connectedsystems`.

## Purpose

This capability defines an OGC-compliant Executable Test Suite (ETS) for the OGC API – Connected Systems standard. The ETS is generated from `org.opengis.cite:ets-archetype-testng:2.7`, runs inside TeamEngine 5.6.x (currently 5.6.1), and produces a per-conformance-class pass/fail/skip verdict against an Implementation Under Test (IUT) supplied as a CS API landing-page URL. The deliverable maps to PRD v2.0 functional requirements FR-ETS-01 through FR-ETS-90.

This capability does NOT define web-app endpoints, UI components, REST APIs, or session management — those concerns are owned by TeamEngine and superseded by the v1.0 web-app freeze.

## Functional Requirements

### Sub-deliverable 1 — Maven Archetype Scaffold

#### REQ-ETS-SCAFFOLD-001: Archetype Generation
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The deliverable SHALL be generated from `org.opengis.cite:ets-archetype-testng:2.7` with `groupId=org.opengis.cite`, `artifactId=ets-ogcapi-connectedsystems10`, `ets-code=ogcapi-connectedsystems10`, `ets-title='OGC API - Connected Systems Part 1'`. The generation command and any post-generation modernization SHALL be recorded in `ops/server.md` for reproducibility.
- **Rationale**: OGC convention. Deviating from the archetype produces an ETS that CITE SC reviewers will not recognize structurally.
- **Maps to**: PRD FR-ETS-01, R-PIVOT-01.

#### REQ-ETS-SCAFFOLD-002: JDK 17 + Maven 3.9
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The generated `pom.xml` SHALL declare `maven.compiler.source=17`, `maven.compiler.target=17`, and require Maven 3.9 or higher. Builds SHALL fail (not silently downgrade) on older JDKs/Maven.
- **Rationale**: TeamEngine 5.6.x (currently 5.6.1) is JDK 17. The 2019-vintage archetype defaults to older versions; modernization is mandatory.
- **Maps to**: PRD FR-ETS-02, NFR-ETS-02.

#### REQ-ETS-SCAFFOLD-003: Repo Layout Mirrors `ets-ogcapi-features10`
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The repository layout SHALL include: `src/main/java/org/opengis/cite/ogcapiconnectedsystems10/` (Java sources), `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/testng.xml` (suite definition), `src/main/resources/schemas/` (OGC JSON Schemas, ported from `csapi_compliance/schemas/`), `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl` (TeamEngine CTL wrapper), `src/site/` (AsciiDoc documentation), `src/test/resources/fixtures/spec-traps/` (ported corpus), `Dockerfile`, `Jenkinsfile`, `docker-compose.yml`, `pom.xml`, `README.adoc`.
- **Rationale**: CITE reviewers expect structural parity with reference ETSs. Divergences require justification.
- **Maps to**: PRD FR-ETS-03, R-PIVOT-02.

#### REQ-ETS-SCAFFOLD-004: Pinned Dependencies
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: All dependencies in `pom.xml` SHALL be pinned to specific release versions. No `RELEASE`, `LATEST`, or open-ended ranges. Required dependencies: `org.opengis.cite:ets-common:17`, `org.opengis.cite.teamengine:teamengine-spi`, `org.testng:testng`, `io.rest-assured:rest-assured`, `com.reprezen.kaizen:openapi-parser`, `org.locationtech.jts:jts-core`, `org.locationtech.proj4j:proj4j`, `org.slf4j:slf4j-api`, `ch.qos.logback:logback-classic`.
- **Rationale**: Reproducible builds. CITE SC review may take months; transitive-dependency drift would invalidate the review.
- **Maps to**: PRD FR-ETS-04, NFR-ETS-01.

#### REQ-ETS-SCAFFOLD-005: Reproducible Build
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: `mvn clean install` SHALL exit 0 on a clean checkout with JDK 17 and Maven 3.9. Two builds from the same commit SHALL produce byte-identical jars excluding `META-INF/` timestamps. CI SHALL verify via a double-build diff job.
- **Rationale**: NFR-ETS-01.
- **Maps to**: PRD FR-ETS-05.

#### REQ-ETS-SCAFFOLD-006: Modernization ADRs
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: Every dependency-version bump or generated-scaffold modification beyond the archetype defaults SHALL be recorded as an ADR under `_bmad/adrs/`. The ADR SHALL include the original archetype value, the new value, the rationale, and links to relevant CVEs or compatibility issues.
- **Rationale**: The archetype is from 2019; modernization decisions accumulate and need to be auditable for CITE review.
- **Maps to**: PRD FR-ETS-06.

#### REQ-ETS-SCAFFOLD-007: Hosting Topology
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The repository SHALL be hosted at `github.com/<our-org>/ets-ogcapi-connectedsystems10` for the duration of pre-beta development. A draft contribution proposal to OGC SHALL be prepared at the beta milestone (R-PIVOT-12 / REQ-ETS-CITE-003), but the repo SHALL NOT be transferred or mirrored to OGC before then.
- **Rationale**: User decision 2026-04-27.
- **Maps to**: PRD FR-ETS-07.

### Sub-deliverable 2 — CS API Core Conformance Class (Sprint 1 target)

#### REQ-ETS-CORE-001: Test Method Per ATS Assertion
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/core/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical requirement URI (e.g. `OGC-19-072 /req/landing-page/root-success` for landing-page assertions inherited from OGC API Common Part 1, or `OGC-23-001 /req/<class>/<X>` for CS API assertions). The URI form SHALL match the canonical `.adoc` source under `https://raw.githubusercontent.com/opengeospatial/ogcapi-common/master/19-072/requirements/<class>/REQ_<X>.adoc` (or the OGC 23-001 equivalent for CS API requirements). Each `@Test` SHALL produce exactly one of: PASS, FAIL (with structured message), SKIP (with reason).
- **Rationale**: Spec traceability; CITE reviewers map ATS to ETS by URI.
- **Maps to**: PRD FR-ETS-10, SC-2, SC-8.

#### REQ-ETS-CORE-002: Landing-Page Assertions
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The Core suite SHALL assert: (a) `GET /` returns HTTP 200 with `Content-Type` containing `application/json`; (b) the body has `title`, `description`, and `links` (array); (c) `links` contains entries with `rel=conformance` AND (`rel=service-desc` OR `rel=service-doc`) — citation: OGC API Common Part 1 (19-072) `/req/landing-page/root-success`, `/req/landing-page/conformance-success`, `/req/landing-page/api-definition-success` (canonical `.adoc` URIs verified 2026-04-28 per S-ETS-02-03). Absence of BOTH `service-desc` and `service-doc` is the FAIL condition; absence of only one PASSES via fallback. The `rel=self` relation is example-only and SHALL NOT be asserted as mandatory (this preserves the v1.0 GH#3 fix).
- **Rationale**: Preserves the link-relation fix landed in v1.0 sprint user-testing-round-01. Re-introducing a strict `self` requirement would regress against real-world conformant servers.
- **Maps to**: PRD FR-ETS-10. Direct port of v1.0 `REQ-TEST-001` and `REQ-TEST-CITE-002`.

#### REQ-ETS-CORE-003: Conformance Endpoint
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The Core suite SHALL assert `GET /conformance` returns HTTP 200 with a JSON body containing `conformsTo` (array of URI strings). The IUT's declared conformance classes are extracted from this response and used by dependent suites to decide PASS/SKIP.
- **Maps to**: PRD FR-ETS-10.

#### REQ-ETS-CORE-004: Resource Base Shape
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The Core suite SHALL assert that any resource discoverable from the landing-page links includes `id` (string), `type` (string matching the resource kind), and `links` (array of objects with `href`, `rel`, optional `type`, optional `title`).
- **Maps to**: PRD FR-ETS-10. Direct port of v1.0 `REQ-TEST-003`.

### Sub-deliverable 3 — Other Part 1 Conformance Classes

> Sprint 2 expands REQ-ETS-PART1-002 (SystemFeatures) from PLACEHOLDER → SPECIFIED.
> The remaining 12 placeholder REQs below establish the certification surface and traceability chain.

#### REQ-ETS-PART1-001: Common Conformance Class (Sprint 3 target)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 3, S-ETS-03-07; pending Quinn+Raze gate close — 4 @Tests PASS against GeoRobotix at smoke commit `c56df10`)
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/common/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical `.adoc` requirement URI form. Generator MUST verify the canonical form via OGC `.adoc` source HTTP-200 fetch BEFORE writing assertions (continuing the S-ETS-02-03 / S-ETS-02-06 URI-canonicalization discipline; the form may be `/req/common/<X>` or may follow Common Part 1's existing `/req/landing-page/<X>` / `/req/oas30/<X>` / `/req/json/<X>` etc subdirectory pattern depending on what the OGC 19-072 + 23-001 Annex A actually specify). Expected sub-requirements: (a) Common landing-page link discipline beyond Core's subset (e.g. `rel=conformance` mandatory; `rel=data` or `rel=collections` if collections endpoint exists); (b) Common conformance enumeration (`conformsTo` includes Common's classes); (c) `/collections` endpoint shape per `/req/common/collections` (SKIP-with-reason if IUT returns 404 — GeoRobotix may not implement); (d) content-negotiation discipline via `f=json` / `f=html` query parameter per `/req/common/content-negotiation`. The Common class lives at `org.opengis.cite.ogcapiconnectedsystems10.conformance.common.CommonTests` per design.md placeholder. Common is INDEPENDENT of Core — same DAG-root level — and runs in parallel (no `dependsOnGroups` declaration on the `common` group). Coverage scope at Sprint 3 close: Sprint-1-style minimal (4 @Tests covering 4 highest-priority assertions per Architect ratification — see design.md Sprint 3 ratifications); Sprint 4+ expansion adds 1-3 remaining ATS items + parameter validation + paging discipline.
- **Rationale**: Common is foundational — every remaining 11 Part 1 class (Subsystems, Procedures, Sampling, Properties, Deployments, AdvancedFiltering, CRUD, Update, Subdeployments, GeoJSON, SensorML) inherits from Common's base assertions. Highest dependency-leverage of any single class; landing Common in Sprint 3 unlocks Sprint 4+ remaining classes cleanly.
- **Maps to**: PRD FR-ETS-11.

#### REQ-ETS-PART1-002: SystemFeatures Conformance Class (Sprint 2 target — extended Sprint 3)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 2 close, S-ETS-02-06, Quinn 0.96 + Raze 0.92; Sprint 3 extended with /req/system/collections + /req/system/location-time via S-ETS-03-05 — 6 @Tests total now PASS against GeoRobotix at smoke commit `c56df10`, pending Quinn+Raze)
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/system/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical `.adoc` requirement URI form `/req/system/<assertion>` (e.g. `OGC-23-001 .../req/system/resources-endpoint`). **URI form reconciled 2026-04-28T23:35Z**: design.md text and Sprint 2 contract used `/conf/system-features/` and `/req/system-features/<X>`; OGC `.adoc` canonical source uses `/conf/system` (singular, no `-features` suffix) and `/req/system/<X>`. The 5 sub-requirement `.adoc` files at `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/system/` (HTTP-200-verified by Generator at S-ETS-02-06): `req_resources_endpoint.adoc`, `req_canonical_url.adoc`, `req_canonical_endpoint.adoc`, `req_collections.adoc`, `req_location_time.adoc`. The IUT (GeoRobotix) also declares `/conf/system` in `/conformance` — same form. v1.0 registry `csapi_compliance/src/engine/registry/system-features.ts` uses `/req/system/<X>`. Same drift class as S-ETS-02-03's `/req/core/*` → `/req/landing-page/*` correction. The class lives at `org.opengis.cite.ogcapiconnectedsystems10.conformance.systemfeatures.SystemFeaturesTests` per design.md placeholder. Required behaviors: (a) `GET /systems` returns HTTP 200 with JSON body containing a non-empty `items` array (per OGC API – Features clause 7.15.2-7.15.8 inherited via `/req/system/resources-endpoint`); (b) `GET /systems/{id}` returns the canonical single-item shape — `id` (string), `type` (string), `links` (array per REQ-ETS-CORE-004 base shape) — per `/req/system/canonical-endpoint`; (c) `/systems/{id}` `links` array contains `rel="canonical"` per `/req/system/canonical-url` — absence of `rel="self"` is NOT FAIL (carries v1.0 GH#3 fix policy from Core landing page; v1.0 audit at `system-features.ts:36-44`); (d) the SystemFeatures class declares TestNG suite-level dependency on Core via group dependency wiring (`<dependencies><group name="systemfeatures" depends-on="core"/>`) so SystemFeatures @Tests SKIP gracefully if Core FAILs. Coverage scope: Sprint-1-style minimal (4 @Tests) at Sprint 2 close per Architect ratification (design.md §"SystemFeatures conformance class scope"); Sprint 3 expansion adds `/req/system/collections` + `/req/system/location-time` + pagination/filter coverage.
- **Rationale**: SystemFeatures is the foundational CS API collection — every other CS API endpoint exposes `/systems` collections, so the patterns established here (collection shape, item shape, dependency-skip wiring) propagate to Subsystems, Procedures, Sampling, Properties, Deployments. GeoRobotix serves a non-empty `/systems` collection (36 items confirmed at S-ETS-02-06 curl-verification 2026-04-28T23:30Z, Implementation Notes archive in `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md`).
- **Maps to**: PRD FR-ETS-12.

#### REQ-ETS-PART1-003: Subsystems Conformance Class (Sprint 4 target)

> Sprint 5 Run 1 doc-only amendment (S-ETS-05-04 item A): SubsystemsTests.java class-level javadoc enumeration of OGC `.adoc` files corrected from 5 → 6 (added `req_subcollection_time.adoc` per Raze CONCERN-1) and clarified that the subcollection_time .adoc exists in the GitHub directory but is NOT enumerated in `requirements_class_system_components.adoc`'s `requirement::` list (deferred to Sprint 5+ recursive-* expansion). No behaviour change; status remains IMPLEMENTED.

- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 4 Run 2, S-ETS-04-05; pending Quinn+Raze gate close — 4 @Tests PASS against GeoRobotix at smoke commit `2dc44d1`; canonical URI `/req/subsystem/collection` curl-verified at OGC repo; `subsystemHasParentSystemLink` UNIQUE-to-Subsystems invariant verified against subsystem `0nar3cl0tk3g` rel=parent link)
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/subsystem/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical `.adoc` requirement URI form `/req/subsystem/<assertion>` (e.g. `OGC-23-001 .../req/subsystem/resources-endpoint`). Generator MUST verify the canonical form via OGC `.adoc` source HTTP-200 fetch BEFORE writing assertions (continuing the S-ETS-02-03 / S-ETS-02-06 / S-ETS-03-07 URI-canonicalization discipline). Expected sub-requirements (~4-5 per OGC 23-001 Annex A `/conf/subsystem/`): (a) `/req/subsystem/resources-endpoint` — `GET /systems/{id}/subsystems` returns HTTP 200 + non-empty `items` array (if implemented by IUT; SKIP-with-reason if 404); (b) `/req/subsystem/canonical-endpoint` — `GET /subsystems/{id}` returns canonical single-item shape (id, type, links per REQ-ETS-CORE-004 base shape); (c) `/req/subsystem/canonical-url` — subsystem links contain `rel="canonical"` (absence of `rel="self"` is NOT FAIL — preserves v1.0 GH#3 fix policy from Core landing page); (d) `/req/subsystem/parent-system-link` — subsystem links contain `rel="system"` (or equivalent) referencing the parent system. The Subsystems class lives at `org.opengis.cite.ogcapiconnectedsystems10.conformance.subsystems.SubsystemsTests` per design.md placeholder. Subsystems DEPENDS ON SystemFeatures via TestNG group dependency wiring (`<dependencies><group name="subsystems" depends-on="systemfeatures"/>`) — FIRST two-level dependency chain in the project (Subsystems→SystemFeatures→Core). Coverage scope at Sprint 4 close: Sprint-1-style minimal (4 @Tests covering 4 highest-priority assertions per Architect ratification — see design.md Sprint 4 ratifications); Sprint 5+ expansion adds remaining ATS items.
- **Rationale**: Subsystems is the FIRST class to exercise a TWO-LEVEL group dependency chain (Subsystems→SystemFeatures→Core). Sprint 3 proved one-level (SystemFeatures→Core) live cascading-skip via S-ETS-03-01 sabotage exec. Subsystems extends to two levels — critical proof point before Sprint 5+ scales to remaining 10 Part 1 classes (most depend on either SystemFeatures or SystemFeatures+Common). Procedures/Sampling/Properties/Deployments are siblings of Subsystems (also depend on SystemFeatures); once Subsystems proves the two-level pattern, Sprint 5+ can BATCH 2-3 of these classes per sprint with confidence. GeoRobotix readily exercises Subsystems via `/systems/{id}/subsystems` (Generator MUST curl-verify BEFORE writing assertions).
- **Maps to**: PRD FR-ETS-13.

#### REQ-ETS-PART1-004: Deployments Conformance Class (Sprint 5 target)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 5 Run 2, S-ETS-05-06; sister repo HEAD `c25e44a` 2026-04-29; pending Quinn+Raze gate close. New class `org.opengis.cite.ogcapiconnectedsystems10.conformance.deployments.DeploymentsTests` (4 @Tests covering /req/deployment/{resources-endpoint,canonical-endpoint,canonical-url,deployed-system-resource}); testng.xml extended with `<group name="deployments" depends-on="systemfeatures"/>` + DeploymentsTests added to single-block consolidation; VerifyTestNGSuiteDependency extended with 3 new structural lint tests for Deployments group/co-location/method-tagging. UNIQUE-to-Deployments: deployed-system-resource encoding-class assertion checks IUT /conformance for at least one matching encoding URI (conf/geojson|sensorml|json|html); SKIP-with-reason if absent. GeoRobotix Generator-time verification: /deployments returns 1 item (id=16sp744ch58g, type=Feature, geometry=Polygon — Saildrone Arctic Mission); /conformance declares conf/geojson + conf/sensorml — assertion PASSES. Smoke target post-Run-2: 26+4=30 PASS (mvn 78/0/0/3 BUILD SUCCESS). Live smoke deferred to Quinn/Raze gate.)
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/deployment-features/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical `.adoc` requirement URI form `/req/deployment/<assertion>`. The 5 sub-requirement `.adoc` files at `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/deployment/` (HTTP-200-verified by Pat 2026-04-29): `req_resources_endpoint.adoc`, `req_canonical_url.adoc`, `req_canonical_endpoint.adoc`, `req_deployed_system_resource.adoc` (identifier: `/req/deployment/deployed-system-resource` — HYPHENATED), `req_collections.adoc`. The class lives at `org.opengis.cite.ogcapiconnectedsystems10.conformance.deployments.DeploymentsTests`. Deployments DEPENDS ON SystemFeatures via `<group name="deployments" depends-on="systemfeatures"/>`. Coverage scope at Sprint 5: Sprint-1-style minimal (4-5 @Tests): (a) GET /deployments 200 + non-empty items; (b) GET /deployments/{id} canonical shape; (c) rel=canonical link; (d) /req/deployment/deployed-system-resource — SKIP-with-reason if IUT doesn't declare DeployedSystem encoding conformance class. GeoRobotix serves 1 deployment (single-item shape is valid; non-empty check passes). Generator MUST re-verify at sprint time.
- **Rationale**: Deployments is a SystemFeatures sibling (depends on SystemFeatures, not Core directly). With the two-level cascade proven at Sprint 4, Sprint 5 mechanically extends to Deployments using the identical pattern. GeoRobotix confirms the /deployments endpoint exists (1 item).
- **Maps to**: PRD FR-ETS-14.

#### REQ-ETS-PART1-005: Subdeployments Conformance Class
- **Priority**: MUST
- **Status**: PLACEHOLDER (per-class detail deferred to Sprint 6+)
- **Description**: For `/conf/subdeployments/`, the ETS SHALL provide @Tests per ATS assertions, canonical URI form, dependency wiring per the established pattern.
- **Maps to**: PRD FR-ETS-15.

#### REQ-ETS-PART1-006: Procedures Conformance Class (Sprint 5 target)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 5 Run 2, S-ETS-05-05; sister repo HEAD `c25e44a` 2026-04-29; pending Quinn+Raze gate close. New class `org.opengis.cite.ogcapiconnectedsystems10.conformance.procedures.ProceduresTests` (4 @Tests covering /req/procedure/{resources-endpoint,location,canonical-endpoint,canonical-url}); testng.xml extended with `<group name="procedures" depends-on="systemfeatures"/>` + ProceduresTests added to single-block consolidation; VerifyTestNGSuiteDependency extended with 3 new structural lint tests for Procedures. UNIQUE-to-Procedures geometry-null invariant per /req/procedure/location verbatim ("A Procedure feature resource SHALL not include a location or geometry") — Generator-time GeoRobotix re-verification: ALL 19 procedures at /procedures have geometry: null; assertion implemented as-written (no SKIP-with-reason fallback needed since invariant holds at IUT level). Smoke target post-Run-2: 26+4=30 PASS contribution (mvn 78/0/0/3 BUILD SUCCESS). Live smoke deferred to Quinn/Raze gate.)
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/procedure-features/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical `.adoc` requirement URI form `/req/procedure/<assertion>`. The 5 sub-requirement `.adoc` files at `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/procedure/` (HTTP-200-verified by Pat 2026-04-29): `req_resources_endpoint.adoc`, `req_canonical_url.adoc`, `req_canonical_endpoint.adoc`, `req_location.adoc` (identifier: `/req/procedure/location` — Procedure SHALL NOT include geometry), `req_collections.adoc`. The class lives at `org.opengis.cite.ogcapiconnectedsystems10.conformance.procedures.ProceduresTests`. Procedures DEPENDS ON SystemFeatures via `<group name="procedures" depends-on="systemfeatures"/>`. Coverage scope at Sprint 5: Sprint-1-style minimal (4-5 @Tests): (a) GET /procedures 200 + non-empty items; (b) GET /procedures/{id} canonical shape; (c) rel=canonical link; (d) `/req/procedure/location` — geometry=null invariant (UNIQUE to Procedures — not in Subsystems or SystemFeatures). Generator MUST curl-verify geometry value BEFORE writing assertion; if IUT returns non-null geometry, use SKIP-with-reason. GeoRobotix serves 19 procedures. Generator MUST re-verify at sprint time.
- **Rationale**: Procedures is a SystemFeatures sibling. Sprint 5 two-class batch (with Deployments) uses the now-proven cascade pattern. The geometry=null invariant is Procedures-unique and represents new assertion surface not present in prior classes.
- **Maps to**: PRD FR-ETS-16.

#### REQ-ETS-PART1-007..013: Remaining Per-Class Conformance Suites
- **Priority**: MUST
- **Status**: PLACEHOLDER (per-class detail deferred to Sprint 6+)
- **Description**: For each of the remaining 7 OGC 23-001 conformance classes (007=`sampling-features`, 008=`property-definitions`, 009=`advanced-filtering`, 010=`create-replace-delete`, 011=`update`, 012=`geojson`, 013=`sensorml`), the ETS SHALL provide a TestNG suite class structurally equivalent to Core (REQ-ETS-CORE-001..004), SystemFeatures (REQ-ETS-PART1-002), Common (REQ-ETS-PART1-001), Subsystems (REQ-ETS-PART1-003), Procedures (REQ-ETS-PART1-006), and Deployments (REQ-ETS-PART1-004): one `@Test` per ATS assertion, `description` attribute carries the OGC canonical `.adoc` requirement URI form, suite-level dependency declared via TestNG `dependsOnGroups` if a prerequisite class fails.
- **Rationale**: PRD SC-2 requires Part 1 coverage. Sprint 5 batches Deployments + Procedures; Sprint 6 batches Sampling + Properties; Sprint 7+ handles the remaining 5.
- **Maps to**: PRD FR-ETS-17..23.

### Sub-deliverable 4 — Part 2 Conformance Classes (placeholders, NOT in Sprint 1)

#### REQ-ETS-PART2-001..014: Part 2 Conformance Suites
- **Priority**: MUST (eventually); SHALL NOT be scoped into Sprint 1.
- **Status**: PLACEHOLDER (Part 2 work scheduled post-Part-1 per user gate 2026-04-27)
- **Description**: For each of the 14 OGC 23-002 conformance classes (`api-common`, `datastream`, `controlstream`, `feasibility`, `system-event`, `system-history`, `advanced-filtering`, `create-replace-delete`, `update`, `json`, `swecommon-json`, `swecommon-text`, `swecommon-binary`, `observation-binding`), the ETS SHALL provide a TestNG suite class structurally equivalent to Part 1 classes. Per-assertion REQ-* IDs deferred to future sprint planning.
- **Rationale**: PRD SC-3 requires Part 2 coverage. User gate locks Sprint 1 to Part 1 only.
- **Maps to**: PRD FR-ETS-30..43.

### Sub-deliverable 5 — TeamEngine Integration

#### REQ-ETS-TEAMENGINE-001: SPI Registration
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The ETS SHALL expose a class implementing the TeamEngine TestNG SPI (e.g. `org.opengis.cite.ogcapiconnectedsystems10.TestNGController` extending `com.occamlab.te.spi.executors.testng.TestNGExecutor` per `ets-common` convention). The SPI registration SHALL be declared via `META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` so TeamEngine 5.6.x (currently 5.6.1) discovers the suite at startup.
- **Rationale**: Without SPI registration TeamEngine cannot enumerate the suite.
- **Maps to**: PRD FR-ETS-50.

#### REQ-ETS-TEAMENGINE-002: CTL Wrapper
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: A CTL wrapper at `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl` SHALL expose the suite to TeamEngine's CTL UI, accepting `iut-url` (CS API landing-page URL, required), `auth-type` (one of `none`, `bearer`, `apikey`, `basic`, optional, default `none`), and `auth-credential` (string, optional). The CTL wrapper passes these as TestNG suite parameters.
- **Rationale**: TeamEngine 5.6.x (currently 5.6.1)'s primary entry surface is CTL; SPI alone is not enough for the user-visible UI.
- **Maps to**: PRD FR-ETS-51.

#### REQ-ETS-TEAMENGINE-003: Dockerfile
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: A `Dockerfile` SHALL produce a runnable TeamEngine 5.6.1 webapp on a JDK 17 base image with the built ETS jar staged under `/usr/local/tomcat/webapps/teamengine/WEB-INF/lib/`. The image SHALL build via `docker build -t ets-ogcapi-connectedsystems10 .` from a clean checkout with no additional host dependencies. **Original REQ wording (`extends ogccite/teamengine-production:5.6.1`) reconciled 2026-04-28T19:55Z** per Quinn s03 GAP-1 + Raze s03 CONCERN-1: the `:5.6.1` tag does not exist on Docker Hub (only `:latest` and `:1.0-SNAPSHOT`), and the production image runs JDK 8 (incompatible with the JDK 17 ETS jar — `UnsupportedClassVersionError class file version 61.0`). Implemented resolution per S-ETS-01-03 commit `d910808`: assemble TE 5.6.1 manually on `tomcat:8.5-jre17` by downloading `teamengine-web-5.6.1.war` + `teamengine-web-5.6.1-common-libs.zip` + `teamengine-console-5.6.1-base.zip` from Maven Central + 3 secondary patches. Identical TE 5.6.1 behavior + JDK 17 runtime; identical 12/12 PASS against GeoRobotix. Full audit trail at new repo `ops/server.md` "Docker smoke test" section. **ADR-007 (Dockerfile base image deviation) is a Sprint 2 follow-up** — Quinn s03 GAP-1 identifies the missing ADR-tracked decision; deferred per Quinn's recommendation.
- **Maps to**: PRD FR-ETS-52, NFR-ETS-11.

#### REQ-ETS-TEAMENGINE-004: docker-compose
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: A `docker-compose.yml` SHALL bring up the TeamEngine + ETS service at `http://localhost:8081/teamengine/` with port mapping, environment variable injection, and a healthcheck against `/teamengine/`.
- **Maps to**: PRD FR-ETS-53, NFR-ETS-11.

#### REQ-ETS-TEAMENGINE-005: Smoke Test
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: A repository smoke-test script (`scripts/smoke-test.sh`) SHALL: (a) build the Docker image, (b) launch the container, (c) wait for healthcheck, (d) execute the Core suite against `https://api.georobotix.io/ogc/t18/api`, (e) assert the TestNG report is non-empty and contains zero suite-registration errors. Used as Sprint 1's E2E acceptance criterion.
- **Maps to**: PRD FR-ETS-54, SC-4.

### Sub-deliverable 6 — Spec-Trap Fixture Port

#### REQ-ETS-FIXTURES-001: Corpus Port
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The asymmetric `featureType`/`itemType` corpus from `csapi_compliance/tests/fixtures/spec-traps/` (~30-50 cases) SHALL be ported into Java classes implementing `org.testng.annotations.DataProvider`, with one `@DataProvider` method per logical fixture group (e.g. `asymmetricFeatureTypeFixtures`, `halfConformantCollections`, `missingOgc23001Markers`). Each fixture SHALL retain its original case ID and a comment containing the rationale from the TS source.
- **Rationale**: Spec-trap fixtures are unique authored IP, not in OGC ATS verbatim. Losing them in the port regresses test rigor.
- **Maps to**: PRD FR-ETS-60, SC-9.

#### REQ-ETS-FIXTURES-002: Fixture Coverage
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: Each Part 1 conformance class with a corresponding spec-trap fixture group SHALL include at least one `@Test` method parameterized via the `@DataProvider`. The mapping (class → fixture group) SHALL match the v1.0 web-app's mapping documented in `csapi_compliance/src/engine/registry/index.ts`.
- **Maps to**: PRD FR-ETS-61.

#### REQ-ETS-FIXTURES-003: Port-Diff Audit
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: A script `scripts/audit-fixture-port.sh` SHALL list case IDs in TS source vs Java source and flag any case present in TS but not in Java. CI runs this script; presence of an unexplained drop fails the build.
- **Maps to**: PRD FR-ETS-62.

### Sub-deliverable 7 — CITE Submission

#### REQ-ETS-CITE-001: Maven Central Publish
- **Priority**: MUST (at beta milestone only)
- **Status**: SPECIFIED
- **Description**: At the beta milestone, the artifact `org.opengis.cite:ets-ogcapi-connectedsystems10:<version>` SHALL be published to OSSRH staging and promoted to Maven Central. GPG signing keys are recorded in `ops/server.md`. Pre-beta publishes SHALL be SNAPSHOT only and SHALL NOT promote to Maven Central.
- **Rationale**: OGC convention; CITE reviewers consume the artifact from Maven Central.
- **Maps to**: PRD FR-ETS-70, NFR-ETS-14.

#### REQ-ETS-CITE-002: Three-Implementation Outreach
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: At the beta milestone, an outreach package SHALL be produced for OpenSensorHub and `SomethingCreativeStudios/connected-systems-go` requesting beta participation. The package contains: a Docker quickstart (running TeamEngine + ETS locally), a sample TestNG report from GeoRobotix, the OGC CITE governance reference (Policy 08-134r11), and contact info. Outreach status SHALL be tracked in `ops/status.md`.
- **Rationale**: CITE three-implementation rule; candidate pool exists per user gate 2026-04-27 but participation is not yet secured.
- **Maps to**: PRD FR-ETS-71, SC-6.

#### REQ-ETS-CITE-003: CITE SC Submission Ticket
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: A CITE SubCommittee submission ticket SHALL be filed at `github.com/opengeospatial/cite/issues` referencing: the Maven Central artifact coordinates, the three-implementation roster with current pass status, the requested beta milestone, and a link to the ETS repository.
- **Maps to**: PRD FR-ETS-72, SC-7.

### Sub-deliverable 8 — Web-App Freeze

#### REQ-ETS-WEBAPP-FREEZE-001: README Reposition + Tag
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The `csapi_compliance` repository's README SHALL be repositioned to describe the v1.0 application as a "developer pre-flight tool, not certification-track," with a prominent link to `ets-ogcapi-connectedsystems10`. The HEAD commit `ab53658` SHALL be tagged `v1.0-frozen`. No further commits to v1.0 functionality (bug fixes excepted) are permitted.
- **Rationale**: User decision 2026-04-27. Prevents the web app from being mistaken for the certification deliverable.
- **Maps to**: PRD FR-ETS-80, R-PIVOT-10.

### Sub-deliverable 9 — Spec-Knowledge Sync

#### REQ-ETS-SYNC-001: TS↔Java URI Diff
- **Priority**: SHOULD
- **Status**: SPECIFIED
- **Description**: A diff script (`scripts/sync-uri-coverage.sh`) SHALL extract every canonical OGC requirement URI from `csapi_compliance/src/engine/registry/*.ts` and from Java `@Test` `description` attributes in the new ETS, and SHALL fail if any URI exists in TS but not in Java (or vice versa) without an explicit allowlist entry in `ops/uri-coverage-allowlist.txt`. CI SHALL run this script on every commit affecting either the TS registry or the Java ETS.
- **Rationale**: Prevents silent drift between the v1.0 web app and the ETS as OGC errata land. Both consume the same JSON Schemas; both should cover the same URI set.
- **Maps to**: PRD FR-ETS-90, R-PIVOT-11.

### Sub-deliverable 10 — Cleanup REQs (Sprint 2 + Sprint 3 carryover formalization)

> Sprint 2 introduced REQ-ETS-CLEANUP-001..004 to track cleanup work as first-class spec items.
> Sprint 3 extends with REQ-ETS-CLEANUP-005..008 for the Sprint 2 carryover items now closing.
> Sprint 4 extends with REQ-ETS-CLEANUP-009..012 for the Sprint 3 carryover items now closing (CI-workflow ESCALATION binary close, image-size v2 chown-layer attack, deeper E2E credential-leak smoke, sabotage-script hermetic execution fixes).

#### REQ-ETS-CLEANUP-005: Live Break-Core Dependency-Skip Verification
- **Priority**: MUST
- **Status**: IMPLEMENTED (pending Quinn+Raze) 2026-04-29 — Generator Run 1: TestNG XmlSuite parser unit test `VerifyTestNGSuiteDependency.java` (4 @Tests, all PASS in mvn test; 49 → 53 surefire) + bash sabotage script `scripts/sabotage-test.sh` (stub-server approach per ADR-010, authored + committed but live execution deferred to next gate run with proper Docker time budget per Sprint 3 mitigation plan). Defense-in-depth role split per ADR-010: structural lint + behavioral verification both shipped.
- **Description**: The dependency-skip wiring (TestNG `dependsOnGroups` declaration in `testng.xml`) SHALL be verified at runtime via cascading-SKIP behavior under a FAILing Core test, NOT just at static layers (source `groups` annotations + testng.xml declaration + smoke XML attribute). Verification approach: TestNG programmatic-API unit test (`VerifyTestNGSuiteDependency.java`) OR bash sabotage script (`scripts/sabotage-test.sh`) OR both per Architect ratification. Acceptance: when Core's `landingPageReturnsHttp200` is sabotaged to fail, all 4 SystemFeatures @Tests report `status="SKIP"` (NOT FAIL/ERROR); when Core is restored, all PASS. Closes Quinn s06 CONCERN-1 + Raze s06 CONCERN-1.
- **Maps to**: PRD FR-ETS-24, NFR-ETS-15.

#### REQ-ETS-CLEANUP-006: CredentialMaskingFilter Integration Test + REST-Assured RequestLoggingFilter Wrap
- **Priority**: MUST
- **Status**: SPECIFIED (Sprint 3 target via S-ETS-03-02)
- **Description**: (a) The suite SHALL accept `auth-credential` as a CTL parameter + TestNG suite parameter; the `scripts/smoke-test.sh` SHALL accept `--auth-credential <value>` (or env var `AUTH_CREDENTIAL`) and pass it through to the suite. (b) `MaskingRequestLoggingFilter` (subclass of REST-Assured's built-in `RequestLoggingFilter`) OR equivalent wrap pattern per Architect ratification SHALL intercept REST-Assured's request-log output and apply the existing `CredentialMaskingFilter.maskValue()` semantics BEFORE the log line is emitted. (c) An integration test (executed during smoke OR as a dedicated `scripts/credential-leak-test.sh`) SHALL set `auth-credential=Bearer ABCDEFGH12345678WXYZ`, run the suite, and grep-assert ZERO hits for the literal substring `EFGH12345678WXYZ` in BOTH TestNG report XML attachments AND container logs. The masked form (`Bear***WXYZ` or equivalent) MUST appear at least once (proves filter ran). Closes Sprint 2 PARTIAL `no_credential_leak_in_test_logs` + Raze cleanup CONCERN-2.
- **Maps to**: PRD FR-ETS-25 (FR-CAP-006/007 v1.0 carryover), NFR-ETS-08.

#### REQ-ETS-CLEANUP-007: CI Workflow Live at `.github/workflows/build.yml`
- **Priority**: MUST
- **Status**: SPECIFIED (Sprint 3 target via S-ETS-03-03; USER ACTION required: `gh auth refresh -s workflow`)
- **Description**: The CI workflow staged at `ci/github-workflows-build.yml` SHALL be moved to `.github/workflows/build.yml` so GitHub Actions runs it on push. Acceptance: at least one `workflow_run` exists with `conclusion=success` on a Sprint 3 commit; the run URL is captured in `ops/test-results/sprint-ets-03-ci-workflow-live-<date>.txt`. Pre-condition: orchestrator runs `gh auth refresh -s workflow` (token scope `workflow` is required to push to `.github/workflows/`). If pre-condition not met at sprint start, story DEFERRED-WITH-RATIONALE; carryover to Sprint 4 with 4th-sprint-defer-escalation flag.
- **Maps to**: PRD FR-ETS-05 (CI plumbing), NFR-ETS-02.

#### REQ-ETS-CLEANUP-008: Docker Image Size Optimization
- **Priority**: SHOULD
- **Status**: PARTIAL (Sprint 3 close: 660MB vs <550MB stretch — ADR-009 illustrative 200-300MB jar-dedupe projection EMPIRICALLY FALSIFIED at S-ETS-03-04; chown-layer 80MB attack identified for Sprint 4); EXTENDED via REQ-ETS-CLEANUP-010 (Sprint 4 v2)
- **Description**: The multi-stage Dockerfile runtime image SHALL be optimized to ≤ 550 MB (Sprint 3 stretch — more permissive than ADR-009 §"Image size target" 450MB soft target). Recommended approach (per Quinn cleanup GAP-1 Option A): TE common-libs ↔ deps-closure dedupe — exclude jars in `target/lib-runtime/` that overlap with `/usr/local/tomcat/lib` (from `teamengine-web-common-libs.zip`); estimated 200-300MB savings → ~363-463MB runtime image. Architect ratifies which approach (a / b / c per Sprint 3 contract `deferred_to_architect`). PARTIAL with rationale acceptable if Generator hits 550-700MB; carryover to Sprint 4 with explicit deferral if >700MB. Smoke 12+6+N PASS preserved post-optimization. **Sprint 3 outcome**: 660MB (3MB savings; only 4 jars / 1.8MB exact-basename overlap on actual TE 5.6.1 + ETS 0.1-SNAPSHOT post-ADR-006 layout). Sprint 4 attacks the dominant 80MB chown layer per REQ-ETS-CLEANUP-010.
- **Maps to**: NFR-ETS-11 (deployment topology), ADR-009.

#### REQ-ETS-CLEANUP-009: CI Workflow ESCALATION (5th-sprint-defer-risk; binary close)
- **Priority**: MUST
- **Status**: IMPLEMENTED via PATH B / formal-drop (Sprint 4 Generator Run 1 2026-04-29; pending Quinn+Raze gate). `gh auth status` at run start showed token scopes `'gist', 'read:org', 'repo'` — `workflow` ABSENT; `ci/README.md` documents 2 future-activation paths; `ops/test-results/sprint-ets-04-01-ci-workflow-path-b-2026-04-29.txt` archived; `ops/status.md` updated with "Perpetual Environmental Blockers (DROPPED from sprint cadence)" section listing `ci_workflow_live`. Binary close achieved; future sprints will not re-litigate.
- **Description**: REQ-ETS-CLEANUP-007 (CI workflow live at `.github/workflows/build.yml`) was DEFERRED-WITH-RATIONALE for 4 consecutive sprints (S-ETS-01-01..03 + S-ETS-02-05 + S-ETS-03-03). Raze cumulative APPROVE_WITH_CONCERNS verdict explicitly flagged as ESCALATION TERRITORY. Sprint 4 success_criterion `ci_workflow_live_or_formally_dropped` SHALL resolve to TRUE via either: (a) user grants `workflow` scope (`gh auth refresh -s workflow`) before Generator run AND Generator executes the `git mv` + workflow_dispatch verification (~30 min); OR (b) `ci_workflow_live` is FORMALLY DROPPED from sprint cadence with explicit "perpetual environmental blocker" deferral note in `ops/status.md` (Raze recommendation). No more 4-sprint-style "we'll try again" deferrals — Sprint 4 is the binary close. Pat documents alternative path for the user to adopt at any point post-Sprint-4: manual GitHub UI move via web (~5 min user-time; bypasses gh-cli-scope blocker entirely).
- **Maps to**: NFR-ETS-02. Closes Raze cumulative CONCERN-3 + 4-sprint-defer pattern.

#### REQ-ETS-CLEANUP-010: Docker Image-Size v2 Chown-Layer Attack + ADR-009 v2 Amendment
- **Priority**: SHOULD
- **Status**: IMPLEMENTED (Sprint 4 Run 2, S-ETS-04-02; pending Quinn+Raze gate close — image size 663MB → 540MB, -123MB / -18.6%; <600MB target ACHIEVED; smoke 26/26 PASS; zero startup ERROR/SEVERE. Iteration: first build (539MB) had SEVERE on missing /conf chown; fixed by extending post-extract chown set to /conf, /logs, /work, /temp (+1MB negligible).)
- **Description**: The multi-stage Dockerfile SHALL be optimized via Docker buildkit `COPY --chown=tomcat:tomcat` syntax on each `COPY` directive — eliminating the 80MB `RUN chown -R tomcat:tomcat /usr/local/tomcat` layer that Sprint 3 empirical analysis identified as the dominant cost (sprint-ets-03-04-empirical-dedupe-list-2026-04-29.txt). Acceptance: image size <600MB (Sprint 4 PASS target — empirically permissive given multi-jar runtime classloader requirements; Sprint 3 661MB baseline). PARTIAL acceptable at 600-650MB; GAP if >650MB. Smoke 22+M PASS preserved (where M = Subsystems @Test count from S-ETS-04-05). ADR-009 SHALL be amended in-place (Pat hypothesis; Architect ratifies) recording: (a) empirical falsification of the illustrative 200-300MB jar-dedupe projection; (b) chown-layer attack approach + measured delta from Sprint 3 660MB baseline; (c) 80MB-as-dominant-cost identification; (d) Sprint 5+ next-target roadmap (alpine variant per ADR-009 §Alternatives if Sprint 4 chown-attack underperforms). Iterative tier-2 version-overlap dedupe (~7-8MB additional) permitted with smoke verification per excluded version (per ADR-009 §"DO NOT dedupe" runtime-classloader-binding caveat).
- **Maps to**: NFR-ETS-11, ADR-009 (amended).

#### REQ-ETS-CLEANUP-011: Deeper E2E Credential-Leak Smoke at IUT-Auth Layer
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 6 S-ETS-06-01 — finally closes the 2-sprint-old open criterion. Sprint 5 Run 1 wired `SMOKE_AUTH_CREDENTIAL` end-to-end (REQ-ETS-CLEANUP-013) but Sprint 5 gates surfaced GAP-1' (filter ordering defect — wire carried masked form because the Sprint 3 mutate/restore try/finally pattern restored AFTER `super.filter()` had already called `ctx.next()` for HTTP transport). Sprint 6 S-ETS-06-01 implements approach (i): `MaskingRequestLoggingFilter` no longer mutates `requestSpec`; emits masked log line directly to a shadowed `PrintStream` field; calls `ctx.next(requestSpec, responseSpec)` with the unmutated spec. New `VerifyWireRestoresOriginalCredential` (4 @Tests) using `CapturingFilterContext` proves wire-side correctness via BY-VALUE header snapshot at `ctx.next` time. 2 legacy try/finally tests deleted (verified non-existent code under approach (i)); 6 mask-format / isMasked / superset / null-guard tests reclassified as wiring-only with explicit caveat. Surefire 78 → 80 / 0 fails / 0 errors / 3 skipped. Live three-fold cross-check execution remains deferred to Quinn/Raze Sprint 6 gate per established pattern; structural wire-side proof is mvn-verified. Bundled scripts changes: smoke-test.sh container-log capture timing fix (capture before any die() teardown); credential-leak-e2e-test.sh prong-b grep expanded to include `$STUB_LOGFILE`. Sister repo HEAD `c17a534`.)
- **Description**: REQ-ETS-CLEANUP-006 (CredentialMaskingFilter integration test + RequestLoggingFilter wrap) closed at the unit-test integration layer at Sprint 3 (8/8 VerifyMaskingRequestLoggingFilter @Tests + grep mvn output + grep surefire XML for literal credential body, all zero hits) but explicitly deferred the deeper E2E architect-vision: synthetic auth-credential flowing through REST-Assured against an authenticated IUT at smoke time, with grep against ops/test-results/ XML AND container catalina.out for the literal substring (zero hits) AND for the masked form (>=1 hit, proving filter ran rather than dropping the field entirely). Sprint 4 wires `auth-credential` CTL/TestNG suite parameter end-to-end in `scripts/smoke-test.sh` (or new `scripts/credential-leak-e2e-test.sh`). Architect ratifies IUT path: (a) stub IUT in /tmp/ per Sprint 3 sabotage-script pattern (Pat recommends; composable with REQ-ETS-CLEANUP-012 sabotage-script bug fixes; hermetic); (b) pivot to authenticated IUT (lower hermeticity; depends on external IUT availability); (c) extended unit-layer fallback if both stub and alternative IUT prove infeasible. Acceptance: smoke against authenticated IUT (or stub) with `auth-credential=Bearer ABCDEFGH12345678WXYZ`; grep ops/test-results/ XML + container catalina.out returns ZERO hits for `EFGH12345678WXYZ`; grep both surfaces for masked `Bear***WXYZ` returns >=1 hit. Closes design.md §529 deferral text fully.
- **Maps to**: PRD FR-ETS-25, NFR-ETS-08. Closes Sprint 3 PARTIAL `credential_leak_integration_test_green` (deeper E2E) + Quinn cumulative CONCERN-1.

#### REQ-ETS-CLEANUP-012: Sabotage-Script Hermetic-Execution Bug Fixes
- **Priority**: SHOULD
- **Status**: IMPLEMENTED (Sprint 4 Generator Run 1 2026-04-29; pending Quinn+Raze live verification). Both bug fixes applied as separate atomic commits in `ets-ogcapi-connectedsystems10`: HEAD `4f65130` switches the Python ThreadingTCPServer in `scripts/sabotage-test.sh` from `("127.0.0.1", 0)` to `("0.0.0.0", 0)`; HEAD `d954ae9` adds `--add-host=host.docker.internal:host-gateway` to the `docker run` command in `scripts/smoke-test.sh`. STUB-IUT-PORT-LEAK risk verified mitigated by existing PID-based `cleanup_all` trap (kills via `$STUB_PIDFILE` content, not via port). `mvn test` BUILD SUCCESS surefire 61/0/0/3 (unchanged from Sprint 3 baseline). Live hermetic E2E execution deferred to Quinn/Raze gate per QUINN-RAZE-GATE-VERIFICATION-TIME-BUDGET mitigation.
- **Description**: Sprint 3 ADR-010 §"Defense-in-depth role split" landed the bash sabotage script (`scripts/sabotage-test.sh`) with two known bugs preventing hermetic CITE-SC-grade execution: (a) stub server binds to 127.0.0.1 (or default localhost) — should bind to 0.0.0.0 so a Docker container running smoke against `host.docker.internal:<port>` can reach the stub; (b) docker run command lacks `--add-host=host.docker.internal:host-gateway` — Docker on Linux WITHOUT Docker Desktop does NOT auto-resolve `host.docker.internal` (only Docker Desktop's macOS/Windows variants do). Both fixes are mechanical, ~5 LOC each, no architecture decision required. Acceptance: bash sabotage script runs hermetically end-to-end on Linux-without-Docker-Desktop hosts; netstat verification shows stub binding `0.0.0.0:<port>` not `127.0.0.1:<port>`; smoke container reaches stub via `host.docker.internal:<port>`. Live execution evidence archived for audit trail.
- **Maps to**: ADR-010 §"Defense-in-depth role split" (extended to hermetic CITE-SC-grade execution).

> Sprint 5 extends with REQ-ETS-CLEANUP-013..015 for the Sprint 4 carryover items now closing (SMOKE_AUTH_CREDENTIAL wiring wedge fix, SMOKE_OUTPUT_DIR worktree-pollution mitigation v2, sabotage --target flag).

#### REQ-ETS-CLEANUP-013: SMOKE_AUTH_CREDENTIAL End-to-End Wiring (GAP-1 wedge fix)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 5 Run 1, S-ETS-05-01; pending Quinn+Raze gate close. Three-layer wiring landed: (1) bash — `scripts/smoke-test.sh` reads `SMOKE_AUTH_CREDENTIAL` and adds `--data-urlencode "auth-credential=$SMOKE_AUTH_CREDENTIAL"` to the curl POST when non-empty; (2) Java enums — new `TestRunArg.AUTH_CREDENTIAL` (key `auth-credential`) + new `SuiteAttribute.AUTH_CREDENTIAL` (`authCredential`/String); (3) Java listener — `SuiteFixtureListener.processSuiteParameters` reads the suite param and stashes on the ISuite; `SuiteFixtureListener.onStart` calls new `configureRestAssuredAuthCredential(String)` which sets `RestAssured.requestSpecification` to a `RequestSpecBuilder().addHeader("Authorization", credential).build()` so every subsequent REST-Assured request carries the header through the existing `MaskingRequestLoggingFilter` chain. New unit test `VerifyAuthCredentialPropagation` (8 tests, all PASS) covers TestRunArg key, SuiteAttribute, processSuiteParameters set/no-set/empty branches, and configureRestAssuredAuthCredential set/null/empty branches. Surefire 64 → 72 / 0 fails / 0 errors / 3 skipped. Live three-fold cross-check (smoke + scripts/credential-leak-e2e-test.sh against stub-IUT) still deferred to Quinn/Raze gate per Sprint 5 Run 1 mitigation pattern; structural wiring is mvn-verified.)
- **Implementation notes amended (Sprint 6 S-ETS-06-03 / META-GAP-1 reclassification)**: The 8 `VerifyAuthCredentialPropagation` unit tests verify STRUCTURAL WIRING ONLY — they exercise `TestRunArg` key, `SuiteAttribute`, `processSuiteParameters` branches, and `configureRestAssuredAuthCredential` branches in isolation, but they do NOT exercise wire-side filter ordering. Likewise the 6 retained `VerifyMaskingRequestLoggingFilter` tests (post Sprint 6 S-06-01 audit; 2 try/finally-semantic tests deleted) verify mask-format / `isMasked()` / header-set membership but use a `StubFilterContext` returning null from `ctx.next()` and CANNOT detect filter-ordering defects. **Wire-side credential integrity is proven only by `VerifyWireRestoresOriginalCredential` (REQ-ETS-CLEANUP-016, Sprint 6 S-ETS-06-01)** which uses a `CapturingFilterContext` snapshotting header values BY VALUE at `ctx.next` time. Future readers MUST NOT conflate the wiring-only PASS count with credential safety; the Sprint 5 GAP-1' bug demonstrated that 16 wiring tests can all PASS while the wire is poisoned.
- **Description**: `scripts/smoke-test.sh` SHALL read the `SMOKE_AUTH_CREDENTIAL` environment variable and propagate it as the `auth-credential` TestNG suite parameter via the curl POST `--data-urlencode` call to the TeamEngine `/suite/.../run` endpoint. The Java `SuiteFixtureListener` (or equivalent fixture) SHALL read this TestNG suite parameter and inject it into the REST-Assured `RequestSpec` as an `Authorization` header, flowing through the existing `MaskingRequestLoggingFilter` chain. Acceptance: `scripts/credential-leak-e2e-test.sh` with `SMOKE_AUTH_CREDENTIAL=Bearer ABCDEFGH12345678WXYZ` produces three-fold verdict: (a) ZERO unmasked-credential hits in TestNG XML + container log + smoke log; (b) AT LEAST ONE masked-form (`Bear***WXYZ` or equivalent) hit in log (proves filter ran); (c) AT LEAST ONE unmasked-credential hit in stub-IUT log (proves wire carried the credential). Closes S-ETS-04-03 PARTIAL → IMPLEMENTED.
- **Maps to**: PRD FR-ETS-25, NFR-ETS-08. Closes GAP-1 from Sprint 4 Quinn cumulative APPROVE_WITH_CONCERNS + Raze cumulative APPROVE_WITH_GAPS.

#### REQ-ETS-CLEANUP-014: SMOKE_OUTPUT_DIR Override in smoke-test.sh (Worktree-pollution mitigation v2)
- **Priority**: SHOULD
- **Status**: IMPLEMENTED (Sprint 5 Run 1, S-ETS-05-02; pending Quinn+Raze gate close. ~3 LOC bash: `scripts/smoke-test.sh` ARCHIVE_DIR now reads `${SMOKE_OUTPUT_DIR:-${REPO_ROOT}/ops/test-results}` so when the env var is set the TestNG XML + container log archives go there instead of the worktree. Default behaviour identical to Sprint 1-4 (backward compatible). Bash syntax validated (`bash -n`); grep confirms `SMOKE_OUTPUT_DIR`/`auth-credential`/`SMOKE_AUTH_CREDENTIAL` references all present.)
- **Description**: `scripts/smoke-test.sh` SHALL accept a `SMOKE_OUTPUT_DIR` environment variable. When set, ALL TestNG XML artifact writes SHALL use `${SMOKE_OUTPUT_DIR}/` as the base directory instead of `ops/test-results/`. When unset, behavior defaults to the existing `ops/test-results/` path (backward compatible). Gate briefings for Sprint 5+ SHALL mandate `SMOKE_OUTPUT_DIR=/tmp/<role>-fresh-sprint<N>/test-results/` in all gate smoke invocations to prevent worktree writes.
- **Maps to**: Worktree-pollution mitigation. Closes Sprint 2 systemfeatures gate incident pattern + Sprint 4 Quinn gate recurrence.

#### REQ-ETS-CLEANUP-015: sabotage-test.sh --target=\<class\> Flag
- **Priority**: SHOULD
- **Status**: FULLY-IMPLEMENTED (Sprint 6 S-ETS-06-02 closes the Docker build path; live cascade verification deferred to Sprint 6 gate). Sprint 5 Run 2 S-ETS-05-03 landed structural flag mechanics correctly (--help, --target=foo exit-code, sabotage marker injection, worktree-pollution guard all worked) but the rsync `--exclude='.git/'` stripped `.git` from the temp tree, breaking `Dockerfile COPY .git ./.git`. Sprint 6 S-ETS-06-02 (sister repo HEAD `c17a534`) drops the `.git` exclude (verified sister `.git` = 5.2MB; negligible cost) and updates the cp -a fallback for symmetry. Honest log message: smoke exit code captured; Docker build failure (no TestNG report produced) distinguished from smoke @Test failure (report present). bash -n PASS; --help and --target=foo paths preserved.
- **Description**: `scripts/sabotage-test.sh` SHALL accept a `--target=<class-name>` argument (e.g. `--target=systemfeatures`). When provided, the script SHALL patch the first `@Test` method of the target class in a temporary copy of the source tree (not the user's worktree), recompile, run smoke, archive the TestNG XML cascade evidence, and restore without modifying the original. Acceptance: `bash scripts/sabotage-test.sh --target=systemfeatures` runs end-to-end without manual Java edits; produced XML shows SystemFeatures FAIL + dependents SKIP; original SystemFeaturesTests.java is unmodified after the run.
- **Maps to**: ADR-010 §"Defense-in-depth role split" (behavioral verification at gate). Closes Raze Sprint 4 carryover recommendation.

> Sprint 6 is a WEDGE SPRINT extending with REQ-ETS-CLEANUP-016..017 for the 2 cross-corroborated HIGH gaps (masking filter wire-corruption + sabotage Docker build) + META-GAP-1 (wire-side unit test reclassification). NO new conformance classes in Sprint 6. Sampling + Properties deferred to Sprint 7+.

#### REQ-ETS-CLEANUP-016: MaskingRequestLoggingFilter Wire-Side Correctness (Sprint 6 — GAP-1' fix)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 6 S-ETS-06-01 — Generator Run 1 close 2026-04-30; sister repo HEAD `c17a534`; live three-fold cross-check deferred to Quinn closure-proof exec at Sprint 6 gate. Approach (i) implemented per meta-Raze + primary-Raze consensus: (1) `MaskingRequestLoggingFilter` adds shadowed `private final PrintStream stream` field (REST-Assured 5.5.0 parent's `stream` is private final with no accessor — Plan-Raze verified via Maven Central source jar); (2) `filter()` builds masked log string from header snapshot using `CredentialMaskingFilter.maskValue` for sensitive header values, emits to shadowed PrintStream, calls `ctx.next(requestSpec, responseSpec)` directly with unmutated spec — wire carries ORIGINAL credential. `super.filter()` no longer called (parent's filter was 2 ops: log + ctx.next; we replace log with masked emission + retain ctx.next). New unit test `VerifyWireRestoresOriginalCredential` (4 @Tests) uses `CapturingFilterContext` that snapshots header values BY VALUE at `ctx.next` call time — critical: a by-reference capture would read post-restoration state and miss the bug, exactly what the legacy 16 wiring-only tests suffered. Mockito Response mock returned to satisfy non-null contract; Mockito present in pom.xml test scope (lines 152-153). 2 legacy try/finally-semantic tests in `VerifyMaskingRequestLoggingFilter` DELETED per Pat's S-06-03 finer-granularity disposition (verified non-existent code under approach (i)); 6 mask-format / isMasked / superset / null-guard tests RETAINED-AND-RECLASSIFIED with explicit "wiring-only — does NOT prove wire-side credential integrity" caveat in class javadoc. ThrowingFilterContext helper deleted (only the deleted #2 used it). Surefire 78 → 80 / 0 fails / 0 errors / 3 skipped. BUILD SUCCESS. TDD evidence: with the legacy filter, `wireCarriesOriginalAuthorizationCredential` FAILed `expected:<Bear[er ABCDEFGH12345678]WXYZ> but was:<Bear[***]WXYZ>`; under approach (i), all 4 wire-side @Tests PASS. Bundled smoke-test.sh + credential-leak-e2e-test.sh fixes also landed — see REQ-ETS-CLEANUP-011 status.)
- **Description**: `MaskingRequestLoggingFilter.filter()` SHALL NOT mutate the `requestSpec` headers before `ctx.next()` (the HTTP send). The filter SHALL: (1) snapshot sensitive header values; (2) build and emit a masked log line DIRECTLY to the configured `PrintStream` (bypassing `super.filter()` for log output); (3) call `ctx.next(requestSpec, responseSpec)` with the ORIGINAL unmutated `requestSpec`. A new unit test `VerifyWireRestoresOriginalCredential` using a `CapturingFilterContext` (NOT `StubFilterContext`) SHALL verify that the `requestSpec` passed to `ctx.next()` carries the ORIGINAL credential value. The 16 existing wiring-only unit tests (VerifyAuthCredentialPropagation 8 + VerifyMaskingRequestLoggingFilter 8) SHALL be reclassified in spec.md and Implementation Notes as "wiring-only — does NOT prove wire-side credential integrity". Acceptance: Quinn live-exec three-fold cross-check (a)+(b)+(c) all PASS; Raze adversarial wire-tap live-exec confirms wire carries unmasked credential; mvn test remains green. NOTE: existing 16 unit tests must CONTINUE to pass (no behavioral regression — the reclassification is documentation-only).
- **Wiring-only caveat for REQ-ETS-CLEANUP-013 (Sprint 5 wiring fix)**: The 8 VerifyAuthCredentialPropagation unit tests from REQ-ETS-CLEANUP-013 verify structural wiring (wiring-only — META-GAP-1 per sprint-ets-05-meta-review.yaml). Wire-side credential integrity is proven only by VerifyWireRestoresOriginalCredential (this REQ).
- **Maps to**: PRD FR-ETS-25, NFR-ETS-08. Closes GAP-1' from Sprint 5 Raze cumulative GAPS_FOUND 0.74 + Quinn cumulative APPROVE_WITH_CONCERNS 0.82. Closes the 2-sprint-old `credential_leak_e2e_full_pass` success criterion (open since Sprint 4 GAP-1 → Sprint 5 GAP-1').

#### REQ-ETS-CLEANUP-017: Sabotage Three-Class Cascade Live-Exec Verified (Sprint 6 — GAP-2 fix; Sprint 7 closure)
- **Priority**: SHOULD
- **Status**: IMPLEMENTED (Sprint 7 S-ETS-07-01 Wedge 1 close 2026-04-30; live 3-class cascade XML produced end-to-end at sister repo `ops/test-results/sprint-ets-07-01-wedge1-sabotage-cascade-2026-04-30.xml` (53KB) — Generator Run 1 cascade verdict: Core 8 PASS, Common 4 PASS, SystemFeatures 1 FAIL + 5 SKIP, Subsystems 4 SKIP, Procedures 4 SKIP, Deployments 4 SKIP; sabotage-test.sh step 5/6 verdict "PASS — two-level cascade verified end-to-end". The Wedge 1 fix changed the sabotage marker injection from bare `throw new AssertionError(...)` (which produced javac unreachable-statement at line 210 per JLS §14.21) to a two-line `if (true)\n\t\t\tthrow new AssertionError(...)` shape that defeats javac reachability analysis AND complies with spring-javaformat-maven-plugin:validate. The two-line shape was discovered necessary at /tmp clone live-exec time when an initial single-line `if (true) throw ...` PASSed javac but FAILed the Dockerfile builder stage 8/8 spring-javaformat:validate step; sister commit `94a4971` records the formatter-aware fix. Cascade XML retroactively validates ADR-010 v3 "forward-extends to Procedures + Deployments" claim at the live-exec layer (v3 amendment was empirical inference; Sprint 7 provides direct evidence). The 2-sprint-old `credential_leak_e2e_full_pass` success criterion was already CLOSED at Sprint 6 wire layer; this REQ closes the cascade-verification companion criterion.
- **Description**: After the rsync `.git` include fix in `scripts/sabotage-test.sh` (S-ETS-06-02) AND the spring-javaformat-aware sabotage marker injection fix in S-ETS-07-01 Wedge 1, the sabotage script `--target=systemfeatures` SHALL run end-to-end at gate time producing a cascade XML showing: Core+Common all PASS; SystemFeatures 1×FAIL + Nx SKIP; Subsystems+Procedures+Deployments all SKIP. This closes the ADR-010 v3 "forward-extends to Procedures + Deployments" claim at the live-exec layer. The sabotage log message SHALL correctly distinguish Docker build failure from smoke @Test failure (Sprint 6 honesty fix; verified live in Sprint 7 Generator Run 1 first attempt).
- **Maps to**: ADR-010 §"Defense-in-depth role split". Closes GAP-2 from Sprint 5 Raze cumulative GAPS_FOUND 0.74 + Quinn cumulative APPROVE_WITH_CONCERNS 0.82 (cross-corroborated; reclassified from HIGH → MEDIUM per meta-Raze severity calibration). Closes Sprint 6 Raze HIGH GAP-1 + meta-Raze META-GAP-M2.

> Sprint 7 adds REQ-ETS-CLEANUP-018 (Sprint 6 carryover wedge bundle) and REQ-ETS-PART1-007..008 (Sampling Features + Property Definitions — twice-deferred from Sprints 5+6). Stories S-ETS-07-01..03 are Active Sprint 7.

#### REQ-ETS-CLEANUP-018: Sprint 6 Carryover Wedge Bundle (Sprint 7)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 7 S-ETS-07-01 close 2026-04-30 — Generator Run 1; sister repo HEAD `c17a534 → 38b1f8a` after 5 commits: `a17c6ec` Wedges 1+3+4 initial, `94a4971` Wedge 1 spring-javaformat fix, `c68b803` Wedge 1 cascade XML evidence, `06acd1b` S-07-02+03 SamplingFeatures+PropertyDefinitions, `38b1f8a` Sprint 7 smoke 42/42 evidence; bd6fa9b Wedge 3 bash-x evidence). Wedge 1 (HIGH P0 — sabotage javac fix): two-line `if (true)\n\t\t\tthrow new AssertionError(...)` injection defeats javac reachability analysis (JLS §14.21) AND complies with spring-javaformat-maven-plugin:validate; verified live by 3-class cascade XML at sister `ops/test-results/sprint-ets-07-01-wedge1-sabotage-cascade-2026-04-30.xml`. Wedge 3 (MEDIUM P1 — credential-leak prong-b retarget): glob-safe targeting of `${SMOKE_OUTPUT_DIR}/s-ets-01-03-teamengine-container-*.log` archive (Sprint 6 timing fix output), fallback to `docker logs`; bash -x trace at sister `ops/test-results/sprint-ets-07-01-wedge3-cred-leak-prong-b-bash-x-trace.log` shows prong-b finds masked-form hit in correct archive. Wedge 4 (MEDIUM P1 — sabotage pipefail-unreachable fix): replaced `ls -t ... | head -1` pipeline with glob-safe `for _f in ... do [[ -e $_f ]] && ...` idiom; first attempt at /tmp clone live-exec exercised this path when initial Wedge 1 single-line shape failed spring-javaformat — disambiguation log line "Docker build FAILED (not a sabotage-marker hit)" fired correctly, confirming the fix. Wedge 5 (MEDIUM P1 — design.md doc-lag): added "Sprint 6 redesign: approach (i) — wire-side correctness via no-spec-mutation (S-ETS-06-01) — CANONICAL" subsection BEFORE the old wrap-pattern code, marked the entire historical block "Historical (Sprint 3 baseline — superseded by Sprint 6 approach (i) above)", explicitly invalidated the false try/finally claim per the new Sprint 7 generator_design_md_adr_self_audit success criterion. Wedge 6 (LOW — ADR-010 v3 retroval): natural fall-through; the cascade XML pointer is added to ADR-010 in this sprint. Wedge 2 (HIGH P0 — REQ-017 status honesty) was completed by Pat at planning time + promoted to IMPLEMENTED in this commit after Wedge 1 cascade XML production. mvn surefire 80 → 86/0/0/3 (added 6 lint tests for SF + Property). Smoke 34 → 42/42 against GeoRobotix.
- **Description**: Bundle fix for 6 Sprint 6 gate-identified defects: (1) `scripts/sabotage-test.sh` sabotage-marker injection javac unreachable-statement fix; (2) `scripts/sabotage-test.sh` pipefail-unreachable disambiguation block fix; (3) `scripts/credential-leak-e2e-test.sh` prong-b retarget; (4) `openspec/capabilities/ets-ogcapi-connectedsystems/design.md` §Sprint 3 hardening wrap-pattern doc-lag fix; (5) spec.md REQ-ETS-CLEANUP-017 status-honesty correction (Pat planning) + promotion to IMPLEMENTED (Generator post Wedge 1 close); (6) ADR-010 v3 Sprint 7 live-verification note. Acceptance criteria all met at Sprint 7 close: cascade XML produced, prong-b targeting verified via bash -x, disambiguation block fires under Docker build failure, design.md no longer contains false try/finally claim, REQ-017 status flipped to IMPLEMENTED with cascade XML evidence pointer, ADR-010 v3 retroval note added.
- **Maps to**: meta-Raze sprint-ets-06-meta-review.yaml META-GAP-M1, META-GAP-M2 (HIGH recalibrated). Closes Raze HIGH GAP-1, MEDIUM GAP-3 + Quinn MEDIUM GAP-Q1 from sprint-ets-06-adversarial-cumulative.yaml + sprint-ets-06-evaluator-cumulative.yaml. Implements Sprint 7 contract success criteria: `bash_x_trace_evidence_for_bash_changes`, `generator_design_md_adr_self_audit`, `spec_status_honesty_principle`.

#### REQ-ETS-PART1-007: Sampling Features Conformance Class (`/conf/sf`)
- **Priority**: SHOULD
- **Status**: IMPLEMENTED (Sprint 7 S-ETS-07-02 close 2026-04-30 — Generator Run 1; sister commit `06acd1b`). New class `src/main/java/.../conformance/samplingfeatures/SamplingFeaturesTests.java` with 4 @Tests all PASS against GeoRobotix (verified at /tmp clone smoke 42/42; sister `ops/test-results/sprint-ets-07-smoke-42-tests-2026-04-30.xml`): `samplingFeaturesCollectionReturns200` (HTTP 200 + non-empty items, 100 items), `samplingFeatureItemHasIdType` (canonical-endpoint shape), `samplingFeatureCanonicalUrlReturns200` (path-based dereferenceability — adapted to GeoRobotix shape which lacks per-item `links` array), `samplingFeaturesDependencyCascadeRuntime` (runtime tracer). All @Tests carry `groups="samplingfeatures"`. testng.xml extended: `<group name="samplingfeatures" depends-on="systemfeatures"/>` + `SamplingFeaturesTests` class entry in single-block consolidation (now 5 sibling classes depend on SystemFeatures). VerifyTestNGSuiteDependency extended with 3 lint tests: `testSamplingFeaturesGroupDependsOnSystemFeatures`, `testEverySamplingFeaturesTestMethodCarriesSamplingFeaturesGroup`, `testSamplingFeaturesCoLocatedWithSystemFeatures`. mvn 80 → 83 lint tests; smoke 38 confirmed.
- **OGC requirement prefix**: `/req/sf/` (HTTP 200 verified at raw.githubusercontent.com 2026-04-30 by Generator: `req_resources_endpoint.adoc`, `req_canonical_endpoint.adoc`, `req_canonical_url.adoc`. NOTE: OGC repo folder is `sf/` not `sampling/` — Pat's planning-time guidance was correct on URI form; folder naming clarified by Generator).
- **SF-unique implementation note**: GeoRobotix per-item shape (`/samplingFeatures/{id}`) does NOT include the `links` array that Procedures + Deployments items carry. Per defense-in-depth, the canonical-URL @Test asserts HTTP 200 at the path-based canonical URL form rather than `rel=canonical` link search; if a future GeoRobotix release adds item-level links the assertion can be tightened in lockstep.
- **Maps to**: PRD FR-ETS-17; twice-deferred from Sprint 5 (wedge-deferred) + Sprint 6 (wedge sprint, excluded).

#### REQ-ETS-PART1-008: Property Definitions Conformance Class (`/conf/property`)
- **Priority**: SHOULD
- **Status**: IMPLEMENTED (Sprint 7 S-ETS-07-03 close 2026-04-30 — Generator Run 1; sister commit `06acd1b`). New class `src/main/java/.../conformance/propertydefinitions/PropertyDefinitionsTests.java` with 4 @Tests: `propertiesCollectionReturns200` PASSes (HTTP 200 + items array present); `propertyItemHasIdType` and `propertyCanonicalUrlReturns200` SKIP-with-reason against current GeoRobotix `/properties` (returns empty `items: []` per IUT state — endpoint declared but no derived properties currently populated; per Pat MEDIUM risk PROPERTY-DEFINITIONS-RESPONSE-SHAPE mitigation); `propertyDefinitionsDependencyCascadeRuntime` PASSes (runtime tracer). 2 PASS + 2 SKIP-with-reason in smoke (verified at /tmp clone smoke 42/42). All @Tests carry `groups="propertydefinitions"`. testng.xml extended: `<group name="propertydefinitions" depends-on="systemfeatures"/>` + `PropertyDefinitionsTests` class entry in single-block consolidation. VerifyTestNGSuiteDependency extended with 3 lint tests: `testPropertyDefinitionsGroupDependsOnSystemFeatures`, `testEveryPropertyDefinitionsTestMethodCarriesPropertyDefinitionsGroup`, `testPropertyDefinitionsCoLocatedWithSystemFeatures`. mvn 83 → 86 lint tests; smoke 38 → 42 confirmed.
- **OGC requirement prefix**: `/req/property/` (HTTP 200 verified at raw.githubusercontent.com 2026-04-30 by Generator: `req_resources_endpoint.adoc`, `req_canonical_endpoint.adoc`, `req_canonical_url.adoc`).
- **Property-Definitions-unique implementation note**: GeoRobotix `/properties` returns HTTP 200 + `items: []` (empty). Per defense-in-depth + Pat MEDIUM risk mitigation, per-item @Tests SKIP-with-reason rather than FAIL when items empty (the OGC requirement is at the endpoint-existence + response-shape layer; population is IUT-state-dependent). If GeoRobotix populates the collection in the future, no code changes required — the same @Tests will exercise the cached single-property body.
- **Maps to**: PRD FR-ETS-18; twice-deferred from Sprint 5 + Sprint 6 (see REQ-ETS-PART1-007 rationale).

## Acceptance Scenarios

### CRITICAL Scenarios (Sprint 1 gating)

#### SCENARIO-ETS-SCAFFOLD-BUILD-001 (CRITICAL)
**GIVEN** a clean checkout of `ets-ogcapi-connectedsystems10` at the Sprint 1 commit
**AND** the host has JDK 17 and Maven 3.9 available
**WHEN** a developer runs `mvn clean install`
**THEN** the command exits 0
**AND** a jar is produced at `target/ets-ogcapi-connectedsystems10-<version>.jar`
**AND** the jar contains `META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController`.
*Maps to*: REQ-ETS-SCAFFOLD-001, SCAFFOLD-002, SCAFFOLD-005.

#### SCENARIO-ETS-CORE-LANDING-001 (CRITICAL)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**AND** the Core suite is loaded in TeamEngine
**WHEN** the Core suite executes `landing-page` tests
**THEN** the `@Test` for `OGC-19-072 /req/landing-page/root-success` PASSES (canonical OGC `.adoc` form per S-ETS-02-03 sweep)
**AND** the captured HTTP response shows `Content-Type` containing `application/json`
**AND** the body has `title`, `description`, and `links`
**AND** `links` contains both `rel=conformance` AND (`rel=service-desc` OR `rel=service-doc`).
*Maps to*: REQ-ETS-CORE-002.

#### SCENARIO-ETS-CORE-CONFORMANCE-001 (CRITICAL)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Core suite executes `GET /conformance`
**THEN** the response is HTTP 200
**AND** the body has `conformsTo` (array of URIs)
**AND** the URI list is captured into TestNG suite context for use by dependent suites.
*Maps to*: REQ-ETS-CORE-003.

#### SCENARIO-ETS-TEAMENGINE-LOAD-001 (CRITICAL)
**GIVEN** the Docker image `ets-ogcapi-connectedsystems10` is built from the Sprint 1 Dockerfile
**WHEN** the container is launched via `docker run -p 8081:8080 ets-ogcapi-connectedsystems10`
**THEN** within 30 seconds `GET http://localhost:8081/teamengine/` returns HTTP 200
**AND** the suite list at `GET http://localhost:8081/teamengine/rest/suites` includes `ogcapi-connectedsystems10`
**AND** the TeamEngine logs show zero `ERROR`-level entries during suite registration.
*Maps to*: REQ-ETS-TEAMENGINE-001, TEAMENGINE-003, NFR-ETS-04.

#### SCENARIO-ETS-CORE-SMOKE-001 (CRITICAL)
**GIVEN** the TeamEngine + ETS Docker container is running
**WHEN** `scripts/smoke-test.sh` executes the Core suite against GeoRobotix
**THEN** the script exits 0
**AND** the TestNG XML report is non-empty
**AND** every `@Test` in the Core suite produces PASS or SKIP (no FAIL, no ERROR).
*Maps to*: REQ-ETS-TEAMENGINE-005.

### NORMAL Scenarios

#### SCENARIO-ETS-SCAFFOLD-LAYOUT-001 (NORMAL)
**GIVEN** a clean checkout
**WHEN** a structural-diff checklist compares the repo layout to `opengeospatial/ets-ogcapi-features10`
**THEN** the only divergences are spec-subject-driven (e.g. file basenames mention `connectedsystems10` instead of `features10`).
*Maps to*: REQ-ETS-SCAFFOLD-003, NFR-ETS-15.

#### SCENARIO-ETS-SCAFFOLD-REPRODUCIBLE-001 (NORMAL)
**GIVEN** the same commit checked out twice in CI
**WHEN** `mvn clean install` runs in each checkout
**THEN** the resulting jars are byte-identical excluding `META-INF/` timestamps.
*Maps to*: REQ-ETS-SCAFFOLD-005, NFR-ETS-01.

#### SCENARIO-ETS-CORE-RESOURCE-SHAPE-001 (NORMAL)
**GIVEN** any resource fetched from a landing-page link on the IUT
**WHEN** the Core suite asserts the base resource shape
**THEN** the response body has `id` (string), `type` (string), and `links` (array of objects with `href`, `rel`).
*Maps to*: REQ-ETS-CORE-004.

#### SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 (NORMAL)
**GIVEN** the Core suite produces at least one FAIL verdict for a target IUT
**WHEN** the System Features suite (`/conf/system-features`) attempts to run
**THEN** all `@Test` methods in System Features emit SKIP with reason `dependency /conf/core not satisfied`.
*Maps to*: REQ-ETS-PART1-001..013, PRD FR-ETS-24.

#### SCENARIO-ETS-FIXTURES-PORT-COVERAGE-001 (NORMAL)
**GIVEN** the spec-trap fixture corpus is ported into Java `@DataProvider` methods
**WHEN** `scripts/audit-fixture-port.sh` runs in CI
**THEN** the script exits 0
**AND** every case ID present in TS source has a matching case ID in Java source.
*Maps to*: REQ-ETS-FIXTURES-001, FIXTURES-003, SC-9.

#### SCENARIO-ETS-CORE-LINKS-NORMATIVE-001 (NORMAL)
**GIVEN** an IUT whose landing page contains `rel=conformance` and `rel=service-desc` but does NOT contain `rel=self`
**WHEN** the Core suite runs the landing-page link-relations assertion
**THEN** the test PASSES (absence of `self` is not a FAIL — example-only per OGC 19-072).
*Maps to*: REQ-ETS-CORE-002. Direct port of v1.0 SCENARIO-LINKS-NORMATIVE-001 (GH#3 fix).

#### SCENARIO-ETS-CORE-API-DEF-FALLBACK-001 (NORMAL)
**GIVEN** an IUT whose landing page contains `rel=service-doc` (HTML) but NOT `rel=service-desc`
**WHEN** the Core suite runs the API-definition assertion
**THEN** the test PASSES via the service-doc fallback.
*Maps to*: REQ-ETS-CORE-002. Direct port of v1.0 SCENARIO-API-DEF-FALLBACK-001.

#### SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LANDING-001 (CRITICAL — Sprint 2)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**AND** Core suite has PASSED (no dependency-skip triggered)
**WHEN** the SystemFeatures suite executes `GET /systems`
**THEN** the response is HTTP 200
**AND** the body is parseable JSON containing an `items` array (the CS API uses the `items` wrapper key per OGC API – Features clause 7.15.2-7.15.8 inherited via `/req/system/resources-endpoint`)
**AND** the `items` array is non-empty (S-ETS-02-06 curl-verification confirmed 36 items).
*Maps to*: REQ-ETS-PART1-002 (`/req/system/resources-endpoint`).

#### SCENARIO-ETS-PART1-002-SYSTEMFEATURES-DEPENDENCY-SKIP-001 (CRITICAL — Sprint 2)
**GIVEN** the Core suite produces at least one FAIL verdict for a target IUT
**WHEN** the SystemFeatures suite (`/conf/system`) attempts to run
**THEN** all `@Test` methods in SystemFeatures emit SKIP with reason referencing the unsatisfied `core` group dependency (TestNG group-dependency wiring `<dependencies><group name="systemfeatures" depends-on="core"/>` in `testng.xml`)
**AND** no assertion in SystemFeatures is reported as FAIL or ERROR.
*Maps to*: REQ-ETS-PART1-002. Closes SCENARIO-ETS-PART1-DEPENDENCY-SKIP-001 against SystemFeatures specifically. Live verification deferred to Quinn/Raze gate (would require modifying GeoRobotix or pointing IUT at a 500-server); static verification at S-ETS-02-06 confirmed via TestNG XML output `depends-on-groups="core"` attribute on each of the 4 SystemFeatures @Tests.

#### SCENARIO-ETS-PART1-002-SYSTEMFEATURES-RESOURCE-SHAPE-001 (NORMAL — Sprint 2)
**GIVEN** the first item in the `/systems` collection has been dereferenced via `GET /systems/{id}`
**WHEN** the SystemFeatures suite asserts the canonical-endpoint single-item shape
**THEN** the item has `id` (string), `type` (string), and `links` (array of objects with `href`, `rel`).
*Note*: Operates on the **single-item endpoint** `/systems/{id}` per `/req/system/canonical-endpoint`, NOT the collection level. S-ETS-02-06 curl-verification proved that GeoRobotix `/systems` collection items are minimal GeoJSON Feature stubs without `links`; only the single-item canonical endpoint carries the load-bearing `links` array. v1.0 registry `system-features.ts:225-297` `testCanonicalEndpoint` uses the same single-item-endpoint pattern.
*Maps to*: REQ-ETS-PART1-002 (`/req/system/canonical-endpoint`), REQ-ETS-CORE-004.

#### SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LINKS-NORMATIVE-001 (NORMAL — Sprint 2)
**GIVEN** the single-item `/systems/{id}` response on the IUT
**WHEN** the SystemFeatures suite runs the links-discipline assertion
**THEN** the `links` array contains an entry with `rel=canonical` (the load-bearing assertion per OGC 23-001 `/req/system/canonical-url` — the canonical URL discipline)
**AND** absence of `rel=self` is NOT a FAIL (consistent with the v1.0 GH#3 fix policy applied at the Core landing page; v1.0 audit at `csapi_compliance/src/engine/registry/system-features.ts:36-44` + `:273-286` documents that OGC 23-001 `/req/system/canonical-url` mandates `rel="canonical"` only on **non-canonical** URLs and does NOT require `rel="self"` on `/systems/{id}`).
*Note*: Adapted from design.md text (collection-level `rel=collection`/`rel=items`) per S-ETS-02-06 curl-verification: GeoRobotix `/systems` has only `items` (no collection-level `links`); the load-bearing link discipline lives on `/systems/{id}`.
*Maps to*: REQ-ETS-PART1-002 (`/req/system/canonical-url`), REQ-ETS-CORE-002 (link-discipline policy carryover).

#### SCENARIO-ETS-CLEANUP-URI-CANONICALIZATION-001 (CRITICAL — Sprint 2)
**GIVEN** the spec.md REQ blocks for REQ-ETS-CORE-002..004 + the Java `static final String REQ_*` constants in `conformance/core/*.java`
**WHEN** S-ETS-02-03 sweep completes
**THEN** every URI in spec.md, traceability.md, Java source, and the Sprint 2 close commit message references the OGC canonical `.adoc` form (e.g. `/req/landing-page/root-success` not `/req/core/root-success`)
**AND** dereferencing any updated URI against the OGC normative document returns HTTP 200 (verified by curl spot-check on at least 3 randomly-chosen URIs).
*Maps to*: REQ-ETS-CORE-001..004 (modified), REQ-ETS-CLEANUP-002. Closes Sprint 1 inherited PARTIAL `uri_mapping_fidelity_preserved`.

#### SCENARIO-ETS-CLEANUP-SMOKE-NO-REGRESSION-001 (CRITICAL — Sprint 2)
**GIVEN** all Sprint 2 cleanup commits have landed (S-ETS-02-02 EtsAssert refactor + S-ETS-02-03 URI sweep + S-ETS-02-05 Dockerfile multi-stage)
**WHEN** `bash scripts/smoke-test.sh` runs end-to-end
**THEN** the script exits 0
**AND** the TestNG XML report shows total = 12 (Core preserved) PASS at minimum (plus N for SystemFeatures once S-ETS-02-06 lands)
**AND** zero startup ERROR/SEVERE in the container log.
*Maps to*: REQ-ETS-TEAMENGINE-005, all Sprint 2 cleanup REQs.

#### SCENARIO-ETS-CLEANUP-ETSASSERT-REFACTOR-001 (NORMAL — Sprint 2)
**GIVEN** the conformance.core.* and conformance.systemfeatures.* test classes at the Sprint 2 close HEAD
**WHEN** `grep -E 'throw new AssertionError|Assert\\.fail' src/main/java/.../conformance/*/*.java` runs
**THEN** the grep returns ZERO hits
**AND** every assertion goes through an `ETSAssert.assert*` or `ETSAssert.failWithUri` helper.
*Maps to*: REQ-ETS-CLEANUP-001, REQ-ETS-CORE-001.

#### SCENARIO-ETS-CLEANUP-LOGBACK-MASKING-001 (NORMAL — Sprint 2)
**GIVEN** smoke-test.sh runs with synthetic CTL parameter `auth-credential=Bearer ABCDEFGH12345678WXYZ`
**WHEN** the TestNG report attachments + container log are produced
**THEN** the literal substring `EFGH12345678WXYZ` (would-be-unmasked credential middle) does NOT appear anywhere in the artifacts
**AND** the masked form (e.g. `Beare...mnop`) DOES appear (proving the filter ran rather than dropping the field entirely).
*Maps to*: REQ-ETS-CLEANUP-003, NFR-ETS-08.

#### SCENARIO-ETS-CLEANUP-DOCKERFILE-MULTISTAGE-001 (NORMAL — Sprint 2)
**GIVEN** a fresh CI-style runner with NO `~/.m2` cache or mount available
**WHEN** `docker build .` runs in the Sprint 2 close working tree
**THEN** the build succeeds
**AND** the resulting image runs as non-root (UID != 0)
**AND** the final image size is ≤ 450MB (target 400MB).
*Maps to*: REQ-ETS-TEAMENGINE-003 (modified), REQ-ETS-CLEANUP-004.

#### SCENARIO-ETS-CLEANUP-CI-WORKFLOW-LIVE-001 (NORMAL — Sprint 2)
**GIVEN** the Sprint 2 close HEAD on the new repo
**WHEN** a developer inspects the GitHub Actions tab
**THEN** at least one `workflow_run` exists for `.github/workflows/build.yml` triggered by a Sprint 2 push commit
**AND** the workflow_run status is SUCCESS
**OR** the absence is documented in ops/status.md as a deferred-with-rationale carryover (gh OAuth scope still missing).
*Maps to*: REQ-ETS-SCAFFOLD-005, NFR-ETS-02.

#### SCENARIO-ETS-CLEANUP-ADR-006-007-001 (NORMAL — Sprint 2)
**GIVEN** the Sprint 2 close HEAD
**WHEN** `ls _bmad/adrs/` runs
**THEN** `ADR-006-jersey-3x-jakarta-port.md` exists with the standard ADR sections (Context, Decision, Status, Consequences, Alternatives Considered) and references the 6 Sprint 1 Jersey port commits by SHA
**AND** `ADR-007-dockerfile-base-image-deviation.md` exists with the same standard sections, includes empirical evidence (Docker Hub tag enumeration + JDK 8 java -version + JDK 17 javap -v), and lists alternatives considered
**AND** ADR-001 contains a cross-reference paragraph pointing to ADR-007.
*Maps to*: REQ-ETS-SCAFFOLD-006.

#### SCENARIO-ETS-CLEANUP-DEPENDENCY-SKIP-LIVE-001 (CRITICAL — Sprint 3)
**GIVEN** the SystemFeatures conformance class is wired with `dependsOnGroups="core"` per Sprint 2 close
**AND** Core's `landingPageReturnsHttp200` @Test is sabotaged (e.g. assertion changed to expect HTTP 999) OR a programmatic TestNG XmlSuite mocks Core failure
**WHEN** the suite runs end-to-end (smoke OR unit-test)
**THEN** Core @Test reports `status="FAIL"`
**AND** all 4 SystemFeatures @Tests report `status="SKIP"` (NOT FAIL, NOT ERROR)
**AND** the SKIP reason references the unsatisfied `core` group dependency.
*Maps to*: REQ-ETS-CLEANUP-005, REQ-ETS-PART1-002. Closes Quinn s06 CONCERN-1 + Raze s06 CONCERN-1 (both flagged the gap that Sprint 2's static-only dependency-skip verification did not exercise the live cascade).

#### SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-INTEGRATION-001 (CRITICAL — Sprint 3)
**GIVEN** the suite at the Sprint 3 close HEAD with `auth-credential` wired as a TestNG suite parameter
**AND** `MaskingRequestLoggingFilter` (or equivalent wrap pattern per Architect) is registered alongside CredentialMaskingFilter
**WHEN** `bash scripts/smoke-test.sh --auth-credential "Bearer ABCDEFGH12345678WXYZ"` runs end-to-end against GeoRobotix
**THEN** the script exits 0
**AND** `grep -r 'EFGH12345678WXYZ' ets-ogcapi-connectedsystems10/ops/test-results/` returns ZERO hits (no leak in TestNG XML attachments)
**AND** `grep -r 'EFGH12345678WXYZ' <container-log-location>` returns ZERO hits (no leak in container logs)
**AND** `grep -r 'Bear\*\*\*WXYZ\|Bear.*\*\*\*WXYZ' ets-ogcapi-connectedsystems10/ops/test-results/` returns at least one hit (proving filter ran rather than dropping the field).
*Maps to*: REQ-ETS-CLEANUP-006, REQ-ETS-CLEANUP-003 (modified). Closes Sprint 2 PARTIAL `no_credential_leak_in_test_logs`.

#### SCENARIO-ETS-CLEANUP-REST-ASSURED-LOGGING-WRAPPED-001 (NORMAL — Sprint 3)
**GIVEN** REST-Assured's built-in `RequestLoggingFilter` is explicitly added to a test class (or unit-test scenario) at the Sprint 3 close
**WHEN** that test sends a request with `Authorization: Bearer ABCDEFGH12345678WXYZ`
**THEN** the request-log line emitted by RequestLoggingFilter shows the masked form (e.g. `Authorization: Bear***WXYZ`) — NOT the unmasked `Bearer ABCDEFGH12345678WXYZ`
**AND** the actual outgoing HTTP request still carries the unmasked Authorization header (auth handshake works).
*Maps to*: REQ-ETS-CLEANUP-006. Closes Raze cleanup CONCERN-2 + design.md §529 Sprint 3 hardening deferral.

#### SCENARIO-ETS-CLEANUP-IMAGE-SIZE-001 (NORMAL — Sprint 3)
**GIVEN** the multi-stage Dockerfile at the Sprint 3 close HEAD with image-size optimization applied (per Architect's ratified approach)
**WHEN** `docker images <smoke-built-image> --format '{{.Size}}'` runs
**THEN** the reported size is < 550 MB (Sprint 3 stretch goal — more permissive than ADR-009's 450MB soft target)
**OR** the reported size is 550-700 MB and the deferral rationale is captured in story Implementation Notes per ADR-009 §"Negative" deferral language
**AND** smoke 12+6+N PASS preserved post-optimization (no regression).
*Maps to*: REQ-ETS-CLEANUP-008, REQ-ETS-CLEANUP-004 (modified).

#### SCENARIO-ETS-CLEANUP-DOC-CLEANUPS-001 (NORMAL — Sprint 3)
**GIVEN** Quinn s06 CONCERN-2 (VerifySystemFeaturesTests reference) + Raze s06 CONCERN-2 (ops/test-results/ convention ambiguity)
**WHEN** S-ETS-03-06 closes
**THEN** EITHER `src/test/java/.../conformance/systemfeatures/VerifySystemFeaturesTests.java` exists with substantive coverage OR the s-ets-02-06 story acceptance criterion line 30 is amended to remove the reference
**AND** Sprint 1 + Sprint 2 + Sprint 3 contract `evaluation_artifacts_required` clauses explicitly state the convention: smoke artifacts archive to `ets-ogcapi-connectedsystems10/ops/test-results/`, NOT `csapi_compliance/ops/test-results/`.
*Maps to*: (no REQ — pure documentation closure).

#### SCENARIO-ETS-PART1-001-COMMON-LANDING-001 (CRITICAL — Sprint 3)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Common suite executes Common-specific landing-page assertions
**THEN** the response body link discipline matches OGC API Common Part 1 (e.g. `rel=conformance` mandatory; `rel=data` OR `rel=collections` if collections endpoint present)
**AND** Common's @Tests use ETSAssert helpers + canonical `/req/common/<X>` (or canonical-equivalent) URI form
**AND** Common runs in parallel with Core (no `dependsOnGroups` declaration on the `common` group).
*Maps to*: REQ-ETS-PART1-001.

#### SCENARIO-ETS-PART1-001-COMMON-CONFORMANCE-001 (NORMAL — Sprint 3)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Common suite executes `GET /conformance` with Common-specific assertions
**THEN** `conformsTo` includes Common Part 1's classes
**AND** the @Test description references the canonical OGC `.adoc` URI for `/req/common/conformance` (or equivalent form Generator verified at OGC source).
*Maps to*: REQ-ETS-PART1-001.

#### SCENARIO-ETS-PART1-001-COMMON-COLLECTIONS-001 (NORMAL — Sprint 3)
**GIVEN** the IUT may or may not implement `/collections`
**WHEN** the Common suite executes `GET /collections`
**THEN** if HTTP 200: response body contains a `collections` array (assert per `/req/common/collections`)
**AND** if HTTP 404 OR not implemented: @Test reports `status="SKIP"` with reason "/collections not implemented by IUT" (NOT FAIL).
*Maps to*: REQ-ETS-PART1-001.

#### SCENARIO-ETS-PART1-001-COMMON-CONTENT-NEGOTIATION-001 (NORMAL — Sprint 3)
**GIVEN** the IUT's landing page or any Common endpoint
**WHEN** the Common suite executes `GET /?f=json` and `GET /?f=html`
**THEN** the JSON response has `Content-Type` containing `application/json`
**AND** the HTML response has `Content-Type` containing `text/html`
**OR** if the IUT does not support either format: SKIP-with-reason (NOT FAIL — content-negotiation is a discipline, not all IUTs offer both formats).
*Maps to*: REQ-ETS-PART1-001.

#### SCENARIO-ETS-PART1-002-SYSTEMFEATURES-COLLECTIONS-001 (CRITICAL — Sprint 3)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**AND** Core suite has PASSED (no dependency-skip triggered)
**WHEN** the SystemFeatures expansion @Test `systemAppearsInCollections` runs
**THEN** EITHER `GET /collections` returns 200 + JSON with a `collections` array containing an entry for `systems` (id, title, or canonical IUT path matches)
**OR** the IUT's landing page contains a link with `rel="collection"` (or equivalent) referencing `/systems` (fallback discovery)
**OR** SKIP-with-reason if neither path is available (the IUT may surface `/systems` differently than OGC 23-001 §`/req/system/collections` standardizes).
*Maps to*: REQ-ETS-PART1-002 (modified per Sprint 3 expansion).

#### SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LOCATION-TIME-001 (NORMAL — Sprint 3)
**GIVEN** the first item in the `/systems` collection on the IUT
**WHEN** the SystemFeatures expansion @Test `systemHasGeometryAndValidTime` runs
**THEN** the item has `geometry` field (GeoJSON Geometry or null) AND/OR `properties.validTime` (string/array per OGC 23-001 §`/req/system/location-time`)
**OR** if neither is present: SKIP-with-reason (MAY priority per v1.0 audit at `csapi_compliance/src/engine/registry/system-features.ts`; absence is NOT FAIL).
*Maps to*: REQ-ETS-PART1-002 (modified per Sprint 3 expansion).

#### SCENARIO-ETS-CLEANUP-CI-WORKFLOW-ESCALATION-001 (CRITICAL — Sprint 4)
**GIVEN** the gh OAuth token has been a 4-consecutive-sprint user-action blocker (S-ETS-01-01..03 + S-ETS-02-05 + S-ETS-03-03)
**WHEN** Sprint 4 closes
**THEN** EITHER GitHub Actions UI shows at least one workflow_run on a Sprint 4 commit with `conclusion=success` (Path A — user granted scope, Generator landed `git mv`)
**OR** `ops/status.md` documents `ci_workflow_live` as DROPPED from sprint cadence with explicit "perpetual environmental blocker" rationale + alternative path note (Path B — formal drop per Raze recommendation).
*Maps to*: REQ-ETS-CLEANUP-007 (modified), REQ-ETS-CLEANUP-009. Closes Raze cumulative CONCERN-3 + 4-sprint-defer pattern (binary outcome — no more 4-sprint-style retries).

#### SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-E2E-001 (CRITICAL — Sprint 4)
**GIVEN** the suite at the Sprint 4 close HEAD with `auth-credential` wired end-to-end through `scripts/smoke-test.sh` (or dedicated `scripts/credential-leak-e2e-test.sh`)
**AND** authenticated IUT (or stub IUT per Architect's ratification) requires `Authorization: Bearer ABCDEFGH12345678WXYZ`
**WHEN** the E2E smoke runs end-to-end
**THEN** the script exits 0
**AND** `grep -r 'EFGH12345678WXYZ' ets-ogcapi-connectedsystems10/ops/test-results/` returns ZERO hits
**AND** `docker logs <container> 2>&1 | grep 'EFGH12345678WXYZ'` returns ZERO hits
**AND** `grep -rE 'Bear\*\*\*WXYZ' ets-ogcapi-connectedsystems10/ops/test-results/` returns at least one hit (proving filter ran rather than dropping the field).
*Maps to*: REQ-ETS-CLEANUP-006 (modified), REQ-ETS-CLEANUP-011. Closes Sprint 3 PARTIAL `credential_leak_integration_test_green` (deeper E2E) + Quinn cumulative CONCERN-1.

#### SCENARIO-ETS-CLEANUP-IMAGE-SIZE-V2-001 (NORMAL — Sprint 4)
**GIVEN** the multi-stage Dockerfile at the Sprint 4 close HEAD with chown-layer attack applied (every `COPY` directive uses `--chown=tomcat:tomcat`; standalone `RUN chown -R ...` deleted)
**WHEN** `docker build` produces the runtime image AND `docker images <smoke-built-image> --format '{{.Size}}'` runs
**THEN** the reported size is < 600 MB (Sprint 4 PASS target via chown-layer attack)
**OR** the reported size is 600-650 MB and the deferral rationale is captured in story Implementation Notes (PARTIAL acceptable per ADR-009 §"Negative" deferral language)
**AND** smoke 22+M PASS preserved post-optimization (no regression).
*Maps to*: REQ-ETS-CLEANUP-008 (modified), REQ-ETS-CLEANUP-010.

#### SCENARIO-ETS-CLEANUP-ADR-009-V2-001 (NORMAL — Sprint 4)
**GIVEN** the Sprint 4 close HEAD with ADR-009 amended (or new ADR-011 superseding) per Architect's ratification
**WHEN** `cat _bmad/adrs/ADR-009-*.md` runs (or ADR-011 if superseding)
**THEN** the ADR records (a) the empirical falsification of the illustrative 200-300MB jar-dedupe projection (Sprint 3 evidence at sprint-ets-03-04-empirical-dedupe-list-2026-04-29.txt cited);
**AND** (b) the chown-layer attack approach + measured delta from Sprint 3 660MB baseline;
**AND** (c) the 80MB-as-dominant-cost identification;
**AND** (d) the Sprint 5+ next-target roadmap (alpine variant per ADR-009 §Alternatives if Sprint 4 chown-attack underperforms).
*Maps to*: REQ-ETS-CLEANUP-010, REQ-ETS-SCAFFOLD-006.

#### SCENARIO-ETS-CLEANUP-SABOTAGE-SCRIPT-HERMETIC-001 (NORMAL — Sprint 4)
**GIVEN** the bash sabotage script at the Sprint 4 close HEAD with two bug fixes applied (stub bind 0.0.0.0 + docker --add-host=host.docker.internal:host-gateway)
**AND** the host is Linux without Docker Desktop
**WHEN** `bash scripts/sabotage-test.sh` runs end-to-end
**THEN** `netstat -tlnp | grep <stub-port>` shows `0.0.0.0:<port>` (NOT `127.0.0.1:<port>` or `localhost:<port>`)
**AND** the smoke container reaches the stub via `host.docker.internal:<port>` (no resolution failure)
**AND** the script exits 0 with parseable TestNG XML archive at `ops/test-results/sprint-ets-04-04-sabotage-script-hermetic-<date>.xml`
**AND** Sprint 3 one-level cascade-skip behavior preserved (no regression).
*Maps to*: REQ-ETS-CLEANUP-012, ADR-010 (extended).

#### SCENARIO-ETS-PART1-003-SUBSYSTEMS-RESOURCES-001 (CRITICAL — Sprint 4)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**AND** Core suite has PASSED + SystemFeatures suite has PASSED (no two-level cascade-skip triggered)
**WHEN** the Subsystems suite executes `subsystemsResourcesEndpointReturnsCollection` @Test
**THEN** EITHER `GET /systems/{id}/subsystems` returns 200 + JSON with a non-empty `items` array
**OR** SKIP-with-reason if `/systems/{id}/subsystems` returns 404 (IUT does not implement Subsystems)
**AND** the @Test description references the canonical OGC `.adoc` URI for `/req/subsystem/resources-endpoint`.
*Maps to*: REQ-ETS-PART1-003.

#### SCENARIO-ETS-PART1-003-SUBSYSTEMS-CANONICAL-001 (NORMAL — Sprint 4)
**GIVEN** at least one subsystem id discovered from `/systems/{id}/subsystems`
**WHEN** the Subsystems suite executes `subsystemCanonicalEndpointReturnsBaseShape` @Test
**THEN** `GET /subsystems/{id}` returns 200 + JSON with `id` (string), `type` (string), `links` (array per REQ-ETS-CORE-004 base shape)
**AND** the @Test description references the canonical OGC `.adoc` URI for `/req/subsystem/canonical-endpoint`.
*Maps to*: REQ-ETS-PART1-003.

#### SCENARIO-ETS-PART1-003-SUBSYSTEMS-PARENT-LINK-001 (NORMAL — Sprint 4)
**GIVEN** at least one subsystem item from `/subsystems/{id}` or `/systems/{id}/subsystems`
**WHEN** the Subsystems suite executes `subsystemHasParentSystemLink` @Test
**THEN** the subsystem item's `links` array contains an entry with `rel="system"` (or equivalent per OGC `.adoc`) referencing the parent system URI
**AND** the @Test description references the canonical OGC `.adoc` URI for `/req/subsystem/parent-system-link`.
*Maps to*: REQ-ETS-PART1-003.

#### SCENARIO-ETS-PART1-003-SUBSYSTEMS-CANONICAL-URL-001 (NORMAL — Sprint 4)
**GIVEN** at least one subsystem item from `/subsystems/{id}` or `/systems/{id}/subsystems`
**WHEN** the Subsystems suite executes `subsystemHasCanonicalLink` @Test
**THEN** the subsystem item's `links` array contains an entry with `rel="canonical"` per `/req/subsystem/canonical-url`
**AND** absence of `rel="self"` is NOT FAIL (preserves v1.0 GH#3 fix policy from Core landing page).
*Maps to*: REQ-ETS-PART1-003.

#### SCENARIO-ETS-PART1-003-SUBSYSTEMS-DEPENDENCY-SKIP-001 (CRITICAL — Sprint 4)
**GIVEN** the Subsystems conformance class is wired with `dependsOnGroups="systemfeatures"` per Sprint 4 close
**AND** SystemFeatures' tests are sabotaged to FAIL (e.g. extended bash sabotage script targeting SystemFeatures, or VerifyTestNGSuiteDependency.java extension exercising the two-level chain)
**WHEN** the suite runs end-to-end (smoke OR unit-test)
**THEN** SystemFeatures @Tests report `status="FAIL"`
**AND** ALL Subsystems @Tests report `status="SKIP"` (NOT FAIL, NOT ERROR) — TWO-LEVEL cascade verified
**AND** the SKIP reason references the unsatisfied `systemfeatures` group dependency.
*Maps to*: REQ-ETS-PART1-003. Closes architect-handoff `TWO-LEVEL-DEPENDENCY-CASCADE-MAY-NOT-WORK` risk; first multi-level cascade verification in the project.

### Sprint 5 Scenarios

#### SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-WIRING-001 (CRITICAL — Sprint 5)
**GIVEN** `SMOKE_AUTH_CREDENTIAL=Bearer ABCDEFGH12345678WXYZ` is set in the environment
**AND** `scripts/stub-iut.sh` is running on 0.0.0.0 on an ephemeral port
**WHEN** `scripts/credential-leak-e2e-test.sh` invokes `scripts/smoke-test.sh` targeting the stub IUT
**THEN** the stub-IUT log shows AT LEAST ONE request with `Authorization: Bearer ABCDEFGH12345678WXYZ`
**AND** the smoke-test.sh passes the credential as `auth-credential` TestNG suite parameter via curl POST.
*Maps to*: REQ-ETS-CLEANUP-013. Closes GAP-1 wiring defect from Sprint 4 cumulative gates.

#### SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-THREE-FOLD-001 (CRITICAL — Sprint 5)
**GIVEN** `scripts/credential-leak-e2e-test.sh` runs end-to-end with stub IUT and `SMOKE_AUTH_CREDENTIAL` set
**WHEN** the three-fold cross-check executes
**THEN** prong (a): `grep -r 'EFGH12345678WXYZ' $SMOKE_OUTPUT_DIR` returns ZERO hits
**AND** prong (b): `grep -rE 'Bear\*\*\*WXYZ' $SMOKE_OUTPUT_DIR` returns AT LEAST ONE hit (proves MaskingRequestLoggingFilter ran)
**AND** prong (c): stub-IUT log returns AT LEAST ONE hit for unmasked credential (proves wire carried the credential).
*Maps to*: REQ-ETS-CLEANUP-013, REQ-ETS-CLEANUP-006 (closed). Fully closes design.md §529 deferral.

#### SCENARIO-ETS-CLEANUP-SMOKE-OUTPUT-DIR-001 (NORMAL — Sprint 5)
**GIVEN** `SMOKE_OUTPUT_DIR=/tmp/smoke-test-output` is set
**WHEN** `scripts/smoke-test.sh` runs end-to-end
**THEN** TestNG XML artifacts are written to `/tmp/smoke-test-output/` (not to `ops/test-results/`)
**AND** the user's worktree `ops/test-results/` directory is unmodified.
*Maps to*: REQ-ETS-CLEANUP-014. Closes Sprint 2 + Sprint 4 worktree-pollution incident pattern.

#### SCENARIO-ETS-CLEANUP-SABOTAGE-TARGET-001 (NORMAL — Sprint 5)
**GIVEN** `scripts/sabotage-test.sh --target=systemfeatures` is invoked
**WHEN** the script runs end-to-end
**THEN** the produced TestNG XML shows SystemFeatures @Tests FAIL (1) + SKIP (5) + Subsystems SKIP (4) + Procedures SKIP (P) + Deployments SKIP (D); Core + Common PASS
**AND** the original SystemFeaturesTests.java file in the worktree is UNMODIFIED after the run.
*Maps to*: REQ-ETS-CLEANUP-015.

#### SCENARIO-ETS-CLEANUP-SUBSYSTEMS-JAVADOC-001 (NORMAL — Sprint 5)
**GIVEN** SubsystemsTests.java at Sprint 5 close HEAD
**WHEN** a reviewer reads the class-level javadoc
**THEN** the javadoc enumerates 6 `.adoc` files (not 5) including `req_subcollection_time.adoc`
**AND** the javadoc clarifies that `req_subcollection_time.adoc` exists but is not enumerated in requirements_class_system_components.adoc.
*Maps to*: REQ-ETS-PART1-003 (minor doc accuracy).

#### SCENARIO-ETS-CLEANUP-ADR-010-V3-001 (NORMAL — Sprint 5)
**GIVEN** `_bmad/adrs/ADR-010.md` at Sprint 5 close HEAD
**WHEN** a reviewer reads the Amendment v3 section
**THEN** the section states that TestNG 7.9.0 transitive cascade is VERIFIED LIVE (not hypothesized)
**AND** cites Raze Sprint 4 sabotage evidence (total=26/passed=16/failed=1/skipped=9)
**AND** does NOT modify the architectural decision text of the original ADR.
*Maps to*: ADR-010 amendment.

#### SCENARIO-ETS-PART1-006-PROCEDURES-RESOURCES-001 (CRITICAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Procedures suite executes `GET /procedures`
**THEN** the response is HTTP 200
**AND** the JSON body contains an `items` array with at least one element
**AND** the assertion cites `OGC-23-001 /req/procedure/resources-endpoint`.
*Maps to*: REQ-ETS-PART1-006.

#### SCENARIO-ETS-PART1-006-PROCEDURES-LOCATION-001 (CRITICAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Procedures suite fetches `GET /procedures/{id}` for a representative procedure item
**THEN** the `geometry` field of the response is null or absent
**AND** the assertion cites `OGC-23-001 /req/procedure/location`
**OR** the test SKIPs with reason if the IUT returns non-null geometry (IUT conformance gap flagged).
*Maps to*: REQ-ETS-PART1-006.

#### SCENARIO-ETS-PART1-006-PROCEDURES-CANONICAL-001 (NORMAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Procedures suite fetches `GET /procedures/{id}`
**THEN** the response has `id` (string), `type` (string), and `links` (array) per REQ-ETS-CORE-004 base shape
**AND** the assertion cites `OGC-23-001 /req/procedure/canonical-endpoint`.
*Maps to*: REQ-ETS-PART1-006.

#### SCENARIO-ETS-PART1-006-PROCEDURES-CANONICAL-URL-001 (NORMAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Procedures suite fetches `GET /procedures/{id}`
**THEN** the `links` array contains at least one entry with `rel="canonical"`
**AND** the assertion cites `OGC-23-001 /req/procedure/canonical-url`.
*Maps to*: REQ-ETS-PART1-006.

#### SCENARIO-ETS-PART1-006-PROCEDURES-DEPENDENCY-SKIP-001 (CRITICAL — Sprint 5)
**GIVEN** SystemFeatures tests are sabotaged to FAIL
**WHEN** the suite runs end-to-end
**THEN** ALL ProceduresTests @Tests report `status="SKIP"` (NOT FAIL, NOT ERROR)
**AND** the SKIP reason references the unsatisfied `systemfeatures` group dependency.
*Maps to*: REQ-ETS-PART1-006. Extends the TWO-LEVEL cascade pattern to Procedures.

#### SCENARIO-ETS-PART1-004-DEPLOYMENTS-RESOURCES-001 (CRITICAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Deployments suite executes `GET /deployments`
**THEN** the response is HTTP 200
**AND** the JSON body contains an `items` array with at least one element
**AND** the assertion cites `OGC-23-001 /req/deployment/resources-endpoint`.
*Maps to*: REQ-ETS-PART1-004.

#### SCENARIO-ETS-PART1-004-DEPLOYMENTS-CANONICAL-001 (NORMAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Deployments suite fetches `GET /deployments/{id}`
**THEN** the response has `id` (string), `type` (string), and `links` (array) per REQ-ETS-CORE-004 base shape
**AND** the assertion cites `OGC-23-001 /req/deployment/canonical-endpoint`.
*Maps to*: REQ-ETS-PART1-004.

#### SCENARIO-ETS-PART1-004-DEPLOYMENTS-CANONICAL-URL-001 (NORMAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Deployments suite fetches `GET /deployments/{id}`
**THEN** the `links` array contains at least one entry with `rel="canonical"`
**AND** the assertion cites `OGC-23-001 /req/deployment/canonical-url`.
*Maps to*: REQ-ETS-PART1-004.

#### SCENARIO-ETS-PART1-004-DEPLOYMENTS-DEPLOYED-SYSTEM-001 (NORMAL — Sprint 5)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** the Deployments suite checks for DeployedSystem encoding conformance class in `/conformance`
**THEN** if the IUT declares the class: the test PASSES asserting a DeployedSystem representation exists
**OR** if the IUT does NOT declare the class: the test SKIPs with reason (IUT conformance gap noted)
**AND** the assertion cites `OGC-23-001 /req/deployment/deployed-system-resource`.
*Maps to*: REQ-ETS-PART1-004.

#### SCENARIO-ETS-PART1-004-DEPLOYMENTS-DEPENDENCY-SKIP-001 (CRITICAL — Sprint 5)
**GIVEN** SystemFeatures tests are sabotaged to FAIL
**WHEN** the suite runs end-to-end
**THEN** ALL DeploymentsTests @Tests report `status="SKIP"` (NOT FAIL, NOT ERROR)
**AND** the SKIP reason references the unsatisfied `systemfeatures` group dependency.
*Maps to*: REQ-ETS-PART1-004. Extends the TWO-LEVEL cascade pattern to Deployments.

#### SCENARIO-ETS-CLEANUP-MASKING-WIRE-FIX-001 (CRITICAL — Sprint 6)
**GIVEN** `MaskingRequestLoggingFilter.filter()` has been redesigned per S-ETS-06-01 (approach i: no requestSpec mutation before ctx.next)
**AND** the suite runs `scripts/credential-leak-e2e-test.sh` with `SMOKE_AUTH_CREDENTIAL=Bearer ABCDEFGH12345678WXYZ` against the stub-IUT
**WHEN** the three-fold cross-check executes
**THEN** (a) ZERO unmasked literal hits for `EFGH12345678WXYZ` in TestNG XML + container log + smoke log
**AND** (b) AT LEAST ONE masked-form hit for `Bear***WXYZ` in log output (filter ran — log confirms masking at log time)
**AND** (c) AT LEAST ONE unmasked-credential hit for `Bearer ABCDEFGH12345678WXYZ` in stub-IUT log (wire carried the ORIGINAL credential)
**AND** the filter's own log output confirms the masked form was emitted at log time.
*Maps to*: REQ-ETS-CLEANUP-016. Closes the 2-sprint-old `credential_leak_e2e_full_pass` criterion (open since Sprint 4 GAP-1 → Sprint 5 GAP-1').

#### SCENARIO-ETS-CLEANUP-MASKING-WIRE-TEST-001 (CRITICAL — Sprint 6)
**GIVEN** a `CapturingFilterContext` test harness that records the `requestSpec` passed to `ctx.next()`
**AND** a `MaskingRequestLoggingFilter` instance configured with DEFAULT_HEADERS_TO_MASK
**AND** a request spec carrying `Authorization: Bearer ABCDEFGH12345678WXYZ`
**WHEN** `filter.filter(requestSpec, responseSpec, capturingCtx)` is called
**THEN** the captured spec's `Authorization` header value equals `Bearer ABCDEFGH12345678WXYZ` (the ORIGINAL value)
**AND** the log output (captured PrintStream) contains the masked form `Bear***WXYZ` (proving the filter logged the masked form)
**AND** the captured spec DOES NOT contain `Bear***WXYZ` as the Authorization header value.
*Maps to*: REQ-ETS-CLEANUP-016. This is the wire-side unit test that VerifyMaskingRequestLoggingFilter's StubFilterContext cannot provide.

#### SCENARIO-ETS-CLEANUP-CREDENTIAL-LEAK-THREE-FOLD-CLOSE-001 (CRITICAL — Sprint 6)
**GIVEN** Sprint 6 lands the MaskingRequestLoggingFilter fix (S-ETS-06-01) AND the container-log capture timing fix (bundled)
**WHEN** `scripts/credential-leak-e2e-test.sh` runs from `/tmp/<role>-fresh-sprint6/` with `SMOKE_OUTPUT_DIR=/tmp/<role>-fresh-sprint6/test-results/`
**THEN** the script exits 0 with overall verdict PASS
**AND** prong (a): ZERO unmasked literal hits in TestNG XML + container log + smoke log (container log is now captured BEFORE teardown — not vacuously empty)
**AND** prong (b): AT LEAST ONE masked-form `Bear***WXYZ` hit in container log (filter emits masked form during smoke)
**AND** prong (c): AT LEAST ONE unmasked `Bearer ABCDEFGH12345678WXYZ` hit in stub-IUT log (wire carries original credential).
*Maps to*: REQ-ETS-CLEANUP-016, REQ-ETS-CLEANUP-011 (finally IMPLEMENTED after Sprint 4 + Sprint 5 carryover).

#### SCENARIO-ETS-CLEANUP-SABOTAGE-TARGET-DOCKER-FIX-001 (CRITICAL — Sprint 6)
**GIVEN** `scripts/sabotage-test.sh` rsync line has been fixed to include `.git/` in the temp worktree (S-ETS-06-02)
**WHEN** `bash scripts/sabotage-test.sh --target=systemfeatures` runs from `/tmp/<role>-fresh-sprint6/`
**THEN** the Docker build step succeeds (no `COPY .git ./.git: not found` error)
**AND** the smoke run executes against the sabotaged temp tree
**AND** the cascade XML shows Core+Common PASS, SystemFeatures 1×FAIL+Nx SKIP, Subsystems+Procedures+Deployments all SKIP
**AND** the script exits 0 with cascade verdict PASS.
*Maps to*: REQ-ETS-CLEANUP-017, REQ-ETS-CLEANUP-015 (promoted from PARTIAL to FULLY-IMPLEMENTED).

#### SCENARIO-ETS-CLEANUP-SABOTAGE-CASCADE-THREE-CLASS-001 (CRITICAL — Sprint 6)
**GIVEN** the sabotage --target=systemfeatures script runs successfully (SCENARIO-ETS-CLEANUP-SABOTAGE-TARGET-DOCKER-FIX-001)
**WHEN** the cascade XML is parsed
**THEN** all Core @Tests (12) show status="PASS"
**AND** all Common @Tests (4) show status="PASS"
**AND** SystemFeatures @Tests show at least 1 FAIL + at least 5 SKIP (within-class cascade)
**AND** ALL Subsystems @Tests (4) show status="SKIP"
**AND** ALL Procedures @Tests (4) show status="SKIP"
**AND** ALL Deployments @Tests (4) show status="SKIP"
**AND** no FAIL appears in Subsystems/Procedures/Deployments (SKIP, not FAIL, is required — a FAIL would indicate a different defect from cascade failure).
*Maps to*: REQ-ETS-CLEANUP-017, ADR-010 v3 "forward-extends to Procedures + Deployments" (live-exec confirmation).

#### SCENARIO-ETS-CLEANUP-WIRE-SIDE-TEST-001 (CRITICAL — Sprint 6)
**GIVEN** a `CapturingFilterContext` class in `src/test/java/` that implements `FilterContext` and records the `requestSpec` passed to `ctx.next()`
**WHEN** `mvn test` runs
**THEN** `VerifyWireRestoresOriginalCredential` test class is present and all its @Test methods PASS
**AND** the test asserts that the captured requestSpec Authorization header equals the ORIGINAL credential (not the masked form)
**AND** the test is identified as a "wire-side test" in its class javadoc (distinct from wiring-only StubFilterContext tests).
*Maps to*: REQ-ETS-CLEANUP-016.

#### SCENARIO-ETS-CLEANUP-WIRING-TEST-RECLASSIFIED-001 (NORMAL — Sprint 6)
**GIVEN** spec.md REQ-ETS-CLEANUP-013 implementation notes and story S-ETS-05-01 Implementation Notes
**WHEN** a developer reads the implementation status
**THEN** the notes explicitly state: "VerifyAuthCredentialPropagation (8 tests) + VerifyMaskingRequestLoggingFilter (8 tests) = 16 unit tests are wiring-only — use StubFilterContext returning null from ctx.next(); they CANNOT detect filter-ordering defects (wire-side ordering is not exercised)"
**AND** the notes reference VerifyWireRestoresOriginalCredential as the wire-side proof test.
*Maps to*: REQ-ETS-CLEANUP-016.

#### SCENARIO-ETS-CLEANUP-SABOTAGE-LOG-HONEST-001 (NORMAL — Sprint 6)
**GIVEN** `scripts/sabotage-test.sh --target=systemfeatures` is running
**WHEN** the Docker build step fails (if it were to fail, e.g. in CI with a broken environment)
**THEN** the log message reads `"Docker build FAILED"` or equivalent (NOT `"smoke exited non-zero (EXPECTED — SystemFeatures FAIL on first @Test)"`)
**AND** when the Docker build succeeds but smoke exits non-zero due to the sabotage marker @Test FAIL, the log message reads `"smoke exited non-zero (EXPECTED — SystemFeatures FAIL on first @Test)"`.
*Maps to*: REQ-ETS-CLEANUP-015 (improved UX).

#### SCENARIO-ETS-CLEANUP-SABOTAGE-JAVAC-FIX-001 (CRITICAL — Sprint 7)
**GIVEN** `scripts/sabotage-test.sh --target=systemfeatures` is run from a /tmp clone at Sprint 7 HEAD
**WHEN** the python injector injects `if (true) throw new AssertionError("SABOTAGED ...")` as the first statement of `systemsCollectionReturns200()`
**THEN** Docker build step 8/8 (`mvn clean package`) succeeds without `unreachable statement` compile error
**AND** the smoke run produces a TestNG XML cascade report
**AND** the cascade report shows Core+Common all PASS, SystemFeatures 1×FAIL + Nx SKIP, Subsystems+Procedures+Deployments all SKIP.
*Maps to*: REQ-ETS-CLEANUP-017 (live acceptance), REQ-ETS-CLEANUP-018.

#### SCENARIO-ETS-CLEANUP-SABOTAGE-PIPEFAIL-FIX-001 (CRITICAL — Sprint 7)
**GIVEN** `scripts/sabotage-test.sh --target=systemfeatures` is run where Docker build fails (e.g. injected compile error path)
**WHEN** the disambiguation block is reached after `SMOKE_EXIT_CODE` capture
**THEN** the script does NOT exit prematurely before the disambiguation log message fires
**AND** the log contains `"Docker build FAILED"` (not a sabotage-marker hit message)
**AND** bash -x trace evidence confirms the disambiguation block at lines ~287-298 is reachable.
*Maps to*: REQ-ETS-CLEANUP-018.

#### SCENARIO-ETS-CLEANUP-CRED-LEAK-PRONG-B-FIX-001 (CRITICAL — Sprint 7)
**GIVEN** `scripts/credential-leak-e2e-test.sh` is run from a /tmp clone with `SMOKE_AUTH_CREDENTIAL='Bearer ABCDEFGH12345678WXYZ'`
**WHEN** the three-fold cross-check executes
**THEN** the script exits 0 (PASS exit code, not FAIL)
**AND** prong (b) finds ≥1 `Bear***WXYZ` hit (in smoke-test.sh's archived container log, not the vacuous post-teardown docker logs output)
**AND** prongs (a) and (c) continue to PASS as in Sprint 6 manual verification.
*Maps to*: REQ-ETS-CLEANUP-018, REQ-ETS-CLEANUP-011 (automated script now matches semantic PASS).

#### SCENARIO-ETS-CLEANUP-REQ017-STATUS-HONESTY-001 (CRITICAL — Sprint 7)
**GIVEN** spec.md REQ-ETS-CLEANUP-017 status text
**WHEN** an agent reads the status before Sprint 7 live-exec completes
**THEN** the status reads `STRUCTURAL-IMPLEMENTED-LIVE-EXEC-FAILED` (not `IMPLEMENTED`)
**AND** the status text cross-references Raze HIGH GAP-1 + meta-Raze META-GAP-M2
**WHEN** Sprint 7 S-ETS-07-01 closes with live cascade XML produced
**THEN** Generator promotes status to `IMPLEMENTED (Sprint 7 S-ETS-07-01)` with cascade XML evidence.
*Maps to*: REQ-ETS-CLEANUP-017, REQ-ETS-CLEANUP-018. spec-anchored-development status-honesty principle.

#### SCENARIO-ETS-CLEANUP-DESIGN-MD-WRAP-PATTERN-001 (NORMAL — Sprint 7)
**GIVEN** `openspec/capabilities/ets-ogcapi-connectedsystems/design.md` §"Sprint 3 hardening" lines ~531-636
**WHEN** a reader reads the section
**THEN** a "Sprint 6 redesign: approach (i)" subsection appears BEFORE the old code block
**AND** the old Java code block is labelled "Historical (Sprint 3 baseline — superseded by Sprint 6 approach (i))"
**AND** the false claim "try/finally pattern guarantees the IUT receives the real credential header even if super.filter() throws" is corrected or removed
**AND** the deleted try/finally unit-test descriptions are marked as historical or removed.
*Maps to*: REQ-ETS-CLEANUP-018. Closes meta-Raze META-GAP-M1.

#### SCENARIO-ETS-CLEANUP-ADR010-V4-OR-RETROVAL-001 (NORMAL — Sprint 7)
**GIVEN** ADR-010 v3 amendment claims "TestNG 7.9.0 transitive cascade VERIFIED LIVE (2026-04-29)" via Sprint 4 2-class chain
**WHEN** Sprint 7 S-ETS-07-01 Wedge 1 produces a 3-class cascade XML
**THEN** ADR-010 receives a "Sprint 7 live-verification note" confirming the 3-class cascade was produced (retroactively validating v3's forward-extends claim)
**AND** the note records the cascade XML archive path and date.
**OR** if Wedge 1 does not close in Sprint 7, ADR-010 receives a v4 amendment noting "3-class live-verification attempt failed in Sprint 6 due to sabotage-marker compile error; Sprint 7 carryover".
*Maps to*: REQ-ETS-CLEANUP-017, REQ-ETS-CLEANUP-018. Closes meta-Raze META-GAP-M3.

#### SCENARIO-ETS-PART1-007-SF-RESOURCES-001 (CRITICAL — Sprint 7)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**AND** the IUT declares `/conf/sf` in its conformance declaration
**WHEN** `SamplingFeaturesTests` executes `GET /samplingFeatures`
**THEN** the response is HTTP 200
**AND** the response body contains a non-empty `features` or `items` array.
*Maps to*: REQ-ETS-PART1-007, OGC requirement `/req/sf/resources-endpoint`.

#### SCENARIO-ETS-PART1-007-SF-CANONICAL-001 (CRITICAL — Sprint 7)
**GIVEN** at least one sampling feature exists in the collection
**WHEN** `SamplingFeaturesTests` retrieves the first sampling feature at `GET /samplingFeatures/{id}`
**THEN** the response is HTTP 200
**AND** the response body contains `id`, `type`, and a `links` array.
*Maps to*: REQ-ETS-PART1-007.

#### SCENARIO-ETS-PART1-007-SF-CANONICAL-URL-001 (CRITICAL — Sprint 7)
**GIVEN** a sampling feature resource at `GET /samplingFeatures/{id}`
**WHEN** the `links` array is inspected
**THEN** at least one link with `rel=canonical` is present
**AND** the href equals `{api_root}/samplingFeatures/{id}`.
*Maps to*: REQ-ETS-PART1-007, OGC requirement `/req/sf/canonical-url`.

#### SCENARIO-ETS-PART1-007-SF-DEPENDENCY-SKIP-001 (CRITICAL — Sprint 7)
**GIVEN** the testng.xml declares `<group name="samplingfeatures" depends-on="systemfeatures"/>`
**WHEN** SystemFeatures group has any FAIL or SKIP
**THEN** all SamplingFeaturesTests `@Test` methods are SKIPped by TestNG
**AND** the @BeforeClass SkipException fallback also fires as belt-and-suspenders defense-in-depth.
*Maps to*: REQ-ETS-PART1-007, ADR-010 v3.

#### SCENARIO-ETS-PART1-007-SF-SMOKE-NO-REGRESSION-001 (CRITICAL — Sprint 7)
**GIVEN** the TeamEngine + ETS Docker container is running post-Sprint 7
**WHEN** `scripts/smoke-test.sh` executes against GeoRobotix
**THEN** existing 34 @Tests (Core + SystemFeatures + Common + Subsystems + Procedures + Deployments) all continue to PASS
**AND** ≥4 new SamplingFeaturesTests @Tests PASS
**AND** total smoke PASS ≥ 38.
*Maps to*: REQ-ETS-PART1-007, REQ-ETS-TEAMENGINE-005.

#### SCENARIO-ETS-PART1-008-PROP-RESOURCES-001 (CRITICAL — Sprint 7)
**GIVEN** the IUT is `https://api.georobotix.io/ogc/t18/api`
**WHEN** `PropertyDefinitionsTests` executes `GET /properties`
**THEN** the response is HTTP 200
**AND** the response body contains a non-empty collection of property definitions.
*Maps to*: REQ-ETS-PART1-008, OGC requirement `/req/property/resources-endpoint`.

#### SCENARIO-ETS-PART1-008-PROP-CANONICAL-001 (CRITICAL — Sprint 7)
**GIVEN** at least one property definition exists in the collection
**WHEN** `PropertyDefinitionsTests` retrieves the first property at `GET /properties/{id}`
**THEN** the response is HTTP 200
**AND** the response body contains `id`, `type`, and a `links` array.
*Maps to*: REQ-ETS-PART1-008.

#### SCENARIO-ETS-PART1-008-PROP-CANONICAL-URL-001 (CRITICAL — Sprint 7)
**GIVEN** a property definition resource at `GET /properties/{id}`
**WHEN** the `links` array is inspected
**THEN** at least one link with `rel=canonical` is present
**AND** the href equals `{api_root}/properties/{id}`.
*Maps to*: REQ-ETS-PART1-008, OGC requirement `/req/property/canonical-url`.

#### SCENARIO-ETS-PART1-008-PROP-DEPENDENCY-SKIP-001 (CRITICAL — Sprint 7)
**GIVEN** the testng.xml declares `<group name="propertydefinitions" depends-on="systemfeatures"/>`
**WHEN** SystemFeatures group has any FAIL or SKIP
**THEN** all PropertyDefinitionsTests `@Test` methods are SKIPped by TestNG.
*Maps to*: REQ-ETS-PART1-008, ADR-010 v3.

#### SCENARIO-ETS-PART1-008-PROP-SMOKE-NO-REGRESSION-001 (CRITICAL — Sprint 7)
**GIVEN** the TeamEngine + ETS Docker container is running post-Sprint 7
**WHEN** `scripts/smoke-test.sh` executes against GeoRobotix
**THEN** existing ≥38 @Tests (post S-ETS-07-02) all continue to PASS
**AND** ≥4 new PropertyDefinitionsTests @Tests PASS
**AND** total smoke PASS ≥ 42.
*Maps to*: REQ-ETS-PART1-008, REQ-ETS-TEAMENGINE-005.

#### SCENARIO-ETS-WEBAPP-FREEZE-README-001 (NORMAL)
**GIVEN** the `csapi_compliance` repo at HEAD `ab53658` plus the README reposition commit
**WHEN** a reader opens README.md
**THEN** the first non-trivial paragraph identifies the project as a "developer pre-flight tool, not certification-track"
**AND** the README contains a hyperlink to the new ETS repo
**AND** `git tag --list` includes `v1.0-frozen` pointing at `ab53658`.
*Maps to*: REQ-ETS-WEBAPP-FREEZE-001.

#### SCENARIO-ETS-SYNC-URI-DIFF-001 (NORMAL)
**GIVEN** the v1.0 TS registry and the Java ETS each have a non-empty URI coverage list
**WHEN** `scripts/sync-uri-coverage.sh` runs in CI
**THEN** the script exits 0 if every URI is mirrored on both sides OR has an entry in `ops/uri-coverage-allowlist.txt`
**AND** the script exits non-zero if any URI is unmirrored without an allowlist entry.
*Maps to*: REQ-ETS-SYNC-001.

## Implementation Status (2026-04-28)

**Status**: Sprint 1 / S-ETS-01-01 ✅ PASS at `Botts-Innovative-Research/ets-ogcapi-connectedsystems10` HEAD `1323884` (29 commits). Quinn (Gate 3.5) APPROVE_WITH_GAPS 0.88; Raze (Gate 4) GAPS_FOUND 0.84 — both gates' 3 doc gaps closed same-turn 2026-04-28T16:30Z. S-ETS-01-02 (CS API Core conformance class) and S-ETS-01-03 (TeamEngine Docker smoke) are the remaining stories in Sprint 1 contract `.harness/contracts/sprint-ets-01.yaml`.

### What's Built (Sprint ets-01 / S-ETS-01-01)

**Sub-deliverable 1 — Maven Archetype Scaffold** (REQ-ETS-SCAFFOLD-001..007, Implemented):
- REQ-ETS-SCAFFOLD-001: Archetype generated from `org.opengis.cite:ets-archetype-testng:2.7` with ADR-003 coordinates (artifactId `ets-ogcapi-connectedsystems10`, ets-code `ogcapi-connectedsystems10`, package `org.opengis.cite.ogcapiconnectedsystems10`). Generation command recorded in new repo's `ops/server.md`.
- REQ-ETS-SCAFFOLD-002: `<maven.compiler.source/target/release>17</>` set; Maven 3.9 enforced via inherited ets-common:17 maven-enforcer config.
- REQ-ETS-SCAFFOLD-003: Repo layout matches features10 archetype-flat structure. **PARTIAL caveat**: features10's `java17Tomcat10TeamEngine6` branch refactored to `listener/`+`conformance/` subpackages — that refactor is deferred to S-ETS-01-02 when real Core test classes need the subpackages.
- REQ-ETS-SCAFFOLD-004: All deps pinned (no `RELEASE`/`LATEST`). ets-common:17 manages testng, rest-assured, openapi-parser, jts-core, proj4j, jts-io-common, slf4j-api, schema-utils. logback-classic 1.5.18 explicit (not in ets-common's depMgmt).
- REQ-ETS-SCAFFOLD-005: Reproducible build verified. sha256 `fe1c90c54537facf73ddd5172deec4b866e0071eae78834606bf92b229746385` — verified across 7 independent builds (Quinn 3 + Raze 4) including two fresh-clone builds in `/tmp/`. ADR-004 C-5 plumbing: `<project.build.outputTimestamp>2026-04-27T00:00:00Z</>` + manifest `Build-Time` override.
- REQ-ETS-SCAFFOLD-006: 5 ADRs at `_bmad/adrs/ADR-001..005` cover SPI registration, schema bundling, package naming, archetype modernization checklist, cross-repo relationship. 16 of 28 modernization commits cite ADR rows; 12 are legitimate non-ADR work (archetype baseline, SCM rewrite, formatting, Jersey/Jakarta port — Raze CONCERN-1 suggests an optional ADR-006 for the Jersey port; deferred to Sprint 2).
- REQ-ETS-SCAFFOLD-007: Repo lives at `Botts-Innovative-Research/ets-ogcapi-connectedsystems10` per ADR-005 "our org first" gate.

**Sub-deliverable 2 — JSON Schema Bundle** (REQ-ETS-FIXTURES-001 admin-deferred; ADR-002 verbatim copy live):
- 126 JSON Schemas under `src/main/resources/schemas/` byte-identical to `csapi_compliance@ab53658/schemas/` (`diff -r` empty, verified by Quinn + Raze).
- pom.xml `<connected-systems-yaml.sha>3fd86c73e744b7e2faaf7f1c17366bfb9ff4cd6f</>` per ADR-002 mandate (commit `1323884`). Schema-provenance audit trail in new repo's `ops/server.md`.

**Sub-deliverable 3 — CS API Core conformance class** (REQ-ETS-CORE-001..004, Implemented S-ETS-01-02):
- REQ-ETS-CORE-001: TestNG suite-fixture plumbing live in `CommonFixture` + `listener.SuiteFixtureListener` (commit `b6a9c12` in new repo). REST-Assured request/response capture wired via `getRequest()`/`getResponse()`; IUT URL stash via SuiteAttribute enum.
- REQ-ETS-CORE-002: `LandingPageTests` (`conformance.core.LandingPageTests` in new repo, commit `990c850`) — 6 @Test methods. **v1.0 GH#3 fix preserved** via sentinel @Test `landingPageDoesNotRequireSelfRel` (LandingPageTests:204, asserts both presence and absence of `rel=self` are PASS — Raze independently verified the assertion logic). **API-definition fallback preserved** via `landingPageHasApiDefinitionLink` (LandingPageTests:179, PASSES on `service-desc` OR `service-doc`, FAILS only when both absent — Raze verified). All 6 PASS against GeoRobotix.
- REQ-ETS-CORE-003: `ConformanceTests` (commit `ea59436`) — 4 @Test methods asserting GET /conformance HTTP 200 + JSON + non-empty `conformsTo` array + explicit declaration of `http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core`. All 4 PASS against GeoRobotix.
- REQ-ETS-CORE-004: `ResourceShapeTests` Sprint-1-minimal (commit `b249aa1` + URI fix `1fdfe07`) — 2 @Test methods: api-definition link resolves to non-empty content + /conformance body shape is JSON object. Full id/type/links crawl deferred to Sprint 2 per design.md "single representative resource" pattern. **Note**: a copy-paste URI typo (`ogcapi-common-2/0.0/req/oas30/oas-impl` — Common Part 2, OGC 20-024) caught by Raze GAP-3 was corrected to `ogcapi-common-1/1.0/req/oas30/oas-impl` (Common Part 1, OGC 19-072 — the standard Sprint 1 actually targets) in commit `1fdfe07`.

**Sub-deliverable 5 — TeamEngine Integration** (REQ-ETS-TEAMENGINE-001..005, Implemented S-ETS-01-03):
- REQ-ETS-TEAMENGINE-001: META-INF/services SPI registration file (58 bytes, single-line FQCN `org.opengis.cite.ogcapiconnectedsystems10.TestNGController`, no whitespace, no extension) — verified by Quinn s01 + Raze s01/s02 + S-ETS-01-03 smoke runtime.
- REQ-ETS-TEAMENGINE-002: CTL wrapper at `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl` from archetype. **CTL Saxon namespace verified clean** (architect-handoff S-ETS-01-03 CONCERNS pitfall #3 — silent failure mode): `xmlns:tng="java:org.opengis.cite.ogcapiconnectedsystems10.TestNGController"` is the canonical run-together ADR-003 form, no `cs10` typo. Runtime corroboration: 12/12 PASS via SPI-routed smoke confirms TeamEngine successfully loaded the CTL.
- REQ-ETS-TEAMENGINE-003: `Dockerfile` at repo root produces TE 5.6.1 webapp + ETS jar (commit `d910808`). **🚨 IMPLEMENTATION DEVIATION FROM SPEC TEXT (REQ wording amendment proposed for next planning cycle)**: spec said `FROM ogccite/teamengine-production:5.6.1`. Dana discovered (a) that tag doesn't exist on Docker Hub (only `:latest` and `:1.0-SNAPSHOT`), and (b) the production image runs JDK 8 (`JAVA_VERSION=8u212`), incompatible with our JDK 17 ETS jar (`UnsupportedClassVersionError class file version 61.0`). Implemented resolution: assemble TE 5.6.1 manually on `tomcat:8.5-jre17` by downloading `teamengine-web-5.6.1.war` + `teamengine-web-5.6.1-common-libs.zip` + `teamengine-console-5.6.1-base.zip` from Maven Central + 3 secondary patches (VirtualWebappLoader strip, JAXB jars in shared `lib/`, full `mvn dependency:copy-dependencies` deps closure with `teamengine-*-6.0.0.jar` filtered out). Identical TE 5.6.1 behavior + JDK 17 runtime; identical assertion outcomes (12/12 PASS) on the same IUT against GeoRobotix. Audit trail at new repo `ops/server.md` "Docker smoke test" section. **Proposed amended REQ wording**: "...SHALL produce a TeamEngine 5.6.1 webapp on a JDK 17 base image" (preserves Sprint 1 semantics; acknowledges JDK 17 toolchain reality + the missing `:5.6.1` tag fact).
- REQ-ETS-TEAMENGINE-004: `docker-compose.yml` at repo root with `8081:8080` port mapping + 60s start-period healthcheck against `http://localhost:8080/teamengine` (commit `d831da1`). Canonical port 8081 committed; for dev environments where 8081 is in use (e.g. WSL2 running other containers), use `docker run -p 8082:8080` for testing. Dev-environment caveat documented at new repo `ops/server.md`.
- REQ-ETS-TEAMENGINE-005: `scripts/smoke-test.sh` end-to-end (commit `91308f7`). Bash, idempotent, exits 0 only on non-empty TestNG report + zero ERROR-level container logs during suite registration. End-to-end ~10s wall-clock (image cached); first run with TE image pull adds 5-10 min. Archived artifacts at `ops/test-results/s-ets-01-03-teamengine-{smoke,container}-2026-04-28.{xml,log}`.

**Sprint 1 contract success_criteria walk after S-ETS-01-03**: **9/9 PASS** (per Dana's S-ETS-01-03 generator report) — all 5 critical scenarios PASS (SCAFFOLD-BUILD-001, CORE-LANDING-001, CORE-CONFORMANCE-001, TEAMENGINE-LOAD-001, CORE-SMOKE-001), all 5 normal scenarios PASS (SCAFFOLD-LAYOUT-001, SCAFFOLD-REPRODUCIBLE-001, CORE-RESOURCE-SHAPE-001, CORE-LINKS-NORMATIVE-001, CORE-API-DEF-FALLBACK-001). **Sprint 1 functionally complete pending Quinn+Raze gate close on S-ETS-01-03.**

**Sub-deliverable 3 (cont.) — Common conformance class** (REQ-ETS-PART1-001, Implemented S-ETS-03-07, pending Quinn+Raze):
- REQ-ETS-PART1-001: `conformance.common.CommonTests` 4 @Test methods (Sprint-1-style minimal-then-expand per architect-handoff item 17 — distinct surface from Core to avoid duplication) all PASS against GeoRobotix at HEAD commit `c56df10` (new repo). Smoke total = 22/22 (12 Core + 6 SystemFeatures + 4 Common). 2 commits at new repo: `f384509` (CommonTests + testng.xml single-block consolidation extension), `c56df10` (live smoke evidence + nested-properties fix in S-ETS-03-05). Common is INDEPENDENT of Core (no dependsOnGroups declaration on the common group); runs in parallel. URI canonical form: `/req/json/{definition,content}` (Common Part 1 JSON encoding class), `/req/landing-page/conformance-success` (reused at Common-class layer to assert `ogcapi-common-1/1.0/conf/core` IS declared in `/conformance` body), `/req/collections/collections-list-success` (Common Part 2). All 4 .adoc URLs HTTP-200-verified at `raw.githubusercontent.com/opengeospatial/ogcapi-common/master/{19-072,collections}/requirements/`. ETSAssert helpers throughout; zero new bare-throw sites. GeoRobotix curl evidence: `/conformance` declares `ogcapi-common-1/1.0/conf/core` AND `ogcapi-common-2/0.0/conf/collections`; `/collections` returns 200 with `id="all_systems"` entry; `?f=json` returns JSON; `?f=html` returns 400 (acceptable per content-negotiation discipline — IUT explicitly handles parameter). Full curl evidence + URI mapping archived in `epics/stories/s-ets-03-07-common-conformance-class.md` Implementation Notes.

**Sub-deliverable 3 (cont.) — SystemFeatures conformance class** (REQ-ETS-PART1-002, Implemented S-ETS-02-06 + extended S-ETS-03-05, pending Quinn+Raze):
- REQ-ETS-PART1-002: `conformance.systemfeatures.SystemFeaturesTests` Sprint 2 4 @Test methods + Sprint 3 2 new @Test methods = 6 @Tests total (5/5 v1.0 SystemFeatures URI coverage achieved, was 3/5 at Sprint 2 close) all PASS against GeoRobotix at HEAD commit `c56df10` (new repo). Smoke total = 22/22 (12 Core + 6 SystemFeatures + 4 Common). Sprint 3 expansion commits: `bfa0e6b` (2 new @Tests for /req/system/collections + /req/system/location-time), `c56df10` (nested-properties fix for GeoJSON Feature shape — items have validTime under `properties` not top-level). New URI canonical forms: `/req/system/collections` (defense-in-depth: PASS via /collections OR landing-page rel=systems link — GeoRobotix has both), `/req/system/location-time` (MAY-priority: SKIP rather than FAIL if both validTime and geometry absent; PASS against GeoRobotix because items carry `properties.validTime`). Sprint 2 close artifact (16/16): 4 commits at new repo: `9847544` (SystemFeaturesTests + Core `groups = "core"` annotations), `d99665d`+`02796dd` (testng.xml dependency wiring; consolidated to single `<test>` block after empirical TestNG group-scope discovery), `3bd7fc6` (smoke artifact archive `ops/test-results/sprint-ets-02-systemfeatures-georobotix-smoke-2026-04-28.xml`). Reproducible build verified (sha256 `b51577cfb48535c6322cfc117514bd501e4d180b6c1435f8628b56d31a7a000a` byte-identical across two consecutive `mvn clean install -DskipTests`). All 4 SCENARIO-ETS-PART1-002-* satisfied: LANDING-001 + RESOURCE-SHAPE-001 + LINKS-NORMATIVE-001 PASS at runtime; DEPENDENCY-SKIP-001 PASS via TestNG XML output `depends-on-groups="core"` recorded on each of the 4 SystemFeatures @Tests (live break-Core verification deferred to Quinn/Raze gate). v1.0 GH#3 fix preserved at SystemFeatures level. URI form `/req/system/<X>` per OGC `.adoc` canonical (5 sub-requirement `.adoc` URLs HTTP-200-verified at `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/system/`). Adapted from design.md table — collection-level GeoRobotix `/systems` has only `items` (no `links`); per-item entries are minimal stubs without `links`; the load-bearing `links` array lives on `/systems/{id}` (single-item canonical endpoint); `systemItemHasIdTypeLinks` and `systemsCollectionLinksDiscipline` operate on the single-item endpoint per `/req/system/canonical-endpoint` + `/req/system/canonical-url`. Full curl evidence + URI-form pivot rationale archived in `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md` Implementation Notes.

**Sub-deliverable 8 — Web-App Freeze**: REQ-ETS-WEBAPP-FREEZE-001 ✅ closed (commit `44c279e`, tag `v1.0-frozen` at `ab53658`). README.adoc reverse cross-link in new repo closes ADR-005 "both directions" requirement.

### Deviations from Spec
- **Java root package, artifactId, ets-code, CTL filename, ets-common version, TeamEngine version**: spec text was reconciled to ADR-003/ADR-004/ADR-001 authority on 2026-04-28T14:42Z (commit `19003b1`). Spec now matches what Generator implemented.
- **Layout refactor closed in S-ETS-01-02**: archetype-flat layout retained through S-ETS-01-01; refactored to `conformance.core.*` + `listener.*` subpackages in S-ETS-01-02 commit `2dc4414`. Closes Quinn+Raze CONCERN-3 from S-ETS-01-01 gate close.
- **Kaizen openapi-parser declared but not consumed in Sprint 1**: per architect-handoff `surfaced_risks_pat_missed.OPENAPI-PARSER-NOT-USED-IN-SPRINT-1`, Sprint 1 Core uses everit-json-schema (transitive via ets-common:17) directly. Kaizen is on the dep list for Sprint 2+ when richer Part 1 classes need OpenAPI-driven validation.
- **GitHub Actions workflow staged at `ci/github-workflows-build.yml` not `.github/workflows/build.yml`**: gh OAuth token at commit time lacked `workflow` scope. One-line fix: `gh auth refresh -s workflow` then `git mv`. Tracked as Raze CONCERN-2 (S-ETS-01-01 + S-ETS-01-02).
- **Bare `throw new AssertionError(...)` instead of `EtsAssert` helper** (architect-handoff `must` constraint #9): 21 call sites across the 3 Core test classes use bare `throw new AssertionError(URI + " — message")` rather than an `EtsAssert.failWithUri(...)` helper. **Intent met** (every FAIL message includes the canonical `/req/*` URI as required); **form violated** (no helper used). The existing `ETSAssert.java` is XML/Schematron-only and Dana didn't extend it. Tracked as Quinn GAP-1 / Raze GAP-1 (both s02). **Sprint 2 cleanup**: extend `ETSAssert` with a `failWithUri(String message, String uri)` overload and refactor the 21 call sites mechanically.
- **URI form drift between v1.0 TS, Java port, and OGC canonical** (Quinn GAP-2 / Raze GAP-2 in s02 reports): Java cites `/req/core/root-success`; v1.0 TS uses `/req/ogcapi-common/landing-page`; OGC's normative .adoc canonical (verified by Raze upstream-fetch 2026-04-17) is `/req/landing-page/root-success`. Three different forms all citing the same correct normative text, but a CITE SC reviewer dereferencing the @Test description URIs against the OGC normative document will get a 404. **Source is upstream of S-ETS-01-02** (spec.md text already used the `/req/core/<X>-success` form when Dana implemented). **Sprint 2 cleanup**: amend spec.md + traceability.md + Java @Test descriptions to the OGC canonical `.adoc` URI form; ~30-40 sites across both repos.

### Deferred
- REQ-ETS-TEAMENGINE-002..005 (Dockerfile, docker-compose, smoke-test.sh, container-load verification) → S-ETS-01-03 (final Sprint 1 story).
- REQ-ETS-PART1-001..013 (per-class detail beyond Core) — drafted as placeholders; per-assertion FRs and SCENARIOs to be expanded in sprints 2..N.
- REQ-ETS-PART2-001..014 (Part 2) — explicitly deferred per user gate 2026-04-27 ("Part 1 first, Part 2 follows").
- REQ-ETS-FIXTURES-001..003 (spec-trap port from `csapi_compliance/tests/fixtures/spec-traps/`) → epic-ets-06 parallel sprint after Sprint 1 closes.
- REQ-ETS-CITE-001..003 — calendar-bound, not sprint-bound. Beta milestone gates these.
- REQ-ETS-SYNC-001 — CI script work, expected after Part 1 is feature-complete enough to make the diff meaningful.
- HTTP request/response capture (full REST Assured logging-filter pattern) → Sprint 2.
- Auth credential masking + `logback.xml` (architect-handoff `should` #3 — never log Authorization/X-API-Key) → Sprint 2 (no auth path exercised in Sprint 1; GeoRobotix is open).
- JaCoCo ≥80% coverage instrumentation → Sprint 2.

### Gate verdicts (audit trail)
- **Gate 3.5 (Quinn / Evaluator) for S-ETS-01-01**: APPROVE_WITH_GAPS confidence 0.88. Report at `.harness/evaluations/sprint-ets-01-evaluator.yaml`. 3 gaps + 4 concerns — all gaps closed same-turn 2026-04-28T16:30Z.
- **Gate 4 (Raze / Adversarial) for S-ETS-01-01**: GAPS_FOUND confidence 0.84. Report at `.harness/evaluations/sprint-ets-01-adversarial.yaml`. 3 gaps + 3 concerns — same 3 gaps Quinn caught (cross-corroborating). All closed same-turn.
- **Gate 3.5 (Quinn / Evaluator) for S-ETS-01-02**: APPROVE_WITH_GAPS confidence 0.85. Report at `.harness/evaluations/sprint-ets-01-evaluator-s02.yaml`. 3 gaps + 4 concerns. GAP-3 (spec.md reconcile pending) closed by this commit; GAP-1 (EtsAssert) + GAP-2 (URI form drift) deferred to Sprint 2 cleanup with explicit notes above.
- **Gate 4 (Raze / Adversarial) for S-ETS-01-02**: GAPS_FOUND confidence 0.82. Report at `.harness/evaluations/sprint-ets-01-adversarial-s02.yaml`. 3 gaps + 3 concerns — same 3 gaps Quinn caught (cross-corroborating, 2nd consecutive sprint). GAP-3 (Common Part 2 → Part 1 URI typo in `ResourceShapeTests`) closed by new repo commit `1fdfe07`. CONCERN-1 (Dana's reported sha256 `c4a80294...` was at HEAD `b249aa1`; canonical Sprint-1-close hash at `ea2c91f` is `b1ffdc8eee...` per Raze independent verification — buildnumber-maven-plugin embeds commit SHA in manifest, so per-commit hash variance is expected metadata-only) — narrative clarified in ops/status.md and ops/changelog.md this turn. CONCERN-3 (logback.xml + CredentialMaskingFilter) Sprint 2 scope.
