# Epic 05: Request/Response Capture

> Status: Closed — v1.0 web app shipped at HEAD ab53658, no further sprints. TestNG report attachments cover HTTP capture in the new ETS. | Last updated: 2026-04-27

## Goal
Capture every HTTP request and response exchanged during a conformance assessment, providing full observability for debugging failures and generating evidence for export. Ensure sensitive credentials are masked in all user-facing displays and exports.

## Dependencies
- Depends on: Epic 04 (Test Engine Infrastructure -- integrates with HTTP client)
- Blocks: Epic 06, Epic 07

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S05-01 | HTTP Request and Response Capture | Done | REQ-CAP-001, REQ-CAP-002, REQ-CAP-003, REQ-CAP-004, REQ-CAP-008, REQ-CAP-009, REQ-CAP-010 |
| S05-02 | Credential Masking | Done | REQ-CAP-006, REQ-CAP-007 |
| S05-03 | Request/Response Viewer UI | Done | REQ-CAP-005 |

## Acceptance Criteria
- [ ] Every HTTP exchange is captured with method, URL, headers, body, status code, response time
- [ ] Request/response pairs are linked 1:1 and viewable per test
- [ ] Credentials are masked (first 4 + last 4 chars visible, or fully masked if 12 chars or fewer)
- [ ] Large response bodies (>10 MB) are truncated with a notice; binary bodies show a placeholder
- [ ] Captured data is not modified beyond masking and truncation rules
