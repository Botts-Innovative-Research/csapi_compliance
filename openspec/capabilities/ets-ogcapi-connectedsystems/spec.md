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
- **Description**: For each assertion in OGC 23-001 Annex A `/conf/core/`, the ETS SHALL provide at least one TestNG `@Test` method whose `description` attribute starts with the OGC requirement URI (e.g. `OGC-23-001 /req/core/landing-page`). Each `@Test` SHALL produce exactly one of: PASS, FAIL (with structured message), SKIP (with reason).
- **Rationale**: Spec traceability; CITE reviewers map ATS to ETS by URI.
- **Maps to**: PRD FR-ETS-10, SC-2, SC-8.

#### REQ-ETS-CORE-002: Landing-Page Assertions
- **Priority**: MUST
- **Status**: SPECIFIED
- **Description**: The Core suite SHALL assert: (a) `GET /` returns HTTP 200 with `Content-Type` containing `application/json`; (b) the body has `title`, `description`, and `links` (array); (c) `links` contains entries with `rel=conformance` AND (`rel=service-desc` OR `rel=service-doc`) — citation: OGC API Common Part 1 (19-072) `/req/core/root-success`. Absence of BOTH `service-desc` and `service-doc` is the FAIL condition; absence of only one PASSES via fallback. The `rel=self` relation is example-only and SHALL NOT be asserted as mandatory (this preserves the v1.0 GH#3 fix).
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

### Sub-deliverable 3 — Other Part 1 Conformance Classes (placeholders)

> Detailed REQ-* per-class will be drafted in a later sprint cluster (post-Sprint 1).
> The 13 placeholder REQs below establish the certification surface and traceability chain.

#### REQ-ETS-PART1-001..013: Per-Class Conformance Suites
- **Priority**: MUST
- **Status**: PLACEHOLDER (per-class detail deferred to future sprint planning)
- **Description**: For each of the 13 OGC 23-001 conformance classes beyond Core, the ETS SHALL provide a TestNG suite class structurally equivalent to the Core suite (REQ-ETS-CORE-001..004): one `@Test` per ATS assertion, `description` attribute carries the OGC requirement URI, suite-level dependency declared via TestNG `dependsOnGroups` if a prerequisite class fails. The 13 classes are: `common`, `system-features`, `subsystems`, `deployment-features`, `subdeployments`, `procedure-features`, `sampling-features`, `property-definitions`, `advanced-filtering`, `create-replace-delete`, `update`, `geojson`, `sensorml` (verified against `docs.ogc.org/is/23-001/23-001.html` Annex A on 2026-04-27).
- **Rationale**: PRD SC-2 requires Part 1 coverage. Placeholder REQ shape lets the planner enumerate the certification surface without front-loading per-assertion detail.
- **Maps to**: PRD FR-ETS-11..23.

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
- **Description**: A `Dockerfile` SHALL extend `ogccite/teamengine-production:5.6.1` and copy the built ETS jar into `/usr/local/tomcat/webapps/teamengine/WEB-INF/lib/`. The image SHALL build via `docker build -t ets-ogcapi-connectedsystems10 .` from a clean checkout with no additional host dependencies.
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
**THEN** the `@Test` for `OGC-23-001 /req/core/landing-page` PASSES
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

## Implementation Status (2026-04-27)

**Status**: Not Started — Sprint 1 contract pending (`.harness/contracts/sprint-ets-01.yaml`).

### What's Built
- (Nothing yet.) v1.0 web-app capabilities are frozen at HEAD `ab53658`.

### Deviations from Spec
- (None yet.)

### Deferred
- REQ-ETS-PART1-001..013 (per-class detail) — drafted as placeholders; per-assertion FRs and SCENARIOs to be expanded in sprints 2..N (one or two conformance classes per sprint after Sprint 1 lands the scaffold + Core).
- REQ-ETS-PART2-001..014 (Part 2) — explicitly deferred per user gate 2026-04-27 ("Part 1 first, Part 2 follows").
- REQ-ETS-CITE-001..003 — calendar-bound, not sprint-bound. Beta milestone gates these.
- REQ-ETS-SYNC-001 — CI script work, expected after Part 1 is feature-complete enough to make the diff meaningful.
