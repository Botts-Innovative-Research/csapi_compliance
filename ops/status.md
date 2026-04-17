# Operational Status — CS API Compliance Assessor

> Last updated: 2026-04-17T15:52Z | Sprint `api-definition-service-doc-fallback` CLOSED (Raze APPROVE 0.92, GAP-2 addressed same-turn). Ready for commit + push.

## ▶ Fresh-Session Entry Point

Read this file first. It is the single authoritative "where are we" doc. Everything below is enough to pick up work without reading other files. The trails you'll need are in `_bmad/`, `openspec/capabilities/`, and `.harness/evaluations/`.

## Current State (2026-04-17T15:45Z)

- **Gates**: `npx vitest run` → **986/986** PASS (52 files) · `npx tsc --noEmit` → **0 errors** · `npx eslint .` → **0 errors, 18 warnings** (all pre-existing unused-imports in test files, non-blocking).
- **v1.0 scope**: all 9 epics, 39 stories, 59 FRs implemented. Part 1 (OGC 23-001, 14 classes) + Part 2 (OGC 23-002, 14 classes). 27 registered conformance-test modules. 126 OGC schemas bundled.
- **Commit state**: last pushed commit is `7a2b654` on `main` (sprint rubric-6-1-sweep). Working tree carries the `api-definition-service-doc-fallback` sprint — **uncommitted**. See "Uncommitted Work" below.
- **All 4 BMAD gates operational**: Gate 1 self-check, Gate 2 Evaluator (Quinn), Gate 3 Reconciliation, Gate 4 Adversarial (Raze). Two Raze APPROVEs on 2026-04-17 (rubric-6-1-sweep 0.88, api-def-fallback pending).
- **REQ-TEST-CITE-002** status: Implemented across all 9 registry modules. **REQ-TEST-001 item 5** (API definition link) now honors OGC 19-072 `service-desc OR service-doc`, closing the last known GH-#3-class false positive in the test engine.
- **Known issues against the test engine**: none. All polish / roadmap items moved to § Remaining Work below.

## Suggested Next Action — Commit + push

Sprint `api-definition-service-doc-fallback` CLOSED 2026-04-17T15:52Z with Raze APPROVE 0.92. Raze fetched the upstream OGC 19-072 adoc independently and confirmed the `service-desc OR service-doc` OR-relation. GAP-2 (structural-check tradeoff prose in spec) addressed same-turn. Gate 1 re-verified post-fix: **986/986 vitest, 0 tsc, 18 eslint warnings (unchanged)**.

Suggested commit message: `Sprint api-definition-service-doc-fallback: testApiDefinition honors service-desc OR service-doc (Raze APPROVE 0.92)`.

After commit, the next sprint target is P0 #1 (Deployments heuristic citation, ~1 hour) per § Remaining Work.

## Uncommitted Work (sprint `api-definition-service-doc-fallback`)

Working tree contains:

- `src/engine/registry/common.ts` — REQ_API_DEFINITION description rewritten for service-desc OR service-doc; `testApiDefinition` now prefers service-desc, falls back to service-doc, FAILs only when neither present. Chosen-rel embedded in non-200 / empty-body failure messages.
- `tests/unit/engine/registry/common.test.ts` — 4 new + 1 updated tests in the "API Definition Link test" describe block: FAIL when neither rel present (cites OGC 19-072), PASS when only service-doc (fallback path URL-sanity-checked), PASS + service-desc preferred when both present (URL-sanity-checked), FAIL on non-200 with chosen-rel named, FAIL on empty-body with chosen-rel named.
- `openspec/capabilities/conformance-testing/spec.md` — REQ-TEST-001 item 5 rewritten; new SCENARIO-API-DEF-FALLBACK-001.
- `ops/status.md`, `ops/changelog.md`, `ops/known-issues.md`, `ops/metrics.md` — doc reconciliation (issue Active → Resolved; turn 43 added; sprint narrative).

**Decision pending**: spawn Raze first, then commit + push.

## Recent Sprints (audit trail — most recent first)

