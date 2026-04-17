# Operational Status — CS API Compliance Assessor

> Last updated: 2026-04-17T02:33Z | Session `4efc7a70` closed; ready for fresh session

## ▶ Fresh-Session Entry Point

Read this file first. It is the single authoritative "where are we" doc. Everything below is enough to pick up work without reading other files. The trails you'll need are in `_bmad/`, `openspec/capabilities/`, and `.harness/evaluations/`.

## Current State (2026-04-17T02:30Z)

- **Gates**: `npx vitest run` → **955/955** PASS (51 files) · `npx tsc --noEmit` → **0 errors** · `npx eslint .` → **0 errors, 18 warnings** (all pre-existing unused-imports in test files, non-blocking).
- **v1.0 scope**: all 9 epics, 39 stories, 59 FRs implemented. Part 1 (OGC 23-001, 14 classes) + Part 2 (OGC 23-002, 14 classes). 27 registered conformance-test modules. 126 OGC schemas bundled.
- **Commit state**: last pushed commit is `1536fbb` on `main` (retro-eval close + sprint user-testing-round-01). **Sprint user-testing-followup work is uncommitted** in the working tree — see "Uncommitted Work" section below before making changes.
- **All 4 BMAD gates operational**: Gate 1 self-check, Gate 2 Evaluator (Quinn), Gate 3 Reconciliation, Gate 4 Adversarial (Raze). Gate 4 is invocable directly as a sub-agent per CLAUDE.md Anthropic augmentation.

## Suggested Next Action — Sprint `rubric-6-1-sweep`

**Scope** (estimated 2-4 hours): 7 registry files still have `rel=*` link assertions lacking normative-source citations. REQ-TEST-CITE-002 (in `openspec/capabilities/conformance-testing/spec.md`) is a project-wide mandate, but only `common.ts` and `features-core.ts` were audited in sprint user-testing-followup. The remaining files and Raze-identified line numbers:

| File | Line | Rel asserted |
|------|------|--------------|
| `src/engine/registry/procedures.ts` | 245 | `rel="self"` on procedure resources |
| `src/engine/registry/properties.ts` | 236 | `rel="self"` on property resources |
| `src/engine/registry/sampling.ts` | 245 | `rel="self"` on sampling feature resources |
| `src/engine/registry/deployments.ts` | 250 | `rel="self"` on deployment resources |
| `src/engine/registry/system-features.ts` | 260 | `rel="self"` on system resources |
| `src/engine/registry/subsystems.ts` | 338-342 | `rel="self"` on subsystem resources |
| `src/engine/registry/subdeployments.ts` | 339 | `rel="self"` on subdeployment resources |

**Method** per REQ-TEST-CITE-002 + Raze rubric 6.1:
1. For each assertion, find the normative text in the relevant OGC spec (CS Part 1 OGC 23-001 for most; the conformance-test modules cite `/req/...` identifiers that map to spec sections).
2. If a SHALL/MUST/REQUIRED clause exists → add a citation comment above the assertion referencing the spec section (e.g., `OGC 23-001 §7.4 /req/system/self-link`) and update the failure-message to include it. Precedent: `features-core.ts:77-97,623-626`.
3. If only an illustrative example → downgrade the assertion to SKIP-with-reason. Precedent: GH #3 fix in `common.ts`.
4. Add regression tests following the pattern of `tests/unit/engine/registry/features-core-links-normative.test.ts` (5 tests: present, absent, audit-trail meta-test, edge cases).
5. Update `openspec/capabilities/conformance-testing/spec.md` REQ-TEST-CITE-002 status from PARTIAL to Implemented.
6. Spawn Raze for verdict.

**Exit criterion**: `grep -n "rel=" src/engine/registry/` shows every match adjacent to either a `/req/...` identifier or an `OGC \d{2}-\d+` citation.

## Uncommitted Work (sprint `user-testing-followup`)

Before editing anything, check `git status`. The working tree contains uncommitted changes from sprint user-testing-followup:

- `src/engine/registry/part2-crud.ts` — added runtime datastream→observation coupling (REQ-TEST-DYNAMIC-002)
- `src/engine/registry/features-core.ts` — added OGC 17-069 source citations
- `tests/unit/engine/registry/features-core-links-normative.test.ts` (new, 5 tests)
- `tests/unit/engine/registry/part2-crud.test.ts` — 4 new tests + 1 updated
- `openspec/capabilities/dynamic-data-testing/spec.md` — REQ-TEST-DYNAMIC-002 + SCENARIO-OBS-SCHEMA-002/003
- `openspec/capabilities/conformance-testing/spec.md` — REQ-TEST-002.5, REQ-TEST-CITE-002, SCENARIO-FEATURES-LINKS-001/002
- `.harness/contracts/sprint-user-testing-followup.yaml` (new)
- `.harness/evaluations/sprint-user-testing-followup-adversarial.yaml` (new — Raze GAPS_FOUND 0.86 verdict)
- `ops/status.md`, `ops/changelog.md`, `ops/known-issues.md`, `_bmad/traceability.md`, `ops/metrics.md` — doc reconciliation

**Decision pending from user**: commit + push these, or iterate first. Either is safe. If committing, suggested message: `Sprint user-testing-followup: runtime coupling + features-core audit (Raze GAPS_FOUND 0.86; rubric-6-1 sweep logged)`.

## Recent Sprints (audit trail — most recent first)

| Sprint | Close date | Raze verdict | Artifact |
|--------|------------|--------------|----------|
| `user-testing-followup` | 2026-04-17T02:45Z | **GAPS_FOUND 0.86** (S11-01 APPROVE, S11-02 scope mismatch) | `.harness/evaluations/sprint-user-testing-followup-adversarial.yaml` |
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

- **`rubric-6-1-sweep`** — 7 registry files need rel-link source citations per REQ-TEST-CITE-002 (see "Suggested Next Action" above).
- **Requirement URIs use local paths** (`/req/ogcapi-features/items-links`), not canonical OGC (`/req/core/fc-links`). Low impact; not blocking. Raze 2026-04-16 finding.
- **"Deployments in Collections" heuristic undocumented** — `deployments.ts:385-389` accepts `id === 'deployments' OR 'deployment' OR itemType includes 'deployment'`; spec justification not cited. Potential false positive.
- **SWE Common Binary deep parsing not implemented** — surface-level check only. Low impact per design spec.
- **WebKit + Edge Playwright blocked** in WSL2 (missing system libs + no `microsoft-edge-stable`). Chromium + Firefox cover dominant share.
- **NFR-09 uptime monitoring deferred** — hosted deployment prerequisite.
- **18 pre-existing lint warnings** — unused test imports. Non-blocking; prefix with `_` or delete.

## What's Next (after `rubric-6-1-sweep`)

1. Deploy to hosted environment, validate uptime (NFR-09)
2. Build known-good/known-bad conformance fixture mock server (makes Raze's conformance-correctness checks systematic rather than per-run manual verification against GeoRobotix)
3. Add Part 3 (Pub/Sub: WebSocket + MQTT) when OGC publishes the standard
4. Optional polish: Export-JSON click-and-verify E2E, SSE-mockable component test for SESS-PROG-001 (assertion-depth upgrade from PARTIAL → PASS), 111+ normal SCENARIO-* traceability, 18 lint warnings cleanup, second user-testing round

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
