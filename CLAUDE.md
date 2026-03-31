# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow (MANDATORY)

This project uses **spec-anchored development** (BMAD + OpenSpec). Every code change follows:

1. **Spec First** — Update `openspec/capabilities/*/spec.md` with new REQ-* and SCENARIO-*. Create/update story in `epics/stories/`.
2. **Write Tests** — Tests reference REQ-* and SCENARIO-* in comments.
3. **Implement** — Code to satisfy spec requirements.
4. **Verify** — Run unit tests, type checks, builds per commands below.
5. **E2E Verify (MANDATORY)** — Run end-to-end tests per `ops/e2e-test-plan.md`. All changes derived from user instruction MUST be verified E2E before reporting done. See E2E Testing below.
6. **Reconcile Specs** — Update Implementation Status in spec.md. Update story status. Update `_bmad/traceability.md` impl status column. If implementation diverged from spec, update spec to match reality with rationale.
7. **Update Ops** — Update `ops/status.md` (what's working/next) and `ops/changelog.md` (what you did).
8. **Update `_bmad`** — Update any part of `_bmad` that is relevant to the changes you made. Never leave specs and code disagreeing silently.

### Architecture Freshness Check

If `_bmad/architecture.md` "Last Reconciled" date is >30 days old, flag to user before starting new capability work.

## E2E Testing (MANDATORY)

**Every change derived from user instruction must be verified end-to-end.** This means:

- **Web applications**: Browser automation (Playwright or equivalent) against the deployed system
- **Mobile applications**: Mobile emulator testing (mobile-mcp or equivalent)
- **Backend services / drivers**: Integration tests against running system instances with real protocol exchanges
- **DNS resolution**: When testing against running systems, use proper DNS names when feasible (not just localhost)

E2E tests must exercise the full deployed stack, not just unit tests against mocked dependencies. The test plan lives at `ops/e2e-test-plan.md` and results are documented at `ops/test-results.md`.

## Build / Test / Deploy

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Run development server
npm run dev

# Run unit tests
npx vitest run

# Run E2E tests
npx playwright test

# Lint
npx eslint .

# Type check
npx tsc --noEmit

# Deploy (Docker)
docker-compose up -d
```

## Session Metrics (MANDATORY)

Track execution time and token consumption every turn:

1. **Turn start**: Run `date -u +"%Y-%m-%dT%H:%M:%SZ"` at start of each response
2. **Turn end**: Run `date -u +"%Y-%m-%dT%H:%M:%SZ"` right before responding to user
3. **Log both** in `ops/metrics.md` turn log table
4. **Subagent metrics**: Record tokens and duration from agent result metadata
5. **On context compaction or session end**: Run `python3 scripts/session-metrics.py` to extract authoritative token counts and costs from the session JSONL, then update `ops/metrics.md` Session Summary

## User Input Tracking (MANDATORY)

Every user instruction must be captured and traceable to outcomes:

1. **Log user instructions**: At the start of each turn, record a 1-line summary of the user's request in `ops/metrics.md` turn log (Description column)
2. **Cycle time**: The turn log's Start/End columns capture wall-clock time between user input and agent completion — this IS the cycle time. Review it to identify slow turns.
3. **Instruction → outcome mapping**: Each entry in `ops/changelog.md` should be traceable to the user instruction that triggered it. If a change was agent-initiated (refactoring, cleanup), note that explicitly.
4. **Session handoff**: Before session ends, update `ops/status.md` with what's working and what's next. This is the handoff document for the next session — human or AI.

## Agentic Harness

This project uses a **context-reset architecture** with discrete BMAD agent roles. No two roles share a context window.

| BMAD Role | Agent | Context | Config |
|-----------|-------|---------|--------|
| Analyst (Mary) | Discovery | Fresh per analysis | `.harness/prompts/discovery.md` |
| PM (Pat) | Planner | Fresh per planning cycle | `.harness/prompts/planner.md` |
| Architect (Alex) | Architect | Fresh per design decision | `.harness/prompts/architect.md` |
| UX Designer (Sally) | Design | Fresh per design task | `.harness/prompts/design.md` |
| Developer (Dana) | Generator | Fresh per story | `.harness/prompts/generator.md` |
| QA (Quinn) | Evaluator | Fresh per evaluation | `.harness/prompts/evaluator.md` |
| Scrum Master (Sam) | Orchestrator | Stateless script | `scripts/orchestrate.py` |

- **Harness config**: `.harness/config.yaml` (agent models, tools, budgets, evaluation criteria)
- **Handoff artifacts**: `.harness/handoffs/` (YAML state passed between agents)
- **Sprint contracts**: `.harness/contracts/` (measurable criteria binding generator + evaluator)
- **Evaluation reports**: `.harness/evaluations/` (independent QA verdicts)

See `.harness/prompts/*.md` for each agent's full role definition and `_bmad/workflow.md` for the orchestration loop.

## Build Environment

- WSL2 (Linux 6.6.87.2-microsoft-standard-WSL2)
- Node.js 20 LTS (via nvm)
- npm package manager
- Docker + docker-compose for deployment

## Key Paths

| What | Where |
|------|-------|
| BMAD strategic docs | `_bmad/` |
| BMAD agent roles | `_bmad/agents/` |
| BMAD workflow | `_bmad/workflow.md` |
| Capability specs | `openspec/capabilities/*/spec.md` |
| Capability designs | `openspec/capabilities/*/design.md` |
| OpenSpec agent guide | `openspec/AGENTS.md` |
| Project conventions | `openspec/project.md` |
| Change proposals | `openspec/change-proposals/` |
| Epics & stories | `epics/` |
| Harness config | `.harness/config.yaml` |
| Agent prompts | `.harness/prompts/` |
| Handoff artifacts | `.harness/handoffs/` |
| Sprint contracts | `.harness/contracts/` |
| Evaluation reports | `.harness/evaluations/` |
| Operational status | `ops/status.md` |
| Server & credentials | `ops/server.md` |
| Work log | `ops/changelog.md` |
| Known issues | `ops/known-issues.md` |
| E2E test plan | `ops/e2e-test-plan.md` |
| Test results | `ops/test-results.md` |
| Session metrics | `ops/metrics.md` |
| Token cost script | `scripts/session-metrics.py` |
| Orchestration loop | `scripts/orchestrate.py` |

## When to Read Deeper

- **Before starting a new capability**: First review all documents in `_bmad/` and determine if the new capability is already implemented or if there are any relevant change proposals, or if the new capability implies an evolution of the architecture. Read the relevant `openspec/capabilities/*/spec.md` and `design.md`
- **Before deploying or debugging server issues**: Read `ops/server.md` and `ops/known-issues.md`
- **Before architectural decisions or adding new components**: Read `_bmad/architecture.md`
- **To understand project scope or requirements**: Read `_bmad/prd.md`
- **To check what's built vs. spec'd**: Read `_bmad/traceability.md` (has implementation status per FR)
- **Before reporting work as done**: Read `ops/e2e-test-plan.md` and execute relevant E2E tests
