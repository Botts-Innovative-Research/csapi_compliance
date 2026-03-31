# S04-03: JSON Schema Validation Engine

> Status: Done | Epic: 04 | Last updated: 2026-03-31

## Description
Implement JSON schema validation for HTTP response bodies using Ajv. Load schemas from the OGC 23-001 OpenAPI YAML definition, resolve all `$ref` pointers, cache resolved schemas for the assessment run duration, and produce detailed validation error messages with JSON Pointer paths.

## OpenSpec References
- Spec: `openspec/capabilities/test-engine/spec.md`
- Requirements: REQ-ENG-005, REQ-ENG-006
- Scenarios: SCENARIO-ENG-SCHEMA-001, SCENARIO-ENG-SCHEMA-002, SCENARIO-ENG-SCHEMA-003

## Acceptance Criteria
- [ ] Ajv is configured with strict mode and full format validation (REQ-ENG-005)
- [ ] Validation errors include JSON Pointer path, expected constraint, and actual value (REQ-ENG-005)
- [ ] Schemas are loaded from OGC 23-001 OpenAPI YAML with $ref resolution (REQ-ENG-006)
- [ ] All $ref pointers are fully resolved before validation (REQ-ENG-006)
- [ ] Resolved schemas are cached for the assessment run duration (REQ-ENG-006)
- [ ] Conformant responses pass validation with zero errors
- [ ] Non-conformant responses fail with detailed error paths

## Tasks
1. Implement OpenAPI YAML loader and parser
2. Implement $ref resolver for schema extraction
3. Configure Ajv with strict mode and format validation
4. Implement schema caching mechanism
5. Implement validation error formatting with JSON Pointer paths
6. Write unit tests with conformant and non-conformant fixtures

## Implementation Notes
<!-- Fill after implementation -->
- **Key files**:
- **Deviations**:
