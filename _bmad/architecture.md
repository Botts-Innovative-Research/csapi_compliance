# Architecture — OGC API Connected Systems ETS (TeamEngine)

> Version: 2.0 | Status: Living Document | Last reconciled: 2026-04-27
> **Supersedes v1.0** (preserved verbatim at `_bmad/architecture-v1-frozen.md`).
> v1.0 was web-app-shaped (Next.js + Node + browser UI). v2.0 reflects the user pivot
> 2026-04-27 to a Java/TestNG Executable Test Suite for OGC TeamEngine.
>
> **Authority**: this document binds the Generator (Dana). Where the PRD or capability spec
> conflicts with an ADR or with this file's section, the ADR is authoritative for the decision
> in question and Sam (orchestrator) reconciles back to the PRD/spec at the next planning cycle.

---

## 1. Overview

The deliverable is **`ets-ogcapi-connectedsystems10`** — a Java 17 / Maven 3.9 / TestNG / REST Assured Executable Test Suite that registers with OGC TeamEngine 5.6.x (and forward-compatibly with 6.0.0) via the `com.occamlab.te.spi.jaxrs.TestSuiteController` SPI. An OGC API – Connected Systems server implementer points TeamEngine at their landing page; TeamEngine invokes our suite, our suite issues HTTP requests against the IUT via REST Assured, validates responses against the bundled OGC JSON Schemas, and produces a TestNG XML report TeamEngine renders for the user. Coverage targets: OGC 23-001 Part 1 (14 conformance classes, Sprint 1 lands Core; sprints 2-N land the other 13) and OGC 23-002 Part 2 (14 conformance classes, deferred per user gate).

This is **not a web application**. It has no browser UI, no REST endpoints we author, no session storage we own. TeamEngine owns the user-facing surface; we provide a jar that TeamEngine loads.

## 2. Deployment topology

The same jar runs in three contexts:

```
+-----------------------------+   +--------------------------------+   +---------------------------------+
|  Developer laptop           |   |  Our CI (GitHub Actions)        |   |  OGC validator (production)     |
|                             |   |                                  |   |                                 |
|  mvn clean install          |   |  - mvn -B verify                 |   |  cite.opengeospatial.org/       |
|  mvn -P run-test (TestNG    |   |  - reproducible-build double-    |   |    teamengine/                  |
|    direct against IUT)      |   |    diff job                      |   |  Runs ets-common parent's       |
|  docker compose up          |   |  - smoke-test.sh inside Docker   |   |    teamengine-production:5.6.1  |
|    (spins TeamEngine + jar) |   |    against api.georobotix.io     |   |  Loads ETS via Maven Central     |
|                             |   |  - artifact: TestNG report XML   |   |    artifact (post-beta)         |
+-----------------------------+   +--------------------------------+   +---------------------------------+
       |                                  |                                       |
       |                                  |                                       |
       +----------- same target/ets-ogcapi-connectedsystems10-<version>.jar ------+
```

**Local (developer)**:
- `mvn clean install` produces `target/ets-ogcapi-connectedsystems10-<version>.jar` and `target/ets-ogcapi-connectedsystems10-<version>-aio.jar` (the all-in-one assembly).
- `docker compose up` (Sprint 1 deliverable, REQ-ETS-TEAMENGINE-004) launches `ogccite/teamengine-production:5.6.1` with our jar mounted into `/usr/local/tomcat/webapps/teamengine/WEB-INF/lib/`. TeamEngine discovers our suite via `META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` (ADR-001).
- Developer browses `http://localhost:8081/teamengine/` and runs the Connected Systems suite from the CTL UI.

