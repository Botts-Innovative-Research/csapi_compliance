# Dynamic Data Testing — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Dynamic Data Testing capability provides the test definitions, requirement registry, and per-class test implementations for OGC 23-002 (Connected Systems API Part 2 — Dynamic Data). It covers 13 conformance classes with approximately 130 requirements across datastreams, observations, control streams, commands, command feasibility, system events, system history, advanced filtering, CRUD, update, JSON encoding, and three SWE Common encoding formats.

The architecture extends the Part 1 Conformance Testing capability. Three components collaborate to deliver this capability, mirroring the Part 1 structure:

- **Dynamic Data Test Registry** — Extends the Part 1 Conformance Test Registry with Part 2 conformance class definitions. Each Part 2 conformance class is defined in its own registry module file (e.g., `registry/datastreams.ts`). The registry entries use the same `ConformanceClassDefinition` interface as Part 1 but reference Part 2 requirement URIs and test implementation functions.
- **Test Implementations** — One module per Part 2 conformance class (e.g., `tests/datastreams.test-impl.ts`), each exporting a set of test functions that conform to the same `ConformanceClassTest` interface used by Part 1. Each function tests exactly one requirement and returns a `TestResult`.
- **Test Factory** — Uses the same `TestFactory` as Part 1. When given a Part 2 conformance class URI, it looks up the class in the extended registry and instantiates the corresponding test functions with the shared `TestContext` (which now includes Part 2-specific context fields). Returns an ordered array of executable test closures.

