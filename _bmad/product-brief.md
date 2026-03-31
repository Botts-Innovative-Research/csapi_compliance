# Product Brief — OGC CS API Compliance Assessor

> Version: 1.1 | Status: Reviewed | Last updated: 2026-03-31
> Author: Discovery Agent (Mary)

## Problem Space

### What is OGC API - Connected Systems (CS API)?

OGC API - Connected Systems is a recently approved OGC standard (2025-07-16) that connects sensors, actuators, platforms, drones, satellites, robots, and IoT devices into a common 4D framework for discovery, access, processing, tasking, and action. It extends OGC API - Features with dynamic data capabilities.

**Standard documents:**
- Part 1: Feature Resources (OGC 23-001) — 103 requirements, 14 conformance classes
- Part 2: Dynamic Data (OGC 23-002) — 130 requirements, 14 conformance classes
- Part 3: Pub/Sub (in progress) — WebSocket, MQTT bindings
- Parts 4-5: Planned (Sampling Feature Types, Binary Encoding)

### The Compliance Testing Gap

OGC operates the CITE (Compliance & Interoperability Testing & Evaluation) program, using TeamEngine to run Executable Test Suites (ETS). However, **no ETS exists yet for CS API on the OGC Validator**. The standard was only published in mid-2025 and compliance testing infrastructure lags behind.

This creates a gap: implementers building CS API servers (like OpenSensorHub, pygeoapi) have no automated way to verify conformance. The only alternative is manual testing against the Abstract Test Suite (Annex A of the standard), which is labor-intensive and error-prone.

### Opportunity

A web application that performs comprehensive compliance assessment of CS API endpoints would:
1. Fill the gap until official OGC ETS is available
2. Help implementers validate conformance during development (shift-left testing)
3. Provide detailed, requirement-level test results with traceability to the standard
4. Support the growing CS API ecosystem (IoT, smart cities, defense, environmental monitoring)

## Domain Vocabulary

| Term | Definition |
|------|-----------|
| Conformance Class | A set of tests corresponding 1:1 with a requirements class in the standard |
| Requirements Class | A set of related requirements targeting a specific feature area |
| Abstract Test Suite (ATS) | Testable assertions in Annex A of the standard (what to test) |
| Executable Test Suite (ETS) | Runtime code implementing the ATS (how to test) |
| CITE | OGC Compliance & Interoperability Testing & Evaluation program |
| TeamEngine | OGC's official test execution engine |
| IUT | Implementation Under Test — the endpoint being assessed |
| ModSpec | OGC's modular specification model for organizing requirements |
| SensorML | Encoding format for system metadata (Part 1) |
| SWE Common | Encoding format for observation/command data (Part 2) |
| Landing Page | Root endpoint (`/`) providing links to conformance, API definition, collections |
| Conformance Declaration | `/conformance` endpoint listing supported conformance class URIs |

## Target Users

1. **CS API Server Implementers** — Developers building OGC CS API servers who need to verify conformance during development
2. **System Integrators** — Teams evaluating CS API products for procurement/deployment
3. **OGC Community** — Standards body members who need to test reference implementations
4. **DevOps/QA Engineers** — Teams running conformance checks in CI/CD pipelines

## Key Workflows

### Primary: Endpoint Assessment
1. User provides the landing page URL of the CS API endpoint
2. Application discovers the endpoint's capabilities via `/conformance`
3. User selects which conformance classes to test (or tests all declared)
4. Application executes requirement-level tests against the endpoint
5. Application produces a detailed compliance report with pass/fail per requirement

### Secondary: Report Review
1. User reviews test results organized by conformance class
2. Each failed test links to the specific requirement in the standard
3. User can drill down into HTTP request/response details for failed tests
4. User can export/share the compliance report

### Tertiary: Comparison/Monitoring
1. User can save assessment results over time
2. User can compare results across different endpoint versions
3. User can track compliance progress as implementation evolves

## Conformance Classes to Test

