# Architecture — CS API Compliance Assessor

> Version: 1.0 | Status: Living Document | Last updated: 2026-03-31
> **Last Reconciled: 2026-03-31** — Review required if >30 days stale

---

## 1. System Context

```
 +-------------------+         +---------------------------+
 |                   |  HTTPS  |                           |
 |   Browser User    +-------->+  CS API Compliance        |
 |  (Implementer,    |<--------+  Assessor                 |
 |   Integrator,     |  HTML/  |                           |
 |   QA Engineer)    |  SSE/   |  +---------------------+  |
 |                   |  JSON   |  | Next.js Frontend    |  |
 +-------------------+         |  | (SPA + SSR shell)   |  |
                               |  +----------+----------+  |
                               |             |              |
                               |         REST/SSE           |
                               |             |              |
                               |  +----------v----------+  |
                               |  | Node.js Backend     |  |
                               |  | (Test Engine + API)  |  |
                               |  +----------+----------+  |
                               |             |              |
                               +-------------|-------------+
                                             |
                                     HTTP/HTTPS requests
                                             |
                               +-------------v--------------+
                               |  Implementation Under Test  |
                               |  (CS API Server Endpoint)   |
                               |  e.g. api.georobotix.io     |
                               +-----------------------------+

                               +-----------------------------+
                               |  OGC GitHub Repository      |
                               |  (OpenAPI definitions,      |
                               |   JSON Schemas — bundled    |
                               |   at build time)            |
                               +-----------------------------+
```

### External Actors & Systems

| Actor / System | Role | Interface |
|---|---|---|
| Browser User | Submits endpoint URL, configures assessment, reviews results, exports reports | HTTPS (HTML, JSON, SSE) |
| Implementation Under Test (IUT) | The CS API server endpoint being assessed | HTTP/HTTPS (GET, POST, PUT, PATCH, DELETE) |
| OGC GitHub Repository | Source of OpenAPI definitions and JSON schemas for CS API Part 1 and parent standards | Build-time fetch; schemas bundled into the application image |

---

## 2. Component Architecture

### 2.1 Backend Components

```
+-----------------------------------------------------------------------+
|  Node.js Backend (Express/Fastify)                                    |
|                                                                       |
|  +--------------------+    +--------------------+                     |
|  | Assessment         |    | SSE Broadcaster    |                     |
|  | Controller         +--->+ (EventEmitter +    |----> SSE stream     |
|  | (REST API routes)  |    |  per-session)      |      to client      |
|  +---------+----------+    +--------------------+                     |
|            |                                                          |
|            v                                                          |
|  +--------------------+    +--------------------+                     |
|  | Session Manager    |    | Export Engine       |                     |
|  | (max 5 concurrent  |    | (JSON serializer + |----> JSON/PDF       |
|  |  sessions, 24h TTL)|    |  PDFKit renderer)  |      downloads      |
|  +---------+----------+    +--------------------+                     |
|            |                         ^                                |
|            v                         |                                |
|  +--------------------+    +--------+-----------+                     |
|  | Test Runner        |    | Result Store       |                     |
|  | (orchestrator,     +--->+ (in-memory Map     |                     |
|  |  concurrency ctrl, |    |  with 24h TTL,     |                     |
|  |  dependency order) |    |  file-backed dump) |                     |
|  +---------+----------+    +--------------------+                     |
|            |                                                          |
|            v                                                          |
|  +--------------------+    +--------------------+                     |
|  | Conformance Mapper |    | Schema Validator   |                     |
|  | (URI -> requirement|    | (Ajv instance with |                     |
|  |  sets, dependency  |    |  preloaded OGC     |                     |
|  |  graph)            |    |  JSON Schemas)     |                     |
|  +--------------------+    +---------+----------+                     |
|                                      |                                |
|            +-------------------------+                                |
|            v                                                          |
|  +--------------------+    +--------------------+                     |
|  | HTTP Client        |    | SSRF Guard         |                     |
|  | (undici/axios with |    | (URL validation,   |                     |
|  |  interceptors for  |<---+  private IP block, |                     |
|  |  req/res capture)  |    |  DNS rebind check) |                     |
|  +---------+----------+    +--------------------+                     |
|            |                                                          |
|            v                                                          |
|      Outbound HTTP to IUT                                             |
+-----------------------------------------------------------------------+
```

#### Component Responsibilities

| Component | Responsibility | Key Interfaces |
|---|---|---|
| **Assessment Controller** | Handles REST API routes (`POST /api/assessments`, `GET /api/assessments/:id`, etc.). Validates input, creates sessions, delegates to Test Runner, returns results. | Inbound: REST from frontend. Outbound: Session Manager, Test Runner, Export Engine. |
| **Session Manager** | Manages assessment lifecycle. Enforces max 5 concurrent sessions (NFR-04). Assigns UUIDs. Tracks session state (`running`, `completed`, `cancelled`, `partial`). Evicts sessions older than 24 hours. | Inbound: Assessment Controller. Outbound: Result Store. |
| **Test Runner** | Orchestrates test execution. Resolves dependency order (FR-28). Controls concurrency via a semaphore/pool (FR-08, default 5 concurrent requests). Emits progress events. Handles cancellation (FR-43). | Inbound: Session Manager. Outbound: Conformance Mapper, HTTP Client, Schema Validator, SSE Broadcaster, Result Store. |
| **Conformance Mapper** | Maps conformance class URIs (from `/conformance`) to requirement sets defined in OGC 23-001 and parent standards. Builds a dependency DAG so classes execute in valid order. Identifies which classes are testable vs. declared-but-unsupported. | Inbound: Test Runner, Assessment Controller. Static data: requirement registry loaded at startup. |
| **Schema Validator** | Wraps Ajv with precompiled JSON Schemas from the OGC OpenAPI definitions. Validates response bodies and returns structured validation errors. | Inbound: Test Runner (per-test invocation). Static data: bundled JSON schemas. |
| **HTTP Client** | Wraps undici (preferred) or axios. Applies user-provided auth credentials to every request. Records full request/response details (method, URL, headers, body, status, timing) into a capture object (FR-30, FR-31). Respects configurable timeout (FR-08). | Inbound: Test Runner. Outbound: IUT over HTTP/HTTPS. Collaborator: SSRF Guard (pre-request). |
| **SSRF Guard** | Validates target URLs before any HTTP request. Blocks private/reserved IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1, link-local). Performs DNS resolution pre-check to catch DNS rebinding. | Inbound: HTTP Client (pre-request hook). |
| **Result Store** | In-memory `Map<string, AssessmentResult>` keyed by assessment ID. Stores full test results, progress state, and request/response captures. Runs a periodic cleanup (every 15 minutes) to evict entries older than 24 hours. Optionally writes completed results to a temp-file JSON dump for crash recovery. | Inbound: Test Runner (writes), Assessment Controller (reads), Export Engine (reads). |
| **SSE Broadcaster** | Manages per-session SSE connections. Receives progress events from the Test Runner (via EventEmitter) and pushes them to connected clients. Event types: `test-started`, `test-completed`, `class-started`, `class-completed`, `assessment-completed`, `assessment-error`. Handles client disconnect gracefully. | Inbound: Test Runner (events). Outbound: SSE stream to frontend. |
| **Export Engine** | Generates JSON and PDF reports from completed assessment results. JSON: serializes the full `AssessmentResult` with a versioned schema (v1). PDF: uses PDFKit to render summary, per-class results, and failed-test details with request/response excerpts. Masks credentials (FR-33). | Inbound: Assessment Controller. Data: Result Store. |