**Our CI (GitHub Actions)**:
- Build job: `mvn -B clean verify` on JDK 17. Matrix: ubuntu-latest, macos-latest, windows-latest (NFR-ETS-06).
- Reproducible-build job: builds the same commit twice, diffs `target/*.jar` excluding META-INF timestamps. Empty diff is the pass condition (NFR-ETS-01, SCENARIO-ETS-SCAFFOLD-REPRODUCIBLE-001).
- Smoke-test job: `scripts/smoke-test.sh` builds the Docker image, launches TeamEngine + ETS, runs the Core suite against `https://api.georobotix.io/ogc/t18/api`, archives the TestNG XML report (SCENARIO-ETS-CORE-SMOKE-001).
- Jenkinsfile is checked in but not wired to a live Jenkins (planner-handoff resolved-question CI-CD-TOPOLOGY).

**OGC validator (production)** — post-beta milestone only:
- `cite.opengeospatial.org/teamengine/` runs the OGC's `teamengine-production` Docker image. Once we publish to Maven Central (REQ-ETS-CITE-001), the OGC's `teamengine-production/pom.xml` adds `<ets-ogcapi-connectedsystems10.version>` and our jar is included in the next image rebuild.
- We do not control the cadence of the OGC's image rebuilds; that is governance velocity (Mary's `TIMELINE-DOMINATED-BY-GOVERNANCE` flag).

## 3. Component model

```
+---------------------------------------------------------------------------------+
|  TeamEngine 5.6.x (Tomcat web app, Java 11+)                                    |
|                                                                                 |
|  +-----------------------------+      +-------------------------------+         |
|  | CTL UI (Saxon XSLT)         |----->| TestSuiteController SPI       |         |
|  | renders form from           |      | (Java ServiceLoader scan of   |         |
|  | ogcapi-connectedsystems10-  |      |  META-INF/services/)          |         |
|  | suite.ctl                   |      +---------------+---------------+         |
|  +-----------------------------+                      |                          |
|                                                       v                          |
+-------------------------------------------------------|--------------------------+
                                                        |
                                                        | classloads
                                                        v
+---------------------------------------------------------------------------------+
|  ets-ogcapi-connectedsystems10.jar                                              |
|                                                                                 |
|  +------------------------------------------------------------+                 |
|  |  org.opengis.cite.ogcapiconnectedsystems10.TestNGController|                 |
|  |  (impl com.occamlab.te.spi.jaxrs.TestSuiteController)      |                 |
|  |  - getCode(), getVersion(), getTitle()                     |                 |
|  |  - doTestRun(Document) → delegates to TestNGExecutor       |                 |
|  +-----------+--------------------------------+---------------+                 |
|              |                                |                                 |
|              v                                v                                 |
|  +-----------+-------+        +---------------+-----------------+               |
|  | testng.xml        |        | ets.properties (ets-code, etc.)|               |
|  | (suite descriptor;|        +---------------------------------+               |
|  | tests + listeners)|                                                          |
|  +-----------+-------+                                                          |
|              |                                                                  |
|              v                                                                  |
|  +-----------+-----------------------------------------------+                  |
|  |  conformance.core.* (TestNG @Test classes; Sprint 1)      |                  |
|  |  - LandingPageTests       (REQ-ETS-CORE-002)              |                  |
|  |  - ConformanceTests       (REQ-ETS-CORE-003)              |                  |
|  |  - ResourceShapeTests     (REQ-ETS-CORE-004)              |                  |
|  |                                                            |                  |
|  |  conformance.<class>.* (sprints 2..14; placeholders)      |                  |
|  |  - SystemFeaturesTests, SubsystemsTests, ... (one per     |                  |
|  |    Part 1 conformance class beyond Core)                  |                  |
|  +--------------------------+--------------------------------+                  |
|                             |                                                   |
|                             v                                                   |
|  +-------------+   +--------+--------+   +------------------+   +------------+ |
|  | RestAssured |   | OpenAPI/Schema  |   | SuiteFixture     |   | Listener   | |
|  | (HTTP DSL,  |   | Validator       |   | Listener         |   | + report   | |
|  | response    |   | (Kaizen openapi-|   | (@BeforeSuite —  |   | hooks      | |
|  | capture)    |   | parser + JSON   |   | landing/conform; |   |            | |
|  |             |   | Schema)         |   | shares state via |   |            | |
|  |             |   |                 |   | ITestContext)    |   |            | |
|  +------+------+   +--------+--------+   +--------+---------+   +------------+ |
|         |                   |                     |                              |
|         |                   v                     v                              |
|         |     +-------------+--------+    +-------+----------+                  |
|         |     | src/main/resources/  |    | EtsAssert        |                  |
|         |     |  schemas/ (126 OGC   |    | (fluent          |                  |
|         |     |  JSON Schemas        |    | assertion utils, |                  |
|         |     |  copied from         |    | structured       |                  |
|         |     |  csapi_compliance)   |    | failure msgs     |                  |
|         |     +----------------------+    | with /req/*      |                  |
|         |                                 | URIs)            |                  |
|         |                                 +------------------+                  |
|         v                                                                       |
+---------|---------------------------------------------------------------------+
          |
          | HTTP/HTTPS (auth headers per user input)
          v
   +-------------------------+
   | IUT — CS API server     |
   | e.g. api.georobotix.io  |
   +-------------------------+
```

