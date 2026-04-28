# ADR-007 — Dockerfile Base Image Deviation: `tomcat:8.5-jre17` + Manual TE 5.6.1 Assembly

- **Status**: Accepted (post-hoc; ratified Sprint 2 ets-02 covering S-ETS-01-03 commit `d910808`)
- **Date**: 2026-04-28
- **Decider**: Architect (Alex)
- **Supersedes**: ADR-001 §"Decision" sentence claiming "TeamEngine 5.6.1 production Docker image (`opengeospatial/teamengine-docker/teamengine-production` master, `teamengine.version=5.6.1`) loads the resulting jar without modification" (ADR-001 amended with cross-reference to this ADR per S-ETS-02-01 acceptance criteria)
- **Related**: ADR-001 (TeamEngine SPI registration), ADR-006 (Jersey 3.x / Jakarta EE 9 port), ADR-004 (JDK 17 toolchain), REQ-ETS-TEAMENGINE-003 (Dockerfile), REQ-ETS-TEAMENGINE-005 (smoke-test), Quinn s03 GAP-1, Raze s03 CONCERN-1
- **Supersedes empirically (REQ wording)**: REQ-ETS-TEAMENGINE-003 original wording "extends `ogccite/teamengine-production:5.6.1`" — Sprint 2 spec-reconcile flips the REQ wording to acknowledge this deviation per S-ETS-02-01

## Context

REQ-ETS-TEAMENGINE-003 originally specified: "A `Dockerfile` SHALL produce a runnable TeamEngine 5.6.1 webapp on a JDK 17 base image, mounting our jar under `/usr/local/tomcat/webapps/teamengine/WEB-INF/lib/`. The image SHALL build via `docker build -t ets-ogcapi-connectedsystems10 .` from a clean checkout. Reference: `FROM ogccite/teamengine-production:5.6.1`."

Sprint 1 Generator (Dana) attempted the directive verbatim and discovered two empirical blockers (independently verified by Quinn s03 GAP-1 and Raze s03 CONCERN-1):

**Blocker 1 — `:5.6.1` tag does not exist on Docker Hub.** Direct query against `hub.docker.com/r/ogccite/teamengine-production` (verified 2026-04-28T19:00Z by Dana, 2026-04-28T19:55Z by Quinn, 2026-04-28T20:30Z by Raze): only `:latest` and `:1.0-SNAPSHOT` tags are published. Both 2.45 GB images bundle TE 5.6.1 binaries. No `:5.6.x` tag is published; the OGC's `teamengine-docker` repo's CI pipeline does not tag-and-push semantically-versioned images.

**Blocker 2 — `ogccite/teamengine-production:latest` runs JDK 8.** `docker run --rm ogccite/teamengine-production:latest java -version` returns `openjdk version "1.8.0_332" ... JAVA_VERSION=8u212` (verified by Dana, Quinn, Raze independently). Our ETS jar is JDK 17 bytecode (`javap -v target/classes/.../LandingPageTests.class | head -3` reports `compiled Java class data, version 61.0`). Loading the JDK 17 classfile inside JDK 8 produces `java.lang.UnsupportedClassVersionError: ... has been compiled by a more recent version of the Java Runtime (class file version 61.0), this version of the Java Runtime only recognizes class file versions up to 52.0`. JDK 8 cannot host the ETS jar; the directive as written is impossible to satisfy.

Additionally, our util layer (per ADR-006) imports `jakarta.ws.rs.client.Client` (Jakarta EE 9 namespace, JDK-11+ class shape). JDK 8's `javax.ws.rs.*` would fail to resolve even if the classfile-version check were bypassed.

The two blockers compound: the ONLY published variant of the production image runs the wrong JDK, AND the requested 5.6.1 tag doesn't exist regardless. Dana's S-ETS-01-03 commit `d910808` resolved this by assembling a TeamEngine 5.6.1 webapp manually on top of a JDK 17 base image. The resolution produced 12/12 PASS against GeoRobotix, identical to what the directed image would have produced if it had worked. Quinn s03 + Raze s03 both APPROVE_WITH_GAPS/CONCERNS; the only complaint is "this empirically-justified deviation should have an ADR." This document is that ADR.

