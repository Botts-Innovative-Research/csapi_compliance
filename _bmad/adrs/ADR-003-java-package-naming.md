# ADR-003 — Java Package Naming and Maven Coordinates

- **Status**: Accepted
- **Date**: 2026-04-27
- **Decider**: Architect (Alex)
- **Related**: REQ-ETS-SCAFFOLD-001, REQ-ETS-SCAFFOLD-003, planner-handoff §`deferred_to_architect`

## Context

Pat's PRD proposes `org.opengis.cite.ogcapi.cs10` as the Java root package and Maven coordinates `org.opengis.cite:ets-ogcapi-connectedsystems-1` with `ets-code=ogcapi-cs10`. The proposal is consistent with `ets-ogcapi-features10` (`org.opengis.cite.ogcapifeatures10`) but two questions deserve ratification: (a) is `cs10` the right short code, and (b) does the package use a `.cs10` segment with a separator dot, or run-together as `connectedsystems10` like `ogcapifeatures10` does?

Convention as observed across active OGC ETS repos (verified 2026-04-27 on github.com/opengeospatial):

| Repo | Group | ArtifactId | ets-code | Java root |
|---|---|---|---|---|
| ets-ogcapi-features10 | org.opengis.cite | ets-ogcapi-features10 | ogcapi-features-1.0 | org.opengis.cite.ogcapifeatures10 |
| ets-ogcapi-edr10 | org.opengis.cite | ets-ogcapi-edr10 | ogcapi-edr10 | org.opengis.cite.ogcapiedr10 |
| ets-ogcapi-processes10 | org.opengis.cite | ets-ogcapi-processes10 | ogcapi-processes10 | org.opengis.cite.ogcapiprocesses10 |
| ets-ogcapi-tiles10 | org.opengis.cite | ets-ogcapi-tiles10 | ogcapi-tiles10 | org.opengis.cite.ogcapitiles10 |

The pattern is unambiguous: **artifactId hyphenates words; ets-code mostly hyphenates (with one exception, `ogcapi-features-1.0` which has the dotted version); Java root package runs the words together with no separator and no underscore**.

Pat's `cs10` proposal omits the `connectedsystems` token. That's a regression in convention — every other ETS spells the spec name out in full in the Java package (the artifactId contains the full name `connectedsystems`, but the package would shorten to `cs10`).

## Decision

Adopt the following coordinates, **rejecting the abbreviated `cs10` package segment in favor of the spelled-out form for parity with the rest of the OGC ETS catalog**:

- **Maven groupId**: `org.opengis.cite`
- **Maven artifactId**: `ets-ogcapi-connectedsystems10` *(note: trailing `10` for "Part 1, version 1.0", consistent with `features10` / `edr10` / `processes10`; NOT the `connectedsystems-1` suffix Pat proposed)*
- **ets-code Maven property**: `ogcapi-connectedsystems10` *(matches artifactId minus the `ets-` prefix; consistent with `ogcapi-edr10`, `ogcapi-processes10`)*
- **Java root package**: `org.opengis.cite.ogcapiconnectedsystems10`
- **Suite / TestNG package layout**:
  - `org.opengis.cite.ogcapiconnectedsystems10.TestNGController`
  - `org.opengis.cite.ogcapiconnectedsystems10.conformance.core.*` (CS API Core)
  - `org.opengis.cite.ogcapiconnectedsystems10.conformance.systemfeatures.*` (and one subpackage per Part 1 conformance class — names follow the conformance-class URI in lower-camel-no-hyphens)
  - `org.opengis.cite.ogcapiconnectedsystems10.util.*` (shared utilities)
  - `org.opengis.cite.ogcapiconnectedsystems10.openapi3.*` (OpenAPI parsing helpers — mirrors features10's `openapi3` subpackage)
  - `org.opengis.cite.ogcapiconnectedsystems10.listener.*` (TestNG listeners — mirrors features10's `listener` subpackage)
- **Resource paths**:
  - `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/testng.xml`
  - `src/main/resources/org/opengis/cite/ogcapiconnectedsystems10/ets.properties`
  - `src/main/resources/META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` containing exactly: `org.opengis.cite.ogcapiconnectedsystems10.TestNGController`
  - `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl`
- **Repository name**: `ets-ogcapi-connectedsystems10` *(matches artifactId; supersedes Pat's `ets-ogcapi-connectedsystems-1` proposal — see Consequences)*

Part 2 will be a separate sibling repo with the parallel naming `ets-ogcapi-connectedsystems10-part2` (mirroring the `ets-ogcapi-features10-part2` precedent).

## Alternatives considered

- **Pat's original proposal** `org.opengis.cite.ogcapi.cs10` with artifactId `ets-ogcapi-connectedsystems-1`: rejected. The dotted `.ogcapi.cs10` introduces an intermediate `.ogcapi.` segment that no other ETS uses; the `cs10` abbreviation hides the spec name. The `-1` suffix style appears nowhere in the OGC ETS catalog (every active repo uses `10`, `12`, `20`, etc. as a Major-Minor concatenation, never a single-digit Part suffix). Adopting either would require justification and would visually flag the new ETS as an outlier during CITE SC review.
- **Hyphen-separated package** `org.opengis.cite.ogcapi-connectedsystems10`: rejected. Hyphens are not legal Java package identifiers.
- **Snake-case** `org.opengis.cite.ogcapi_connectedsystems10`: rejected. Underscores are legal but unidiomatic and absent from every existing OGC ETS.
- **Drop the `ogcapi` prefix** (e.g. `org.opengis.cite.connectedsystems10`): rejected. The `ogcapi` infix is what disambiguates the OGC API family from older OGC services (WMS/WCS/WFS/CSW), which use `org.opengis.cite.<service>` directly.

## Consequences

**Positive**:
- Structural parity with all 10 active `ets-ogcapi-*` repos. CITE SC reviewers' visual scan returns "this looks like every other ETS we approved" rather than "what's the cs10 shorthand for?"
- Future Part 2 sibling repo's naming is predetermined and consistent (`ets-ogcapi-connectedsystems10-part2`).
- The Maven artifact, when published to Maven Central at the beta milestone (REQ-ETS-CITE-001), sits next to `ets-ogcapi-features10`, `ets-ogcapi-edr10`, etc. with no naming oddities.

**Negative**:
- Long package names (`org.opengis.cite.ogcapiconnectedsystems10` is 50 chars) increase boilerplate slightly. Mitigation: import statements live at the top of files; no runtime impact.
- The decision **changes the artifactId Pat documented in the PRD** (`ets-ogcapi-connectedsystems-1` → `ets-ogcapi-connectedsystems10`). PRD v2.0 §FR-ETS-01 cites the original; design.md must call this out and Pat (or Sam at the next planning cycle) needs to adjust the PRD wording. The capability spec REQ-ETS-SCAFFOLD-001 also references `ets-ogcapi-connectedsystems-1`; same fix required.

**Risks**:
- The `connectedsystems10` form is also not in use yet (greenfield, per Mary's `GREENFIELD-CONFIRMED` flag), so no precedent collision exists. If the SWG later releases a Part 1.1 of the standard, the ETS would version up to `11` (e.g. `ogcapi-connectedsystems11`). This is the same upgrade path features10 has if a "Features 1.1" lands.

## Notes / references

- Survey sources (verified 2026-04-27): `pom.xml` of `opengeospatial/ets-ogcapi-features10`, `ets-ogcapi-edr10`, `ets-ogcapi-processes10`, `ets-ogcapi-tiles10`. All artifactIds end in two-digit Major-Minor concatenation; all Java root packages run words together.
- Pat's PRD §FR-ETS-01: https://docs.ogc.org/ — references `artifactId=ets-ogcapi-connectedsystems-1`. **Action item for Sam**: update PRD §FR-ETS-01 to match this ADR.
- Capability spec §REQ-ETS-SCAFFOLD-001: similar mismatch; design.md will instruct Generator to use the ADR-003 coordinates and Sam to amend the spec at the next planning cycle.
