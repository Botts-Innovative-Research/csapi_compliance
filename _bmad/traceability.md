# Traceability Matrix -- CS API Compliance Assessor

> Status: Living Document | Last updated: 2026-03-31

## PRD -> OpenSpec -> Epic -> Implementation Status

| PRD Req | OpenSpec Capability | OpenSpec Reqs | Epic | Story | Impl Status |
|---------|---------------------|---------------|------|-------|-------------|
| FR-01 | `endpoint-input` | REQ-DISC-001, REQ-DISC-002 | Epic 01 | S01-01 | Done |
| FR-02 | `landing-page-discovery` | REQ-DISC-003 | Epic 01 | S01-01 | Done |
| FR-03 | `conformance-detection` | REQ-DISC-004 | Epic 01 | S01-02 | Done |
| FR-04 | `conformance-mapping` | REQ-DISC-005 | Epic 01 | S01-02 | Done |
| FR-05 | `conformance-display` | REQ-DISC-006 | Epic 01 | S01-02 | Done |
| FR-06 | `class-selection` | REQ-DISC-007 | Epic 01 | S01-03 | Done |
| FR-07 | `auth-config` | REQ-DISC-008 | Epic 01 | S01-04 | Done |
| FR-08 | `run-config` | REQ-DISC-009, REQ-DISC-010 | Epic 01 | S01-04 | Done |
| FR-09 | `test-common` | REQ-TEST-001 | Epic 02 | S02-01 | Done |
| FR-10 | `test-features-core` | REQ-TEST-002 | Epic 02 | S02-02 | Done |
| FR-11 | `test-csapi-core` | REQ-TEST-003 | Epic 03 | S03-01 | Done |
| FR-12 | `test-system-features` | REQ-TEST-004 | Epic 03 | S03-02 | Done |
| FR-13 | `test-subsystems` | REQ-TEST-005 | Epic 03 | S03-02 | Done |
| FR-14 | `test-deployment-features` | REQ-TEST-006 | Epic 03 | S03-03 | Done |
| FR-15 | `test-subdeployments` | REQ-TEST-007 | Epic 03 | S03-03 | Done |
| FR-16 | `test-procedure-features` | REQ-TEST-008 | Epic 03 | S03-04 | Done |
| FR-17 | `test-sampling-features` | REQ-TEST-009 | Epic 03 | S03-04 | Done |
| FR-18 | `test-property-definitions` | REQ-TEST-010 | Epic 03 | S03-04 | Done |
| FR-19 | `test-advanced-filtering` | REQ-TEST-011 | Epic 03 | S03-05 | Done |
| FR-20 | `test-crud` | REQ-TEST-012, REQ-TEST-013 | Epic 03 | S03-06 | Done |
| FR-21 | `test-update` | REQ-TEST-013, REQ-TEST-014 | Epic 03 | S03-06 | Done |
| FR-22 | `test-geojson-format` | REQ-TEST-015 | Epic 03 | S03-07 | Done |
| FR-23 | `test-sensorml-format` | REQ-TEST-016 | Epic 03 | S03-07 | Done |
| FR-24 | `test-traceability` | REQ-ENG-001 | Epic 04 | S04-01 | Done |
| FR-25 | `test-result-status` | REQ-ENG-002, REQ-ENG-004 | Epic 04 | S04-02 | Done |
| FR-26 | `test-failure-detail` | REQ-ENG-003 | Epic 04 | S04-02 | Done |
| FR-27 | `schema-validation` | REQ-ENG-005, REQ-ENG-006 | Epic 04 | S04-03 | Done |
| FR-28 | `test-dependency-order` | REQ-ENG-007, REQ-ENG-008 | Epic 04 | S04-04 | Done |
| FR-29 | `pagination-support` | REQ-ENG-009, REQ-ENG-010 | Epic 04 | S04-05 | Done |
| FR-30 | `request-capture` | REQ-CAP-001 | Epic 05 | S05-01 | Done |
| FR-31 | `response-capture` | REQ-CAP-002, REQ-CAP-003 | Epic 05 | S05-01 | Done |
| FR-32 | `request-response-view` | REQ-CAP-005 | Epic 05 | S05-03 | Done |
| FR-33 | `credential-masking` | REQ-CAP-006, REQ-CAP-007 | Epic 05 | S05-02 | Done |
| FR-34 | `result-summary` | REQ-RPT-001 | Epic 06 | S06-01 | Done |
| FR-35 | `result-by-class` | REQ-RPT-002, REQ-RPT-003 | Epic 06 | S06-02 | Done |
| FR-36 | `class-result-detail` | REQ-RPT-004, REQ-RPT-005 | Epic 06 | S06-02 | Done |
| FR-37 | `test-result-detail` | REQ-RPT-006, REQ-RPT-007, REQ-RPT-008, REQ-RPT-009 | Epic 06 | S06-03 | Done |
| FR-38 | `compliance-disclaimer` | REQ-RPT-010, REQ-RPT-011 | Epic 06 | S06-01 | Done |
| FR-39 | `export-json` | REQ-EXP-001, REQ-EXP-002, REQ-EXP-003, REQ-EXP-004, REQ-EXP-008 | Epic 07 | S07-01 | Done |
| FR-40 | `export-pdf` | REQ-EXP-009, REQ-EXP-010, REQ-EXP-011, REQ-EXP-012, REQ-EXP-013, REQ-EXP-014 | Epic 07 | S07-02 | Done |
| FR-41 | `export-schema-versioning` | REQ-EXP-005, REQ-EXP-006 | Epic 07 | S07-01 | Done |
| FR-42 | `progress-display` | REQ-SESS-001, REQ-SESS-002, REQ-SESS-003 | Epic 08 | S08-01 | Done |
| FR-43 | `cancel-assessment` | REQ-SESS-004, REQ-SESS-005, REQ-SESS-006, REQ-SESS-007 | Epic 08 | S08-02 | Done |
| FR-44 | `result-persistence` | REQ-SESS-008, REQ-SESS-009, REQ-SESS-010, REQ-SESS-011 | Epic 08 | S08-03 | Done |
| FR-45 | `app-landing-page` | REQ-SESS-012, REQ-SESS-013, REQ-SESS-014, REQ-SESS-015 | Epic 08 | S08-04 | Done |
| FR-46 | `test-dynamic-common` | REQ-DYN-001 | Epic 09 | S09-01 | Done |
| FR-47 | `test-dynamic-json` | REQ-DYN-002 | Epic 09 | S09-01 | Done |
| FR-48 | `test-datastream-features` | REQ-DYN-003 | Epic 09 | S09-02 | Done |
| FR-49 | `test-observation-features` | REQ-DYN-004 | Epic 09 | S09-02 | Done |
| FR-50 | `test-controlstream-features` | REQ-DYN-005 | Epic 09 | S09-03 | Done |
| FR-51 | `test-command-features` | REQ-DYN-006 | Epic 09 | S09-03 | Done |
| FR-52 | `test-command-feasibility` | REQ-DYN-007 | Epic 09 | S09-04 | Done |
| FR-53 | `test-system-events` | REQ-DYN-008 | Epic 09 | S09-04 | Done |
| FR-54 | `test-system-history` | REQ-DYN-009 | Epic 09 | S09-04 | Done |
| FR-55 | `test-dynamic-advanced-filtering` | REQ-DYN-010 | Epic 09 | S09-05 | Done |
| FR-56 | `test-dynamic-crud` | REQ-DYN-011 | Epic 09 | S09-06 | Done |
| FR-57 | `test-dynamic-update` | REQ-DYN-012 | Epic 09 | S09-06 | Done |
| FR-58 | `test-swecommon-json` | REQ-DYN-013 | Epic 09 | S09-07 | Done |
| FR-59 | `test-swecommon-text-binary` | REQ-DYN-014 | Epic 09 | S09-07 | Done |