### Component responsibilities

| Component | FQCN / location | Responsibility |
|---|---|---|
| **TestNGController** | `org.opengis.cite.ogcapiconnectedsystems10.TestNGController` | TeamEngine SPI entry point. Implements `TestSuiteController`. Delegates execution to `TestNGExecutor` (from `teamengine-spi`). 1:1 port of `ets-ogcapi-features10`'s controller (ADR-001). |
| **testng.xml** | `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/testng.xml` | TestNG suite descriptor. Declares `<test name="Core">` with `<package>` entries for `conformance.core.*` plus listener block. Sprint 1 ships Core only; `<test>` blocks for sprints 2-N. |
| **SuitePreconditions** | `org.opengis.cite.ogcapiconnectedsystems10.conformance.SuitePreconditions` | TestNG class run first via `<classes>` in testng.xml. Validates `iut` parameter is present and reachable. Pattern from features10. |
| **SuiteFixtureListener** | `org.opengis.cite.ogcapiconnectedsystems10.listener.SuiteFixtureListener` | Implements `ISuiteListener.onStart`. Performs landing-page fetch + `/conformance` fetch, stashes results into `ISuite.getAttribute()` so all suites can read declared conformance classes. Equivalent of v1.0's two-step discovery flow. |
| **TestRunListener / TestFailureListener / LoggingTestListener** | `org.opengis.cite.ogcapiconnectedsystems10.listener.*` | Standard ets-common pattern; mirror features10 listener set verbatim in Sprint 1 (minimal logging) and refine in Sprint 2. |
| **CoreTests (multiple classes)** | `conformance.core.LandingPageTests`, `ConformanceTests`, `ResourceShapeTests` | Sprint 1 P0. Each `@Test` method's `description` attribute starts with the OGC requirement URI (e.g. `OGC-23-001 /req/core/landing-page`) per REQ-ETS-CORE-001. |
| **OpenApi3Loader** | `conformance.openapi3.OpenApi3Loader` | Sprint 2+ helper that loads the OGC OpenAPI YAML via Kaizen `openapi-parser`. Sprint 1's Core class does not need this — Core asserts response shape via `everit-json-schema` (transitive from ets-common) against the bundled JSON Schemas at `src/main/resources/schemas/connected-systems-1/landing-page.json` etc. |
| **EtsAssert** | `org.opengis.cite.ogcapiconnectedsystems10.util.EtsAssert` | Fluent assertion utilities. Wraps Hamcrest matchers + structured failure messages that include the OGC `/req/*` URI. Mirrors `org.opengis.cite.ogcapifeatures10.EtsAssert` pattern. |
| **Schemas (resource bundle)** | `src/main/resources/schemas/{connected-systems-1, connected-systems-2, connected-systems-shared, external, fallback}/*.json` | 126 JSON Schema files copied verbatim from `csapi_compliance/schemas/` (ADR-002). Loaded at @BeforeSuite into a Kaizen schema registry; used by Schema Validator at @Test time. |
| **CTL wrapper** | `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl` | XSLT 2.0 CTL package that exposes the suite to TeamEngine's CTL UI. Calls `tng:new($outputDir)` then `tng:doTestRun(...)`. Form fields: `iut-url` (required), `auth-type`, `auth-credential`. |
| **SPI registration file** | `src/main/resources/META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` | Single line: `org.opengis.cite.ogcapiconnectedsystems10.TestNGController`. Discovered by TeamEngine's classloader scan (ADR-001). |
| **ets.properties** | `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/ets.properties` | Maven-substituted properties: `ets-title`, `ets-version`, `ets-code` (`ogcapi-connectedsystems10`). |