### 2.2 Frontend Components

```
+-----------------------------------------------------------------------+
|  Next.js Frontend (React + TypeScript + Tailwind + shadcn/ui)         |
|                                                                       |
|  +---------------------+      +---------------------+                |
|  | App Shell           |      | i18n String Store   |                |
|  | (Layout, Nav,       |      | (externalized       |                |
|  |  Error Boundary,    |      |  user-facing text)  |                |
|  |  Disclaimer Banner) |      +---------------------+                |
|  +----------+----------+                                              |
|             |                                                         |
|  +----------v---------------------------------------------------+    |
|  |                        Page Router                            |    |
|  +---+---------------+----------------+----------------+--------+    |
|      |               |                |                |              |
|      v               v                v                v              |
|  +--------+   +-------------+   +-----------+   +-----------+        |
|  | Landing|   | Assessment  |   | Progress  |   | Results   |        |
|  | Page   |   | Wizard      |   | View      |   | Dashboard |        |
|  +--------+   +-------------+   +-----------+   +-----------+        |
|  | URL    |   | Step 1:     |   | SSE       |   | Summary   |        |
|  | input  |   |  Endpoint   |   | consumer  |   | cards     |        |
|  | field  |   |  validation |   | Progress  |   | Class     |        |
|  | Start  |   | Step 2:     |   | bar       |   | breakdown |        |
|  | button |   |  Conformance|   | Current   |   | Test      |        |
|  | Tool   |   |  class pick |   | test name |   | detail    |        |
|  | desc.  |   | Step 3:     |   | Class     |   | panels    |        |
|  +--------+   |  Auth       |   | progress  |   | Req/Res   |        |
|               | Step 4:     |   | Cancel    |   | viewer    |        |
|               |  Config &   |   | button    |   | Export    |        |
|               |  confirm    |   +-----------+   | controls  |        |
|               +-------------+                   +-----------+        |
|                                                                       |
|  +---------------------------+   +----------------------------+       |
|  | API Client Service        |   | SSE Client Service         |       |
|  | (fetch wrapper for REST)  |   | (EventSource wrapper)      |       |
|  +---------------------------+   +----------------------------+       |
+-----------------------------------------------------------------------+
```

#### Frontend Component Responsibilities

| Component | Responsibility |
|---|---|
| **App Shell** | Global layout, navigation, error boundary, disclaimer banner (FR-38), responsive container. |
| **Landing Page** | URL input field, "Start Assessment" button, brief tool description (FR-45). Validates URL format client-side before submission. |
| **Assessment Wizard** | Multi-step form: (1) endpoint URL entry and validation, (2) conformance class selection with destructive-test warnings (FR-06, FR-20), (3) optional auth credential entry (FR-07), (4) run configuration (timeout, concurrency) and confirmation (FR-08). |
| **Progress View** | Connects to SSE stream. Displays real-time progress: current class, current test, completed/total count, progress bar (FR-42). Cancel button (FR-43). |
| **Results Dashboard** | Summary cards (pass/fail/skip counts, compliance percentage) (FR-34). Collapsible conformance class sections with per-requirement results (FR-35, FR-36, FR-37). Request/response detail viewer (FR-32). |
| **Export Controls** | Download buttons for JSON and PDF export (FR-39, FR-40). Triggers backend export endpoints. |
| **API Client Service** | Thin wrapper around `fetch` for REST calls to the backend. Handles error responses, JSON parsing. |
| **SSE Client Service** | Wraps `EventSource`. Manages connection lifecycle, reconnection, and event parsing. Dispatches events to Progress View via React state/context. |
| **i18n String Store** | All user-facing strings externalized into a JSON locale file (NFR-15). v1.0 ships `en` only. |

---

## 3. Data Models

### 3.1 Assessment Session

```typescript
interface AssessmentSession {
  id: string;                          // UUID v4
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'partial';
  createdAt: string;                   // ISO 8601
  completedAt?: string;                // ISO 8601
  endpointUrl: string;                 // IUT landing page URL
  auth?: AuthConfig;                   // In-memory only, never persisted
  config: RunConfig;
  conformanceClasses: ConformanceClassSelection[];
  progress: AssessmentProgress;
  results?: AssessmentResults;
}

interface AuthConfig {
  type: 'bearer' | 'apikey' | 'basic';
  token?: string;                      // bearer
  headerName?: string;                 // apikey
  headerValue?: string;                // apikey
  username?: string;                   // basic
  password?: string;                   // basic
}

interface RunConfig {
  timeoutMs: number;                   // Default: 30000
  concurrency: number;                 // Default: 5, max: 10
}

interface ConformanceClassSelection {
  uri: string;                         // e.g. "http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system-features"
  name: string;                        // Human-readable name
  selected: boolean;
  destructive: boolean;                // true for CRUD/Update classes
  dependencies: string[];              // URIs of prerequisite classes
}
```

### 3.2 Test Result

