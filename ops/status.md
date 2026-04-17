# Operational Status — CS API Compliance Assessor

> Last updated: 2026-04-17T03:20Z | Sprint `rubric-6-1-sweep` CLOSED (Raze APPROVE 0.88, 2 gaps + 1 caveat addressed same-turn). Ready for commit + push.

## ▶ Fresh-Session Entry Point

Read this file first. It is the single authoritative "where are we" doc. Everything below is enough to pick up work without reading other files. The trails you'll need are in `_bmad/`, `openspec/capabilities/`, and `.harness/evaluations/`.

## Current State (2026-04-17T03:20Z)

- **Gates**: `npx vitest run` → **983/983** PASS (52 files) · `npx tsc --noEmit` → **0 errors** · `npx eslint .` → **0 errors, 18 warnings** (all pre-existing unused-imports in test files, non-blocking).
- **v1.0 scope**: all 9 epics, 39 stories, 59 FRs implemented. Part 1 (OGC 23-001, 14 classes) + Part 2 (OGC 23-002, 14 classes). 27 registered conformance-test modules. 126 OGC schemas bundled.
- **Commit state**: last pushed commit is `780fdc1` on `main` (sprint user-testing-followup). Working tree carries the `rubric-6-1-sweep` sprint changes — **uncommitted**. See "Uncommitted Work" below.
- **All 4 BMAD gates operational**: Gate 1 self-check, Gate 2 Evaluator (Quinn), Gate 3 Reconciliation, Gate 4 Adversarial (Raze). Gate 4 ran same-session against `rubric-6-1-sweep` → APPROVE 0.88.
- **REQ-TEST-CITE-002** status: Implemented. All 9 registry modules with rel-link assertions carry adjacent source citations; 28-test `registry-links-normative.test.ts` locks in the pattern with an audit-trail meta-test per module.

## Suggested Next Action — Commit + push rubric-6-1-sweep, then tackle `api-definition-service-doc-fallback`

Sprint `rubric-6-1-sweep` closed 2026-04-17T03:20Z with Raze APPROVE 0.88 (`.harness/evaluations/sprint-rubric-6-1-sweep-adversarial.yaml`). Raze independently re-fetched the OGC 23-001 requirement files and verified every citation the Generator wrote — no paraphrasing. 2 gaps (GAP-1 adjacent-comment at `common.ts:360`, GAP-2 URI-path `/req/core/root-success` → `/req/landing-page/root-success`) and 1 caveat (missing `req_recursive_assoc.adoc` upstream) addressed same-turn. Gate 1 re-verified post-fix: **983/983 vitest, 0 tsc, 18 eslint warnings (unchanged)**.

Suggested commit message: `Sprint rubric-6-1-sweep: REQ-TEST-CITE-002 → Implemented (Raze APPROVE 0.88; 7 registry files cited; +28 regression tests)`.

After commit, the next sprint target is `api-definition-service-doc-fallback` (~30 min + 2 regression tests). Fix at `src/engine/registry/common.ts:359-372`: when `rel="service-desc"` is absent, fall back to `rel="service-doc"` with a relaxed structural check (service-doc is HTML-docs, not OpenAPI). Closes the last known false-positive of the GH #3 class.

## Uncommitted Work (sprint `rubric-6-1-sweep`, 24 files)

Working tree contains the rubric-6.1 sweep + Raze same-turn gap fixes:

- `src/engine/registry/procedures.ts` — citation + FAIL→SKIP downgrade for rel="self"
- `src/engine/registry/properties.ts` — citation + FAIL→SKIP downgrade for rel="self"
- `src/engine/registry/sampling.ts` — citation + FAIL→SKIP downgrade for rel="self"
- `src/engine/registry/deployments.ts` — citation + FAIL→SKIP downgrade for rel="self"
- `src/engine/registry/system-features.ts` — citation + FAIL→SKIP downgrade for rel="self"
- `src/engine/registry/subsystems.ts` — citation + FAIL→SKIP for parent-link + Raze caveat about missing upstream req_recursive_assoc.adoc
- `src/engine/registry/subdeployments.ts` — citation + FAIL→SKIP for parent-link + Raze caveat about missing upstream req_recursive_assoc.adoc
- `src/engine/registry/common.ts` — REQ_API_DEFINITION citation block (19-072 `/req/landing-page/root-success`, known-deviation note) + Raze GAP-1 adjacent-comment fix at line 360 + Raze GAP-2 URI-path corrections (`/req/core/root-success` → `/req/landing-page/root-success` ×3)
- `tests/unit/engine/registry/registry-links-normative.test.ts` (new, 28 tests)
- `tests/unit/engine/registry/{procedures,properties,sampling,deployments,system-features,subsystems,subdeployments}.test.ts` — "fails when missing" → "SKIPs when missing (non-normative per OGC 23-001 rubric-6.1 audit)"
- `openspec/capabilities/conformance-testing/spec.md` — REQ-TEST-CITE-002 PARTIAL → Implemented + Verification stanza
- `ops/status.md`, `ops/changelog.md`, `ops/known-issues.md`, `ops/metrics.md`, `ops/test-results.md`, `_bmad/traceability.md` — doc reconciliation + Raze verdict + same-turn gap narrative + test-count refresh (946 → 983)
- `.harness/evaluations/sprint-rubric-6-1-sweep-adversarial.yaml` (new, Raze APPROVE 0.88 artifact)

**Decision pending from user**: commit + push (Raze has APPROVEd, gates are green, work is safely reviewable).

## Recent Sprints (audit trail — most recent first)

| Sprint | Close date | Raze verdict | Artifact |
|--------|------------|--------------|----------|
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

- **`api-definition-service-doc-fallback`** (NEW 2026-04-17, medium) — `common.ts:359-372` only probes `rel="service-desc"`; OGC 19-072 `/req/landing-page/root-success` permits `service-desc` OR `service-doc`. False-positive FAIL on servers that expose only `service-doc`. ~30 min fix + 2 regression tests.
- **Requirement URIs use local paths** (`/req/ogcapi-features/items-links`), not canonical OGC (`/req/core/fc-links`). Low impact; not blocking. Raze 2026-04-16 finding.
- **"Deployments in Collections" heuristic undocumented** — `deployments.ts:385-389` accepts `id === 'deployments' OR 'deployment' OR itemType includes 'deployment'`; spec justification not cited. Potential false positive.
- **SWE Common Binary deep parsing not implemented** — surface-level check only. Low impact per design spec.
- **WebKit + Edge Playwright blocked** in WSL2 (missing system libs + no `microsoft-edge-stable`). Chromium + Firefox cover dominant share.
- **NFR-09 uptime monitoring deferred** — hosted deployment prerequisite.
- **18 pre-existing lint warnings** — unused test imports. Non-blocking; prefix with `_` or delete.

## Remaining Work

Prioritized list of open work. All items below are *post-v1.0*; the v1.0 scope (9 epics, 39 stories, 59 FRs) is complete.

### P0 — Active issues with identified fixes

1. **`api-definition-service-doc-fallback`** (~30 min + 2 regression tests)
   - `src/engine/registry/common.ts:359-372` currently only finds `rel="service-desc"`. When absent, fall back to `rel="service-doc"` with relaxed structural check (service-doc is HTML-docs, not OpenAPI).
   - Fix closes the last known false-positive of the GH #3 class.
   - Add regression tests to `tests/unit/engine/registry/common.test.ts` or `common-links-normative.test.ts` — (a) PASS when only service-doc present, (b) PASS when only service-desc present, (c) FAIL when neither.

2. **"Deployments in Collections" heuristic undocumented** (~1 hour spec read + citation)
   - `src/engine/registry/deployments.ts:385-389` matches `id === 'deployments' OR 'deployment' OR itemType includes 'deployment'`. Read OGC 23-001 `/req/deployment/collections` and either narrow to spec or cite why the relaxation is safe. Quinn flagged 2026-04-02; still unadjudicated.

3. **18 pre-existing lint warnings** (~15 min cleanup)
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
