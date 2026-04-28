# Operational Status — CS API Compliance Assessor

> Last updated: 2026-04-28T19:35Z | **Project pivoted 2026-04-27 from Next.js v1.0 web app → Java/TestNG TeamEngine ETS.** v1.0 frozen + tagged `v1.0-frozen` at `ab53658` (REQ-ETS-WEBAPP-FREEZE-001 ✅). **Sprint ets-01 — S-ETS-01-01 ✅ closed; S-ETS-01-02 ✅ closed; S-ETS-01-03 ✅ Generator complete (Sprint 1 functionally complete: 9/9 success_criteria, awaiting Quinn+Raze for S-ETS-01-03)**. Sibling repo [`Botts-Innovative-Research/ets-ogcapi-connectedsystems10`](https://github.com/Botts-Innovative-Research/ets-ogcapi-connectedsystems10) at HEAD `8aeffbf`, 42 commits. **Smoke result**: TeamEngine SPI-routed run against GeoRobotix → `total="12" passed="12" failed="0" skipped="0"` (matches direct-TestNG S-ETS-01-02 outcome — confirms SPI route doesn't perturb assertion logic). `scripts/smoke-test.sh` exits 0 in ~10s; idempotent. Container log clean of ERROR/SEVERE during startup. **🚨 MAJOR SPEC DRIFT (REQ-ETS-TEAMENGINE-003)**: Dana discovered (a) `ogccite/teamengine-production:5.6.1` tag does NOT exist on Docker Hub (only `:latest` and `:1.0-SNAPSHOT`) and (b) the production image runs JDK 8 → `UnsupportedClassVersionError` when loading our JDK 17 ETS jar. Implemented resolution: assemble TE 5.6.1 manually on `tomcat:8.5-jre17` via downloaded WAR + common-libs + console base from Maven Central + JAXB jars + filtered deps closure. Identical assertion outcomes (12/12 PASS). Documented at new repo `ops/server.md` "Docker smoke test" section with empirical evidence trail. Suggested spec amendment for next planning cycle: REQ-ETS-TEAMENGINE-003 wording → "...SHALL produce a TeamEngine 5.6.1 webapp on a JDK 17 base image". **Critical question for gates**: is this deviation acceptable, or is there a working `ogccite/teamengine-production`-based path Dana missed? **Next action**: spawn **Quinn (Gate 3.5)** + **Raze (Gate 4)** in parallel for S-ETS-01-03 (mandatory per sprint contract `gate_4_required: true, force_run: true`). Both gates should specifically weigh the base-image deviation, the smoke-test.sh log filter (utf-8 SEVERE tolerance), and the `mvn dependency:copy-dependencies` runtime workflow. After both gates close, **Sprint 1 is complete** and Sprint 2 cleanup story (carryover: GAP-1 EtsAssert refactor + GAP-2 URI form drift sweep + CI workflow `git mv` + logback/CredentialMaskingFilter + REQ-ETS-TEAMENGINE-003 spec amendment) becomes the next planning input. **Canonical jar sha256 at `ea2c91f`** (the gates' evaluation HEAD): `b1ffdc8eeed0dd777af243e0c77812391c60468c17979405dca320de9d20f680` — verified by Raze across 3 fresh-clone builds + 1 worktree rebuild (Dana's earlier-reported `c4a80294...` was the build at HEAD `b249aa1`; buildnumber-maven-plugin embeds commit SHA in manifest, so per-commit jar hash variance is expected metadata-only — the build IS reproducible at any single HEAD). Layout refactored (`conformance.core.*` + `listener.*` subpackages); 3 Core conformance classes with 12 @Test methods, **all 12 PASS against GeoRobotix** (TestNG XML at new repo `ops/test-results/s-ets-01-02-georobotix-smoke-2026-04-28.{xml,html}`); 5 Sprint 1 Core SCENARIOs PASS (LANDING-001, CONFORMANCE-001, RESOURCE-SHAPE-001, LINKS-NORMATIVE-001, API-DEF-FALLBACK-001); v1.0 GH#3 fix sentinel + service-desc/service-doc fallback both verified by Raze; ResourceShapeTests OGC Common Part 2→Part 1 URI typo fixed in commit `1fdfe07`. **Sprint 2 cleanup follow-ups** (deferred from S-ETS-01-02 gates): (a) refactor 21 bare `throw new AssertionError()` → `EtsAssert.failWithUri()` helper (Quinn+Raze GAP-1); (b) reconcile @Test description URIs to OGC canonical `/req/<class>/<subreq>` form across spec.md + traceability.md + Java tests (Quinn+Raze GAP-2, ~30-40 sites); (c) `gh auth refresh -s workflow` then `git mv ci/github-workflows-build.yml .github/workflows/build.yml`; (d) `logback.xml` + CredentialMaskingFilter for auth path. **Next action**: **S-ETS-01-03** (final Sprint 1 story — TeamEngine 5.6.1 Docker smoke: Dockerfile, docker-compose, smoke-test.sh, container-load verification per architect-handoff readiness `CONCERNS` list of 4 SPI pitfalls Quinn must verify).

## ▶ Fresh-Session Entry Point

Read this file first. It is the single authoritative "where are we" doc. The pivot trails: `_bmad/architecture.md` (v2.0 ETS), `_bmad/architecture-v1-frozen.md` (v1.0 archive), `_bmad/adrs/ADR-001..005`, `openspec/capabilities/ets-ogcapi-connectedsystems/{spec.md,design.md}`, `.harness/contracts/sprint-ets-01.yaml`, `.harness/handoffs/{discovery,planner,architect}-handoff.yaml`, and `epics/epic-ets-01..07-*.md` + `epics/stories/s-ets-01-0{1,2,3}-*.md`.

## Current State (2026-04-28T14:42Z)

### Pivot summary

- **What changed**: from a TypeScript/Next.js single-page web app (v1.0, the deliverable through 2026-04-17) to an OGC-compliant Java/TestNG Executable Test Suite that integrates with TeamEngine 5.6.x (currently 5.6.1) for CITE-track certification. User-gated 2026-04-27.
- **Why**: TeamEngine SPI is Java-only; the OGC certification path requires a Java ETS in the `org.opengis.cite:ets-*` lineage. The v1.0 web app is repositioned as a "developer pre-flight tool, not certification-track" and frozen.
- **Frozen artifacts**: v1.0 architecture archived at `_bmad/architecture-v1-frozen.md`. Six v1.0 capability specs marked Frozen via frontmatter (conformance-testing, dynamic-data-testing, endpoint-discovery, export, progress-session, reporting; request-capture + test-engine likewise).
- **New target repo**: `github.com/<org>/ets-ogcapi-connectedsystems10` (per ADR-003 — note: NOT `connectedsystems-1`, see ADR for rejection rationale). Sibling repo with no code-level coupling to `csapi_compliance/` (ADR-005). Schemas verbatim-copied at scaffold time (ADR-002).

### Sprint `ets-01` gate progress

| BMAD Gate | Agent | Status | Authoritative artifact |
|-----------|-------|--------|------------------------|
| Gate 1 — Discovery | Mary | ✅ Complete 2026-04-27 | `.harness/handoffs/discovery-handoff.yaml` |
| Gate 2 — Planner | Pat | ✅ Complete 2026-04-27 (post-reconciliation 2026-04-28) | `.harness/handoffs/planner-handoff.yaml`, `.harness/contracts/sprint-ets-01.yaml`, `_bmad/prd.md` v2.0, `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` |
| Gate 3 — Architect | Alex | ✅ Complete 2026-04-27 (confidence 0.83) | `.harness/handoffs/architect-handoff.yaml`, `_bmad/architecture.md` v2.0, `_bmad/adrs/ADR-001..005`, `openspec/capabilities/ets-ogcapi-connectedsystems/design.md` |
| **Generator** | Dana | ❌ Not started | (will write `pom.xml`, Java sources, CTL wrapper, Dockerfile, smoke-test.sh in the new repo) |
| Gate 3.5 — Evaluator | Quinn | n/a | (fires after Generator output exists) |
| Gate 4 — Adversarial | Raze | n/a (`gate_4_required: true, force_run: true` per contract) | (fires after Quinn) |

### Architecture v2.0 — concrete decisions

- **Toolchain**: JDK 17 + Maven 3.9 + TestNG + REST Assured + Kaizen `openapi-parser` (Sprint 2+) + everit-json-schema (Sprint 1 Core, transitive via ets-common) + `org.opengis.cite:ets-common:17` parent + `slf4j-api` + `logback-classic`.
- **Maven coordinates** (ADR-003 — supersedes Pat's PRD strings): groupId `org.opengis.cite`, artifactId `ets-ogcapi-connectedsystems10`, ets-code `ogcapi-connectedsystems10`, Java root `org.opengis.cite.ogcapiconnectedsystems10`.
- **TeamEngine SPI** (ADR-001): five artifacts mirror `ets-ogcapi-features10@master` verbatim — `META-INF/services/com.occamlab.te.spi.jaxrs.TestSuiteController` (single FQCN line), `TestNGController`, `ets.properties`, `testng.xml`, CTL wrapper `src/main/scripts/ctl/ogcapi-connectedsystems10-suite.ctl`.
- **JSON Schema bundling** (ADR-002): verbatim copy from `csapi_compliance/schemas/` → new repo's `src/main/resources/schemas/` at scaffold time. No submodule, no symlink. Pin upstream OGC SHA in `pom.xml` comment block. Drift between the two copies acceptable (v1.0 is frozen).
- **Archetype modernization** (ADR-004): 25-item checklist Groups A–D applied as atomic commits after archetype generation; Group E lists items deferred from Sprint 1 (TE 6.0 migration, mvn site, OSSRH GPG, scm-publish).
- **Cross-repo relationship** (ADR-005): sibling repos, README cross-links both directions, v1.0-frozen tag at HEAD `ab53658`. URI-coverage diff (REQ-ETS-SYNC-001) is a CI script in the new ETS, deferred until Part 1 feature-complete.

### Sprint 1 stories (post-reconciliation)

| Story | Priority | Complexity | Architect readiness |
|-------|----------|------------|---------------------|
| **S-ETS-01-01** Generate archetype, modernize to JDK 17, first green build | P0 | M | PASS |
| **S-ETS-01-02** Implement CS API Core conformance class end-to-end against GeoRobotix | P0 | M | PASS |
| **S-ETS-01-03** TeamEngine 5.6.1 Docker smoke test runs Core suite against GeoRobotix | P0 | M | CONCERNS (TeamEngine version drift, META-INF/services filename pitfalls, CTL Saxon namespace typos, smoke-test artifact archival — Quinn check items) |

### Suggested Next Action — Bootstrap new repo + start Generator on S-ETS-01-01

REQ-ETS-WEBAPP-FREEZE-001 is closed (tag `v1.0-frozen` at `ab53658`, README repositioned). The next substantive sprint is the new Java repo and the first three stories.

1. **Bootstrap the sibling repo** (~5 min): `gh repo create Botts-Innovative-Research/ets-ogcapi-connectedsystems10 --public --description "OGC API - Connected Systems Part 1 ETS for OGC TeamEngine"`. Initialize with empty README + `.gitignore` (or seed with a one-line README cross-linking back here, satisfying ADR-005's "both directions" cross-link).
2. **Generate the archetype** (~10 min, S-ETS-01-01 first half): `mvn archetype:generate -B -DarchetypeGroupId=org.opengis.cite -DarchetypeArtifactId=ets-archetype-testng -DarchetypeVersion=2.7 -DgroupId=org.opengis.cite -DartifactId=ets-ogcapi-connectedsystems10 -Dets-code=ogcapi-connectedsystems10 -Dets-title='OGC API - Connected Systems Part 1'`. Commit raw archetype output as the first commit.
3. **Apply ADR-004 modernization checklist** (~3–4h, S-ETS-01-01 second half): Groups A–D as 25 atomic commits, each commit message citing the ADR row (e.g. `S-ETS-01-01: pom.xml parent → ets-common:17 (ADR-004 A-1)`). Build green `mvn clean install` on JDK 17.
4. **Spawn Generator (Dana) for S-ETS-01-02 + S-ETS-01-03** after S-ETS-01-01 lands. Per the sprint contract, Gate 4 (Raze) is mandatory at the end of Sprint 1 — `gate_4_required: true, force_run: true`.

Pre-flight check before bootstrapping: confirm the org `Botts-Innovative-Research` is the right home for the ETS (vs. a new dedicated org or eventual transfer to `opengeospatial`). ADR-005 says "our org first; propose to OGC at beta milestone."

## v1.0 Frozen State (snapshot for reference)

The v1.0 deliverable remains useful as a developer pre-flight tool. Frozen at `ab53658` on `origin/main`.

- **Gates at freeze**: `npx vitest run` → **1003/1003** PASS (52 files) · `npx tsc --noEmit` → **0 errors** · `npx eslint .` → **0 errors, 0 warnings** · Playwright chromium **22/0/3** · firefox **22/0/3**.
- **Scope at freeze**: 9 epics, 39 stories, 59 FRs implemented. Part 1 (OGC 23-001, 14 classes) + Part 2 (OGC 23-002, 14 classes). 27 registered conformance-test modules. 126 OGC schemas bundled.
- **Last v1.0 sprint**: `sess-prog-001-assertion-depth` (Raze APPROVE 0.92 round 2). All P0 and P1 items were closed at freeze.

## Current State (legacy v1.0 details — superseded by pivot, retained for v1.0 maintenance reference)

- **Gates**: `npx vitest run` → **1003/1003** PASS (52 files) · `npx tsc --noEmit` → **0 errors** · `npx eslint .` → **0 errors, 0 warnings** · Playwright chromium **22/0/3** · firefox **22/0/3** (TC-E2E-007 added for SESS-PROG-001).
- **v1.0 scope**: all 9 epics, 39 stories, 59 FRs implemented. Part 1 (OGC 23-001, 14 classes) + Part 2 (OGC 23-002, 14 classes). 27 registered conformance-test modules. 126 OGC schemas bundled.
- **Commit state**: working tree clean. HEAD = `ab53658` on `main` (sprint `sess-prog-001-assertion-depth`, pushed to `origin/main`). 6 sprints closed and pushed since `561f39e` (`procedures-properties-…` → `lint-warnings-cleanup` → `e2e-assertion-depth-batch` → `scenario-traceability-sweep` → `uri-canonicalization` → `sess-prog-001-assertion-depth`).
- **All 4 BMAD gates operational**: Four Raze verdicts on 2026-04-17 (rubric-6-1-sweep 0.88, api-def-fallback 0.92, deployments-collections-heuristic 0.93, sess-prog-001-assertion-depth APPROVE 0.92 round 2 after round 1 GAPS_FOUND 0.82). Intervening 4 sprints justified no-Raze (mechanical/live-verified) inline in each changelog entry.
- **Collection-type identification (ALL 5 CS Part 1 feature types)**: systems → `featureType="sosa:System"`, deployments → `featureType="sosa:Deployment"`, procedures → `featureType="sosa:Procedure"`, sampling features → `featureType="sosa:Sample"` (shorter form, spec-trap guarded), properties → `itemType="sosa:Property"` (asymmetric, trap-guarded). All per OGC 23-001 `/req/<X>/collections`.
- **Requirement URIs**: all 110 `requirementUri`/`conformanceUri` fields + 114 test assertions in canonical OGC form (`http://www.opengis.net/spec/...`).
- **Known issues against the test engine**: none. Active section of `ops/known-issues.md` is empty.

## Suggested Next Action — User picks P2 #9 (hosted deploy) or P2 #10 (fixture mock server)

All P0 and P1 items are closed. Working tree is clean and pushed (`ab53658` on `origin/main`). The two live P2 options, briefly:

- **P2 #9 — Hosted deployment + NFR-09 uptime monitoring (0.5–1 day)**: deploy `docker-compose.yml` to Fly.io / Railway / Render. **Avoid Vercel** — serverless SSE buffering breaks the progress page. Verify SSE end-to-end through the host's proxy before declaring success. Add an uptime monitor (UptimeRobot free / Better Uptime) pointed at `/api/health`. Unblocks NFR-09 (no metric exists until deployed) and P3 #14 (second user-testing round).
- **P2 #10 — Known-good/known-bad fixture mock server (1–2 days)**: new Express app at `tests/fixtures/mock-iut/` implementing CS Part 1 landing + conformance + collections routes in two modes — spec-conformant vs deliberately-broken (missing `featureType="sosa:System"`, wrong capitalization, asymmetric-pattern inversions from the unit-test spec-trap corpus). New regression suite runs the engine against each mode and asserts expected PASS/FAIL/SKIP counts, mechanizing Raze's §6.3 accuracy check. Highest ROI for the BMAD framework itself.

Recommendation: **#10 first** — hermetic, pays back every future sprint via mechanical regression detection, and the hosted-platform pick for #9 is a user call with real SSE-proxy risk that isn't worth eating first.

## Recent Sprints (audit trail — most recent first)

| Sprint | Close date | Raze verdict | Artifact |
|--------|------------|--------------|----------|
| `sess-prog-001-assertion-depth` | 2026-04-17T21:30Z | **APPROVE 0.92** (round 2; round 1 GAPS_FOUND 0.82 on 2 stale ops docs, both addressed same-turn). Commit `ab53658`. | in-conversation YAML report (no `.harness/evaluations/` file written this sprint — sub-agent output inlined in changelog + status) |
| `uri-canonicalization` | 2026-04-17T20:30Z | _(no Raze — mechanical sed prefix sweep, 1003/1003 safety check, 0-behavior delta)_ | changelog only |
| `scenario-traceability-sweep` | 2026-04-17T19:40Z | _(no Raze — comment-only prepends, pure-additive file-level tags)_ | changelog only |
| `e2e-assertion-depth-batch` | 2026-04-17T19:22Z | _(no Raze — live-verified 14/14 on chromium + firefox, established Playwright patterns)_ | changelog only |
| `lint-warnings-cleanup` | 2026-04-17T18:02Z | _(no Raze — 18 mechanical lint fixes, zero test-behavior delta)_ | changelog only |
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

- _(No active test-engine issues as of 2026-04-17T20:56Z — all 5 CS Part 1 testCollections functions enforce OGC 23-001 markers.)_
- **Requirement URI path-segment remap (OGC 19-072 + 17-069 only)** — prefix canonicalization shipped 2026-04-17; local path slugs like `/req/ogcapi-common/landing-page` still don't match OGC canonical paths like `/req/landing-page/root-success`. Would need per-URI .adoc lookup. ~2-3h. Low impact.
- **SWE Common Binary deep parsing not implemented** — surface-level check only. Low impact per design spec.
- **WebKit + Edge Playwright blocked** in WSL2 (missing system libs + no `microsoft-edge-stable`). Chromium + Firefox cover dominant share.
- **NFR-09 uptime monitoring deferred** — hosted deployment prerequisite.
- ~~**18 pre-existing lint warnings**~~ — RESOLVED 2026-04-17T18:02Z (sprint `lint-warnings-cleanup`).

## Remaining Work

Prioritized list of open work. All items below are *post-v1.0*; the v1.0 scope (9 epics, 39 stories, 59 FRs) is complete.

### P0 — Active issues with identified fixes

_(None remaining. All active test-engine and lint/typing issues are resolved as of 2026-04-17T20:56Z.)_

### P1 — Scenario assertion-depth upgrades (traceability gaps) — ALL RESOLVED

4. ~~**SESS-PROG-001 PARTIAL → PASS**~~ — RESOLVED 2026-04-17T21:05Z (sprint `sess-prog-001-assertion-depth`). Hermetic TC-E2E-007 installs FakeEventSource via `page.addInitScript`, drives staged SSE events, asserts counter `12 / 58` + percent `21%` + `aria-valuenow="21"` + class/test names + `<1000ms` emit→visible latency. Chromium 674ms / firefox 1.6s.

5. ~~**RPT-TEST-001 PARTIAL → PASS**~~ — RESOLVED 2026-04-17T19:20Z (sprint `e2e-assertion-depth-batch`).

6. ~~**EXP-JSON-001 PARTIAL → PASS**~~ — RESOLVED 2026-04-17T19:20Z (sprint `e2e-assertion-depth-batch`).

7. ~~**RPT-DASH-001 MODERATE → PASS**~~ — RESOLVED 2026-04-17T19:20Z (sprint `e2e-assertion-depth-batch`).

8. ~~**111+ normal SCENARIO-\* traceability**~~ — RESOLVED 2026-04-17T19:40Z (sprint `scenario-traceability-sweep`). File-level traceability block prepended to every test file; 54/54 now reference SCENARIO-\* IDs. Quinn's WARN-003 closed.

### P2 — Framework / infra

9. **Hosted deployment + NFR-09 uptime monitoring** (0.5-1 day)
   - Pick a host (Fly.io, Railway, Render, etc.), deploy the Docker compose, validate SSE works through the host's proxy, wire up an uptime monitor (e.g. UptimeRobot). NFR-09 has no metric until this lands.

10. **Known-good/known-bad conformance fixture mock server** (1-2 days)
    - Currently, Raze's Section 6.3 "does the code correctly flag a non-conformant server?" check relies on manual GeoRobotix runs. A fixture server that serves intentionally-broken responses (missing required fields, wrong status codes, malformed GeoJSON) would let Raze's accuracy check be mechanical. High ROI for the BMAD framework.

11. ~~**Requirement URI canonicalization**~~ — RESOLVED 2026-04-17T20:30Z (sprint `uri-canonicalization`). Prefix canonicalization shipped across 110 URIs + 114 test assertions. Path-segment remap for OGC 19-072/17-069 deferred as a smaller follow-up Active issue (see § Known Issues).

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