```typescript
interface AssessmentResults {
  schemaVersion: 'v1';
  endpointUrl: string;
  assessmentId: string;
  timestamp: string;                   // ISO 8601
  disclaimer: string;
  summary: ResultSummary;
  classes: ConformanceClassResult[];
}

interface ResultSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  compliancePercentage: number;        // passed / (passed + failed) * 100
  durationMs: number;
}

interface ConformanceClassResult {
  uri: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
  tests: TestResult[];
  summary: { passed: number; failed: number; skipped: number };
}

interface TestResult {
  requirementId: string;               // e.g. "/req/system/canonical-url"
  requirementUri: string;              // Full URI
  testName: string;                    // Human-readable
  status: 'pass' | 'fail' | 'skip';
  failureReason?: string;             // Human-readable assertion message
  skipReason?: string;
  durationMs: number;
  httpExchanges: HttpExchange[];       // One or more req/res pairs
}

interface HttpExchange {
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;   // Credentials masked (FR-33)
    body?: string;
  };
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    responseTimeMs: number;
  };
}
```

### 3.3 SSE Event Types

```typescript
type SSEEvent =
  | { event: 'class-started';       data: { classUri: string; className: string } }
  | { event: 'test-started';        data: { classUri: string; requirementId: string; testName: string } }
  | { event: 'test-completed';      data: { classUri: string; requirementId: string; status: 'pass'|'fail'|'skip'; durationMs: number } }
  | { event: 'class-completed';     data: { classUri: string; status: 'pass'|'fail'|'skip'; summary: object } }
  | { event: 'progress';            data: { completedTests: number; totalTests: number; currentClass: string; currentTest: string } }
  | { event: 'assessment-completed'; data: { assessmentId: string; status: 'completed'|'partial' } }
  | { event: 'assessment-error';    data: { assessmentId: string; error: string } };
```

---

## 4. Data Flows

### 4.1 Assessment Creation

```
Browser                Frontend               Backend                    IUT
  |                       |                       |                       |
  |  1. Enter URL,        |                       |                       |
  |     click "Start"     |                       |                       |
  |---------------------> |                       |                       |
  |                       |  2. POST /api/assessments                     |
  |                       |     { endpointUrl,     |                       |
  |                       |       auth, config }   |                       |
  |                       |---------------------> |                       |
  |                       |                       |  3. SSRF Guard:       |
  |                       |                       |     validate URL,     |
  |                       |                       |     resolve DNS,      |
  |                       |                       |     block private IPs |
  |                       |                       |                       |
  |                       |                       |  4. GET / (landing)   |
  |                       |                       |---------------------> |
  |                       |                       | <--------------------  |
  |                       |                       |  5. GET /conformance  |
  |                       |                       |---------------------> |
  |                       |                       | <--------------------  |
  |                       |                       |                       |
  |                       |                       |  6. Conformance Mapper|
  |                       |                       |     maps URIs to      |
  |                       |                       |     requirement sets  |
  |                       |                       |                       |
  |                       |  7. Return { id,      |                       |
  |                       |     detectedClasses,  |                       |
  |                       |     status: "pending" }                       |
  |                       | <--------------------  |                       |
  |                       |                       |                       |
  |  8. Show Wizard       |                       |                       |
  |     Step 2: class     |                       |                       |
  |     selection         |                       |                       |
  | <-------------------  |                       |                       |
  |                       |                       |                       |
  |  9. Confirm classes,  |                       |                       |
  |     auth, config      |                       |                       |
  |---------------------> |                       |                       |
  |                       | 10. POST /api/assessments/:id/start           |
  |                       |     { selectedClasses, |                       |
  |                       |       auth, config }   |                       |
  |                       |---------------------> |                       |
  |                       |                       | 11. Session Manager   |
  |                       |                       |     checks capacity   |
  |                       |                       |     (< 5 sessions)    |
  |                       |  12. { status:        |                       |
  |                       |     "running" }        |                       |
  |                       | <--------------------  |                       |
  | 13. Redirect to       |                       |                       |
  |     Progress View     |                       |                       |
  | <-------------------  |                       |                       |
```

**Note on the two-phase creation flow:** The assessment is created in two steps: (1) POST to create and discover conformance classes, returning them to the UI; (2) POST to start execution with the user's selected classes and configuration. This allows the wizard to display discovered classes for user selection before tests begin.

### 4.2 Test Execution

```
Frontend               Backend (Test Runner)        IUT
  |                       |                           |
  |  1. Connect SSE       |                           |
  |  GET /api/assessments |                           |
  |      /:id/events      |                           |
  |---------------------> |                           |
  |  <-- SSE stream open  |                           |
  |                       |                           |
  |                       |  2. Resolve dependency    |
  |                       |     DAG: topological sort |
  |                       |     of selected classes   |
  |                       |                           |
  |  <-- class-started    |  3. For each class        |
  |                       |     (in dependency order):|
  |                       |                           |
  |  <-- test-started     |  4. For each test in class|
  |                       |     (with concurrency     |
  |                       |      semaphore):          |
  |                       |                           |
  |                       |  5. HTTP Client sends     |
  |                       |     request to IUT        |
  |                       |     (with auth headers)   |
  |                       |-------------------------> |
  |                       | <------------------------  |
  |                       |                           |
  |                       |  6. Validate response:    |
  |                       |     - Status code check   |
  |                       |     - Header checks       |
  |                       |     - Schema validation   |
  |                       |       (Ajv)               |
  |                       |     - Structural checks   |
  |                       |                           |
  |                       |  7. Record TestResult     |
  |                       |     + HttpExchange in     |
  |                       |     Result Store          |
  |                       |                           |
  |  <-- test-completed   |  8. Emit progress event   |
  |  <-- progress         |                           |
  |                       |                           |
  |                       |  [If class A fails and    |
  |                       |   class B depends on A:   |
  |                       |   skip all B tests with   |
  |                       |   reason "dependency      |
  |                       |   not met"]               |
  |                       |                           |
  |  <-- class-completed  |  9. Class summary event   |
  |                       |                           |
  |  <-- assessment-      | 10. All classes done,     |
  |      completed        |     final summary         |
  |                       |                           |
  |  SSE stream closes    |                           |
```

#### Concurrency Model

Within a single conformance class, individual tests execute concurrently up to the configured concurrency limit (default: 5). A counting semaphore (e.g., `p-limit` or custom `AsyncSemaphore`) gates concurrent HTTP requests. Between classes, execution is sequential according to the dependency DAG to ensure prerequisite classes complete before dependent ones begin.

```
Class execution order (sequential, topological sort):
  Common -> Features Core -> CS API Core -> System Features -> ...

Within a class (concurrent, bounded by semaphore):
  [test-1] [test-2] [test-3] [test-4] [test-5]  <-- 5 concurrent
            [test-6] [test-7] ...                <-- next batch as slots free
```

