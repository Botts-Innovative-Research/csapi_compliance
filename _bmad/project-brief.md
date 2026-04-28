# Project Brief — OGC API CS API TeamEngine ETS

> Version: 2.0 | Status: Living Document | Last updated: 2026-04-27
>
> **Supersedes v1.1 (2026-03-31)** which framed the project as a Next.js/TypeScript web app for ad-hoc CS API conformance assessment. The user pivoted on 2026-04-27 to a certification-track Java/TestNG ETS for OGC TeamEngine. v1.0 of the web app shipped at HEAD `ab53658` and is frozen.

## Problem Statement

OGC API – Connected Systems Part 1 (OGC 23-001, approved 2025-06-02) and Part 2 (OGC 23-002, approved 2025-06-02) lack an Executable Test Suite in the OGC CITE program. CS API server implementers have no path to OGC compliance certification. The OGC Compliance Programs Policy (08-134r11) defines the certification deliverable as a TestNG/Java ETS executed by TeamEngine and reviewed by the CITE SubCommittee — not a vendor-hosted web tool. The v1.0 web app the user shipped tests the same surface as an ETS would, but its results carry no OGC governance recognition.

## Vision

A Java/TestNG Executable Test Suite, hosted in our org as `ets-ogcapi-connectedsystems10` (Part 1 first, Part 2 follows), that an implementer can run inside TeamEngine 5.6.x (currently 5.6.1) (locally via Docker, or on the OGC validator) to obtain a per-conformance-class pass/fail verdict with HTTP traces and an EARL/JSON report. The ETS is greenfield in the OGC ecosystem (verified: no `ets-ogcapi-connectedsystems*` exists in the OGC GitHub org). Submission to OGC CITE for beta status is a milestone deliverable; official OGC release follows the CITE SC + TC governance loop with three independent passing implementations.

## Stakeholders

| Role | Interest |
|------|----------|
| CS API server implementers (OpenSensorHub, GeoRobotix, connected-systems-go) | Pass an OGC-recognised compliance test as conformance evidence |
| OGC CITE SubCommittee | Review and approve the ETS as a Compliance Test Package |
| OGC Connected Systems SWG | Reference implementation of their abstract test suite, validating the standard's clarity |
| TeamEngine maintainers | Reduce per-ETS integration friction; this ETS is greenfield, not migration |
| Project sponsor | Establish credibility in the OGC ecosystem; ship the first CS API ETS |

## Success Criteria (top-line)

| ID | Criterion | Measure |
|----|-----------|---------|
| SC-1 | Maven scaffold builds green on JDK 17 | `mvn clean install` exits 0 |
| SC-2 | All 14 Part 1 conformance classes have TestNG coverage | Annex A assertion → `@Test` 1:1 mapping |
| SC-3 | ETS loads in TeamEngine 5.6.x (currently 5.6.1) Docker without registration error | Suite appears in CTL UI suite list |
| SC-4 | Full Part 1 suite passes against GeoRobotix | All declared-class tests pass; non-declared are SKIP, not FAIL |
| SC-5 | Three independent passing implementations identified | GeoRobotix + OpenSensorHub + connected-systems-go beta participation |
| SC-6 | Submitted to OGC CITE SC for beta status | OSSRH publish + CITE SC ticket open |

Full criteria in `_bmad/prd.md` v2.0.

## Constraints

- **Toolchain locked**: JDK 17, Maven 3.9, TestNG, REST Assured, Kaizen `openapi-parser`, `org.opengis.cite:ets-common:17`. No CTL (legacy), no non-Java (TeamEngine SPI is Java).
- **Repo topology**: sibling repo `ets-ogcapi-connectedsystems10` in our org first; propose to OGC at beta milestone (user gate 2026-04-27).
- **Scope**: Part 1 first, Part 2 follows (user gate 2026-04-27). Sprint 1 implements scaffold + CS API Core conformance class only.
- **Web app frozen**: csapi_compliance at HEAD `ab53658`. README repositioned, no further sprint investment (user gate 2026-04-27).
- **OGC governance external**: CITE SC review velocity, TC voting, three-implementation rule are calendar dependencies. Code-complete reachable in 1-2 quarters; official release in 3-7 quarters.

