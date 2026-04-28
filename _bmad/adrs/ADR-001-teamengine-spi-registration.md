# ADR-001 — TeamEngine SPI Registration Pattern

- **Status**: Accepted
- **Date**: 2026-04-27
- **Decider**: Architect (Alex)
- **Supersedes**: none
- **Related**: REQ-ETS-TEAMENGINE-001, REQ-ETS-TEAMENGINE-002, SCENARIO-ETS-TEAMENGINE-LOAD-001, planner-handoff §`deferred_to_architect`, discovery-handoff §`flags.LANGUAGE-DECISION-LOCKED`

## Context

TeamEngine 5.x exposes a Java SPI (Service Provider Interface) that an ETS jar must implement to be discoverable at TeamEngine startup. The TeamEngine 5.5 testng-essentials documentation page (referenced from Mary's Discovery handoff) defers the registration mechanics to a "Part 2" page that is not yet linked. Pat's planner-handoff escalated this as the **single highest Sprint 1 risk** — without a working registration path, S-ETS-01-03 cannot land.

The user pivot framing (Mary's `LANGUAGE-DECISION-LOCKED` flag) makes this non-negotiable: TeamEngine SPI is Java; CTL is legacy; non-Java is rejected. We must produce a registration that TeamEngine 5.x discovers without ambiguity.

## Evidence inspected

Direct GitHub fetches against `opengeospatial/ets-ogcapi-features10@master` (verified 2026-04-27):

1. **SPI service file**: `src/main/resources/META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` — a 50-byte plain-text file whose entire contents is a single line: `org.opengis.cite.ogcapifeatures10.TestNGController`. This is the canonical Java `ServiceLoader` registration mechanism: TeamEngine's web-app classloader scans `META-INF/services/` of every jar in `WEB-INF/lib/` for the file named `com.occamlab.te.spi.jaxrs.TestSuiteController` and instantiates each FQCN listed inside.

2. **Controller class**: `src/main/java/org/opengis/cite/ogcapifeatures10/TestNGController.java`. It implements `com.occamlab.te.spi.jaxrs.TestSuiteController` (interface from `teamengine-spi`) and delegates to `com.occamlab.te.spi.executors.testng.TestNGExecutor`. Required methods: `getCode()`, `getVersion()`, `getTitle()` (all read from `ets.properties`), and `doTestRun(Document)`. The class loads `testng.xml` from the classpath (`getResource("testng.xml")`) inside the same package directory.

3. **Properties file**: `src/main/resources/org/opengis/cite/ogcapifeatures10/ets.properties` — three lines, `ets-title`, `ets-version`, `ets-code`, all driven by Maven property substitution at build time (`${project.name}`, `${project.version}`, `${ets-code}`).

4. **Suite descriptor**: `src/main/resources/org/opengis/cite/ogcapifeatures10/testng.xml` — TestNG suite XML, references `<package>` entries under `org.opengis.cite.ogcapifeatures10.conformance.*` and a `<listeners>` block (TestRunListener, SuiteFixtureListener, TestFailureListener, LoggingTestListener).

5. **CTL wrapper**: `src/main/scripts/ctl/ogcapi-features-1.0-suite.ctl` — XSL-based CTL package that declares `xmlns:tng="java:org.opengis.cite.ogcapifeatures10.TestNGController"` and invokes `tng:new($outputDir)` followed by `tng:doTestRun($controller, $testRunArgs)`. The CTL form collects `iut-url` and additional parameters from the user, then dispatches to the Java controller.

This pattern is **uniform across all 10 active `ets-ogcapi-*` repos** (verified spot-check on `ets-ogcapi-edr10`, same META-INF/services file shape and same TestSuiteController interface).

## Decision

The CS API ETS SHALL register with TeamEngine via **all four artifacts**, mirroring the features10 pattern verbatim:

1. **SPI service file** at `src/main/resources/META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` containing exactly one FQCN line:
   ```
   org.opengis.cite.ogcapi.cs10.TestNGController
   ```

2. **Controller class** at `src/main/java/org/opengis/cite/ogcapi/cs10/TestNGController.java` implementing `com.occamlab.te.spi.jaxrs.TestSuiteController`, delegating to `com.occamlab.te.spi.executors.testng.TestNGExecutor`, and loading `ets.properties` + `testng.xml` from the same package on the classpath. The four required methods (`getCode`, `getVersion`, `getTitle`, `doTestRun`) follow the features10 implementations 1:1.

3. **Properties file** at `src/main/resources/org/opengis/cite/ogcapi/cs10/ets.properties` with Maven-substituted `ets-title`, `ets-version`, `ets-code`.

4. **TestNG suite descriptor** at `src/main/resources/org/opengis/cite/ogcapi/cs10/testng.xml` declaring `<test name="Core">` packages under `org.opengis.cite.ogcapi.cs10.conformance.core.*` plus a `<listeners>` block matching the features10 layout (Sprint 1 may ship a minimal listener set; full parity is a Sprint 2 cleanup).

5. **CTL wrapper** at `src/main/scripts/ctl/ogcapi-cs10-suite.ctl` (note: file basename uses the `ets-code` value, mirroring features10's `ogcapi-features-1.0-suite.ctl`) declaring `xmlns:tng="java:org.opengis.cite.ogcapi.cs10.TestNGController"` and an HTML form requesting `iut-url`, `auth-type`, `auth-credential`. Generator follows the features10 CTL XML structure exactly, substituting only the spec links and the form-field set.

The `TestSuiteController` interface MUST be the one shipped by `teamengine-spi` 5.6.x (matching the parent `ets-common:14` dependency tree currently used by features10's master branch). See ADR-004 for the toolchain version pinning.

## Alternatives considered

- **CTL-only ETS** (no SPI / no Java controller): rejected. CTL is legacy; no `ets-ogcapi-*` repo since 2020 chose CTL-only. CITE SC review would flag the architectural divergence and the lack of TestNG would force a re-port at beta gate.
- **Custom service-loader name** (e.g. `org.opengis.cite.cs10.SuiteController`): rejected. TeamEngine scans for the literal FQCN `com.occamlab.te.spi.jaxrs.TestSuiteController`. Any other filename will be silently ignored.
- **Annotation-driven registration** (e.g. `@AutoService`): rejected. TeamEngine's classloader does not run annotation processors at runtime; the `META-INF/services/` file must be present at jar-build time (the maven-assembly-plugin in features10's pom.xml produces the AIO jar; nothing fancy happens at runtime).
- **JAX-RS @Path annotation directly on the Controller**: rejected. TeamEngine's `teamengine-spi` interfaces a JAX-RS dispatcher already; the Controller must implement `TestSuiteController`, not declare its own routes.

## Consequences

**Positive**:
- Generator's S-ETS-01-03 work reduces to a mechanical port: copy 5 file shapes from features10, rename packages and `ets-code`, build.
- TeamEngine 5.6.1 production Docker image (`opengeospatial/teamengine-docker/teamengine-production` master, `teamengine.version=5.6.1`) loads the resulting jar without modification.
- Future TeamEngine 6.0.x migration is well-understood: the SPI interface contract is stable; only the parent `ets-common` version bumps (see ADR-004).

**Negative**:
- The `META-INF/services/` filename hard-codes the `com.occamlab.te` package — a historical artifact from the OGC Compliance Test Engine's pre-2010 origin. We inherit this string verbatim; renaming would break TeamEngine discovery.
- The controller-implements-`TestSuiteController` pattern uses the legacy `org.w3c.dom.Document` for test-run arguments rather than a typed POJO. This is an awkward API but it's the contract; deviating breaks the SPI.

**Risks**:
- If TeamEngine 5.7 or 6.0 changes the SPI signature, we re-port. Mitigation: target the TeamEngine version that the production Docker image currently runs (5.6.1) and pin via `teamengine-spi` artifact version in `pom.xml`.
- The CTL wrapper requires Saxon XSLT 2.0 inside TeamEngine; if a future TeamEngine version switches XSLT engines, the form may render differently. Mitigation: features10's CTL is the reference; we don't innovate on CTL form syntax.

## Notes / references

- features10 SPI file (verified 2026-04-27): https://github.com/opengeospatial/ets-ogcapi-features10/blob/master/src/main/resources/META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController
- features10 TestNGController.java: https://github.com/opengeospatial/ets-ogcapi-features10/blob/master/src/main/java/org/opengis/cite/ogcapifeatures10/TestNGController.java
- features10 testng.xml: https://github.com/opengeospatial/ets-ogcapi-features10/blob/master/src/main/resources/org/opengis/cite/ogcapifeatures10/testng.xml
- features10 CTL wrapper: https://github.com/opengeospatial/ets-ogcapi-features10/blob/master/src/main/scripts/ctl/ogcapi-features-1.0-suite.ctl
- TeamEngine production Docker (verified 2026-04-27): https://github.com/opengeospatial/teamengine-docker/tree/master/teamengine-production
- ets-common parent pom (master = 18-SNAPSHOT, latest tag = 17): https://github.com/opengeospatial/ets-common
