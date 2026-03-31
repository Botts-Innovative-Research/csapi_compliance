# S03-07: GeoJSON and SensorML Format Tests

> Status: Done | Epic: 03 | Last updated: 2026-03-31

## Description
Implement conformance tests for the GeoJSON Format (`/req/geojson`) and SensorML JSON Format (`/req/sensorml`) conformance classes. GeoJSON tests verify content negotiation, FeatureCollection/Feature structure, and geometry validity. SensorML tests verify content negotiation, SensorML JSON structure, and schema validation, with graceful skip when the server does not support the format.

## OpenSpec References
- Spec: `openspec/capabilities/conformance-testing/spec.md`
- Requirements: REQ-TEST-015, REQ-TEST-016, REQ-TEST-017, REQ-TEST-018, REQ-TEST-019
- Scenarios: SCENARIO-TEST-GEOJSON-001, SCENARIO-TEST-SENSORML-001, SCENARIO-TEST-SENSORML-002

## Acceptance Criteria
- [ ] GeoJSON content negotiation verifies `application/geo+json` Content-Type (REQ-TEST-015)
- [ ] FeatureCollection structure validation checks `type`, `features` array (REQ-TEST-015)
- [ ] Feature structure validation checks `type`, `id`, `geometry`, `properties` (REQ-TEST-015)
- [ ] Geometry validity checks `type` and `coordinates` when geometry is non-null (REQ-TEST-015)
- [ ] SensorML content negotiation verifies `application/sml+json` or gracefully skips on HTTP 406 (REQ-TEST-016)
- [ ] SensorML JSON structure validation checks `type`, `id`, and SensorML sections (REQ-TEST-016)
- [ ] SensorML schema validation runs against bundled schema (REQ-TEST-016)
- [ ] Tests are skipped if CS API Core fails (REQ-TEST-018)

## Tasks
1. Register GeoJSON and SensorML tests with requirement URIs
2. Implement GeoJSON content negotiation test
3. Implement FeatureCollection and Feature structure validation
4. Implement geometry validity assertions
5. Implement SensorML content negotiation with 406 handling
6. Implement SensorML structure and schema validation
7. Bundle SensorML JSON schema
8. Write unit tests

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