### Part 1 — Feature Resources (14 classes)
- Core, System Features, Subsystems, Deployment Features, Subdeployments
- Procedure Features, Sampling Features, Property Definitions
- Advanced Filtering, Create/Replace/Delete, Update
- GeoJSON Format, SensorML Format, API Common

### Part 2 — Dynamic Data (14 classes)
- Common, Datastreams & Observations, Control Streams & Commands
- Command Feasibility, System Events, System History
- Advanced Filtering, Create/Replace/Delete, Update
- JSON Encoding, SWE Common JSON, SWE Common Text, SWE Common Binary

### Parent Standard Conformance
- OGC API - Common Part 1 (landing page, conformance, JSON, HTML, OpenAPI 3.0)
- OGC API - Features Part 1 (core, GeoJSON)

## Test Approach

Each conformance class maps to a set of requirements (e.g., `/req/system/canonical-url`). Each requirement maps to one or more abstract tests (e.g., `/conf/system/canonical-url`). The application implements executable tests for each abstract test by:

1. **HTTP probing** — Making requests to the appropriate endpoints
2. **Response validation** — Checking status codes, headers, content types
3. **Schema validation** — Validating response bodies against JSON schemas from the OpenAPI definitions
4. **Structural validation** — Checking required links, properties, and relationships
5. **Behavioral validation** — Verifying query parameters, filtering, pagination, CRUD operations

## Existing Tools (Competitive Landscape)

| Tool | Scope | Approach | CS API Support |
|------|-------|----------|---------------|
| OGC TeamEngine/Validator | Official compliance | Java/TestNG ETS | No ETS yet |
| Geonovum OGC Checker | OGC API validation | TypeScript/Node.js | No |
| GeoHealthCheck | Operational monitoring | Python, OWSLib | No |
| OpenAPI Validators | Schema validation only | Various | Generic only |

**No existing tool provides CS API compliance assessment.** This is a greenfield opportunity.

## Technical References

- Part 1 spec: https://docs.ogc.org/is/23-001/23-001.html
- Part 2 spec: https://docs.ogc.org/is/23-002/23-002.html
- GitHub: https://github.com/opengeospatial/ogcapi-connected-systems
- OpenAPI Part 1: https://github.com/opengeospatial/ogcapi-connected-systems/blob/master/api/part1/openapi/openapi-connectedsystems-1.yaml
- OpenAPI Part 2: https://github.com/opengeospatial/ogcapi-connected-systems/blob/master/api/part2/openapi/openapi-connectedsystems-2.yaml
- Demo server: https://api.georobotix.io/ogc/t18/api
- OGC compliance program: https://www.ogc.org/how-our-compliance-program-works/
- ModSpec: https://www.ogc.org/standards/modularspec

## Open Questions

1. **Scope of Part 1 vs Part 2**: Should the initial release cover both parts or start with Part 1 only?
2. **Write operations**: Testing Create/Replace/Delete and Update conformance classes requires mutating state on the IUT. Should we require a "test mode" or use dedicated test resources?
3. **Authentication**: CS API endpoints may require authentication. How should the tool handle credentials?
4. **Pub/Sub (Part 3)**: Part 3 involves WebSocket and MQTT — should we plan for this from the start?
5. **Official vs. unofficial**: Should we align our test IDs and structure with the ATS to ease future integration with TeamEngine?

## Recommended Scope Boundaries

**In scope (v1.0):**
- Part 1 conformance testing (all 14 conformance classes, 103 requirements)
- Part 2 conformance testing (all 14 conformance classes, 130 requirements) -- dynamic data, datastreams, observations, control streams, commands, system events, system history
- Parent standard conformance (OGC API Common, Features basics)
- Web-based UI for endpoint input, test execution, and result display
- Detailed per-requirement pass/fail reporting
- HTTP request/response capture for debugging

**Deferred (v2.0+):**
- Part 3 Pub/Sub testing (WebSocket, MQTT)
- Parts 4-5 (Sampling Feature Types, Binary Encoding)
- CI/CD integration (headless/API mode)
- Historical comparison and monitoring
- Official OGC compliance badge integration
