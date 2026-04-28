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

**Implementation reality** (reconciled 2026-04-28T22:50Z post-Raze CONCERN-1 on Sprint 2 cleanup gate): the `CredentialMaskingFilter` does NOT mutate the outgoing REST-Assured request/response payloads (mutating Authorization headers in-flight would break authenticated IUT calls). Instead, it observes via REST-Assured's `Filter` SPI and emits a **parallel FINE-level masked log entry** alongside REST-Assured's built-in `RequestLoggingFilter` output. The filter's masking applies only to the parallel log entry; REST-Assured's own request/response logger (if attached) emits unmasked headers as a side effect. **Defense-in-depth**: logback's pattern intentionally omits `%X{*}` MDC dump, and the architect's `should` constraint #3 directs operators to attach the masking filter, NOT REST-Assured's `RequestLoggingFilter`, in any production-like configuration. **Sprint 3 hardening**: wrap or replace REST-Assured's `RequestLoggingFilter` with a masking variant so the unmasked side channel is closed; until then, the integration test (synthetic-credential smoke + zero-leak grep) is deferred and the logback pattern is the primary leak-prevention layer.

#### Unit + integration test rules (per S-ETS-02-04 acceptance criteria)

- Unit tests in `src/test/java/.../listener/VerifyCredentialMaskingFilter.java`: cover (a) Bearer 24-char masked correctly, (b) API key 16-char masked correctly, (c) credential < 8 chars fully redacted, (d) non-credential header pass-through.
- Integration test: smoke-test.sh with synthetic `auth-credential=Bearer ABCDEFGH12345678WXYZ`; grep TestNG XML attachments + container logs for the literal `EFGH12345678WXYZ` (zero hits required); also grep for the masked form `Bear...WXYZ` (must be present, proving filter ran rather than dropping the field entirely).

### ADR-001 cross-reference amendment

ADR-001 §Consequences ("**Positive**" bullet 2) originally claimed: "TeamEngine 5.6.1 production Docker image (`opengeospatial/teamengine-docker/teamengine-production` master, `teamengine.version=5.6.1`) loads the resulting jar without modification." Per ADR-007 §Context, this claim is empirically false for our JDK 17 ETS jar (production image runs JDK 8). 

Architect choses **option (i) — lightweight footnote amendment** (not full ADR-001 rewrite, not new ADR-001v2). The amendment adds a one-line cross-reference to ADR-007 in ADR-001's Consequences section, leaving the rest of ADR-001's content (which is correct about the SPI registration mechanics) untouched. Generator (Dana) applies the amendment as part of S-ETS-02-01 acceptance criterion #7.

Rationale for option (i) over (ii) full rewrite: ADR-001 is correct about the SPI registration mechanics (META-INF/services file, TestNGController class, ets.properties, testng.xml, CTL wrapper — all verified at runtime in S-ETS-01-03 smoke). Only the one parenthetical remark about "production Docker image loads it without modification" is wrong. A footnote is the lightest touch that preserves the historical record.

## Status

**Approved for Sprint 1 + Sprint 2 ratifications**. Generator (Dana) may begin S-ETS-02-* work in dependency order per Sprint 2 contract. The 4 architectural deferrals + 2 surfaced questions are now resolved; ADRs 006, 007, 008, 009 + this section's CredentialMaskingFilter rules + ADR-001 cross-reference amendment cover them.

The S-ETS-01-03 CONCERNS verdict from Sprint 1 is closed retroactively by ADR-007 (the deviation it flagged is now ratified).
