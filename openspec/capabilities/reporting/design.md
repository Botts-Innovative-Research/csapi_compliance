# Reporting — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Reporting capability computes aggregate statistics from raw test results and renders them in an interactive React dashboard. It provides the user with a summary view (total pass/fail/skip, compliance percentage), a per-conformance-class breakdown, and drill-down into individual test details with captured HTTP exchanges. The UI meets WCAG 2.1 AA accessibility requirements and uses icons/text alongside color to indicate status.

Four components collaborate to deliver this capability:

- **ResultAggregator** (backend) — A pure function module that takes raw `ConformanceClassResult[]` and computes aggregate statistics: total tests, pass/fail/skip counts, overall compliance percentage, per-class summaries, and duration. Produces an `AggregatedResults` object consumed by both the frontend dashboard and the export capability.
- **ResultsDashboard** (frontend, React) — The top-level page component at `/results/:id`. Fetches assessment results via `GET /api/assessments/:id`, renders the summary cards, disclaimer banner, and the list of conformance class panels. Provides export controls (JSON, PDF download buttons).
- **ConformanceClassPanel** (frontend, React) — A collapsible panel component for each conformance class. Shows class name, URI, pass/fail badge (with icon), and test counts. Expands to reveal individual test result rows. Each class is visually coded with both color and icon (checkmark for pass, X for fail, dash for skip).
- **TestDetailDrawer** (frontend, React) — A slide-out drawer that opens when a user clicks on an individual test result. Displays the requirement ID, requirement URI, test name, status, failure/skip reason, and all associated HTTP exchanges with full request/response details (method, URL, headers, body, status, response time). Credential values are masked.

```
  +---------------------------------------------------------------+
  |  Results Page (/results/:id)                                  |
  |                                                                |
  |  +----------------------------------------------------------+ |
  |  | ResultsDashboard                                          | |
  |  |                                                           | |
  |  | +------------------------------------------------------+ | |
  |  | | Summary Cards                                        | | |
  |  | | +----------+ +----------+ +----------+ +-----------+| | |
  |  | | | Total    | | Passed   | | Failed   | | Compliance|| | |
  |  | | | Tests    | | (icon+#) | | (icon+#) | | %         || | |
  |  | | +----------+ +----------+ +----------+ +-----------+| | |
  |  | +------------------------------------------------------+ | |
  |  |                                                           | |
  |  | +------------------------------------------------------+ | |
  |  | | Disclaimer Banner (FR-38)                             | | |
  |  | | "This assessment is unofficial..."                    | | |
  |  | +------------------------------------------------------+ | |
  |  |                                                           | |
  |  | +------------------------------------------------------+ | |
  |  | | ConformanceClassPanel (one per class)                 | | |
  |  | |                                                       | | |
  |  | | [v] OGC API Common Part 1     [PASS]  4/4 passed     | | |
  |  | |     +-- Test: Landing page structure   [pass]        | | |
  |  | |     +-- Test: Conformance endpoint     [pass]   --+  | | |
  |  | |     +-- Test: JSON encoding            [pass]     |  | | |
  |  | |     +-- Test: OpenAPI link             [pass]     |  | | |
  |  | |                                                    |  | | |
  |  | | [v] CS API Core               [FAIL]  3/5 passed  |  | | |
  |  | |     +-- Test: Resource endpoints       [pass]     |  | | |
  |  | |     +-- Test: Link relations           [fail] ----+  | | |
  |  | |     ...                                |          |  | | |
  |  | +------------------------------------------------------+ | |
  |  |                                          |              | |
  |  | +--------------------------------------+ |              | |
  |  | | Export Controls                      | |              | |
  |  | | [Download JSON] [Download PDF]       | |              | |
  |  | +--------------------------------------+ |              | |
  |  +----------------------------------------------------------+ |
  |                                             |                  |
  |  +------------------------------------------v---------------+ |
  |  | TestDetailDrawer (slide-out)                              | |
  |  |                                                           | |
  |  | Requirement: /req/core/link-relations                     | |
  |  | Status: FAIL                                              | |
  |  | Reason: "Expected link rel 'systems' but not found"       | |
  |  |                                                           | |
  |  | HTTP Exchange #1:                                         | |
  |  | Request:  GET /                                           | |
  |  |   Headers: { Accept: application/json,                    | |
  |  |             Authorization: Bear****oken }                 | |
  |  | Response: 200 OK  (142ms)                                 | |
  |  |   Headers: { Content-Type: application/json }             | |
  |  |   Body: { "links": [ ... ] }                              | |
  |  +----------------------------------------------------------+ |
  +---------------------------------------------------------------+
```

