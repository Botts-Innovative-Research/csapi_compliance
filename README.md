# CS API Compliance Assessor

A web application that performs comprehensive conformance assessment of endpoints implementing the [OGC API - Connected Systems](https://ogcapi.ogc.org/connectedsystems/) standard. Enter an endpoint URL, and the tool automatically discovers its capabilities, runs requirement-level tests against the OGC specification, and produces detailed compliance reports.

**No official OGC Executable Test Suite exists yet for Connected Systems.** This tool fills that gap, giving implementers fast, automated conformance feedback during development.

## What It Tests

| Standard | Document | Requirements | Conformance Classes |
|----------|----------|-------------|-------------------|
| OGC API - Common Part 1 | OGC 19-072 | Core building blocks | Landing page, conformance, JSON, OpenAPI |
| OGC API - Features Part 1 | OGC 17-069 | Feature collections | Collections, items, GeoJSON |
| **CS API Part 1: Feature Resources** | **OGC 23-001** | **103 requirements** | Systems, deployments, procedures, sampling features, properties, filtering, CRUD, GeoJSON, SensorML |
| **CS API Part 2: Dynamic Data** | **OGC 23-002** | **130 requirements** | Datastreams, observations, control streams, commands, feasibility, events, history, SWE encodings |

**233 OGC requirements** tested across **28 conformance classes** with **906 unit tests**.

## Quick Start

### Docker (recommended)

```bash
docker-compose up -d
```

Open [http://localhost:3000](http://localhost:3000) and enter a CS API endpoint URL.

### From Source

Requires Node.js 20+.

```bash
# Install dependencies
npm install

# Fetch OGC schemas (build-time)
npm run fetch-schemas

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Try It

Use the OGC demo server to test: `https://api.georobotix.io/ogc/t18/api`

## How It Works

1. **Discover** -- Enter an endpoint URL. The tool fetches the landing page, reads the `/conformance` declaration, and maps declared conformance classes to testable requirements.

2. **Configure** -- Select which conformance classes to test. Optionally provide authentication (Bearer, API key, Basic) and adjust timeout/concurrency settings. Write-operation tests (CRUD/Update) require explicit opt-in.

3. **Test** -- The engine runs tests in dependency order with real-time progress via Server-Sent Events. Each test maps 1:1 to an OGC requirement URI. Failed tests include the specific assertion that failed and the full HTTP request/response exchange.

4. **Report** -- View results in an interactive dashboard with per-class breakdown, compliance percentage, and a test detail drawer showing HTTP traces. Export as JSON (versioned schema) or PDF.

## Features

- **28 conformance class test modules** covering OGC 23-001 (Part 1) and OGC 23-002 (Part 2)
- **Requirement-level traceability** -- every test maps to a canonical `/req/` URI from the OGC standard
- **Real-time progress** via SSE with cancellation support
- **Full HTTP capture** with credential masking (first 4 + last 4 chars)
- **JSON and PDF export** with versioned schema and disclaimer
- **SSRF protection** -- blocks requests to private/internal IP ranges
- **WCAG 2.1 AA accessible** -- skip links, focus management, aria-live regions, non-color status indicators
- **i18n ready** -- 148 externalized strings with interpolation support
- **Docker deployment** -- single `docker-compose up` command

## Development

```bash
# Run unit tests (906 tests, ~2s)
npm test

# Run E2E tests (Playwright, Chromium)
npm run test:e2e

# Run across all browsers
npm run test:e2e:all-browsers

# Type check
npm run typecheck

# Lint
npm run lint

# Performance benchmark against live server
npm run perf

# Smoke test discovery against OGC demo server
npx tsx scripts/smoke-test.ts
```

## Project Structure

```
src/
  app/                    # Next.js pages (landing, config, progress, results)
  components/             # React components (wizard, results dashboard, drawer)
  engine/                 # Test engine core
    registry/             # 28 conformance class test modules
    test-runner.ts        # Orchestrator (dependency order, concurrency, progress)
    discovery-service.ts  # Endpoint discovery + conformance mapping
    schema-validator.ts   # Ajv-based JSON schema validation
    http-client.ts        # HTTP client with capture, auth, SSRF guard
  server/                 # Express server, API routes, middleware
  services/               # Frontend API + SSE clients
  lib/                    # Shared types, constants, i18n
schemas/                  # Bundled OGC JSON schemas (fetched at build time)
tests/                    # Unit tests (Vitest) + E2E tests (Playwright)
```

## Built With

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Express, Node.js 22, TypeScript |
| Schema Validation | Ajv 8 with OGC OpenAPI schemas |
| PDF Export | PDFKit |
| Testing | Vitest (906 unit tests), Playwright (20 E2E tests) |
| Deployment | Docker, docker-compose |

## Development Methodology

This project was built using **spec-anchored development** via the [BMAD](https://github.com/bmadcode/BMAD-METHOD) + **OpenSpec** framework:

- **BMAD agents** (Discovery, PM, Architect, Design, Developer, QA, Scrum Master) each operated with fresh context windows, producing artifacts that feed into the next stage
- **OpenSpec capabilities** define testable requirements (REQ-\*) and acceptance scenarios (SCENARIO-\*) that trace from PRD through to tests
- **Full traceability chain**: User Need &rarr; PRD (59 FRs) &rarr; OpenSpec REQ-\* &rarr; Stories (39) &rarr; Tests (906) &rarr; Implementation

The complete specification, architecture, UX design, epics, stories, and traceability matrix live in the repository under `_bmad/`, `openspec/`, and `epics/`.

## Disclaimer

This tool is **unofficial** and does not constitute OGC certification. Results are based on automated testing against the OGC 23-001 and OGC 23-002 standards and may not cover all edge cases. For official OGC compliance certification, visit [ogc.org/compliance](https://www.ogc.org/compliance/).

## License

MIT
