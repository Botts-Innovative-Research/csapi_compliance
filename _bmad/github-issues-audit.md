# GitHub Issues → Agentic-Framework Audit

> Status: Findings (first pass) | Last updated: 2026-04-16T23:00Z | Raw data: `.harness/evaluations/github-issues-2026-04-16.json`

## Intent

Walk every open issue on `Botts-Innovative-Research/csapi_compliance` and answer one question per issue: **"If our BMAD + OpenSpec + Raze agentic framework had been operating when this issue was reported, would it have been caught before the issue was filed? If not, what check would need to exist to catch it?"**

The product of this audit is a set of concrete, actionable improvements to the framework — not fixes to individual issues.

### Why

Our framework has 4 gates (self-check, Evaluator/Quinn, Reconciliation, Adversarial/Raze) plus CLAUDE.md's mandatory workflow, OpenSpec REQ/SCENARIO coverage, and a session-metrics + user-input-tracking loop. If real users file issues that our gates should have prevented, each such issue is a **methodology signal** pointing at a gate blind spot. Issues that our gates *would* have caught are confirmation the gates work; issues that our gates *couldn't have* caught are a request for a new check.

This is an adversarial exercise against our own framework — parallel in spirit to what Raze does against individual sprints, but scaled to the whole methodology.

### Non-goals (explicitly out of scope)

- No code fixes in this pass. If an issue merits a code fix, it becomes a sprint; we don't sprint inside an audit.
- No issue-closing, commenting, or labeling via `gh` — read-only audit.
- No opinions on issues that are clearly domain (OGC spec interpretation, IUT-specific conformance judgments). Those belong to users, not our framework.

## Method

1. **Enumerate** — `gh issue list -R Botts-Innovative-Research/csapi_compliance --state open --limit 100 --json number,title,body,author,createdAt,labels,comments`. Capture raw JSON to `.harness/evaluations/github-issues-2026-04-16.json` for audit trail.

