# Test Engine — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Test Engine capability is the orchestration core of the assessment system. It resolves conformance class dependencies into an execution order, runs tests with bounded concurrency, validates responses against OGC JSON schemas, captures all HTTP traffic, and emits real-time progress events. The engine is designed for resilience: no single test failure can crash the assessment run.

Five components collaborate to deliver this capability:

- **TestRunner** (orchestrator) — The top-level entry point for executing an assessment. Accepts a list of selected conformance classes, resolves their dependency order via the DependencyResolver, iterates through classes sequentially, and dispatches individual tests within each class concurrently (bounded by ConcurrencyController). Emits progress events to the SSE Broadcaster. Handles cancellation signals.
- **DependencyResolver** (DAG) — Builds a directed acyclic graph of conformance class dependencies and produces a topological sort. Detects cycles (configuration error). Auto-includes transitive dependencies that the user did not explicitly select. Determines whether a dependent class should be skipped when its prerequisite fails.
- **SchemaValidator** (Ajv wrapper) — Manages a pool of precompiled Ajv validators loaded from the bundled OGC JSON schema files at startup. Exposes a `validate(schemaRef, data)` method that returns structured validation errors. Supports `$ref` resolution across schema files.
- **HttpClient** (with capture) — Wraps `undici` with interceptors that record every request and response as an `HttpExchange` object. Applies user-provided authentication headers. Enforces the configurable timeout. Delegates pre-request URL validation to the SSRF Guard.
- **ConcurrencyController** — A counting semaphore that limits the number of concurrent HTTP requests within a single conformance class to the configured maximum (default 5, max 10). Implemented as an async semaphore using `p-limit` or a custom `AsyncSemaphore`.

```
  +---------------------------------------------------------------+
  |  TestRunner (src/engine/test-runner.ts)                       |
  |                                                                |
  |  run(session: AssessmentSession): Promise<AssessmentResults>   |
  |    |                                                           |
  |    +-- 1. DependencyResolver.resolve(selectedClasses)          |
  |    |       -> orderedClasses: ConformanceClassDefinition[]     |
  |    |                                                           |
  |    +-- 2. For each class (sequential):                         |
  |    |   |                                                       |
  |    |   +-- a. Check: did prerequisite class pass?              |
  |    |   |       NO -> skip all tests, reason="dependency        |
  |    |   |              not met: {prereq}"                       |
  |    |   |       YES -> proceed                                  |
  |    |   |                                                       |
  |    |   +-- b. TestFactory.createTestSuite(classUri, ctx)       |
  |    |   |       -> ExecutableTest[]                              |
  |    |   |                                                       |
  |    |   +-- c. ConcurrencyController.runAll(tests)              |
  |    |   |       -> TestResult[]                                  |
  |    |   |       (each test runs inside semaphore gate)           |
  |    |   |                                                       |
  |    |   +-- d. Emit class-completed event                       |
  |    |   +-- e. Store class results in ResultStore               |
  |    |                                                           |
  |    +-- 3. Compute summary, emit assessment-completed           |
  |    +-- 4. Return AssessmentResults                             |
  |                                                                |
  +----------+----------------+----------------+-------------------+
             |                |                |
             v                v                v
  +----------+--+  +----------+--+  +----------+--+
  | Dependency  |  | Schema      |  | Concurrency |
  | Resolver    |  | Validator   |  | Controller  |
  |             |  |             |  |             |
  | resolve()   |  | validate()  |  | runAll()    |
  | topoSort()  |  | addSchema() |  | acquire()   |
  | autoInclude |  | getErrors() |  | release()   |
  +-------------+  +------+------+  +------+------+
                          |                |
                          |                v
                   Bundled JSON     +------+------+
                   Schemas          | HTTP Client  |
                   (schemas/)       | (with        |
                                   | capture)     |
                                   |              |
                                   | request()    |
                                   | get/post/    |
                                   | put/patch/   |
                                   | delete()     |
                                   +------+-------+
                                          |
                                          v
                                   SSRF Guard -> IUT
```

