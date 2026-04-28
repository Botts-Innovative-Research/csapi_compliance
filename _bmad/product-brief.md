# Product Brief — OGC CS API Conformance: TeamEngine ETS

> Version: 2.0 | Status: Draft | Last updated: 2026-04-27
> Author: Discovery Agent (Mary)
> Triggered by: User pivot to TeamEngine ETS, 2026-04-27

> **Supersedes v1.1 (2026-03-31).** v1.1 framed the problem as "build a standalone web app to fill the CS API compliance gap." v1.1 itself observed that "no ETS exists yet for CS API on the OGC Validator" but did not weigh whether the right response was a web app or an ETS. The user, after shipping v1.0 of the web app at HEAD `ab53658` (1003 unit tests, 9 epics, 39 stories), now believes the response should have been an ETS for OGC TeamEngine. This brief evaluates that pivot.

---

## User Decisions (2026-04-27, post-Discovery gate)

The user reviewed v2.0 of this brief and the Discovery handoff, and resolved Mary's three explicit gating questions before Planner runs:

| Decision | Resolution | Source |
|---|---|---|
| **Repo topology** | Sibling repo `ets-ogcapi-connectedsystems10` (Approach A as recommended). Develop in our own org; propose contribution to OGC at beta milestone. | User confirm 2026-04-27 |
| **First-cut scope** | Part 1 first, Part 2 follows. Smaller vertical slice; mirrors Approach A's phasing. | User confirm 2026-04-27 |
| **Web-app fate** | Freeze v1.0 at HEAD `ab53658`. Reposition README as "developer pre-flight tool, not certification-track." No further sprint investment on the TS web app. | User confirm 2026-04-27 |

