# Conformance Testing — Design

> Version: 1.0 | Status: Draft | Last updated: 2026-03-30

## Component Architecture

The Conformance Testing capability provides the test definitions, requirement registry, and per-class test implementations that the test engine executes against an Implementation Under Test (IUT). It covers 16 conformance classes: 2 parent standards (OGC API Common Part 1, OGC API Features Part 1 Core) and 14 CS API Part 1 classes.

Three components collaborate to deliver this capability:

- **Conformance Test Registry** — A static TypeScript data structure loaded at startup that defines every conformance class, its requirements, dependency relationships, and references to test implementation functions. Each conformance class is defined in its own registry module file (e.g., `registry/system-features.ts`).
- **Test Implementations** — One module per conformance class (e.g., `tests/system-features.test-impl.ts`), each exporting a set of test functions that conform to the `ConformanceClassTest` interface. Each function tests exactly one requirement (FR-24) and returns a `TestResult`.
- **Test Factory** — A factory function that, given a conformance class URI, looks up the class in the registry and instantiates the corresponding test functions with the shared `TestContext` (HTTP client, schema validator, endpoint URL, auth config). Returns an ordered array of executable test closures.

```
  +---------------------------------------------------------------+
  |  Conformance Test Registry (src/engine/registry/)             |
  |                                                                |
  |  index.ts                                                      |
  |    |                                                           |
  |    +-- common.ts           (OGC API Common Part 1)             |
  |    +-- features-core.ts    (OGC API Features Part 1 Core)      |
  |    +-- csapi-core.ts       (CS API Core)                       |
  |    +-- system-features.ts  (System Features)                   |
  |    +-- subsystems.ts       (Subsystems)                        |
  |    +-- deployments.ts      (Deployment Features)               |
  |    +-- subdeployments.ts   (Subdeployments)                    |
  |    +-- procedures.ts       (Procedure Features)                |
  |    +-- sampling.ts         (Sampling Features)                 |
  |    +-- properties.ts       (Property Definitions)              |
  |    +-- filtering.ts        (Advanced Filtering)                |
  |    +-- crud.ts             (Create/Replace/Delete)             |
  |    +-- update.ts           (Update)                            |
  |    +-- geojson.ts          (GeoJSON Format)                    |
  |    +-- sensorml.ts         (SensorML Format)                   |
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
  +------------------------------+---------------------------------+
                                 |
                                 | Resolves test functions
                                 v
  +---------------------------------------------------------------+
  |  Test Implementations (src/engine/tests/)                     |
  |                                                                |
  |  Each file exports functions matching RequirementDefinition    |
  |  testFunction references:                                      |
  |                                                                |
  |  common.test-impl.ts                                           |
  |    +-- testLandingPageStructure(ctx: TestContext): TestResult   |
  |    +-- testConformanceEndpoint(ctx: TestContext): TestResult    |
  |    +-- testJsonEncoding(ctx: TestContext): TestResult           |
  |    +-- testOpenApiLink(ctx: TestContext): TestResult            |
  |                                                                |
  |  system-features.test-impl.ts                                  |
  |    +-- testSystemCollectionAvailable(ctx): TestResult          |
  |    +-- testSystemCanonicalUrl(ctx): TestResult                 |
  |    +-- testSystemSchemaValidation(ctx): TestResult             |
  |    +-- testSystemLinks(ctx): TestResult                        |
  |    +-- ...                                                     |
  |                                                                |
  |  (one file per conformance class, ~103 test functions total)   |
  +---------------------------------------------------------------+
```

## Key Interfaces