**Impl Status values**: Done | Partial | In Progress | Not Started | Deferred | Untested

## NFR Verification

| NFR | Verification Method | Status | Notes |
|-----|---------------------|--------|-------|
| NFR-01 | Performance test: discovery phase < 15s against responsive IUT | Passed | 0.85s against georobotix demo (perf-benchmark.ts) |
| NFR-02 | Performance test: >= 10 tests/second against responsive IUT | Passed | 58.9 tests/s measured (perf-benchmark.ts) |
| NFR-03 | Performance test: full assessment < 10 minutes against responsive IUT | Passed | ~0.1 min estimated (perf-benchmark.ts) |
| NFR-04 | Load test: 5 concurrent assessment sessions without degradation | Implemented | SessionManager enforces max 5 concurrent; unit tested |
| NFR-05 | Security review: credentials HTTPS-only, memory-only, never persisted | Implemented | CredentialMasker + in-memory only AuthConfig; unit tested |
| NFR-06 | Security review: input validation, SSRF protection (private IP rejection) | Passed | SSRF guard with 23 unit tests; security headers middleware |
| NFR-07 | Accessibility audit: WCAG 2.1 AA, keyboard nav, non-color indicators | Passed | 40+ WCAG fixes applied; skip link, focus trap, aria-live, roles |
| NFR-08 | Browser testing: Chrome, Firefox, Edge, Safari (latest 2 versions) | Ready | Playwright config for all 4 browsers; awaiting hosted deployment |
| NFR-09 | Uptime monitoring: 99% target for hosted deployment | Deferred | Requires hosted deployment |
| NFR-10 | Resilience test: network errors fail gracefully, no cascading crashes | Passed | HTTP client catches all errors; unit tested with 38 tests |
| NFR-11 | Log review: structured logging, no credentials or full bodies in logs | Implemented | pino logger with credential redaction; request-logger middleware |
| NFR-12 | Deployment test: `docker-compose up` with no additional dependencies | Implemented | Dockerfile + docker-compose.yml + health check |
| NFR-13 | Coverage report: >= 80% unit test coverage for test engine module | Configured | vitest.config.ts coverage thresholds set; 906 tests for engine |
| NFR-14 | Performance test: JSON/PDF export < 10 seconds for full report | Passed | 33ms measured (perf-benchmark.ts) |
| NFR-15 | Code review: all user-facing strings externalized for i18n readiness | Passed | 148 strings in en.json; all 10 frontend files migrated to t() |

