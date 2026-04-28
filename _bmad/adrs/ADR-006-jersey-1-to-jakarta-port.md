# ADR-006 — Jersey 1.x → Jakarta EE 9 / Jersey 3.x Port (Archetype Util Layer)

- **Status**: Accepted (post-hoc; ratified Sprint 2 ets-02 covering 6 Sprint 1 commits)
- **Date**: 2026-04-28
- **Decider**: Architect (Alex)
- **Supersedes**: none
- **Related**: ADR-001, ADR-004 (Group B — dependency pins), REQ-ETS-SCAFFOLD-002 (JDK 17 + Maven 3.9), REQ-ETS-SCAFFOLD-006 (modernization ADRs), Raze s01 CONCERN-1, architect-handoff (Sprint 1) §`constraints_for_generator.must` "Apply ADR-004 modernization checklist Groups A-D items as separate atomic commits, each commit message citing the ADR row"
- **Reference port**: `github.com/opengeospatial/ets-ogcapi-features10@java17Tomcat10TeamEngine6` branch

## Context

`org.opengis.cite:ets-archetype-testng:2.7` (2019) generates a scaffold whose archetype-supplied utility classes — `ClientUtils`, `URIUtils`, `ReusableEntityFilter`, `CommonFixture`, `TestFailureListener`, `ETSAssert`, `SuiteAttribute`, `SuiteFixtureListener`, plus the verification-test class `VerifySuiteFixtureListener` — import `com.sun.jersey.api.client.*` (Jersey 1.x, the deprecated codehaus pre-Glassfish API) and `javax.ws.rs.*` (the pre-Jakarta-EE-9 namespace). On a JDK 17 + Maven 3.9 + ets-common:17 toolchain (per ADR-004 A-1), neither resolves at compile time:

- `com.sun.jersey.*` is removed entirely. Glassfish Jersey 3.1.8 (transitive via ets-common:17 → teamengine-spi → jersey-core 3.1.8) lives at `org.glassfish.jersey.*`.
- `javax.ws.rs.*` is removed in Jakarta EE 9. The renamed `jakarta.ws.rs.*` is what Jersey 3.x publishes.

ADR-004 Group B anticipated dep-version overrides as **single-line pom changes**. It did not anticipate that 8 archetype-supplied source files would need namespace-rewrite + API-shape rewrite (the Jersey 1.x `Client` builder, `ClientResponseFilter` SPI, JAX-RS `Response` accessors, and the `WebResource`-vs-`WebTarget` fluent API all changed shape between Jersey 1 and Jersey 3). Sprint 1 Generator (Dana) executed this port in 6 atomic commits citing the `features10@java17Tomcat10TeamEngine6` reference branch verbatim, but no ADR row existed for the work — the architect-handoff `must` constraint ("each commit message citing the ADR row") was letter-violated for these 6 commits because ADR-004 did not anticipate Group F.

Raze s01 CONCERN-1 flagged this audit gap (recorded at `.harness/evaluations/sprint-ets-01-adversarial.yaml` line 156-185). Quinn s01 corroborated. Both gates noted: "the technical port is sound; the gap is purely audit-trail." This ADR retroactively closes the gap by recording the Decision + Alternatives that the 6 commits collectively embody.

## Evidence inspected (post-hoc)

The 6 Sprint 1 commits in `Botts-Innovative-Research/ets-ogcapi-connectedsystems10` covering this work:

| SHA | Subject | File(s) ported |
|---|---|---|
| `8e031ef` | S-ETS-01-01: port ClientUtils to Jersey 3 / Jakarta EE 9 (ref features10@java17Tomcat10TeamEngine6) | `util/ClientUtils.java` |
| `3979709` | S-ETS-01-01: port URIUtils.dereferenceURI to Jersey 3 / Jakarta EE 9 (ref features10@java17Tomcat10TeamEngine6) | `util/URIUtils.java` |
| `9ca229f` | S-ETS-01-01: port ReusableEntityFilter to ClientResponseFilter SPI (ref features10@java17Tomcat10TeamEngine6) | `listener/ReusableEntityFilter.java` |
| `87c6fe2` | S-ETS-01-01: SuiteAttribute + SuiteFixtureListener — Jakarta Client import | `SuiteAttribute.java`, `listener/SuiteFixtureListener.java` |
| `9b42cb7` | S-ETS-01-01: port CommonFixture, TestFailureListener, ETSAssert to Jakarta EE 9 | `CommonFixture.java`, `listener/TestFailureListener.java`, `ETSAssert.java` |
| `d01c187` | S-ETS-01-01: VerifySuiteFixtureListener — Mockito 3+ ArgumentMatchers | `src/test/java/.../VerifySuiteFixtureListener.java` |