| Sprint | Close date | Raze verdict | Artifact |
|--------|------------|--------------|----------|
| `api-definition-service-doc-fallback` | 2026-04-17T15:52Z | **APPROVE 0.92** — GAP-2 (structural-check prose) addressed same-turn; GAP-1 (no live E2E) defensible | `.harness/evaluations/sprint-api-def-fallback-adversarial.yaml` |
| `rubric-6-1-sweep` | 2026-04-17T03:20Z | **APPROVE 0.88** — 7 registry files cited; 2 gaps + 1 caveat addressed same-turn | `.harness/evaluations/sprint-rubric-6-1-sweep-adversarial.yaml` |
| `user-testing-followup` | 2026-04-17T02:45Z | **GAPS_FOUND 0.86** (S11-01 APPROVE, S11-02 scope mismatch — closed by rubric-6-1-sweep) | `.harness/evaluations/sprint-user-testing-followup-adversarial.yaml` |
| `user-testing-round-01` | 2026-04-17T01:30Z | **APPROVE 0.88** — 7 GH issues closed + 5 framework improvements | `.harness/evaluations/sprint-user-testing-round-01-adversarial.yaml` |
| `retro-eval` (v1.0 retroactive QA) | 2026-04-16T22:40Z | **APPROVE 0.90** | `.harness/evaluations/sprint-retro-eval-final.yaml` |

Full changelog at `ops/changelog.md`. Traceability with per-scenario PASS/PARTIAL/MODERATE verdicts at `_bmad/traceability.md`.

## What's Working

- **Web app end-to-end**: Next.js + TS + Node 20 (nvm). Dev: `PORT=4000 CSAPI_PORT=4000 npm run dev`. Two-step flow landing → configure → progress → results → export.
- **Live-tested against GeoRobotix demo server** (`api.georobotix.io/ogc/t18/api`); discovery, conformance mapping, Part 1 + Part 2 CRUD all work.
- **Security**: SSRF guard + opt-in `ALLOW_PRIVATE_NETWORKS=true` escape for local dev; credential masking (all exports); rate limiter; security headers; destructive-confirm gate (client UX + backend HTTP 400 enforcement).
- **Auth flow**: protected IUTs get an inline auth-retry panel on the landing page; credentials persist via sessionStorage and pre-load on the configure page.
- **Orchestration**: `scripts/orchestrate.py` drives Gate 1 → Gate 2 → Gate 3 → Gate 4; CLI aliases `gate4` / `redteam` / `raze` for direct Gate 4 invocation.

## Known Issues

See `ops/known-issues.md` for full detail. Active summary:

- _(No active issues against the test engine as of 2026-04-17T15:45Z.)_
- **Requirement URIs use local paths** (`/req/ogcapi-features/items-links`), not canonical OGC (`/req/core/fc-links`). Low impact; polish item tracked under P2 below. Raze 2026-04-16 finding.
- **"Deployments in Collections" heuristic undocumented** — `deployments.ts:385-389` accepts `id === 'deployments' OR 'deployment' OR itemType includes 'deployment'`; spec justification not cited. Potential false positive; P0 below.
- **SWE Common Binary deep parsing not implemented** — surface-level check only. Low impact per design spec.
- **WebKit + Edge Playwright blocked** in WSL2 (missing system libs + no `microsoft-edge-stable`). Chromium + Firefox cover dominant share.
- **NFR-09 uptime monitoring deferred** — hosted deployment prerequisite.
- **18 pre-existing lint warnings** — unused test imports. Non-blocking; prefix with `_` or delete.

## Remaining Work

Prioritized list of open work. All items below are *post-v1.0*; the v1.0 scope (9 epics, 39 stories, 59 FRs) is complete.

### P0 — Active issues with identified fixes

1. **"Deployments in Collections" heuristic undocumented** (~1 hour spec read + citation)
   - `src/engine/registry/deployments.ts:385-389` matches `id === 'deployments' OR 'deployment' OR itemType includes 'deployment'`. Read OGC 23-001 `/req/deployment/collections` and either narrow to spec or cite why the relaxation is safe. Quinn flagged 2026-04-02; still unadjudicated.

2. **18 pre-existing lint warnings** (~15 min cleanup)
   - Unused test imports in test-runner.ts, assessments.test.ts, middleware.test.ts, discovery-service.test.ts, session-manager.test.ts, dependency-resolver.test.ts, test-runner.test.ts, i18n utilities, routes/assessments.ts. All are either delete or `_`-prefix.

### P1 — Scenario assertion-depth upgrades (traceability gaps)

4. **SESS-PROG-001 PARTIAL → PASS** (~1-2 hours)
   - Current TC-E2E-001 only asserts "Assessment in Progress" text appears; spec demands counter ("12/58"), progress bar %, current class/test names, 1s update latency.
   - To upgrade: add an SSE-mockable component test OR longer-running backend fixture so the progress page stays rendered for >1s before redirect.

