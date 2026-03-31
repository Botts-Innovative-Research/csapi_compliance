# Test Results

## Unit Tests
- 891 tests passing across 43 files
- Duration: ~2s
- Last run: 2026-03-31

## E2E Tests
- Infrastructure set up (Playwright + config)
- Multi-browser support: Chromium (default), Firefox, WebKit, Edge
- Landing page tests: ready to run
- Full flow tests: require live server (skipped without IUT)

## Performance Benchmarks
Run with: `npm run perf`

| NFR | Target | Actual | Status |
|-----|--------|--------|--------|
| NFR-01 Discovery | < 15s | 0.85 s | PASS |
| NFR-02 Throughput | >= 10 tests/s | 58.9 tests/s | PASS |
| NFR-03 Full Assessment | < 10 min | ~0.1 min (estimated) | PASS |
| NFR-14 Export | < 10s | 33 ms (JSON + PDF) | PASS |
