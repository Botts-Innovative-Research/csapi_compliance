# ADR-009 — Multi-Stage Dockerfile Pattern: `eclipse-temurin:17-jdk` Build Stage + `tomcat:8.5-jre17` Runtime Stage

- **Status**: Accepted (forward-looking; binds S-ETS-02-05 implementation)
- **Date**: 2026-04-28
- **Decider**: Architect (Alex)
- **Related**: ADR-007 (base image deviation; this ADR builds on it), REQ-ETS-TEAMENGINE-003 (Dockerfile), REQ-ETS-CLEANUP-004 (NEW Sprint 2 — Dockerfile multi-stage + non-root USER), Quinn s03 SMOKE-TEST-DEP-CLOSURE-WORKFLOW concern, Raze s03 CONCERN-2 + CONCERN-3
- **Supersedes**: none (Sprint 1 single-stage Dockerfile is preserved as-is at HEAD `8aeffbf` — this ADR is the Sprint 2 forward path)

## Context

Sprint 1's S-ETS-01-03 Dockerfile (per ADR-007) is **single-stage**. `target/lib-runtime/` is staged **outside** Docker via `scripts/smoke-test.sh` calling `mvn dependency:copy-dependencies` against the host's `~/.m2/`. This works for a developer with a populated `~/.m2/` but has two real problems Raze s03 CONCERN-2 + CONCERN-3 surfaced:

1. **Fresh-CI brittleness**. A clean GitHub Actions runner with empty `~/.m2/` must download the entire ets-common:17 + Jersey 3.x + REST-Assured + jts-core dep tree on every CI run — 5-10 minutes per invocation, plus exposure to Maven Central / OSSRH intermittent outages.
2. **Image is not self-contained**. A reviewer who clones the repo on a host with no Maven cannot `docker build .` and get a working image; they must first `mvn dependency:copy-dependencies` outside Docker. CITE SC reviewers do exactly this kind of cold-cache reproduction.

S-ETS-02-05 closes both via a multi-stage Dockerfile. The architect must pick **one** of three patterns Pat enumerated:

| Option | What it does | Build cost | CI cold-cache cost | Image size |
|---|---|---|---|---|
| (a) Build stage = Maven container; `mvn dependency:resolve` + `mvn package` inside container; runtime stage `COPY --from=build` | Full mvn lifecycle in Docker | ~30-60s warm; ~4-6 min cold | One-time Maven download per `docker build`; cacheable via BuildKit | Smallest (~400MB target) |
| (b) Build stage = TomCat container with mvn; pre-staged `target/lib-runtime/` (current pattern, just split) | Layer split only | Same as Sprint 1 | No improvement on host-`~/.m2`-dep | Same (~600MB) |
| (c) `pom.xml` profile bakes deps closure at `mvn package` time; Dockerfile just COPYs | Move dep-staging to Maven | Adds 10-20s to every `mvn package` | Same as today (host `~/.m2` still needed at mvn time, but now during `mvn package` not `docker build`) | Smaller than (b) but larger than (a) |

Architect picks **(a)** for these reasons:

1. **Most reproducible across host environments**. A reviewer with only Docker installed (no Maven, no JDK) can `git clone && docker build .` and get a working image. CITE SC reproduction friction is minimized.
2. **CI cold-cache cost is amortized via BuildKit cache mount**. `--mount=type=cache,target=/root/.m2` persists across `docker build` invocations on the same runner; the second CI run is fast even with no host-`~/.m2/`.
3. **Build environment is hermetic**. The Maven version, JDK version, settings.xml are baked into the build stage's image and don't drift with what the developer happens to have installed locally.
4. **Aligns with the OGC ETS catalog convention** — `features10@java17Tomcat10TeamEngine6`'s emerging Dockerfile draft uses the same Maven+Tomcat split.

Option (b) is rejected because it doesn't actually fix the problem (host `~/.m2/` is still required). Option (c) is rejected because it pushes the hermeticity problem upstream into Maven (now `mvn package` requires `~/.m2/` to be populated; same brittleness, different layer).

## Decision

Sprint 2 S-ETS-02-05 SHALL rewrite the Dockerfile as a two-stage build:

### Stage 1 — Build (`builder`)