## 4. Build & dependencies

Per ADR-004:

- **JDK**: 17 (mandatory, build fails on older)
- **Maven**: 3.9+ (enforced by maven-enforcer)
- **Parent POM**: `org.opengis.cite:ets-common:17` (release tag — NOT 18-SNAPSHOT)
  - Pulls TeamEngine SPI 5.6.x artifacts via `<dependencyManagement>`
  - Pulls Jersey 3.1.8, Jackson 2.18.0, JTS 1.19, proj4j 1.1.3, etc.
- **Direct dependencies** (no `<version>` — versions inherited from ets-common):
  - `org.opengis.cite.teamengine:teamengine-spi`
  - `org.testng:testng`
  - `io.rest-assured:rest-assured`
  - `com.reprezen.kaizen:openapi-parser`
  - `org.locationtech.jts:jts-core`, `org.locationtech.proj4j:proj4j`, `org.locationtech.jts.io:jts-io-common`
  - `org.slf4j:slf4j-api`, `ch.qos.logback:logback-classic` (see §6 Logging)
- **Build plugins**: maven-compiler-plugin 3.13.0, maven-surefire-plugin 3.5.x, maven-assembly-plugin (AIO jar with `mainClass=...TestNGController`), maven-jar-plugin
- **Reproducibility**: `<project.build.outputTimestamp>2026-04-27T00:00:00Z</project.build.outputTimestamp>` (ADR-004 group C-5)

`mvn clean install` produces:
- `target/ets-ogcapi-connectedsystems10-<version>.jar` (thin)
- `target/ets-ogcapi-connectedsystems10-<version>-aio.jar` (all-in-one with deps; for CLI use)
- `target/ets-ogcapi-connectedsystems10-<version>-sources.jar` (per OGC convention)

## 5. Test runtime model

A test execution flows through these stages inside TeamEngine:

1. **Suite registration** (TeamEngine startup, ~30 sec — NFR-ETS-04). Tomcat starts → web-app classloader scans `WEB-INF/lib/*.jar` for `META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` files → instantiates each FQCN found. `TestNGController` constructor loads `ets.properties` and locates `testng.xml` on the classpath. `getCode()` returns `ogcapi-connectedsystems10`; TeamEngine renders the suite in the CTL list.
2. **CTL form** (user flow). User clicks "Connected Systems API 1.0" → CTL Saxon engine renders the form from `ogcapi-connectedsystems10-suite.ctl` → user enters `iut-url` (CS API landing page) and optional auth → form POST → CTL function calls `tng:new($outputDir)` (constructs `TestNGController`) and `tng:doTestRun($controller, $testRunArgs)`.
3. **TestNG launch**. `TestNGController.doTestRun(Document testRunArgs)` validates the args, builds a `Map<String,String>` of suite parameters (the `iut` URL is mandatory), and invokes `TestNGExecutor.execute(testRunArgs)`. `TestNGExecutor` (from teamengine-spi) wires up TestNG: parses `testng.xml`, registers listeners, runs.
4. **@BeforeSuite phase**. `SuiteFixtureListener.onStart(ISuite)` reads the `iut` parameter, fetches the landing page, fetches `/conformance`, stashes both into `ISuite.setAttribute(...)`. `SuitePreconditions` (a TestNG class run first via `<classes>` block in testng.xml) re-validates these are present.
5. **Per-suite execution** (Sprint 1 = Core only). TestNG runs `<test name="Core">` packages in declared order. For each `@Test` method:
   - REST Assured constructs the HTTP request from the IUT base URL + relative path
   - Auth header (if configured) is applied
   - Request is sent; full request/response captured by REST Assured's `RequestLoggingFilter` and `ResponseLoggingFilter` (these are written into the TestNG report attachment per FR-ETS-25)
   - Response body validated against the relevant JSON Schema via Kaizen / everit-json-schema
   - `EtsAssert.assertXxx(...)` produces structured failure messages that include the OGC `/req/*` URI in case of FAIL
