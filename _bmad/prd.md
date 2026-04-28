# Product Requirements Document — OGC API CS API TeamEngine ETS

> Version: 2.0 | Status: Living Document | Last updated: 2026-04-27
>
> **Supersedes v1.1 (2026-03-31).** v1.1 framed the deliverable as a Next.js/TypeScript web application
> for ad-hoc CS API conformance assessment. The user pivoted on 2026-04-27 to a certification-track
> Executable Test Suite (ETS) for OGC TeamEngine. v1.0 of the web app shipped at HEAD `ab53658`
> (1003 Vitest unit tests, 9 epics, 39 stories, P0/P1 closed) and is **frozen** — no further sprint
> investment, README repositioned as a developer pre-flight tool. v2.0 of this PRD reflects the new
> primary deliverable. Discovery rationale is in `_bmad/product-brief.md` v2.0.
>
> **Doc-number resolution (Pat, 2026-04-27).** Part 1 = **OGC 23-001** (Feature Resources, approved
> 2025-06-02, published 2025-07-16). Part 2 = **OGC 23-002** (Dynamic Data, approved 2025-06-02,
> published 2025-07-16). Verified via `https://docs.ogc.org/is/23-002/23-002.html` and
> `https://docs.ogc.org/is/23-001/23-001.html`. The "IS 24-008" string in the
> `SomethingCreativeStudios/connected-systems-go` README is **incorrect**; the OGC docs portal
> returns 404 for `/is/24-008/`. All Part 2 REQ-* IDs in this PRD reference OGC 23-002.

---

## Product Vision

A Java/TestNG Executable Test Suite that an OGC API – Connected Systems server implementer can
run inside TeamEngine 5.6.x (currently 5.6.1) (locally via Docker, or on `cite.opengeospatial.org/teamengine/`) to
obtain a per-conformance-class pass/fail verdict with full HTTP request/response traces, a
machine-readable EARL/JSON report, and — via the OGC CITE governance process — eventually an
OGC compliance badge. The ETS is the certification deliverable; the v1.0 web app remains as a
shift-left developer pre-flight tool.

## Stakeholders

| Role | Interest |
|------|----------|
| CS API server implementers (OpenSensorHub, GeoRobotix, connected-systems-go, vendor stacks) | Pass an OGC-recognised compliance test as evidence of conformance |
| OGC CITE SubCommittee | Review and approve the ETS as a Compliance Test Package (CTP) |
| OGC Connected Systems SWG | Reference implementation of their abstract test suite, validating the standard's clarity |
| TeamEngine maintainers | Reduce per-ETS integration friction; this ETS is greenfield, not migration |
| Project sponsor | Establish credibility in the OGC ecosystem; ship the first CS API ETS |

## Success Criteria

| ID | Criterion | Measure |
|----|-----------|---------|
| SC-1 | Maven archetype scaffold builds green | `mvn clean install` exits 0 on a fresh JDK 17 / Maven 3.9 environment |
| SC-2 | All 14 OGC 23-001 (Part 1) conformance classes have at least one TestNG test method per ATS assertion | TestNG report shows ≥1 `@Test` per `/conf/<class>/<assertion>` URI from Annex A |
| SC-3 | All 14 OGC 23-002 (Part 2) conformance classes have at least one TestNG test method per ATS assertion | Same, against Part 2 Annex A |
| SC-4 | ETS loads in TeamEngine 5.6.x (currently 5.6.1) Docker image without registration error | `docker run ogccite/teamengine-production:5.6.1` plus the ETS jar shows the suite in the suites list |
| SC-5 | Full Part 1 + Part 2 suite passes against GeoRobotix demo server | All `@Test` methods that target conformance classes the IUT declares pass; conformance classes the IUT does not declare are SKIPPED, not FAILED |
| SC-6 | Three independent passing implementations identified | GeoRobotix + OpenSensorHub + `connected-systems-go` participate in beta testing, each producing a TeamEngine pass record |
| SC-7 | ETS submitted to OGC CITE SC for beta status | CITE SC ticket open; ETS jar published to OSSRH/Maven Central |
| SC-8 | URI-mapping fidelity preserved from TS web app | Every canonical OGC requirement URI in `csapi_compliance/src/engine/registry/*.ts` has a Java `@Test` method whose `description` attribute or `requirement-uri` annotation contains the same URI |
| SC-9 | Spec-trap fixtures preserved | The asymmetric `featureType`/`itemType` corpus (~30-50 cases) ports as TestNG `@DataProvider` inputs, exercised by at least one `@Test` per fixture |
| SC-10 | OGC OpenAPI YAML pinned by commit SHA | `pom.xml` references the OGC `ogcapi-connected-systems` repo at a specific commit, not `master`; pin recorded in `ops/server.md` |