```dockerfile
FROM eclipse-temurin:17-jdk-jammy AS builder

# Install Maven 3.9.9 — match the ets-common-enforced version (ADR-004 A-5)
ARG MAVEN_VERSION=3.9.9
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -fsSL "https://dlcdn.apache.org/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz" \
    | tar -xz -C /opt \
 && ln -s /opt/apache-maven-${MAVEN_VERSION}/bin/mvn /usr/local/bin/mvn \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy pom.xml first to maximize layer cache for offline-resolution (deps don't change every commit)
COPY pom.xml ./
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q dependency:go-offline

# Now copy source (every commit invalidates this layer; OK because deps are cached)
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q clean package -DskipTests \
 && mvn -B -q dependency:copy-dependencies -DoutputDirectory=target/lib-runtime -DincludeScope=runtime \
 && rm -f target/lib-runtime/teamengine-*.jar
```

### Stage 2 — Runtime (`tomcat:8.5-jre17`)

Per ADR-007, runtime stage stays on `tomcat:8.5-jre17` with the 3 secondary patches.

```dockerfile
FROM tomcat:8.5-jre17

LABEL org.opencontainers.image.title="ets-ogcapi-connectedsystems10"
LABEL org.opencontainers.image.source="https://github.com/Botts-Innovative-Research/ets-ogcapi-connectedsystems10"
LABEL org.opencontainers.image.licenses="Apache-2.0"

ARG TEAMENGINE_VERSION=5.6.1
ARG TEAMENGINE_BASE=https://repo.maven.apache.org/maven2/org/opengis/cite/teamengine

# Download + install TeamEngine 5.6.1 (per ADR-007)
RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip ca-certificates curl \
 && apt-get clean && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /root/te-stage \
 && cd /root/te-stage \
 && curl -fsSL "${TEAMENGINE_BASE}/teamengine-web/${TEAMENGINE_VERSION}/teamengine-web-${TEAMENGINE_VERSION}.war" -o teamengine-web.war \
 && curl -fsSL "${TEAMENGINE_BASE}/teamengine-web/${TEAMENGINE_VERSION}/teamengine-web-${TEAMENGINE_VERSION}-common-libs.zip" -o teamengine-web-common-libs.zip \
 && curl -fsSL "${TEAMENGINE_BASE}/teamengine-console/${TEAMENGINE_VERSION}/teamengine-console-${TEAMENGINE_VERSION}-base.zip" -o teamengine-console-base.zip \
 && unzip -q teamengine-web.war -d /usr/local/tomcat/webapps/teamengine \
 && unzip -q teamengine-web-common-libs.zip -d /usr/local/tomcat/lib \
 && unzip -q teamengine-console-base.zip -d /usr/local/tomcat/te_base \
 && rm -rf /root/te-stage

# Patch 1: VirtualWebappLoader strip (per ADR-007)
RUN sed -i '/<Loader className="org.apache.catalina.loader.VirtualWebappLoader"/,/\/>/d' \
        /usr/local/tomcat/webapps/teamengine/META-INF/context.xml

# Patch 2: JAXB shared lib (per ADR-007)
RUN cd /usr/local/tomcat/lib \
 && curl -fsSL "https://repo.maven.apache.org/maven2/javax/xml/bind/jaxb-api/2.3.1/jaxb-api-2.3.1.jar" -o jaxb-api-2.3.1.jar \
 && curl -fsSL "https://repo.maven.apache.org/maven2/com/sun/xml/bind/jaxb-core/2.3.0.1/jaxb-core-2.3.0.1.jar" -o jaxb-core-2.3.0.1.jar \
 && curl -fsSL "https://repo.maven.apache.org/maven2/com/sun/xml/bind/jaxb-impl/2.3.1/jaxb-impl-2.3.1.jar" -o jaxb-impl-2.3.1.jar \
 && curl -fsSL "https://repo.maven.apache.org/maven2/javax/activation/javax.activation-api/1.2.0/javax.activation-api-1.2.0.jar" -o javax.activation-api-1.2.0.jar

# Stage 1 output: COPY only the runtime artifacts. NO build tools, NO sources, NO ~/.m2 cache.
COPY --from=builder /build/target/lib-runtime/ /usr/local/tomcat/webapps/teamengine/WEB-INF/lib/
COPY --from=builder /build/target/ets-ogcapi-connectedsystems10-*.jar /usr/local/tomcat/webapps/teamengine/WEB-INF/lib/
COPY --from=builder /build/target/ets-ogcapi-connectedsystems10-*-ctl.zip /tmp/ets-ctl.zip
RUN unzip -q -o /tmp/ets-ctl.zip -d /usr/local/tomcat/te_base/scripts \
 && rm /tmp/ets-ctl.zip

# Remove placeholder note suite (per ADR-007 / Sprint 1 Dockerfile)
RUN rm -rf /usr/local/tomcat/te_base/scripts/note 2>/dev/null || true

# Non-root user — REQ-ETS-CLEANUP-004 mandate
RUN groupadd -r tomcat && useradd -r -g tomcat -d /usr/local/tomcat -s /sbin/nologin tomcat \
 && chown -R tomcat:tomcat /usr/local/tomcat
USER tomcat

ENV JAVA_OPTS="-Xms1024m -Xmx2048m -DTE_BASE=/usr/local/tomcat/te_base -Djavax.xml.parsers.DocumentBuilderFactory=com.sun.org.apache.xerces.internal.jaxp.DocumentBuilderFactoryImpl"
ENV CATALINA_OPTS="-Dlog4j2.formatMsgNoLookups=true"

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=12 \
  CMD curl -fsS -o /dev/null http://localhost:8080/teamengine/ || exit 1

CMD ["catalina.sh", "run"]
```