```
  +---------------------------------------------------------------+
  |  Dynamic Data Test Registry (src/engine/registry/)            |
  |                                                                |
  |  index.ts  (extended — imports Part 1 + Part 2 modules)        |
  |    |                                                           |
  |    +-- [Part 1 modules — unchanged]                            |
  |    |                                                           |
  |    +-- dynamic-common.ts        (Part 2 Common)                |
  |    +-- datastreams.ts           (Datastreams & Observations)   |
  |    +-- controlstreams.ts        (Control Streams & Commands)   |
  |    +-- command-feasibility.ts   (Command Feasibility)          |
  |    +-- system-events.ts         (System Events)                |
  |    +-- system-history.ts        (System History)               |
  |    +-- filtering-part2.ts       (Part 2 Advanced Filtering)    |
  |    +-- crud-part2.ts            (Part 2 Create/Replace/Delete) |
  |    +-- update-part2.ts          (Part 2 Update)                |
  |    +-- json-part2.ts            (Part 2 JSON Encoding)         |
  |    +-- swecommon-json.ts        (SWE Common JSON)              |
  |    +-- swecommon-text.ts        (SWE Common Text)              |
  |    +-- swecommon-binary.ts      (SWE Common Binary)            |
  |                                                                |
  +------------------------------+---------------------------------+
                                 |
                                 | ConformanceClassDefinition[]
                                 v
  +------------------------------+---------------------------------+
  |  Test Factory (src/engine/test-factory.ts)                     |
  |                                                                |
  |  createTestSuite(                                              |
  |    classUri: string,                                           |
  |    context: TestContext                                        |
  |  ): ExecutableTest[]                                           |
  |                                                                |
  |  (unchanged — same factory serves Part 1 + Part 2 classes)    |
  +------------------------------+---------------------------------+
                                 |
                                 | Resolves test functions
                                 v
  +---------------------------------------------------------------+
  |  Test Implementations (src/engine/tests/)                     |
  |                                                                |
  |  [Part 1 test files — unchanged]                               |
  |                                                                |
  |  dynamic-common.test-impl.ts                                   |
  |    +-- testPart2ConformanceDeclaration(ctx): TestResult         |
  |    +-- testPart2ResourceCollectionLinks(ctx): TestResult        |
  |    +-- testPart2BaseResponseStructures(ctx): TestResult         |
  |    +-- testTemporalPropertiesFormat(ctx): TestResult            |
  |                                                                |
  |  datastreams.test-impl.ts                                      |
  |    +-- testDatastreamCollectionAvailable(ctx): TestResult       |
  |    +-- testSystemScopedDatastreams(ctx): TestResult             |
  |    +-- testSingleDatastreamAccess(ctx): TestResult              |
  |    +-- testDatastreamSchemaValidation(ctx): TestResult          |
  |    +-- testDatastreamSchemaEndpoint(ctx): TestResult            |
  |    +-- testObservationCollectionAvailable(ctx): TestResult      |
  |    +-- testDatastreamScopedObservations(ctx): TestResult        |
  |    +-- testSingleObservationAccess(ctx): TestResult             |
  |    +-- testObservationSchemaValidation(ctx): TestResult         |
  |    +-- testObservationDatastreamLinkage(ctx): TestResult        |
  |                                                                |
  |  controlstreams.test-impl.ts                                   |
  |    +-- testControlStreamCollectionAvailable(ctx): TestResult    |
  |    +-- testSystemScopedControlStreams(ctx): TestResult           |
  |    +-- testSingleControlStreamAccess(ctx): TestResult           |
  |    +-- testControlStreamSchemaValidation(ctx): TestResult       |
  |    +-- testControlStreamSchemaEndpoint(ctx): TestResult         |
  |    +-- testCommandCollectionAvailable(ctx): TestResult          |
  |    +-- testControlStreamScopedCommands(ctx): TestResult         |
  |    +-- testSingleCommandAccess(ctx): TestResult                 |
  |    +-- testCommandSchemaValidation(ctx): TestResult             |
  |    +-- testCommandStatusEndpoint(ctx): TestResult               |
  |    +-- testCommandResultEndpoint(ctx): TestResult               |
  |                                                                |
  |  command-feasibility.test-impl.ts                              |
  |    +-- testFeasibilityEndpointAvailable(ctx): TestResult        |
  |    +-- testFeasibilityResultStructure(ctx): TestResult          |
  |    +-- testFeasibilityValidParams(ctx): TestResult              |
  |    +-- testFeasibilityInvalidParams(ctx): TestResult            |
  |                                                                |
  |  system-events.test-impl.ts                                    |
  |    +-- testSystemEventsCollectionAvailable(ctx): TestResult     |
  |    +-- testSystemScopedEvents(ctx): TestResult                  |
  |    +-- testSingleEventAccess(ctx): TestResult                   |
  |    +-- testEventSchemaValidation(ctx): TestResult               |
  |                                                                |
  |  system-history.test-impl.ts                                   |
  |    +-- testSystemHistoryAvailable(ctx): TestResult              |
  |    +-- testSingleRevisionAccess(ctx): TestResult                |
  |    +-- testRevisionSchemaValidation(ctx): TestResult            |
  |    +-- testRevisionOrdering(ctx): TestResult                    |
  |                                                                |
  |  filtering-part2.test-impl.ts                                  |
  |    +-- testPhenomenonTimeFilter(ctx): TestResult                |
  |    +-- testResultTimeFilter(ctx): TestResult                    |
  |    +-- testIssueTimeFilter(ctx): TestResult                     |
  |    +-- testExecutionTimeFilter(ctx): TestResult                 |
  |    +-- testPropertyFilterObservations(ctx): TestResult          |
  |    +-- testDatastreamFilterObservations(ctx): TestResult        |
  |    +-- testControlStreamFilterCommands(ctx): TestResult         |
  |                                                                |
  |  crud-part2.test-impl.ts                                       |
  |    +-- testCreateDatastream(ctx): TestResult                    |
  |    +-- testCreateObservation(ctx): TestResult                   |
  |    +-- testCreateControlStream(ctx): TestResult                 |
  |    +-- testCreateCommand(ctx): TestResult                       |
  |    +-- testReplaceResource(ctx): TestResult                     |
  |    +-- testDeleteResource(ctx): TestResult                      |
  |    +-- testErrorNonExistentResource(ctx): TestResult            |
  |                                                                |
  |  update-part2.test-impl.ts                                     |
  |    +-- testPartialUpdatePatch(ctx): TestResult                  |
  |    +-- testPatchContentType(ctx): TestResult                    |
  |    +-- testPatchNonExistentResource(ctx): TestResult            |
  |                                                                |
  |  json-part2.test-impl.ts                                       |
  |    +-- testPart2JsonContentType(ctx): TestResult                |
  |    +-- testDatastreamJsonStructure(ctx): TestResult             |
  |    +-- testObservationJsonStructure(ctx): TestResult            |
  |    +-- testControlStreamJsonStructure(ctx): TestResult          |
  |    +-- testCommandJsonStructure(ctx): TestResult                |
  |    +-- testPart2SchemaValidation(ctx): TestResult               |
  |                                                                |
  |  swecommon-json.test-impl.ts                                   |
  |    +-- testSweJsonContentType(ctx): TestResult                  |
  |    +-- testSweDataRecordStructure(ctx): TestResult              |
  |    +-- testObservationResultEncoding(ctx): TestResult           |
  |    +-- testSweJsonSchemaValidation(ctx): TestResult             |
  |                                                                |
  |  swecommon-text.test-impl.ts                                   |
  |    +-- testSweTextContentType(ctx): TestResult                  |
  |    +-- testSweTextNonEmptyBody(ctx): TestResult                 |
  |    +-- testSweTextDelimiterConsistency(ctx): TestResult         |
  |    +-- testSweTextNotSupported(ctx): TestResult                 |
  |                                                                |
  |  swecommon-binary.test-impl.ts                                 |
  |    +-- testSweBinaryContentType(ctx): TestResult                |
  |    +-- testSweBinaryNonEmptyBody(ctx): TestResult               |
  |    +-- testSweBinaryNotSupported(ctx): TestResult               |
  |                                                                |
  |  (~75 test functions across 13 Part 2 modules)                 |
  +---------------------------------------------------------------+
```