### 4.3 Result Retrieval

```
Browser                Frontend               Backend
  |                       |                       |
  |  1. Navigate to       |                       |
  |  /results/:id         |                       |
  |---------------------> |                       |
  |                       |  2. GET /api/          |
  |                       |  assessments/:id       |
  |                       |---------------------> |
  |                       |                       | 3. Result Store
  |                       |                       |    lookup by ID
  |                       |  4. { id, status,     |
  |                       |     results: {        |
  |                       |       summary, classes,|
  |                       |       tests[] } }      |
  |                       | <--------------------  |
  |                       |                       |
  |  5. Render Results    |                       |
  |     Dashboard         |                       |
  | <-------------------  |                       |
```

### 4.4 Report Export

```
Browser                Frontend               Backend
  |                       |                       |
  |  1. Click "Export      |                       |
  |     JSON" or "PDF"    |                       |
  |---------------------> |                       |
  |                       |  2. GET /api/          |
  |                       |  assessments/:id/      |
  |                       |  export?format=json    |
  |                       |  (or format=pdf)       |
  |                       |---------------------> |
  |                       |                       | 3. Export Engine
  |                       |                       |    reads from
  |                       |                       |    Result Store
  |                       |                       |
  |                       |                       | 4a. JSON: serialize
  |                       |                       |     AssessmentResults
  |                       |                       |     with credential
  |                       |                       |     masking
  |                       |                       |
  |                       |                       | 4b. PDF: render via
  |                       |                       |     PDFKit with
  |                       |                       |     summary tables,
  |                       |                       |     class breakdowns,
  |                       |                       |     failed test
  |                       |                       |     details
  |                       |                       |
  |                       |  5. Content-Disposition|
  |                       |     attachment         |
  |                       |     + file bytes       |
  |                       | <--------------------  |
  |                       |                       |
  |  6. Browser downloads |                       |
  |     file              |                       |
  | <-------------------  |                       |
```

---

## 5. API Contract Summary

| Method | Endpoint | Purpose | Request Body | Response |
|---|---|---|---|---|
| `POST` | `/api/assessments` | Create assessment, discover conformance | `{ endpointUrl, auth?, config? }` | `{ id, status, detectedClasses[] }` |
| `POST` | `/api/assessments/:id/start` | Start test execution | `{ selectedClasses[], auth?, config }` | `{ id, status: "running" }` |
| `GET` | `/api/assessments/:id` | Get assessment status and results | — | `{ id, status, progress, results? }` |
| `GET` | `/api/assessments/:id/events` | SSE progress stream | — | SSE event stream |
| `POST` | `/api/assessments/:id/cancel` | Cancel running assessment | — | `{ id, status: "cancelled" }` |
| `GET` | `/api/assessments/:id/export?format=json` | Export JSON report | — | `application/json` file download |
| `GET` | `/api/assessments/:id/export?format=pdf` | Export PDF report | — | `application/pdf` file download |
| `GET` | `/api/health` | Health check | — | `{ status: "ok" }` |

---

## 6. Deployment Topology

### 6.1 Container Architecture

```
+-------------------------------------------------------------+
|  Host Machine (Docker)                                       |
|                                                              |
|  docker-compose.yml                                          |
|                                                              |
|  +-------------------------------+                           |
|  |  csapi-app                    |                           |
|  |  (Node.js 20 LTS)            |                           |
|  |                               |                           |
|  |  Next.js serves both:        |                           |
|  |   - Frontend (SSR + static)  |                           |
|  |   - Backend API routes       |                           |
|  |     (via Next.js API routes  |                           |
|  |      or custom server)       |                           |
|  |                               |                           |
|  |  Port: 3000 (internal)       |                           |
|  |                               |                           |
|  |  Volumes:                    |                           |
|  |   - /app/tmp (result dumps)  |                           |
|  |                               |                           |
|  |  Environment:                |                           |
|  |   - NODE_ENV=production      |                           |
|  |   - MAX_SESSIONS=5           |                           |
|  |   - RESULT_TTL_HOURS=24      |                           |
|  |   - LOG_LEVEL=info           |                           |
|  +---------------+---------------+                           |
|                  |                                            |
|  +---------------v---------------+                           |
|  |  reverse-proxy (optional)     |                           |
|  |  (Caddy or nginx)            |                           |
|  |                               |                           |
|  |  - TLS termination           |                           |
|  |  - Port 443 -> 3000          |                           |
|  |  - Rate limiting             |                           |
|  |  - Request size limits       |                           |
|  +-------------------------------+                           |
|                                                              |
+-------------------------------------------------------------+
         |
         | Port 443 (HTTPS) / Port 80 (redirect)
         v
     Internet
```

### 6.2 Docker Compose Definition (Logical)

```yaml
# docker-compose.yml (structural overview)
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MAX_SESSIONS=5
      - RESULT_TTL_HOURS=24
      - LOG_LEVEL=info
    volumes:
      - result-data:/app/tmp
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Optional: TLS-terminating reverse proxy for production
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    depends_on:
      - app

volumes:
  result-data:
  caddy-data:
```

### 6.3 Dockerfile Strategy

```
# Multi-stage build
Stage 1: deps      — Install node_modules
Stage 2: builder   — Build Next.js (frontend + backend)
Stage 3: runner    — Minimal Node.js 20 alpine image, copy built artifacts

Final image size target: < 250 MB
```

### 6.4 Development Environment

```
# Local development (no Docker required)
npm run dev          # Next.js dev server with hot reload on port 3000
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint + Prettier
```

### 6.5 Networking

- The `app` container needs outbound HTTP/HTTPS access to reach IUT endpoints on the public internet.
- No inter-container networking is needed beyond the optional `app <-> caddy` link.
- No database container is required (in-memory store).
- DNS resolution for IUT hostnames happens inside the `app` container, which is where the SSRF guard operates.

---

## 7. Security Architecture

### 7.1 SSRF Protection (NFR-06)

The SSRF Guard module prevents the test engine from being used to probe internal networks:

1. **URL validation**: Only `http://` and `https://` schemes are accepted. No `file://`, `ftp://`, `data://`, etc.
2. **Private IP blocking**: Before making any HTTP request, the target hostname is resolved via DNS. The resolved IP is checked against blocked ranges:
   - `127.0.0.0/8` (loopback)
   - `10.0.0.0/8` (RFC 1918)
   - `172.16.0.0/12` (RFC 1918)
   - `192.168.0.0/16` (RFC 1918)
   - `169.254.0.0/16` (link-local)
   - `::1` (IPv6 loopback)
   - `fc00::/7` (IPv6 unique local)
   - `fe80::/10` (IPv6 link-local)
3. **DNS rebinding protection**: DNS resolution is performed by the SSRF Guard before the HTTP client connects. The resolved IP is pinned for the request to prevent TOCTOU attacks where DNS re-resolves to an internal address.
4. **Redirect following**: The SSRF Guard validates each redirect target before following it, applying the same IP checks.

### 7.2 Credential Handling (NFR-05)

- Credentials are accepted via the frontend wizard and transmitted to the backend over HTTPS (in production).
- The backend stores credentials only in the `AssessmentSession` object in memory. They are never written to disk, logs, or the result store.
- When the session completes or is evicted, credential references are nulled and garbage collected.
- In exported reports and UI displays, credential values are masked: only the first 4 and last 4 characters are shown (FR-33). Credentials shorter than 12 characters show only `****`.
- Log entries for assessment runs include the endpoint URL and timestamp but never include credential values (NFR-11).

### 7.3 Input Validation

- **URL**: Must be a valid HTTP(S) URL. Maximum length: 2048 characters. Validated against URL spec.
- **Auth config**: Type must be one of `bearer`, `apikey`, `basic`. String fields are sanitized (trimmed, length-limited).
- **Run config**: Timeout is clamped to 5000-120000 ms. Concurrency is clamped to 1-10.
- **Conformance class URIs**: Must match known conformance class URI patterns from the requirement registry.
- All inputs are validated server-side regardless of client-side validation.

### 7.4 Transport Security

- In production, all traffic between the browser and the application is encrypted via TLS (HTTPS), terminated at the reverse proxy (Caddy/nginx).
- The application sets security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy` (restrict script sources), `Strict-Transport-Security`.
- Cookies (if any, e.g., for session affinity) are set with `Secure`, `HttpOnly`, `SameSite=Strict`.

### 7.5 Rate Limiting

- The reverse proxy applies rate limiting: max 10 assessment creation requests per IP per minute.
- The Session Manager enforces a global cap of 5 concurrent running sessions (NFR-04). Requests that exceed this limit receive HTTP 429 with a `Retry-After` header.

---

## 8. Conformance Mapper & Test Registry Design

### 8.1 Requirement Registry

The Conformance Mapper loads a static requirement registry at startup. This registry is a TypeScript data structure (not a database) that defines:

```typescript
interface RequirementRegistry {
  conformanceClasses: ConformanceClassDefinition[];
}

interface ConformanceClassDefinition {
  uri: string;                    // Conformance class URI from the standard
  name: string;                   // Human-readable name
  standardRef: string;            // "OGC 23-001" | "OGC API Common" | "OGC API Features"
  destructive: boolean;           // Whether tests mutate IUT state
  dependencies: string[];         // URIs of prerequisite classes
  requirements: RequirementDefinition[];
}

interface RequirementDefinition {
  id: string;                     // e.g. "/req/system/canonical-url"
  uri: string;                    // Full requirement URI
  testName: string;               // Human-readable test description
  testFunction: string;           // Reference to the test implementation function
}
```

### 8.2 Dependency Graph (14 Part 1 Classes + Parent Standards)

```
OGC API Common Part 1
  |
  v
OGC API Features Part 1 Core
  |
  v
CS API Core (/req/core)
  |
  +---> System Features (/req/system)
  |       +---> Subsystems (/req/subsystem)
  |
  +---> Deployment Features (/req/deployment)
  |       +---> Subdeployments (/req/subdeployment)
  |
  +---> Procedure Features (/req/procedure)
  |
  +---> Sampling Features (/req/sampling)
  |
  +---> Property Definitions (/req/property)
  |
  +---> Advanced Filtering (/req/advanced-filtering)
  |
  +---> Create/Replace/Delete (/req/crud)  [destructive]
  |
  +---> Update (/req/update)  [destructive, depends on CRUD]
  |
  +---> GeoJSON Format (/req/geojson)
  |
  +---> SensorML Format (/req/sensorml)