### Layer ordering rationale (build-time cache efficiency)

Cheapest-to-most-expensive ordering keeps unchanged layers cached:

| Layer order | Why this position |
|---|---|
| Stage 1: Maven install | Changes only when MAVEN_VERSION ARG changes (rare) |
| Stage 1: `COPY pom.xml` + `mvn dependency:go-offline` | Changes only when pom.xml does (every dep update — periodic) |
| Stage 1: `COPY src` + `mvn package` | Changes every commit (frequent) — placed last |
| Stage 2: apt-get + TE WAR download | Changes only when TEAMENGINE_VERSION ARG changes (rare) |
| Stage 2: VirtualWebappLoader strip + JAXB jars | Changes only when ADR-007 secondary patches evolve (rare) |
| Stage 2: `COPY --from=builder` | Changes every commit (frequent) — placed late |
| Stage 2: USER + ENV + HEALTHCHECK + CMD | Cheap; placed last |

### USER directive rules

- Create a system group `tomcat` (no login, no shell, no home directory creation beyond `/usr/local/tomcat`).
- Create a system user `tomcat` belonging to that group.
- `chown -R tomcat:tomcat /usr/local/tomcat` BEFORE the USER directive (`chown` requires root).
- Switch to USER tomcat. The CMD `catalina.sh run` runs as the unprivileged user.
- Required for REQ-ETS-CLEANUP-004 acceptance criterion ("Container runs as non-root, verified via `docker run ... id` showing non-zero UID").

### Image size target

- Single-stage Sprint 1 image: ~600 MB (per ADR-007 §Consequences).
- Multi-stage target: ≤ 450 MB (S-ETS-02-05 sub-task A acceptance threshold; soft target 400 MB).
- Savings come from: (a) build stage discarded (Maven + JDK 17-jdk + ~/.m2 cache = ~500 MB excluded), (b) duplicate jars between TE common-libs and our deps removed by dedupe RUN steps if needed (defer to Sprint 3 if 450 MB is missed).

### `scripts/smoke-test.sh` simplification

Post-multi-stage, `scripts/smoke-test.sh` SHALL:

- DROP the `mvn -B -q clean package -DskipTests` step (line 67 in current).
- DROP the `mvn -B -q dependency:copy-dependencies` step (line 75 in current).
- Keep step 1 ("staging build artifacts") only as a sanity check (`docker build .` is the now-canonical staging).

This eliminates the host `~/.m2` dependency; smoke-test runs cleanly on a runner with only Docker installed.

## Alternatives considered

- **Option (b) — pre-staged `target/lib-runtime/`** (rejected, see §Context). Doesn't fix host-`~/.m2` dep; just splits layers cosmetically.
- **Option (c) — bake into pom.xml profile** (rejected, see §Context). Pushes hermeticity problem one layer up.
- **Distroless runtime stage** (`gcr.io/distroless/java17-debian12`) (rejected for Sprint 2). Distroless eliminates apt-get / curl / sed at runtime, shrinking image to ~250 MB, but: (a) Tomcat 8.5 is not pre-installed in distroless — would need to overlay; (b) the 3 secondary patches per ADR-007 (VirtualWebappLoader strip uses sed; JAXB jars via curl; both at image-build time) can be done in stage 1 before distroless final, but adds complexity. Defer to Sprint 5+ at the earliest.
- **Single-stage with `--mount=type=cache,target=/root/.m2`** (rejected). The mount is a build-time cache, not a runtime layer. The cached Maven repo lives at `~/.m2` inside the container during `docker build` only; it is NOT shipped in the final image. So a single-stage Dockerfile with `--mount=cache` does eliminate fresh-CI brittleness — but image still contains the JDK and Maven (build tools), bloating size. Multi-stage is strictly better.
- **Use BuildKit's `--platform=linux/arm64`** for Apple Silicon support (deferred). Out of Sprint 2 scope. The current ETS jar is JDK bytecode = platform-independent; the only platform-sensitive layers are the base images (`eclipse-temurin:17-jdk-jammy` and `tomcat:8.5-jre17` both publish multi-arch). When demand surfaces, add `--platform` to the GitHub Actions build matrix.
- **Add `mvn test` to stage 1** (rejected). Tests are run via `mvn -B clean install` in CI before `docker build`; baking them into the image build re-runs the surefire suite on every Docker build. Wastes 30s per build. The `target/*.jar` produced by `-DskipTests` in the build stage is byte-identical to the one produced by `install` (per Sprint 1 reproducibility evidence).