2. **Classify each issue** along four axes:
   - **Type**: `bug` / `feature-request` / `methodology-gap` / `user-question` / `domain-dispute` (OGC interpretation) / `docs`
   - **Severity**: `blocker` / `high` / `medium` / `low` (from user impact, not from our framework's perspective)
   - **Framework-visibility**: did the issue originate in a layer our framework inspects?
     - `caught-by-existing-gate` — one of our 4 gates has a check that would flag this
     - `caught-by-new-gate` — a new gate check of existing type could flag this (e.g., Raze rubric extension)
     - `requires-new-framework-capability` — would need a new mechanism we don't have (e.g., automated user-acceptance testing, runtime behavior monitoring, chaos engineering)
     - `out-of-scope` — domain dispute or pure user question; framework has no role here
   - **Proposed catch-point**: concrete mapping to a gate + what the check would say

3. **For each `caught-by-new-gate` or `requires-new-framework-capability` classification**, write a one-paragraph proposal: what the new check is, which gate owns it, what it would assert, what evidence it needs. Group proposals by gate at the end of the audit.

4. **Sanity check** — pass the final list through this lens: "Am I proposing checks that sound good but would fire too often to be useful?" Drop anything that would produce more noise than signal.

## Output structure

This file grows from plan → findings in place. Sections after "Method" (below) will be populated in the execution pass:

- **Issue inventory** — one row per issue with classification columns
- **Issues already caught by our gates** — with evidence (which gate, what check)
- **Issues that slipped our gates** — the interesting section; each gets a proposed framework change
- **Proposed framework improvements** — grouped by gate, prioritized
- **Dropped proposals** — anything rejected during the sanity check, with reasoning (so the next auditor doesn't re-propose them)

## Execution note

The next turn will run `gh issue list`, populate the inventory, and produce the analysis. Any issues that suggest a code fix will be noted but NOT acted upon in this audit — they become backlog items for future sprints. The user reviews the proposed framework changes before we act on them.

---

## Issue inventory

All 7 open issues were filed by one tester (`earocorn`) on 2026-04-16 — today. Full raw data at `.harness/evaluations/github-issues-2026-04-16.json`. This is the "real user first-run" signal.

| # | Title | Type | Severity | Framework-visibility | Root gate |
|---|-------|------|----------|----------------------|-----------|
| #1 | Allow assessments on local development servers | bug / scope | HIGH | slipped | Gate 2 + UX |
| #2 | Prompt for authentication on landing page URL | bug | HIGH | slipped | Gate 2 (Quinn E2E) |
| #3 | Conformance to "Links" uses examples as requirements | **false positive** | HIGH | slipped | Gate 4 (Raze rubric 6) |
| #4 | Schemas are not recursively pulled if they contain a $ref tag | bug (build-time) | HIGH | caught-by-new-gate | Gate 1 (Generator self-check) |
| #5 | Part 2 tests don't keep the correct API root | bug (URL construction, Part 2) | CRITICAL | slipped | Gate 4 (Raze URL-consistency) |
| #6 | Data Stream insertion does not use a valid schema | bug (downstream of #4) | CRITICAL | caught-by-new-gate | Gate 1 (request-body validation) |
| #7 | Observation insertion does not match inserted Data Stream schema | bug (dynamic-schema coupling) | CRITICAL | slipped | Gate 4 (Raze dynamic-schema) |

None of the 7 issues are `caught-by-existing-gate`. Every one is either a slip or would need a new check to catch. That is itself a signal: we have gate coverage for code quality, spec-code alignment, and regression; we have **thin coverage for conformance-correctness against the real OGC specs**, which is the product.

## Issues already caught by existing gates

None. See commentary above.

## Issues that slipped our gates

### #1 — SSRF policy blocks local dev servers

Our SSRF guard (`src/server/middleware/ssrf-guard.ts` via `BLOCKED_CIDRS` in `src/lib/constants.ts`) blocks `10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, etc. This is a deliberate security decision captured in `architecture.md` Security Architecture. The methodology gap is **not** that SSRF protection exists — it's that the interaction between SSRF protection and the "developer tests their own local server" workflow was never surfaced. The PRD talks about "compliance-testing OGC endpoints" as if all IUTs live at public URLs.

**Why it slipped**: Our UX design phase (Sally) produced personas like "compliance tester verifying a live endpoint". No persona in `_bmad/ux-spec.md` is a developer iterating against their own localhost. Quinn's Gate 2 checks security (SSRF protection) but doesn't check whether the security policy blocks a legitimate user flow.

### #2 — Auth required at discovery time

Discovery (`src/engine/discovery-service.ts`) fetches the landing page to map conformance classes. If the IUT is protected, discovery returns 401 before the user has a chance to provide credentials. The auth-config form lives on the configure page, which is unreachable.

**Why it slipped**: Our `ops/e2e-test-plan.md` and Playwright suite only exercise IUTs that respond 200 to an unauthenticated landing-page GET. Quinn's Gate 2 runs against GeoRobotix (open) — no protected-IUT fixture exists.

### #3 — Conformance test uses spec examples as requirements (false positive)

The "conformance to Links" test fails when there is no `rel=self` link. The user cannot find language in the OGC spec that makes `self` a requirement — it is only an example in the spec text. This is the classic compliance-tool failure mode: **asserting against examples instead of normative requirements**.

**Why it slipped**: This is exactly what Raze's Section 6 "Conformance Test Correctness" is supposed to catch. Raze did run against GeoRobotix 2026-04-16T22:19Z and saw tests fail — but Raze did not verify that each failure corresponds to an actual normative requirement. Raze spot-checked URL construction (and caught it in `filtering.ts`) but did not spot-check assertion-to-spec-text mapping.

### #5 — Part 2 tests use wrong API root

BUG-001 (URL construction, leading slashes) was reported 2026-04-02 and declared fixed 2026-04-16 via `168c032`. The `grep` check `grep -E "new URL\\(\\s*['\\\"\\\`]/" src/engine/registry/` returns 0 matches. But issue #5 says Part 2 still gets the API root wrong.

**Hypothesis**: BUG-001 fixed the leading-slash pattern. Issue #5 is a different mechanism — perhaps `baseUrl` itself is being reset to `/` somewhere in the Part 2 flow, or the Part 2 test modules construct URLs from some other input (collection ID? conformance URI?). Needs investigation in a sprint, not in this audit.

**Why it slipped methodologically**: Raze's Section 6 currently spot-checks `new URL()` construction but does not run a systematic live-traffic diff between Part 1 and Part 2 requests to verify they share the same base.

### #7 — Observation insertion violates Datastream's dynamic schema

The Observation body must conform to the inserted Datastream's observed-property schema. Our test hardcodes an Observation shape that is schema-incompatible with the Datastream we just created. This is CS API Part 2 domain knowledge: observations are typed by their parent datastream.

**Why it slipped**: Architectural (Alex) spec and Generator (Dana) implementation both treated "insert a datastream" and "insert an observation" as independent REQs. The dynamic coupling is in the OGC spec but was not surfaced during decomposition. Raze spot-checks assertions; this is a different issue — the *request construction* is wrong because the test designer didn't know the schema dependency.

## Issues that a new check could catch

### #4 — $ref-containing schemas not recursively bundled

`scripts/fetch-schemas.ts` fetches a fixed list of schema files from GitHub but does not follow $ref. So a schema that validates against `Link` requires `links.json`, which $refs `Link` as a component — but `Link` itself isn't bundled, so validation falls back to non-constraint.

**Proposed new gate check (Gate 1, build-time)**: After schema bundling, recursively walk every bundled schema's `$ref` properties. Every referenced path must either (a) resolve to another bundled schema file, or (b) resolve to a fragment within the same file. Any unresolved $ref is a build-time FAIL.

### #6 — CRUD request bodies not validated against schema

The Data Stream insertion test sends a body that doesn't match `dataStream_create.json`. The test was authored by copying a plausible-looking example, not by generating from the schema.

**Proposed new gate check (Gate 1, test-authoring time)**: Every CRUD test's request body must be validated against the target resource's create-schema at unit-test time. If Ajv throws, the test is malformed — REWORK before shipping.

## Proposed framework improvements (prioritized)

### Gate 1 (Self-check / Generator Dana) — two new invariants

1. **Schema-bundle integrity check** (`scripts/fetch-schemas.ts` post-processing). Catches **#4**. Add to `package.json` `prebuild` so a broken bundle fails the build. Evidence: a `schemas/manifest.json` with all-refs-resolved status.
2. **CRUD request-body schema validation at test-authoring** — unit test in `tests/unit/engine/registry/` that loads each create-delete test module, extracts its sample body, and validates against the target schema. Catches **#6**.

### Gate 2 (Evaluator / Quinn) — two new fixtures + one persona check

3. **Protected-IUT fixture** — add a known-protected test endpoint (either a mock server with `WWW-Authenticate` response, or a real OGC testbed with auth). Extend Quinn's checklist: "run an assessment against this fixture; the UX must reach the auth-config form before failing." Catches **#2**.
4. **Local-dev-server persona** — add to Quinn's checklist: "would a developer testing `http://localhost:8080` of their own IUT be blocked? If yes, propose and test the escape hatch (env var? confirmation flow? auth-based unblock?)". Catches **#1**.
5. **UX persona matrix** — extend `_bmad/ux-spec.md` personas section with: Developer-testing-local-server, User-with-protected-endpoint, Integrator-iterating-quickly. For each new capability, walk every persona through the flow.

### Gate 4 (Adversarial / Raze) — three rubric extensions under Section 6

6. **6.1 Spec-source citation**: For every failing assertion in a live-run, Raze must locate the exact normative spec-text the assertion tests. "Spec example shows X" is NOT a requirement — flag as false-positive. Catches **#3**.
7. **6.2 URL-construction consistency across capabilities**: Run the assessment against a live IUT with request-logging ON. Diff the request URLs between Part 1 modules and Part 2 modules — they should all resolve relative to the same `baseUrl`. Any divergence is a gap. Catches **#5**.
8. **6.3 Dynamic-schema coupling**: For each CRUD test against a resource whose schema is derived from another resource's state (Observation ← Datastream, Command ← ControlStream, Subsystem ← System), Raze must verify the request body is generated from the upstream schema, not hardcoded. Catches **#7**.

### Cross-cutting

9. **"Real-user testing round" stage** in `_bmad/workflow.md` after Gate 4, before sprint close. Current methodology goes Gate 4 APPROVE → sprint closed. In practice, every issue in this audit came from a 10-minute first-run by one tester — evidence our gates alone don't substitute for external testing. Make this a formal stage: invite ≥1 external tester; Gate 4 does not release until at least 48h of external exposure has passed or ≥1 tester signs off.

## Dropped proposals

- **"Add automated end-to-end conformance testing against multiple IUTs in CI"** — dropped. Attractive in principle, but v1.0 explicitly scopes out CI (logged in `ops/known-issues.md`). Also would duplicate what a real OGC TeamEngine run will cover. Better to invest in the Raze rubric extensions (items 6-8 above), which catch issues at review time instead of runtime.
- **"Raze should read every OGC spec requirement and verify coverage"** — dropped. Too ambitious. Raze is a review agent, not a domain expert. The `6.1 Spec-source citation` extension (item 6) is the right-sized version: Raze verifies cited-text-exists, not constructs-cited-text-from-scratch.
- **"Auto-generate conformance tests from OGC spec AsciiDoc"** — dropped. This IS the right long-term answer but is a full research project, not a framework-audit outcome.

## What this audit did NOT do

- No code fixes. 6 of the 7 issues warrant code fixes; none were attempted here. They become backlog items for a "post-APPROVE polish" sprint.
- No comments or labels on the GitHub issues themselves — read-only audit per plan.
- No ranking of which user's issues to fix first — severity assignments above are framework-severity (does this erode user trust?), not prioritization-for-sprint-planning.

## Next actions (suggested — user decision)

1. Create a sprint `user-testing-round-01` containing the 7 issues as stories. Treat as a regular sprint (Gate 1 through 4). Expected outcome: most issues close in 1-2 work-days; issues #4/#6/#7 likely related and may close as a single fix.
2. Land framework improvements 1, 2, 6, 7, 8 alongside the sprint — they are cheap to add and directly prevent the same class of issue.
3. Defer improvements 3, 4, 5, 9 until a second testing round (they need real-world calibration).