## Constraints

- **Language and toolchain are not negotiable**. JDK 17 + Maven 3.9 + TestNG + REST Assured + Kaizen `openapi-parser` + `org.opengis.cite:ets-common:17`. CTL is legacy, rejected. Non-Java (Node, Go, Python) is rejected — TeamEngine SPI is Java.
- **Repository topology**. New sibling repo `ets-ogcapi-connectedsystems10` (Part 1) lives in our org first; propose contribution to OGC at beta milestone (R-PIVOT-01 user gate 2026-04-27). Part 2 may be a second sibling repo `ets-ogcapi-connectedsystems-2` per OGC convention (see `ets-ogcapi-features10-part2`).
- **First-cut scope is Part 1**. Sprint 1 implements archetype scaffold + CS API Core conformance class only. Part 2 work is explicitly deferred to a later sprint cluster (R-PIVOT-04 placeholder REQs only).
- **Web app is frozen**. The csapi_compliance repo at HEAD `ab53658` ships unchanged except for a README reposition (R-PIVOT-10). No new features, no maintenance sprints. JSON Schemas may be updated when CS API errata land; that is a maintenance task, not a feature.
- **OGC governance is out of our control**. CITE SC review velocity, TC voting cycles, and the three-implementation rule are external dependencies. Code-complete ETS is reachable in 1-2 quarters; official release is 3-7 quarters out.
- **No persistent server state**. The ETS is a stateless test-suite jar. State (test runs, results, reports) is owned by TeamEngine. We do not build a database, an Express server, or a UI.

## Functional Requirements

> **Capability mapping**: all FRs below map to a single new capability `ets-ogcapi-connectedsystems`
> at `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`. Existing v1.0 capabilities
> (endpoint-discovery, conformance-testing, dynamic-data-testing, test-engine, request-capture,
> reporting, export, progress-session) are **frozen** and do not gain new FRs.

### Sub-deliverable 1: Maven Archetype Scaffold (R-PIVOT-01, R-PIVOT-02)

| ID | Requirement | OpenSpec REQ |
|----|-------------|--------------|
| FR-ETS-01 | The deliverable SHALL be a Maven project generated from `org.opengis.cite:ets-archetype-testng:2.7` with `groupId=org.opengis.cite`, `artifactId=ets-ogcapi-connectedsystems10`, `ets-code=ogcapi-connectedsystems10`, `ets-title='OGC API - Connected Systems Part 1'`. | REQ-ETS-SCAFFOLD-001 |
| FR-ETS-02 | The generated `pom.xml` SHALL declare JDK 17 source/target compatibility (`maven.compiler.source=17`, `maven.compiler.target=17`) and Maven 3.9+ as the build minimum. | REQ-ETS-SCAFFOLD-002 |
| FR-ETS-03 | The project layout SHALL mirror `opengeospatial/ets-ogcapi-features10`: TestNG suite XML at `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/testng.xml`, CTL wrapper at `src/main/scripts/ctl/`, AsciiDoc site documentation at `src/site/`, `Dockerfile` and `Jenkinsfile` at repo root. | REQ-ETS-SCAFFOLD-003 |
| FR-ETS-04 | Dependencies SHALL include: `org.opengis.cite:ets-common:17`, `org.opengis.cite.teamengine:teamengine-spi`, `org.testng:testng`, `io.rest-assured:rest-assured`, `com.reprezen.kaizen:openapi-parser`, `org.locationtech.jts:jts-core`, `org.locationtech.proj4j:proj4j`. Versions SHALL be pinned to specific releases; no `RELEASE` or `LATEST` ranges. | REQ-ETS-SCAFFOLD-004 |
| FR-ETS-05 | `mvn clean install` SHALL exit 0 on a clean checkout against JDK 17. The build SHALL be reproducible: two builds from the same commit produce byte-identical jars (excluding timestamps in `META-INF/`). | REQ-ETS-SCAFFOLD-005 |
| FR-ETS-06 | The archetype-generated scaffold SHALL be modernized: any 2019-era dependency versions known to have security advisories or JDK-17 incompatibilities SHALL be bumped, with each bump documented as an ADR. | REQ-ETS-SCAFFOLD-006 |
| FR-ETS-07 | The repository SHALL be hosted in our org first at `github.com/<org>/ets-ogcapi-connectedsystems10`. A draft contribution proposal to OGC SHALL be prepared at the beta milestone but NOT before. | REQ-ETS-SCAFFOLD-007 |