## Consequences

**Positive**:
- Fresh-CI runners with no `~/.m2` cache complete `docker build .` end-to-end in ~5-6 min cold (Maven dep download), ~30-90 sec warm (BuildKit cache hit). Eliminates Quinn s03 SMOKE-TEST-DEP-CLOSURE-WORKFLOW concern and Raze s03 CONCERN-2/3.
- Image is self-contained — `git clone && docker build .` is the only command needed. Maximizes CITE SC reviewer reproducibility.
- USER tomcat directive closes REQ-ETS-CLEANUP-004 + brings the image in line with security baselines for OCI containers (CIS Docker Benchmark §4.1).
- Layer cache discipline minimizes per-commit Docker build cost (only the source-COPY + mvn-package layer invalidates on most commits).
- `scripts/smoke-test.sh` simplifies — fewer environmental prerequisites = fewer ways to break.

**Negative**:
- Build stage adds ~100 MB intermediate image (eclipse-temurin:17-jdk-jammy is ~440 MB compressed; ours adds Maven 3.9.9 ~10 MB). Discarded after build, but disk space briefly consumed. Acceptable.
- BuildKit must be enabled for `--mount=type=cache` to work. Modern Docker (>= 19.03) and GitHub Actions have it enabled by default; ops/server.md should record `DOCKER_BUILDKIT=1` as a (defensive) env var.
- The `mvn dependency:go-offline` step in stage 1 doesn't fully resolve all plugins because Maven plugin classes are loaded reflectively. ~10% of `mvn package` time still requires online access for stragglers. Mitigated by BuildKit cache; for fully-offline builds add `mvn -o package` (offline mode) after a successful initial cache populate.
- Filtering `teamengine-*-6.0.0.jar` from `target/lib-runtime/` happens inside stage 1 (per the Dockerfile snippet above, `&& rm -f target/lib-runtime/teamengine-*.jar`). If ets-common ever bumps to TE 7.x, the wildcard pattern needs updating. Mitigated by smoke-test catching the SPI-collision symptom.

**Risks**:
- BuildKit cache layout is not stable across Docker versions; an upgrade may invalidate the `--mount=type=cache` cache and force a full re-download. Mitigation: document the cache-clear behavior in ops/server.md and accept the occasional cold rebuild.
- `eclipse-temurin:17-jdk-jammy` Docker tag may be deprecated in favor of a different distribution name in the future. Mitigation: pin the tag explicitly with the digest at S-ETS-02-05 close (`FROM eclipse-temurin:17-jdk-jammy@sha256:<digest>`); periodic re-pin via `ops/server.md` "Docker base image cadence" section.
- The non-root USER tomcat directive may break smoke-test.sh's container-log fetching if Tomcat's log dir was previously root-owned. Mitigated by `chown -R tomcat:tomcat /usr/local/tomcat` BEFORE the USER directive (writes /usr/local/tomcat/logs/* are now owned by tomcat).

## Notes / references

- ADR-007 (the upstream constraint this ADR builds on): `_bmad/adrs/ADR-007-dockerfile-base-image-deviation.md`
- Quinn s03 SMOKE-TEST-DEP-CLOSURE-WORKFLOW: `.harness/evaluations/sprint-ets-01-evaluator-s03.yaml` line 47-54
- Raze s03 CONCERN-2 + CONCERN-3: `.harness/evaluations/sprint-ets-01-adversarial-s03.yaml`
- BuildKit cache mount documentation: https://docs.docker.com/build/cache/optimize/#use-cache-mounts
- Eclipse Temurin Docker images: https://hub.docker.com/_/eclipse-temurin
- CIS Docker Benchmark §4.1 (run as non-root): https://www.cisecurity.org/benchmark/docker
- S-ETS-02-05 acceptance criteria (the work this ADR ratifies): `epics/stories/s-ets-02-05-dockerfile-cleanup.md`