```

The Test Runner performs a topological sort of this DAG. If a user selects a class whose dependency is not selected, the dependency is auto-included. If a dependency class fails critically (majority of tests fail), dependent classes are skipped.

### 8.3 Schema Source Strategy

OGC publishes OpenAPI definitions for CS API Part 1 on GitHub:
- `openapi-connectedsystems-1.yaml` (contains inline JSON schemas)

At build time, the application:
1. Fetches the OpenAPI YAML from the OGC GitHub repository (pinned to a specific commit/tag).
2. Extracts JSON Schema definitions from the OpenAPI `components/schemas` section.
3. Compiles them into standalone JSON Schema files and bundles them into the application image.
4. The Schema Validator loads these compiled schemas at startup and creates precompiled Ajv validators.

This approach avoids runtime dependency on GitHub availability and ensures consistent schema versions across deployments.

---

## 9. Error Handling & Resilience

### 9.1 Test-Level Resilience (NFR-10)

Each test execution is wrapped in a try/catch. Possible failure modes and handling:

| Failure Mode | Handling |
|---|---|
| Network timeout | Test fails with message "Request timed out after {n}ms for {method} {url}" |
| DNS resolution failure | Test fails with message "Could not resolve hostname {host}" |
| Connection refused | Test fails with message "Connection refused for {url}" |
| HTTP error (4xx/5xx) | Depends on test expectation — may be a valid fail or an unexpected error |
| Malformed response body | Test fails with message "Response body is not valid JSON" |
| Schema validation error | Test fails with Ajv validation error details |
| Unexpected exception | Test fails with message "Internal error: {error.message}"; logged as warning |

No single test failure crashes the assessment. The Test Runner catches all errors and records them as test failures.

### 9.2 Session-Level Resilience

- If the SSE connection drops, the frontend reconnects using `EventSource` retry (with `Last-Event-ID`). The backend tracks the last emitted event ID per session so reconnected clients receive missed events.
- If the backend process restarts, in-memory sessions are lost. The optional file-backed dump (written on completion) allows result retrieval for completed assessments. Running assessments are not recoverable and are marked as "partial" if the client reconnects.

### 9.3 Logging (NFR-11)

Structured JSON logging via a library like `pino`:

```json
{
  "level": "info",
  "timestamp": "2026-03-30T10:15:00.000Z",
  "assessmentId": "abc-123",
  "event": "assessment-started",
  "endpointUrl": "https://api.georobotix.io/ogc/t18/api",
  "selectedClasses": 14,
  "msg": "Assessment started"
}
```

Credentials are never included in log entries. Response bodies are not logged (they may be large and could contain sensitive data).

---

## 10. Architectural Decision Records

### ADR-001: Monorepo with Single Deployable Unit

- **Status**: Accepted
- **Date**: 2026-03-30
- **Context**: The application has a Next.js frontend and a Node.js backend. We need to decide whether to use separate repositories/packages or a single monorepo, and whether to deploy them as separate services or a single unit.
- **Decision**: Use a single repository with a single Next.js application that serves both the frontend (React pages) and the backend (API routes via Next.js Route Handlers or a custom Express server attached to Next.js). No monorepo tooling (Turborepo, Nx) is needed.
- **Rationale**:
  - The backend is tightly coupled to the frontend (same assessment IDs, SSE streams, export endpoints).
  - A single deployable unit simplifies Docker deployment (one container, one port).
  - Next.js API routes provide a natural backend layer; no separate server process is needed unless the test engine's long-running nature requires a custom server (see ADR-002).
  - Shared TypeScript types between frontend and backend reduce duplication and type drift.
  - The project is small enough (one team, one product) that monorepo tooling overhead is not justified.
- **Consequences**:
  - Frontend and backend scale together (acceptable given the 5-session concurrency target).
  - If the backend needs independent scaling in the future, it would require extracting to a separate service.
  - Shared `src/` directory with clear `src/app/` (frontend), `src/lib/` (shared), and `src/engine/` (backend test engine) boundaries.

### ADR-002: Custom Node.js Server for Long-Running Test Execution

- **Status**: Accepted
- **Date**: 2026-03-30
- **Context**: Next.js API routes (Route Handlers) are designed for request-response cycles and have execution time limits in some deployment environments. Test assessments can run for up to 5 minutes (NFR-03). SSE connections must remain open for the duration of the assessment. We need to decide whether standard Next.js API routes are sufficient or a custom server is needed.
- **Decision**: Use a custom Node.js HTTP server (Express or Fastify) that hosts both the Next.js frontend (via `next()` middleware) and the backend API routes. This gives full control over SSE connections, long-running requests, and server lifecycle.
- **Rationale**:
  - Next.js API routes in serverless/edge environments enforce execution time limits (typically 10-60 seconds) that are incompatible with 5-minute assessments.
  - SSE requires keeping an HTTP connection open indefinitely, which is better managed by a custom server than Next.js API routes.
  - A custom server allows us to use Node.js `EventEmitter` directly for SSE broadcasting without framework abstractions.
  - Even in a self-hosted Node.js environment, a custom server gives better control over graceful shutdown, health checks, and process management.
- **Consequences**:
  - Slightly more boilerplate than pure Next.js API routes.
  - Cannot deploy to Vercel/Netlify serverless (not a concern — Docker deployment is the target).
  - The custom server imports `next` and calls `app.prepare()` / `app.getRequestHandler()` to serve the frontend.

### ADR-003: Server-Sent Events (SSE) over WebSocket

- **Status**: Accepted
- **Date**: 2026-03-30
- **Context**: The frontend needs real-time progress updates during test execution. Options: Server-Sent Events (SSE) or WebSocket.
- **Decision**: Use Server-Sent Events (SSE) for streaming progress from the backend to the frontend.
- **Rationale**:
  - Progress streaming is unidirectional (server to client). SSE is purpose-built for this pattern.
  - SSE uses standard HTTP, works through HTTP/2, and is supported by all target browsers natively via `EventSource`.
  - SSE has built-in reconnection with `Last-Event-ID`, which simplifies handling of dropped connections.
  - WebSocket adds bidirectional complexity that is not needed. The only client-to-server action during execution is cancellation, which is handled by a separate REST endpoint (`POST /api/assessments/:id/cancel`).
  - SSE is simpler to implement, debug (plain text over HTTP), and proxy (no upgrade handshake).
  - No additional dependencies required (no `ws` or `socket.io` library needed).
- **Consequences**:
  - Limited to ~6 concurrent SSE connections per browser to the same domain (HTTP/1.1 limit). This is acceptable because a user will have at most 1-2 active assessment tabs. HTTP/2 multiplexing eliminates this limit entirely.
  - If bidirectional communication is needed in the future (e.g., interactive test stepping), we would need to add WebSocket alongside SSE.

### ADR-004: In-Memory Result Store with File-Backed Dump

- **Status**: Accepted
- **Date**: 2026-03-30
- **Context**: Assessment results must persist for 24 hours (FR-44) to allow users to return to results via URL. We need to decide the storage mechanism. Options: in-memory store, SQLite, Redis, filesystem-only.
- **Decision**: Use an in-memory `Map` as the primary store, with optional file-backed JSON dumps for completed assessments (crash recovery only). No persistent database.
- **Rationale**:
  - The data model is simple (assessments keyed by UUID) and the data volume is small (5 concurrent sessions, each ~1-5 MB of result data).
  - In-memory access is the fastest possible read/write path, meeting the performance NFRs.
  - A full database (SQLite, PostgreSQL, Redis) adds deployment complexity (additional container, migrations, connection management) that is disproportionate to the need.
  - The 24-hour TTL means data is inherently ephemeral. Loss of data on container restart is acceptable for v1.0 (assessments can be re-run).
  - File-backed JSON dumps (written to a Docker volume on assessment completion) provide crash recovery for completed results without database overhead. The server reads these on startup to repopulate the in-memory store.
  - Memory consumption is bounded: 5 sessions * ~5 MB = ~25 MB maximum active data, plus historical data that is evicted after 24 hours.
- **Consequences**:
  - Data is lost on container restart for running assessments (acceptable for v1.0).
  - Completed results survive restarts if file-backed dumps are enabled and the volume is persistent.
  - Horizontal scaling (multiple app instances) would require a shared store like Redis. This is not needed for v1.0 (single instance handles 5 concurrent sessions).
  - Memory usage grows linearly with stored results but is bounded by the 24-hour TTL eviction.

### ADR-005: Bundled OpenAPI Schemas at Build Time

- **Status**: Accepted
- **Date**: 2026-03-30
- **Context**: The test engine validates IUT responses against JSON schemas from the OGC CS API OpenAPI definitions. These schemas are published on GitHub. We need to decide how the application accesses them. Options: fetch at runtime from GitHub, bundle at build time, embed as code.
- **Decision**: Fetch the OpenAPI YAML from the OGC GitHub repository at build time (pinned to a specific commit SHA or release tag), extract the JSON Schema components, compile them into standalone `.json` files, and bundle them into the Docker image.
- **Rationale**:
  - Runtime fetching from GitHub would make the application dependent on GitHub availability and introduce a cold-start delay.
  - Bundling at build time ensures deterministic, reproducible test behavior — every deployment tests against the exact same schema version.
  - Pinning to a commit SHA or tag (not `master` branch HEAD) prevents unexpected schema changes from breaking tests.
  - Ajv can precompile bundled schemas at startup for maximum validation performance.
  - Schema updates require a new build, which is intentional — schema changes should be reviewed and tests adjusted accordingly.
- **Consequences**:
  - When OGC updates the OpenAPI definitions, the application must be rebuilt with the new schema version.
  - A build script (e.g., `scripts/fetch-schemas.ts`) is needed to automate the fetch-extract-compile pipeline.
  - The bundled schemas add ~1-2 MB to the Docker image (negligible).

### ADR-006: Test Execution Model — Concurrent Within Class, Sequential Across Classes

- **Status**: Accepted
- **Date**: 2026-03-30
- **Context**: The test engine must execute 103+ tests efficiently while respecting dependency ordering between conformance classes (FR-28). We need to decide the execution model.
- **Decision**: Execute conformance classes sequentially in dependency order (topological sort of the class DAG). Within each class, execute individual tests concurrently up to the configurable concurrency limit (default: 5).
- **Rationale**:
  - Sequential class execution is required by FR-28: if class A is a prerequisite for class B, all of A's tests must complete before B starts, so we can determine whether B should be skipped.
  - Within a class, tests are typically independent (each tests a different requirement against the IUT). Concurrent execution speeds up the assessment significantly (NFR-02: 10+ tests/second).
  - The configurable concurrency limit (default 5, max 10) prevents overwhelming the IUT with too many parallel requests, which could cause rate limiting or false failures.
  - A counting semaphore (`p-limit` or similar) provides a simple, proven mechanism for bounding concurrency.
  - This model is simple to reason about, debug, and test compared to fully parallel execution with complex dependency resolution.
- **Consequences**:
  - Total execution time is bounded by the sum of per-class times (sequential overhead). This is acceptable given the NFR-03 target of < 5 minutes for 103 tests.
  - If tests within a class have interdependencies (rare), they must be explicitly ordered. The test implementation can use `await` to serialize specific tests within the concurrent batch.
  - The concurrency limit is per-assessment. With 5 concurrent assessments, maximum outbound connections = 5 * 5 = 25. This is well within Node.js connection pool limits.

### ADR-007: PDFKit for PDF Report Generation

- **Status**: Accepted
- **Date**: 2026-03-30
- **Context**: The application must export compliance reports as PDF (FR-40). Options: PDFKit (programmatic PDF generation), Puppeteer (headless Chrome rendering of HTML to PDF), jsPDF (client-side).
- **Decision**: Use PDFKit for server-side PDF generation.
- **Rationale**:
  - PDFKit is a lightweight, pure-JavaScript PDF generation library with no external dependencies (no headless browser required).
  - Puppeteer requires a full Chromium installation (~400 MB), significantly increasing Docker image size and memory consumption.
  - The compliance report is structured data (tables, lists, text) that is straightforward to render programmatically with PDFKit. It does not require complex HTML/CSS layout.
  - PDFKit generates PDFs in a streaming fashion, which is memory-efficient for large reports.
  - Generation time with PDFKit is typically < 1 second for structured reports, well within the NFR-14 target of < 10 seconds.
- **Consequences**:
  - Complex visual layouts (charts, graphs) would be more difficult with PDFKit than with HTML-to-PDF. The compliance report does not require these in v1.0.
  - If the report design becomes visually complex in future versions, Puppeteer could be added as an alternative renderer.
  - The PDF layout must be coded programmatically (coordinates, fonts, tables), which is more work than styling HTML. A helper utility for table rendering is recommended.

---

## 11. Project Structure

```
csapi_compliance/
+-- _bmad/                          # BMAD project management artifacts
+-- docker-compose.yml              # Production deployment
+-- Dockerfile                      # Multi-stage build
+-- Caddyfile                       # Optional reverse proxy config
+-- package.json                    # Root package (Next.js + backend)
+-- tsconfig.json                   # TypeScript config
+-- next.config.js                  # Next.js configuration
+-- vitest.config.ts                # Vitest unit test config
+-- playwright.config.ts            # Playwright E2E test config
+-- scripts/
|   +-- fetch-schemas.ts            # Build-time OGC schema fetcher
|   +-- compile-schemas.ts          # JSON Schema extraction & compilation
+-- schemas/                        # Bundled OGC JSON Schemas (generated)
|   +-- connected-systems-1/
|   +-- ogc-api-common/
|   +-- ogc-api-features/
+-- src/
|   +-- app/                        # Next.js App Router (frontend pages)
|   |   +-- layout.tsx              # Root layout (App Shell)
|   |   +-- page.tsx                # Landing page (FR-45)
|   |   +-- assess/
|   |   |   +-- page.tsx            # Assessment Wizard
|   |   +-- progress/
|   |   |   +-- [id]/
|   |   |       +-- page.tsx        # Progress View
|   |   +-- results/
|   |       +-- [id]/
|   |           +-- page.tsx        # Results Dashboard
|   +-- components/                 # Shared React components
|   |   +-- ui/                     # shadcn/ui components
|   |   +-- assessment-wizard/      # Wizard step components
|   |   +-- progress/               # Progress display components
|   |   +-- results/                # Result display components
|   |   +-- export/                 # Export control components
|   +-- lib/                        # Shared utilities (frontend + backend)
|   |   +-- types.ts                # Shared TypeScript interfaces
|   |   +-- constants.ts            # Shared constants
|   |   +-- i18n/                   # Externalized strings (NFR-15)
|   |       +-- en.json
|   +-- services/                   # Frontend service layer
|   |   +-- api-client.ts           # REST API client
|   |   +-- sse-client.ts           # SSE EventSource wrapper
|   +-- server/                     # Custom Node.js server
|   |   +-- index.ts                # Server entry point
|   |   +-- routes/                 # Express/Fastify route handlers
|   |   |   +-- assessments.ts      # Assessment CRUD + export routes
|   |   |   +-- health.ts           # Health check
|   |   +-- middleware/
|   |       +-- ssrf-guard.ts       # SSRF protection middleware
|   |       +-- rate-limiter.ts     # Rate limiting
|   |       +-- security-headers.ts # Security header middleware
|   +-- engine/                     # Test engine (core backend logic)
|   |   +-- test-runner.ts          # Orchestrator: dependency order, concurrency
|   |   +-- conformance-mapper.ts   # URI -> requirement set mapping
|   |   +-- schema-validator.ts     # Ajv wrapper with preloaded schemas
|   |   +-- http-client.ts          # HTTP client with req/res capture
|   |   +-- result-store.ts         # In-memory store with TTL eviction
|   |   +-- sse-broadcaster.ts      # EventEmitter -> SSE bridge
|   |   +-- export-engine.ts        # JSON + PDF export
|   |   +-- session-manager.ts      # Session lifecycle, capacity enforcement
|   |   +-- credential-masker.ts    # Credential masking utility
|   |   +-- registry/               # Conformance class & requirement definitions
|   |   |   +-- index.ts            # Registry loader
|   |   |   +-- common.ts           # OGC API Common requirements
|   |   |   +-- features-core.ts    # OGC API Features Core requirements
|   |   |   +-- csapi-core.ts       # CS API Core requirements
|   |   |   +-- system-features.ts  # System Features requirements
|   |   |   +-- subsystems.ts       # Subsystems requirements
|   |   |   +-- deployments.ts      # Deployment Features requirements
|   |   |   +-- subdeployments.ts   # Subdeployments requirements
|   |   |   +-- procedures.ts       # Procedure Features requirements
|   |   |   +-- sampling.ts         # Sampling Features requirements
|   |   |   +-- properties.ts       # Property Definitions requirements
|   |   |   +-- filtering.ts        # Advanced Filtering requirements
|   |   |   +-- crud.ts             # Create/Replace/Delete requirements
|   |   |   +-- update.ts           # Update requirements
|   |   |   +-- geojson.ts          # GeoJSON Format requirements
|   |   |   +-- sensorml.ts         # SensorML Format requirements
|   |   +-- tests/                  # Test implementations (one file per class)
|   |       +-- common.test-impl.ts
|   |       +-- features-core.test-impl.ts
|   |       +-- csapi-core.test-impl.ts
|   |       +-- system-features.test-impl.ts
|   |       +-- ... (one per conformance class)
|   +-- __tests__/                  # Unit and integration tests
|       +-- engine/                 # Test engine unit tests
|       +-- server/                 # API route tests
|       +-- e2e/                    # Playwright E2E tests
+-- public/                         # Static assets
    +-- favicon.ico