## Epic Dependency Graph

```
Epic 04 (Test Engine) ─── foundation
  ├── Epic 01 (Discovery)
  │     ├── Epic 02 (Parent Testing)
  │     │     ├── Epic 03 (CS API Part 1 Testing)
  │     │     └── Epic 09 (CS API Part 2 Dynamic Data Testing) ── also needs Epic 03
  │     └── (also needs Epic 04)
  ├── Epic 05 (Capture)
  │     ├── Epic 06 (Reporting) ── also needs Epic 04
  │     │     └── Epic 07 (Export)
  │     └── (also needs Epic 04)
  └── Epic 08 (Progress/Session)
```

## Story Summary

| Epic | Stories | Total FRs Covered |
|------|---------|-------------------|
| Epic 01: Discovery | S01-01, S01-02, S01-03, S01-04 | FR-01 to FR-08 (8) |
| Epic 02: Parent Testing | S02-01, S02-02 | FR-09 to FR-10 (2) |
| Epic 03: CS API Testing | S03-01 to S03-07 | FR-11 to FR-23 (13) |
| Epic 04: Test Engine | S04-01 to S04-06 | FR-24 to FR-29 (6) |
| Epic 05: Capture | S05-01, S05-02, S05-03 | FR-30 to FR-33 (4) |
| Epic 06: Reporting | S06-01, S06-02, S06-03 | FR-34 to FR-38 (5) |
| Epic 07: Export | S07-01, S07-02, S07-03 | FR-39 to FR-41 (3) |
| Epic 08: Progress/Session | S08-01 to S08-04 | FR-42 to FR-45 (4) |
| Epic 09: Dynamic Data Testing | S09-01 to S09-07 | FR-46 to FR-59 (14) |
| **Total** | **39 stories** | **59 FRs** |
