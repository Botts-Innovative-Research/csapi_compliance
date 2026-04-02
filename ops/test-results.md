# Test Results

Last updated: 2026-04-02 (Evaluator retroactive assessment)

## Verdict: RETRY

Weighted score: 0.58 / 1.00. Three critical bugs must be fixed.

---

## Unit Tests

**Command**: `npx vitest run`
**Result**: 905 passed, 1 failed (906 total)
**Duration**: ~5.3s

| Status | Count |
|--------|-------|
| Passed | 905 |
| Failed | 1 |
| Skipped | 0 |

### Failed Test

- **POST /api/assessments > creates a session and returns 201 with id and status**
  - File: `tests/unit/server/assessments.test.ts:173`
  - Cause: Test expects `{ id, status: 'discovering' }` but route now returns `{ id, discoveryResult: {...} }` after the API contract was changed in a bug fix. Test was not updated.

---

## TypeScript Type Check

**Command**: `npx tsc --noEmit`
**Result**: 3 errors

| File | Error |
|------|-------|
| `src/engine/export-engine.ts:5` | Missing declaration file for `pdfkit` |
| `src/engine/http-client.ts:144` | Unused `@ts-expect-error` directive |
| `tests/unit/engine/pagination.test.ts:71` | `beforeEach` not found (vitest globals not in tsconfig types) |

---

## E2E Tests (Playwright)

**Command**: `npx playwright test`
**Result**: 0 passed, 80 failed, 12 skipped (92 total)
**Root Cause**: Playwright config hardcodes `baseURL: 'http://localhost:3000'` and `webServer.port: 3000`, but the server runs on port 4000 (port 3000 is occupied). All tests fail with connection errors.

---

## Conformance Fixture Validation

**Target**: https://api.georobotix.io/ogc/t18/api (OGC reference implementation)

### Assessment Results

| Metric | Value |
|--------|-------|
| Total tests | 28 |
| Passed | 8 |
| Failed | 8 |
| Skipped | 12 |
| Compliance | 50% |

### Class Results

| Class | Status | Pass | Fail | Skip |
|-------|--------|------|------|------|
| OGC API Common - Core | FAIL | 4 | 2 | 0 |
| Connected Systems - System Features | FAIL | 3 | 2 | 0 |
| Connected Systems - Deployment Features | FAIL | 1 | 4 | 0 |
| OGC API Features - Core | SKIP | 0 | 0 | 8 |
| GeoJSON Format | SKIP | 0 | 0 | 4 |

### False Positives Found: 3 (caused by URL construction bug)

| Test | Issue |
|------|-------|
| Deployment Canonical URL | `new URL('/deployments/{id}', baseUrl)` discards base path -- 404 against non-root API |
| Deployment Canonical Endpoint | Same URL bug -- 404 causes JSON parse failure |
| Deployments Referenced from System | `new URL('/systems/{id}/deployments', baseUrl)` same bug |

### Legitimate Failures (correctly detected non-conformance)

| Test | Issue |
|------|-------|
| Landing Page Required Links | GeoRobotix server missing `self` link (OGC spec requires it) |
| JSON Content-Type Header | GeoRobotix returns `Content-Type: auto` instead of `application/json` |
| System Canonical Endpoint | System resources lack `self` link |
| Systems in Collections | Systems collection not found at /collections |

### Assertion-to-Spec Spot Checks (5/5 correct)

1. Landing page links: correctly checks self, service-desc, conformance per OGC API Common 7.3.2
2. JSON Content-Type: correctly requires `application/json` per OGC API Common
3. Resource IDs: correctly checks `id` field per CS API Part 1 Core
4. Conformance conformsTo: correctly validates array presence per OGC API Common 7.5
5. Compliance %: correctly excludes skipped from denominator per REQ-RPT-001

---

## Security Checks

| Check | Result |
|-------|--------|
| SSRF: 127.0.0.1 blocked | PASS (400) |
| SSRF: 10.0.0.1 blocked | PASS (400) |
| SSRF: 192.168.1.1 blocked | PASS (400) |
| SSRF: localhost blocked | PASS (400) |
| SSRF: ftp:// scheme blocked | PASS (400) |
| Credential masking in responses | PASS (Authorization header shows ***) |
| Hardcoded secrets in source | PASS (none found) |

---

## Critical Bugs Found

### BUG-001: URL Construction (34 instances, 11 files)

**Severity**: Critical
**Impact**: False positive test failures on non-root-path APIs

Test modules use `new URL('/path', baseUrl)` with a leading slash. The leading slash causes `new URL()` to resolve against the origin only, discarding the base path. For example:

```
new URL('/deployments/abc', 'https://api.example.com/ogc/t18/api/')
  => https://api.example.com/deployments/abc      (WRONG)

new URL('deployments/abc', 'https://api.example.com/ogc/t18/api/')
  => https://api.example.com/ogc/t18/api/deployments/abc  (CORRECT)
```

**Files affected**: deployments.ts (3), subsystems.ts (4), subdeployments.ts (4), features-core.ts (6), part2-swe-encodings.ts (6), part2-crud.ts (3), part2-update.ts (2), part2-history.ts (2), part2-events.ts (1), part2-feasibility.ts (2), sampling.ts (1)

### BUG-002: Export Path Mismatch

**Severity**: Critical
**Impact**: JSON export button on results page returns 404

`api-client.ts` calls `GET /api/assessments/${id}/export/json` but Express route expects `GET /api/assessments/:id/export?format=json`.

### BUG-003: Stale Unit Test

**Severity**: Critical
**Impact**: 1 test failure in CI

`assessments.test.ts:173` expects `{ id, status: 'discovering' }` but route returns `{ id, discoveryResult: {...} }`.

---

## Performance Benchmarks

Run with: `npm run perf`

| NFR | Target | Actual | Status |
|-----|--------|--------|--------|
| NFR-01 Discovery | < 15s | 0.85 s | PASS |
| NFR-02 Throughput | >= 10 tests/s | 58.9 tests/s | PASS |
| NFR-03 Full Assessment | < 10 min | ~0.1 min (estimated) | PASS |
| NFR-14 Export | < 10s | 33 ms (JSON + PDF) | PASS |
