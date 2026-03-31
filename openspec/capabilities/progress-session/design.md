# Progress & Session Management — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Progress & Session Management capability manages the lifecycle of assessment sessions, streams real-time progress events to the frontend via Server-Sent Events (SSE), tracks test execution progress, and persists completed results for later retrieval. It enforces capacity limits (max 5 concurrent sessions) and data retention policies (24-hour TTL).

Four components collaborate to deliver this capability:

- **SessionManager** — Manages the full assessment session lifecycle: creation, state transitions (`pending` -> `running` -> `completed`/`cancelled`/`partial`), and eviction. Enforces the concurrent session cap (max 5 running sessions, NFR-04). Assigns UUID v4 identifiers to each session. Tracks session state and metadata (created timestamp, endpoint URL, configuration). Delegates storage to the ResultStore.
- **SSEBroadcaster** — Bridges the Test Runner's `EventEmitter` progress events to Server-Sent Event streams connected by frontend clients. Manages per-session SSE connections (one or more clients per session). Handles client disconnect gracefully. Supports reconnection via `Last-Event-ID` so clients that briefly disconnect receive missed events. Assigns sequential event IDs for ordering.
- **ProgressTracker** — A lightweight state object per session that tracks: total test count, completed test count, current conformance class name, current test name, and per-class completion counts. Updated by the Test Runner as tests complete. Queried by both the SSE Broadcaster (for `progress` events) and the REST API (`GET /api/assessments/:id` returns progress in the response body).
- **ResultStore** — An in-memory `Map<string, AssessmentSession>` keyed by assessment UUID. Stores full session state including configuration, progress, and results (with HTTP exchanges). Runs a periodic cleanup timer (every 15 minutes) to evict entries older than the configured TTL (default 24 hours). Optionally writes completed results to a JSON file on a Docker volume (`/app/tmp/{id}.json`) for crash recovery. On server startup, reads any existing dump files to repopulate the in-memory store.

```
  Browser                       Backend
  +-----------------------+     +----------------------------------------------+
  | Progress View         |     | SessionManager (src/engine/session-manager.ts)|
  | (React component)     |     |                                              |
  |                       |     | create(opts): AssessmentSession               |
  | SSE EventSource  ---------->| get(id): AssessmentSession | null            |
  | GET /assessments/     |     | cancel(id): void                             |
  |   :id/events          |     | listActive(): AssessmentSession[]            |
  |                       |     | evictExpired(): void                         |
  | Progress bar          |     |                                              |
  | Current class         |     |     +-----------+     +------------------+   |
  | Current test          |     |     | capacity  |     | state machine    |   |
  | Completed / Total     |     |     | check:    |     | pending ->       |   |
  | Cancel button  ------------>|     | <= 5      |     |   running ->     |   |
  | POST :id/cancel       |     |     | running   |     |   completed /    |   |
  +-----------------------+     |     +-----------+     |   cancelled /    |   |
                                |                       |   partial        |   |
                                +---+------------------+--+----------------+---+
                                    |                  |
                                    v                  v
  +-------------------------------+-+  +--------------+---------------+
  | SSEBroadcaster                  |  | ResultStore                   |
  | (src/engine/sse-broadcaster.ts) |  | (src/engine/result-store.ts)  |
  |                                 |  |                               |
  | addClient(id, res): void        |  | set(id, session): void        |
  | removeClient(id, res): void     |  | get(id): AssessmentSession    |
  | broadcast(id, event): void      |  | delete(id): void              |
  | getLastEventId(id): number      |  | has(id): boolean              |
  |                                 |  | evictOlderThan(ttlMs): number |
  | Event types:                    |  | dumpToFile(id): void          |
  | - class-started                 |  | loadFromDumps(): void         |
  | - test-started                  |  |                               |
  | - test-completed                |  | Storage: Map<string,          |
  | - class-completed               |  |   AssessmentSession>          |
  | - progress                      |  |                               |
  | - assessment-completed          |  | Cleanup: setInterval(         |
  | - assessment-error              |  |   evictOlderThan, 15min)      |
  +----------------+----------------+  +-----+----------+--------------+
                   |                         |          |
                   | SSE stream              | read     | write
                   v                         v          v
            Browser EventSource       In-memory Map   /app/tmp/{id}.json
                                                       (Docker volume)
```

