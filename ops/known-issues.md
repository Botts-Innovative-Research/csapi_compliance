# Known Issues & Lessons Learned — CS API Compliance Assessor

> Last updated: 2026-03-31

## Active Issues

### SWE Common Binary Deep Parsing Not Implemented
- **Symptom**: SWE Common Binary tests only validate Content-Type and non-empty body; they do not parse the binary payload structure.
- **Impact**: Low — surface-level conformance check is sufficient per the design spec.
- **Workaround**: Content-Type and non-empty body checks confirm the server can produce the encoding. Manual inspection may be needed for deeper validation.

### Browser Compatibility Not Fully Verified
- **Symptom**: Playwright is configured for Chromium, Firefox, WebKit, and Edge but multi-browser tests require a hosted deployment to run.
- **Impact**: Low — the app uses standard React + Tailwind with no browser-specific APIs.
- **Workaround**: Run `npm run test:e2e:all-browsers` once a hosted instance is available.

### NFR-09 Uptime Monitoring Deferred
- **Symptom**: No uptime monitoring infrastructure in place.
- **Impact**: Only relevant for production-hosted deployments.
- **Workaround**: Docker health check provides container-level liveness.

## Resolved Issues

### ipaddr.js ESM Import (Fixed 2026-03-31)
- **Problem**: Named import from `ipaddr.js` failed at runtime under Node 22 ESM because the module uses CJS `export =`.
- **Fix**: Switched to default import with destructuring in `ssrf-guard.ts`.

### Binary Content-Type False Positive (Fixed 2026-03-31)
- **Problem**: `isBinaryContentType()` used an allowlist of text types, causing the OGC demo server's `Content-Type: auto` to be incorrectly classified as binary.
- **Fix**: Inverted logic to match known binary prefixes; unrecognized types default to text.

### Overly Strict Content-Type Check in Discovery (Fixed 2026-03-31)
- **Problem**: Discovery service threw `DiscoveryError` if landing page Content-Type didn't contain "json", but real servers may use non-standard types while serving valid JSON.
- **Fix**: Attempt JSON parsing first, log a warning about non-standard Content-Type instead of aborting.

## Lessons Learned

### SSRF Guard Requires Async DNS Resolution
Node.js DNS resolution is inherently async. The SSRF guard was made async, which required adjusting the middleware signature. No functional impact.

### Optional Encodings Must Handle 406 Gracefully
SensorML JSON, SWE Common Text, and SWE Common Binary are optional encodings. Tests check for 406 first and produce SKIP verdicts rather than FAIL.

### Live Testing Reveals Real-World Issues
The smoke test against api.georobotix.io uncovered 3 bugs that unit tests missed — all related to real-world server behavior deviating from strict spec assumptions. Always validate against live endpoints.