```

---

## 12. Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Server runtime |
| Language | TypeScript | 5.x | Type safety across full stack |
| Frontend Framework | Next.js | 14.x (App Router) | SSR, routing, React framework |
| UI Library | React | 18.x | Component library |
| CSS | Tailwind CSS | 3.x | Utility-first styling |
| Component Library | shadcn/ui | latest | Accessible, composable UI components |
| HTTP Server | Express or Fastify | 4.x / 4.x | Custom server for long-running ops |
| HTTP Client | undici | 6.x | Outbound HTTP to IUT (fast, modern) |
| Schema Validation | Ajv | 8.x | JSON Schema validation |
| PDF Generation | PDFKit | 0.13.x+ | Server-side PDF export |
| Unit Testing | Vitest | 1.x | Fast TypeScript-native test runner |
| E2E Testing | Playwright | 1.x | Cross-browser E2E tests |
| Linting | ESLint + Prettier | latest | Code quality and formatting |
| Containerization | Docker + docker-compose | latest | Deployment packaging |
| Reverse Proxy (optional) | Caddy | 2.x | TLS termination, rate limiting |

---

## 13. Performance Considerations

| Concern | Design Decision |
|---|---|
| **Discovery latency (NFR-01)** | Landing page and conformance requests are made sequentially (2 requests). With a responsive IUT, this completes in < 2 seconds. The 15-second timeout is generous. |
| **Test throughput (NFR-02)** | With concurrency 5 and average IUT response time of 200ms, throughput is ~25 tests/second. Even with 500ms average response time, throughput is ~10 tests/second, meeting NFR-02. |
| **Full assessment time (NFR-03)** | 103 tests at 10 tests/second = ~10 seconds of pure execution time. Sequential class overhead (16 classes) adds at most 16 * 200ms = 3.2 seconds. Well within 5 minutes. |
| **Memory footprint** | 5 concurrent sessions * ~5 MB results = ~25 MB active. Plus historical results (up to 24h). With ~20 assessments/day, historical data is ~100 MB. Total memory footprint: < 200 MB. |
| **Export performance (NFR-14)** | PDFKit generates PDFs from structured data in < 1 second. JSON serialization of a 5 MB result object is < 100ms. Both are well within 10 seconds. |
| **SSE overhead** | SSE connections are lightweight (one HTTP connection per active assessment). 5 concurrent SSE streams add negligible overhead. |

---

## 14. Future Considerations (Out of Scope for v1.0)

These items are documented for architectural awareness but are not implemented in v1.0:

- **Part 2 (Dynamic Data) testing**: The test engine architecture (registry, runner, mapper) is designed to be extensible. Adding Part 2 requires new registry entries and test implementations but no architectural changes.
- **CI/CD API mode**: The REST API already supports headless operation. A CLI wrapper or GitHub Action could invoke the API without the frontend.
- **Historical comparison**: Would require persistent storage (SQLite or PostgreSQL) to store results beyond 24 hours. ADR-004 documents this trade-off.
- **Horizontal scaling**: Would require extracting the Result Store to Redis or a shared filesystem. The current in-memory architecture is intentionally simple for v1.0.
- **OAuth2 authentication**: Would require adding an OAuth2 flow in the Assessment Wizard and a token refresh mechanism in the HTTP Client.
- **Part 3 Pub/Sub testing**: Would require WebSocket and MQTT client capabilities in the test engine.