| Interface | Type | Description |
|-----------|------|-------------|
| `ConformanceClassTest` | TypeScript interface | `{ requirementId: string; testName: string; execute(ctx: TestContext): Promise<TestResult> }` — The contract every individual test function must satisfy. |
| `TestContext` | TypeScript interface | `{ endpointUrl: string; httpClient: CaptureHttpClient; schemaValidator: SchemaValidator; auth?: AuthConfig; config: RunConfig; discoveredData: DiscoveryCache }` — Shared context injected into every test function. |
| `DiscoveryCache` | TypeScript interface | `{ landingPage: LandingPageResponse; conformanceUris: string[]; collections: CollectionMetadata[]; systemId?: string; deploymentId?: string }` — Cached data from the discovery phase, reused across tests to avoid redundant fetches. |
| `TestRegistry` | TypeScript class | Static singleton. `getClass(uri: string): ConformanceClassDefinition \| undefined`, `getAllClasses(): ConformanceClassDefinition[]`, `getTestableUris(): string[]`, `getDependencies(uri: string): string[]`. |
| `TestFactory.createTestSuite(classUri: string, ctx: TestContext): ExecutableTest[]` | Factory function | Resolves a conformance class URI to its registry entry, imports the corresponding test implementation module, and returns an array of `ExecutableTest` closures bound to the provided context. |
| `ExecutableTest` | TypeScript type | `{ requirementId: string; requirementUri: string; testName: string; run(): Promise<TestResult> }` — A bound, ready-to-execute test closure. |
| `ConformanceClassDefinition` | TypeScript interface | `{ uri: string; name: string; standardRef: string; destructive: boolean; dependencies: string[]; requirements: RequirementDefinition[] }` |
| `RequirementDefinition` | TypeScript interface | `{ id: string; uri: string; testName: string; testFunction: string }` — `testFunction` is the exported function name in the test implementation module. |

## Configuration Schema

```json
{
  "conformanceTesting": {
    "registryPath": "src/engine/registry",
    "testsPath": "src/engine/tests",
    "supportedStandards": [
      "OGC API Common Part 1",
      "OGC API Features Part 1",
      "OGC 23-001 CS API Part 1"
    ],
    "destructiveClassUris": [
      "http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/crud",
      "http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/update"
    ],
    "paginationDefaults": {
      "maxPages": 5,
      "defaultLimit": 10
    },
    "schemaBasePath": "schemas/"
  }
}
```

## Error Handling

| Error Condition | Response | Recovery |
|-----------------|----------|----------|
| Unknown conformance class URI requested | Test Factory returns empty array; class is flagged as `declared-but-unsupported` in the UI | Informational only. The class is shown as untestable in the conformance class list. |
| Test implementation module not found at runtime | `TestFactory.createTestSuite()` throws `TestModuleNotFoundError` with the missing module path | Development error. The registry entry references a nonexistent module. Fix the `testFunction` reference in the registry. |
| Test function throws an unhandled exception | The Test Runner wraps each `ExecutableTest.run()` in a try/catch. The test result is set to `fail` with message `"Internal error: {error.message}"`. | No cascading failure. The error is logged and the next test proceeds. |
| Schema file missing for validation step | `SchemaValidator.validate()` throws `SchemaNotFoundError`. The calling test catches it and fails with `"Schema not available for {schemaRef}"`. | Rebuild the application to regenerate bundled schemas from the OGC OpenAPI source. |
| IUT does not declare a required parent class (e.g., system-features declared without csapi-core) | Conformance Mapper auto-includes the dependency class. If the dependency class fails, the dependent class is skipped with reason `"Dependency not met: {parentClassName}"`. | User is informed via the results UI which dependency caused the skip. |
| Destructive test class selected without opt-in warning acknowledgment | Frontend blocks submission. Backend validates that destructive classes have the `destructive: true` flag and returns HTTP 400 if the opt-in confirmation is missing from the request. | User must explicitly acknowledge the destructive test warning in the Assessment Wizard. |

## Dependencies

- **OGC OpenAPI Schemas** (bundled at build time) — JSON Schema definitions extracted from `openapi-connectedsystems-1.yaml`, pinned to a specific OGC GitHub commit SHA
- **Ajv** ^8.12.0 — JSON Schema validation (used by individual test functions via the `SchemaValidator` from the test-engine capability)
- **TypeScript** ^5.0.0 — Type definitions for registry interfaces and test contracts