### ProgressTracker Detail

```
  +---------------------------------------------------------------+
  | ProgressTracker (per-session state)                            |
  |                                                                |
  | Fields:                                                        |
  |   totalTests: number          (set at start, from DAG count)   |
  |   completedTests: number      (incremented per test-completed) |
  |   currentClassName: string    (updated on class-started)       |
  |   currentTestName: string     (updated on test-started)        |
  |   classProgress: Map<string, { passed, failed, skipped }>      |
  |   startedAt: number           (Date.now() at run start)        |
  |   elapsedMs: number           (computed on read)               |
  |                                                                |
  | Methods:                                                       |
  |   onTestStarted(classUri, testName): void                      |
  |   onTestCompleted(classUri, status): void                      |
  |   onClassStarted(classUri, className): void                    |
  |   onClassCompleted(classUri): void                             |
  |   getSnapshot(): ProgressSnapshot                              |
  +---------------------------------------------------------------+
```

## Key Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| `SessionManager.create(opts: CreateSessionOpts): Promise<AssessmentSession>` | Class method | Creates a new assessment session. Checks capacity (rejects with HTTP 429 if >= 5 running sessions). Assigns a UUID v4 `id`, sets status to `'pending'`, stores in ResultStore. Returns the session object. |
| `SessionManager.get(id: string): AssessmentSession \| null` | Class method | Retrieves a session by ID from the ResultStore. Returns `null` if not found or expired. |
| `SessionManager.cancel(id: string): void` | Class method | Sets the session status to `'cancelled'`, triggers the `CancelToken` on the associated TestRunner, and broadcasts an `assessment-completed` event with status `'partial'`. |
| `SessionManager.start(id: string, opts: StartSessionOpts): Promise<void>` | Class method | Transitions the session from `'pending'` to `'running'`, initializes the ProgressTracker, starts the TestRunner, and begins broadcasting progress events. |
| `GET /api/assessments/:id/events` | SSE endpoint | Establishes an SSE connection for the given assessment. Sends `Content-Type: text/event-stream`. Each event includes an `id` field (sequential integer) and an `event` field (event type name). Supports `Last-Event-ID` header for reconnection replay. Connection closes when assessment completes or client disconnects. |
| `POST /api/assessments/:id/cancel` | REST API | Cancels a running assessment. Returns `{ id: string; status: 'cancelled' }`. Returns HTTP 404 if session not found, HTTP 409 if session is not in `'running'` state. |
| `SSEBroadcaster.addClient(sessionId: string, res: ServerResponse): void` | Class method | Registers an HTTP response object as an SSE client for the given session. Sets appropriate SSE headers (`Content-Type`, `Cache-Control`, `Connection`). If the client provides `Last-Event-ID`, replays missed events. |
| `SSEBroadcaster.broadcast(sessionId: string, event: SSEEvent): void` | Class method | Sends an SSE event to all connected clients for the given session. Increments the event ID counter. Serializes the event data as JSON. |
| `ProgressSnapshot` | TypeScript type | `{ totalTests: number; completedTests: number; currentClassName: string; currentTestName: string; percentComplete: number; elapsedMs: number; classProgress: Record<string, { passed: number; failed: number; skipped: number }> }` |
| `CreateSessionOpts` | TypeScript type | `{ endpointUrl: string; auth?: AuthConfig; config?: Partial<RunConfig> }` |
| `StartSessionOpts` | TypeScript type | `{ selectedClasses: string[]; auth?: AuthConfig; config: RunConfig }` |
| `SSEEvent` | TypeScript type (union) | See architecture.md section 3.3 for the full union type. Includes `class-started`, `test-started`, `test-completed`, `class-completed`, `progress`, `assessment-completed`, and `assessment-error` event types. |
| `ResultStore.evictOlderThan(ttlMs: number): number` | Class method | Removes all sessions older than `ttlMs` from the in-memory map. Returns the count of evicted sessions. Called by the periodic cleanup timer. |
| `ResultStore.dumpToFile(id: string): Promise<void>` | Class method | Writes the completed session's results to `/app/tmp/{id}.json` for crash recovery. Excludes `AuthConfig` from the dump (credentials are never persisted). |
| `ResultStore.loadFromDumps(): Promise<number>` | Class method | On server startup, reads all `*.json` files from `/app/tmp/`, parses them, and repopulates the in-memory map for sessions within the TTL window. Returns the count of restored sessions. |

