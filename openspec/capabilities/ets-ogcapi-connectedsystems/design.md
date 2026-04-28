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
| TeamEngine SPI registration mechanics | ADR-001 |
| Schema bundling | ADR-002 |
| Java package + Maven coordinates | ADR-003 |
| Archetype modernization checklist | ADR-004 |
| Cross-repo relationship | ADR-005 |
| Logging stack (slf4j + logback) | Architecture §6 (no separate ADR per Pat's instruction — lower-stakes) |

## Status

**Approved for Sprint 1**. Generator (Dana) may begin S-ETS-01-01 immediately. S-ETS-01-02 unblocked once -01 lands a green-build Maven scaffold. S-ETS-01-03 unblocked once -02 produces a non-empty Core test class set.

The only CONCERNS verdict (S-ETS-01-03) does not block Generator — Generator may proceed with the four caveats listed and Quinn verifies them at evaluation time.
