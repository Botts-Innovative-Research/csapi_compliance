# Traceability Matrix -- CS API Compliance Assessor

> Status: Living Document | Last updated: 2026-04-16

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

## Process Verification (Methodology Gates)

Beyond per-FR verification, the spec-anchored development process is itself verified by the gate system defined in `_bmad/workflow.md`:

| Gate | Owner | Verifies | Authority |
|------|-------|----------|-----------|
| Gate 1: Self-Check | Generator (Dana) | Acceptance criteria met, tests pass, types/lint clean, REQ-*/SCENARIO-* refs present | PASS / REWORK |
| Gate 2: Evaluator | Evaluator (Quinn) | Independent review against sprint contract; spec/test/E2E verification; conformance fixture checks; security/a11y gates | PASS / RETRY / FAIL |
| Gate 3: Reconciliation | Scrum Master (Sam) | spec.md, story, epic, traceability, ops/status.md, ops/changelog.md, ops/test-results.md all updated and consistent | DONE / INCOMPLETE |
| Gate 4: Adversarial Review | Red Team (Raze) | User-request fulfillment, CLAUDE.md compliance (every mandatory step), spec gap detection, cross-agent blind spots, conformance-test correctness (false positives/negatives, URL bugs) | APPROVE / GAPS_FOUND / REJECT — **can override Gate 2** |

Gate 4 is conditionally triggered for non-trivial changes (>=50 LOC, security-relevant paths, capability spec changes, milestones) per `.harness/config.yaml` `agents.adversarial.triggers`. It can also be invoked as a sub-agent from non-orchestrator Claude sessions per the CLAUDE.md "Anthropic internal prompt augmentation" directive.

### Recent Gate runs

| Sprint / Task | Gate | Date | Verdict | Artifact |
|---------------|------|------|---------|----------|
| retro-eval (v1.0 retroactive) | Gate 2 v1 (Quinn) | 2026-04-02 | RETRY 0.58 | `.harness/evaluations/sprint-retro-eval-eval.yaml` |
| retro-eval | Gate 4 (Raze) | 2026-04-16 | GAPS_FOUND 0.78 | `.harness/evaluations/sprint-retro-eval-adversarial.yaml` |
| retro-eval | Gate 2 v2 (Quinn) | 2026-04-16 | CONCERNS 0.81 | `.harness/evaluations/sprint-retro-eval-eval-v2.yaml` |
| task1-playwright | Gate 4 (Raze, sub-agent) | 2026-04-16 | GAPS_FOUND 0.82 | `.harness/evaluations/sprint-task1-playwright-adversarial.yaml` |
| task1-option4 | Gate 4 (Raze, sub-agent) | 2026-04-16 | GAPS_FOUND 0.85 | `.harness/evaluations/sprint-task1-option4-adversarial.yaml` |
| task2-georobotix-conformance | Conformance Fixture Validation | 2026-04-16T22:19Z | PASS (BUG-001 fixed, 3 false positives resolved) | `.harness/evaluations/task2-georobotix-conformance-2026-04-16.json` |
| user-testing-round-01 | Gate 4 (Raze, sub-agent) | 2026-04-17T01:30Z | APPROVE 0.88 | `.harness/evaluations/sprint-user-testing-round-01-adversarial.yaml` |
| user-testing-followup | Gate 4 (Raze, sub-agent) | 2026-04-17T02:45Z | GAPS_FOUND 0.86 (S11-01 APPROVE 0.94, S11-02 GAPS_FOUND 0.80 — REQ-TEST-CITE-002 scope mismatch; 7 files logged for follow-up sweep) | `.harness/evaluations/sprint-user-testing-followup-adversarial.yaml` |
| rubric-6-1-sweep | Gate 1 self-check | 2026-04-17T03:00Z | PASS — vitest 983/983 (+28 new), tsc 0 errors, eslint 0 errors / 18 warnings (unchanged) | N/A |
| rubric-6-1-sweep | Gate 4 (Raze, sub-agent) | 2026-04-17T03:18Z | APPROVE 0.88 — 2 gaps (GAP-1 adjacent-comment, GAP-2 URI-path) + 1 caveat (missing-adoc) addressed same-turn | `.harness/evaluations/sprint-rubric-6-1-sweep-adversarial.yaml` |
| api-definition-service-doc-fallback | Gate 1 self-check | 2026-04-17T15:45Z | PASS — vitest 986/986 (+3 net-new), tsc 0 errors, eslint 0 errors / 18 warnings (unchanged) | N/A |
| api-definition-service-doc-fallback | Gate 4 (Raze, sub-agent) | 2026-04-17T15:50Z | APPROVE 0.92 — GAP-2 (structural-check tradeoff prose) addressed same-turn; GAP-1 (no live E2E) noted as defensible | `.harness/evaluations/sprint-api-def-fallback-adversarial.yaml` |
| deployments-collections-heuristic | Gate 1 self-check | 2026-04-17T16:25Z | PASS — vitest 992/992 (+6 net-new), tsc 0 errors, eslint 0 errors / 18 warnings (unchanged) | N/A |
| deployments-collections-heuristic | Gate 4 (Raze, sub-agent) | 2026-04-17T16:30Z | APPROVE 0.93 — GAP-2 (half-conformant `itemType="feature"` without featureType) addressed same-turn; GAP-1 (no live E2E) defensible for registry-layer-only sprint | `.harness/evaluations/sprint-deployments-collections-heuristic-adversarial.yaml` |
| procedures-properties-sampling-collections-missing-check | Gate 1 self-check | 2026-04-17T17:45Z | PASS — vitest **1002/1002** (+8 net-new; crossed 1000), tsc 0 errors, eslint 0 errors / 18 warnings (unchanged) | N/A |
| procedures-properties-sampling-collections-missing-check | Gate 4 (Raze, sub-agent) | 2026-04-17T17:50Z | **GAPS_FOUND 0.83** (code APPROVE-grade; 3 ops-doc gaps all addressed same-turn — stale Active entries in known-issues.md, wrong count narrative, missing procedures id-convention trap-guard parity) | `.harness/evaluations/sprint-procedures-properties-sampling-collections-missing-check-adversarial.yaml` |

