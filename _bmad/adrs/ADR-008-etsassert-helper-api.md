# ADR-008 — EtsAssert REST/JSON Helper API Surface

- **Status**: Accepted (forward-looking; binds S-ETS-02-02 implementation + every conformance.* class from Sprint 2 onward)
- **Date**: 2026-04-28
- **Decider**: Architect (Alex)
- **Related**: ADR-001, ADR-003, REQ-ETS-CORE-001 (test method per ATS assertion with structured FAIL message), REQ-ETS-CLEANUP-001 (NEW Sprint 2 — EtsAssert helper API contract), Sprint 1 architect-handoff `must` constraint #9, Quinn s02 GAP-1, Raze s02 GAP-1
- **Supersedes**: none

## Context

Sprint 1's architect-handoff `must` constraint #9 directed: "Use EtsAssert with structured FAIL messages including the `/req/*` URI; do not throw bare TestNG `AssertionError`." Generator (Dana) honored the **intent** (every FAIL message embeds the `/req/*` URI as the first token of the assertion message) but **violated the form**: 21 bare `throw new AssertionError(...)` invocations across the 3 conformance.core test classes (`LandingPageTests` 7 sites, `ConformanceTests` 6 sites, `ResourceShapeTests` 8 sites) and zero calls into the existing `ETSAssert` helper.

The existing `ETSAssert.java` (191 LOC, archetype-retained) is XML/Schematron-oriented (`assertQualifiedName`, `assertXPath`, `assertSchemaValid`, `assertSchematronValid`, `assertExceptionReport`) plus uses W3C DOM types — it has zero REST-Assured / JSON / `Response`-friendly methods. A Generator looking to migrate a bare-throw site has no helper that fits the shape of the assertion. That gap is what this ADR closes.

Sprint 2 grows the assertion surface: SystemFeaturesTests (S-ETS-02-06) adds 4-15 @Test methods (architect ratifies coverage scope in design.md §"SystemFeatures conformance class scope (Sprint 2 S-ETS-02-06)"). Sprints 3+ add 11 more Part 1 classes. Without a helper layer, the ~80-100 future assertion sites all repeat the bare-throw pattern. Refactor cost compounds.

Pat (Planner) proposed 4 helper signatures but deferred the final API ratification to the Architect. Alex inspects:

1. **What `ETSAssert.java` currently looks like** in the new repo (read 2026-04-28; the static-method, ErrorMessage-format, `Assert.assertX(actual, expected, msg)` / `throw new AssertionError(msg)` pattern).
2. **What `features10@master`'s `EtsAssert` helpers look like** (Glassfish JAX-RS Response shape; `Response.getStatus()` + `readEntity(Class<T>)` patterns; assertions throw via TestNG's `Assert.fail()` or `Assert.assertEquals` with the `/req/*` URI embedded in `msg`).
3. **What Sprint 1's bare-throw sites look like** (every site is shape `if (cond_failed) throw new AssertionError(REQ_X + " — message: " + actual_value);`).
4. **What ets-common 17 ships in `org.opengis.cite.assertion.*`** (mostly XML/Schematron utilities; nothing REST/JSON-friendly).