## Key Interfaces

The Dynamic Data Testing capability reuses all interfaces from the Part 1 Conformance Testing capability. The following table lists both the reused interfaces and new/extended elements specific to Part 2.

| Interface | Type | Description |
|-----------|------|-------------|
| `ConformanceClassTest` | TypeScript interface (reused) | `{ requirementId: string; testName: string; execute(ctx: TestContext): Promise<TestResult> }` — The contract every individual test function must satisfy. Part 2 tests use the same interface as Part 1. |
| `TestContext` | TypeScript interface (extended) | `{ endpointUrl: string; httpClient: CaptureHttpClient; schemaValidator: SchemaValidator; auth?: AuthConfig; config: RunConfig; discoveredData: DiscoveryCache }` — Shared context injected into every test function. Extended with Part 2 discovery data (see `DiscoveryCache` extension below). |
| `DiscoveryCache` | TypeScript interface (extended) | Adds Part 2-specific fields: `datastreamId?: string; observationId?: string; controlStreamId?: string; commandId?: string; systemEventId?: string; historyRevisionId?: string; sweJsonSupported?: boolean; sweTextSupported?: boolean; sweBinarySupported?: boolean`. These are populated during Part 2 discovery and reused across tests to avoid redundant fetches. |
| `TestRegistry` | TypeScript class (extended) | Same singleton API: `getClass(uri)`, `getAllClasses()`, `getTestableUris()`, `getDependencies(uri)`. The registry is extended to include Part 2 class definitions alongside Part 1. |
| `TestFactory.createTestSuite(classUri, ctx)` | Factory function (unchanged) | Same factory resolves Part 2 class URIs to their registry entries and imports the corresponding Part 2 test implementation modules. |
| `ExecutableTest` | TypeScript type (reused) | `{ requirementId: string; requirementUri: string; testName: string; run(): Promise<TestResult> }` — A bound, ready-to-execute test closure. |
| `ConformanceClassDefinition` | TypeScript interface (reused) | `{ uri: string; name: string; standardRef: string; destructive: boolean; dependencies: string[]; requirements: RequirementDefinition[] }` — Part 2 classes set `standardRef` to `"OGC 23-002"`. |
| `RequirementDefinition` | TypeScript interface (reused) | `{ id: string; uri: string; testName: string; testFunction: string }` — `testFunction` references the exported function name in the Part 2 test implementation module. |