## Evidence inspected

Captured in S-ETS-01-03 + Sprint 2 evidence; reproducible commands:

| Claim | Verification command | Output (verified 2026-04-28) |
|---|---|---|
| `:5.6.1` tag absent | `docker manifest inspect ogccite/teamengine-production:5.6.1` | `manifest unknown` |
| Available tags | `curl -s 'https://hub.docker.com/v2/repositories/ogccite/teamengine-production/tags' \| jq '.results[].name'` | `"latest"`, `"1.0-SNAPSHOT"` |
| Production image JDK | `docker run --rm ogccite/teamengine-production:latest java -version` | `openjdk version "1.8.0_332"` |
| Our ETS classfile version | `javap -v target/classes/org/opengis/cite/ogcapiconnectedsystems10/conformance/core/LandingPageTests.class \| head -3` | `class file version 61.0` |
| Jakarta EE 9 imports in our code | `grep -r 'jakarta\.ws\.rs' src/main/java/` | 6 hits across SuiteAttribute, SuiteFixtureListener, ETSAssert, etc. |
| Resolution outcome | `bash scripts/smoke-test.sh` against GeoRobotix | exit 0, 12/12 PASS, container-log clean |

The 3 secondary patches Dana applied (and that this ADR ratifies) are all empirically necessary at the chosen base image:

| Patch | Root cause | Why on this base |
|---|---|---|
| `<Loader className="org.apache.catalina.loader.VirtualWebappLoader"/>` removed from `META-INF/context.xml` | TE 5.6.1 WAR bundles a `<Loader>` directive referencing a Tomcat-7-era class | Tomcat 8.5+ removed `VirtualWebappLoader`; deploying without the strip produces `ClassNotFoundException` during context-config |
| JAXB jars dropped into `/usr/local/tomcat/lib/` (jaxb-api 2.3.1, jaxb-core 2.3.0.1, jaxb-impl 2.3.1, javax.activation-api 1.2.0) | TE 5.6.1's `TestSuiteController` servlet uses JAXB during init | JDK 11+ removed `javax.xml.bind.*` from the JRE; without the shared-lib jars, init crashes with `TypeNotPresentException: Type javax.xml.bind.JAXBContext not present` |
| `target/lib-runtime/` (full deps closure via `mvn dependency:copy-dependencies`) staged into `WEB-INF/lib/`, then `teamengine-*-6.0.0.jar` filtered out | Our SuiteAttribute imports Jersey 3.x; ets-common:17 transitive depMgmt brings TE 6.0.0 jars that would clash with the bundled TE 5.6.1 WAR | Without filter: 6.0.0 vs 5.6.1 SPI symbol collision; without staging: Jersey 3.x not on classpath, our jar fails to register |

