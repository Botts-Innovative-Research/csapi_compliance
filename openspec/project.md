# Project Conventions

**Last Updated**: 2026-03-31
**Status**: Active

This file defines project-wide conventions that all agents and contributors must follow.

## Project Identity

- **Name**: CS API Compliance Assessor
- **Language(s)**: TypeScript
- **Framework(s)**: Next.js (React), Node.js
- **Runtime**: Node.js 20 LTS
- **Package Manager**: npm

## File Organization

```
csapi_compliance/
  _bmad/                  # Strategic documents (PRD, architecture, UX spec)
  openspec/               # Specifications
    capabilities/         # Capability specs and designs
    change-proposals/     # Spec change proposals
  epics/                  # Epics and stories
    stories/              # Individual story files
  ops/                    # Operational documents (status, changelog, known issues)
  .harness/               # Agentic refactor harness
  src/
    app/                  # Next.js app router pages
    components/           # React components
      ui/                 # shadcn/ui base components
    lib/                  # Shared utilities
    engine/               # Test engine core
      conformance/        # Conformance class test implementations
      schemas/            # OGC OpenAPI schemas for validation
      runner/             # Test runner, scheduler, dependency resolver
      capture/            # HTTP request/response capture
    api/                  # Backend API route handlers
    types/                # TypeScript type definitions
  tests/
    unit/                 # Unit tests (Vitest)
    integration/          # Integration tests (Vitest)
    e2e/                  # End-to-end tests (Playwright)
  scripts/                # Build, deploy, and utility scripts
  docker/                 # Docker configuration
```

## Naming Conventions

### Files and Directories
- kebab-case for files and directories
- Test files: `{name}.test.ts` (unit/integration), `{name}.spec.ts` (E2E/Playwright)

### Code

#### Variables and Functions
- camelCase
- Prefix: `is` for booleans, `get`/`fetch` for data retrieval, `handle` for event handlers

#### Types and Classes
- PascalCase
- No `I` prefix for interfaces

#### Constants
- UPPER_SNAKE_CASE for true constants
- camelCase for configuration objects

### Spec Identifiers
- Requirements: `REQ-{CAP}-{NNN}` (e.g., REQ-DISC-001)
- Scenarios: `SCENARIO-{CAP}-{FLOW}-{NNN}` (e.g., SCENARIO-DISC-INPUT-001)
- Change Proposals: `CP-{NNN}` (e.g., CP-001)
- ADRs: `ADR-{NNN}` (e.g., ADR-001)
- Stories: `STORY-{EPIC}-{NNN}` (e.g., STORY-DISC-001)
- Epics: `EPIC-{NNN}` (e.g., EPIC-001)

### Capability Abbreviations
| Capability | Abbreviation |
|-----------|-------------|
| Endpoint Discovery | DISC |
| Conformance Testing | TEST |
| Test Engine Infrastructure | ENG |
| Request/Response Capture | CAP |
| Result Reporting | RPT |
| Export & Sharing | EXP |
| Progress & Session | SESS |

## Coding Standards

### General
- Max line length: 100 characters
- Indentation: 2 spaces
- Trailing newline: yes
- Import ordering: node builtins → external packages → internal modules → relative imports

### Error Handling
- Custom error classes extending `Error` for domain errors
- Structured error responses with `{ error: string, details?: string }` shape
- User-facing messages: clear, non-technical, actionable

### Testing
- Test framework: Vitest (unit/integration)
- E2E framework: Playwright
- Assertion style: `expect` (Vitest built-in)
- Test data: factory functions in `tests/fixtures/`
- Every test file references REQ-* or SCENARIO-* in comments

## Build and Run Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run unit tests
npx vitest run

# Run E2E tests
npx playwright test

# Run linter
npx eslint .

# Run type checker
npx tsc --noEmit

# Build for production
npm run build

# Run coverage
npx vitest run --coverage

# Docker deployment
docker-compose up -d
```

## Git Conventions

### Branch Naming
- `feature/{story-id}-{short-description}` (e.g., `feature/STORY-DISC-001-url-input`)
- `fix/{story-id}-{short-description}`

### Commit Messages
- Conventional Commits format: `type(scope): description`
- Types: feat, fix, test, docs, refactor, chore
- Scope: capability abbreviation (disc, test, eng, cap, rpt, exp, sess)
- Reference: include REQ-* or STORY-* in commit body

## Environment and Configuration

- Environment variables: prefixed with `CSAPI_` (e.g., `CSAPI_PORT`, `CSAPI_LOG_LEVEL`)
- Configuration: `.env` file for local dev, environment variables for production
- Secrets: never committed; credentials handled in-memory only during assessment sessions

## Deployment

- Deployment target: Docker (docker-compose)
- Health check: `GET /api/health` returns `{ "status": "ok" }`
