# UX Specification — CS API Compliance Assessor

> Version: 1.0 | Status: Living Document | Last updated: 2026-03-31

---

## Table of Contents

1. [Screen Inventory](#1-screen-inventory)
2. [User Flows](#2-user-flows)
3. [Page Layouts & Component Hierarchy](#3-page-layouts--component-hierarchy)
4. [Component Specifications](#4-component-specifications)
5. [Interaction Patterns](#5-interaction-patterns)
6. [Color & Status Conventions](#6-color--status-conventions)
7. [Responsive Strategy](#7-responsive-strategy)
8. [Accessibility Requirements](#8-accessibility-requirements)

---

## 1. Screen Inventory

The application consists of the following screens/pages. All screens share a common application shell (header + main content area).

| Screen ID | Name | Route | Purpose | PRD Coverage |
|-----------|------|-------|---------|--------------|
| S-01 | Landing / New Assessment | `/` | Entry point. Brief product description, URL input, start button. | FR-01, FR-45 |
| S-02 | Assessment Configuration | `/assess/configure` | Conformance class selection, auth setup, run config. Reached after successful endpoint discovery. | FR-05, FR-06, FR-07, FR-08 |
| S-03 | Assessment Progress | `/assess/:id/progress` | Real-time progress display during test execution. | FR-42, FR-43 |
| S-04 | Assessment Results | `/assess/:id/results` | Summary dashboard, per-class breakdown, individual test results. Shareable URL. | FR-34, FR-35, FR-36, FR-37, FR-38 |
| S-05 | Test Detail Panel | (overlay/drawer on S-04) | Individual test result with full request/response viewer. Not a separate route; opens as a slide-out drawer on the results page. | FR-32, FR-37 |
| S-06 | Not Found | `/404` (catch-all) | Displayed when a route or assessment ID does not exist. | -- |

**Total distinct views**: 5 screens + 1 error page. The application is intentionally shallow -- no login, no account management, no settings page.

---

## 2. User Flows

### 2.1 Happy Path: Full Assessment

```
S-01 Landing Page
  User enters endpoint URL (e.g., https://api.georobotix.io/ogc/t18/api)
  User clicks "Discover Endpoint"
    -> Frontend validates URL format (client-side)
    -> Backend fetches landing page, conformance, collections
    -> Loading state shown on button (spinner + "Discovering...")
    -> On success: redirect to S-02

S-02 Configuration
  Conformance classes displayed with checkboxes (all testable pre-selected)
  User optionally deselects classes, adds auth credentials, adjusts timeout
  User clicks "Start Assessment"
    -> Backend creates assessment run, returns assessment ID
    -> Redirect to S-03

S-03 Progress
  Real-time progress bar fills as tests complete
  Current conformance class and test name displayed
  Count: "47 / 103 tests completed"
  User waits (or cancels)
    -> On completion: redirect to S-04

S-04 Results
  Summary dashboard: pass/fail/skip counts, compliance percentage
  Per-class accordion list with pass/fail badges
  User clicks individual test -> S-05 drawer opens

S-05 Test Detail (drawer overlay)
  Shows requirement ID, URI, status, failure/skip reason
  Tabbed request/response viewer with method, URL, headers, body
  User closes drawer -> returns to S-04
```

### 2.2 Error Paths

#### 2.2.1 Invalid URL Format (S-01)

```
User enters malformed URL (e.g., "not-a-url", "ftp://...", missing protocol)
  -> Inline validation error appears below input: "Enter a valid HTTP or HTTPS URL"
  -> Input field border turns red
  -> "Discover Endpoint" button remains disabled until valid URL entered
  -> Focus remains on input field
```

#### 2.2.2 Unreachable Endpoint (S-01)

```
User enters valid URL format but endpoint is unreachable
  -> Button shows loading state: spinner + "Discovering..."
  -> After timeout (15s per NFR-01):
     -> Inline error below input: "Could not reach endpoint. Verify the URL is correct and the server is running."
     -> Button returns to default state
     -> URL input retains the entered value for correction
```

#### 2.2.3 Not a CS API Endpoint (S-01)

```
User enters reachable URL but it is not a CS API landing page
  -> Backend returns error (no conformance endpoint found, or no CS API conformance classes)
  -> Inline error below input: "This endpoint does not appear to be an OGC API - Connected Systems server. No conformance classes were detected."
  -> URL input retains value
```

#### 2.2.4 Authentication Required (S-01 -> S-02)

```
Endpoint returns 401/403 during discovery
  -> Redirect to S-02 with auth section expanded and highlighted
  -> Info banner: "This endpoint requires authentication. Enter your credentials below and discovery will be re-attempted."
  -> After credentials entered, user clicks "Retry Discovery"
  -> On success: conformance classes populate
  -> On 401 again: error below auth section: "Authentication failed. Check your credentials."
```

#### 2.2.5 Assessment Cancelled (S-03)

```
User clicks "Cancel Assessment" button
  -> Confirmation dialog: "Cancel this assessment? Results collected so far will still be available."
  -> User confirms -> backend cancels remaining tests
  -> Redirect to S-04 with "Partial" badge on summary
  -> Banner at top of results: "This assessment was cancelled. Results are partial and may not reflect full conformance."
```

#### 2.2.6 Network Error During Testing (S-03)

```
Individual test encounters network error
  -> That test marked as "fail" with reason "Network error: [details]"
  -> Progress continues to next test (no cascade, per NFR-10)
  -> No user intervention required
```

#### 2.2.7 Assessment Not Found (S-04)

```
User visits /assess/:id/results with invalid or expired ID
  -> S-06 displayed: "Assessment not found. It may have expired (results are kept for 24 hours) or the ID is incorrect."
  -> Link back to S-01: "Start a new assessment"
```

### 2.3 Destructive Test Warning Flow (S-02)

```
User selects "Create/Replace/Delete" or "Update" conformance class
  -> Warning callout appears inline below the checkbox:
     Icon: triangle-alert (amber)
     Text: "These tests will create, modify, and delete resources on the target endpoint. Only run against a test server, never a production system."
  -> Checkbox requires a secondary confirmation toggle:
     "I understand these tests will mutate data on the target endpoint"
  -> Assessment cannot start until confirmation toggle is checked (if CRUD/Update selected)
```

---

## 3. Page Layouts & Component Hierarchy

### 3.1 Application Shell (all pages)

```
AppShell
  +-- Header
  |     +-- AppLogo (left): "CS API Compliance Assessor" text mark
  |     +-- Nav (right): "New Assessment" link (visible on S-02, S-03, S-04)
  +-- Main Content Area (centered, max-width 1024px on S-01; max-width 1280px on S-02/S-03/S-04)
  +-- Footer
        +-- Disclaimer text (FR-38): "This tool is unofficial..."
        +-- Version number
        +-- Link to OGC 23-001 standard
```

### 3.2 S-01: Landing Page

```
LandingPage
  +-- HeroSection (centered, max-width 640px)
  |     +-- Heading: "OGC Connected Systems API Compliance Assessor"
  |     +-- Subheading: "Test any CS API endpoint against OGC 23-001 (Part 1) requirements. Get detailed pass/fail results with full HTTP traces."
  |     +-- FeatureList (3 items, horizontal on desktop, stacked on mobile)
  |           +-- FeatureItem: icon=search "Auto-discovers conformance classes"
  |           +-- FeatureItem: icon=check-circle "Tests 103 requirements"
  |           +-- FeatureItem: icon=file-text "Exports JSON & PDF reports"
  +-- URLInputSection (centered, max-width 640px)
  |     +-- Label: "CS API Landing Page URL"
  |     +-- URLInput (text input, full width)
  |     |     placeholder: "https://api.example.com/ogc/csapi"
  |     +-- ValidationError (conditional, below input)
  |     +-- DiscoverButton: "Discover Endpoint" (full width on mobile, auto width on desktop)
  +-- ExampleSection (centered, max-width 640px)
        +-- Muted text: "Try it with the OGC demo server:"
        +-- ClickableURL: "https://api.georobotix.io/ogc/t18/api" (click fills input)
```

### 3.3 S-02: Assessment Configuration

```
ConfigurationPage
  +-- PageHeader
  |     +-- BackLink: "< Back to endpoint input"
  |     +-- Heading: "Configure Assessment"
  |     +-- EndpointBadge: shows the discovered endpoint URL
  +-- DiscoverySummary (Card)
  |     +-- StatRow
  |           +-- Stat: "Landing Page" + check/x icon
  |           +-- Stat: "Conformance Endpoint" + check/x icon
  |           +-- Stat: "Collections Found" + count
  |           +-- Stat: "Conformance Classes" + count
  +-- ConformanceClassSelector (Card)
  |     +-- SectionHeading: "Conformance Classes"
  |     +-- SelectAllToggle: "Select All Testable" / "Deselect All"
  |     +-- ClassGroup: "Parent Standards"
  |     |     +-- ClassCheckbox: "OGC API Common Part 1 Core" + test-count badge
  |     |     +-- ClassCheckbox: "OGC API Features Part 1 Core" + test-count badge
  |     +-- ClassGroup: "CS API Part 1 - Feature Resources"
  |     |     +-- ClassCheckbox: "CS API Core" + test-count badge
  |     |     +-- ClassCheckbox: "System Features" + test-count badge
  |     |     +-- ClassCheckbox: "Subsystems" + test-count badge
  |     |     +-- ClassCheckbox: "Deployment Features" + test-count badge
  |     |     +-- ClassCheckbox: "Subdeployments" + test-count badge
  |     |     +-- ClassCheckbox: "Procedure Features" + test-count badge
  |     |     +-- ClassCheckbox: "Sampling Features" + test-count badge
  |     |     +-- ClassCheckbox: "Property Definitions" + test-count badge
  |     |     +-- ClassCheckbox: "Advanced Filtering" + test-count badge
  |     |     +-- ClassCheckbox: "GeoJSON Format" + test-count badge
  |     |     +-- ClassCheckbox: "SensorML JSON Format" + test-count badge
  |     +-- ClassGroup: "Mutating Operations" (visually distinct with amber border)
  |     |     +-- ClassCheckbox: "Create/Replace/Delete" + test-count badge
  |     |     |     +-- DestructiveWarning (conditional on check)
  |     |     |     +-- ConfirmationToggle (conditional on check)
  |     |     +-- ClassCheckbox: "Update" + test-count badge
  |     |           +-- DestructiveWarning (conditional on check)
  |     |           +-- ConfirmationToggle (conditional on check)
  |     +-- UnsupportedClassesList (if any detected but not testable)
  |           +-- Muted list of class URIs with "Not yet supported" label
  +-- AuthenticationConfig (Card, collapsible, collapsed by default)
  |     +-- SectionHeading: "Authentication (optional)"
  |     +-- AuthTypeSelector (radio group): None | Bearer Token | API Key | Basic Auth
  |     +-- AuthFields (conditional based on type)
  |           +-- BearerToken: single password-type input
  |           +-- APIKey: header-name input + value input (password-type)
  |           +-- BasicAuth: username input + password input (password-type)
  +-- RunConfig (Card, collapsible, collapsed by default)
  |     +-- SectionHeading: "Advanced Settings"
  |     +-- TimeoutInput: number input, label "Request timeout (seconds)", default 30
  |     +-- ConcurrencyInput: number input, label "Max concurrent requests", default 5
  +-- ActionBar (sticky bottom on mobile, inline on desktop)
        +-- TestCountSummary: "42 tests across 8 conformance classes selected"
        +-- StartButton: "Start Assessment" (primary, prominent)
```

### 3.4 S-03: Assessment Progress

```
ProgressPage
  +-- PageHeader
  |     +-- Heading: "Assessment in Progress"
  |     +-- EndpointBadge: shows the target endpoint URL
  +-- ProgressCard (Card, centered, max-width 768px)
  |     +-- ProgressBar (full width, animated fill)
  |     |     +-- PercentageLabel: "46%"
  |     +-- ProgressStats (row of stats below bar)
  |     |     +-- Stat: "47 / 103" label: "Tests Completed"
  |     |     +-- Stat: "42" label: "Passed" (green)
  |     |     +-- Stat: "3" label: "Failed" (red)
  |     |     +-- Stat: "2" label: "Skipped" (gray)
  |     +-- CurrentActivity
  |     |     +-- ClassLabel: "Testing: System Features" (current conformance class)
  |     |     +-- TestLabel: "/req/system/canonical-url" (current test, updates rapidly)
  |     +-- ElapsedTime: "Elapsed: 1m 23s"
  +-- CancelButton: "Cancel Assessment" (secondary/destructive, below card)
  +-- LiveTestFeed (optional, collapsible, below cancel button)
        +-- SectionHeading: "Test Log" + expand/collapse toggle
        +-- ScrollableList (most recent at top, max-height constrained)
              +-- TestLogEntry: "[PASS] /conf/core/landing-page-structure" (green check)
              +-- TestLogEntry: "[FAIL] /conf/system/canonical-url" (red x)
              +-- TestLogEntry: "[PASS] /conf/core/conformance-endpoint" (green check)
              +-- ... (auto-scrolls as new entries arrive)
```

### 3.5 S-04: Assessment Results

```
ResultsPage
  +-- PageHeader
  |     +-- Heading: "Assessment Results"
  |     +-- EndpointBadge: shows the target endpoint URL
  |     +-- MetaRow
  |     |     +-- Timestamp: "Completed March 30, 2026 at 14:23 UTC"
  |     |     +-- Duration: "Duration: 2m 14s"
  |     |     +-- StatusBadge: "Complete" (or "Partial" if cancelled, or "Cancelled")
  |     +-- ExportButtons (right-aligned on desktop, full width stacked on mobile)
  |           +-- ExportJSONButton: icon=download "Export JSON"
  |           +-- ExportPDFButton: icon=download "Export PDF"
  +-- SummaryDashboard (Card)
  |     +-- ComplianceScore (large, centered)
  |     |     +-- CircularPercentage or large number: "87%" (color-coded: green >=90, amber 50-89, red <50)
  |     |     +-- Label: "Overall Compliance"
  |     +-- StatCards (row of 4 cards)
  |     |     +-- StatCard: count + label "Total Tests" (neutral)
  |     |     +-- StatCard: count + label "Passed" (green icon + text)
  |     |     +-- StatCard: count + label "Failed" (red icon + text)
  |     |     +-- StatCard: count + label "Skipped" (gray icon + text)
  |     +-- ClassSummaryBar (horizontal stacked bar chart)
  |           +-- Green segment (passed classes)
  |           +-- Red segment (failed classes)
  |           +-- Gray segment (skipped classes)
  |           +-- Legend below bar
  +-- PartialBanner (conditional, only if assessment was cancelled)
  |     +-- AlertBanner: amber, icon=alert-triangle
  |           "This assessment was cancelled and results are partial."
  +-- ConformanceClassResults (main content area)
  |     +-- FilterBar
  |     |     +-- FilterToggle: "All" | "Passed" | "Failed" | "Skipped"
  |     +-- ClassAccordionList
  |           +-- ClassAccordion (one per conformance class)
  |           |     +-- AccordionHeader (always visible)
  |           |     |     +-- StatusIcon: check-circle (green) or x-circle (red) or minus-circle (gray)
  |           |     |     +-- ClassName: "System Features"
  |           |     |     +-- ClassURI: "/req/system" (muted, smaller)
  |           |     |     +-- TestCounts: "8/10 passed" (inline badge)
  |           |     |     +-- ExpandChevron
  |           |     +-- AccordionBody (expanded)
  |           |           +-- TestResultTable
  |           |                 +-- TestRow (one per requirement)
  |           |                       +-- StatusIcon: check (green) / x (red) / minus (gray)
  |           |                       +-- RequirementID: "/req/system/canonical-url"
  |           |                       +-- TestName: "Canonical System URL"
  |           |                       +-- Status: "Pass" / "Fail" / "Skip" (text + icon)
  |           |                       +-- FailureReason (if failed, truncated with tooltip)
  |           |                       +-- ViewDetailButton: "Details" (opens S-05 drawer)
  |           +-- ... (repeat for each class)
  +-- Disclaimer (Card, muted styling, bottom of page)
        +-- DisclaimerText (FR-38): "This assessment is unofficial and does not constitute
             OGC certification. Results are based on automated testing against the OGC 23-001
             standard and may not cover all edge cases."
```

### 3.6 S-05: Test Detail Drawer (overlay on S-04)

```
TestDetailDrawer (slide-in from right, width 640px desktop / full-screen mobile)
  +-- DrawerHeader
  |     +-- CloseButton: "X" (top-right)
  |     +-- StatusBadge: "Pass" (green) / "Fail" (red) / "Skip" (gray)
  |     +-- TestName: "Canonical System URL"
  |     +-- RequirementURI: "/req/system/canonical-url" (clickable, links to OGC spec if available)
  +-- FailureSection (conditional, only if status = fail)
  |     +-- SectionHeading: "Failure Reason"
  |     +-- FailureMessage (Card, red-tinted background):
  |           "Expected status 200 but received 404 for GET /collections/systems/{id}"
  +-- SkipSection (conditional, only if status = skip)
  |     +-- SectionHeading: "Skip Reason"
  |     +-- SkipMessage (Card, gray-tinted background):
  |           "Prerequisite conformance class '/req/core' did not pass"
  +-- RequestResponseViewer
  |     +-- TabBar: "Request" | "Response"
  |     +-- RequestTab
  |     |     +-- MethodBadge: "GET" (color-coded by HTTP method)
  |     |     +-- URLDisplay: full URL with query parameters (word-wrap, monospace)
  |     |     +-- HeadersSection (collapsible, expanded by default)
  |     |     |     +-- HeaderRow: "Accept: application/json"
  |     |     |     +-- HeaderRow: "Authorization: Bear****xyz9" (masked per FR-33)
  |     |     |     +-- ... (one row per header)
  |     |     +-- BodySection (collapsible, collapsed by default if empty)
  |     |           +-- CodeBlock: syntax-highlighted JSON (if request had a body)
  |     |           +-- EmptyState: "No request body" (if GET/DELETE)
  |     +-- ResponseTab
  |           +-- StatusCodeBadge: "200 OK" (green for 2xx, amber for 3xx, red for 4xx/5xx)
  |           +-- ResponseTime: "143ms"
  |           +-- HeadersSection (collapsible, collapsed by default)
  |           |     +-- HeaderRow: "Content-Type: application/json"
  |           |     +-- ... (one row per header)
  |           +-- BodySection (collapsible, expanded by default)
  |                 +-- CodeBlock: syntax-highlighted JSON (pretty-printed, scrollable)
  |                 +-- CopyButton: "Copy" (copies raw body to clipboard)
  +-- NavigationFooter
        +-- PreviousTestButton: "< Previous"
        +-- NextTestButton: "Next >"
        +-- TestPosition: "3 of 10 in System Features"
```

### 3.7 S-06: Not Found Page

```
NotFoundPage
  +-- CenteredContent (max-width 480px)
        +-- Icon: large search-x or file-question icon (muted)
        +-- Heading: "Assessment Not Found"
        +-- Description: "This assessment may have expired (results are kept for 24 hours)
             or the ID is incorrect."
        +-- BackButton: "Start a New Assessment" (link to S-01)
```

---

## 4. Component Specifications

### 4.1 URLInputForm

**Purpose**: Primary entry point for the application. Accepts and validates a CS API endpoint URL.

| Property | Detail |
|----------|--------|
| Input type | `<input type="url">` with additional pattern validation |
| Placeholder | `https://api.example.com/ogc/csapi` |
| Validation trigger | On blur and on submit |
| Valid patterns | `http://` or `https://` prefix, valid domain or IP, optional path/port |
| Rejected patterns | Missing protocol, `ftp://`, private IPs (10.x, 172.16-31.x, 192.168.x, 127.x, localhost, ::1) per NFR-06 |
| Max length | 2048 characters |
| Error display | Red border on input, error message below input in red text with error icon |
| Submit button | "Discover Endpoint" -- disabled until input is non-empty and passes format validation |
| Loading state | Button text changes to "Discovering...", spinner replaces icon, input becomes read-only, button disabled |
| Success behavior | Redirect to S-02 with discovery data passed via state or refetched |
| Keyboard | Enter key submits form (equivalent to clicking Discover Endpoint) |
| Autofocus | Input is focused on page load |

**Error messages**:
- Empty input + blur: no error (do not nag on initial blur)
- Invalid format: "Enter a valid HTTP or HTTPS URL"
- Private/reserved IP: "Private and reserved IP addresses are not allowed"
- Unreachable: "Could not reach this endpoint. Verify the URL and try again."
- Not a CS API: "No OGC API conformance declaration found at this endpoint."
- 401/403: "This endpoint requires authentication." (then redirect to config with auth expanded)

### 4.2 ConformanceClassSelector

**Purpose**: Presents discovered conformance classes with checkboxes for user selection.

| Property | Detail |
|----------|--------|
| Data source | Array of conformance class objects from discovery response |
| Default selection | All testable classes selected; unsupported classes shown but disabled |
| Grouping | Three groups: "Parent Standards", "CS API Part 1", "Mutating Operations" |
| Group headers | Bold text, non-interactive, with group description |
| Checkbox behavior | Standard checkbox; selecting a class adds it to the assessment; deselecting removes it |
| Test count badge | Each checkbox row shows "(N tests)" in muted text beside the class name |
| Class URI | Displayed below class name in monospace, muted text (e.g., `http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system`) |
| Select All / Deselect All | Toggle at top of list. "Select All Testable" when some are unselected; "Deselect All" when all are selected |
| Dependency indication | If class B depends on class A, selecting B auto-selects A with a tooltip: "Required by [B class name]". Deselecting A shows confirmation: "Deselecting this will also deselect [dependent classes]. Continue?" |
| Unsupported classes | Listed at bottom in a separate "Not Yet Supported" section, grayed out, with no checkbox. Shows conformance URI only. |
| Mutating class warnings | See section 2.3 for the destructive test warning flow |
| Empty state | If no testable classes are detected: "No testable conformance classes were found for this endpoint." with a muted explanation |

### 4.3 AuthenticationConfig

**Purpose**: Allows users to provide credentials for authenticated endpoints.

| Property | Detail |
|----------|--------|
| Default state | Collapsed accordion with label "Authentication (optional)" |
| Auth type selector | Radio group: None (default), Bearer Token, API Key, Basic Auth |
| Bearer Token fields | Single password-type input, label "Token" |
| API Key fields | Text input for "Header Name" (default: `X-API-Key`), password-type input for "Value" |
| Basic Auth fields | Text input for "Username", password-type input for "Password" |
| Show/hide toggle | Each password-type input has an eye icon toggle to reveal/hide the value |
| Credential masking | In all subsequent UI display (progress, results, export), credentials are masked: first 4 and last 4 characters shown, middle replaced with `****` (FR-33) |
| Validation | Bearer token: non-empty when selected. API Key: both fields non-empty. Basic: both fields non-empty. |
| Security note | Muted helper text below auth section: "Credentials are sent only to the target endpoint and are not stored after the assessment completes." |

### 4.4 ProgressDisplay

**Purpose**: Shows real-time progress of a running assessment via SSE updates.

| Property | Detail |
|----------|--------|
| Progress bar | Full-width horizontal bar, animated fill left-to-right, percentage label centered or right-aligned |
| Bar color | Blue fill while in progress; green fill on completion; amber on cancel |
| Animation | Smooth CSS transition on width changes (200ms ease); subtle pulse animation on the leading edge while active |
| Stats row | Four inline stat blocks: Tests Completed (e.g., "47/103"), Passed (green), Failed (red), Skipped (gray) |
| Current activity | Two lines: "Testing: [Class Name]" and "[Test URI]". Both update in real-time via SSE |
| Elapsed timer | Client-side timer, updates every second, format "Xm Ys" |
| SSE events consumed | `test-started` (update current test label), `test-completed` (increment counters, update bar), `class-started` (update class label), `class-completed` (no visual change), `assessment-completed` (redirect to results) |
| SSE reconnection | If SSE connection drops, attempt reconnect every 3 seconds up to 5 times. Show warning: "Connection interrupted. Reconnecting..." If reconnect fails: "Connection lost. The assessment may still be running." with a "View Results" link that polls the REST API |
| Cancel flow | See section 2.2.5. Cancel button triggers `POST /api/assessments/:id/cancel`. Confirmation dialog required. |

### 4.5 ResultsDashboard

**Purpose**: Top-level summary of assessment outcomes.

| Property | Detail |
|----------|--------|
| Compliance score | Large percentage display. Calculated as: `(passed / (passed + failed)) * 100`, skipped tests excluded from denominator. Rounded to nearest integer. |
| Score color | Green (>=90%), amber (50-89%), red (<50%) -- always accompanied by text percentage, never color alone |
| Stat cards | Four cards in a row: Total Tests, Passed, Failed, Skipped. Each shows a count and a label. Passed/Failed/Skipped cards include status icons. |
| Class summary bar | Horizontal stacked bar showing proportion of classes passed/failed/skipped. Width proportional to count. Legend below with icon+text labels. |
| Per-class list | Accordion list (see ClassAccordion in section 3.5). Default: all collapsed. Clicking a failed class auto-expands it. |
| Filter bar | Toggle buttons: All / Passed / Failed / Skipped. Filters the class accordion list. Active filter is visually highlighted. Counts shown on each filter button: "Failed (3)". |
| Partial assessment banner | If assessment status is "partial" or "cancelled", display amber alert banner above class list. |
| Share/bookmark | Results URL (`/assess/:id/results`) is stable for 24 hours. No special share button needed -- the URL is the share mechanism. |
| Disclaimer | Card at the bottom of the page with the official disclaimer text (FR-38). Gray background, smaller text. Always visible -- not dismissable. |

### 4.6 TestDetailPanel (Drawer)

**Purpose**: Shows full details for a single test, including request/response inspection.

| Property | Detail |
|----------|--------|
| Trigger | Clicking "Details" button on any test row in the results |
| Animation | Slides in from right edge, 300ms ease-out. Background overlay with 50% black opacity. |
| Width | Desktop: 640px fixed. Tablet: 480px. Mobile: full viewport width. |
| Close | X button (top-right), Escape key, or click on background overlay |
| Focus trap | When drawer is open, Tab cycles through drawer elements only. Focus returns to the trigger button on close. |
| Previous/Next | Footer buttons to navigate between tests within the same conformance class. Wraps: "Previous" disabled on first test, "Next" disabled on last. |
| Position indicator | "3 of 10 in System Features" in footer |

### 4.7 RequestResponseViewer

**Purpose**: Displays HTTP request and response details for a test execution.

| Property | Detail |
|----------|--------|
| Tab bar | Two tabs: "Request" and "Response". Default: Request tab active if test passed; Response tab active if test failed (so user sees the problematic response first). |
| HTTP method badge | Colored inline badge: GET=blue, POST=green, PUT=amber, PATCH=purple, DELETE=red. Bold monospace text. |
| URL display | Full URL in monospace font, word-wrapping enabled. Query parameters on separate lines for readability (visual only, not actual line breaks in the data). |
| Headers | Key-value list in monospace. Keys bold, values regular. Collapsible section. Credential values masked per FR-33. |
| Body | Syntax-highlighted JSON in a scrollable code block. Pretty-printed (indented). Max-height 400px with vertical scroll. If body exceeds 100KB, show first 10KB with a "Show full body" expand button. |
| Copy button | Copies the raw (unmasked for non-credential headers, but credentials always masked) response/request body to clipboard. Toast notification: "Copied to clipboard". |
| Empty body | "No request body" or "No response body" in muted italic text |
| Status code | Response tab shows status code as a badge: 2xx green, 3xx amber, 4xx red, 5xx red. Format: "200 OK", "404 Not Found". |
| Response time | Displayed next to status code: "143ms". Color-coded: <500ms green, 500-2000ms amber, >2000ms red. |

---

## 5. Interaction Patterns

### 5.1 Form Validation

| Pattern | Behavior |
|---------|----------|
| Validation timing | Validate on blur for individual fields, validate all on submit |
| Error display | Inline below the field, red text with a circle-alert icon prefix |
| Error clearing | Error clears when user modifies the field value |
| Invalid field styling | Red border (`border-destructive`), red focus ring |
| Valid field styling | Default border; no green "valid" styling (reduces visual noise) |
| Required fields | Indicated with asterisk (*) after label; screen readers hear "required" |
| Submit prevention | Submit button disabled when required fields are empty or validation errors exist |

### 5.2 Loading States

| Context | Loading Indicator | Duration |
|---------|-------------------|----------|
| Endpoint discovery (S-01) | Button spinner + "Discovering..." text. Input becomes read-only. | Up to 15s (NFR-01) |
| Configuration page load (S-02) | Full-page skeleton: card outlines with shimmer placeholders for checkbox list, stats | Sub-second typically |
| Starting assessment (S-02) | Button spinner + "Starting..." text. All form controls disabled. | 1-3s |
| Progress page (S-03) | SSE-driven, always showing current state. Initial load shows "Connecting..." before first SSE event. | Continuous |
| Results page load (S-04) | Full-page skeleton: stat card placeholders, accordion placeholders with shimmer | 1-3s |
| Export generation | Button spinner + "Generating..." text. Other export button remains enabled. Toast on completion: "Report downloaded". | Up to 10s (NFR-14) |
| Drawer open (S-05) | No separate loading state -- data already loaded with results. Drawer animates in immediately. | Instant |

### 5.3 Error States

| Context | Error Display |
|---------|---------------|
| Field validation | Inline error below field (see 5.1) |
| API errors (discovery, start) | Inline error in the relevant form section, replacing any previous error |
| Network loss during progress | Warning banner in progress card: "Connection interrupted. Reconnecting..." |
| Failed export | Toast notification (error variant): "Export failed. Please try again." |
| Page-level errors | Full-page error state with icon, heading, description, and action button |
| Unexpected errors | Toast notification: "Something went wrong. Please try again." with a "Details" link that expands a collapsible with the error message |

### 5.4 Empty States

| Context | Empty State Display |
|---------|---------------------|
| No conformance classes detected | Card with info icon: "No testable conformance classes were found. The endpoint may not declare conformance, or the declared classes are not yet supported by this tool." |
| All tests filtered out (S-04) | Centered text in list area: "No [passed/failed/skipped] conformance classes." with a "Show all" link |
| No request body (S-05) | Muted text: "No request body" |
| No response body (S-05) | Muted text: "No response body" |
| No failure reason | Should never occur per FR-26 -- every fail has a reason. Defensive: "No failure details available." |

### 5.5 Confirmation Dialogs

| Trigger | Dialog Content |
|---------|----------------|
| Cancel assessment | Title: "Cancel Assessment?" Body: "The assessment will stop and results collected so far will be available as a partial report." Actions: "Continue Testing" (secondary) / "Cancel Assessment" (destructive) |
| Deselect dependency class | Title: "Deselect Dependent Classes?" Body: "Deselecting [class] will also deselect: [list of dependent classes]." Actions: "Keep Selected" (secondary) / "Deselect All" (primary) |

Dialogs use the shadcn/ui `AlertDialog` component: centered modal with overlay, focus-trapped, Escape to close (selects the safe/cancel action).

### 5.6 Toast Notifications

| Event | Toast Type | Message | Duration |
|-------|------------|---------|----------|
| Export complete | Success | "JSON report downloaded" / "PDF report downloaded" | 3s auto-dismiss |
| Export failed | Error | "Export failed. Please try again." | 5s, manual dismiss |
| Clipboard copy | Success | "Copied to clipboard" | 2s auto-dismiss |
| SSE reconnected | Info | "Connection restored" | 3s auto-dismiss |
| Unexpected error | Error | "Something went wrong. Please try again." | 5s, manual dismiss |

Toasts appear in the bottom-right corner (desktop) or bottom-center (mobile). Stack vertically. Use shadcn/ui `Sonner` or `Toast` component.

---

## 6. Color & Status Conventions

### 6.1 Test Result Status

**Critical rule**: Color is NEVER the sole indicator. Every status uses icon + text + color together (WCAG 2.1 AA, NFR-07).

| Status | Color (Tailwind) | Icon (Lucide) | Text Label | Usage |
|--------|-------------------|---------------|------------|-------|
| Pass | `text-green-600` / `bg-green-50` / `border-green-200` | `CheckCircle2` (filled circle with checkmark) | "Pass" or "Passed" | Test passed, class passed |
| Fail | `text-red-600` / `bg-red-50` / `border-red-200` | `XCircle` (filled circle with X) | "Fail" or "Failed" | Test failed, class failed |
| Skip | `text-gray-500` / `bg-gray-50` / `border-gray-200` | `MinusCircle` (filled circle with horizontal line) | "Skip" or "Skipped" | Test skipped, class skipped |

### 6.2 Status Badge Variants

| Badge Context | Styling | Example |
|---------------|---------|---------|
| Test row status | Small icon (16px) + text label, inline | `[check] Pass` |
| Class accordion header | Medium icon (20px) + text + count | `[check] System Features - 10/10 passed` |
| Summary stat card | Large icon (24px) + count + label, card background tinted | `[check] 87 Passed` |
| Assessment status | Pill badge | `Complete` (green) / `Partial` (amber) / `Cancelled` (amber) |

### 6.3 HTTP Method Colors

| Method | Color (Tailwind) | Background |
|--------|-------------------|------------|
| GET | `text-blue-700` | `bg-blue-100` |
| POST | `text-green-700` | `bg-green-100` |
| PUT | `text-amber-700` | `bg-amber-100` |
| PATCH | `text-purple-700` | `bg-purple-100` |
| DELETE | `text-red-700` | `bg-red-100` |

### 6.4 HTTP Status Code Colors

| Range | Color | Icon |
|-------|-------|------|
| 2xx | Green (`text-green-600`) | `CheckCircle2` |
| 3xx | Amber (`text-amber-600`) | `ArrowRight` |
| 4xx | Red (`text-red-600`) | `XCircle` |
| 5xx | Red (`text-red-600`) | `AlertTriangle` |

### 6.5 Compliance Score Colors

| Range | Color | Meaning |
|-------|-------|---------|
| 90-100% | Green (`text-green-600`) | High compliance |
| 50-89% | Amber (`text-amber-600`) | Partial compliance |
| 0-49% | Red (`text-red-600`) | Low compliance |

### 6.6 General UI Colors

| Purpose | Tailwind Token | Notes |
|---------|----------------|-------|
| Primary action buttons | `bg-primary` (shadcn default, typically slate-900 / white) | "Start Assessment", "Discover Endpoint" |
| Secondary buttons | `bg-secondary` variant | "Cancel", "Back" |
| Destructive buttons | `bg-destructive` (red) | "Cancel Assessment" in confirmation dialog |
| Warning callouts | `bg-amber-50`, `border-amber-300`, `text-amber-800` | Destructive test warnings |
| Info callouts | `bg-blue-50`, `border-blue-300`, `text-blue-800` | Auth-required notices |
| Page background | `bg-background` (shadcn, typically white or slate-50) | |
| Card background | `bg-card` (shadcn, typically white) | |
| Muted text | `text-muted-foreground` | URIs, timestamps, helper text |
| Borders | `border-border` (shadcn, typically slate-200) | Card borders, dividers |

---

## 7. Responsive Strategy

### 7.1 Approach

**Desktop-first** design. The primary user persona (CS API server implementer, DevOps engineer) will predominantly use the tool on a desktop browser while developing or evaluating an API. Mobile is supported but not the primary context.

### 7.2 Breakpoints

Using Tailwind's default breakpoints:

| Breakpoint | Min Width | Target |
|------------|-----------|--------|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops, tablets landscape |
| `xl` | 1280px | Desktop monitors |

### 7.3 Layout Adaptations by Breakpoint

#### S-01: Landing Page

| Element | Desktop (>=1024px) | Tablet (768-1023px) | Mobile (<768px) |
|---------|-------------------|---------------------|-----------------|
| Hero section | Centered, max-width 640px | Same | Full width with padding |
| Feature list | 3 items in a row | 3 items in a row | Stacked vertically |
| URL input + button | Input and button on same row | Same | Input full width, button full width below |
| Example URL | Single line | Single line | May wrap |

#### S-02: Configuration Page

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Discovery summary stats | 4 in a row | 2x2 grid | Stacked vertically |
| Conformance class list | Full width in card | Same | Same, smaller padding |
| Auth/Config sections | Side by side (2 columns) | Stacked | Stacked |
| Action bar | Inline at bottom of content | Same | Sticky to bottom of viewport |

#### S-03: Progress Page

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Progress card | Centered, max-width 768px | Full width | Full width |
| Stats row | 4 stats in a row | 4 stats in a row (compact) | 2x2 grid |
| Test log | Below card, collapsible | Same | Same, full width |

#### S-04: Results Page

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Header meta row | Single line: timestamp, duration, status, exports | Two lines | Stacked, exports full width |
| Stat cards | 4 in a row | 2x2 grid | 2x2 grid |
| Class summary bar | Full width | Same | Same |
| Filter bar | Inline buttons | Same | Horizontally scrollable |
| Accordion list | Full width | Same | Same |
| Test row detail button | Visible always | Same | Icon-only on small screens |

#### S-05: Test Detail Drawer

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Drawer width | 640px | 480px | Full viewport width |
| Code blocks | Horizontal scroll | Same | Same |
| Prev/Next buttons | Both visible with text | Both visible with text | Icon-only |

### 7.4 Touch Considerations

- All interactive targets are at least 44x44px (WCAG 2.5.5)
- Accordion headers are full-width tap targets
- Swipe-to-dismiss on the detail drawer (mobile)
- No hover-only interactions -- all hover effects have equivalent tap/click behavior

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance (NFR-07)

The application must meet WCAG 2.1 Level AA. The following sections detail specific requirements organized by WCAG principle.

### 8.2 Perceivable

#### 8.2.1 Text Alternatives (1.1.1)
- All icons have `aria-label` or accompanying visible text
- Status icons (pass/fail/skip) always have text labels -- icon is supplementary, never the sole indicator
- Decorative icons use `aria-hidden="true"`

#### 8.2.2 Color Independence (1.4.1)
- Pass/fail/skip status: icon shape + text label + color (triple redundancy)
- HTTP method badges: text label + color
- Progress bar: percentage text label + fill color
- Compliance score: numeric percentage + color
- Form validation errors: icon + red text + red border (triple redundancy)

#### 8.2.3 Color Contrast (1.4.3, 1.4.6)
- Body text: minimum 4.5:1 contrast ratio against background
- Large text (18px+ or 14px+ bold): minimum 3:1
- Interactive components and graphical objects: minimum 3:1 against adjacent colors
- Status colors verified against both white and tinted backgrounds:
  - Green (`#16a34a` on white): 4.58:1 -- passes AA
  - Red (`#dc2626` on white): 4.63:1 -- passes AA
  - Gray (`#6b7280` on white): 5.02:1 -- passes AA
  - Amber (`#d97706` on white): 3.19:1 -- passes AA for large text; for small text, use `#b45309` (4.56:1)
- All background-tinted status areas (e.g., `bg-green-50`) must maintain contrast ratios for text placed on them

#### 8.2.4 Resize and Reflow (1.4.4, 1.4.10)
- Content reflows at 320px viewport width without horizontal scrolling (except data tables and code blocks)
- Text scales to 200% without loss of content or functionality
- Code blocks in the request/response viewer use horizontal scroll, which is acceptable per WCAG for preformatted text

### 8.3 Operable

#### 8.3.1 Keyboard Navigation (2.1.1, 2.1.2)
- All interactive elements are reachable via Tab key
- Tab order follows visual reading order (top-to-bottom, left-to-right)
- No keyboard traps (except modal dialogs, which trap focus intentionally and release on Escape)
- Custom keyboard shortcuts:
  - `Escape`: close drawer (S-05), close dialog, clear search filter
  - `Enter`: submit form, toggle accordion, activate button
  - `Space`: toggle checkbox, activate button
  - `Arrow Left/Right`: navigate tabs in request/response viewer
  - `Arrow Up/Down`: navigate test rows in results table (when focused on the table)

#### 8.3.2 Focus Management (2.4.3, 2.4.7)
- Visible focus indicator: 2px solid ring (`ring-2 ring-ring ring-offset-2` in shadcn/ui) on all focusable elements
- Focus moves to first interactive element in a section after navigation:
  - S-01 -> S-02: focus on first conformance class checkbox
  - S-02 -> S-03: focus on progress heading (h1)
  - S-03 -> S-04: focus on results heading (h1)
- Drawer open (S-05): focus moves to close button; on close, focus returns to the trigger button
- Dialog open: focus moves to the primary action button; on close, focus returns to the trigger
- After inline error appears: focus moves to the first field with an error (`aria-invalid="true"`)

#### 8.3.3 Skip Links (2.4.1)
- "Skip to main content" link as the first focusable element on every page
- On S-04 (Results): additional skip link "Skip to conformance class results" that jumps past the summary dashboard

#### 8.3.4 Page Titles (2.4.2)
- Each screen has a unique `<title>`:
  - S-01: "CS API Compliance Assessor"
  - S-02: "Configure Assessment | CS API Compliance Assessor"
  - S-03: "Assessment in Progress | CS API Compliance Assessor"
  - S-04: "Assessment Results | CS API Compliance Assessor"
  - S-06: "Not Found | CS API Compliance Assessor"

#### 8.3.5 Target Size (2.5.5 - AAA, targeted)
- All interactive targets are at least 44x44px for touch friendliness
- Minimum 24x24px for inline icon buttons (meets AA 2.5.8)

### 8.4 Understandable

#### 8.4.1 Language (3.1.1)
- `<html lang="en">` on all pages
- All user-facing strings externalized for future i18n (NFR-15)

#### 8.4.2 Input Assistance (3.3.1, 3.3.2, 3.3.3)
- All form inputs have visible labels (not placeholder-only)
- Error messages identify the field and describe the error
- Error messages suggest correction where possible ("Enter a valid HTTP or HTTPS URL")
- Required fields marked with asterisk and `aria-required="true"`

#### 8.4.3 Consistent Navigation (3.2.3, 3.2.4)
- Header navigation appears in the same position on all pages
- Common actions (export buttons, back links) appear in consistent locations

### 8.5 Robust

#### 8.5.1 ARIA Usage (4.1.2)
- All custom components use appropriate ARIA roles:
  - Accordion: `role="region"` with `aria-labelledby` pointing to the header
  - Drawer: `role="dialog"` with `aria-modal="true"` and `aria-labelledby`
  - Progress bar: `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label="Assessment progress"`
  - Tabs: `role="tablist"`, `role="tab"` with `aria-selected`, `role="tabpanel"` with `aria-labelledby`
  - Filter toggles: `role="radiogroup"` with `role="radio"` and `aria-checked`
  - Toast notifications: `role="status"` with `aria-live="polite"` (info/success) or `role="alert"` with `aria-live="assertive"` (errors)
  - Test result rows: semantic `<table>` with `<th>` for column headers; status column includes `aria-label` with full status text

#### 8.5.2 Live Regions (4.1.3)
- Progress updates (S-03): `aria-live="polite"` region announces significant milestones: "10 tests completed", "Conformance class System Features started", "Assessment complete: 87% compliance"
  - Do NOT announce every individual test completion (too noisy). Announce: class transitions, every 10th test, completion.
- Validation errors: `aria-live="assertive"` so errors are announced immediately
- Toast notifications: `aria-live="polite"` for info/success, `aria-live="assertive"` for errors

### 8.6 Screen Reader Announcements

| Event | Announcement | Live Region |
|-------|-------------|-------------|
| Discovery started | "Discovering endpoint..." | polite |
| Discovery complete | "Endpoint discovered. [N] conformance classes found." | polite |
| Discovery failed | "Error: [error message]" | assertive |
| Assessment started | "Assessment started. Testing [N] requirements." | polite |
| Class transition | "Now testing [class name]." | polite |
| Every 10th test | "[N] of [total] tests completed." | polite |
| Assessment complete | "Assessment complete. [N] passed, [N] failed, [N] skipped. [X]% compliance." | polite |
| Assessment cancelled | "Assessment cancelled. Partial results available." | polite |
| Drawer opened | "[Test name] details" (via aria-labelledby on dialog) | -- |
| Filter changed | "[N] conformance classes shown." | polite |
| Export started | "Generating [format] report..." | polite |
| Export complete | "[Format] report downloaded." | polite |

---

## Appendix A: shadcn/ui Component Mapping

The following shadcn/ui components should be installed and used:

| UI Element | shadcn/ui Component | Notes |
|------------|---------------------|-------|
| URL input field | `Input` | With custom validation wrapper |
| Discover / Start buttons | `Button` | Variants: default, destructive, secondary, ghost |
| Conformance class checkboxes | `Checkbox` + `Label` | Custom compound component |
| Auth type selector | `RadioGroup` + `RadioGroupItem` | |
| Configuration accordion sections | `Collapsible` | For auth and advanced settings |
| Conformance class accordion | `Accordion` + `AccordionItem` | For results page class list |
| Progress bar | `Progress` | Custom styling for color states |
| Stat cards | `Card` + `CardHeader` + `CardContent` | |
| Filter toggles | `ToggleGroup` + `ToggleGroupItem` | For All/Passed/Failed/Skipped |
| Test detail drawer | `Sheet` (side variant) | Right-side slide-in |
| Request/Response tabs | `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` | |
| Cancel confirmation | `AlertDialog` | |
| Dependency confirmation | `AlertDialog` | |
| Toast notifications | `Sonner` (toast) | Bottom-right positioning |
| Badges (status, method) | `Badge` | Custom color variants |
| Tooltip (truncated text) | `Tooltip` | For truncated failure reasons |
| Skeleton loading | `Skeleton` | For page load states |
| Dropdown (if needed) | `DropdownMenu` | Currently not required |
| Separator lines | `Separator` | Between sections |

## Appendix B: Icon Library

Use **Lucide React** icons (bundled with shadcn/ui). Key icons:

| Purpose | Icon Name | Context |
|---------|-----------|---------|
| Pass status | `CheckCircle2` | Test/class passed |
| Fail status | `XCircle` | Test/class failed |
| Skip status | `MinusCircle` | Test/class skipped |
| Warning | `AlertTriangle` | Destructive test warning, partial results |
| Info | `Info` | Auth-required notice, helper text |
| Download/Export | `Download` | Export JSON, Export PDF |
| Search/Discover | `Search` | Discover endpoint button icon |
| Back navigation | `ArrowLeft` | Back links |
| Expand/collapse | `ChevronDown` / `ChevronUp` | Accordion, collapsible sections |
| Close | `X` | Drawer close, dialog close |
| External link | `ExternalLink` | Links to OGC spec |
| Copy | `Copy` | Copy to clipboard |
| Clock/Timer | `Clock` | Elapsed time, response time |
| Settings/Config | `Settings` | Advanced settings section |
| Shield/Lock | `Shield` | Authentication section |
| Play | `Play` | Start assessment button icon |
| Square (stop) | `Square` | Cancel assessment button icon |
| Eye / EyeOff | `Eye` / `EyeOff` | Password field show/hide toggle |
| FileJson | `FileJson` | JSON export |
| FileText | `FileText` | PDF export |
| Loader | `Loader2` | Spinner (animate with `animate-spin`) |

## Appendix C: Page-Level Data Flow

This section summarizes what data each page needs and where it comes from, to guide frontend state management.

| Page | Data Required | Source | Caching |
|------|--------------|--------|---------|
| S-01 Landing | None (static) | -- | -- |
| S-02 Config | Discovery result (landing page links, conformance classes, collections) | `POST /api/assessments` discovery phase or separate discovery endpoint | Held in React state; lost on refresh (user re-enters URL) |
| S-03 Progress | Assessment ID, SSE event stream | `POST /api/assessments` (returns ID), `GET /api/assessments/:id/events` (SSE) | Assessment ID in URL; SSE is live |
| S-04 Results | Full assessment results object | `GET /api/assessments/:id` | Fetched on page load; stable URL for 24 hours |
| S-05 Drawer | Single test detail (subset of results) | Already loaded as part of S-04 data | No additional fetch |
| Export | Generated file (JSON or PDF) | `GET /api/assessments/:id/export?format=json\|pdf` | Browser download; no caching needed |

## Appendix D: Externalized String Keys

Per NFR-15, all user-facing strings must be externalized. Key string categories:

| Category | Example Key | Example Value |
|----------|-------------|---------------|
| Page titles | `page.landing.title` | "OGC Connected Systems API Compliance Assessor" |
| Form labels | `form.url.label` | "CS API Landing Page URL" |
| Form placeholders | `form.url.placeholder` | "https://api.example.com/ogc/csapi" |
| Button text | `button.discover` | "Discover Endpoint" |
| Validation errors | `error.url.invalid` | "Enter a valid HTTP or HTTPS URL" |
| Status labels | `status.pass` | "Pass" |
| Disclaimer | `disclaimer.text` | "This assessment is unofficial..." |
| Screen reader | `sr.progress.milestone` | "{count} of {total} tests completed" |

String files should be stored in a `/messages` or `/i18n` directory with `en.json` as the default locale file.
