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
- **Status**: SPECIFIED (Sprint 3 target via S-ETS-03-07)
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/common/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical `.adoc` requirement URI form. Generator MUST verify the canonical form via OGC `.adoc` source HTTP-200 fetch BEFORE writing assertions (continuing the S-ETS-02-03 / S-ETS-02-06 URI-canonicalization discipline; the form may be `/req/common/<X>` or may follow Common Part 1's existing `/req/landing-page/<X>` / `/req/oas30/<X>` / `/req/json/<X>` etc subdirectory pattern depending on what the OGC 19-072 + 23-001 Annex A actually specify). Expected sub-requirements: (a) Common landing-page link discipline beyond Core's subset (e.g. `rel=conformance` mandatory; `rel=data` or `rel=collections` if collections endpoint exists); (b) Common conformance enumeration (`conformsTo` includes Common's classes); (c) `/collections` endpoint shape per `/req/common/collections` (SKIP-with-reason if IUT returns 404 — GeoRobotix may not implement); (d) content-negotiation discipline via `f=json` / `f=html` query parameter per `/req/common/content-negotiation`. The Common class lives at `org.opengis.cite.ogcapiconnectedsystems10.conformance.common.CommonTests` per design.md placeholder. Common is INDEPENDENT of Core — same DAG-root level — and runs in parallel (no `dependsOnGroups` declaration on the `common` group). Coverage scope at Sprint 3 close: Sprint-1-style minimal (4 @Tests covering 4 highest-priority assertions per Architect ratification — see design.md Sprint 3 ratifications); Sprint 4+ expansion adds 1-3 remaining ATS items + parameter validation + paging discipline.
- **Rationale**: Common is foundational — every remaining 11 Part 1 class (Subsystems, Procedures, Sampling, Properties, Deployments, AdvancedFiltering, CRUD, Update, Subdeployments, GeoJSON, SensorML) inherits from Common's base assertions. Highest dependency-leverage of any single class; landing Common in Sprint 3 unlocks Sprint 4+ remaining classes cleanly.
- **Maps to**: PRD FR-ETS-11.

#### REQ-ETS-PART1-002: SystemFeatures Conformance Class (Sprint 2 target — extended Sprint 3)
- **Priority**: MUST
- **Status**: IMPLEMENTED (Sprint 2 close, S-ETS-02-06, Quinn 0.96 + Raze 0.92; Sprint 3 extends with /req/system/collections + /req/system/location-time via S-ETS-03-05)
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/system/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC canonical `.adoc` requirement URI form `/req/system/<assertion>` (e.g. `OGC-23-001 .../req/system/resources-endpoint`). **URI form reconciled 2026-04-28T23:35Z**: design.md text and Sprint 2 contract used `/conf/system-features/` and `/req/system-features/<X>`; OGC `.adoc` canonical source uses `/conf/system` (singular, no `-features` suffix) and `/req/system/<X>`. The 5 sub-requirement `.adoc` files at `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/system/` (HTTP-200-verified by Generator at S-ETS-02-06): `req_resources_endpoint.adoc`, `req_canonical_url.adoc`, `req_canonical_endpoint.adoc`, `req_collections.adoc`, `req_location_time.adoc`. The IUT (GeoRobotix) also declares `/conf/system` in `/conformance` — same form. v1.0 registry `csapi_compliance/src/engine/registry/system-features.ts` uses `/req/system/<X>`. Same drift class as S-ETS-02-03's `/req/core/*` → `/req/landing-page/*` correction. The class lives at `org.opengis.cite.ogcapiconnectedsystems10.conformance.systemfeatures.SystemFeaturesTests` per design.md placeholder. Required behaviors: (a) `GET /systems` returns HTTP 200 with JSON body containing a non-empty `items` array (per OGC API – Features clause 7.15.2-7.15.8 inherited via `/req/system/resources-endpoint`); (b) `GET /systems/{id}` returns the canonical single-item shape — `id` (string), `type` (string), `links` (array per REQ-ETS-CORE-004 base shape) — per `/req/system/canonical-endpoint`; (c) `/systems/{id}` `links` array contains `rel="canonical"` per `/req/system/canonical-url` — absence of `rel="self"` is NOT FAIL (carries v1.0 GH#3 fix policy from Core landing page; v1.0 audit at `system-features.ts:36-44`); (d) the SystemFeatures class declares TestNG suite-level dependency on Core via group dependency wiring (`<dependencies><group name="systemfeatures" depends-on="core"/>`) so SystemFeatures @Tests SKIP gracefully if Core FAILs. Coverage scope: Sprint-1-style minimal (4 @Tests) at Sprint 2 close per Architect ratification (design.md §"SystemFeatures conformance class scope"); Sprint 3 expansion adds `/req/system/collections` + `/req/system/location-time` + pagination/filter coverage.
- **Rationale**: SystemFeatures is the foundational CS API collection — every other CS API endpoint exposes `/systems` collections, so the patterns established here (collection shape, item shape, dependency-skip wiring) propagate to Subsystems, Procedures, Sampling, Properties, Deployments. GeoRobotix serves a non-empty `/systems` collection (36 items confirmed at S-ETS-02-06 curl-verification 2026-04-28T23:30Z, Implementation Notes archive in `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md`).
- **Maps to**: PRD FR-ETS-12.

#### REQ-ETS-PART1-003..013: Remaining Per-Class Conformance Suites
- **Priority**: MUST
- **Status**: PLACEHOLDER (per-class detail deferred to future sprint planning)
- **Description**: For each of the remaining 11 OGC 23-001 conformance classes (003=`subsystems`, 004=`deployment-features`, 005=`subdeployments`, 006=`procedure-features`, 007=`sampling-features`, 008=`property-definitions`, 009=`advanced-filtering`, 010=`create-replace-delete`, 011=`update`, 012=`geojson`, 013=`sensorml`), the ETS SHALL provide a TestNG suite class structurally equivalent to Core (REQ-ETS-CORE-001..004) and SystemFeatures (REQ-ETS-PART1-002): one `@Test` per ATS assertion, `description` attribute carries the OGC canonical `.adoc` requirement URI form, suite-level dependency declared via TestNG `dependsOnGroups` if a prerequisite class fails. (verified against `docs.ogc.org/is/23-001/23-001.html` Annex A on 2026-04-27).
- **Rationale**: PRD SC-2 requires Part 1 coverage. Placeholder REQ shape lets the planner enumerate the certification surface without front-loading per-assertion detail.
- **Maps to**: PRD FR-ETS-13..23.

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
- **Status**: SPECIFIED (Sprint 3 target via S-ETS-03-04; Sprint 3 stretch goal)
- **Description**: The multi-stage Dockerfile runtime image SHALL be optimized to ≤ 550 MB (Sprint 3 stretch — more permissive than ADR-009 §"Image size target" 450MB soft target). Recommended approach (per Quinn cleanup GAP-1 Option A): TE common-libs ↔ deps-closure dedupe — exclude jars in `target/lib-runtime/` that overlap with `/usr/local/tomcat/lib` (from `teamengine-web-common-libs.zip`); estimated 200-300MB savings → ~363-463MB runtime image. Architect ratifies which approach (a / b / c per Sprint 3 contract `deferred_to_architect`). PARTIAL with rationale acceptable if Generator hits 550-700MB; carryover to Sprint 4 with explicit deferral if >700MB. Smoke 12+6+N PASS preserved post-optimization.
- **Maps to**: NFR-ETS-11 (deployment topology), ADR-009.

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

**Sub-deliverable 3 (cont.) — SystemFeatures conformance class** (REQ-ETS-PART1-002, Implemented S-ETS-02-06, pending Quinn+Raze):
- REQ-ETS-PART1-002: `conformance.systemfeatures.SystemFeaturesTests` 4 @Test methods (Sprint-1-style minimal-then-expand per design.md ratification) all PASS against GeoRobotix at HEAD commit `3bd7fc6` (new repo). Smoke total = 16/16 (12 Core preserved + 4 SystemFeatures). 4 commits at new repo: `9847544` (SystemFeaturesTests + Core `groups = "core"` annotations), `d99665d`+`02796dd` (testng.xml dependency wiring; consolidated to single `<test>` block after empirical TestNG group-scope discovery), `3bd7fc6` (smoke artifact archive `ops/test-results/sprint-ets-02-systemfeatures-georobotix-smoke-2026-04-28.xml`). Reproducible build verified (sha256 `b51577cfb48535c6322cfc117514bd501e4d180b6c1435f8628b56d31a7a000a` byte-identical across two consecutive `mvn clean install -DskipTests`). All 4 SCENARIO-ETS-PART1-002-* satisfied: LANDING-001 + RESOURCE-SHAPE-001 + LINKS-NORMATIVE-001 PASS at runtime; DEPENDENCY-SKIP-001 PASS via TestNG XML output `depends-on-groups="core"` recorded on each of the 4 SystemFeatures @Tests (live break-Core verification deferred to Quinn/Raze gate). v1.0 GH#3 fix preserved at SystemFeatures level. URI form `/req/system/<X>` per OGC `.adoc` canonical (5 sub-requirement `.adoc` URLs HTTP-200-verified at `raw.githubusercontent.com/opengeospatial/ogcapi-connected-systems/master/api/part1/standard/requirements/system/`). Adapted from design.md table — collection-level GeoRobotix `/systems` has only `items` (no `links`); per-item entries are minimal stubs without `links`; the load-bearing `links` array lives on `/systems/{id}` (single-item canonical endpoint); `systemItemHasIdTypeLinks` and `systemsCollectionLinksDiscipline` operate on the single-item endpoint per `/req/system/canonical-endpoint` + `/req/system/canonical-url`. Full curl evidence + URI-form pivot rationale archived in `epics/stories/s-ets-02-06-systemfeatures-conformance-class.md` Implementation Notes.

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