Bases tried (all documented in Dana's Dockerfile comment block):

| Base image | Outcome |
|---|---|
| `ogccite/teamengine-production:latest` | JDK 8 — UnsupportedClassVersionError (61.0 vs 52.0); rejected |
| `tomcat:10.1-jre17` | `ClassNotFoundException: VirtualWebappLoader` even after `<Loader>` strip (Tomcat 10 pruned the class entirely AND uses Jakarta EE 9 namespace internally — TE 5.6.1 WAR built against javax.* fails to deploy); rejected |
| `tomcat:9-jre17` | Same `VirtualWebappLoader` miss as Tomcat 10; rejected |
| **`tomcat:8.5-jre17`** | **PICKED**: javax.servlet namespace matches TE 5.6.1's WAR build target; `<Loader>` strip is the only Tomcat-side patch needed; `tomcat:8.5-jre17` is an actively-maintained Eclipse Temurin layer per the Tomcat publishing cadence |

## Decision

The CS API ETS Dockerfile SHALL use `tomcat:8.5-jre17` as the base image and SHALL assemble TeamEngine 5.6.1 manually by downloading the published Maven Central artifacts and applying 3 secondary patches. Specifically:

1. **`FROM tomcat:8.5-jre17`** — Tomcat 8.5 (javax.servlet namespace, matches TE 5.6.1 WAR build target) on the JRE 17 Temurin base.
2. **Download from Maven Central** (parameterized via `ARG TEAMENGINE_VERSION=5.6.1` + `ARG TEAMENGINE_BASE=https://repo.maven.apache.org/maven2/org/opengis/cite/teamengine`):
   - `teamengine-web-5.6.1.war` → `unzip` to `/usr/local/tomcat/webapps/teamengine/`
   - `teamengine-web-5.6.1-common-libs.zip` → `unzip` to `/usr/local/tomcat/lib/`
   - `teamengine-console-5.6.1-base.zip` → `unzip` to `/usr/local/tomcat/te_base/`
3. **Apply the 3 secondary patches** (each documented inline in the Dockerfile with empirical justification per ADR §"Evidence inspected" table above).
4. **Stage the ETS jar + deps closure** (multi-stage in S-ETS-02-05; current S-ETS-01-03 stages externally — see §Consequences):
   - `COPY target/lib-runtime/ /usr/local/tomcat/webapps/teamengine/WEB-INF/lib/`
   - `COPY target/ets-ogcapi-connectedsystems10-<ver>.jar /usr/local/tomcat/webapps/teamengine/WEB-INF/lib/`
   - `COPY target/ets-ogcapi-connectedsystems10-<ver>-ctl.zip /tmp/` then `unzip` into `/usr/local/tomcat/te_base/scripts/`
5. **JAVA_OPTS / CATALINA_OPTS** match the production image's expectations (`TE_BASE`, xerces DocumentBuilderFactory, log4j2 lookup mitigation).
6. **Healthcheck** at `http://localhost:8080/teamengine/` with a 60s start-period.

REQ-ETS-TEAMENGINE-003 wording is reconciled to acknowledge this deviation as part of S-ETS-02-01 (the spec.md Implementation Status section already documents the reconcile pending the ADR).

ADR-001 §Consequences is amended via cross-reference paragraph (per S-ETS-02-01 acceptance criteria): the original sentence "TeamEngine 5.6.1 production Docker image loads the resulting jar without modification" is qualified with a note pointing to this ADR-007 for the JDK-17 + Jakarta-EE-9 reality.

## Alternatives considered

- **Build TeamEngine 5.6.1 from source on a JDK 17 base** (rejected). TE 5.6.1's source builds with Maven against a JDK 11+ baseline, but the build adds 30+ minutes to image-build time and requires git-cloning a specific tag of `opengeospatial/teamengine`. The Maven-Central WAR is byte-identical to what would result and is the artifact the OGC SC themselves publish. No upside; substantial CI cost and brittleness (network calls during `docker build`).
- **Use `ogccite/teamengine-production:latest` with a custom JRE 17 layer overlay** (rejected). Possible via `FROM ogccite/teamengine-production:latest` + `RUN apt-get install -y temurin-17-jre` + `ENV JAVA_HOME=...` + sym-link tricks. This is more layers, larger image, and we lose control of when the production image's base OS or TE patch level changes underneath us. Operationally fragile.
- **Fork `ogccite/teamengine-production` with a JDK 17 base** (rejected for our scope; correct long-term answer for OGC). The right place to fix this is upstream: `opengeospatial/teamengine-docker` adds a `teamengine-production-jre17` variant. We file the request at the beta milestone (REQ-ETS-CITE-003 outreach package) but cannot block Sprint 1 on OGC governance velocity.
- **Pin `ogccite/teamengine-production:1.0-SNAPSHOT`** (rejected). Same JDK 8 base as `:latest`; same `UnsupportedClassVersionError`. No improvement.
- **Wait for `:5.6.1` tag to be published** (rejected). Indefinite timeline (no roadmap). Sprint 1 must produce a runnable smoke-test artifact.
- **Backport the ETS to JDK 8** (rejected). Requires reversing ADR-006's Jakarta-EE-9 port AND ADR-004 A-1's JDK 17 floor. Loses every modernization gain. Also technically blocked by ets-common:17's own JDK 11+ baseline.

## Consequences

**Positive**:
- Works today. 12/12 PASS against GeoRobotix verified by Dana, Quinn (independent fresh-clone re-run), and Raze (independent fresh-clone re-run + adversarial sabotage test). Smoke pipeline is reproducible end-to-end.
- Fully audited via the empirical evidence table above. Any future reviewer can re-run the verification commands and reach the same conclusion.
- The 3 secondary patches are minimal, surgical, and individually documented. Any one of them can be removed when the upstream root-cause is fixed (Tomcat ships VirtualWebappLoader-compat shim; TE drops the `<Loader>` directive; TE wires JAXB explicitly).
- Image is `tomcat:8.5-jre17` (officially-maintained), giving us OS-level security update cadence we control via base-image-pin upgrades.

**Negative**:
- We track Tomcat + JDK base-image security updates ourselves rather than inheriting them from the OGC's production image. `ops/server.md` "Docker base image cadence" section (S-ETS-02-05 to add as part of multi-stage Dockerfile work) is the place we record next-pin commitments.
- Image is larger than minimum necessary: ~600 MB at S-ETS-01-03 close vs `ogccite/teamengine-production:latest`'s 2.45 GB but with the bundled deps fully resolved (most of `target/lib-runtime/` is duplicated from `teamengine-web-common-libs.zip`). S-ETS-02-05 multi-stage rewrite targets ≤ 450 MB.
- The `target/lib-runtime/` staging at S-ETS-01-03 happens **outside** Docker via `scripts/smoke-test.sh` calling `mvn dependency:copy-dependencies` against the host's `~/.m2/`. Fresh CI runners have empty `~/.m2/` → mvn downloads the entire dep tree per CI run. Raze s03 CONCERN-2/3 flagged this; S-ETS-02-05 closes via multi-stage Dockerfile per ADR-009 (multi-stage Dockerfile pattern, this Sprint 2).
- ApacheConnectorProvider not wired in current Jersey 3 setup (per ADR-006 §Consequences). Not a Dockerfile concern per se but a related "ports-and-adapters not maximally configurable" tradeoff.

**Risks**:
- If the OGC publishes `ogccite/teamengine-production:5.6.1` with a JDK 17 base in the future, this ADR's preferred path becomes "use the upstream image." Mitigation: re-evaluate at every quarterly architecture-freshness review; the deviation is a TODO, not a forever-decision.
- If `tomcat:8.5-jre17` is deprecated, we re-port to `tomcat:9-jre17` or `tomcat:10-jre17` — both require fixing the `VirtualWebappLoader` miss + (for Tomcat 10) the Jakarta EE 9 namespace mismatch with TE 5.6.1's javax.servlet WAR. Tomcat 8.5 EOL is 2027-03-31; we have runway. Mitigation: track in `ops/server.md` next-pin section.
- The 3 secondary patches drift if TE 5.6.x patch releases (5.6.2, 5.6.3, ...) change the patch surface. Mitigation: `ARG TEAMENGINE_VERSION=5.6.1` is parameterized; bumps are one-line edits; smoke-test is the regression gate.

## Notes / references

- Quinn s03 evaluator report (gate evidence): `.harness/evaluations/sprint-ets-01-evaluator-s03.yaml` §"verdict_rationale" item (a) at line 42-46 + GAP-1 enumeration
- Raze s03 adversarial report (independent corroboration + adversarial sabotage test): `.harness/evaluations/sprint-ets-01-adversarial-s03.yaml` §"verdict_summary" + CONCERN-1
- Dana's S-ETS-01-03 Dockerfile (this is the file the ADR ratifies): `ets-ogcapi-connectedsystems10/Dockerfile` (commit `d910808`)
- spec.md Implementation Status REQ-ETS-TEAMENGINE-003 deviation note: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` lines 152-153
- TE 5.6.1 Maven Central artifacts (verified resolvable 2026-04-28):
  - https://repo.maven.apache.org/maven2/org/opengis/cite/teamengine/teamengine-web/5.6.1/
  - https://repo.maven.apache.org/maven2/org/opengis/cite/teamengine/teamengine-console/5.6.1/
- Tomcat 8.5 EOL (2027-03-31): https://endoflife.date/apache-tomcat
- Eclipse Temurin JRE 17 image: https://hub.docker.com/_/tomcat/tags?name=8.5-jre17
- Future upstream-fix tracking: file at OGC `teamengine-docker` repo, beta milestone (REQ-ETS-CITE-003 outreach).