### Sub-deliverable 2: CS API Part 1 Conformance Classes (R-PIVOT-03, OGC 23-001)

The 14 OGC 23-001 conformance classes (verified against `docs.ogc.org/is/23-001/23-001.html` Annex A on 2026-04-27):

| Conformance class URI | FR | OpenSpec REQ |
|---|---|---|
| `/conf/core` (CS API Core — landing page, conformance, base resource shape) | FR-ETS-10 | REQ-ETS-CORE-001 |
| `/conf/common` (CS API Common — link relations, content negotiation) | FR-ETS-11 | REQ-ETS-PART1-001 |
| `/conf/system-features` | FR-ETS-12 | REQ-ETS-PART1-002 |
| `/conf/subsystems` | FR-ETS-13 | REQ-ETS-PART1-003 |
| `/conf/deployment-features` | FR-ETS-14 | REQ-ETS-PART1-004 |
| `/conf/subdeployments` | FR-ETS-15 | REQ-ETS-PART1-005 |
| `/conf/procedure-features` | FR-ETS-16 | REQ-ETS-PART1-006 |
| `/conf/sampling-features` | FR-ETS-17 | REQ-ETS-PART1-007 |
| `/conf/property-definitions` | FR-ETS-18 | REQ-ETS-PART1-008 |
| `/conf/advanced-filtering` | FR-ETS-19 | REQ-ETS-PART1-009 |
| `/conf/create-replace-delete` | FR-ETS-20 | REQ-ETS-PART1-010 |
| `/conf/update` | FR-ETS-21 | REQ-ETS-PART1-011 |
| `/conf/geojson` | FR-ETS-22 | REQ-ETS-PART1-012 |
| `/conf/sensorml` | FR-ETS-23 | REQ-ETS-PART1-013 |

