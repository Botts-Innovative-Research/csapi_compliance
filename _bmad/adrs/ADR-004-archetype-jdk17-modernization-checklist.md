# ADR-004 — ets-archetype-testng:2.7 Modernization Checklist (JDK 17 + TeamEngine 5.6.x)

- **Status**: Accepted
- **Date**: 2026-04-27
- **Decider**: Architect (Alex)
- **Related**: REQ-ETS-SCAFFOLD-002, REQ-ETS-SCAFFOLD-004, REQ-ETS-SCAFFOLD-005, REQ-ETS-SCAFFOLD-006, NFR-ETS-01, NFR-ETS-02, discovery-handoff §`flags.ARCHETYPE-DATED`

## Context

`org.opengis.cite:ets-archetype-testng:2.7` was last published in 2019 (Mary's `ARCHETYPE-DATED` flag, severity medium). Pat's PRD requires JDK 17 + Maven 3.9 + reproducible builds. The archetype was authored against JDK 8 / Maven 3.5 / TeamEngine 5.0. Two real-world reference points:

- **Master branch of `ets-ogcapi-features10`**: still uses `<parent><artifactId>ets-common</artifactId><version>14</version>`. Builds today on JDK 11 (not yet ported to 17).
- **Branch `java17Tomcat10TeamEngine6` of `ets-ogcapi-features10`** (verified 2026-04-27): pins `<parent><version>14</version>` but is the OGC's in-progress JDK 17 + Tomcat 10 + TeamEngine 6 migration. This is the forward-looking pattern.
- **`ets-common` master**: `18-SNAPSHOT`, pins `<teamengine.version>6.0.0</teamengine.version>`, JDK requirement implied by Jersey 3.1.8 and Jakarta EE 4 deps (= JDK 11+).
- **`ets-common` latest tag `17`** (verified 2026-04-27): also pins `teamengine.version=6.0.0`. (The PRD's "ets-common:14" reference is **stale**.)

The archetype produces a `pom.xml` whose parent is `ets-common` at whatever version the archetype hard-coded in 2019 (likely `9` or `10`). Generator MUST overwrite the parent version, the JDK plugin config, and a known set of transitive dep versions, then verify the build.

## Decision

The Generator (Dana) SHALL apply the following modernization checklist to the archetype-generated scaffold **immediately after** `mvn archetype:generate` and **before** the first commit. Each delta is a separate atomic commit so it's individually revertable.

### Group A — Parent and toolchain (mandatory)

| Item | Action | Verification |
|---|---|---|
| A-1 | `<parent><artifactId>ets-common</artifactId><version>17</version>` (release tag, not master snapshot) | `mvn validate` resolves the parent without warnings |
| A-2 | Add property `<maven.compiler.source>17</maven.compiler.source>` and `<maven.compiler.target>17</maven.compiler.target>` to `<properties>` (overrides any inherited 1.8) | `mvn -X compile` shows `-source 17 -target 17` |
| A-3 | Add `<maven.compiler.release>17</maven.compiler.release>` to `<properties>` (modern replacement for source/target) | Same |
| A-4 | Set `<project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>` if archetype omitted it | Maven warns if absent |
| A-5 | Add `<requireMavenVersion><version>3.9</version></requireMavenVersion>` via the maven-enforcer-plugin (already supplied by ets-common 17 — verify) | `mvn validate` fails on Maven 3.8 |

### Group B — Dependency pins (override any 2019-vintage versions inherited from the archetype)

The dependencies inherited from `ets-common:17`'s `<dependencyManagement>` are already up to date (Jackson 2.18, Jersey 3.1.8, JTS 1.19, proj4j 1.1.3, etc.). Generator MUST NOT explicitly version these in the new ETS pom. ets-common is the single source of truth for transitive dep versions.

The new ETS pom SHALL declare these dependencies (no `<version>` element — version comes from ets-common's depMgmt):

| GroupId | ArtifactId | Why |
|---|---|---|
| org.opengis.cite.teamengine | teamengine-spi | SPI registration (ADR-001) |
| org.opengis.cite | ets-common (parent only) | Brings jcommander, hamcrest-core, junit, mockito-core, jersey-* |
| org.testng | testng | Test framework |
| io.rest-assured | rest-assured | HTTP DSL with auth + response capture |
| com.reprezen.kaizen | openapi-parser | OpenAPI 3.0 + JSON Schema validation |
| org.locationtech.jts | jts-core | Geometry types (used in feature/observation body validation) |
| org.locationtech.proj4j | proj4j | CRS transformation |
| org.locationtech.jts.io | jts-io-common | GeoJSON read/write |
| org.slf4j | slf4j-api | Logging facade — pulled in by ets-common transitively, declare explicitly for clarity |
| ch.qos.logback | logback-classic | slf4j binding (Sprint 1 logging — see body of architecture.md §Logging) |

The PRD's reference to `commons-codec`, `commons-io`, `commons-validator`, `commons-lang3`, `httpclient`/`httpcore` are all in ets-common's depMgmt; they will be pulled in transitively as REST Assured needs them.

### Group C — Plugin config (override 2019 defaults)

| Item | Action |
|---|---|
| C-1 | maven-compiler-plugin 3.13.0 (latest stable) — pin via `<pluginManagement>` if archetype set an older version |
| C-2 | maven-surefire-plugin 3.5.x — required for TestNG 7.x compatibility on JDK 17 |
| C-3 | maven-assembly-plugin: configured by archetype to produce the AIO (all-in-one) jar with `<mainClass>org.opengis.cite.ogcapiconnectedsystems10.TestNGController</mainClass>` (per ADR-003 naming). Verify the descriptor reference is correct. |
| C-4 | maven-jar-plugin: keep archetype defaults; ensure `<archive><manifestEntries><Implementation-Version>${project.version}</Implementation-Version></manifestEntries></archive>` is present so the jar manifest reports a sensible version. |
| C-5 | reproducibility (NFR-ETS-01): set `<properties><project.build.outputTimestamp>2026-04-27T00:00:00Z</project.build.outputTimestamp></properties>` and add the `<reproducible-builds-maven-plugin>` (or equivalent) execution in `<build><plugins>`. This canonicalizes META-INF timestamps so two builds of the same commit produce byte-identical jars. Verify via the SCENARIO-ETS-SCAFFOLD-REPRODUCIBLE-001 double-build CI check. |

### Group D — Repository hygiene (mandatory)

| Item | Action |
|---|---|
| D-1 | Add `.gitignore` entries: `target/`, `.idea/`, `.vscode/`, `*.iml`, `*.classpath`, `*.project`, `.settings/`, `bin/`, `out/` |
| D-2 | Add `.github/workflows/build.yml` running `mvn -B clean verify` on JDK 17 (Linux + macOS + WSL2 matrix per NFR-ETS-06) |
| D-3 | Add `Jenkinsfile` mirroring `ets-ogcapi-features10`'s `jenkinsfiles/` content. **Stub only — not wired to a live Jenkins instance**, per planner-handoff resolved-question CI-CD-TOPOLOGY. Required for OGC submission compatibility. |
| D-4 | Add `README.adoc` (NOT `README.md`) with sections: Overview, Conformance classes covered, How to run locally (Maven + Docker), How to submit a bug, License (Apache 2.0). Mirrors features10's structure. |
| D-5 | Add `LICENSE.txt` (Apache 2.0 — OGC convention). |

### Group E — Items NOT to modernize in Sprint 1

| Item | Why deferred |
|---|---|
| E-1 | Migration from `ets-common:17` (TeamEngine 5.6.1) to `ets-common:18-SNAPSHOT` (TeamEngine 6.0.0). The 6.0.0 production Docker image is not yet the `teamengine-production` master default. Stay on 5.6.x for Sprint 1 to match the live OGC validator deployment; revisit at the beta milestone. |
| E-2 | maven-site-plugin / mvn site config (NFR-ETS-13). Sprint 1 ships with a stub `src/site/site.xml`; full Asciidoc documentation is a Sprint 3+ deliverable. |
| E-3 | OSSRH GPG signing config in `pom.xml` (REQ-ETS-CITE-001). Beta milestone only; Sprint 1 publishes nothing. |
| E-4 | maven-scm-publish-plugin (used by features10 to push site to gh-pages). Defer until Sprint 3+ when Asciidoc documentation lands. |

## Alternatives considered

- **Use ets-archetype-testng:2.7 verbatim with no modernization**: rejected. The 2019-vintage source/target=1.8 will silently downgrade JDK 17 builds to bytecode level 52, masking JDK 17–only API uses (e.g. `Stream.toList()`) until they hit a deployment that runs the actual jar. NFR-ETS-02 requires JDK 17 explicitly.
- **Skip the archetype, hand-write `pom.xml` from features10's master**: rejected. CITE SC reviewers expect the archetype-generation marker comment in pom.xml; deviating from the archetype is acceptable but removes a free trail of provenance.
- **Use ets-common:18-SNAPSHOT (TeamEngine 6)**: rejected for Sprint 1. SNAPSHOTs are not reproducible. TeamEngine 6.0.0 is also not yet the deployment default on `cite.opengeospatial.org/teamengine/`. Sprint 1 targets the live validator's actual version (5.6.1).
- **Pin every transitive dep explicitly in the new ETS pom**: rejected. ets-common's `<dependencyManagement>` is the single source of truth for the OGC family; overriding it case-by-case in each ETS would diverge the catalog and make it harder to bump deps centrally. Override only when ets-common's pin is materially wrong (none observed at version 17).

## Consequences

**Positive**:
- The new ETS scaffold is JDK 17–correct from day one. NFR-ETS-02 satisfied.
- Build reproducibility is structurally guaranteed (Group C-5). NFR-ETS-01 satisfied.
- The modernization decisions are atomic commits; if a Generator change breaks the build, `git bisect` finds the offender immediately.
- Each delta from the 2019 archetype is recorded as a row in this ADR, satisfying REQ-ETS-SCAFFOLD-006's auditing requirement.

**Negative**:
- The Generator's S-ETS-01-01 work expands from "run `mvn archetype:generate`" to "run archetype, then apply 5 groups × ~5 items each = ~25 atomic edits." Pat's planner-handoff `biggest_sprint_1_risks.ARCHETYPE-DATED` already budgeted 30-50% of S-ETS-01-01 for this work; the budget holds.
- Locking to ets-common:17 means we re-pin to 18 (or 19) at the beta milestone. **Mitigation**: that upgrade is one ADR + one pom edit + a smoke-test re-run; not a redesign.

**Risks**:
- The `<project.build.outputTimestamp>` reproducibility flag is a Maven 3.6.2+ feature. Maven 3.9 (NFR baseline) supports it. Older Maven would silently ignore it; the maven-enforcer A-5 rule prevents older Maven from being used at all.
- Maven Central does not yet host `ets-common:17` itself — it's published to OSSRH. This is the OGC convention. Generator's local Maven settings.xml must include the OSSRH snapshot/release repos (features10's parent has the same prerequisite). **Document this in `ops/server.md`** at scaffold time.

## Notes / references

- ets-common pom.xml @ master (verified 2026-04-27): https://github.com/opengeospatial/ets-common/blob/master/pom.xml
- ets-common pom.xml @ tag 17: https://github.com/opengeospatial/ets-common/blob/17/pom.xml
- features10 pom.xml @ master: https://github.com/opengeospatial/ets-ogcapi-features10/blob/master/pom.xml
- features10 pom.xml @ branch java17Tomcat10TeamEngine6: https://github.com/opengeospatial/ets-ogcapi-features10/blob/java17Tomcat10TeamEngine6/pom.xml
- TeamEngine production Docker (5.6.1 default): https://github.com/opengeospatial/teamengine-docker/blob/master/teamengine-production/pom.xml
- TeamEngine release tags (5.5, 5.5.1, 5.5.2, 5.6, 5.6.1, 5.7, 6.0.0): https://github.com/opengeospatial/teamengine/tags
- Archetype reference (last 2019 release): http://opengeospatial.github.io/ets-archetype-testng/
- Reproducible builds Maven: https://maven.apache.org/guides/mini/guide-reproducible-builds.html
