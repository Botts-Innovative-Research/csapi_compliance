# Design — OGC API Connected Systems ETS

**Architect**: Architect Agent (Alex)
**Date**: 2026-04-27
**Spec Reference**: [`spec.md`](./spec.md) v1.0
**Status**: Approved (Sprint 1)
**Authoritative ADRs**: ADR-001, ADR-002, ADR-003, ADR-004, ADR-005 (in `_bmad/adrs/`)

## Overview

This design translates capability spec REQ-ETS-* into a concrete Java/TestNG component layout for the new repo `ets-ogcapi-connectedsystems10` (per ADR-003 — note: PRD §FR-ETS-01 and capability spec §REQ-ETS-SCAFFOLD-001 reference the older `ets-ogcapi-connectedsystems-1` artifactId; the ADR-003 form is authoritative and Sam will reconcile the spec strings at the next planning cycle).

The Sprint 1 deliverable is the smallest end-to-end vertical slice that proves the architecture works:

1. Archetype-generated Maven project, JDK 17 modernized, builds green (S-ETS-01-01).
2. CS API Core conformance class implemented with one TestNG `@Test` per ATS assertion (S-ETS-01-02).
3. TeamEngine 5.6.x Docker container loads the ETS jar via SPI registration and runs Core against `https://api.georobotix.io/ogc/t18/api` (S-ETS-01-03).

The capability extends mechanically across sprints 2..N: each remaining Part 1 conformance class adds one `conformance.<class>` package and one `<test>` block in `testng.xml`. The wiring is fixed in Sprint 1.

## Architecture overview

```
                 +-------------------------+
                 |  TeamEngine 5.6.x       |
                 |  (Tomcat 10, JDK 17)    |
                 |                         |
                 |  CTL UI (XSLT/Saxon)    |
                 |    |                    |
                 |    v                    |
                 |  ServiceLoader scans    |
                 |    META-INF/services/   |
                 |    *.TestSuiteController|
                 +----------+--------------+
                            |
                            | classloads
                            v
   +---------------------------------------------------------+
   |  ets-ogcapi-connectedsystems10.jar                      |
   |                                                         |
   |  TestNGController (impl TestSuiteController)            |
   |       |                                                 |
   |       v                                                 |
   |  testng.xml -> <test name="Core">                       |
   |       |                                                 |
   |       v                                                 |
   |  conformance.SuitePreconditions (validates iut param)   |
   |       |                                                 |
   |       v                                                 |
   |  conformance.core.LandingPageTests       <-+            |
   |  conformance.core.ConformanceTests       <-+- Sprint 1  |
   |  conformance.core.ResourceShapeTests     <-+            |
   |       |                                                 |
   |       v                                                 |
   |  RestAssured -> HTTP -> IUT                             |
   |  Kaizen / everit-json-schema -> validates response      |
   |  EtsAssert -> structured FAIL msgs w/ /req/* URIs       |
   +---------------------------------------------------------+
                            |
                            | TestNG XML report
                            v
              +-------------+--------------+
              | TeamEngine HTML report     |
              | (user-visible result)      |
              +----------------------------+
```

## Class structure

### Sprint 1 deliverable

| Class | Package | Implements REQs | Sprint |
|---|---|---|---|
| `TestNGController` | `org.opengis.cite.ogcapiconnectedsystems10` | REQ-ETS-TEAMENGINE-001 | 1 |
| `CommandLineArguments` | `org.opengis.cite.ogcapiconnectedsystems10` | (CLI usage; per features10) | 1 |
| `TestRunArg` (enum) | `org.opengis.cite.ogcapiconnectedsystems10` | REQ-ETS-TEAMENGINE-002 (CTL → TestNG param mapping) | 1 |
| `EtsAssert` | `org.opengis.cite.ogcapiconnectedsystems10.util` | REQ-ETS-CORE-001 (structured FAIL msg discipline) | 1 |
| `SuitePreconditions` | `org.opengis.cite.ogcapiconnectedsystems10.conformance` | REQ-ETS-CORE-002 (validates iut reachable) | 1 |
| `SuiteFixtureListener` | `org.opengis.cite.ogcapiconnectedsystems10.listener` | REQ-ETS-CORE-002, -003 (fetches landing + conformance) | 1 |
| `TestRunListener` | `org.opengis.cite.ogcapiconnectedsystems10.listener` | (per features10 stub) | 1 |
| `LoggingTestListener` | `org.opengis.cite.ogcapiconnectedsystems10.listener` | (slf4j logging hook) | 1 |
| `LandingPageTests` | `org.opengis.cite.ogcapiconnectedsystems10.conformance.core` | REQ-ETS-CORE-002 | 1 |
| `ConformanceTests` | `org.opengis.cite.ogcapiconnectedsystems10.conformance.core` | REQ-ETS-CORE-003 | 1 |
| `ResourceShapeTests` | `org.opengis.cite.ogcapiconnectedsystems10.conformance.core` | REQ-ETS-CORE-004 | 1 |

### Sprints 2..N skeleton (placeholders)

| Future class | Package | REQ |
|---|---|---|
| `CommonTests` | `conformance.common` | REQ-ETS-PART1-001 |
| `SystemFeaturesTests` | `conformance.systemfeatures` | REQ-ETS-PART1-002 |
| `SubsystemsTests` | `conformance.subsystems` | REQ-ETS-PART1-003 |
| `DeploymentFeaturesTests` | `conformance.deploymentfeatures` | REQ-ETS-PART1-004 |
| `SubdeploymentsTests` | `conformance.subdeployments` | REQ-ETS-PART1-005 |
| `ProcedureFeaturesTests` | `conformance.procedurefeatures` | REQ-ETS-PART1-006 |
| `SamplingFeaturesTests` | `conformance.samplingfeatures` | REQ-ETS-PART1-007 |
| `PropertyDefinitionsTests` | `conformance.propertydefinitions` | REQ-ETS-PART1-008 |
| `AdvancedFilteringTests` | `conformance.advancedfiltering` | REQ-ETS-PART1-009 |
| `CreateReplaceDeleteTests` | `conformance.createreplacedelete` | REQ-ETS-PART1-010 |
| `UpdateTests` | `conformance.update` | REQ-ETS-PART1-011 |
| `GeoJsonTests` | `conformance.geojson` | REQ-ETS-PART1-012 |
| `SensorMlTests` | `conformance.sensorml` | REQ-ETS-PART1-013 |

(Part 2 classes — REQ-ETS-PART2-001..014 — explicitly not in scope per user gate; structurally analogous when their sprint cluster runs.)

## Per-suite-class responsibilities (Sprint 1)

### `LandingPageTests` (REQ-ETS-CORE-002)

`@Test` methods (description = `OGC-23-001 /req/core/landing-page-...` per REQ-ETS-CORE-001):