The user also **named the third candidate implementation** for the OGC three-implementation rule (Risks #3): `https://github.com/SomethingCreativeStudios/connected-systems-go` — a Go implementation (99.7% Go, GORM + PostgreSQL/PostGIS) claiming both Part 1 and Part 2 conformance, referencing IS 23-001 and IS 24-008. **Caveat for Pat**: this brief uses doc number OGC 23-002 for Part 2 (per Mary's research); the connected-systems-go README cites IS 24-008. Pat must verify which is current — the discrepancy may reflect IS-as-published vs WG-draft numbering, or one is stale. Do not let this propagate untraced into REQ-* drafts.

The three-implementation pool is therefore:
1. GeoRobotix demo server (`api.georobotix.io/ogc/t18/api`) — already used as IUT for the v1.0 web app, known to pass.
2. OpenSensorHub — confirmed by user as a candidate.
3. `SomethingCreativeStudios/connected-systems-go` — confirmed by user as a candidate; needs an outreach step to secure participation in beta testing.

This downgrades Risks #3 from "third implementation may not exist" (medium) to "third implementation candidate identified, beta participation must be secured" (low-medium).

---

## Problem Statement

OGC API - Connected Systems Part 1 (OGC 23-001) and Part 2 (OGC 23-002) were approved as standards in mid-2025. CS API server implementers (OpenSensorHub, pygeoapi, vendor stacks) have **no path to OGC compliance certification** because no Executable Test Suite (ETS) has been published in the OGC CITE program for CS API. The OGC Compliance Programs Policy (08-134r11) defines the certification deliverable as an ETS executed by TeamEngine and reviewed by the CITE SubCommittee — not a vendor-hosted web tool.

The concrete user need is therefore: **a CITE-track ETS that an implementer can run against their CS API server to obtain (eventually) an OGC compliance badge**, with the corollary need that the same logic be usable for "shift-left" conformance checks during development.

The misframe in v1.1 was treating the gap as "no testing tool exists" rather than "no certification path exists." A shipped web app does not advance certification readiness one inch — it tests the same surface, but its results are not recognized by any OGC governance body.

---

## Research Findings

### Finding 1 — No CS API ETS exists or is in flight (high confidence)

Direct GitHub search of the `opengeospatial` org (April 2026) returns ten `ets-ogcapi-*` repositories (`features10`, `processes10`, `processes10-part2`, `edr10`, `edr12`, `tiles10`, `maps10`, `coverages10`, `features10-part2`) but **no `ets-ogcapi-connectedsystems*`**. Code search for `connectedsystems` against the org's Java code returns nothing. The Connected Systems SWG repo (`opengeospatial/ogcapi-connected-systems`) lists work items as "SensorML Update, SWE Common Update, Connected Systems API, Definitions Server" — compliance testing is not an active workstream there. Sources:
- https://github.com/opengeospatial?q=ets-ogcapi
- https://github.com/opengeospatial/ogcapi-connected-systems

Implication: this is greenfield. The pivot does not collide with parallel OGC effort.

### Finding 2 — TeamEngine is alive, TestNG is the path, CTL is legacy (high confidence)

TeamEngine 5.6.x (currently 5.6.1) was released in December 2025. It supports both CTL and TestNG; recent ETSs (`ets-ogcapi-features10`, `ets-ogcapi-processes10`, `ets-ogcapi-edr10` last updated 2026-04-08) are all TestNG/Java/Maven. Sources:
- https://github.com/opengeospatial/teamengine
- https://opengeospatial.github.io/teamengine/testng-essentials.html
- https://www.ogc.org/blog-article/the-new-v5-5-of-team-engine-on-the-ogc-validator/

The reference stack from `ets-ogcapi-features10/pom.xml`:
- `org.opengis.cite:ets-common:17` (shared ETS utilities)
- `org.opengis.cite.teamengine:teamengine-spi` (TeamEngine plugin SPI)
- `org.testng:testng` (test framework)
- `io.rest-assured:rest-assured` (HTTP assertions)
- `com.reprezen.kaizen:openapi-parser` (OpenAPI 3.0 parsing)
- `org.locationtech.jts:jts-core` + `proj4j` (geometry validation)
- Apache Maven 3.9, JDK 17

There is an official Maven archetype: `org.opengis.cite:ets-archetype-testng:2.7` (last published 2019, still authoritative). Generation command: `mvn archetype:generate -B -DarchetypeGroupId=org.opengis.cite -DarchetypeArtifactId=ets-archetype-testng -DarchetypeVersion=2.7 -Dets-code=ogcapi-connectedsystems10 -Dets-title='OGC API - Connected Systems Part 1' -DartifactId=ets-ogcapi-connectedsystems10`. Sources:
- http://opengeospatial.github.io/ets-archetype-testng/
- https://search.maven.org/artifact/org.opengis.cite/ets-ogcapi-features10

### Finding 3 — CITE certification is a 6+ month governance process, not a code milestone (high confidence)

Per Policy 08-134r11 and the OGC Compliance Roadmap page:
1. ETS author (any party — does not need to be vendor or SWG) drafts ETS aligned with the standard's Abstract Test Suite (ATS, Annex A of OGC 23-001 / 23-002).
2. ETS enters **beta** on a TeamEngine instance.
3. CITE SubCommittee reviews; standard policy requires **three independent passing implementations** before official release. Exception: ≥6 months in beta + 1-2 passing implementations may pass with a CITE SC vote.
4. Technical Committee (TC) approves a release motion.
5. Planning Committee (PC) ratifies any policy-affecting changes.
6. Compliance Testing Coordinator (CTC) coordinates the Compliance Test Package (CTP = ETS + test data + standard ref + TeamEngine version pin).

Sources:
- https://docs.ogc.org/pol/08-134r11.html
- https://www.ogc.org/compliance/ogc-compliance-roadmap/

Realistic calendar: ETS skeleton in 1-3 months → beta on TeamEngine → 6-12 months gathering implementations → CITE SC + TC vote → official release. v1 of the existing web app was a 51-turn AI sprint; this pivot is a **standards-process commitment** measured in quarters, not turns.

### Finding 4 — The existing web app has portable assets but its language is wrong (high confidence)

Inventory of what we have at HEAD `ab53658`:

| Asset | Portability to ETS | Rationale |
|---|---|---|
| **126 bundled OGC JSON Schemas** (`/schemas/`) | **Direct port** — copy as-is | JSON Schema is language-agnostic; both Ajv (TS) and the Kaizen openapi-parser (Java) consume the same schemas |
| **27 conformance-test registry modules** (`src/engine/registry/*.ts`) | **Logic ports as ATS-mapping reference; code does not** | Each module is a TypeScript object keyed by canonical OGC requirement URI (e.g. `/req/system/canonical-url`) with `testFn(ctx)`. The URI-mapping convention, the assertion catalog, the dependency DAG, the spec-trap fixtures (`featureType="sosa:System"` etc.) all transfer as design knowledge. The TypeScript bodies must be re-written in Java/TestNG/REST Assured. |
| **Spec-trap test fixtures** (asymmetric `featureType` vs `itemType` corpus, half-conformant collection responses) | **Unique authored asset — port as TestNG `@DataProvider`** | These edge cases are not in the OGC ATS verbatim. They are accumulated knowledge from live testing against `api.georobotix.io`. They make the ETS more rigorous than a literal ATS port. |
| **OpenAPI YAML pinning + schema-extraction script** (`scripts/fetch-schemas.ts`) | **Port concept; the Java ETS uses Kaizen at runtime instead of build-time bundling** | Kaizen openapi-parser loads the YAML directly; no extraction step needed. |
| **Two-step discovery flow** (landing page → conformance → run) | **Port as TestNG `@BeforeSuite`** | Same logic, different idiom. |
| **SSRF guard, credential masking, SSE broadcaster, session manager, result store, Express server, Next.js UI, PDFKit exporter** | **Throwaway** (in ETS context) | TeamEngine provides session management, result storage, HTML report rendering, and the web UI. None of this code has a home in an ETS. |
| **1003 Vitest unit tests** | **Reference, not port** | Useful as a checklist of behaviors the Java ETS must also cover. The test bodies themselves are not portable. |
| **27 Playwright E2E tests** | **Throwaway** | UI-only. |

Rough split: of the ~15-20K LOC v1.0 codebase, perhaps 5-15% (the schemas + the registry's spec-knowledge) survives the pivot. The rest is web-app scaffolding.

### Finding 5 — TypeScript was the wrong choice for a CITE submission (medium-high confidence)

OGC tooling is JVM-centric: TeamEngine is Java, the SPI is Java, all 10 active `ets-ogcapi-*` repos are Java, the Maven archetype is Java, the `ets-common` utility library is Java. A non-Java ETS would either need to be wrapped in a Java shell that shells out to Node.js (operationally ugly, would likely fail CITE SC review) or would not be runnable inside TeamEngine at all. CTL (XML-based) is supported but is the legacy path; no ETS published since ~2020 chose CTL. The 2026 default is **Java 17 + Maven + TestNG + REST Assured**.

---

## Proposed Approach (recommended)

### Approach A — New Java/TestNG ETS, existing web app archived as "shift-left dev tool" (RECOMMENDED)

**Shape**: New sibling repo `ets-ogcapi-connectedsystems10` (and a Part 2 repo when scoped) generated from `ets-archetype-testng:2.7`, mirroring the layout of `ets-ogcapi-features10`. The new ETS is the certification deliverable. The existing repo (`csapi_compliance`) stays in place, marked **"developer pre-flight tool, not certification-track"** in its README, and continues to be useful for implementers who want a browser UI during development.

**What gets built**:
1. ETS skeleton via Maven archetype, JDK 17, TestNG, REST Assured, Kaizen openapi-parser.
2. One TestNG suite class per CS API conformance class (28 total: 14 from Part 1 + 14 from Part 2). Each test method maps 1:1 to an ATS assertion via the canonical OGC requirement URI.
3. Reuse the 126 JSON Schemas verbatim from `csapi_compliance/schemas/`.
4. Port the spec-knowledge from the 27 TS registry modules into Java assertions — preserving the URI mapping, dependency DAG, and spec-trap data providers.
5. CTL wrapper (`src/main/scripts/ctl/`) to register the ETS with TeamEngine.
6. `Dockerfile` + Jenkinsfile pattern matching the `ets-ogcapi-processes10` repo.
7. Asciidoc site documentation (`src/site/`) per OGC convention.

**Path to certification**:
- Phase 1 (1-3 months): ETS skeleton, Part 1 conformance classes only, runs locally via TeamEngine 5.6.x (currently 5.6.1) Docker image.
- Phase 2 (3-6 months): Part 2 conformance classes; submit to OGC for beta status on `cite.opengeospatial.org/teamengine/`.
- Phase 3 (6-12 months from beta): Drive 3 passing implementations (GeoRobotix demo server, OpenSensorHub, third TBD). CITE SC + TC vote. Official release.

**Why recommended**:
- Aligns with the only governance path that produces a real OGC compliance badge.
- Greenfield in OGC's ETS catalog — no duplicated work, the SWG is not building a competing one.
- Existing web app is preserved (sunk cost is not weaponized; it just stops being the primary deliverable).
- The Maven archetype + nine reference repos make the scaffold a known quantity, not research.

### Alternatives Considered

**Approach B — Wrap the existing TS engine in a Java/TeamEngine shim**: TeamEngine SPI invokes a thin Java class that shells out to a bundled Node.js process running the existing engine, parses its JSON output, and synthesizes TestNG results.
- Rejected. Operational complexity (Node + Java in the same Docker image), CITE SC will likely flag the shell-out as a maintenance liability, and the shim layer becomes a permanent translation tax. Saves ~10% effort vs Approach A and adds long-term debt.

**Approach C — Stay the course: keep building the web app, ignore TeamEngine**: Treat the web app as the de-facto ecosystem tool, lobby OGC informally to recognize it.
- Rejected. The user's premise is correct: this path produces no certification, no badge, no OGC governance recognition. It is a bet against OGC's own program. The user has explicitly signaled they want to be on the certification path.

**Approach D — CTL-based ETS**: Use the older XML/XSLT-based CTL framework.
- Rejected. CTL is legacy. No `ets-ogcapi-*` repo since 2020 chose CTL. Adopting it would isolate the ETS from current OGC tooling momentum and the talent pool.

**Approach E — Hybrid: ETS for certification + web app retained as primary product**: Build the ETS but keep the web app as the user-facing tool, with shared schemas.
- Partial-fit alternative. This is actually compatible with Approach A — the recommended approach already preserves the web app as a dev tool. The distinction is just emphasis: Approach A says the ETS is the primary deliverable; Approach E says they are co-equal. Approach A is cleaner because the web app is ~complete (v1.0 shipped) and needs no further investment to keep its current dev-tool utility, while the ETS needs full focus.

---

## Requirements Summary (for Pat the Planner)

High-level requirements that the Planner should decompose into REQ-* / SCENARIO-* items in a new capability spec (suggested name: `ets-ogcapi-connectedsystems`):

1. **R-PIVOT-01** — Generate an OGC-compliant ETS project from `ets-archetype-testng:2.7` named `ets-ogcapi-connectedsystems10` covering OGC 23-001 (Part 1).
2. **R-PIVOT-02** — Mirror the structure of `ets-ogcapi-features10` (TestNG suite definition at `src/main/resources/.../testng.xml`, CTL wrapper at `src/main/scripts/ctl/`, TeamEngine SPI integration).
3. **R-PIVOT-03** — Implement TestNG test classes for all 14 Part 1 conformance classes, with each `@Test` method 1:1 mapped to an OGC 23-001 ATS assertion via canonical requirement URI.
4. **R-PIVOT-04** — Implement TestNG test classes for all 14 Part 2 conformance classes per OGC 23-002.
5. **R-PIVOT-05** — Reuse the 126 JSON Schemas from `csapi_compliance/schemas/` as the validation source. Pin the OGC OpenAPI YAML to a specific commit SHA in the ETS pom.xml.
6. **R-PIVOT-06** — Port the spec-trap fixture corpus (asymmetric featureType/itemType cases, half-conformant collections, missing OGC 23-001 markers) as TestNG `@DataProvider` inputs.
7. **R-PIVOT-07** — Provide a `Dockerfile` + docker-compose snippet that runs TeamEngine 5.6.x (currently 5.6.1) with this ETS pre-loaded, accessible at `http://localhost:8081/teamengine`.
8. **R-PIVOT-08** — Publish the maven artifact to OSSRH/Maven Central per OGC convention (`org.opengis.cite:ets-ogcapi-connectedsystems10`).
9. **R-PIVOT-09** — Achieve "all tests green" against the GeoRobotix demo server (`api.georobotix.io/ogc/t18/api`), which is already known to pass the existing web-app suite.
10. **R-PIVOT-10** — Update the existing `csapi_compliance` repo's README to reposition it as a developer pre-flight tool, with a clear pointer to the certification-track ETS.
11. **R-PIVOT-11** — Maintain traceability between the TS registry modules and the Java TestNG methods so spec-knowledge updates propagate (this is a tooling/process requirement, possibly enforced by a script that diffs the URI lists).
12. **R-PIVOT-12** — Submit ETS to OGC CITE for beta status. (This is a process gate, not a code requirement, but the Planner should acknowledge it as a milestone.)

The Planner should treat R-PIVOT-01 through R-PIVOT-09 as in-scope for the next several sprints; R-PIVOT-10 as a low-cost cleanup of the existing repo; R-PIVOT-11 as a quality-of-life automation to consider after R-09; R-PIVOT-12 as a calendar milestone driven by external OGC governance.

---

## Risks and Open Questions

### Risks (specific)

1. **Java/TestNG/Maven skill load**. The team's demonstrated proficiency is TypeScript/Next.js/Vitest. The pivot adds a JVM toolchain. Mitigation: lean heavily on `ets-ogcapi-features10` and `ets-ogcapi-processes10` as templates; both have public source. Risk of slow learning curve in first 2-3 sprints is real.
2. **Maven archetype is from 2019 (v2.7)**. JDK 17 is required, but the archetype itself has not been rev'd in five years. Generated scaffolds may need manual updates (e.g. dependency version bumps, security patches). Likely surmountable but adds setup cost.
3. **Three-implementation rule**. CITE SC needs three independent passing implementations to release the ETS officially. Candidate pool (confirmed by user 2026-04-27): (a) GeoRobotix `api.georobotix.io/ogc/t18/api`, (b) OpenSensorHub, (c) `SomethingCreativeStudios/connected-systems-go`. **Residual risk**: candidates exist, but their willingness to formally participate in CITE beta testing is not yet secured. Mitigation: outreach step for OSH and connected-systems-go before beta submission; 6-month beta + 1-2 implementations + CITE SC vote is policy-permitted as a fallback.
4. **Spec-trap fixture portability**. The asymmetric `featureType`/`itemType` corpus is custom edge-case knowledge. Porting to Java `@DataProvider` is straightforward but tedious; ~30-50 fixtures to translate.
5. **Dual-maintenance burden**. Keeping the TS web app and the Java ETS in sync as OGC 23-001/23-002 errata land. Mitigation: shared JSON Schemas (no duplication) + a checklist file mapping TS registry modules to Java test classes (R-PIVOT-11).
6. **TeamEngine-side issues**. TeamEngine 5.6.x (currently 5.6.1)'s TestNG support has rough edges (per the testng-essentials docs deferring registration details to "Part 2"). Risk of integration friction. Mitigation: use the `teamengine-integration-testing` repo's patterns.
7. **OGC governance velocity**. CITE SC meets infrequently; TC voting cycles are quarterly. Risk: even with code-complete ETS, official release could slip 9-18 months. Outside our control.
8. **SensorML / SWE Common JSON Schemas may be incomplete or in flux**. CS API Part 2 references SensorML and SWE Common — both have parallel SWG update workstreams in the same `ogcapi-connected-systems` repo. The schemas we bundled at v1.0 may not be final. Mitigation: pin to specific commit SHA, document the pin, plan to revisit.

### Open Questions

1. ~~**Repository topology**~~ — **RESOLVED 2026-04-27** (user gate): sibling repo `ets-ogcapi-connectedsystems10`, our org first, propose to OGC at beta milestone. See § User Decisions.
2. ~~**Part 1 vs Part 1 + Part 2 first cut?**~~ — **RESOLVED 2026-04-27** (user gate): Part 1 first, Part 2 follows. See § User Decisions.
3. ~~**Web app fate post-pivot**~~ — **RESOLVED 2026-04-27** (user gate): freeze v1.0, reposition README, no further sprint investment. See § User Decisions.
4. **CI/CD topology**: Jenkins (matches OGC convention) or GitHub Actions (matches our existing setup)? Recommend GH Actions for our development; Jenkinsfile included for OGC submission compatibility. **Pat to confirm.**
5. **Maven Central publishing**: Requires OSSRH account and GPG signing. Setup overhead. When is this needed — beta? Official release? **Pat to confirm timing.**
6. **Test data hosting**: ETS may need fixture data (sample SensorML docs, SWE Common payloads). Where does this live in the repo? Per `ets-ogcapi-features10`, in `src/main/resources/data/`. **Pat to confirm.**
7. **Architect should reconcile the full target architecture** with TeamEngine's plugin model before Generator starts.
8. **Part 2 doc number discrepancy**: this brief cites OGC 23-002; the connected-systems-go repo cites IS 24-008. Pat must determine which is the current IS-published designation before drafting REQ-* IDs that reference Part 2.

---

## Feasibility Assessment

- **Technical**: **FEASIBLE**. The OGC archetype, the 9 reference ETS repos, the live TeamEngine 5.6.x (currently 5.6.1) image, and the 126 JSON Schemas already in our repo make this a well-paved path. Risk is in language/toolchain proficiency, not in unknown technology.
- **Complexity**: **MODERATE-COMPLEX**. Code complexity is moderate — TestNG + REST Assured + Maven is a mature, well-documented stack. The complexity is in (a) translating spec knowledge from TS to Java without losing the spec-trap fixtures, (b) navigating CITE SC governance, (c) getting three independent CS API implementations to pass. Item (c) is the highest-risk dimension and is partly out of our control.
- **Dependencies (new)**:
  - JDK 17 (build environment)
  - Apache Maven 3.9 (build tool)
  - `org.opengis.cite:ets-archetype-testng:2.7` (scaffold)
  - `org.opengis.cite:ets-common:17` (utilities)
  - `org.opengis.cite.teamengine:teamengine-spi` (plugin SPI)
  - `org.testng:testng` (test framework)
  - `io.rest-assured:rest-assured` (HTTP DSL)
  - `com.reprezen.kaizen:openapi-parser` (OpenAPI parsing)
  - `org.locationtech.jts:jts-core`, `proj4j`, `jts-io-common` (geometry)
  - `ogccite/teamengine-production` Docker image (runtime host)
- **Dependencies (preserved from v1.0)**:
  - The 126 JSON Schemas at `csapi_compliance/schemas/`.
  - The pinned OGC OpenAPI YAML commit SHAs.
  - The spec-knowledge encoded in `csapi_compliance/src/engine/registry/*.ts` (as a porting reference, not a build dependency).

---

## Sources

- OGC Compliance Programs Policy: https://docs.ogc.org/pol/08-134r11.html
- OGC Compliance Roadmap: https://www.ogc.org/compliance/ogc-compliance-roadmap/
- OGC CITE TeamEngine portal: https://cite.opengeospatial.org/teamengine/
- TeamEngine project: https://github.com/opengeospatial/teamengine
- TeamEngine TestNG essentials: https://opengeospatial.github.io/teamengine/testng-essentials.html
- ETS TestNG archetype: http://opengeospatial.github.io/ets-archetype-testng/
- Reference ETS — OGC API Features: https://github.com/opengeospatial/ets-ogcapi-features10
- Reference ETS — OGC API Processes: https://github.com/opengeospatial/ets-ogcapi-processes10
- CS API SWG repo (no ETS workstream): https://github.com/opengeospatial/ogcapi-connected-systems
- CITE wiki TestNG conformance testing: https://github.com/opengeospatial/cite/wiki/Conformance-Testing-with-TestNG-Part-1
- TeamEngine 5.6.x (currently 5.6.1) release blog: https://www.ogc.org/blog-article/the-new-v5-5-of-team-engine-on-the-ogc-validator/
