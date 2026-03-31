# Request Capture — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Request Capture capability records every HTTP request and response made during test execution, masks sensitive credentials in captured data, and stores the exchanges for later retrieval in the results UI and exported reports. It provides full transparency into what the test engine actually sent to and received from the IUT.

Three components collaborate to deliver this capability:

- **CaptureMiddleware** — A wrapper layer around the HTTP client that intercepts every outbound request and inbound response. It records the full `HttpExchange` (method, URL, headers, body, status code, response headers, response body, response time) without modifying the request or response data. It handles edge cases like large bodies (truncation), binary content (detection and placeholder), and streaming responses (buffering).
- **CredentialMasker** — A pure utility module that scrubs sensitive values from captured HTTP exchanges before they are displayed in the UI or included in exported reports. It masks Bearer tokens, API keys, and Basic auth credentials by showing only the first 4 and last 4 characters of the credential value. Credentials shorter than 12 characters are fully replaced with `****`.
- **ExchangeStore** — A per-session store that holds captured `HttpExchange` objects keyed by test requirement ID. It is a sub-structure within the `ResultStore` and is populated by the CaptureMiddleware as tests execute. Each `TestResult` contains a reference to its associated exchanges.

```
  +---------------------------------------------------------------+
  |  Test Function                                                 |
  |  (e.g., testSystemCanonicalUrl)                               |
  |                                                                |
  |  calls httpClient.get("/collections/systems/{id}")             |
  +------------------------------+--------------------------------+
                                 |
                                 v
  +---------------------------------------------------------------+
  |  CaptureMiddleware (src/engine/capture-middleware.ts)          |
  |                                                                |
  |  wrap(httpClient: HttpClient): CaptureHttpClient               |
  |                                                                |
  |  +----------------------------------------------------------+ |
  |  | 1. Record request: method, url, headers, body            | |
  |  | 2. Start timer (performance.now())                       | |
  |  | 3. Delegate to underlying httpClient.request()           | |
  |  | 4. Record response: statusCode, headers, body, timing    | |
  |  | 5. Check body size -> truncate if > maxBodySize          | |
  |  | 6. Check content-type -> binary placeholder if non-text  | |
  |  | 7. Build HttpExchange object                             | |
  |  | 8. Push exchange to current test's exchange list          | |
  |  | 9. Return response to caller                             | |
  |  +----------------------------------------------------------+ |
  +------------------------------+--------------------------------+
                                 |
            +--------------------+--------------------+
            |                                         |
            v                                         v
  +---------+----------+               +--------------+-----------+
  | CredentialMasker   |               | ExchangeStore            |
  | (credential-       |               | (per-session storage)    |
  | masker.ts)         |               |                          |
  |                    |               | exchanges are stored     |
  | mask(exchange):    |               | within TestResult        |
  |   HttpExchange     |               | objects in the           |
  | (returns masked    |               | ResultStore              |
  |  copy)             |               |                          |
  | maskValue(str):    |               | getExchanges(            |
  |   string           |               |   requirementId): []     |
  +--------------------+               +--------------------------+
```

## Key Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| `CaptureMiddleware.wrap(httpClient: HttpClient): CaptureHttpClient` | Static factory | Wraps a raw HTTP client instance with capture logic. Returns a `CaptureHttpClient` that records all exchanges while delegating actual HTTP calls to the underlying client. |
| `CaptureHttpClient` | TypeScript interface | Extends `HttpClient` with `getExchanges(): HttpExchange[]` and `clearExchanges(): void`. All HTTP methods (`get`, `post`, `put`, `patch`, `delete`) automatically capture exchanges. |
| `HttpExchange` | TypeScript type | `{ id: string; timestamp: string; request: { method: string; url: string; headers: Record<string, string>; body?: string }; response: { statusCode: number; headers: Record<string, string>; body: string; responseTimeMs: number }; metadata: { truncated: boolean; binaryBody: boolean; bodySize: number } }` |
| `CredentialMasker.mask(exchange: HttpExchange, authConfig?: AuthConfig): HttpExchange` | Static method | Returns a deep copy of the exchange with sensitive header values masked. Detects `Authorization` (Bearer, Basic), custom API key headers (from `authConfig.headerName`), and cookie values. |
| `CredentialMasker.maskValue(value: string): string` | Static method | Masks a single credential string. If `value.length >= 12`, returns `value.slice(0, 4) + "****" + value.slice(-4)`. Otherwise returns `"****"`. |
| `CaptureOptions` | TypeScript type | `{ maxBodySizeBytes: number; detectBinary: boolean; includeTimestamp: boolean }` — Configuration for the capture middleware behavior. |

## Configuration Schema

```json
{
  "requestCapture": {
    "maxBodySizeBytes": 1048576,
    "truncationMarker": "... [truncated, original size: {size} bytes]",
    "detectBinary": true,
    "binaryPlaceholder": "[binary content, {size} bytes, content-type: {type}]",
    "binaryContentTypes": [
      "application/octet-stream",
      "image/",
      "audio/",
      "video/",
      "application/zip",
      "application/gzip"
    ],
    "maskedHeaders": [
      "authorization",
      "x-api-key",
      "cookie",
      "set-cookie"
    ],
    "maskMinLengthForPartial": 12,
    "maskVisibleChars": 4
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| Response body exceeds `maxBodySizeBytes` (1 MB default) | Body is truncated at the limit. `metadata.truncated` is set to `true`. A truncation marker is appended to the stored body string. The full body is still available to the test function (only the capture is truncated). | Schema validation uses the full response body from the HTTP client, not the truncated capture. No impact on test accuracy. |
| Response has binary content-type | Body is replaced with a placeholder string: `"[binary content, {size} bytes, content-type: {type}]"`. `metadata.binaryBody` is set to `true`. | Binary responses are not useful for JSON schema validation. The test function can still access the raw body via the underlying HTTP client. |
| Request or response body is not valid UTF-8 | Body is replaced with `"[non-UTF-8 content, {size} bytes]"`. | Prevents JSON serialization errors when storing or exporting exchanges. |
| CaptureMiddleware receives a network error (timeout, connection refused) | A partial `HttpExchange` is recorded with the request details and an error response: `{ statusCode: 0, headers: {}, body: "", responseTimeMs: elapsed }`. A `metadata.error` field is set to the error message. | The test function receives the original error. The capture preserves the request context for debugging. |
| CredentialMasker encounters an unrecognized auth header format | The header value is fully replaced with `"****"` (conservative masking). | No credential leakage risk. Overly aggressive masking is preferable to under-masking. |
| ExchangeStore exceeds memory budget for a single session | Not enforced at the store level; memory is bounded by the test count (~103 tests * ~2-3 exchanges each * ~50 KB average = ~15 MB per session). | The 5-session cap and 24-hour TTL provide natural memory bounds. |

## Dependencies

- **undici** ^6.0.0 — Underlying HTTP client that CaptureMiddleware wraps
- **Node.js perf_hooks** (built-in) — High-resolution timing via `performance.now()` for response time measurement
- **Node.js crypto** (built-in) — UUID generation for exchange IDs via `crypto.randomUUID()`
