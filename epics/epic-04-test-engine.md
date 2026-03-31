# Epic 04: Test Engine Infrastructure

> Status: Done | Last updated: 2026-03-31

## Goal
Build the core test engine that all conformance tests execute within. This includes test-to-requirement traceability, three-state result production, JSON schema validation, conformance class dependency ordering with cascade skip, pagination traversal, timeout enforcement, and graceful error handling.

## Dependencies
- Depends on: None (foundation epic)
- Blocks: Epic 01, Epic 02, Epic 03, Epic 05, Epic 06, Epic 08

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S04-01 | Test Registry and Traceability | Done | REQ-ENG-001, REQ-ENG-013 |
| S04-02 | Test Result Model and Aggregation | Done | REQ-ENG-002, REQ-ENG-003, REQ-ENG-004, REQ-ENG-014 |
| S04-03 | JSON Schema Validation Engine | Done | REQ-ENG-005, REQ-ENG-006 |
| S04-04 | Dependency Graph and Execution Ordering | Done | REQ-ENG-007, REQ-ENG-008 |
| S04-05 | Pagination Traversal | Done | REQ-ENG-009, REQ-ENG-010 |
| S04-06 | HTTP Client, Timeout, and Error Handling | Done | REQ-ENG-011, REQ-ENG-012 |

## Acceptance Criteria
- [ ] Every test maps 1:1 to a canonical OGC requirement URI; unregistered tests are rejected at startup
- [ ] Tests produce exactly one of pass/fail/skip with structured messages
- [ ] Response bodies are validated against JSON schemas loaded from the OGC 23-001 OpenAPI definition with full $ref resolution
- [ ] Conformance class dependency DAG is enforced; failures cascade to skip dependent classes
- [ ] Pagination follows `next` links with configurable page limits and loop detection
- [ ] Request timeouts and network errors produce test failures without crashing the assessment
