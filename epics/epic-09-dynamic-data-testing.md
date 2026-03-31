# Epic 09: CS API Part 2 Dynamic Data Conformance Testing

> Status: Done | Last updated: 2026-03-31

## Goal
Implement conformance tests for all 14 CS API Part 2 conformance classes (approximately 130 requirements) defined in OGC 23-002, covering datastreams, observations, control streams, commands, command feasibility, system events, system history, Part 2 advanced filtering, write operations, and Part 2 encodings (JSON, SWE Common JSON, SWE Common Text, SWE Common Binary).

## Dependencies
- Depends on: Epic 04 (Test Engine Infrastructure), Epic 01 (Discovery), Epic 02 (Parent Testing)
- Part 2 Common tests depend on Part 1 Core (Epic 03 S03-01) being available
- Blocks: None

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S09-01 | Part 2 Common + JSON Encoding | Done | REQ-DYN-001, REQ-DYN-002 |
| S09-02 | Datastreams & Observations | Done | REQ-DYN-003, REQ-DYN-004 |
| S09-03 | Control Streams & Commands | Done | REQ-DYN-005, REQ-DYN-006 |
| S09-04 | Command Feasibility, System Events & System History | Done | REQ-DYN-007, REQ-DYN-008, REQ-DYN-009 |
| S09-05 | Part 2 Advanced Filtering | Done | REQ-DYN-010 |
| S09-06 | Part 2 CRUD + Update | Done | REQ-DYN-011, REQ-DYN-012 |
| S09-07 | SWE Common Encodings | Done | REQ-DYN-013, REQ-DYN-014 |

## Acceptance Criteria
- [ ] All 14 Part 2 conformance classes have executable tests producing pass/fail/skip verdicts
- [ ] Part 2 Common tests validate dynamic resource collection links from the landing page
- [ ] Datastream and observation tests validate collection availability, schema compliance, temporal queries, and schema endpoints
- [ ] Control stream and command tests validate CRUD operations, command status tracking, and command result retrieval
- [ ] Command feasibility tests verify feasibility request/response workflows
- [ ] System events and system history tests validate event streaming endpoints and historical system state queries
- [ ] Write-operation tests require explicit user opt-in and display a data mutation warning
- [ ] Empty collections result in resource-level test skips, not failures
- [ ] Test cleanup attempts to remove resources created during CRUD/Update tests
- [ ] SWE Common encoding tests validate JSON, Text, and Binary format negotiation and response structure
- [ ] Part 2 advanced filtering tests cover phenomenonTime, resultTime, issueTime, executionTime, and property filters
