# Operational Status — CS API Compliance Assessor

> Last updated: 2026-03-31

## Current Status: USER TESTING + EVALUATOR REWORK

> Last updated: 2026-04-02

### What's Working
- **906 unit tests passing** (45 files), **0 TypeScript errors**
- **27 conformance class test modules** registered and executing
- **74 OGC JSON schemas** bundled from GitHub
- **Live-tested** against OGC demo server (georobotix) and user's OSH node — discovery, conformance mapping, resource probing all work
- **Two-step assessment flow**: POST /api/assessments (sync discovery) → POST /:id/start (async tests)
- **SSE progress streaming** with reconnection + polling fallback
- **Results page**: pass/fail/skip filtering at test level, skip reasons displayed, auto-expand failed/skipped classes
- **JSON export** working (path-based → query-param routing fixed)
- **Security**: SSRF guard, credential masking, rate limiter, security headers — all verified by evaluator
- **Orchestration pipeline**: `scripts/orchestrate.py` (870 lines) — supports `--start-at evaluator`
- **Evaluator prompt**: 13-step process with conformance fixture testing, contract tests, security/a11y gates
- **Sprint contract + evaluation report** produced for retroactive v1.0 assessment

### Known Issues (from evaluator + user testing)
- SCENARIO-* traceability absent from test file comments (WARN-003)
- E2E Playwright tests need browser install + port env var to run
- Conformance Accuracy: remaining 7 test failures against georobotix server need investigation (legitimate server non-conformance vs test bugs)

### What's Next
1. Address remaining evaluator warnings (SCENARIO-* traceability, coverage measurement)
2. Build known-good/known-bad conformance fixture mock server
3. Deploy to hosted environment and validate uptime (NFR-09)
4. Add Part 3 (Pub/Sub: WebSocket + MQTT) when OGC publishes the standard
5. Integration with OGC TeamEngine when official ETS is released
