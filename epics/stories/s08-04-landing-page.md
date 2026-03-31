# S08-04: Application Landing Page

> Status: Done | Epic: 08 | Last updated: 2026-03-31

## Description
Build the application landing page displayed at the root URL. Includes a brief explanation of the tool's purpose, a URL text input with placeholder example, and a "Start Assessment" button. URL is validated before submission (HTTP/HTTPS only). No login or account creation is required. Users can submit via Enter key or button click.

## OpenSpec References
- Spec: `openspec/capabilities/progress-session/spec.md`
- Requirements: REQ-SESS-012, REQ-SESS-013, REQ-SESS-014, REQ-SESS-015
- Scenarios: SCENARIO-SESS-LAND-001, SCENARIO-SESS-LAND-002, SCENARIO-SESS-LAND-003, SCENARIO-SESS-LAND-004, SCENARIO-SESS-LAND-005, SCENARIO-SESS-LAND-006, SCENARIO-SESS-AUTH-001

## Acceptance Criteria
- [ ] Landing page displays tool explanation, URL input, and "Start Assessment" button (REQ-SESS-012)
- [ ] No login, account creation, or authentication required (REQ-SESS-013)
- [ ] URL is validated as HTTP/HTTPS before assessment starts (REQ-SESS-014)
- [ ] Invalid/empty URLs show inline error messages (REQ-SESS-014)
- [ ] URL input has a placeholder example (REQ-SESS-015)
- [ ] Assessment can be started via Enter key or button click (REQ-SESS-015)

## Tasks
1. Build landing page layout with explanation text
2. Build URL input field with placeholder
3. Build "Start Assessment" button
4. Implement URL validation with inline error display
5. Implement Enter key submission
6. Wire to assessment creation API (POST /api/assessments)
7. Write component tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