## Configuration Schema

```json
{
  "session": {
    "maxConcurrentSessions": 5,
    "resultTtlHours": 24,
    "evictionIntervalMinutes": 15,
    "dumpPath": "/app/tmp",
    "enableFileDump": true,
    "sessionIdFormat": "uuidv4"
  },
  "sse": {
    "keepAliveIntervalMs": 15000,
    "keepAliveComment": ":keepalive",
    "retryMs": 3000,
    "maxReplayEvents": 1000,
    "headers": {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  },
  "progress": {
    "emitIntervalMs": 250,
    "includeElapsedTime": true
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| Max concurrent sessions exceeded (>= 5 running) | HTTP 429: `{ error: "CAPACITY_EXCEEDED", message: "Maximum of 5 concurrent sessions reached. Please try again later.", retryAfter: 60 }`. `Retry-After: 60` header set. | User waits for an active session to complete and retries. |
| Session ID not found on GET/cancel/events request | HTTP 404: `{ error: "NOT_FOUND", message: "Assessment {id} not found or has expired" }` | User checks the URL or starts a new assessment. |
| Cancel requested on a non-running session | HTTP 409: `{ error: "INVALID_STATE", message: "Assessment is not running (current status: {status})" }` | No action needed. The assessment has already reached a terminal state. |
| SSE client disconnects mid-stream | `SSEBroadcaster` detects the `close` event on the response object and removes the client from the session's client list. No error logged (normal behavior). | If the client reconnects with `Last-Event-ID`, missed events are replayed from the in-memory event buffer. |
| SSE reconnection with stale `Last-Event-ID` (events evicted from buffer) | The broadcaster sends all available events from the current buffer. A `warning` comment is sent: `:some events may have been missed`. | The client can fall back to polling `GET /api/assessments/:id` for the current state. |
| File dump write fails (disk full, permission error) | Error logged as a warning. In-memory store is unaffected. The session is still available until TTL eviction. | Operator monitors disk space on the Docker volume. File dumps are optional; the system continues without them. |
| Server restarts while sessions are running | Running sessions are lost. On startup, `ResultStore.loadFromDumps()` restores completed sessions from the file-backed dumps on the Docker volume. Running sessions are not recoverable. | Users with running sessions see a "not found" error and must start a new assessment. Completed results are preserved if file dumps were written. |
| Event buffer grows excessively (very long assessment) | The event buffer is capped at `maxReplayEvents` (1000). Older events beyond the cap are discarded. | Reconnecting clients that missed more than 1000 events fall back to polling the REST API. |

## Dependencies

- **Node.js http** (built-in) — `ServerResponse` for SSE streaming
- **Node.js crypto** (built-in) — `crypto.randomUUID()` for session ID generation
- **Node.js fs/promises** (built-in) — File-backed dump read/write operations
- **Node.js events** (built-in) — `EventEmitter` for internal progress event routing from TestRunner to SSEBroadcaster
- **pino** ^8.0.0 — Structured logging for session lifecycle events (creation, completion, eviction, errors)