6. **Dependency-skip semantics** (FR-ETS-24, sprints 2+). If Core's `@Test` produces a FAIL, downstream conformance class suites that `dependsOnGroups("core")` (TestNG's native dependency mechanism) auto-skip with reason `dependency /conf/core not satisfied`. Sprint 1's Core suite is dependency-free.
7. **Report generation**. TestNG's `XmlReporter` writes `target/testng-results.xml`. TeamEngine's executor wraps this into the user-visible HTML report at `/teamengine/results/<run-id>/`.

### Concurrency model

Sprint 1 ships sequential test execution within Core (TestNG default — `parallel="false"`). Concurrency within a class can be enabled via `<test parallel="methods" thread-count="5">` in testng.xml in a future sprint. Across-class ordering uses TestNG `<test>` elements in declared order; cross-class dependency uses `dependsOnGroups`.

## 6. Quality, assertions, and logging

### Assertions

`EtsAssert` wraps Hamcrest matchers and produces failure messages that **always include**:
- The OGC requirement URI (e.g. `/req/core/landing-page`)
- The IUT base URL
- The HTTP request method + path
- A truncated response excerpt (≤500 chars)

Pattern (ports v1.0's `failureReason` discipline):
```
FAIL: /req/core/api-definition — IUT https://api.georobotix.io/ogc/t18/api landing-page
response had no `service-desc` AND no `service-doc` link relation. At least one is required
per OGC API Common Part 1 §7.4 (/req/core/api-definition). Excerpt: {"links":[{"rel":"self",...}]}.
```

### v1.0 fixes preserved (load-bearing)

Two assertion behaviors from v1.0 must port verbatim — the Generator must NOT regress them:

- **`rel=self` is example-only, not mandatory** (v1.0 GH#3 fix; SCENARIO-ETS-CORE-LINKS-NORMATIVE-001). The Core landing-page test must NOT fail when `self` is absent. Cite OGC API Common Part 1 — `self` appears as a sample value, not in a `/req/*` clause.
- **`service-desc` OR `service-doc` is the API-definition fallback** (v1.0 SCENARIO-API-DEF-FALLBACK-001; SCENARIO-ETS-CORE-API-DEF-FALLBACK-001). PASS when either is present; FAIL only when both are absent.

### Logging

- **slf4j-api** facade (per ADR-004 dep list).
- **logback-classic** binding (slf4j → SLF4J → logback). Pat's PRD NFR-ETS-10 calls for slf4j+logback; ets-common does not bind a backend, so we declare logback explicitly.
- Logback configured via `src/main/resources/logback.xml` to: emit JSON-structured logs (logback-jackson encoder), default level INFO, NEVER log Authorization/api-key headers (configurable maskList), append to STDOUT only (TeamEngine captures container logs).
- Credential masking: REST Assured logging filters configured to redact `Authorization`, `X-API-Key`, and any header in `auth-mask-headers` to `***MASKED***`. Pattern equivalent to v1.0's `CredentialMasker`.

`ets-common`'s default is `java.util.logging` via `TestSuiteLogger`. We add slf4j+logback on top because: (a) PRD NFR-ETS-10 specifies it, (b) it gives structured logs that TeamEngine's container-orchestration consumers can parse, (c) RestAssured's logging is already slf4j-aware. **No conflict** with ets-common — both can coexist; `TestSuiteLogger` continues to be used by ets-common-supplied utilities, our code uses slf4j.

## 7. Spec-trap fixtures port plan (high-level)

The asymmetric `featureType`/`itemType` corpus from `csapi_compliance/tests/fixtures/spec-traps/` (~30-50 cases) ports as follows. Generator owns the detail; Architect sets the contract:

- **Location**: `src/test/resources/fixtures/spec-traps/<group-name>/*.json` (mirrors PRD §4 resolution; the v1.0 layout structure is preserved).
- **Loading**: a `org.opengis.cite.ogcapiconnectedsystems10.fixtures.SpecTrapFixtures` Java class reads the JSON files at @DataProvider time. Jackson deserializes them into typed POJOs that TestNG passes to `@Test(dataProvider=...)` methods.
- **Case ID retention**: each fixture file has a top-level `caseId` field; the Java loader exposes it; failed @Test failure messages include `caseId` so a CITE reviewer can trace the fixture back to its v1.0 origin.
- **Audit script**: `scripts/audit-fixture-port.sh` (REQ-ETS-FIXTURES-003) compares case-ID lists in TS source (`csapi_compliance/tests/fixtures/spec-traps/`) vs Java source (`src/test/resources/fixtures/spec-traps/`) and fails CI on unexplained drops.

This is **not a Sprint 1 deliverable** (out_of_scope per Pat's contract). Sprint 1 must NOT delete the requirement; it must reference the corpus existence in `epic-ets-06-fixture-port.md`.

## 8. Cross-repo integration

Per ADR-005:

- The frozen v1.0 repo (`csapi_compliance`) and the new ETS repo (`ets-ogcapi-connectedsystems10`) are **siblings**, not parent/child.
- No git submodule, no symlink, no shared package. Each is independently buildable.
- `csapi_compliance` README links to the new ETS as the certification deliverable; new ETS `README.adoc` links back to v1.0 as the dev pre-flight tool.
- `csapi_compliance@ab53658` is tagged `v1.0-frozen`. Schemas were copied verbatim into the new ETS at that point (ADR-002).
- URI-coverage diff (REQ-ETS-SYNC-001) is a CI script in the new ETS that clones `csapi_compliance@v1.0-frozen` into the workspace; deferred to post–Sprint-1.

## 9. CITE submission pipeline

This is governance, not code, but the architecture must acknowledge the calendar (Mary's `TIMELINE-DOMINATED-BY-GOVERNANCE`):

```
Sprint 1: scaffold + Core green vs GeoRobotix         [code: 1-2 sprints]
Sprints 2-7: remaining Part 1 conformance classes     [code: 6-12 weeks]
Sprint 8+: Part 2 conformance classes                 [code: 6-12 weeks]
Beta gate: REQ-ETS-CITE-001..003                       [governance: weeks]
  - Maven Central publish via OSSRH staging
  - Outreach to OpenSensorHub + connected-systems-go
  - File CITE SC ticket
6-12 months in beta: gather 3 passing IUTs            [governance: quarters]
CITE SC review → TC vote → official release           [governance: months]
```

Total calendar from Sprint 1 to official release: **9-21 months**. Code-complete is a fraction of that.

## 10. Constraints from OGC

The Generator (Dana) MUST respect these or CITE SC review will reject the ETS:

1. **No non-Java test runtime**. No shell-out to Node.js, Python, Go. Tests run in the JVM.
2. **Use ets-common's idioms**. `EtsAssert`, listener naming, package layout, ets.properties, testng.xml location — all per the features10 reference. Innovation is permitted in the test logic, not in the framework wiring.
3. **No new transitive dep without an ADR**. Adding a dependency that ets-common doesn't already manage requires an ADR justifying it (RAML in ADR-004 group B).
4. **Maven Central publish is a release-only action**. SNAPSHOTs go to OSSRH staging; never promote SNAPSHOTs to Maven Central (REQ-ETS-CITE-001).
5. **Reproducible builds**. `<project.build.outputTimestamp>` is set; CI verifies double-build byte-identical jars.
6. **README is .adoc, not .md**. AsciiDoc per OGC convention. Top-level files: `README.adoc`, `LICENSE.txt`, `pom.xml`, `Jenkinsfile` (stub), `Dockerfile`, `docker-compose.yml`.
7. **Respect the v1.0 GH#3 fix and API-def fallback**. See §6 Quality. Regressing these is a release-blocker.

## 11. Open architectural risks (residual)

1. **`teamengine-spi` 5.6 vs 6.0 SPI signature stability** (residual after ADR-001). The SPI interface has been stable across 5.x; TE 6.0.0 bumps Jersey/Jakarta and may rename packages. Mitigation: stay on ets-common:17 / TE 5.6 for Sprint 1; re-test on TE 6 at beta milestone.
2. **OGC OpenAPI YAML structure for CS API is not yet finalized** (Mary's `SCHEMAS-MAY-DRIFT`). Sprint 1 sidesteps by validating Core responses directly against bundled JSON Schemas (Kaizen-loaded) rather than via the OpenAPI YAML. Sprint 2+ Part 1 classes that depend on the OpenAPI structure (e.g. operation-parameter validation) will need to revisit when SWG settles.
3. **Spec-trap fixture port fidelity** (Mary's `SPEC-TRAP-FIXTURES-UNIQUE-IP`). Mitigation: REQ-ETS-FIXTURES-003 audit script enforces 1:1 case-ID mapping. Generator's epic-ets-06 work must not silently drop cases.
4. **TestNG dependency-graph correctness** (sprints 2+). The 14 Part 1 conformance classes have a dependency DAG inherited from v1.0 `csapi_compliance/src/engine/registry/index.ts`. Translating that DAG into TestNG `<groups>` + `dependsOnGroups` is mechanical but error-prone. Mitigation: a unit test in the new ETS asserts the DAG matches the TS source, run as part of REQ-ETS-SYNC-001.
5. **Reproducible builds on Windows**. `<project.build.outputTimestamp>` works on Windows, but git's autocrlf can introduce line-ending differences in resource files inside the jar. Mitigation: `.gitattributes` enforces LF for all `.json`, `.xml`, `.ctl`, `.properties` files at scaffold time.
6. **Logback + ets-common's `java.util.logging`**. Both run in the JVM. If a CITE reviewer expects only ets-common's logging idiom, our slf4j+logback addition is justified by NFR-ETS-10 but is a deviation from the features10 baseline. Mitigation: documented in §6 above.

## 12. Implementation phasing

| Sprint | Stories | Output |
|---|---|---|
| **Sprint 1 (current)** | S-ETS-01-01, -02, -03 | Archetype scaffold + JDK 17 modernized + Core suite + TeamEngine Docker smoke green vs GeoRobotix |
| Sprint 2 | TBD per Pat | 2-3 of the remaining 13 Part 1 classes (likely `common`, `system-features`, `subsystems` — top of the dependency DAG) |
| Sprints 3-6 | TBD | Remaining Part 1 classes; spec-trap fixture port (epic-ets-06 in parallel) |
| Sprint 7 | TBD | URI-coverage diff CI (REQ-ETS-SYNC-001); README repositions; v1.0-frozen tag |
| Sprint 8+ | TBD | Part 2 conformance classes (per OGC 23-002) |
| Beta milestone (calendar) | non-sprint | Maven Central publish; outreach; CITE SC ticket |

## 13. ADR index

| ID | Title | Status |
|---|---|---|
| ADR-001 | TeamEngine SPI Registration Pattern | Accepted |
| ADR-002 | JSON Schema Bundling Mechanism | Accepted |
| ADR-003 | Java Package Naming and Maven Coordinates | Accepted |
| ADR-004 | ets-archetype-testng:2.7 Modernization Checklist | Accepted |
| ADR-005 | Cross-Repo Relationship with the Frozen v1.0 Web App | Accepted |

(Future ADRs from sprints 2+ will append here.)

## 14. Last reconciled

**2026-04-27** — fresh as of this rewrite. Re-reconcile required if >30 days stale per CLAUDE.md.
