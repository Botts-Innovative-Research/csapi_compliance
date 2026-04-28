# Epic ETS-06: Spec-Trap Fixture Port

> Status: Deferred — runs in parallel with `epic-ets-02-part1-classes` once the Core suite is green | Last updated: 2026-04-27

## Goal
Port the ~30-50 asymmetric `featureType`/`itemType` fixtures from `csapi_compliance/tests/fixtures/spec-traps/` into Java classes implementing TestNG `@DataProvider`, wire them into the Part 1 conformance suites, and verify zero case-ID drops via a port-diff CI script. Owns sub-deliverable 5 of the new ETS capability. This is the highest-leverage piece of v1.0 IP that survives the pivot.

## Dependencies
- Depends on: `epic-ets-01-scaffold`, at least one Part 1 conformance suite (e.g. CS API Core) exists to wire fixtures into
- Blocks: NFR-ETS-15 structural parity with `ets-ogcapi-features10` (fixtures live alongside test code)

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S-ETS-06-01 | (placeholder) Port asymmetric featureType/itemType corpus | Backlog | REQ-ETS-FIXTURES-001 |
| S-ETS-06-02 | (placeholder) Port half-conformant collections corpus | Backlog | REQ-ETS-FIXTURES-001 |
| S-ETS-06-03 | (placeholder) Port missing-OGC-23-001-markers corpus | Backlog | REQ-ETS-FIXTURES-001 |
| S-ETS-06-04 | (placeholder) Wire `@DataProvider` methods into Part 1 conformance suites | Backlog | REQ-ETS-FIXTURES-002 |
| S-ETS-06-05 | (placeholder) Port-diff audit script in CI | Backlog | REQ-ETS-FIXTURES-003 |

## Acceptance Criteria
- [ ] Every TS spec-trap fixture has a matching Java `@DataProvider` case (or an explicit allowlist entry with rationale)
- [ ] At least one `@Test` per Part 1 conformance class with a corresponding fixture group is parameterized
- [ ] CI port-diff job catches any case dropped during the port
