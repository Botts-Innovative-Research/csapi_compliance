# E2E Test Plan — CS API Compliance Assessor

> Last updated: 2026-03-30

## E2E Testing Policy (MANDATORY)

Every change derived from user instruction MUST be verified end-to-end before reporting done. This includes:

- **Web applications**: Browser automation (Playwright) against deployed system
- **Mobile applications**: Mobile emulator testing (mobile-mcp or equivalent)
- **Backend services / drivers**: Integration tests against running instances with real protocol exchanges
- **DNS resolution**: Use proper DNS names when testing against running systems (when feasible)

E2E tests exercise the full deployed stack -- not mocked dependencies.

## Test Environment

- Browser: Chromium (via Playwright)
- Server: Local dev server (`npm run dev`)
- Target IUT: Mock server (built-in test fixture) or live demo (api.georobotix.io)

## Test Categories

### Category 1: Unit Tests (Automated)
- **Runner**: Vitest
- **Command**: `npm test`
- **When**: Every build

### Category 2: Integration Tests (Against Running System)
- **Prerequisites**: Local dev server running (`npm run dev`)
- **Command**: `npx playwright test tests/e2e/landing-page.spec.ts`
- **When**: After every deploy or change that affects system behavior

### Category 3: Full E2E Verification
- **Prerequisites**: Local dev server + live IUT (e.g., https://api.georobotix.io/ogc/t18/api)
- **Command**: `npm run test:e2e`
- **When**: Before reporting any user-instructed change as done

## Test Scenarios

### TC-E2E-001: Full Happy Path
1. Navigate to landing page
2. Enter demo server URL (`https://api.georobotix.io/ogc/t18/api`)
3. Click "Discover Endpoint"
4. Verify redirect to config page (`/assess/configure?session=...`)
5. Verify conformance classes displayed with checkboxes
6. Click "Start Assessment"
7. Verify redirect to progress page (`/assess/:id/progress`)
8. Wait for completion (or mock fast completion)
9. Verify redirect to results page (`/assess/:id/results`)
10. Verify summary dashboard shows compliance percentage
11. Expand a conformance class accordion
12. Click a test to open detail drawer
13. Verify request/response viewer is displayed
14. Close drawer
15. Click "Export JSON"
16. Verify download initiated

### TC-E2E-002: Invalid URL
1. Navigate to landing page
2. Enter "not-a-url"
3. Blur the input to trigger validation
4. Verify validation error displayed: "Enter a valid HTTP or HTTPS URL"
5. Verify input border turns red
6. Enter "ftp://example.com"
7. Verify validation error: "Enter a valid HTTP or HTTPS URL"
8. Verify "Discover Endpoint" button is disabled

### TC-E2E-003: Unreachable Endpoint
1. Enter valid but unreachable URL (e.g., `https://unreachable.example.com/api`)
2. Click "Discover Endpoint"
3. Verify loading state (spinner + "Discovering...")
4. Verify error message after timeout: "Could not reach this endpoint. Verify the URL and try again."
5. Verify URL input retains the entered value

### TC-E2E-004: Cancel Assessment
1. Start an assessment (requires live IUT)
2. On progress page, click "Cancel Assessment"
3. Verify confirmation dialog appears: "Cancel this assessment?"
4. Click "Cancel Assessment" in dialog to confirm
5. Verify redirect to results page (`/assess/:id/results`)
6. Verify "Partial" or "Cancelled" badge on summary
7. Verify partial results banner is shown

### TC-E2E-005: Results Persistence
1. Complete an assessment (requires live IUT)
2. Copy the results URL (`/assess/:id/results`)
3. Navigate away to landing page
4. Navigate back to the results URL
5. Verify results still displayed with same compliance percentage

### TC-E2E-006: Accessibility
1. Navigate through all pages using keyboard only (Tab / Shift+Tab)
2. Verify focus indicators are visible on all interactive elements
3. Verify screen reader landmarks present (`<main>`, `<header>`, `<footer>`, `<nav>`)
4. Verify `aria-invalid` on URL input when validation error is shown
5. Verify `role="alert"` on error messages
6. Verify cancel confirmation dialog has `role="dialog"` and `aria-modal="true"`

## Test Scenario Summary

| ID | Scenario | Category | Status |
|----|----------|----------|--------|
| TC-E2E-001 | Full Happy Path | 3 | Not Run (requires IUT) |
| TC-E2E-002 | Invalid URL | 2 | Ready |
| TC-E2E-003 | Unreachable Endpoint | 2 | Ready |
| TC-E2E-004 | Cancel Assessment | 3 | Not Run (requires IUT) |
| TC-E2E-005 | Results Persistence | 3 | Not Run (requires IUT) |
| TC-E2E-006 | Accessibility | 2 | Ready |

## How to Run

```bash
# Unit tests
npm test

# Landing page E2E tests (requires dev server)
npx playwright test tests/e2e/landing-page.spec.ts

# Assessment flow E2E tests (requires dev server + live IUT)
npx playwright test tests/e2e/assessment-flow.spec.ts

# All E2E tests
npm run test:e2e
```