| ID | Requirement |
|----|-------------|
| FR-ETS-10 | Each `@Test` method in the `core` suite SHALL have a `description` attribute of the form `OGC-23-001 /req/core/<assertion>` and SHALL produce one of: pass (assertion satisfied), fail (assertion violated, with a structured failure message naming the requirement URI and the IUT response excerpt), skip (declared not-conformant by the IUT's `/conformance` declaration, OR a prerequisite class failed). |
| FR-ETS-11..23 | Each Part 1 conformance class beyond Core SHALL be implemented as a separate TestNG suite class, structured per FR-ETS-10. Suite ordering follows the dependency DAG inherited from `csapi_compliance/src/engine/registry/index.ts`. |
| FR-ETS-24 | If a conformance class B depends on class A and class A produces any FAIL verdict, class B's `@BeforeSuite` SHALL throw `SkipException` and B's tests SHALL emit `SKIP — dependency /conf/<A> not satisfied`. |
| FR-ETS-25 | Each test SHALL capture full HTTP request and response (method, URL, headers, body, status, response time) in the TestNG report attachments. Authentication credentials SHALL be masked per the v1.0 web app's `CredentialMasker` semantics (first 4 + last 4 characters only). |
| FR-ETS-26 | Schema validation SHALL use `com.reprezen.kaizen:openapi-parser` against the OGC OpenAPI YAML pinned by commit SHA in `pom.xml`. Bundled JSON Schemas at `csapi_compliance/schemas/` SHALL be reused verbatim, copied into `src/main/resources/schemas/` of the new repo. |

### Sub-deliverable 3: CS API Part 2 Conformance Classes (R-PIVOT-04, OGC 23-002)

> **Sprint 1 EXCLUDES Part 2.** REQ-ETS-PART2-* are placeholders allowing the spec to enumerate
> the certification surface. Per-class FRs and SCENARIOs will be drafted in a later sprint cluster.

| Conformance class URI (per OGC 23-002 Annex A — names follow v1.0 PRD FR-46..59) | FR | OpenSpec REQ |
|---|---|---|
| `/conf/api-common` (Part 2 Common) | FR-ETS-30 | REQ-ETS-PART2-001 |
| `/conf/datastream` (Datastreams & Observations) | FR-ETS-31 | REQ-ETS-PART2-002 |
| `/conf/controlstream` (Control Streams & Commands) | FR-ETS-32 | REQ-ETS-PART2-003 |
| `/conf/feasibility` (Command Feasibility) | FR-ETS-33 | REQ-ETS-PART2-004 |
| `/conf/system-event` (System Events) | FR-ETS-34 | REQ-ETS-PART2-005 |
| `/conf/system-history` (System History) | FR-ETS-35 | REQ-ETS-PART2-006 |
| `/conf/advanced-filtering` (Part 2) | FR-ETS-36 | REQ-ETS-PART2-007 |
| `/conf/create-replace-delete` (Part 2) | FR-ETS-37 | REQ-ETS-PART2-008 |
| `/conf/update` (Part 2) | FR-ETS-38 | REQ-ETS-PART2-009 |
| `/conf/json` (Part 2 JSON encoding) | FR-ETS-39 | REQ-ETS-PART2-010 |
| `/conf/swecommon-json` | FR-ETS-40 | REQ-ETS-PART2-011 |
| `/conf/swecommon-text` | FR-ETS-41 | REQ-ETS-PART2-012 |
| `/conf/swecommon-binary` | FR-ETS-42 | REQ-ETS-PART2-013 |
| `/conf/observation-binding` (cross-class — Observation body schema derives from Datastream schema, per v1.0 GH#7) | FR-ETS-43 | REQ-ETS-PART2-014 |

| ID | Requirement |
|----|-------------|
| FR-ETS-30..43 | Same shape as FR-ETS-10..23 (TestNG suite class per conformance class, `description` attribute carries the OGC requirement URI, dependency-aware skip semantics, captured HTTP traces, schema validation via Kaizen). Detailed per-assertion FRs to be drafted in a future sprint cluster. |

### Sub-deliverable 4: TeamEngine Integration (R-PIVOT-07)

| ID | Requirement | OpenSpec REQ |
|----|-------------|--------------|
| FR-ETS-50 | The ETS SHALL register with TeamEngine 5.6.x (currently 5.6.1) via the TestNG SPI (`org.opengis.cite.teamengine.spi.TestSuite` plus `META-INF/services/` registration). | REQ-ETS-TEAMENGINE-001 |
| FR-ETS-51 | A CTL wrapper at `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl` SHALL expose the suite to TeamEngine's CTL UI, accepting `iut-url` (CS API landing page) and optional `auth` parameters. | REQ-ETS-TEAMENGINE-002 |
| FR-ETS-52 | A `Dockerfile` SHALL produce an image based on `ogccite/teamengine-production:5.6.1` with the ETS jar pre-installed at `/opt/teamengine/webapps/teamengine/WEB-INF/lib/`. | REQ-ETS-TEAMENGINE-003 |
| FR-ETS-53 | A `docker-compose.yml` snippet SHALL bring up TeamEngine + this ETS at `http://localhost:8081/teamengine/` with no additional host dependencies. | REQ-ETS-TEAMENGINE-004 |
| FR-ETS-54 | The TeamEngine integration SHALL be verifiable via a smoke test: a single-command Docker invocation against GeoRobotix that produces a non-empty TestNG report and zero suite-registration errors. | REQ-ETS-TEAMENGINE-005 |

### Sub-deliverable 5: Spec-Trap Fixture Port (R-PIVOT-06)

| ID | Requirement | OpenSpec REQ |
|----|-------------|--------------|
| FR-ETS-60 | The asymmetric `featureType`/`itemType` corpus from `csapi_compliance/tests/fixtures/spec-traps/` (~30-50 cases) SHALL be ported into Java classes implementing `org.testng.annotations.DataProvider`. Each fixture SHALL retain its original case ID and rationale comment. | REQ-ETS-FIXTURES-001 |
| FR-ETS-61 | At least one `@Test` per Part 1 conformance class that has a corresponding spec-trap fixture SHALL be parameterized with that `@DataProvider`. | REQ-ETS-FIXTURES-002 |
| FR-ETS-62 | The fixture port SHALL be verifiable via a comparison script that diffs the case-ID list in TS source vs Java source and reports any case dropped during the port. | REQ-ETS-FIXTURES-003 |

### Sub-deliverable 6: CITE Submission Process (R-PIVOT-08, R-PIVOT-12)

| ID | Requirement | OpenSpec REQ |
|----|-------------|--------------|
| FR-ETS-70 | The Maven artifact SHALL be published to OSSRH/Maven Central as `org.opengis.cite:ets-ogcapi-connectedsystems10:<version>` at the beta milestone (NOT before). GPG signing keys are recorded in `ops/server.md`. | REQ-ETS-CITE-001 |
| FR-ETS-71 | At the beta milestone, an outreach package SHALL be produced for OpenSensorHub and `SomethingCreativeStudios/connected-systems-go` requesting participation in CITE three-implementation testing. The package contains: a Docker quickstart, a sample report from GeoRobotix, and the OGC CITE governance reference (Policy 08-134r11). | REQ-ETS-CITE-002 |
| FR-ETS-72 | A CITE SubCommittee submission ticket SHALL be filed at `github.com/opengeospatial/cite/issues` referencing the published Maven artifact, the three-implementation roster, and the requested beta-status milestone. | REQ-ETS-CITE-003 |

### Sub-deliverable 7: Web-App Freeze (R-PIVOT-10)

| ID | Requirement | OpenSpec REQ |
|----|-------------|--------------|
| FR-ETS-80 | The `csapi_compliance` README SHALL be repositioned to describe the project as a "developer pre-flight tool, not certification-track," with a prominent link to the new ETS repo. The v1.0 release SHALL be tagged `v1.0-frozen` at HEAD `ab53658`. | REQ-ETS-WEBAPP-FREEZE-001 |

### Sub-deliverable 8: Spec-Knowledge Sync (R-PIVOT-11)

| ID | Requirement | OpenSpec REQ |
|----|-------------|--------------|
| FR-ETS-90 | A diff script SHALL exist that lists every canonical OGC requirement URI in `csapi_compliance/src/engine/registry/*.ts` and compares it against the URI list extracted from Java `@Test` `description` attributes in the new ETS. CI SHALL fail if any URI is in TS but not in Java (or vice versa) without an explicit allowlist entry. | REQ-ETS-SYNC-001 |

## Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-ETS-01 | Build reproducibility | `mvn clean install` produces byte-identical jars from the same commit, ignoring `META-INF/` timestamps. Verified by a CI job that builds twice and diffs. |
| NFR-ETS-02 | JDK 17 compatibility | Source compiles cleanly with JDK 17; no JDK 11 / JDK 8 fallback. |
| NFR-ETS-03 | Test pass rate against GeoRobotix | ≥95% of `@Test` methods targeting GeoRobotix-declared conformance classes pass; the residual ≤5% have documented IUT-side issues filed against GeoRobotix. |
| NFR-ETS-04 | TeamEngine load time | The ETS jar registers with TeamEngine 5.6.x (currently 5.6.1) and is selectable in the suite list within 30 seconds of container start. |
| NFR-ETS-05 | Test execution throughput | The full Part 1 suite completes within 10 minutes against a responsive IUT (parity with v1.0 NFR-03 measured baseline of ~0.1 min). |
| NFR-ETS-06 | Reproducible across environments | `mvn clean install` succeeds on Linux (Ubuntu 22.04 / Debian 12), macOS (latest), and Windows (via WSL2). CI runs all three. |
| NFR-ETS-07 | Schema pin freshness | The OGC OpenAPI YAML commit SHA pin SHALL be reviewed quarterly; pin updates SHALL be ADR-tracked. |
| NFR-ETS-08 | Credential security | Auth credentials passed via TeamEngine UI are held only in test-method-scope memory; never logged, never written to TestNG reports unmasked. Equivalent to v1.0 NFR-05. |
| NFR-ETS-09 | Error resilience | An individual test that hits a network error or unexpected response SHALL fail with a structured message and not abort the suite. Equivalent to v1.0 NFR-10. |
| NFR-ETS-10 | Logging | Suite execution emits structured logs (slf4j + logback) with no credential leakage. Equivalent to v1.0 NFR-11. |
| NFR-ETS-11 | Docker single-command deployment | `docker-compose up` brings TeamEngine + the ETS to a working state with no additional host dependencies. |
| NFR-ETS-12 | Code coverage (Java) | ≥80% line coverage on `src/main/java/org/opengis/cite/ogcapiconnectedsystems10/` measured by JaCoCo. Parity with v1.0 NFR-13. |
| NFR-ETS-13 | Asciidoc site documentation builds | `mvn site` produces a navigable HTML site at `target/site/` with at least: overview, conformance class list, how-to-run-locally, how-to-submit-a-bug. |
| NFR-ETS-14 | Maven Central publish readiness | `mvn deploy -P release` succeeds against a sandbox staging repository at the beta milestone. |
| NFR-ETS-15 | OGC convention conformance | Repository structure matches `opengeospatial/ets-ogcapi-features10` to within the diff that the difference in spec subject naturally requires. Verified by a structural-diff checklist. |

## Interface Contracts

| Interface | Protocol | Notes |
|-----------|----------|-------|
| TeamEngine ↔ ETS | Java SPI (`org.opengis.cite.teamengine.spi`) | TeamEngine loads the ETS jar at startup, discovers suites via `META-INF/services/`, exposes them in the CTL UI. |
| TeamEngine ↔ User | HTTP (CTL form + REST) | TeamEngine renders the CTL form; user supplies `iut-url`, optional auth. ETS receives those as TestNG suite parameters. |
| ETS ↔ IUT | HTTP/HTTPS via REST Assured | Test methods issue GET/POST/PUT/PATCH/DELETE against the IUT, carrying user-provided auth. |
| ETS ↔ JSON Schemas | File-system (classpath) | Schemas bundled at `src/main/resources/schemas/` are loaded by Kaizen `openapi-parser` and used for response-body validation. |
| ETS ↔ OpenAPI YAML | Git submodule OR Maven dependency on a YAML-only artifact | Pinned to a specific OGC `ogcapi-connected-systems` commit SHA. Pin recorded in `pom.xml` and `ops/server.md`. |
| Build pipeline ↔ Maven Central | OSSRH staging via `mvn deploy` | At beta milestone only; requires GPG signing key and OSSRH credentials in CI secrets. |
| CI ↔ TeamEngine 5.6.x (currently 5.6.1) Docker | Docker `ogccite/teamengine-production:5.6.1` | Smoke-test job pulls the image, mounts the ETS jar, runs the suite against GeoRobotix, archives the report. |

## OpenSpec Capability Mapping

The new capability is `ets-ogcapi-connectedsystems` at `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`.

| Sub-deliverable | OpenSpec REQ-* range |
|---|---|
| Scaffold | REQ-ETS-SCAFFOLD-001..007 |
| Part 1 Core | REQ-ETS-CORE-001..004 |
| Part 1 (other 13 classes) | REQ-ETS-PART1-001..013 |
| Part 2 (14 classes — placeholders) | REQ-ETS-PART2-001..014 |
| TeamEngine integration | REQ-ETS-TEAMENGINE-001..005 |
| Spec-trap fixture port | REQ-ETS-FIXTURES-001..003 |
| CITE submission | REQ-ETS-CITE-001..003 |
| Web-app freeze | REQ-ETS-WEBAPP-FREEZE-001 |
| Spec-knowledge sync | REQ-ETS-SYNC-001 |

### v1.0 Web-App Capability Status

| Capability | Status | Notes |
|---|---|---|
| `endpoint-discovery` | Frozen v1.0 | Web-app only; no ETS counterpart needed (TeamEngine handles IUT input). |
| `conformance-testing` | Frozen v1.0 | Logic ports as design reference; superseded by `ets-ogcapi-connectedsystems`. |
| `dynamic-data-testing` | Frozen v1.0 | Same — design reference for Part 2 ETS classes. |
| `test-engine` | Frozen v1.0 | Web-app only; superseded by TestNG in the ETS. |
| `request-capture` | Frozen v1.0 | Web-app only; TeamEngine + TestNG attachments cover this. |
| `reporting` | Frozen v1.0 | Web-app only; superseded by TestNG/EARL output. |
| `export` | Frozen v1.0 | Web-app only; TeamEngine HTML/EARL export covers this. |
| `progress-session` | Frozen v1.0 | Web-app only; TeamEngine session model supersedes. |

## Epic Decomposition

| Epic | Goal | Scope |
|---|---|---|
| `epic-ets-01-scaffold` | Generate archetype, modernize to JDK 17, build green | REQ-ETS-SCAFFOLD-001..007, NFR-ETS-01,02,06 |
| `epic-ets-02-part1-classes` | Implement all 14 Part 1 conformance classes | REQ-ETS-CORE-001..004, REQ-ETS-PART1-001..013 |
| `epic-ets-03-part2-classes` | Implement all 14 Part 2 conformance classes | REQ-ETS-PART2-001..014 |
| `epic-ets-04-teamengine-integration` | SPI + CTL + Docker | REQ-ETS-TEAMENGINE-001..005 |
| `epic-ets-05-cite-submission` | Beta submission, three-impl outreach | REQ-ETS-CITE-001..003 |
| `epic-ets-06-fixture-port` | Port spec-trap corpus to `@DataProvider` | REQ-ETS-FIXTURES-001..003 |
| `epic-ets-07-webapp-freeze` | README reposition, freeze tag | REQ-ETS-WEBAPP-FREEZE-001 |

The v1.0 epics 01-09 are **closed** — see each epic file's status header. They map to the v1.1 PRD in
the matrix at the bottom of `_bmad/traceability.md` (v1.0 frozen section).

## Open Questions Resolved by Pat (2026-04-27)

1. **Part 2 doc number**: **OGC 23-002** confirmed authoritative. The `connected-systems-go` README's "IS 24-008" is incorrect (docs.ogc.org returns 404 for 24-008). All Part 2 REQs reference 23-002.
2. **CI/CD topology**: **GitHub Actions for our development; Jenkinsfile checked in as a stub for OGC submission compatibility.** The Jenkinsfile is configured but not wired to an active Jenkins instance; it is a structural requirement of OGC convention (see `ets-ogcapi-features10/Jenkinsfile`). Architect to confirm at design time.
3. **Maven Central publish timing**: **Beta milestone (R-PIVOT-08).** Local snapshots and OSSRH staging are sufficient for sprints 1..N; production Maven Central publishes only when the ETS is ready for CITE SC submission. Avoids the "pollute Maven Central with pre-beta noise" failure mode.
4. **Test data hosting layout**: **`src/main/resources/data/`** for sample SensorML + SWE Common payloads, mirroring `ets-ogcapi-features10`. Spec-trap fixtures live alongside test code at `src/test/resources/fixtures/spec-traps/`. Architect to confirm during ADR.

## Deferred to Architect (Alex)

- TeamEngine SPI registration mechanics (the testng-essentials docs defer details to a "Part 2" that is not yet linked).
- Whether to symlink, submodule, or fork the JSON Schemas from `csapi_compliance/schemas/` into the new repo.
- Java package naming: candidate `org.opengis.cite.ogcapiconnectedsystems10` per `org.opengis.cite.ogcapi.features10` precedent. Architect ratifies.
- Logging/reporting framework choice (slf4j + logback assumed; Architect confirms vs `ets-common`'s defaults).

## Change Control

| Date | Version | Change | Trigger |
|---|---|---|---|
| 2026-03-31 | 1.0 | Initial PRD: Next.js/TypeScript web app, 9 epics | Project kickoff |
| 2026-03-31 | 1.1 | Added Epic 09 (Part 2 dynamic data), 14 new FRs | Mid-project scope expansion |
| 2026-04-27 | 2.0 | Full rewrite: pivot from web app to Java/TestNG TeamEngine ETS. v1.0 web app frozen. New capability `ets-ogcapi-connectedsystems`. | User pivot 2026-04-27, Discovery handoff 2026-04-27 |