`features10@java17Tomcat10TeamEngine6` was inspected for each file shape. The rewrite is mechanical at the class boundary: `com.sun.jersey.api.client.Client` → `jakarta.ws.rs.client.Client` (built via `ClientBuilder.newClient()`); `WebResource.get()` → `WebTarget.request().get()`; `ClientFilter` (Jersey 1 SPI, takes `ClientRequest`) → `ClientResponseFilter` (Jakarta EE 9 SPI, takes `ClientRequestContext` + `ClientResponseContext`); JAX-RS Response readers gain `.readEntity(Class<T>)` typed-binding APIs. Mockito's old `(Class<T>) anyObject()` → `any(Class.class)` (Mockito 3+) per `d01c187`.

## Decision

The CS API ETS SHALL port the archetype-supplied util layer to Jakarta EE 9 + Glassfish Jersey 3.x using the `features10@java17Tomcat10TeamEngine6` branch as the file-shape reference. The port covers exactly the 8 source files listed above plus the matching verification test. The port:

1. **Replaces every `com.sun.jersey.*` import** with the Glassfish equivalent at `org.glassfish.jersey.*` — Jersey 3.1.8 is supplied transitively by ets-common:17 → teamengine-spi → jersey-core; no explicit `<dependency>` declaration is added in the new ETS pom (parent depMgmt remains the single source of truth per ADR-004).
2. **Replaces every `javax.ws.rs.*` import** with `jakarta.ws.rs.*`. Jakarta EE 9 namespace.
3. **Migrates the Jersey 1 ClientFilter SPI** to the Jakarta EE 9 `ClientResponseFilter` SPI for `ReusableEntityFilter` (the only filter the archetype ships).
4. **Migrates the Jersey 1 Client builder pattern** (`Client.create()`) to `ClientBuilder.newClient()` for `ClientUtils.buildClientWithFailureLogging()` and `URIUtils.dereferenceURI()`.
5. **Updates Mockito** from `org.mockito.Matchers` (deprecated) to `org.mockito.ArgumentMatchers` (Mockito 3+) in `VerifySuiteFixtureListener` — required because the rewritten Jakarta types changed enough that the old matcher inferences no longer compile.

The port is committed as **6 atomic commits**, one per file or tightly-coupled file-pair, each commit message citing this ADR retroactively at Sprint 2 close (per S-ETS-02-01 acceptance criteria).

ADR-004 is amended (Group F row — see ADR-004 Notes) to record that this work is the canonical "Group F — Jersey 1.x → 3.x source port" item. ADR-004 itself is not rewritten; the cross-reference is sufficient.

## Alternatives considered

- **Stay on Jersey 1.x by adding an explicit `com.sun.jersey:jersey-client:1.19.4` dependency** (rejected). (a) Conflicts with the Jersey 3.1.8 already on the classpath via ets-common:17 → teamengine-spi; classloader will see both `com.sun.jersey.api.client.Client` and `jakarta.ws.rs.client.Client` and the codepath that wins is non-deterministic. (b) Reverses the 2024 Jakarta EE 9 namespace migration that the entire OGC ETS catalog is moving toward (`features10@java17Tomcat10TeamEngine6`, `edr10@master` JDK 17 backport branch, etc.). (c) Forces the archetype's util layer to remain on a 2017-vintage API while the rest of our code uses Jakarta. (d) `com.sun.jersey:jersey-client` is no longer maintained; CVE-mitigation pressure increases.
- **Rewrite the util layer using `java.net.http.HttpClient`** (JDK 11+ HTTP client; rejected). Eliminates the Jakarta dependency for HTTP, but: (a) every other ets-ogcapi-* repo uses Jakarta JAX-RS via Jersey 3; structural divergence flags during CITE SC review. (b) Forces a port of ETSAssert's `Response` accessor patterns to a different `HttpResponse<T>` API surface — extra work without architectural payoff.
- **Skip the port and let the archetype util layer go unused** (rejected). The util layer (CommonFixture, SuiteFixtureListener, ETSAssert) is wired into testng.xml's `<listeners>` block and consumed by every conformance.* package via inheritance. Removing it = rewriting the suite-fixture pattern from scratch = much more risk than a 6-commit mechanical port.
- **Wait for ets-archetype-testng to ship a JDK 17 / Jakarta-EE-9 release** (rejected). Last archetype release was 2.7 in 2019; no 3.x roadmap is published. Sprint 1 cannot block on unscheduled OGC governance velocity.