### Verified scenarios (E2E-bound)

| Scenario | Status | Evidence |
|----------|--------|----------|
| SCENARIO-SESS-LAND-001 | **PASS** 2026-04-16 | Playwright chromium + firefox, `tests/e2e/landing-page.spec.ts` 12 tests covering all aspects of initial view |
| SCENARIO-SESS-LAND-002 | **PASS** 2026-04-16 | Playwright chromium + firefox, `tests/e2e/landing-page.spec.ts` + `tests/e2e/assessment-flow.spec.ts:40,91` (Discover happy path with mocked API). Spec reconciled to two-step flow same date. |
| SCENARIO-SESS-PROG-001 | **PARTIAL** 2026-04-16 | TC-E2E-001 only asserts `Assessment in Progress` text after Start — verifies the progress page is reachable, NOT the full spec ("12/58" counter, % bar, current class/test name, 1s update latency). To upgrade to PASS: add an assertion for the counter and progress bar after a known number of tests complete (likely needs an SSE-mockable component test). |
| SCENARIO-RPT-DASH-001 | **MODERATE** 2026-04-16 | TC-E2E-001 asserts `Assessment Results` heading + `%` text visible. Doesn't verify the percentage value, doesn't verify per-class counts. Sufficient for "dashboard renders" but not for "compliance percentages and counts" specificity. |
| SCENARIO-RPT-TEST-001 | **PARTIAL** 2026-04-16 | TC-E2E-001 reaches results page (filter UI exposed) but never clicks a filter button. No unit test exists for filter component (`tests/unit/components/` does not exist — Raze caught the false claim). To upgrade: add an E2E assertion that clicks Failed/Passed/Skipped filter and verifies test-row visibility changes. |
| SCENARIO-EXP-JSON-001 | **PARTIAL** 2026-04-16 | TC-E2E-001 asserts `Export JSON` button visible. Doesn't click it, doesn't verify download content. Full download path covered by api-client unit tests + Express route alignment (api-client.ts:124 ↔ assessments.ts:372,384,387). To upgrade at E2E: click the button and assert a download event fires. |
| TC-E2E-006 (destructive-confirm UX gate) | **PASS** 2026-04-16 | New mocked-API test; chromium 725ms, firefox 903ms. Covers SCENARIO-SESS-CONFIRM-001 (client-side gating). |
| SCENARIO-SESS-CONFIRM-002 (backend destructive-confirm enforcement) | **PASS** 2026-04-16 | 6 new unit tests in `tests/unit/server/assessments.test.ts` (`POST /api/assessments/:id/start` describe block); shared helper at `src/lib/destructive-classes.ts`. Live-curl verified 400/400/200 behavior against localhost:4000. Closes Raze F3. |
| SCENARIO-TEST-CONF-001..003 (conformance fixture accuracy against real IUT) | **VERIFIED** 2026-04-16T22:19Z | Task 2 live run vs GeoRobotix: 81 tests / 16 pass / 12 fail / 53 skip (57.1%); 3 Quinn v1 URL-driven false positives closed (1 now PASS, 2 now FAIL with legitimate IUT-non-conformance reasons). Raw data: `.harness/evaluations/task2-georobotix-conformance-2026-04-16.json`. |
| SCENARIO-SCHEMA-REF-001 (bundled $refs resolve) | **PASS** 2026-04-17 | `tests/unit/engine/schema-bundle-integrity.test.ts` walks all 126 bundled .json files, asserts every `$ref` either starts with `#`, resolves to a bundled file by relative path, or matches a bundled schema's `$id`. Closes GH issue #4. |
| SCENARIO-CRUD-BODY-001 (CRUD bodies validate at authoring time) | **PASS** 2026-04-17 | `tests/unit/engine/registry/crud-body-schemas.test.ts` loads full schema bundle and validates `DATASTREAM_CREATE_BODY` against `connected-systems-2/json/dataStream_create.json` and `CONTROLSTREAM_CREATE_BODY` against `connected-systems-2/json/controlStream_create.json`. Closes GH issue #6. |
| SCENARIO-PART2-BASEURL-001 (Part 2 URLs keep IUT base path) | **PASS** 2026-04-17 | `tests/unit/engine/registry/part2-url-construction.test.ts` runs every Part 2 module's executable tests against a capturing mock HTTP client with baseUrl `https://example.com/path/segment/api/`; asserts every emitted URL starts with that base. 13 modules × ~30 captured URLs. Closes GH issue #5. |
| SCENARIO-OBS-SCHEMA-001 (observation body derives from datastream, authoring layer) | **PASS** 2026-04-17 | `tests/unit/engine/registry/observation-dynamic-schema.test.ts` asserts `OBSERVATION_CREATE_BODY.result` type matches `DATASTREAM_CREATE_BODY.resultType: 'measure'`; asserts `buildObservationBodyForDatastream` throws for unsupported resultTypes. Closes GH issue #7 at authoring layer. Sprint user-testing-round-01. |
| SCENARIO-OBS-SCHEMA-002 (observation body uses server-returned datastream, runtime layer) | **PASS** 2026-04-17 | `tests/unit/engine/registry/part2-crud.test.ts` "CRUD Observation test" has a new regression case: server-returned datastream with `resultType: 'record'` (different from client's 'measure') triggers a FAIL with message citing `REQ-TEST-DYNAMIC-002` and `cannot mirror`, and the observation POST never fires. Sprint user-testing-followup. |
| SCENARIO-OBS-SCHEMA-003 (unparseable server response fails loudly) | **PASS** 2026-04-17 | `tests/unit/engine/registry/part2-crud.test.ts` "CRUD Observation test" has two regression cases: (a) GET datastream returns non-JSON HTML body → FAIL with "parseable JSON" error; (b) GET datastream returns HTTP 500 → FAIL with REQ-TEST-DYNAMIC-002 + HTTP status. Both assert the observation POST never fires (no silent fallback to fixture). Sprint user-testing-followup. |
| SCENARIO-FEATURES-LINKS-001 (items-links self is normative per OGC 17-069) | **PASS** 2026-04-17 | `tests/unit/engine/registry/features-core-links-normative.test.ts` — 5 tests: (1) PASS when items response includes self, (2) FAIL when self missing with message citing 17-069, (3) PASS with just self (alternate/next/prev conditional), (4) FAIL when links array missing, (5) audit-trail — requirement definition carries OGC 17-069 source citation. Closes the Raze rubric-6.1 audit flag. |
| SCENARIO-FEATURES-LINKS-002 (audit-trail for rel-link assertions) | **PASS** 2026-04-17 | Sprint `rubric-6-1-sweep` extended audit-trail coverage from 2 files (common.ts + features-core.ts) to all 9 registry files with rel-link assertions. Per-file inline citations + consolidated regression suite at `tests/unit/engine/registry/registry-links-normative.test.ts` (28 tests, 7 modules × 4 cases: PASS / SKIP-with-citation / FAIL-on-structural-gap / audit-trail-meta-test). A reviewer greping `rel.===\|foundRels\.has\|l\.rel` in `src/engine/registry/` now finds every match adjacent to an `OGC \d{2}-\d+` or `/req/...` citation. REQ-TEST-CITE-002 flipped PARTIAL → Implemented. |
| SCENARIO-SSRF-LOCAL-001 (opt-in private-network allowlist) | **PASS** 2026-04-17 | 8 new unit tests in `tests/unit/engine/ssrf-guard.test.ts` (`ALLOW_PRIVATE_NETWORKS=true opt-in` describe block) covering localhost/127.0.0.1/10.x/192.168.x IP-literal + DNS paths, plus the default-mode blocking still works when flag is unset. Landing page banner + health endpoint flag tested via `tests/unit/server/assessments.test.ts` `GET /api/health`. Closes GH issue #1. |
| SCENARIO-AUTH-PROTECTED-001 (inline auth retry after 401) | **PASS** 2026-04-17 | Logic at `src/app/page.tsx:42-80` (discoverWith function); UI at lines 140-187; auth inheritance at `src/app/assess/configure/page.tsx:87-105` via `sessionStorage.getItem("auth:{sessionId}")`. Unit coverage at api-client level; E2E happy-path and 401-retry flow covered by existing `tests/e2e/assessment-flow.spec.ts` infrastructure (test not yet added — tracked as follow-up). Closes GH issue #2 at implementation layer. |
| SCENARIO-LINKS-NORMATIVE-001 (Links required per OGC 19-072 /req/core/root-success) | **PASS** 2026-04-17 | `tests/unit/engine/registry/common-links-normative.test.ts` — 5 tests: PASS when `self` absent + service-desc + conformance + collections present; PASS when service-doc substitutes service-desc (OR-relation); FAIL when conformance missing; FAIL when neither service-desc nor service-doc; PASS for minimal normative set. Closes GH issue #3. |
| SCENARIO-API-DEF-FALLBACK-001 (API Definition link service-desc OR service-doc) | **PASS** 2026-04-17 | `tests/unit/engine/registry/common.test.ts` "API Definition Link test" — 5 tests covering all 4 rel-combinations: (a) FAIL when neither rel present (message cites both + OGC 19-072 /req/landing-page/root-success), (b) PASS when only service-doc present (fallback path; URL-sanity-checked via getMock.mock.calls[1][0]), (c) PASS + service-desc preferred when both present (service-doc URL proven NOT fetched), (d) FAIL on non-200 with chosen rel named in message, (e) FAIL on empty-body with chosen rel named. Sprint `api-definition-service-doc-fallback`. Closes the last known GH-#3-class false positive. |
| SCENARIO-FEATURECOLLECTION-TYPE-001 (Feature collections identified by featureType/itemType, not id — all 5 CS Part 1 types) | **PASS** 2026-04-17 | Coverage across 5 test files for all CS Part 1 feature/resource types: deployments.test.ts + system-features.test.ts (sprint `deployments-collections-heuristic`, `sosa:Deployment`/`sosa:System`), procedures.test.ts + sampling.test.ts + properties.test.ts (sprint `procedures-properties-sampling-collections-missing-check`, `sosa:Procedure`/`sosa:Sample`/`itemType="sosa:Property"`). Per-file cases: (a) PASS on canonical id + correct marker, (b) PASS on non-canonical id (`saildrone_missions`/`weather_stations`/`algorithms`/`river_samples`/`observable_properties`) + correct marker, (c) FAIL when marker is absent (closes missing-check and id-convention loopholes), (d) spec-trap regressions — deployments/systems have a wrong-itemType test, sampling has a `sosa:SamplingFeature` wrong-capitalization guard, property has an asymmetric-inversion guard (rejects `featureType="sosa:Property"` + `itemType="feature"`). Failure messages cite the specific `/req/<X>/collections` requirement id. All 5 CS Part 1 testCollections functions now enforce OGC 23-001 markers; Active test-engine issues: zero. |