## Key Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| `TestRunner.run(session: AssessmentSession): Promise<AssessmentResults>` | Class method | Main entry point. Executes the full assessment for a session. Resolves dependencies, iterates classes, runs tests concurrently within each class, emits progress events, and returns the aggregated results. Respects cancellation via `session.cancelToken`. |
| `TestRunner.onProgress(listener: (event: ProgressEvent) => void): void` | Event subscription | Registers a listener for progress events (`test-started`, `test-completed`, `class-started`, `class-completed`, `progress`). Used by the SSE Broadcaster to stream events to the client. |
| `DependencyResolver.resolve(selected: string[], registry: TestRegistry): ResolvedPlan` | Static method | Accepts selected class URIs and the full registry. Returns `ResolvedPlan: { orderedClasses: ConformanceClassDefinition[]; autoIncluded: string[] }`. Performs topological sort and auto-includes missing dependencies. Throws `CyclicDependencyError` if the graph contains cycles. |
| `DependencyGraph` | TypeScript type | `{ nodes: Map<string, DependencyNode>; edges: Map<string, string[]> }` where `DependencyNode = { uri: string; name: string; inDegree: number }`. Internal representation used by `DependencyResolver`. |
| `SchemaValidator.validate(schemaRef: string, data: unknown): ValidationResult` | Class method | Validates `data` against the precompiled schema identified by `schemaRef` (e.g., `"SystemFeature"`, `"CollectionInfo"`). Returns `{ valid: boolean; errors: SchemaError[] }`. |
| `SchemaValidator.addSchema(id: string, schema: object): void` | Class method | Registers a new JSON schema with the Ajv instance. Called at startup for each bundled schema file. |
| `SchemaError` | TypeScript type | `{ path: string; message: string; keyword: string; params: Record<string, unknown> }` — Structured validation error from Ajv. |
| `CaptureHttpClient.request(opts: RequestOptions): Promise<CapturedResponse>` | Class method | Sends an HTTP request to the IUT. Returns the response along with the captured `HttpExchange`. Applies auth headers, enforces timeout, and delegates URL validation to the SSRF Guard. |
| `RequestOptions` | TypeScript type | `{ method: string; url: string; headers?: Record<string, string>; body?: string \| object; timeoutMs?: number }` |
| `CapturedResponse` | TypeScript type | `{ statusCode: number; headers: Record<string, string>; body: string; responseTimeMs: number; exchange: HttpExchange }` |
| `ConcurrencyController.runAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]>` | Class method | Executes an array of async tasks with bounded concurrency. Returns results in the original task order. |
| `ConcurrencyController.cancel(): void` | Class method | Signals cancellation. Pending tasks that have not yet acquired a semaphore slot are rejected with `CancellationError`. In-flight tasks complete but their results are still recorded. |
| `ResolvedPlan` | TypeScript type | `{ orderedClasses: ConformanceClassDefinition[]; autoIncluded: string[] }` |
| `CancelToken` | TypeScript type | `{ cancelled: boolean; onCancel(fn: () => void): void; cancel(): void }` — A cooperative cancellation primitive checked between test executions. |

## Configuration Schema

```json
{
  "testEngine": {
    "defaultTimeoutMs": 30000,
    "minTimeoutMs": 5000,
    "maxTimeoutMs": 120000,
    "defaultConcurrency": 5,
    "maxConcurrency": 10,
    "paginationMaxPages": 5,
    "paginationDefaultLimit": 10,
    "schemaBasePath": "schemas/",
    "retryOnNetworkError": false,
    "maxResponseBodySizeBytes": 5242880,
    "progressEmitIntervalMs": 250
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| Network timeout on a test request | Test result: `fail`, message: `"Request timed out after {n}ms for {method} {url}"` | No cascading failure. Next test proceeds. User can increase timeout in run config. |
| DNS resolution failure | Test result: `fail`, message: `"Could not resolve hostname {host}"` | No cascading failure. User verifies the endpoint hostname. |
| Connection refused | Test result: `fail`, message: `"Connection refused for {url}"` | No cascading failure. User checks IUT availability. |
| Malformed JSON response body | Test result: `fail`, message: `"Response body is not valid JSON"` | No cascading failure. Test records the raw body in the HttpExchange. |
| JSON schema validation failure | Test result: `fail`, message: `"Schema validation failed: {details}"` with Ajv error paths | No cascading failure. Detailed errors help the user identify the non-compliant fields. |
| Prerequisite conformance class failed | All tests in the dependent class: `skip`, reason: `"Dependency not met: {prereqClassName} failed"` | User fixes the prerequisite issues first. The dependency chain is shown in the results. |
| Cyclic dependency detected in class graph | `CyclicDependencyError` thrown during `DependencyResolver.resolve()`. Assessment fails to start with HTTP 500. | Configuration error in the requirement registry. Developer must fix the cycle. |
| User cancels assessment mid-run | `CancelToken.cancel()` is invoked. In-flight tests complete; pending tests are not started. Assessment status set to `"cancelled"`. Results collected so far are returned marked as `"partial"`. | User can view partial results or start a new assessment. |
| Unexpected exception in test function | Test result: `fail`, message: `"Internal error: {error.message}"`. Error is logged as a warning. | No cascading failure. Indicates a bug in the test implementation. |
| Response body exceeds max size (5 MB) | Body is truncated in the `HttpExchange` capture. Test proceeds with truncated body; schema validation may fail. | The truncation is noted in the exchange metadata. |

## Dependencies

- **undici** ^6.0.0 — HTTP client for outbound requests to the IUT
- **Ajv** ^8.12.0 — JSON Schema validation engine
- **ajv-formats** ^2.1.0 — Additional format validators for Ajv (uri, date-time, email, etc.)
- **p-limit** ^5.0.0 — Concurrency limiter for the ConcurrencyController (or custom AsyncSemaphore)
- **ipaddr.js** ^2.0.0 — IP address parsing for SSRF Guard integration
- **pino** ^8.0.0 — Structured logging for test execution events and errors
- **OGC JSON Schemas** (bundled) — Precompiled from OGC OpenAPI definitions at build time
