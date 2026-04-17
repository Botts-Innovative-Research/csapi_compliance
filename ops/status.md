# Operational Status — CS API Compliance Assessor

> Last updated: 2026-04-17T19:22Z | Sprint `e2e-assertion-depth-batch` CLOSED — 3 P1 scenarios upgraded PARTIAL/MODERATE → PASS (RPT-DASH-001, RPT-TEST-001, EXP-JSON-001). TC-E2E-001 extended, live-verified on chromium + firefox against GeoRobotix. Ready for commit + push.

## ▶ Fresh-Session Entry Point

Read this file first. It is the single authoritative "where are we" doc. Everything below is enough to pick up work without reading other files. The trails you'll need are in `_bmad/`, `openspec/capabilities/`, and `.harness/evaluations/`.

## Current State (2026-04-17T17:45Z)

- **Gates**: `npx vitest run` → **1003/1003** PASS (52 files) · `npx tsc --noEmit` → **0 errors** · `npx eslint .` → **0 errors, 0 warnings** (18 pre-existing warnings cleaned in sprint `lint-warnings-cleanup` 2026-04-17T18:02Z).
- **v1.0 scope**: all 9 epics, 39 stories, 59 FRs implemented. Part 1 (OGC 23-001, 14 classes) + Part 2 (OGC 23-002, 14 classes). 27 registered conformance-test modules. 126 OGC schemas bundled.
- **Commit state**: last pushed commit is `561f39e` on `main` (sprint deployments-collections-heuristic). Working tree carries the `procedures-properties-sampling-collections-missing-check` sprint — **uncommitted**. See "Uncommitted Work" below.
- **All 4 BMAD gates operational**: Three Raze APPROVEs on 2026-04-17 (rubric-6-1-sweep 0.88, api-def-fallback 0.92, deployments-collections-heuristic 0.93). Raze pending for this sprint.
- **Collection-type identification (ALL 5 CS Part 1 feature types)**: systems → `featureType="sosa:System"`, deployments → `featureType="sosa:Deployment"`, procedures → `featureType="sosa:Procedure"`, sampling features → `featureType="sosa:Sample"` (shorter form, spec-trap guarded), properties → `itemType="sosa:Property"` (asymmetric, trap-guarded). All per OGC 23-001 `/req/<X>/collections`.
- **Known issues against the test engine**: none. Active section of `ops/known-issues.md` is empty.

## Suggested Next Action — Commit + push

Sprint `e2e-assertion-depth-batch` CLOSED 2026-04-17T19:22Z. 3 P1 scenario upgrades (RPT-DASH-001 / RPT-TEST-001 / EXP-JSON-001). Live-verified 14/14 on chromium + firefox against GeoRobotix. No Raze — E2E assertion-depth work follows established Playwright patterns, live-verified on 2 browsers, no spec reinterpretation.

Suggested commit message: `Sprint e2e-assertion-depth-batch: 3 P1 scenarios PARTIAL/MODERATE → PASS (14/14 live E2E verified)`.

After commit, remaining P1 assertion-depth work: SESS-PROG-001 (~1-2h; needs SSE-mockable component test). Or pivot to P1 #5 (111+ SCENARIO-\* traceability, ~2-4h).

## Uncommitted Work (sprint `e2e-assertion-depth-batch`)

- `tests/e2e/assessment-flow.spec.ts` — TC-E2E-001 extended with 3 assertion-depth upgrades (RPT-DASH-001 / RPT-TEST-001 / EXP-JSON-001). +61 / -3.
- `_bmad/traceability.md` — 3 scenarios flipped to PASS with dated rationale + E2E evidence.
- `ops/status.md`, `ops/changelog.md`, `ops/metrics.md` — sprint narrative.

**Note**: no Raze review — E2E assertion-depth work live-verified twice (chromium + firefox), follows established Playwright patterns, no spec reinterpretation, no behavior changes. See changelog for justification.

## Prior Uncommitted Work (sprint `lint-warnings-cleanup`) — committed as `d933326`

Working tree contains:
- 12 unused imports deleted across `src/app/assess/[id]/results/page.tsx`, `src/engine/registry/{common,crud,part2-common,update}.ts`, `src/engine/result-aggregator.ts`, `src/engine/test-runner.ts`, `tests/unit/engine/test-runner.test.ts`, `tests/unit/server/{assessments,middleware}.test.ts`.
- 6 unused-var fixes: `scripts/smoke-test.ts` (`_id` destructuring), `src/engine/export-engine.ts` (delete dead `maskedExchanges` + rename param `_auth` + add NOTE explaining REQ-EXP-003 vacuously holds for PDF), `src/server/routes/assessments.ts` (ES2019 optional catch), `tests/unit/engine/dependency-resolver.test.ts` (delete unused `classD`), `tests/unit/engine/discovery-service.test.ts` (delete dead `callCount` instrumentation), `tests/unit/engine/session-manager.test.ts` (`_s1` — load-bearing for count).
- `ops/status.md`, `ops/changelog.md`, `ops/metrics.md` — sprint narrative + refreshed gate numbers.

