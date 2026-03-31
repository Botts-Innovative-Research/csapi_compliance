# Epic 02: Parent Standard Conformance Testing

> Status: Done | Last updated: 2026-03-31

## Goal
Implement conformance tests for the two parent standards that CS API Part 1 builds upon: OGC API Common Part 1 and OGC API Features Part 1 Core. These tests must pass before any CS API-specific tests can execute.

## Dependencies
- Depends on: Epic 04 (Test Engine Infrastructure), Epic 01 (Endpoint Discovery)
- Blocks: Epic 03

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S02-01 | OGC API Common Part 1 Tests | Done | REQ-TEST-001 |
| S02-02 | OGC API Features Part 1 Core Tests | Done | REQ-TEST-002 |

## Acceptance Criteria
- [ ] Landing page structure, conformance endpoint, JSON encoding, and OpenAPI definition link tests execute and produce correct pass/fail/skip verdicts
- [ ] Collections endpoint, single collection, items with limit, single feature, and GeoJSON structure tests execute correctly
- [ ] If Common Part 1 fails, Features Part 1 Core tests are skipped with a dependency failure reason
- [ ] All test results map to canonical OGC requirement URIs