## Dependency Tree

The Part 2 dependency tree integrates with the Part 1 tree. Part 2 classes depend on Part 1 classes where Part 2 resources are scoped under Part 1 resource types (e.g., datastreams are scoped under systems).

```
  Part 1: OGC API Common Part 1
    └── Part 1: OGC API Features Part 1 Core
         └── Part 1: CS API Core
              ├── Part 1: System Features
              │    ├── Part 2: Datastreams & Observations
              │    │    ├── Part 2: SWE Common JSON
              │    │    ├── Part 2: SWE Common Text
              │    │    └── Part 2: SWE Common Binary
              │    ├── Part 2: Control Streams & Commands
              │    │    └── Part 2: Command Feasibility
              │    ├── Part 2: System Events
              │    └── Part 2: System History
              │
              └── Part 2: Common
                   ├── Part 2: Datastreams & Observations  (also depends on System Features)
                   ├── Part 2: Control Streams & Commands   (also depends on System Features)
                   ├── Part 2: System Events                (also depends on System Features)
                   ├── Part 2: System History                (also depends on System Features)
                   ├── Part 2: Advanced Filtering
                   ├── Part 2: JSON Encoding
                   ├── Part 2: Create/Replace/Delete
                   └── Part 2: Update
```

A Part 2 class is skipped if any of its prerequisites fail. When a class has multiple prerequisites (e.g., Datastreams & Observations depends on both Part 2 Common and Part 1 System Features), all prerequisites must pass for the class to execute.

## Schema Source

Part 2 schemas are sourced from the OGC 23-002 OpenAPI YAML definition (`openapi-connectedsystems-2.yaml`), bundled at build time alongside the Part 1 schemas. The build process extracts JSON Schema definitions from the OpenAPI document and stores them under `schemas/part2/`.

| Schema | Source Path in OpenAPI | Local Bundle Path |
|--------|----------------------|-------------------|
| Datastream | `#/components/schemas/Datastream` | `schemas/part2/datastream.json` |
| Observation | `#/components/schemas/Observation` | `schemas/part2/observation.json` |
| ControlStream | `#/components/schemas/ControlStream` | `schemas/part2/controlstream.json` |
| Command | `#/components/schemas/Command` | `schemas/part2/command.json` |
| CommandStatus | `#/components/schemas/CommandStatus` | `schemas/part2/command-status.json` |
| CommandResult | `#/components/schemas/CommandResult` | `schemas/part2/command-result.json` |
| CommandFeasibility | `#/components/schemas/CommandFeasibility` | `schemas/part2/command-feasibility.json` |
| SystemEvent | `#/components/schemas/SystemEvent` | `schemas/part2/system-event.json` |
| SystemHistory | `#/components/schemas/SystemHistoryEntry` | `schemas/part2/system-history.json` |
| SWE DataRecord | `#/components/schemas/DataRecord` | `schemas/part2/swe-datarecord.json` |

## SWE Common Validation Approach

SWE Common encodings require different validation strategies based on the encoding format:

| Encoding | Media Type | Validation Strategy |
|----------|-----------|---------------------|
| SWE Common JSON | `application/swe+json` | Full JSON Schema validation against the bundled SWE Common JSON schema (`schemas/part2/swe-datarecord.json`). Observation results are validated for structural conformance: field names and types match the datastream schema definition. |
| SWE Common Text | `text/csv`, `text/plain`, `application/swe+text` | Content-Type verification (must be a text-based media type) and non-empty body check (response body length > 0). Delimiter consistency check (consistent delimiter character throughout the response). No deep CSV parsing or value-level validation. |
| SWE Common Binary | `application/octet-stream`, `application/swe+binary` | Content-Type verification (must be a binary media type) and non-empty body check (response body length > 0). No deep binary parsing or value-level validation. |

This approach balances thoroughness with practicality: JSON is fully validated because the schema is machine-readable, while text and binary encodings receive surface-level checks because deep parsing would require implementing a full SWE Common decoder, which is outside the scope of conformance testing.