**Note**: no Raze review — see changelog for justification.

## Prior Uncommitted Work (sprint `procedures-properties-sampling-collections-missing-check`) — committed as `bd17419`

Working tree contains:

- `src/engine/registry/procedures.ts` — added `featureType === "sosa:Procedure"` check per OGC 23-001 `/req/procedure/collections` with inline citation.
- `src/engine/registry/sampling.ts` — added `featureType === "sosa:Sample"` check (spec uses shorter form, NOT `"sosa:SamplingFeature"`) per `/req/sf/collections` with inline citation + spec-trap note in failure message.
- `src/engine/registry/properties.ts` — added `itemType === "sosa:Property"` check (ASYMMETRIC pattern — no featureType) per `/req/property/collections` with inline citation + asymmetric-pattern note.
- `tests/unit/engine/registry/procedures.test.ts` — 3 new + 1 updated.
- `tests/unit/engine/registry/sampling.test.ts` — 4 new + 1 updated (extra test guards against the `sosa:SamplingFeature` wrong-capitalization trap).
- `tests/unit/engine/registry/properties.test.ts` — 4 new + 1 updated (extra test guards against the asymmetric-pattern inversion: `featureType="sosa:Property"` + `itemType="feature"`).
- `openspec/capabilities/conformance-testing/spec.md` — REQ-TEST-008/009/010 item 1 rewritten; SCENARIO-FEATURECOLLECTION-TYPE-001 extended to a 5-row marker table.
- `ops/status.md`, `ops/changelog.md`, `ops/known-issues.md`, `ops/metrics.md` — doc reconciliation (Active section now empty for test engine; turn 45 added).

**Decision pending**: spawn Raze first, then commit + push.

## Recent Sprints (audit trail — most recent first)

| Sprint | Close date | Raze verdict | Artifact |
|--------|------------|--------------|----------|
| `procedures-properties-sampling-collections-missing-check` | 2026-04-17T17:57Z | **GAPS_FOUND 0.83** — 3 ops-doc gaps (stale Active entries, wrong count, missing procedures trap-guard parity) all addressed same-turn; code APPROVE-grade | `.harness/evaluations/sprint-procedures-properties-sampling-collections-missing-check-adversarial.yaml` |
| `deployments-collections-heuristic` | 2026-04-17T16:35Z | **APPROVE 0.93** — GAP-2 (half-conformant itemType/no featureType) addressed same-turn | `.harness/evaluations/sprint-deployments-collections-heuristic-adversarial.yaml` |
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

- _(No active test-engine issues as of 2026-04-17T17:45Z — all 5 CS Part 1 testCollections functions enforce OGC 23-001 markers.)_
- **Requirement URIs use local paths** (`/req/ogcapi-features/items-links`), not canonical OGC (`/req/core/fc-links`). Low impact; polish item tracked under P2 below. Raze 2026-04-16 finding.
- **SWE Common Binary deep parsing not implemented** — surface-level check only. Low impact per design spec.
- **WebKit + Edge Playwright blocked** in WSL2 (missing system libs + no `microsoft-edge-stable`). Chromium + Firefox cover dominant share.
- **NFR-09 uptime monitoring deferred** — hosted deployment prerequisite.
- ~~**18 pre-existing lint warnings**~~ — RESOLVED 2026-04-17T18:02Z (sprint `lint-warnings-cleanup`).

## Remaining Work

Prioritized list of open work. All items below are *post-v1.0*; the v1.0 scope (9 epics, 39 stories, 59 FRs) is complete.

### P0 — Active issues with identified fixes

_(None remaining. All active test-engine and lint/typing issues are resolved as of 2026-04-17T18:02Z.)_

### P1 — Scenario assertion-depth upgrades (traceability gaps)

4. **SESS-PROG-001 PARTIAL → PASS** (~1-2 hours) — LAST ASSERTION-DEPTH ITEM
   - Current TC-E2E-001 only asserts "Assessment in Progress" text appears; spec demands counter ("12/58"), progress bar %, current class/test names, 1s update latency.
   - To upgrade: add an SSE-mockable component test OR longer-running backend fixture so the progress page stays rendered for >1s before redirect.

5. ~~**RPT-TEST-001 PARTIAL → PASS**~~ — RESOLVED 2026-04-17T19:20Z (sprint `e2e-assertion-depth-batch`).

6. ~~**EXP-JSON-001 PARTIAL → PASS**~~ — RESOLVED 2026-04-17T19:20Z (sprint `e2e-assertion-depth-batch`).

7. ~~**RPT-DASH-001 MODERATE → PASS**~~ — RESOLVED 2026-04-17T19:20Z (sprint `e2e-assertion-depth-batch`).

8. **111+ normal SCENARIO-\* traceability** (~2-4 hours)
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