## Consequences

**Positive**:
- Util layer compiles cleanly on JDK 17 with no transitive-dep conflicts (verified: surefire 22/0/0/3 across S-ETS-01-01, S-ETS-01-02, S-ETS-01-03; `mvn dependency:tree` shows zero `com.sun.jersey:*` artifacts).
- Source-shape parity with `features10@java17Tomcat10TeamEngine6` — when CITE SC reviewers diff the two repos' util layers, the port is a name substitution + ADR-003 package rename, nothing else. Easy review.
- The 6 atomic commits remain `git bisect`-able. Future regression hunts (e.g. "when did URIUtils start returning empty bodies for HTTPS hosts?") narrow to a 1-file diff per bisect step.
- Removing `com.sun.jersey:*` from the runtime closes the CVE-2018-14721 / CVE-2020-25649 attack surface that lingers on Jersey 1.x.

**Negative**:
- ADR-004's "Groups A-D, ~25 items" framing is now extended to include Group F. Future planners reading ADR-004 in isolation will not see this item; ADR-006 must be cross-referenced. Mitigated by ADR-004's "Notes" footer (cross-ref added per S-ETS-02-01 acceptance criteria).
- One Jersey-3-specific behavior change is currently masked: `ApacheConnectorProvider` (which Jersey 1's `Client.create(ClientConfig)` configured by default in some archetype branches) is **not** wired in the port. The default `HttpUrlConnectorProvider` from JDK's built-in HTTP stack is used instead. This is fine for `URIUtils.dereferenceURI()` but limits future configurability (no per-request connection pooling tuning, no HTTP/2 ALPN). Add `jersey-apache-connector` if a future requirement needs it (Sprint 3+ per `ets-ogcapi-connectedsystems10/ops/server.md`).
- The port deviates from the archetype's "untouched scaffold" intent. Audit trail: this ADR + the 6 commit messages cite `features10@java17Tomcat10TeamEngine6` so the deviation is traceable.

**Risks**:
- `jakarta.ws.rs.client.Client` semantics differ subtly from `com.sun.jersey.api.client.Client` around connection re-use. Jersey 3's default is HTTP keep-alive enabled; Jersey 1's default depended on connector. Functional behavior identical for the GET-and-validate workload Sprint 1 uses; potential surprise if a future @Test does many small requests in a tight loop without explicit `.close()`. Mitigation: `ClientUtils.close(Client)` is called from `SuiteFixtureListener.onFinish()` per ports's `9b42cb7` shape.
- If TeamEngine 6.0 changes the SPI signature for `TestSuiteController`, our Jakarta-3 client may need re-port. Low probability per Architecture §11 risk #1 and ADR-004 Group E-1 deferral; revisited at beta milestone.

## Notes / references

- features10 reference branch (verified 2026-04-28): https://github.com/opengeospatial/ets-ogcapi-features10/tree/java17Tomcat10TeamEngine6
- features10 Jakarta-EE-9 ClientUtils.java (one of the file shapes Dana copied): https://github.com/opengeospatial/ets-ogcapi-features10/blob/java17Tomcat10TeamEngine6/src/main/java/org/opengis/cite/ogcapifeatures10/util/ClientUtils.java
- features10 Jakarta-EE-9 URIUtils.java: same branch, `util/URIUtils.java`
- Jersey 3.1.8 release notes: https://eclipse-ee4j.github.io/jersey/release-notes/3.1.8.html
- Jakarta EE 9 namespace migration (Eclipse Foundation, 2020): https://jakarta.ee/release/9/
- Quinn s01 evaluator report: `.harness/evaluations/sprint-ets-01-evaluator.yaml`
- Raze s01 CONCERN-1 (the gap this ADR closes): `.harness/evaluations/sprint-ets-01-adversarial.yaml` lines 156-185
- ets-ogcapi-connectedsystems10 commits 8e031ef..d01c187 (the work this ADR retroactively covers).
