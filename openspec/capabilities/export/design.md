# Export — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Export capability generates downloadable compliance reports in JSON and PDF formats from completed assessment results. JSON reports use a versioned schema (v1) for programmatic consumption by downstream tools. PDF reports render a human-readable document with summary tables, per-class breakdowns, and failed-test details with request/response excerpts. Both formats mask credentials before export.

Three components collaborate to deliver this capability:

- **JsonExporter** — Serializes the `AssessmentResults` object into a JSON document that conforms to the versioned export schema (v1). Applies credential masking to all `HttpExchange` entries via `CredentialMasker`. Adds metadata fields (export timestamp, schema version, tool version). Streams the JSON output for memory-efficient handling of large reports.
- **PdfExporter** — Renders a structured PDF report using PDFKit. The report contains: title page with endpoint URL and assessment timestamp, summary table (total/pass/fail/skip/percentage), per-conformance-class sections with pass/fail badges, and detailed sections for failed tests including failure reasons and request/response excerpts. Credentials are masked. Streams the PDF output directly to the HTTP response.
- **ExportController** — An Express/Fastify route handler for `GET /api/assessments/:id/export`. Validates the `format` query parameter (`json` or `pdf`), retrieves the assessment from the ResultStore, delegates to the appropriate exporter, and streams the file to the client with correct `Content-Type` and `Content-Disposition` headers.

```
  Browser                    Backend
  +--------------------+     +--------------------------------------------+
  | Export Controls     |     | ExportController                           |
  | [Download JSON]  ------>  | GET /api/assessments/:id/export?format=json|
  | [Download PDF]   ------>  | GET /api/assessments/:id/export?format=pdf |
  +--------------------+     +-----+----------------+---------------------+
                                   |                |
                                   v                v
                        +----------+---+  +---------+----+
                        | JsonExporter |  | PdfExporter  |
                        |              |  |              |
                        | serialize()  |  | render()     |
                        | - schema v1  |  | - PDFKit     |
                        | - credential |  | - title page |
                        |   masking    |  | - summary    |
                        | - metadata   |  |   table      |
                        | - streaming  |  | - class      |
                        |   output     |  |   sections   |
                        +------+-------+  | - failed     |
                               |          |   test detail|
                               |          | - credential |
                               |          |   masking    |
                               |          | - streaming  |
                               |          |   output     |
                               |          +------+-------+
                               |                 |
                               v                 v
                        +------+-----------------+-------+
                        | CredentialMasker               |
                        | (from request-capture          |
                        |  capability)                   |
                        +--------------------------------+
                               |                 |
                               v                 v
                        Content-Disposition: attachment
                        application/json    application/pdf
```

## Key Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| `GET /api/assessments/:id/export?format=json\|pdf` | REST API | Downloads the compliance report in the requested format. Returns `Content-Type: application/json` or `Content-Type: application/pdf` with `Content-Disposition: attachment; filename="csapi-compliance-{id}.{ext}"`. Returns HTTP 404 if assessment not found, HTTP 400 if format is invalid, HTTP 409 if assessment is still running. |
| `JsonExporter.serialize(results: AssessmentResults, authConfig?: AuthConfig): Readable` | Class method | Serializes assessment results into a JSON stream conforming to the v1 export schema. All credential values in HTTP exchanges are masked. Returns a `Readable` stream for pipe-based output. |
| `PdfExporter.render(results: AssessmentResults, aggregated: AggregatedResults, authConfig?: AuthConfig): PDFDocument` | Class method | Renders a PDF report using PDFKit. Returns a `PDFDocument` stream that can be piped to the HTTP response. Applies credential masking. |
| `ExportSchema_v1` | TypeScript type | The top-level structure of the JSON export: `{ schemaVersion: 'v1'; exportedAt: string; toolVersion: string; endpointUrl: string; assessmentId: string; timestamp: string; disclaimer: string; summary: ResultSummary; conformanceClasses: ConformanceClassResult[] }` |
| `ExportController.handleExport(req: Request, res: Response): Promise<void>` | Route handler | Validates the request, retrieves results from the ResultStore, selects the exporter based on `format`, and streams the output to the response. |
| `PdfReportLayout` | TypeScript type | `{ pageSize: 'A4'; margins: { top: number; bottom: number; left: number; right: number }; fonts: { title: string; heading: string; body: string; mono: string }; maxExchangeBodyLength: number }` — Configuration for PDF layout. |

## Configuration Schema

```json
{
  "export": {
    "json": {
      "schemaVersion": "v1",
      "prettyPrint": true,
      "indentSpaces": 2,
      "includeHttpExchanges": true,
      "maxExchangeBodyLength": 10000
    },
    "pdf": {
      "pageSize": "A4",
      "margins": {
        "top": 50,
        "bottom": 50,
        "left": 50,
        "right": 50
      },
      "fonts": {
        "title": "Helvetica-Bold",
        "heading": "Helvetica-Bold",
        "body": "Helvetica",
        "mono": "Courier"
      },
      "maxExchangeBodyLength": 2000,
      "includePassedTestDetails": false,
      "includeSkippedTestDetails": false,
      "includeFailedTestDetails": true,
      "includeHttpExchangesInPdf": true
    },
    "filenameTemplate": "csapi-compliance-{assessmentId}.{format}",
    "toolVersion": "1.0.0"
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| Assessment ID not found in ResultStore | HTTP 404: `{ error: "NOT_FOUND", message: "Assessment {id} not found or has expired" }` | User navigates back and starts a new assessment. |
| Assessment is still running (status: "running") | HTTP 409: `{ error: "NOT_READY", message: "Assessment is still running. Export is available after completion." }` | User waits for the assessment to complete or cancels it first. |
| Invalid format parameter (not "json" or "pdf") | HTTP 400: `{ error: "INVALID_FORMAT", message: "Export format must be 'json' or 'pdf'" }` | User corrects the format parameter. |
| PDF generation fails (PDFKit error) | HTTP 500: `{ error: "EXPORT_ERROR", message: "Failed to generate PDF report" }`. Error logged with stack trace. | User can retry or fall back to JSON export. Bug report should be filed. |
| JSON serialization fails (circular reference or encoding error) | HTTP 500: `{ error: "EXPORT_ERROR", message: "Failed to serialize JSON report" }`. Error logged. | User can retry. Indicates a data integrity issue. |
| Export takes longer than 10 seconds (NFR-14 threshold) | Logged as a performance warning. Response is still returned (no timeout enforced on export). | Investigate which part of the report is slow (likely large HTTP exchange bodies). Consider reducing `maxExchangeBodyLength`. |
| Client disconnects during streaming export | PDFKit/JSON stream detects the closed connection and stops writing. No server error. Resources are cleaned up. | No action needed. User can re-request the export. |

## Dependencies

- **PDFKit** ^0.13.0 — Server-side PDF generation. Pure JavaScript, no external binary dependencies (no Chromium/Puppeteer). Streaming output support.
- **Node.js stream** (built-in) — `Readable` stream for JSON export, pipe-based PDF streaming
- **CredentialMasker** (internal, from request-capture capability) — Credential masking applied before export
- **ResultAggregator** (internal, from reporting capability) — Computes summary statistics used in both JSON metadata and PDF summary tables
