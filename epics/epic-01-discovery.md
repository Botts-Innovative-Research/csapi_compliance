# Epic 01: Endpoint Discovery & Configuration

> Status: Closed — v1.0 web app shipped at HEAD ab53658, no further sprints. Superseded by `epic-ets-04-teamengine-integration` (TeamEngine handles IUT discovery via CTL). | Last updated: 2026-04-27

## Goal
Provide the entry point for all CS API compliance testing by accepting a user-supplied landing page URL, discovering the API's structure and declared conformance classes, and collecting the configuration (authentication, timeouts, concurrency) needed to execute test runs.

## Dependencies
- Depends on: Epic 04 (Test Engine Infrastructure -- needs HTTP client and configuration framework)
- Blocks: Epic 02, Epic 03

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S01-01 | URL Input and Landing Page Fetch | Done | REQ-DISC-001, REQ-DISC-002, REQ-DISC-003 |
| S01-02 | Conformance Detection and Mapping | Done | REQ-DISC-004, REQ-DISC-005, REQ-DISC-006 |
| S01-03 | Conformance Class Selection UI | Done | REQ-DISC-007 |
| S01-04 | Authentication and Run Configuration | Done | REQ-DISC-008, REQ-DISC-009, REQ-DISC-010 |

## Acceptance Criteria
- [ ] User can enter a CS API URL and the system validates, fetches, and parses the landing page
- [ ] Conformance classes are discovered, mapped to known requirement classes, and displayed with testability indicators
- [ ] User can select/deselect testable conformance classes for inclusion in the test run
- [ ] User can provide optional authentication (Bearer, API key, Basic) and configure timeout/concurrency
- [ ] Invalid URLs, unreachable hosts, and non-JSON responses produce clear error messages