5. **RPT-TEST-001 PARTIAL → PASS** (~1 hour)
   - Filter UI never clicked in any test. Add E2E assertion that clicks Failed/Passed/Skipped filter and verifies test-row visibility changes.

6. **EXP-JSON-001 PARTIAL → PASS** (~30 min)
   - Export-JSON button asserted visible but never clicked. Click and verify download event content via Playwright `page.waitForEvent('download')`.

7. **RPT-DASH-001 MODERATE → PASS** (~30 min)
   - Dashboard heading + "%" visible but not the actual percentage value or per-class counts. Assert numeric value present.

8. **111+ normal SCENARIO-* traceability** (~2-4 hours)
   - Only 15 critical scenarios are traced; ~126 total SCENARIO-* IDs defined across 7 capabilities. Add SCENARIO-* references in test file comments. Quinn's WARN-003 open since 2026-04-02.

### P2 — Framework / infra

9. **Hosted deployment + NFR-09 uptime monitoring** (0.5-1 day)
   - Pick a host (Fly.io, Railway, Render, etc.), deploy the Docker compose, validate SSE works through the host's proxy, wire up an uptime monitor (e.g. UptimeRobot). NFR-09 has no metric until this lands.

10. **Known-good/known-bad conformance fixture mock server** (1-2 days)
    - Currently, Raze's Section 6.3 "does the code correctly flag a non-conformant server?" check relies on manual GeoRobotix runs. A fixture server that serves intentionally-broken responses (missing required fields, wrong status codes, malformed GeoJSON) would let Raze's accuracy check be mechanical. High ROI for the BMAD framework.

11. **Requirement URI canonicalization** (~2-4 hours)
    - Current URIs use local paths like `/req/ogcapi-features/items-links`. Canonical OGC form is `http://www.opengis.net/spec/ogcapi-features-1/1.0/req/core/fc-links`. Batch-rewrite for cross-tool interop + OGC CITE TestResult alignment. Raze 2026-04-16 finding.

### P3 — Longer-term

12. **Part 3 Pub/Sub (WebSocket + MQTT)** — blocked on OGC publishing the spec. Currently in DRAFT at docs.ogc.org/DRAFTS.

13. **WebKit + Edge Playwright coverage** — requires sudo for `npx playwright install-deps webkit` and `apt install microsoft-edge-stable`, OR running in a hosted CI environment that has the system deps preinstalled.

14. **Second user-testing round** — 7 GH issues closed in round 1. Collect a new batch after deploying to hosted (#9) and fixing #1.

15. **SWE Common Binary deep parsing** — currently surface-level (Content-Type + non-empty body). Low ROI; defer unless Raze Section 6.3 flags false positives.

## Things NOT to Do

- **Don't re-spawn Raze/Quinn without new evidence**. Without new commits or test runs, you'll get the same verdict and waste tokens. The Gate 4 outputs from 2026-04-17 are the current state.
- **Don't edit `eslint.config.js`** unless the lint gate breaks. It's working (0 errors).
- **Don't revert `filtering.ts:307-312`** to the old fallback-URN behavior. That was a real correctness bug; SKIP-with-reason is correct.
- **Don't revive the old `.github/workflows/`**. CI is explicitly scoped out for v1.0. If you want CI later, scaffold fresh.
- **Don't re-add the `MINIMAL_OBSERVATION_BODY` alias**. `testCrudObservation` now derives the body from the server's datastream response at runtime — REQ-TEST-DYNAMIC-002.
- **Don't trust slices in docs elsewhere** (comments, old `TODO`s, stale sections of `ops/test-results.md`). Start here; follow references to authoritative files.

## Where to Read Deeper

| Need | File |
|------|------|
| Project overview + architecture | `_bmad/prd.md`, `_bmad/architecture.md` |
| BMAD workflow + gates | `_bmad/workflow.md` |
| Agent role definitions | `_bmad/agents/*.md` (Raze at `adversarial-reviewer.md`) |
| Capability specs with REQs/SCENARIOs | `openspec/capabilities/*/spec.md` |
| Per-FR implementation status | `_bmad/traceability.md` |
| Sprint contracts | `.harness/contracts/*.yaml` |
| Gate verdicts (audit trail) | `.harness/evaluations/*.yaml` |
| GitHub-issues audit methodology | `_bmad/github-issues-audit.md` |
| Server + credentials | `ops/server.md` |
| Recent work | `ops/changelog.md` |
| Test/lint/typecheck state | `ops/test-results.md` |
| Token + cost per session | `ops/metrics.md` |