## Configuration Schema

```json
{
  "dynamicDataTesting": {
    "registryPath": "src/engine/registry",
    "testsPath": "src/engine/tests",
    "supportedStandards": [
      "OGC API Common Part 1",
      "OGC API Features Part 1",
      "OGC 23-001 CS API Part 1",
      "OGC 23-002 CS API Part 2"
    ],
    "destructiveClassUris": [
      "http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/crud",
      "http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/update",
      "http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/crud",
      "http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/update"
    ],
    "paginationDefaults": {
      "maxPages": 5,
      "defaultLimit": 10
    },
    "schemaBasePath": "schemas/",
    "part2SchemaBasePath": "schemas/part2/",
    "sweCommonValidation": {
      "jsonSchemaPath": "schemas/part2/swe-datarecord.json",
      "textCheckContentTypeOnly": true,
      "binaryCheckContentTypeOnly": true
    }
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| Unknown Part 2 conformance class URI requested | Test Factory returns empty array; class is flagged as `declared-but-unsupported` in the UI | Informational only. The class is shown as untestable in the conformance class list. |
| Part 2 test implementation module not found at runtime | `TestFactory.createTestSuite()` throws `TestModuleNotFoundError` with the missing module path | Development error. The registry entry references a nonexistent module. Fix the `testFunction` reference in the registry. |
| Part 2 test function throws an unhandled exception | The Test Runner wraps each `ExecutableTest.run()` in a try/catch. The test result is set to `fail` with message `"Internal error: {error.message}"`. | No cascading failure. The error is logged and the next test proceeds. |
| Part 2 schema file missing for validation step | `SchemaValidator.validate()` throws `SchemaNotFoundError`. The calling test catches it and fails with `"Schema not available for {schemaRef}"`. | Rebuild the application to regenerate bundled schemas from the OGC 23-002 OpenAPI source. |
| Part 1 prerequisite class not passed (e.g., CS API Core failed) | All Part 2 classes that depend on the failed Part 1 class are skipped with reason `"Dependency not met: {parentClassName}"`. | User is informed via the results UI which Part 1 dependency caused the Part 2 skip. |
| Destructive Part 2 test class selected without opt-in warning acknowledgment | Frontend blocks submission. Backend validates that destructive classes have the `destructive: true` flag and returns HTTP 400 if the opt-in confirmation is missing from the request. | User must explicitly acknowledge the destructive test warning in the Assessment Wizard. |
| SWE Common encoding not supported by server (HTTP 406) | Test is marked SKIP with reason explaining which encoding is not supported. | No failure. The encoding tests are designed to gracefully skip when the server does not support the requested media type. |
| Command feasibility endpoint not available | If `POST /controlstreams/{id}/feasibility` returns HTTP 404 or HTTP 405, the feasibility tests are marked SKIP with reason "Command feasibility endpoint not available." | Feasibility is an optional capability. The skip is informational. |
| Observation or command collection empty during SWE Common tests | SWE Common encoding tests that require at least one observation are marked SKIP with reason "Collection is empty; no resources available to test." | The Content-Type test can still execute against the collection endpoint (even if the body is empty), but result-level validation tests are skipped. |

## Dependencies

- **OGC OpenAPI Schemas — Part 2** (bundled at build time) — JSON Schema definitions extracted from `openapi-connectedsystems-2.yaml`, pinned to a specific OGC GitHub commit SHA
- **OGC OpenAPI Schemas — Part 1** (bundled at build time) — Required because Part 2 extends Part 1 resource types and the Part 2 dependency tree roots in Part 1 classes
- **Ajv** ^8.12.0 — JSON Schema validation (used by individual test functions via the `SchemaValidator` from the test-engine capability)
- **TypeScript** ^5.0.0 — Type definitions for registry interfaces and test contracts
- **Part 1 Conformance Testing capability** — This capability extends the Part 1 registry, reuses all Part 1 interfaces, and depends on Part 1 test results for dependency resolution