| @Test method | Asserts |
|---|---|
| `landingPageReturns200` | GET `/` → status 200; Content-Type contains `application/json` |
| `landingPageHasTitle` | body has string `title` |
| `landingPageHasDescription` | body has string `description` |
| `landingPageHasLinks` | body has array `links` |
| `landingPageLinksContainConformance` | `links[].rel` includes `conformance` |
| `landingPageLinksContainApiDefinition` | `links[].rel` includes `service-desc` OR `service-doc` (fallback fix preserved per SCENARIO-ETS-CORE-API-DEF-FALLBACK-001) |
| `landingPageDoesNotRequireSelfRel` | sentinel test: PASSES whether `self` is present or absent (preserves v1.0 GH#3 fix per SCENARIO-ETS-CORE-LINKS-NORMATIVE-001) |

### `ConformanceTests` (REQ-ETS-CORE-003)

| @Test method | Asserts |
|---|---|
| `conformanceEndpointReturns200` | GET `/conformance` → status 200 |
| `conformanceBodyHasConformsTo` | body has array `conformsTo` |
| `conformanceConformsToEntriesAreUris` | each `conformsTo[i]` is a string parseable as a URI |
| `conformanceListStashedForDependentSuites` | `ISuite.getAttribute("declaredConformanceClasses")` is set non-null after `@BeforeSuite` runs |

### `ResourceShapeTests` (REQ-ETS-CORE-004)

`@DataProvider` returns one row per "linked resource discoverable from landing page". For each:

| @Test method | Asserts |
|---|---|
| `resourceHasIdField` | response body has string `id` |
| `resourceHasTypeField` | response body has string `type` |
| `resourceHasLinksArray` | response body has array `links` with at least one entry having `href` and `rel` |

(Sprint 1 may scope `ResourceShapeTests` to a single representative resource — likely `/api` or `/conformance` itself — and expand to a true crawl in Sprint 2 once Common is implemented.)

## Interface contracts

### TeamEngine SPI hook (ADR-001)

```
File: src/main/resources/META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController
Body (single line):
  org.opengis.cite.ogcapiconnectedsystems10.TestNGController

Class: org.opengis.cite.ogcapiconnectedsystems10.TestNGController
  implements com.occamlab.te.spi.jaxrs.TestSuiteController
  Methods (1:1 port from features10):
    String getCode()        → ets-code property = "ogcapi-connectedsystems10"
    String getVersion()     → project version from ets.properties
    String getTitle()       → ets-title property
    Source doTestRun(Document testRunArgs) throws Exception
```

### TestNG suite parameters (REQ-ETS-TEAMENGINE-002)

```
testng.xml <suite> declares parameters:
  iut         (required, the IUT landing-page URL)
  ics         (optional, implementation-conformance-statement, per features10)
CTL form populates these from user input at the CTL-form layer.
TestRunArg enum values map XML attribute keys to parameter strings.
```

### REST Assured request lifecycle (per @Test method)

```
RequestSpecification req = RestAssured
  .given()
  .baseUri(suite.getAttribute("iut"))
  .filter(new RequestLoggingFilter(LogDetail.ALL))   // -> TestNG attachment
  .filter(new ResponseLoggingFilter(LogDetail.ALL))  // -> TestNG attachment
  .filter(new CredentialMaskingFilter(...))          // strips Authorization header from logs
  ;
if (auth.isPresent()) req = applyAuth(req, auth);

Response resp = req.get(relativePath);
EtsAssert.assertStatus(resp, 200, "/req/core/landing-page");
EtsAssert.assertJsonHas(resp, "$.title", "/req/core/landing-page");
...
```

### JSON Schema validation

```
@BeforeSuite (in SuiteFixtureListener):
  load com.reprezen.kaizen.OpenAPIParser  -- but for Sprint 1 we DO NOT use openapi-parser
  load schemas from classpath: src/main/resources/schemas/connected-systems-1/*.json
  via everit-json-schema's SchemaLoader builder
  cache validators in ISuite attributes by schema name

Per @Test:
  Schema landingSchema = (Schema) suite.getAttribute("schema:landing-page");
  landingSchema.validate(new JSONObject(resp.body().asString()));
  // ValidationException → EtsAssert.fail with /req/* URI + violation list
```

(Kaizen `openapi-parser` is on the dep list but Sprint 1's Core suite uses everit-json-schema directly — a transitive dep of ets-common — because the OGC OpenAPI YAML for CS API is not yet stable enough to drive operation-level validation; see Architecture §11 risk #2. Sprint 2+ will revisit.)

### Auth handling

Three modes per REQ-ETS-TEAMENGINE-002:
- `none`: no Authorization header.
- `bearer <token>`: `Authorization: Bearer <token>`.
- `apikey <header-name>:<value>`: arbitrary header injection (legacy compat).
- `basic <user>:<pass>`: `Authorization: Basic <base64>`.

Credentials are passed via TestNG suite parameters, kept in @Test-method-scope variables only, and **never** logged. The `CredentialMaskingFilter` (custom REST Assured `Filter`) redacts `Authorization`, `X-API-Key`, and any header named in a class-level `Set<String>` to `***MASKED***` in the request/response logging output.

## Test data and fixtures

- **Bundled OGC JSON Schemas**: `src/main/resources/schemas/{connected-systems-1, connected-systems-2, connected-systems-shared, external, fallback}/*.json` — 126 files, copied verbatim from `csapi_compliance/schemas/` per ADR-002. Copying happens manually at S-ETS-01-01 scaffold time; provenance recorded in `ops/server.md`.
- **Sample IUT data** (sprints 2+): `src/main/resources/data/` for shipped sample SensorML / SWE Common payloads (pattern from features10).
- **Spec-trap fixture corpus** (sprints 2+, epic-ets-06): `src/test/resources/fixtures/spec-traps/` for the asymmetric featureType/itemType corpus (~30-50 cases ported as Java `@DataProvider` inputs). NOT in Sprint 1 scope but Sprint 1 must NOT erase the requirement.

## Implementation phasing (per-sprint readiness)

### Sprint 1 (active)

Stories scoped: S-ETS-01-01, -02, -03. See readiness verdicts in §"Implementation Readiness Check" below.

### Sprint 2 (next, post-Sprint-1 success)

Suggested stories:
- S-ETS-02-01: implement `CommonTests` (REQ-ETS-PART1-001) — link relations, content negotiation, OpenAPI Common conformance
- S-ETS-02-02: implement `SystemFeaturesTests` (REQ-ETS-PART1-002) — system collection assertions
- S-ETS-02-03: implement TestNG `dependsOnGroups` wiring across Core → Common → SystemFeatures

### Sprints 3-7

Remaining 11 Part 1 conformance classes (one or two per sprint, depending on assertion count). epic-ets-06 (spec-trap fixture port) runs in parallel as a separate epic.

### Sprint 8+

Part 2 (REQ-ETS-PART2-*) and CITE-submission process work (REQ-ETS-CITE-*).

## Implementation Readiness Check (Sprint 1)

Per the architect role contract, each Sprint 1 story gets a verdict. Verdicts are based on whether ADR-001..005 + this design provide enough specification for a stateless Generator to write the code without ambiguous decisions.

### S-ETS-01-01 — "Generate archetype, modernize to JDK 17, first green build"

**Verdict: PASS**

Rationale:
- Maven coordinates and Java root package fully specified (ADR-003).
- Archetype modernization checklist is exhaustive (ADR-004) — Generator follows the 25-item Group A/B/C/D list. Each delta becomes one ADR row referenced from REQ-ETS-SCAFFOLD-006.
- Reproducibility mechanism (`<project.build.outputTimestamp>`) is concrete (ADR-004 group C-5). CI verifies via SCENARIO-ETS-SCAFFOLD-REPRODUCIBLE-001.
- Repository layout is fully specified (Architecture §3, ADR-001).
- Schema source is pinned (ADR-002).
- Cross-repo relationship is documented (ADR-005); Generator does NOT need to do anything cross-repo in Sprint 1 except note the schema provenance in `ops/server.md`.

Constraints for Generator:
- MUST: Use `org.opengis.cite:ets-common:17` as parent (not 14, not 18-SNAPSHOT). PRD says `:14` — that's stale; ADR-004 supersedes.
- MUST: Use `org.opengis.cite.ogcapiconnectedsystems10` as Java root package. PRD/spec say `org.opengis.cite.ogcapi.cs10` — ADR-003 supersedes.
- MUST: Use `ets-ogcapi-connectedsystems10` as artifactId. PRD/spec say `ets-ogcapi-connectedsystems-1` — ADR-003 supersedes.
- MUST: Tag each modernization delta with an ADR row referenced from a row in this sprint's commit log per REQ-ETS-SCAFFOLD-006.

Caveat for Generator (NOT a CONCERNS — handled): the ADR-003 / ADR-004 deviation from PRD strings is captured in the ADRs' Consequences sections; Generator references those when CITE-style auditors (or Quinn) ask why the strings differ.

### S-ETS-01-02 — "Implement CS API Core conformance class end-to-end against GeoRobotix"

**Verdict: PASS**

Rationale:
- Three test classes specified (LandingPageTests, ConformanceTests, ResourceShapeTests) with concrete @Test method names and assertion contracts (this design §"Per-suite-class responsibilities").
- v1.0 GH#3 fix and API-def fallback explicitly preserved at the SCENARIO level (SCENARIO-ETS-CORE-LINKS-NORMATIVE-001 + -API-DEF-FALLBACK-001) and at the design-class level (`landingPageDoesNotRequireSelfRel`, `landingPageLinksContainApiDefinition`).
- Assertion failure-message format specified (Architecture §6, EtsAssert pattern with `/req/* URI` always present).
- HTTP/auth/credential-masking lifecycle documented (this design §"REST Assured request lifecycle", §"Auth handling").
- JSON Schema validation pathway specified (this design §"JSON Schema validation") with the explicit Sprint-1 caveat that `everit-json-schema` is the validator and Kaizen's `openapi-parser` is deferred to Sprint 2+ (a known, deliberate scope split).

Constraints for Generator:
- MUST: every `@Test` method's `description` attribute starts with `OGC-23-001 /req/core/...`.
- MUST: SCENARIO-ETS-CORE-LINKS-NORMATIVE-001 must pass — `rel=self` is example-only.
- MUST: SCENARIO-ETS-CORE-API-DEF-FALLBACK-001 must pass — `service-desc` OR `service-doc` is acceptable.
- MUST NOT: add a `@Test` for `rel=self` mandatory; if anti-regression coverage is desired, the test should ASSERT THE PASS CASE (the `landingPageDoesNotRequireSelfRel` sentinel above).
- MUST: use `EtsAssert` with structured FAIL messages including the `/req/*` URI; do not throw bare TestNG `AssertionError`s.

### S-ETS-01-03 — "TeamEngine 5.5 Docker smoke test runs Core suite against GeoRobotix"

**Verdict: CONCERNS** (proceed, with caveats)

Rationale:
- The SPI registration mechanism is concretely specified (ADR-001) and verified against features10's master branch.
- The Dockerfile pattern is specified at the architecture level (Architecture §2 deployment topology). Concrete content: `FROM ogccite/teamengine-production:5.6.1` then `COPY target/ets-ogcapi-connectedsystems10-<version>.jar /usr/local/tomcat/webapps/teamengine/WEB-INF/lib/`.
- The smoke-test script contract is specified (REQ-ETS-TEAMENGINE-005, SCENARIO-ETS-CORE-SMOKE-001).

Concerns the Generator must handle and Quinn must verify:

1. **TeamEngine 5.6.1 base image availability**: The capability spec and PRD reference TeamEngine 5.5; the actual `ogccite/teamengine-production` master pom currently pins 5.6.1. The user-facing OGC validator runs whatever the production-docker repo's master image produces. Generator MUST use `ogccite/teamengine-production:5.6.1` or whichever specific tag is pulled-and-published — verify via `docker pull ogccite/teamengine-production:5.6.1 && docker images`. If 5.5 is what spec says but 5.6.1 is what's deployed, **the smoke test must use 5.6.1** and an ADR row notes the spec-vs-deployment mismatch (Sam reconciles).

2. **`META-INF/services/` filename literalness**: ADR-001 specifies the file path exactly. A common Generator failure mode is to create `META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController.txt` or split into multiple files. The file name MUST be the bare interface FQCN with no extension. Quinn check: `unzip -l target/*.jar | grep META-INF/services/` — exactly one matching entry.

3. **CTL wrapper Saxon namespace declaration**: ADR-001 specifies `xmlns:tng="java:org.opengis.cite.ogcapiconnectedsystems10.TestNGController"`. A typo in the package name silently makes the CTL form a no-op (Saxon throws at runtime, not at CTL parse time). Quinn check: actually click "Start" on the CTL form in the smoke-test container and verify the TestNG report is non-empty.

4. **Smoke test as Sprint 1's E2E gate**: `scripts/smoke-test.sh` must produce a non-empty TestNG XML report from a container-launched Core suite run against GeoRobotix. CLAUDE.md's E2E mandate applies: archived TestNG XML report is the evidence. Quinn verifies via the artifact in CI; Raze (Gate 4) verifies the archived file is from the actual smoke-test run, not a hand-crafted file.

Constraints for Generator:
- MUST: smoke test is **scripts/smoke-test.sh** (bash) — do not bury it in a Maven plugin invocation that hides container failures from CI logs.
- MUST: smoke test waits for TeamEngine HTTP healthcheck before invoking the suite.
- MUST: smoke test produces an exit code: 0 only if TestNG report is non-empty AND zero suite-registration ERRORs in TeamEngine container logs.
- MUST: archive the TestNG report into `ops/test-results.md` and (in CI) as a build artifact.

## Security Considerations

This is a server-side test suite; the IUT-facing surface is HTTP-out, not HTTP-in. SSRF is not a concern (we don't accept user input that becomes outbound URLs without operator awareness — the operator IS the user typing the IUT URL into TeamEngine). However:

- **Credential masking** in logs and reports: REQ-ETS-FR-25, NFR-ETS-08. Pattern: `CredentialMaskingFilter` for REST Assured + logback `<pattern>` excluding configured headers. **Tests for this exist** at the unit-test level (NOT shipped in Sprint 1's first commit; defer to Sprint 1 cleanup if time permits).
- **No persistent secrets in the jar**. Auth credentials are TestNG suite parameters (in-memory, scoped to one test run). The jar contains no API keys, no test-fixtures with real credentials.
- **JSON Schema validation must reject unknown-protocol URIs**: a malicious IUT response could reference `file://` or `jar:` URIs in `links[].href`. The schema validator's URI-format check + EtsAssert verifying `https?://` schemes prevents this from becoming a vector. (This is a hardening for a future sprint, not Sprint 1 critical.)

## Performance Considerations

NFR-ETS-04: TeamEngine + ETS jar registers within 30 sec of container start.
NFR-ETS-05: full Part 1 suite completes in <10 min against a responsive IUT.

Sprint 1 (Core only, ~12 @Test methods) is well within NFR-ETS-05; performance is not a Sprint 1 risk. Sprints 2+ should add JaCoCo + a CI duration timer to track regression.

## Implementation Constraints (additional, beyond Sprint 1 stories)

The Generator MUST:
1. Apply ADR-004 modernization checklist Group A-D items as **separate atomic commits** so each is git-bisect-friendly.
2. Use ets-common:17 (release tag), not master.
3. Use the ADR-003 naming for all coordinates and packages.
4. Cite the relevant ADR ID in any commit message that touches scaffolding (e.g. `S-ETS-01-01: pom.xml parent → ets-common:17 (ADR-004 A-1)`).
5. Run `mvn clean install` and capture the output; log the build success or failure to `ops/test-results.md` per CLAUDE.md step 5.
6. Run the smoke test in S-ETS-01-03; capture the TestNG report; archive it.

The Generator MUST NOT:
1. Add a non-ets-common-managed transitive dependency without an ADR.
2. Override an ets-common-managed dep version (everit-json-schema, jackson, jersey, jts) without an ADR explaining why ets-common's pin is wrong.
3. Implement any Part 2 functionality (REQ-ETS-PART2-*).
4. Implement spec-trap fixtures (REQ-ETS-FIXTURES-*) — this is epic-ets-06's scope, parallel sprint.
5. Modify `csapi_compliance/` repo files. The freeze applies. README reposition (REQ-ETS-WEBAPP-FREEZE-001) is a separate epic.

## Testing Strategy

- **Unit tests** (Sprint 1): `src/test/java/...` covers `EtsAssert` formatting, `CredentialMaskingFilter` behavior, `SuiteFixtureListener` parameter parsing. Mockito for HTTP boundary; no live IUT in unit tests.
- **Integration tests** (Sprint 1): the smoke test IS the integration test — TeamEngine + ETS + GeoRobotix end-to-end. No separate integration-test layer needed for Sprint 1.
- **Reproducible-build CI job** (Sprint 1, NFR-ETS-01): clean checkout, `mvn install`, save jar, clean checkout again, `mvn install`, diff the jars excluding META-INF timestamps. Empty diff = pass.
- **Cross-platform CI job** (Sprint 1, NFR-ETS-06): GitHub Actions matrix runs `mvn -B verify` on ubuntu, macos, windows. Sprint 1 may run only ubuntu and add macos/windows in Sprint 2 if time-pressed; Quinn flags as CONCERNS but not FAIL.

## Open Items for Future Sprints (NOT Sprint 1)

- Detailed REQ-* per Part 1 class beyond Core (PLACEHOLDER status in spec).
- All of REQ-ETS-PART2-*.
- REQ-ETS-FIXTURES-* (epic-ets-06).
- REQ-ETS-CITE-* (calendar-bound).
- REQ-ETS-WEBAPP-FREEZE-001 (separate quick-win sprint).
- REQ-ETS-SYNC-001 (CI script, post-Part-1-feature-complete).

## ADR Cross-References

| Decision | Authority |
|---|---|
| TeamEngine SPI registration mechanics | ADR-001 (with ADR-007 cross-reference for Dockerfile-side reality) |
| Schema bundling | ADR-002 |
| Java package + Maven coordinates | ADR-003 |
| Archetype modernization checklist | ADR-004 (extended via ADR-006 Group F retro-row) |
| Cross-repo relationship | ADR-005 |
| Jersey 1.x → Jakarta EE 9 / Jersey 3.x port | ADR-006 (Sprint 2 retro) |
| Dockerfile base image deviation (`tomcat:8.5-jre17`) | ADR-007 (Sprint 2 retro) |
| EtsAssert REST/JSON helper API surface | ADR-008 (Sprint 2 forward-looking) |
| Multi-stage Dockerfile pattern | ADR-009 (Sprint 2 forward-looking) |
| Logging stack (slf4j + logback) | Architecture §6 + this design.md §"CredentialMaskingFilter wiring" (Sprint 2) |

## Sprint 2 Ratifications (2026-04-28)

The following sections were added by Architect (Alex) at Sprint 2 ets-02 to formalize decisions Pat (Planner) deferred. They bind the Sprint 2 Generator (Dana) and every conformance.* class added in Sprint 2+.

### EtsAssert helper API (Sprint 2 S-ETS-02-02)

Full specification at **ADR-008**. Summary for design.md readers:

- 5 new static helpers added to `org.opengis.cite.ogcapiconnectedsystems10.ETSAssert`:
  - `assertStatus(Response resp, int expected, String reqUri)` — covers ~7 of 21 Sprint-1 sites.
  - `assertJsonObjectHas(Map<String,Object> body, String key, Class<?> type, String reqUri)` — covers ~5 sites.
  - `assertJsonArrayContains(List<?> array, Predicate<Object> pred, String desc, String reqUri)` — covers ~5 sites.
  - `assertJsonArrayContainsAnyOf(List<?> array, List<Map.Entry<String, Predicate<Object>>> alternatives, String reqUri)` — covers the OR-fallback patterns (~2 sites: `service-desc OR service-doc`; `rel=collection AND/OR rel=items`).
  - `failWithUri(String reqUri, String message)` — universal escape hatch (~2 sites: sentinels, custom multi-step assertions).
- Every helper raises `java.lang.AssertionError` (not TestNG `SkipException`) with the OGC `/req/*` URI as the message prefix.
- Every helper has at least one PASS-path + one FAIL-path unit test under `src/test/java/.../VerifyETSAssert.java`.
- **Constraint binding Sprint 2+**: zero `throw new AssertionError(...)` permitted in `conformance.*` subpackages; Quinn enforces via `grep -E 'throw new AssertionError|Assert\.fail' src/main/java/.../conformance/`. See ADR-008 §"Constraints" for the full list.
- Refactor discipline (S-ETS-02-02): one commit per test class (3 commits — LandingPageTests, ConformanceTests, ResourceShapeTests); smoke-test 12/12 PASS verified at every commit boundary.

Refactoring examples for the 21 Sprint-1 sites are in ADR-008 §"Examples drawn from actual Sprint 1 sites".

### Dockerfile multi-stage build (Sprint 2 S-ETS-02-05)

Full specification at **ADR-009**. Summary for design.md readers:

- Two-stage Dockerfile: `eclipse-temurin:17-jdk-jammy` build stage + `tomcat:8.5-jre17` runtime stage (preserving ADR-007's runtime base choice and the 3 secondary patches).
- Build stage uses BuildKit `--mount=type=cache,target=/root/.m2` to amortize Maven dep download across `docker build` invocations.
- Layer ordering optimized for cache: pom.xml + `dependency:go-offline` BEFORE source COPY; rare-changing layers (TE WAR download, JAXB jars) BEFORE per-commit layers (`COPY --from=builder`).
- Runtime image runs as non-root `USER tomcat` (REQ-ETS-CLEANUP-004 mandate); `chown -R tomcat:tomcat /usr/local/tomcat` before USER switch.
- Image size target: ≤ 450MB (vs Sprint 1 single-stage ~600MB); soft target 400MB.
- `scripts/smoke-test.sh` simplifies post-multi-stage: drops the host-`mvn -B clean package` and `mvn dependency:copy-dependencies` steps (now handled inside `docker build`); only `docker build .` is needed at smoke time. Eliminates Quinn s03 / Raze s03 host-`~/.m2` brittleness.

The ADR explicitly REJECTED options (b) (pre-staged target/lib-runtime split-only) and (c) (pom.xml profile bakes deps closure) — both fail to eliminate the host-Maven dependency.

### SystemFeatures conformance class scope (Sprint 2 S-ETS-02-06)

**Architect ratifies: Sprint-1-style minimal-then-expand. 4 @Test methods at Sprint 2 close, full-coverage expansion deferred to Sprint 3.**

Pat enumerated 4 SCENARIOs in REQ-ETS-PART1-002 (now SPECIFIED in spec.md). Architect maps these to 4 @Test methods, mirroring the LandingPageTests/ConformanceTests pattern:

| @Test method | Asserts | Scenario closed |
|---|---|---|
| `systemsCollectionReturns200` | `GET /systems` → status 200; Content-Type contains `application/json` | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LANDING-001 (CRITICAL) |
| `systemsCollectionHasItemsArray` | body has array `items` (or `features` if CS API server uses GeoJSON wrapper); array is non-empty (Generator MUST curl-verify before writing assertion) | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LANDING-001 (CRITICAL) |
| `systemItemHasIdTypeLinks` | for the first item in the collection: has string `id`, string `type` (matching `System` or the IUT's discriminator), array `links` per REQ-ETS-CORE-004 base shape | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-RESOURCE-SHAPE-001 (NORMAL) |
| `systemsCollectionLinksDiscipline` | collection-level `links` array contains `rel=collection` AND/OR `rel=items` per OGC Common; absence of `rel=self` is NOT FAIL (carries v1.0 GH#3 fix policy from Core landing page) | SCENARIO-ETS-PART1-002-SYSTEMFEATURES-LINKS-NORMATIVE-001 (NORMAL) |

The `dependsOnGroups="core"` wiring (CRITICAL SCENARIO-ETS-PART1-002-SYSTEMFEATURES-DEPENDENCY-SKIP-001) is a **testng.xml change**, not a @Test method — handled inline in the `<test name="SystemFeatures">` block:

```xml
<test name="SystemFeatures">
  <packages>
    <package name="org.opengis.cite.ogcapiconnectedsystems10.conformance.systemfeatures"/>
  </packages>
  <groups>
    <dependencies>
      <group name="systemfeatures" depends-on="core"/>
    </dependencies>
  </groups>
</test>
```

The `dependsOnGroups` semantics auto-skip every @Test in `conformance.systemfeatures.*` if any @Test in `conformance.core.*` produces FAIL. Verification per S-ETS-02-06 acceptance criterion #7: temporarily make Core FAIL (e.g. point IUT at server returning 500 on `/conformance`) and confirm SystemFeatures @Tests emit SKIP not FAIL/ERROR.

#### Subpackage layout

`org.opengis.cite.ogcapiconnectedsystems10.conformance.systemfeatures.SystemFeaturesTests` — single class for Sprint 2. Mirrors the 1:1 LandingPageTests/ConformanceTests/ResourceShapeTests pattern from `conformance.core.*`. If Sprint 3+ expansion grows the @Test count beyond ~10, split into `SystemFeaturesCollectionTests` + `SystemFeaturesItemTests` (deferred to Sprint 3 per below).

#### Fixtures and listeners

No new fixtures or listeners needed for Sprint 2. The existing `SuiteFixtureListener` (which fetches landing page + `/conformance` per ADR-001) supplies the IUT base URL via `SuiteAttribute.IUT`. SystemFeaturesTests reads `iutUri` the same way Core's classes do.

`@BeforeClass` in `SystemFeaturesTests` performs the `GET /systems` once and caches the response shape into a class-level field (so the 4 @Tests don't redundantly hit the IUT). Pattern mirrors `ConformanceTests.fetchConformancePage()`.

#### Coverage scope rationale (Sprint-1-style narrowing)

Pat recommended Sprint-1-style narrowing for risk control on the first pattern extension. Architect concurs because:

1. **The architectural pattern is being extended for the first time**. Sprint 2 proves the extension works mechanically. Minimizing the per-class surface area maximizes the signal-to-noise of "did the pattern extend?" vs "did we get the assertion logic right?"
2. **The 4 chosen SCENARIOs cover the foundational shape** (collection landing, items array, item shape, links discipline). The remaining ~8-12 ATS items in OGC 23-001 Annex A `/conf/system-features/` (canonical-url, location-time, collections, write operations, advanced filtering interactions) layer on top — once the foundation is proven, expansion is mechanical.
3. **Beta gate doesn't require full per-class coverage**. CITE SC review approves on the basis of "the test class exists, runs, and produces deterministic verdicts" — depth comes during the 6-12 month beta period via passing-IUT outreach.
4. **GeoRobotix's `/systems` collection shape is unknown until Generator curls it**. Acceptance criterion #1 mandates the curl-first approach; if `/systems` returns an unexpected shape (e.g. paginated wrapper, GeoJSON FeatureCollection), 4 @Tests adapt cleanly while 12-15 would force structural choices we'd regret.

Sprint 3 expansion (per the spec.md Implementation Status update Pat will make at S-ETS-02-06 close) targets:

- `systemCanonicalUrlReturns200` — REQ-ETS-PART1-002 / `/req/system/canonical-url`
- `systemHasGeometryAndValidTime` (NORMAL — `MAY` priority) — REQ-ETS-PART1-002 / `/req/system/location-time`
- `systemAppearsInCollections` — REQ-ETS-PART1-002 / `/req/system/collections`
- `systemFeaturesPagination` — pagination correctness if `/systems` returns `next` link
- Plus ~4 more covering filter-by-property and filter-by-time interactions

Architect estimates Sprint 3 SystemFeatures expansion at ~4 hours Generator time (mechanical extensions).

#### What NOT to ship in Sprint 2

- **Spec-trap fixture port**: the `asymmetric-feature-type/` fixture group from `csapi_compliance/tests/fixtures/spec-traps/` is REQ-ETS-FIXTURES-* / epic-ets-06 scope. Generator MUST NOT port it inline as part of S-ETS-02-06; the SCENARIO references it only as future-ready context.
- **Write-operation coverage** (POST / PUT / DELETE on `/systems`): REQ-ETS-PART1-010 (`create-replace-delete`) scope; deferred to Sprint 4+.
- **Cross-IUT testing**: GeoRobotix is the canonical Sprint 2 IUT. Multi-IUT smoke is REQ-ETS-CITE-002 (three-implementation outreach) at beta.

### CredentialMaskingFilter wiring (Sprint 2 S-ETS-02-04)

Architect rules **NO separate ADR** for CredentialMaskingFilter. Justification: the implementation is wire-the-OGC-pattern-verbatim (REST-Assured `Filter` SPI is well-trodden; logback `<pattern>` masking is a 5-line config; v1.0 `csapi_compliance/src/engine/credential-masker.ts` provides the masking semantics verbatim). The decision surface is too small for an ADR — design.md inline is sufficient. The audit-trail weight Pat flagged is captured by (a) NFR-ETS-08 in the PRD already mandating credential masking, (b) the credential-leak integration test required by S-ETS-02-04 acceptance criteria, (c) the SCENARIO-ETS-CLEANUP-LOGBACK-MASKING-001 / NFR-ETS-08 spec entry.

#### Class location and pattern

`org.opengis.cite.ogcapiconnectedsystems10.listener.CredentialMaskingFilter` — `listener/` subpackage parallels the existing `ReusableEntityFilter` (which is also a REST-Assured `Filter`). Implements `io.restassured.filter.Filter`; constructor takes `Set<String>` of header names to mask (defaults to `Authorization`, `X-API-Key`, `Cookie`, `Set-Cookie`, `Proxy-Authorization` per v1.0 reference).

#### Masking semantics (verbatim port from v1.0)

Read `csapi_compliance/src/engine/credential-masker.ts` lines 35-41:

```
if value.length <= 8: return "****"
else: return value[0:4] + "***" + value[-4:]
```

Java port preserves the same semantics:

```java
public static String maskValue(String value) {
    if (value == null || value.isEmpty()) return "****";
    if (value.length() <= 8) return "****";
    return value.substring(0, 4) + "***" + value.substring(value.length() - 4);
}
```

Edge cases (carry from v1.0):
- Bearer-prefix preservation: input `"Bearer ABCDEFGH12345678WXYZ"` → output `"Bear***WXYZ"` (mask the entire credential value INCLUDING the Bearer prefix; the SCENARIO-ETS-CLEANUP-LOGBACK-MASKING-001 acceptance criterion expects this — the literal substring `EFGH12345678WXYZ` must NOT appear, and a recognizable masked form like `Bear...WXYZ` MUST appear).
- Empty string: returns `"****"`.
- Credentials < 8 chars: full redaction `"****"` (avoids leaking length information that could enable shoulder-surfing reconstruction).
- Non-credential headers (Content-Type, Accept, etc.): pass through unchanged (the filter only intervenes on the configured header set).

#### Wiring point

Register the filter in `SuiteFixtureListener.onStart()` alongside the existing REST-Assured baseline config. Generator updates the REST-Assured `RestAssured.filters(...)` global registration to include the new filter ONCE per suite execution.

#### Logback configuration

`src/main/resources/logback.xml`:

```xml
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <!-- Pattern excludes %X{Authorization} and %X{X-API-Key} from MDC output -->
      <pattern>%d{ISO8601} [%thread] %-5level %logger{36} - %msg%n</pattern>
    </encoder>
  </appender>
  <root level="INFO">
    <appender-ref ref="STDOUT"/>
  </root>
  <logger name="io.restassured" level="DEBUG"/>
  <logger name="org.opengis.cite.ogcapiconnectedsystems10" level="DEBUG"/>
</configuration>
```

**Implementation reality** (reconciled 2026-04-28T22:50Z post-Raze CONCERN-1 on Sprint 2 cleanup gate): the `CredentialMaskingFilter` does NOT mutate the outgoing REST-Assured request/response payloads (mutating Authorization headers in-flight would break authenticated IUT calls). Instead, it observes via REST-Assured's `Filter` SPI and emits a **parallel FINE-level masked log entry** alongside REST-Assured's built-in `RequestLoggingFilter` output. The filter's masking applies only to the parallel log entry; REST-Assured's own request/response logger (if attached) emits unmasked headers as a side effect. **Defense-in-depth**: logback's pattern intentionally omits `%X{*}` MDC dump, and the architect's `should` constraint #3 directs operators to attach the masking filter, NOT REST-Assured's `RequestLoggingFilter`, in any production-like configuration. **Sprint 3 hardening**: wrap REST-Assured's `RequestLoggingFilter` with a masking variant so the unmasked side channel is closed (see "Sprint 3 hardening: MaskingRequestLoggingFilter wrap pattern" below).

#### Sprint 3 hardening: MaskingRequestLoggingFilter wrap pattern (S-ETS-03-02)

##### Sprint 6 redesign: approach (i) — wire-side correctness via no-spec-mutation (S-ETS-06-01) — CANONICAL

**Sprint 6 update (2026-04-30)**: The Sprint 3 subclass-based wrap pattern documented below was diagnosed as DEFECTIVE by Sprint 5 Raze adversarial review (GAP-1'): `super.filter()` internally calls `ctx.next()` (the actual HTTP send) WHILE the temporary masked-header swap is in effect, so the wire request carries the **masked** credential — not the original. The `try/finally` restoration block runs AFTER `ctx.next()` returns and so cannot affect the request that is already on the wire. The IUT therefore receives the masked credential string and rejects every authenticated request as 401. (This is also why the Sprint 5 GAP-2 sabotage `.git`-exclude masked the latent javac defect: the live cascade could never run.)

**Approach (i) — now canonical (ratified by meta-Raze + primary Raze + Quinn at Sprint 6 close)**:

`MaskingRequestLoggingFilter.filter()` SHALL NOT call `super.filter()` and SHALL NOT mutate `requestSpec` headers. Instead:

1. **Snapshot** the current values of credential-bearing headers READ-ONLY via `requestSpec.getHeaders().getValue(name)`.
2. **Build the masked log line** in a `StringBuilder`, substituting `CredentialMaskingFilter.maskValue(value)` for each captured value.
3. **Emit** the masked log line directly to a shadowed `private final PrintStream stream` field on the filter (REST-Assured 5.5.0's parent `RequestLoggingFilter` declares `stream` as `private final` with no accessor, so the subclass cannot reach the parent's stream — Plan-Raze verified via Maven Central source-jar inspection; the shadowed field is the documented escape).
4. **Call `ctx.next(requestSpec, responseSpec)` directly** with the **unmutated** `requestSpec` — the wire carries the **ORIGINAL** credential.
5. **`super.filter()` is never invoked.** No header mutation. No `try/finally`. No restoration step (because nothing was mutated).

The Sprint 6 unit test `VerifyWireRestoresOriginalCredential` (4 @Tests; sister repo `src/test/java/.../listener/VerifyWireRestoresOriginalCredential.java`) uses a `CapturingFilterContext` that snapshots header values **BY VALUE** at `ctx.next` call time. The legacy 16 wiring-only tests (`VerifyAuthCredentialPropagation` 8 + `VerifyMaskingRequestLoggingFilter` 8) used `StubFilterContext` which captured by reference — they read post-restoration state and could not see the bug. With the Sprint 5 filter, `wireCarriesOriginalAuthorizationCredential` FAILed `expected:<Bear[er ABCDEFGH12345678]WXYZ> but was:<Bear[***]WXYZ>`. Under approach (i), all 4 wire-side @Tests PASS.

**`super.filter()` is no longer called**, so the `try/finally` "restoration" pattern documented further below is **historical** — the false claim *"the try/finally pattern guarantees the IUT receives the real credential header even if super.filter() throws"* (item #4 in the historical list below) is **incorrect**: under the Sprint 3 design, `super.filter()` itself emitted the request to the wire while the masked header was in place, so the try/finally could only restore the spec for any subsequent filters in the chain, not for the network round-trip already issued.

**Sprint 7 doc-lag close (Wedge 5, REQ-ETS-CLEANUP-018)**: this subsection was added to close meta-Raze META-GAP-M1 (Sprint 6 missed self-audit — design.md §Sprint 3 hardening still described the OLD wrap pattern as canonical after the Sprint 6 redesign landed).

**Cross-references**:

- ADR-010 v3 amendment (Sprint 5 close) — independently documents the dependency-skip cascade strategy under approach (i).
- REQ-ETS-CLEANUP-016 (spec.md) — the Sprint 6 wire-side correctness REQ; status IMPLEMENTED at Sprint 6 close + closure-proof verified at Sprint 6 gate.
- REQ-ETS-CLEANUP-011 (spec.md) — the Sprint 4 credential-leak E2E REQ; auto-PASS for the script three-fold under approach (i) once Wedge 3 closes (Sprint 7 S-ETS-07-01).

##### Historical (Sprint 3 baseline — superseded by Sprint 6 approach (i) above)

> The remainder of this subsection (architect ratification, code listing, "why subclass" rationale, and the original integration-test rules) describes the Sprint 3 baseline pattern. It is RETAINED as historical context for the v1.0 → v1.1 evolution. **DO NOT use the code listing below as the canonical implementation reference** — the canonical filter is the Sprint 6 approach (i) variant in the sister repo at `src/main/java/.../listener/MaskingRequestLoggingFilter.java` (HEAD `c17a534+` post Sprint 7).

**Architect ratifies: subclass-based wrap (Pat's option (a)) — NO separate ADR (precedent: CredentialMaskingFilter NO-ADR ruling).** Justification: the wrap pattern uses REST-Assured 5.5.0's public Filter SPI (well-trodden); the reusable masking semantics already live in `CredentialMaskingFilter.maskValue(...)` (Sprint 2 verbatim port from v1.0); the wrap is a 30-50 LOC subclass override. Decision surface is too small for a standalone ADR. The audit weight is carried by (a) NFR-ETS-08 + SCENARIO-ETS-CLEANUP-LOGBACK-MASKING-001 (already in spec), (b) the credential-leak integration test now mandated by S-ETS-03-02 acceptance criteria (no longer deferred), (c) ADR-010 §"Notes / references" (which cross-references this design.md section as the canonical wrap pattern reference).

> **Sprint 5 GAP-1' supersession**: this Sprint 3 ratification was retroactively invalidated by Sprint 5 Raze adversarial review — see "Sprint 6 redesign: approach (i)" subsection above. The historical ratification is preserved here for archaeological accuracy; the canonical pattern is approach (i).

**Class location and pattern (Sprint 3 baseline — historical; superseded)**:

`org.opengis.cite.ogcapiconnectedsystems10.listener.MaskingRequestLoggingFilter` — sibling of `CredentialMaskingFilter` in the same `listener/` subpackage. Sprint 3 baseline: Extends REST-Assured's `io.restassured.filter.log.RequestLoggingFilter`. **Sprint 6 reality**: the class still extends `RequestLoggingFilter` (for the constructor signature and any consumer code that does `instanceof`), but `filter()` no longer calls `super.filter()` — see approach (i) above for the canonical implementation.

```java
package org.opengis.cite.ogcapiconnectedsystems10.listener;

import io.restassured.filter.FilterContext;
import io.restassured.filter.log.RequestLoggingFilter;
import io.restassured.response.Response;
import io.restassured.specification.FilterableRequestSpecification;
import io.restassured.specification.FilterableResponseSpecification;

import java.io.PrintStream;
import java.util.Set;

/**
 * REST-Assured RequestLoggingFilter variant that masks credential-bearing headers
 * before they reach the underlying log stream.
 *
 * Closes the unmasked side-channel that the parallel CredentialMaskingFilter cannot.
 * Sprint 3 hardening per S-ETS-03-02; design.md §"Sprint 3 hardening: MaskingRequestLoggingFilter
 * wrap pattern (S-ETS-03-02)".
 */
public class MaskingRequestLoggingFilter extends RequestLoggingFilter {

    private final Set<String> headersToMask;

    public MaskingRequestLoggingFilter(Set<String> headersToMask, PrintStream stream) {
        super(stream);
        this.headersToMask = Set.copyOf(headersToMask);
    }

    @Override
    public Response filter(FilterableRequestSpecification requestSpec,
                           FilterableResponseSpecification responseSpec,
                           FilterContext ctx) {
        // Snapshot original header values, replace with masked equivalents for the
        // duration of the super.filter() call (which writes to the configured stream),
        // then restore originals so the actual HTTP request still carries the unmasked
        // credentials to the IUT.
        var originals = new java.util.HashMap<String, String>();
        for (String name : headersToMask) {
            String value = requestSpec.getHeaders().getValue(name);
            if (value != null) {
                originals.put(name, value);
                requestSpec.removeHeader(name);
                requestSpec.header(name, CredentialMaskingFilter.maskValue(value));
            }
        }
        try {
            return super.filter(requestSpec, responseSpec, ctx);
        } finally {
            // Restore originals — IUT MUST receive the real credentials.
            for (var entry : originals.entrySet()) {
                requestSpec.removeHeader(entry.getKey());
                requestSpec.header(entry.getKey(), entry.getValue());
            }
        }
    }
}
```

**Why subclass + temporary header swap (not chained-filter, not full-replacement)**:

1. **Subclass preserves all built-in formatting.** `RequestLoggingFilter` has 200+ LOC of payload-pretty-printing, multipart handling, query-string formatting, etc. Subclassing inherits all of it; only the header-emission step is intercepted via header swap.
2. **Chained-filter-with-registration-order (Pat's option (b)) is fragile.** It depends on REST-Assured invoking filters in registration order (which it does, currently — `io.restassured.internal.filter.FilterContextImpl`) but a future REST-Assured release could reorder filters via SPI annotations. Subclass-based composition is contractually stable.
3. **Replace-entirely (Pat's option (c)) is overkill.** Re-implementing 200+ LOC of formatting code for ~10 lines of masking gain creates a maintenance burden — every REST-Assured upgrade requires re-syncing the formatter. The 30-50 LOC subclass is the minimal touch.
4. **Header swap (vs payload mutation) is restorable.** The `try/finally` pattern guarantees the IUT receives the real credential header even if `super.filter()` throws; the masked headers exist only during the formatter's read.

**Wiring point**:

In `SuiteFixtureListener.onStart()`, REPLACE the bare `new RequestLoggingFilter(LogDetail.ALL)` registration (currently at design.md §171 "REST Assured request lifecycle") with the masking variant:

```java
// Before (Sprint 2):
RestAssured.filters(
    new RequestLoggingFilter(LogDetail.ALL),  // <-- unmasked side channel
    new CredentialMaskingFilter(Set.of("Authorization", "X-API-Key", "Cookie"))
);

// After (Sprint 3):
RestAssured.filters(
    new MaskingRequestLoggingFilter(
        Set.of("Authorization", "X-API-Key", "Cookie", "Set-Cookie", "Proxy-Authorization"),
        System.out
    ),
    new CredentialMaskingFilter(Set.of("Authorization", "X-API-Key", "Cookie"))  // parallel FINE log; defense-in-depth retained
);
```

The `CredentialMaskingFilter` registration is RETAINED as defense-in-depth (parallel FINE-level log is still useful for forensic review). Both filters operate independently; both must be registered.

**Header set rationale**:

The MaskingRequestLoggingFilter's mask set is a SUPERSET of CredentialMaskingFilter's: adds `Set-Cookie` (response side; the formatter logs response headers too) and `Proxy-Authorization` (rare but present in some CITE harness configs). The intersection is intentional — both filters mask Authorization/X-API-Key/Cookie because they are the highest-priority credentials and a defense-in-depth approach masks them at every observation point.

**Unit + integration test rules (per S-ETS-03-02 acceptance criteria)**:

- Unit tests in `src/test/java/.../listener/VerifyMaskingRequestLoggingFilter.java`: cover (a) Bearer 24-char masked in formatter output, (b) X-API-Key 16-char masked, (c) Set-Cookie response header masked in response logging, (d) IUT-side header restoration verified via `requestSpec.getHeaders().getValue()` after `filter()` returns, (e) try/finally restoration even when `super.filter()` throws (mock RuntimeException).
- Integration test (`scripts/verify-credential-leak.sh`): smoke-test.sh with synthetic `auth-credential=Bearer ABCDEFGH12345678WXYZ`; grep TestNG XML attachments + container logs + REST-Assured stdout for the literal `EFGH12345678WXYZ` (zero hits required); assert masked form `Bear...WXYZ` IS present (proving filter ran rather than dropping the header). This integration test was DEFERRED in Sprint 2 (Quinn cleanup CONCERN-1) and is now mandated by S-ETS-03-02.

**Risks**:

- **REST-Assured 5.6+ API drift.** `RequestLoggingFilter` constructor signature could change. Mitigation: lock REST-Assured version in pom.xml; the masking variant is a thin subclass that's easy to re-sync.
- **Header set drift.** New credential header names (e.g. `X-Auth-Token` from a future IUT) won't be masked unless added to the Set. Mitigation: integration test runs with a representative credential set per IUT; failures surface unmasked headers.
- **PrintStream choice.** `System.out` is the conventional REST-Assured target; some test runners may redirect it. Mitigation: SuiteFixtureListener configures the stream explicitly; tests can inject a `ByteArrayOutputStream` for assertion.

#### Unit + integration test rules (per S-ETS-02-04 acceptance criteria)

- Unit tests in `src/test/java/.../listener/VerifyCredentialMaskingFilter.java`: cover (a) Bearer 24-char masked correctly, (b) API key 16-char masked correctly, (c) credential < 8 chars fully redacted, (d) non-credential header pass-through.
- Integration test: smoke-test.sh with synthetic `auth-credential=Bearer ABCDEFGH12345678WXYZ`; grep TestNG XML attachments + container logs for the literal `EFGH12345678WXYZ` (zero hits required); also grep for the masked form `Bear...WXYZ` (must be present, proving filter ran rather than dropping the field entirely).

### ADR-001 cross-reference amendment

ADR-001 §Consequences ("**Positive**" bullet 2) originally claimed: "TeamEngine 5.6.1 production Docker image (`opengeospatial/teamengine-docker/teamengine-production` master, `teamengine.version=5.6.1`) loads the resulting jar without modification." Per ADR-007 §Context, this claim is empirically false for our JDK 17 ETS jar (production image runs JDK 8). 

Architect choses **option (i) — lightweight footnote amendment** (not full ADR-001 rewrite, not new ADR-001v2). The amendment adds a one-line cross-reference to ADR-007 in ADR-001's Consequences section, leaving the rest of ADR-001's content (which is correct about the SPI registration mechanics) untouched. Generator (Dana) applies the amendment as part of S-ETS-02-01 acceptance criterion #7.

Rationale for option (i) over (ii) full rewrite: ADR-001 is correct about the SPI registration mechanics (META-INF/services file, TestNGController class, ets.properties, testng.xml, CTL wrapper — all verified at runtime in S-ETS-01-03 smoke). Only the one parenthetical remark about "production Docker image loads it without modification" is wrong. A footnote is the lightest touch that preserves the historical record.

## Sprint 4 Ratifications (2026-04-29)

### Sprint 4 hardening: credential-leak E2E via stub IUT (S-ETS-04-03)

**Architect ratifies: option (a) stub IUT in `/tmp/`** — REJECTS option (b) authenticated IUT pivot (sacrifices hermeticity; CITE SC reviewers cannot reproduce without IUT credentials) and option (c) extended unit-layer fallback (already shipped in Sprint 3 `VerifyMaskingRequestLoggingFilter` unit tests; insufficient as E2E evidence per Quinn cumulative CONCERN-3 / Raze cumulative CONCERN-1 deeper-E2E gap).

Justification:

1. **Composability with S-ETS-04-04 sabotage-script bug fixes**. The Sprint 3 stub-server pattern (per ADR-010 §Decision option b) already exists in bash form at `scripts/verify-dependency-skip.sh`. S-ETS-04-04 fixes the known sabotage-script bugs (Pat enumerated; mostly mechanical). Extending the same stub-server to also echo the inbound `Authorization` header in a 401 response gives a single hermetic primitive that powers BOTH the dependency-skip verification AND the credential-leak verification — minimum new code.
2. **Hermeticity preserved**. `/tmp/` stub IUT has no network egress, no real credentials, no IUT-vendor coordination. The synthetic credential `Bearer ABCDEFGH12345678WXYZ` is the same Sprint 2 + Sprint 3 unit-test fixture; reusing it gives the integration test trivial reproducibility.
3. **The masking gap is a SIDE-CHANNEL gap, not an IUT-vendor-specific gap**. CredentialMaskingFilter + MaskingRequestLoggingFilter both operate against the outbound REST-Assured request lifecycle independent of which IUT receives the call. A stub IUT that simply records "yes, I received an Authorization header; here's what I saw verbatim" gives sufficient E2E coverage to assert the masking pipeline did its job without leaking the credential into TestNG XML attachments / container logs / REST-Assured stdout.

Reject (b): pivoting to an authenticated IUT (e.g. GeoRobotix with a leased credential) would (i) introduce vendor-coordination latency, (ii) leak a real credential into the project's test corpus (CITE SC submission risk), (iii) fail closed if IUT is offline. Reject (c): unit-layer tests don't exercise REST-Assured's actual request emission pipeline; insufficient as the deferred-from-Sprint-3 E2E evidence.

#### Stub IUT extension pattern

`scripts/stub-iut.sh` (NEW; or extend the Sprint 3 stub-server inline within `scripts/verify-credential-leak.sh`):

```bash
#!/usr/bin/env bash
# Sprint 4 stub IUT for credential-leak E2E verification.
# Echoes the inbound Authorization header back in the 401 response body so
# downstream test logic can assert "what the stub received" vs "what the logs
# / TestNG attachments captured" — proving the masking pipeline worked.
#
# Per design.md §"Sprint 4 hardening: credential-leak E2E via stub IUT (S-ETS-04-03)".

set -euo pipefail
PORT="${1:-0}"  # 0 = ephemeral; bind script writes resolved port to /tmp/stub-iut-port

python3 - <<'PYEOF' &
import http.server
import socketserver
import sys
import os

class StubIUT(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # Capture incoming Authorization header verbatim for echo-back.
        auth = self.headers.get("Authorization", "")
        body = f'{{"received_authorization": "{auth}"}}\n'.encode()
        self.send_response(401)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, format, *args):
        pass  # suppress access log

sock = socketserver.TCPServer(("127.0.0.1", 0), StubIUT)
port = sock.server_address[1]
with open("/tmp/stub-iut-port", "w") as f:
    f.write(str(port))
sock.serve_forever()
PYEOF

# Caller reads /tmp/stub-iut-port to discover the bound port; stub keeps running until killed.
echo "Stub IUT started on port $(cat /tmp/stub-iut-port)" >&2
```

#### E2E test flow

`scripts/verify-credential-leak.sh` (already mandated by S-ETS-03-02; Sprint 4 S-ETS-04-03 strengthens with stub-IUT integration):

1. Launch `scripts/stub-iut.sh` in background (binds ephemeral port; writes `/tmp/stub-iut-port`).
2. Run `scripts/smoke-test.sh` against the stub IUT with `-DiutUri=http://127.0.0.1:$(cat /tmp/stub-iut-port)` and synthetic credential `-Dauth-credential="Bearer ABCDEFGH12345678WXYZ"`.
3. Smoke completes (TestNG suite executes; Core landing-page assertion fails because stub returns 401 — expected; the test goal is the masking pipeline, not the assertion outcome).
4. Grep for the literal credential substring `EFGH12345678WXYZ` in:
   - `target/testng-results.xml` (zero hits required)
   - The container's stdout log (zero hits required) — fetched via `docker logs <container_id> > /tmp/container-log.txt`
   - REST-Assured's request-emission stdout if separately captured (zero hits required)
5. Grep for the masked form `Bear***WXYZ` in the same logs/attachments — at least one hit required (proves the masking filter ran rather than silently dropping the header).
6. **Cross-check via stub-IUT echo**: parse the stub IUT's 401 response body (preserved in the smoke run's TestNG attachments). Assert that the `received_authorization` field contains the FULL UNMASKED credential `Bearer ABCDEFGH12345678WXYZ` — proving REST-Assured restored the original header before HTTP transmission per the Sprint 3 try/finally pattern (so the IUT receives the credential as the user intended).
7. Tear down stub IUT (`kill $stub_pid`); cleanup `/tmp/stub-iut-port`.

This three-fold cross-check (logs masked + stub received unmasked + masked form present in logs) is the strongest possible hermetic evidence for the credential-masking pipeline.

#### Composability with S-ETS-04-04 sabotage-script fixes

S-ETS-04-04 fixes the Sprint 3 sabotage-script bugs (per Pat's enumeration: stub-server kill on script abort, port-collision retry, jar-restoration `trap` ordering). The fixes apply to `scripts/verify-dependency-skip.sh` AND propagate to the new `scripts/verify-credential-leak.sh` AND `scripts/stub-iut.sh`:

- The `trap cleanup EXIT` block extends to kill the stub-IUT process AND remove `/tmp/stub-iut-port`.
- The ephemeral-port allocation pattern (Python `socket.bind(('', 0))`) is the same in both scripts.
- The `ops/test-results/` archival pattern carries over (stub IUT logs archived per Sprint 4 close).

S-ETS-04-04 SHOULD ship BEFORE S-ETS-04-03 so the credential-leak script inherits the fixed primitives; Pat's deferred_to_generator sequencing already reflects this.

#### Acceptance criterion (S-ETS-04-03)

The Sprint 4 contract's `success_criteria.credential_leak_e2e_test_green` is satisfied when:

- `scripts/verify-credential-leak.sh` exits zero.
- `ops/test-results/sprint-ets-04-credential-leak-evidence.txt` archives: (i) the synthetic credential used, (ii) the stub-IUT received-authorization echo (full unmasked), (iii) the grep results from logs/attachments (zero unmasked + at least one masked), (iv) the cross-check verdict.
- A CI job runs the script on every PR + main push (per S-ETS-04-01 `ci_workflow_live_or_formally_dropped` outcome — if CI workflow is dropped per Path B, the script runs locally as a `make` target).

### Sprint 4 hardening: Subsystems conformance class scope (S-ETS-04-05)

**Architect ratifies: Sprint-1-style minimal — 4 @Test methods at Sprint 4 close** (parallel to SystemFeatures Sprint 2 §"SystemFeatures conformance class scope" + Common Sprint 3 baseline). Full per-class expansion deferred to Sprint 5+ when sibling classes (Procedures, Sampling, Properties, Deployments) are batched.

Pat enumerated 5 SCENARIOs in REQ-ETS-PART1-003 (now SPECIFIED in spec.md). Architect maps these to 4 @Test methods + 1 testng.xml-level wiring concern (the dependency-skip SCENARIO is `<dependencies>` config, not a method):

| @Test method | Asserts | SCENARIO closed |
|---|---|---|
| `subsystemsResourcesEndpointReturnsCollection` | `GET /systems/{id}/subsystems` → status 200; body has array `items` (or equivalent — Generator MUST curl-verify GeoRobotix's actual shape FIRST per acceptance criterion #1); SKIP-with-reason if 404 (IUT does not implement Subsystems) | SCENARIO-ETS-PART1-003-SUBSYSTEMS-RESOURCES-001 (CRITICAL) |
| `subsystemCanonicalEndpointReturnsBaseShape` | for the first subsystem item: has string `id`, string `type`, array `links` per REQ-ETS-CORE-004 base shape | SCENARIO-ETS-PART1-003-SUBSYSTEMS-CANONICAL-001 (NORMAL) |
| `subsystemHasParentSystemLink` | subsystem item's `links` array contains an entry with `rel="system"` (or equivalent OGC-defined relation referencing the parent system); this is the **UNIQUE-TO-SUBSYSTEMS** assertion — the architectural invariant that distinguishes subsystems from sibling collection types | SCENARIO-ETS-PART1-003-SUBSYSTEMS-PARENT-LINK-001 (NORMAL) |
| `subsystemHasCanonicalLink` | subsystem item's `links` array contains `rel="canonical"` (absence of `rel="self"` is NOT FAIL — preserves v1.0 GH#3 fix policy from Core landing page) | SCENARIO-ETS-PART1-003-SUBSYSTEMS-CANONICAL-URL-001 (NORMAL) |

The `dependsOnGroups="systemfeatures"` wiring (SCENARIO-ETS-PART1-003-SUBSYSTEMS-DEPENDENCY-SKIP-001 — CRITICAL) is a **testng.xml change**, not a @Test method — handled per ADR-010 v2 amendment (defense-in-depth: `<group depends-on>` extension in testng.xml + `@BeforeSuite` SkipException fallback in `SubsystemsTests`).

#### Subpackage layout

`org.opengis.cite.ogcapiconnectedsystems10.conformance.subsystems.SubsystemsTests` — single class for Sprint 4. Mirrors the Sprint 2 SystemFeaturesTests pattern (1:1 class:conformance-class structure). If Sprint 5+ expansion grows the @Test count beyond ~10, split into `SubsystemsCollectionTests` + `SubsystemsItemTests` (deferred per the SystemFeatures-pattern precedent at design.md §437 line 439).

#### Fixtures and listeners

No new fixtures or listeners needed for Sprint 4. The existing `SuiteFixtureListener` supplies `iutUri`. Subsystems' `@BeforeClass` performs `GET /systems` ONCE to extract a sample system `id`, then `GET /systems/{id}/subsystems` ONCE to cache the response shape — pattern mirrors `SystemFeaturesTests.fetchSystemsCollection()`.

If the `@BeforeSuite` SkipException fallback (per ADR-010 v2 amendment) activates, SuiteFixtureListener may need a small extension to populate `core.failed` / `systemfeatures.failed` SuiteAttribute keys via `ITestListener.onTestFailure` — Generator implements ONLY IF runtime verification shows TestNG transitive cascade does not work without it.

#### Coverage scope rationale (Sprint-1-style narrowing — third extension)

Pat recommended Sprint-1-style minimal for risk control on the third pattern extension AND first two-level dependency chain. Architect concurs because:

1. **First two-level dependency chain compounds risk surface.** Sprint 4 introduces TWO new architectural firsts simultaneously: (i) the third conformance-class extension, (ii) the first multi-level group-dependency chain. Minimizing per-class @Test count concentrates Generator + gate verification effort on the dependency-cascade verification (the riskier of the two firsts).
2. **The 4 chosen SCENARIOs cover the foundational shape** AND the unique-to-Subsystems `parent-system-link` assertion. The remaining ~3-5 ATS items in OGC 23-001 Annex A `/conf/subsystem/` (canonical-url depth, location-time geometry, cross-system queries, write operations, advanced filtering interactions) layer on top — once the foundation + two-level cascade are proven, expansion is mechanical AND batches cleanly with sibling classes.
3. **Beta gate doesn't require full per-class coverage.** Per the SystemFeatures rationale (§"Coverage scope rationale (Sprint-1-style narrowing)" line 453), CITE SC review approves on the basis of "the test class exists, runs, and produces deterministic verdicts" — depth comes during the 6-12 month beta period via passing-IUT outreach.
4. **GeoRobotix's `/systems/{id}/subsystems` shape is unknown until Generator curls it** (acceptance criterion #1 mandates curl-first). 4 @Tests adapt cleanly to whatever GeoRobotix returns; 12-15 would force structural choices we'd regret OR force a SKIP-with-reason cascade that breaks the demonstration of the multi-level dependency mechanism.
5. **GEOROBOTIX-SUBSYSTEMS-SHAPE-MISMATCH risk** (Pat surfaced; medium severity). If GeoRobotix returns 404 on `/systems/{id}/subsystems`, the entire Subsystems class SKIP-with-reasons (acceptable Sprint 4 outcome — the testng.xml two-level dependency wiring is still verified via the sabotage exec, which doesn't require IUT 200s). 4 @Tests narrow the scope of "what to SKIP gracefully if IUT doesn't implement Subsystems".

Sprint 5+ expansion targets (mechanical extensions, batched with Procedures/Sampling/Properties/Deployments siblings):

- `subsystemCanonicalUrlReturns200` — REQ-ETS-PART1-003 / `/req/subsystem/canonical-url` deeper assertion
- `subsystemHasGeometryAndValidTime` (NORMAL — `MAY` priority) — `/req/subsystem/location-time` if present in OGC 23-001 Annex A
- `subsystemAppearsInCollections` — cross-system query (parent-system-link inverse direction)
- Plus ~2-3 more covering filter-by-property and filter-by-time interactions

Architect estimates Sprint 5 Subsystems-expansion-bundled-with-Procedures/Sampling at ~6-8 hours Generator time (mechanical extensions across 3-4 sibling classes sharing the SystemFeatures dependency baseline).

#### What NOT to ship in Sprint 4

- **Subsystems write operations** (POST / PUT / DELETE on `/systems/{id}/subsystems`): REQ-ETS-PART1-010 (`create-replace-delete`) scope; deferred to Sprint 6+ per epic-ets-02 placeholder repositioning.
- **Cross-system query depth**: `GET /systems?subsystem.id=X` filtering not in Sprint 4 scope; covered by REQ-ETS-PART1-009 (`advanced-filtering`) when that class lands.
- **Subdeployments coverage**: REQ-ETS-PART1-005 (`subdeployments`) is a related-but-distinct OGC 23-001 conformance class; deferred to Sprint 5+ batching.
- **Common conformance class expansion** (4 → 8 @Tests per Quinn cumulative CONCERN-2): per-Pat-Sprint-4-conformance-class-pick rationale, this is "by-design minimal-then-expand" — explicit deferral to Sprint 5+ when user prioritizes batching with sibling classes.

## Status

**Approved for Sprint 1 + Sprint 2 + Sprint 3 + Sprint 4 ratifications**. Generator (Dana) may begin S-ETS-04-* work in Pat's recommended dependency order (S-ETS-04-04 → -01 → -03 → -02 → -05) per Sprint 4 contract `deferred_to_generator` block. Architect's 3 deferred decisions + 2 surfaced suggestions are now resolved; ADR-009 v2 amendment + ADR-010 v2 amendment + this Sprint 4 Ratifications section's stub-IUT credential-leak design + Subsystems coverage scope cover them.

The Sprint 1 + Sprint 2 + Sprint 3 ratifications above remain canonical. The S-ETS-01-03 CONCERNS verdict from Sprint 1 remains closed retroactively by ADR-007.