## Key Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| `ResultAggregator.aggregate(classes: ConformanceClassResult[]): AggregatedResults` | Pure function | Computes summary statistics across all conformance class results. Returns the `AggregatedResults` object used by both the dashboard and export capability. |
| `AggregatedResults` | TypeScript type | `{ totalTests: number; passed: number; failed: number; skipped: number; compliancePercentage: number; durationMs: number; classSummaries: ClassSummary[]; overallStatus: 'pass' \| 'fail' \| 'partial' }` |
| `ClassSummary` | TypeScript type | `{ uri: string; name: string; status: 'pass' \| 'fail' \| 'skip'; passed: number; failed: number; skipped: number; totalTests: number }` |
| `GET /api/assessments/:id` | REST API | Returns the full assessment including `status`, `progress`, and `results` (when completed). The frontend calls this endpoint on page load to populate the dashboard. |
| `ResultsDashboard` | React component | Props: `{ assessmentId: string }`. Fetches results, renders summary cards, disclaimer, class panels, and export controls. Uses `@tanstack/react-query` or SWR for data fetching with caching. |
| `ConformanceClassPanel` | React component | Props: `{ classResult: ConformanceClassResult; onTestClick: (testResult: TestResult) => void }`. Renders a collapsible section for one conformance class. |
| `TestDetailDrawer` | React component | Props: `{ testResult: TestResult \| null; open: boolean; onClose: () => void }`. Renders the slide-out drawer with test details and masked HTTP exchanges. |
| `StatusBadge` | React component | Props: `{ status: 'pass' \| 'fail' \| 'skip' }`. Renders a colored badge with both an icon (checkmark/X/dash) and text label. Ensures WCAG 2.1 AA compliance by not relying on color alone. |
| `HttpExchangeViewer` | React component | Props: `{ exchanges: HttpExchange[] }`. Renders request/response pairs in a formatted, collapsible view with syntax highlighting for JSON bodies. |

## Configuration Schema

```json
{
  "reporting": {
    "complianceFormula": "passed / (passed + failed) * 100",
    "disclaimerText": "This assessment is unofficial and does not constitute OGC certification. Results are based on automated testing against the OGC 23-001 standard and may not cover all edge cases.",
    "maxBodyPreviewLength": 2000,
    "bodyPreviewCollapsedLength": 500,
    "refreshIntervalMs": 0,
    "statusIcons": {
      "pass": "CheckCircle",
      "fail": "XCircle",
      "skip": "MinusCircle"
    }
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| Assessment ID not found (GET /api/assessments/:id returns 404) | Dashboard renders a "not found" message: "This assessment does not exist or has expired." | User is prompted to start a new assessment. Link to landing page provided. |
| Assessment still running when results page is loaded | Dashboard shows a "still running" banner with a link to the progress view at `/progress/:id`. | User navigates to the progress view to monitor execution. |
| Assessment was cancelled (status: "cancelled" or "partial") | Dashboard renders results collected so far with a prominent "Partial Results" banner: "This assessment was cancelled before completion. Results below are partial." | User can review partial results or start a new assessment. |
| Network error fetching results from backend API | Dashboard renders an error state with "Failed to load results. Please try again." and a retry button. | User clicks retry or refreshes the page. |
| HTTP exchange body is too large to render | The `HttpExchangeViewer` truncates the body display at `maxBodyPreviewLength` (2000 chars) with a "Show full body" toggle that renders the complete body in a scrollable container. | User can expand to see the full body if needed. |
| No test results available (empty results object) | Dashboard renders "No test results available" with an explanation that no conformance classes were testable. | User checks whether the endpoint declared any supported conformance classes. |

## Dependencies

- **React** ^18.0.0 — Component rendering
- **Next.js** ^14.0.0 — Page routing (`/results/:id`)
- **shadcn/ui** (latest) — Card, Collapsible, Sheet (drawer), Badge, Button, Alert UI primitives
- **Tailwind CSS** ^3.0.0 — Utility-first styling
- **Lucide React** (latest) — Icon library for status icons (CheckCircle, XCircle, MinusCircle)
- **@tanstack/react-query** ^5.0.0 or **SWR** ^2.0.0 — Data fetching and caching for the results API call
