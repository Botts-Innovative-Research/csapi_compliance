# Story: S-ETS-06-03

**Epic**: epic-ets-04-teamengine-integration
**Priority**: P1
**Estimated Complexity**: S

## Description

Add `VerifyWireRestoresOriginalCredential` — a new non-stub-FilterContext unit test that exercises the wire-side ordering semantics of `MaskingRequestLoggingFilter.filter()`. This test is structurally distinct from the 16 existing tests (VerifyAuthCredentialPropagation 8 + VerifyMaskingRequestLoggingFilter 8) which use `StubFilterContext` returning null from `ctx.next()` and therefore CANNOT detect filter-ordering defects.

Additionally, reclassify those 16 existing tests in `spec.md` and relevant story Implementation Notes as "wiring-only — does NOT prove wire-side credential integrity" so future readers do not conflate the PASS count with credential safety.

**Context**: Meta-GAP-1 from the Sprint 5 adversarial meta-review (sprint-ets-05-meta-review.yaml). Both Quinn and Raze flagged the StubFilterContext limitation inline as part of GAP-1' diagnosis, but neither explicitly cataloged it as a separate gap requiring its own story. Sprint 5's "8/8 PASS" strength claim and Sprint 3+4+5 cumulative masking-test confidence are partially decorative because the StubFilterContext doesn't exercise the wire. The reclassification closes this framing gap.

**Note**: The `VerifyWireRestoresOriginalCredential` unit test implementation is SHARED with S-ETS-06-01 (the masking filter fix story). S-ETS-06-01 requires the new wire-side test as part of its Definition of Done; S-ETS-06-03 is the spec-and-reclassification companion. Generator SHOULD sequence S-ETS-06-01 first (fix + test), then S-ETS-06-03 (spec update + reclassification text) — the test code lands in S-ETS-06-01 and is referenced here for completeness.

## Acceptance Criteria

- SCENARIO-ETS-CLEANUP-WIRE-SIDE-TEST-001 (CRITICAL): `VerifyWireRestoresOriginalCredential` test class exists and passes in `mvn test`; uses a `CapturingFilterContext` (not `StubFilterContext`) that records the spec passed to `ctx.next()` and asserts it carries the ORIGINAL Authorization value
- SCENARIO-ETS-CLEANUP-WIRING-TEST-RECLASSIFIED-001 (NORMAL): spec.md REQ-ETS-CLEANUP-013 + REQ-ETS-CLEANUP-016 implementation notes clarify that VerifyAuthCredentialPropagation (8) + VerifyMaskingRequestLoggingFilter (8) = 16 unit tests are "wiring-only" and do not prove wire-side ordering correctness; the new VerifyWireRestoresOriginalCredential test IS the wire-side proof

## Spec References

- REQ-ETS-CLEANUP-016 (NEW — wire-side masking correctness test; added in this sprint)
- REQ-ETS-CLEANUP-013 (implementation notes amended to note wiring-only limitation of existing 8 tests)

## Technical Notes

**CapturingFilterContext design**:

```java
// In src/test/java/.../CapturingFilterContext.java (or inner class)
class CapturingFilterContext implements FilterContext {
    private FilterableRequestSpecification capturedRequestSpec;

    @Override
    public Response next(FilterableRequestSpecification requestSpec,
                         FilterableResponseSpecification responseSpec) {
        this.capturedRequestSpec = requestSpec;
        // Return a minimal mock Response (status 200, empty body) — no HTTP I/O
        return mock(Response.class); // or use RestAssured's ResponseBuilder if available
    }

    public FilterableRequestSpecification getCapturedRequestSpec() {
        return capturedRequestSpec;
    }
}
```

**Test assertion**:
```java
@Test
public void wireCarriesOriginalCredential() {
    String originalCredential = "Bearer ABCDEFGH12345678WXYZ";
    // Build a request spec with the real credential
    FilterableRequestSpecification requestSpec = /* build spec with Authorization header */;

    CapturingFilterContext ctx = new CapturingFilterContext();
    MaskingRequestLoggingFilter filter = new MaskingRequestLoggingFilter(
        MaskingRequestLoggingFilter.DEFAULT_HEADERS_TO_MASK,
        new PrintStream(OutputStream.nullOutputStream()));

    filter.filter(requestSpec, /* responseSpec */, ctx);

    // The spec passed to ctx.next() must carry the ORIGINAL credential
    String wireValue = ctx.getCapturedRequestSpec().getHeaders().getValue("Authorization");
    assertEquals(wireValue, originalCredential,
        "Wire must carry original credential, not masked form");
}
```

**spec.md reclassification scope**: Update the REQ-ETS-CLEANUP-013 Implementation Status block in `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` to add a note: "The 8 VerifyAuthCredentialPropagation unit tests verify structural wiring only (wiring-only per META-GAP-1 / sprint-ets-05-meta-review.yaml). Wire-side credential integrity is proven by VerifyWireRestoresOriginalCredential (S-ETS-06-03 / REQ-ETS-CLEANUP-016)."

Update `epics/stories/s-ets-05-01-credential-leak-wiring-fix.md` Implementation Notes similarly.

**No behavior change to existing 16 tests**: They continue to run and pass. Only their spec documentation is updated to accurately characterize their coverage boundary.

**Sequence with S-ETS-06-01**: Generator SHOULD implement both stories in the same session. The `CapturingFilterContext` may be written once and referenced by both story references. If sequenced separately, this story's unit test stub may be written as a failing test first (RED), then the S-ETS-06-01 filter fix makes it GREEN.

## Dependencies

- Depends on: S-ETS-06-01 (masking filter wire fix — the `CapturingFilterContext` test makes sense to write alongside the fix)
- Depends on: S-ETS-05-01 (wiring exists — the existing 16 tests reference VerifyAuthCredentialPropagation which is already in-place)

## Definition of Done

- [ ] SCENARIO-ETS-CLEANUP-WIRE-SIDE-TEST-001 PASS — `VerifyWireRestoresOriginalCredential` test in `mvn test` suite, green
- [ ] SCENARIO-ETS-CLEANUP-WIRING-TEST-RECLASSIFIED-001 — spec.md + story S-ETS-05-01 Implementation Notes amended
- [ ] No regression: mvn test count increments by at least 1 (VerifyWireRestoresOriginalCredential class)
- [ ] REQ-ETS-CLEANUP-016 implementation notes updated in spec.md
- [ ] Generator wall-clock: ≤30 minutes (unit test + spec text edits)