The 4 Pat-proposed signatures map cleanly onto the 21 bare-throw sites. Architect ratifies with one clarification: the `failWithUri` form is the universal escape hatch (handles assertion logic the type-specific helpers can't express). The 4 signatures are accepted.

## Decision

Extend `org.opengis.cite.ogcapiconnectedsystems10.ETSAssert` with **5 new static helpers** (4 Pat-proposed + 1 specialization for the most common JSON pattern observed in Sprint 1's bare-throw sites). All new helpers carry the OGC `/req/*` URI as their final parameter and prefix the failure message with that URI per REQ-ETS-CORE-001's structured-FAIL discipline.

### API surface

```java
package org.opengis.cite.ogcapiconnectedsystems10;

import io.restassured.response.Response;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

public class ETSAssert {

    // ... existing XML/Schematron helpers preserved verbatim ...

    /**
     * Asserts the HTTP response status code matches expected.
     * On failure, raises AssertionError with prefix "{reqUri} — expected HTTP {expected}, got {actual}".
     * Use for the most common Sprint 1 pattern: "if (resp.getStatusCode() != 200) throw new AssertionError(REQ_X + ...)".
     *
     * @param resp the REST-Assured Response under test (non-null)
     * @param expected expected HTTP status code
     * @param reqUri the OGC /req/* URI being asserted (non-null, non-empty)
     */
    public static void assertStatus(Response resp, int expected, String reqUri);

    /**
     * Asserts a parsed JSON object body has the named key with a value of the expected Java type.
     * On failure, raises AssertionError with prefix "{reqUri} — expected key '{key}' of type {type.getSimpleName()}".
     * Type may be String.class, Number.class, Boolean.class, List.class, Map.class, or Object.class
     * (Object.class accepts any non-null value).
     *
     * @param body parsed JSON body as a Map (non-null)
     * @param key the JSON key to look up (non-null, non-empty)
     * @param type expected Java type of the value (non-null; use Object.class for "any non-null")
     * @param reqUri the OGC /req/* URI being asserted
     */
    public static void assertJsonObjectHas(Map<String, Object> body, String key, Class<?> type, String reqUri);

    /**
     * Asserts a parsed JSON array contains at least one element matching the predicate.
     * On failure, raises AssertionError with prefix "{reqUri} — array did not contain any element matching: {desc}".
     * Use for "links contains rel=conformance" / "conformsTo contains URI X" assertions.
     *
     * @param array parsed JSON array (non-null; empty array is a failure)
     * @param pred predicate to test each element
     * @param desc human-readable description of what the predicate is looking for (e.g. "rel=conformance link")
     * @param reqUri the OGC /req/* URI being asserted
     */
    public static void assertJsonArrayContains(List<?> array, Predicate<Object> pred, String desc, String reqUri);

    /**
     * Asserts a parsed JSON array contains AT LEAST ONE element OUT OF a list of acceptable predicates.
     * Used for OR-fallback patterns (e.g. "service-desc OR service-doc"). On failure, raises AssertionError
     * with prefix "{reqUri} — array did not contain any element matching ANY of: {descs}".
     *
     * @param array parsed JSON array (non-null)
     * @param desc-pred pairs of (description, predicate); array must match at least one
     * @param reqUri the OGC /req/* URI being asserted
     */
    public static void assertJsonArrayContainsAnyOf(List<?> array, List<Map.Entry<String, Predicate<Object>>> alternatives, String reqUri);

    /**
     * Universal escape hatch: raise AssertionError with the standard URI-prefixed format,
     * for use when the assertion logic is too custom for the type-specific helpers above.
     * Equivalent to `throw new AssertionError(reqUri + " — " + message)`.
     *
     * @param reqUri the OGC /req/* URI being asserted
     * @param message free-form failure message (the URI is prepended; do not include it in `message`)
     */
    public static void failWithUri(String reqUri, String message);
}
```

### Refactoring rules for the 21 Sprint-1 sites

For each existing bare-throw site:

| Original pattern | Use helper |
|---|---|
| `if (resp.getStatusCode() != EXPECTED) throw new AssertionError(REQ + " — expected HTTP ...");` | `ETSAssert.assertStatus(resp, EXPECTED, REQ);` |
| `if (!body.containsKey(KEY)) throw new AssertionError(REQ + " — expected ... key");` | `ETSAssert.assertJsonObjectHas(body, KEY, Object.class, REQ);` |
| `if (!(body.get(KEY) instanceof String)) throw new AssertionError(REQ + " — expected ... string");` | `ETSAssert.assertJsonObjectHas(body, KEY, String.class, REQ);` |
| `if (links.stream().noneMatch(l -> "rel=X".equals(l.get("rel")))) throw new AssertionError(REQ + " — must contain rel=X");` | `ETSAssert.assertJsonArrayContains(links, l -> "X".equals(((Map) l).get("rel")), "rel=X link", REQ);` |
| `if (!(serviceDesc OR serviceDoc)) throw new AssertionError(REQ + " — needs service-desc OR service-doc");` | `ETSAssert.assertJsonArrayContainsAnyOf(links, List.of(entry("service-desc link", l -> "service-desc".equals(((Map) l).get("rel"))), entry("service-doc link", l -> "service-doc".equals(((Map) l).get("rel")))), REQ);` |
| Anything that doesn't fit the above (custom predicates, multi-step assertions, sentinel patterns) | `ETSAssert.failWithUri(REQ, "...message...");` invoked from inside the custom logic |

### Examples drawn from actual Sprint 1 sites

`LandingPageTests:107` (current bare-throw):
```java
if (resp.getStatusCode() != 200) {
    throw new AssertionError(REQ_ROOT_SUCCESS + " — expected HTTP 200 from landing page (GET " + this.iutUri + "), got " + resp.getStatusCode());
}
```
post-refactor:
```java
ETSAssert.assertStatus(resp, 200, REQ_ROOT_SUCCESS);
```

`LandingPageTests:144-148` (current bare-throw):
```java
Object linksObj = body.get("links");
if (!(linksObj instanceof List)) {
    throw new AssertionError(REQ_ROOT_SUCCESS + " — expected landing page body to contain a 'links' array; got: " + linksObj);
}
```
post-refactor:
```java
ETSAssert.assertJsonObjectHas(body, "links", List.class, REQ_ROOT_SUCCESS);
List<?> links = (List<?>) body.get("links");
```

`LandingPageTests:158-162` (current bare-throw — link-rel pattern):
```java
List<String> rels = extractRels(links);
if (!rels.contains("conformance")) {
    throw new AssertionError(REQ_CONFORMANCE_SUCCESS + " — landing page links must contain rel=conformance; got rels: " + rels);
}
```
post-refactor:
```java
ETSAssert.assertJsonArrayContains(
    links,
    l -> "conformance".equals(((Map<?,?>) l).get("rel")),
    "rel=conformance link",
    REQ_CONFORMANCE_SUCCESS);
```

`LandingPageTests:179-184` (current bare-throw — API-def fallback OR pattern):
```java
boolean hasServiceDesc = links.stream().anyMatch(l -> "service-desc".equals(((Map) l).get("rel")));
boolean hasServiceDoc = links.stream().anyMatch(l -> "service-doc".equals(((Map) l).get("rel")));
if (!hasServiceDesc && !hasServiceDoc) {
    throw new AssertionError(REQ_API_DEFINITION_SUCCESS + " — landing page must contain rel=service-desc OR rel=service-doc; got rels: " + rels);
}
```
post-refactor:
```java
ETSAssert.assertJsonArrayContainsAnyOf(
    links,
    List.of(
        Map.entry("service-desc link", l -> "service-desc".equals(((Map<?,?>) l).get("rel"))),
        Map.entry("service-doc link", l -> "service-doc".equals(((Map<?,?>) l).get("rel")))
    ),
    REQ_API_DEFINITION_SUCCESS);
```

`LandingPageTests:204-218` (the sentinel test for v1.0 GH#3 — does NOT migrate to a helper because both PASS branches are valid):
```java
// sentinel: rel=self is example-only; both presence and absence are PASS
List<String> rels = extractRels(links);
boolean hasSelf = rels.contains("self");
// ... if neither present nor absent (impossible), fall through to:
ETSAssert.failWithUri(REQ_ROOT_SUCCESS, "sentinel could not determine self-rel state from rels: " + rels);
```

### Constraints (Sprint 2+ binding)

- **MUST**: every new conformance.* class from Sprint 2 forward uses `ETSAssert.*` helpers; zero `throw new AssertionError(...)` permitted.
- **MUST**: every helper invocation passes the canonical OGC `.adoc` URI (per ADR-001-equivalent S-ETS-02-03 sweep) — not the legacy `/req/core/<X>-success` form.
- **MUST**: helpers throw `java.lang.AssertionError` (not TestNG's `org.testng.SkipException` and not a custom exception). TestNG records AssertionError as FAIL; custom exceptions get classified as ERROR and lose the `dependsOnGroups` skip semantics.
- **MUST**: every helper has a unit test under `src/test/java/.../VerifyETSAssert.java` covering both PASS and FAIL paths. PASS = helper returns normally; FAIL = `assertThrows(AssertionError.class, () -> ETSAssert.assertX(...))` and the AssertionError message starts with the supplied `reqUri`.
- **SHOULD**: prefer the most-specific helper for the assertion shape. Use `failWithUri` only when no type-specific helper fits.
- **MUST NOT**: use `org.testng.Assert.fail(...)` for new assertions (lacks the URI-prefixed format and bypasses the helper layer's verifiability).
- **MUST NOT**: call helpers with `null` URI; if a `null` is passed, the helper raises `IllegalArgumentException` (this is a programming error, not a test failure).

## Alternatives considered

- **Builder-style API** (rejected): `ETSAssert.requirement(URI).message(M).check(condition)`. More flexible but verbose at every call site (3 lines vs 1) and harder to grep. Sprint 2 cleanup is mechanical; one-liner helpers minimize per-site refactor cost.
- **Single mega-helper `assertWithUri(boolean condition, String requirementUri, String message)`** (rejected). Forces the caller to own the predicate and the message format, which is exactly what we're trying to centralize. Becomes the "bare throw with extra steps" antipattern.
- **Hamcrest-style fluent matchers** `assertThat(resp, hasStatus(200).withReqUri(REQ))` (rejected). Hamcrest extension classes are in scope (Hamcrest is a transitive ets-common dep), but the matcher pattern adds a layer of indirection without changing the call site count. We'd still need a project-specific `RestAssuredMatchers` factory class. The 4 type-specific helpers above hit the same use-case with less ceremony.
- **Mirror `org.opengis.cite.assertion.*` from ets-common** (considered, partially adopted). ets-common's existing `assertion` package is XML/Schematron only; nothing REST-shaped. We adopt its naming convention (`assert<Object><Predicate>`) but extend in our own `ETSAssert` class because (a) modifying ets-common is out of scope, (b) features10's pattern is also "extend `EtsAssert` per-ETS, mirror naming conventions."
- **Throw via TestNG's `org.testng.Assert.fail(msg)` instead of plain `AssertionError`** (rejected). `Assert.fail()` itself throws an `AssertionError`, so semantically identical, but using the helper class adds a stack frame and obscures the actual fail point in the surefire report. Plain `throw new AssertionError(msg)` from the helper keeps stack frames minimal.

## Consequences

**Positive**:
- The 21 bare-throw sites collapse to one-liners. Diff in S-ETS-02-02 commits is a clean per-class refactor; reviewer cognitive load minimal.
- Future conformance classes have a fixed set of helpers to choose from. SystemFeaturesTests (S-ETS-02-06), Subsystems, Procedures, etc. all use the same 5 helpers — unit-test surface stays at 5 helper-tests regardless of how many @Test methods land.
- The `/req/*` URI prefix is structurally guaranteed: a Generator who forgets to pass a URI will get an `IllegalArgumentException` at test-development time, not a missing-URI in the surefire FAIL report.
- VerifyETSAssert.java provides the regression check: any future change to helper semantics breaks unit tests before it reaches production code.

**Negative**:
- 5 new helpers (vs 4 Pat originally proposed) — the addition of `assertJsonArrayContainsAnyOf` is justified by the OR-fallback pattern Sprint 1 used for `service-desc OR service-doc` (preserved per ADR-001 / SCENARIO-ETS-CORE-API-DEF-FALLBACK-001). Without it, Generator would `failWithUri` the OR-pattern manually — defeating the centralization intent.
- The helpers operate on `Map<String,Object>` (parsed JSON body) and `List<?>` (parsed array) — they do not operate on raw JSON strings. Generator must parse the response body via REST-Assured's `.body().jsonPath().getMap("$")` / `.getList("links")` API before calling the helper. This is the same pattern Sprint 1 used; no new burden.
- ETSAssert continues to grow. At Sprint 5+ if the helper count exceeds ~12, consider splitting into `ETSAssert` (XML legacy) + `RestAssertions` (new). Defer that decision to Sprint 5+ when the count is known.

**Risks**:
- A future @Test author may attempt to bypass helpers and call `Assert.fail(URI + " — ...")` because it's habit. Mitigation: Quinn (Evaluator) gate runs `grep -E 'throw new AssertionError|Assert\.fail' src/main/java/.../conformance/` and counts MUST be 0 across all conformance.* subpackages. Sprint 2 contract `evaluation_focus` already mandates this check.
- A predicate's `equals` / `hashCode` shape on JSON-parsed `Map`/`List` types depends on the parser. REST-Assured returns Jackson `LinkedHashMap` / `ArrayList`; helpers must accept `Map<?,?>` / `List<?>` (wildcards) so they survive the eventual parser swap. The signatures above use `List<?>` and cast to `Map<?,?>` inside predicates — this is the safe form.

## Notes / references

- features10 EtsAssert pattern (verified 2026-04-27 during ADR-001 work): https://github.com/opengeospatial/ets-ogcapi-features10/blob/master/src/main/java/org/opengis/cite/ogcapifeatures10/EtsAssert.java
- ets-common existing assertion utilities: https://github.com/opengeospatial/ets-common/tree/17/src/main/java/org/opengis/cite/assertion
- Quinn s02 GAP-1 evidence: `.harness/evaluations/sprint-ets-01-evaluator-s02.yaml` lines 36-45
- Raze s02 GAP-1 (corroborates Quinn): `.harness/evaluations/sprint-ets-01-adversarial-s02.yaml`
- Sprint 1 bare-throw sites (the 21 sites this ADR closes): `ets-ogcapi-connectedsystems10/src/main/java/org/opengis/cite/ogcapiconnectedsystems10/conformance/core/{LandingPageTests,ConformanceTests,ResourceShapeTests}.java` at HEAD `8aeffbf`
- S-ETS-02-02 acceptance criteria (the work this ADR ratifies): `epics/stories/s-ets-02-02-etsassert-refactor.md`