## Architecture (Outline — Architect Owns Detail)

- **Build artifact**: a Maven jar published as `org.opengis.cite:ets-ogcapi-connectedsystems10:<version>` to OSSRH/Maven Central at the beta milestone.
- **Runtime host**: TeamEngine 5.6.x (currently 5.6.1) Docker image (`ogccite/teamengine-production:5.6.1`) with the ETS jar mounted into `WEB-INF/lib/`.
- **Test framework**: TestNG suites, one class per conformance class (28 total: 14 Part 1 + 14 Part 2).
- **Spec traceability**: every `@Test` has a `description` attribute carrying the OGC requirement URI (e.g. `OGC-23-001 /req/system/canonical-url`).
- **Schema validation**: Kaizen `openapi-parser` against the OGC OpenAPI YAML pinned to a specific commit SHA in `pom.xml`. JSON Schemas at `src/main/resources/schemas/` (ported verbatim from `csapi_compliance/schemas/`).
- **Spec-trap fixtures**: TestNG `@DataProvider`-supplied corpus ported from `csapi_compliance/tests/fixtures/spec-traps/` (~30-50 cases).

Detailed architecture → Architect Alex in `_bmad/architecture.md` v2.0.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | Java 17 | TeamEngine SPI is Java; all 10 active `ets-ogcapi-*` repos are Java; non-Java is rejected by CITE SC review |
| Build tool | Maven 3.9 | OGC convention; `ets-archetype-testng:2.7` is the official scaffold |
| Test framework | TestNG | TeamEngine 5.6.x (currently 5.6.1) supports TestNG and CTL; no new ETS since ~2020 has chosen CTL |
| HTTP DSL | REST Assured | Standard in 9 reference ETSs |
| OpenAPI parser | Kaizen `openapi-parser` | Standard in `ets-common`; runtime parsing avoids build-time bundling |
| Geometry | JTS + proj4j | Standard in `ets-common` |
| Reporting | TestNG built-in HTML + EARL via `ets-common` | TeamEngine renders these natively |
| Source control | Git + GitHub | Standard; sibling repo to csapi_compliance |
| CI/CD | GH Actions for our dev; Jenkinsfile stub for OGC submission compat | OGC convention requires Jenkinsfile; we run actual CI on GH Actions |
| Container runtime | Docker + docker-compose | Single-command local dev: `docker-compose up` brings TeamEngine + ETS |
| Deployment | OSSRH → Maven Central at beta milestone | OGC convention for ETS distribution |

## v1.0 Web App Status

Frozen at HEAD `ab53658`. Position: developer pre-flight tool, not certification-track. README pointed at the new ETS repo. JSON Schemas at `csapi_compliance/schemas/` will be reused by the ETS — port mechanism (symlink vs submodule vs copy) is an Architect decision.

The 1003 Vitest unit tests, 27 Playwright E2E tests, Express server, Next.js UI, SSRF guard, credential masker, SSE broadcaster, session manager, and PDFKit exporter are all **throwaway in the ETS context**. TeamEngine provides equivalents for session management, result storage, HTML report rendering, and the user-facing web UI.

The 27 TypeScript registry modules at `src/engine/registry/*.ts` port as **spec-knowledge reference** (the URI mapping convention, the assertion catalog, the dependency DAG) — the TS code itself does not port. Spec-trap fixtures (~30-50 cases) port as TestNG `@DataProvider`.

## References

- Discovery: `_bmad/product-brief.md` v2.0
- PRD: `_bmad/prd.md` v2.0
- Architecture: `_bmad/architecture.md` v1.0 (frozen for web app; v2.0 owned by Architect)
- Capability spec: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md`
- v1.0 web-app freeze tag: HEAD `ab53658`
- OGC 23-001: https://docs.ogc.org/is/23-001/23-001.html
- OGC 23-002: https://docs.ogc.org/is/23-002/23-002.html
- OGC Compliance Programs Policy: https://docs.ogc.org/pol/08-134r11.html
- TeamEngine: https://github.com/opengeospatial/teamengine
- ETS archetype: http://opengeospatial.github.io/ets-archetype-testng/
- Reference ETS: https://github.com/opengeospatial/ets-ogcapi-features10
