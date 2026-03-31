# Project Brief — CS API Compliance Assessor

> Version: 1.1 | Status: Living Document | Last updated: 2026-03-31

## Problem Statement

Implementers of the OGC API - Connected Systems standard (OGC 23-001, OGC 23-002) have no automated way to verify conformance. The standard was published 2025-07-16 but no Executable Test Suite (ETS) exists on the OGC Validator. Teams building CS API servers (OpenSensorHub, pygeoapi, custom implementations) must manually test against the Abstract Test Suite in Annex A of the standard -- a labor-intensive, error-prone process that slows adoption and leaves interoperability gaps undetected.

System integrators evaluating CS API products for procurement have no independent tool to verify vendor conformance claims. The OGC community itself lacks a way to validate reference implementations against the published requirements.

## Vision

A web application that accepts any CS API endpoint URL, automatically discovers its declared conformance classes, executes requirement-level tests against the OGC standard, and produces a detailed compliance report with per-requirement pass/fail results, HTTP request/response traces, and exportable summaries. The tool fills the compliance-testing gap until the official OGC ETS arrives, and accelerates CS API ecosystem growth by giving implementers fast, reliable conformance feedback during development.

## Stakeholders

| Role | Interest |
|------|----------|
| CS API Server Implementers | Verify conformance during development; identify and fix non-compliant behavior before deployment |
| System Integrators | Independently evaluate CS API products against the standard before procurement or deployment decisions |
| OGC Community Members | Test reference implementations; validate standard clarity by exercising the Abstract Test Suite |
| DevOps / QA Engineers | Run conformance checks as part of quality assurance; potential future CI/CD integration |
| Project Sponsor | Deliver a working compliance tool that establishes credibility in the OGC ecosystem |

## Success Criteria

| ID | Criterion | Measure |
|----|-----------|---------|
| SC-1 | Part 1 + Part 2 requirement coverage | Executable tests exist for all 233 requirements across all 28 conformance classes of OGC 23-001 (Part 1: 103 requirements, 14 classes) and OGC 23-002 (Part 2: 130 requirements, 14 classes) |
| SC-2 | Parent standard coverage | Tests cover OGC API Common Part 1 core requirements (landing page, conformance declaration, JSON, OpenAPI 3.0) and OGC API Features Part 1 core requirements (collections, GeoJSON) |
| SC-3 | Accurate compliance reporting | Each test produces a clear pass/fail/skip result traceable to a specific requirement URI (e.g., /req/system/canonical-url) |
| SC-4 | Debugging support | Every test captures and displays the full HTTP request and response (method, URL, headers, body, status code) |
| SC-5 | Demo server validation | The application successfully runs a full assessment against the public demo server (api.georobotix.io) and produces a coherent report |
| SC-6 | Usability | A developer unfamiliar with the tool can submit an endpoint URL and receive a compliance report within 5 minutes of first visit |
| SC-7 | Export capability | Users can export the compliance report in at least one portable format (JSON and/or PDF) |

## Constraints

- **Scope**: v1.0 covers Part 1 (Feature Resources), Part 2 (Dynamic Data), and parent standard conformance. Part 3 (Pub/Sub), Parts 4-5, historical comparison, and CI/CD API mode are deferred to v2.0+.
- **Read-only safety**: Testing CRUD conformance classes (Create/Replace/Delete, Update) requires mutating state on the Implementation Under Test. The application must clearly warn users before executing write operations and allow users to skip destructive test classes.
- **Authentication**: CS API endpoints may require authentication. v1.0 must support at minimum Bearer token and API key authentication passed by the user. OAuth2 flows are deferred.
- **External dependencies**: The application depends on the CS API OpenAPI definitions published in the OGC GitHub repository. Changes to those schemas require application updates.
- **No official status**: This tool is not an official OGC compliance product. Reports must include a disclaimer stating that results are unofficial and do not constitute OGC certification.
- **Network dependency**: All testing requires live HTTP access to the target endpoint. There is no offline mode.
- **Browser-based**: The application must run in modern browsers (Chrome, Firefox, Edge, Safari) without plugins or local installation.

## Architecture Overview

The application follows a client-server architecture:

- **Frontend**: Single-page application providing the user interface for endpoint input, test configuration, progress monitoring, and result display/export.
- **Backend (Test Engine)**: Server-side component that executes HTTP-based conformance tests against the target endpoint. Responsible for endpoint discovery, conformance class detection, requirement-level test execution, schema validation, and result aggregation.
- **Communication**: The frontend communicates with the backend via a REST API. Test execution progress is streamed to the frontend via Server-Sent Events (SSE) or WebSocket for real-time updates.

Detailed architecture will be documented in architecture.md.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | Next.js (React) with TypeScript | Strong ecosystem, SSR for initial load performance, TypeScript for type safety across the stack, large community for maintainability |
| UI component library | Tailwind CSS + shadcn/ui | Utility-first styling with accessible, composable components; avoids heavy UI framework lock-in |
| Backend runtime | Node.js with TypeScript | Shared language with frontend reduces context-switching; strong HTTP client libraries; good JSON processing performance; aligns with OGC community tooling (Geonovum OGC Checker uses TypeScript/Node.js) |
| Test engine HTTP client | Axios or undici | Mature, well-tested HTTP clients with full control over headers, redirects, and response inspection |
| JSON Schema validation | Ajv | Industry-standard JSON Schema validator for Node.js; supports OpenAPI 3.0 schema validation |
| API style | REST (backend exposes test-run management endpoints) | Simple, well-understood; sufficient for request-response test management |
| Real-time progress | Server-Sent Events (SSE) | Simpler than WebSocket for unidirectional server-to-client updates; native browser support; sufficient for progress streaming |
| Report export | Server-side PDF generation (e.g., Puppeteer or PDFKit) + JSON export | PDF for human-readable reports; JSON for machine-readable integration |
| Deployment | Docker (docker-compose) | Consistent local and production deployment; single command startup; matches the project's Docker-oriented environment |
| Source control | Git + GitHub | Standard; enables community contributions and issue tracking |
| Testing framework | Vitest (unit/integration) + Playwright (E2E) | Vitest is fast and TypeScript-native; Playwright covers cross-browser E2E testing |
