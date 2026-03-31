# Endpoint Discovery — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Endpoint Discovery capability handles the first phase of an assessment: accepting a user-provided CS API landing page URL, validating it against SSRF rules, fetching the landing page and conformance declaration, and mapping declared conformance class URIs to testable requirement sets.

Four components collaborate to deliver this capability:

- **URL Input Form** (frontend) — A React component rendered on the Landing Page and as Step 1 of the Assessment Wizard. Performs client-side URL format validation (scheme, length) and submits the URL to the backend via `POST /api/assessments`.
- **Endpoint Discovery Service** (backend) — An Express/Fastify route handler that orchestrates the discovery flow: SSRF validation, landing page fetch, conformance fetch, and conformance mapping. Returns discovered classes to the frontend for user selection.
- **Landing Page Parser** (backend) — A pure function module that extracts `links` entries from an OGC landing page JSON response, identifying `conformance`, `service-desc` (OpenAPI), and collection links by their `rel` values.
- **Conformance Mapper** (backend) — Maps conformance class URIs returned by `/conformance` to the internal requirement registry. Determines which classes are testable, which are declared-but-unsupported, and builds the dependency graph for downstream use by the test engine.

```
  Browser                         Backend
  +---------------------+        +-----------------------------------------------+
  | URL Input Form      |        |  Assessment Controller                        |
  | (React component)   |  POST  |  POST /api/assessments                        |
  |                     +------->+  { endpointUrl, auth?, config? }              |
  | - scheme validation |        |       |                                        |
  | - length check      |        |       v                                        |
  | - submit button     |        |  +------------+     +-----------------------+  |
  +---------------------+        |  | SSRF Guard |     | Landing Page Parser   |  |
                                 |  | - DNS check|     | - extract links[]     |  |
                                 |  | - IP block |     | - find rel=conformance|  |
                                 |  +-----+------+     | - find rel=service-   |  |
                                 |        |            |   desc                |  |
                                 |        v            +----------+------------+  |
                                 |  +-----+------+                |               |
                                 |  | HTTP Client|---GET /------->+               |
                                 |  |            |---GET /conformance--->+        |
                                 |  +------------+                |     |         |
                                 |                                v     v         |
                                 |                     +--------------------+     |
                                 |                     | Conformance Mapper |     |
                                 |                     | - URI matching     |     |
                                 |                     | - dependency DAG   |     |
                                 |                     | - testable flag    |     |
                                 |                     +--------+-----------+     |
                                 |                              |                 |
                                 |        <---------------------+                 |
                                 |  Response: { id, status, detectedClasses[] }   |
                                 +-----------------------------------------------+
```

## Key Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| `POST /api/assessments` | REST API | Creates a new assessment session. Accepts `{ endpointUrl: string; auth?: AuthConfig; config?: Partial<RunConfig> }`. Returns `{ id: string; status: 'pending'; detectedClasses: ConformanceClassSelection[] }`. |
| `ConformanceMapper.mapFromDeclaration(uris: string[]): ConformanceClassSelection[]` | Class method | Accepts the array of conformance class URIs from the `/conformance` response and returns enriched selections with names, testability flags, destructive flags, and dependency URIs. |
| `LandingPageParser.parse(body: LandingPageResponse): ParsedLandingPage` | Pure function | Extracts structured link information from the OGC landing page JSON. Returns `{ conformanceUrl: string; apiDefinitionUrl?: string; collectionLinks: LinkEntry[] }`. |
| `SsrfGuard.validate(url: string): Promise<SsrfValidationResult>` | Class method | Resolves the hostname via DNS and checks the resolved IP against blocked ranges. Returns `{ allowed: boolean; resolvedIp: string; reason?: string }`. |
| `DiscoveryResult` | TypeScript type | `{ landingPage: LandingPageResponse; conformanceUris: string[]; detectedClasses: ConformanceClassSelection[]; apiDefinitionUrl?: string }` |
| `LandingPageResponse` | TypeScript type | `{ title?: string; description?: string; links: Array<{ href: string; rel: string; type?: string; title?: string }> }` |
| `ParsedLandingPage` | TypeScript type | `{ conformanceUrl: string; apiDefinitionUrl?: string; collectionLinks: Array<{ href: string; rel: string; title?: string }> }` |

## Configuration Schema

```json
{
  "ssrf": {
    "blockedCidrs": [
      "127.0.0.0/8",
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16",
      "169.254.0.0/16",
      "::1/128",
      "fc00::/7",
      "fe80::/10"
    ],
    "allowedSchemes": ["http", "https"],
    "maxUrlLength": 2048,
    "dnsResolutionTimeoutMs": 5000,
    "followRedirects": true,
    "maxRedirects": 5
  },
  "discovery": {
    "fetchTimeoutMs": 15000,
    "requiredLinkRels": ["conformance"],
    "optionalLinkRels": ["service-desc", "service-doc", "data"]
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| URL fails format validation (invalid scheme, too long) | HTTP 400: `{ error: "INVALID_URL", message: "URL must be a valid http or https URL under 2048 characters" }` | User corrects the URL and resubmits. |
| SSRF guard blocks URL (private IP resolved) | HTTP 400: `{ error: "SSRF_BLOCKED", message: "The provided URL resolves to a private or reserved IP address" }` | User provides a publicly routable URL. |
| DNS resolution fails for hostname | HTTP 400: `{ error: "DNS_FAILURE", message: "Could not resolve hostname: {host}" }` | User verifies the hostname is correct and the server is reachable. |
| Landing page fetch times out (>15s) | HTTP 504: `{ error: "DISCOVERY_TIMEOUT", message: "Landing page did not respond within 15 seconds" }` | User checks IUT availability or increases timeout. |
| Landing page returns non-200 status | HTTP 502: `{ error: "LANDING_PAGE_ERROR", message: "Landing page returned HTTP {status}" }` | User verifies the endpoint URL is correct. |
| Landing page response is not valid JSON | HTTP 502: `{ error: "INVALID_LANDING_PAGE", message: "Landing page response is not valid JSON" }` | User verifies the endpoint serves OGC-compliant JSON. |
| No conformance link found in landing page | HTTP 422: `{ error: "NO_CONFORMANCE_LINK", message: "Landing page does not contain a link with rel=conformance" }` | User checks that the endpoint is OGC API compliant. |
| Conformance endpoint returns non-200 status | HTTP 502: `{ error: "CONFORMANCE_ERROR", message: "Conformance endpoint returned HTTP {status}" }` | User verifies the endpoint implements /conformance. |
| No recognized conformance classes declared | HTTP 422: `{ error: "NO_TESTABLE_CLASSES", message: "None of the declared conformance classes are supported by this test engine" }` | Informational; user is told which classes were declared but unrecognized. |
| Max concurrent sessions reached (5) | HTTP 429: `{ error: "CAPACITY_EXCEEDED", message: "Maximum concurrent sessions reached", retryAfter: 60 }` | User retries after the indicated delay. |

## Dependencies

- **undici** ^6.0.0 — HTTP client for outbound requests to the IUT during discovery
- **Node.js dns/promises** (built-in) — DNS resolution for SSRF guard IP checking
- **ipaddr.js** ^2.0.0 — IP address parsing and CIDR range matching for SSRF validation
- **React** ^18.0.0 — URL input form component rendering
- **shadcn/ui** (latest) — Input, Button, Alert UI primitives for the URL form
- **zod** ^3.22.0 — Runtime input validation for the assessment creation request body
