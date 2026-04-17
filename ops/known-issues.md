# Known Issues & Lessons Learned — CS API Compliance Assessor

> Last updated: 2026-04-17T02:45Z (Raze GAPS_FOUND on sprint user-testing-followup — scope mismatch between REQ-TEST-CITE-002 wording and actual audit coverage; 7 registry files remain uncited)

## Active Issues

### Rubric-6.1 sweep across remaining registry files (NEW 2026-04-17, Raze GAPS_FOUND finding)
- **Symptom**: REQ-TEST-CITE-002 is written as a project-wide source-citation mandate for every `rel=*` assertion in `src/engine/registry/**/*.ts`, but the sprint user-testing-followup audit only covered `common.ts` (GH #3) and `features-core.ts`. Raze's review (2026-04-17T02:45Z) enumerated 7 remaining files with uncited rel-link assertions: `procedures.ts:245`, `properties.ts:236`, `sampling.ts:245`, `deployments.ts:250`, `system-features.ts:260`, `subsystems.ts:338-342`, `subdeployments.ts:339`.
- **Impact**: Each uncited assertion is a potential false-positive of the GH #3 class (asserting spec examples as requirements). Without source citations, a reviewer cannot efficiently audit whether each assertion maps to a SHALL clause or an illustrative example.
- **Workaround / follow-up sprint `rubric-6-1-sweep`**: for each of the 7 files, either (a) add a citation comment pointing to a normative SHALL/MUST/REQUIRED clause in the corresponding OGC spec (cs-part1, system-features, etc.), OR (b) downgrade the assertion to SKIP-with-reason if the cited source is only an illustrative example (GH #3 precedent). Verification: `grep -n "rel=" src/engine/registry/` should show every match adjacent to a citation comment. Estimated 2–4 hours of OGC-spec reading + doc edits; no significant code change expected unless a new false positive is surfaced.



### Live-IUT Playwright Tests Hit Destructive-Confirmation Gate — RESOLVED (UI gate only) 2026-04-16
- **Symptom (resolved)**: With `IUT_URL=https://api.georobotix.io/ogc/t18/api`, `TC-E2E-004` and `TC-E2E-005` timed out clicking Start because GeoRobotix advertises CRUD classes which auto-pre-select and gate Start behind the destructive-confirm checkbox.
- **Resolution (option 4, UI layer only)**: 2026-04-16T19:20Z — added shared helper `deselectCrudClasses(page)` at `tests/e2e/assessment-flow.spec.ts:13-37` that the 3 happy-path live-IUT tests call after waiting for the configure page to render. Also added new test `TC-E2E-006` (line 268) that exercises the destructive-confirm gate against a mocked discovery response (no live IUT, no real CRUD operations). Result: 24/24 PASS on chromium and firefox with IUT_URL=GeoRobotix.
- **Backend layer still UNRESOLVED**: see "Backend Destructive-Confirm Enforcement Missing" above.
- **Lesson**: Race condition surfaced — `deselectCrudClasses` originally raced the configure-page sessionStorage useEffect; fixed by waiting on the `Conformance Classes` heading first.

### Critical Scenario Verdicts Were Overstated by Main Session (NEW 2026-04-16, Raze Gate-4 finding)
- **Symptom**: After Task 1 closed, the main session declared all 6 critical scenarios "PASS". Raze (Gate 4 review of option 4) found 3 of those 6 are actually PARTIAL or MODERATE:
  - **SESS-PROG-001 PARTIAL**: TC-E2E-001 only asserts `Assessment in Progress` text appears — the spec demands counter ("12/58") + bar % + class/test names + 1s update latency. Backend assessment completes in ~1.3s with 53/81 tests SKIPPED, so the progress page barely renders before redirect to results. To upgrade: component test with mocked SSE events, or longer-running fixture.
  - **RPT-TEST-001 PARTIAL**: TC-E2E-001 reaches results page but never clicks a filter button. No unit test for the filter component (`tests/unit/components/` does not exist). To upgrade: click Failed/Passed/Skipped filter, assert visibility changes.
  - **EXP-JSON-001 PARTIAL**: TC-E2E-001 only asserts the Export JSON button is visible. Doesn't click, doesn't verify download content. To upgrade at E2E: click and assert download event fires (or content); already covered at unit/integration level via api-client + route alignment.
  - **RPT-DASH-001 MODERATE**: asserts `Assessment Results` heading + `%` text but not the actual percentage value or per-class counts.
- **Impact**: Sprint-level "all 6 PASS" claim in test-results.md, status.md, traceability.md was overstated. Updated 2026-04-16T19:30Z with honest PARTIAL/MODERATE verdicts.
- **Workaround**: see per-scenario "to upgrade" notes above. Treat as Task 1 follow-on work.

### Live-IUT Playwright TC-E2E-001 Strict-Mode Locator (FIXED 2026-04-16)
- **Symptom (fixed)**: `getByText(/conformance class/i)` in `tests/e2e/assessment-flow.spec.ts:134` resolved to 10 elements (per-class spans + headings + summary text) — strict-mode violation.
- **Resolution**: 2026-04-16T18:50Z — scoped to `getByRole('heading', { name: /Conformance Classes/i })`. Now passes (modulo the destructive-confirm gate above).

### Cross-Browser Playwright Blocked on WSL2 (NEW 2026-04-16)
- **Symptom**: `npx playwright test --project=webkit` and `--project=edge` (msedge channel) fail at browser launch on this WSL2 environment. Webkit needs `libsecret-1`, `libwoff2dec`, `libGLESv2`, `libavif`, `libgstgl-1.0`, etc.; edge needs Microsoft Edge installed system-wide.
- **Impact**: Multi-browser parity for Playwright cannot be auto-verified locally on this WSL2 dev box. Chromium and Firefox both run cleanly (20/20 pass each).
- **Workaround**: User authorization required for `sudo npx playwright install-deps webkit && sudo apt install microsoft-edge-stable`, OR run cross-browser in CI / a hosted instance.

### Spec Drift: progress-session SCENARIO-SESS-LAND-001/002 (NEW 2026-04-16)
- **Symptom**: `openspec/capabilities/progress-session/spec.md:121-129` describes a single-button "Start Assessment" landing flow that "transitions to the progress view." The implemented two-step flow (since 2026-04-02 Sprint 2 fix) labels the landing-page button **"Discover Endpoint"**, transitions to `/assess/configure?session=...` for class-selection + auth + run-config, and only then exposes a **"Start Assessment"** button (on the configure page) that transitions to `/assess/[id]/progress`.
- **Impact**: The spec misdescribes the user flow; any new contributor following the spec would build the wrong UI. CLAUDE.md Step 6 (Reconcile Specs) calls for spec-to-code alignment; the original two-step rewrite (commit `2026-04-02` per changelog) never reconciled the spec.
- **Resolution**: Spec text updated 2026-04-16T18:55Z to describe the two-step Discover-then-Configure-then-Start flow. SCENARIO-SESS-LAND-001/002 wording aligned to actual button labels and routes.

### ESLint 9 Config Migration Not Done — RESOLVED 2026-04-16
- **Symptom (resolved)**: `npx eslint .` failed with "couldn't find an eslint.config.(js|mjs|cjs) file" because ESLint 9 requires a flat config and the project had never written one. `package.json` `lint` script also used the removed `--ext` flag.
- **Impact (resolved)**: No lint gate had run since the ESLint 9 upgrade. Prior "lint clean" claims were false — the command could not execute.
- **Resolution**: Bumped `eslint-config-next` 14 → 16 (flat-config-native), added `@eslint/eslintrc`, wrote `eslint.config.js` layering `@eslint/js` + `typescript-eslint` + `next/core-web-vitals`, fixed `lint` script to drop `--ext`. Also fixed 2 real errors the newly-functional gate surfaced: `module` shadow rename in `test-runner.ts:114` and `Date.now()`-during-render fix in `progress/page.tsx:48`. Current state: 0 errors, 18 non-blocking warnings (unused test imports).

### SCENARIO-* Test Traceability Absent
- **Symptom**: Zero test files reference SCENARIO-* IDs in comments. Specs define 126+ SCENARIO-* IDs across 7 capabilities; none traced back from tests.
- **Impact**: Cannot verify behavior coverage by scenario. Evaluator (Quinn) and Adversarial Reviewer (Raze) both flagged this.
- **Workaround**: Add incrementally — start with the 15 critical scenarios in `sprint-retro-eval.yaml`. Quinn's WARN-003 originated 2026-04-02; still open.

### `.github/workflows/` — DROPPED 2026-04-16
- **Decision**: CI is explicitly out of scope for v1.0. The untracked `ci.yml` and `release.yml` scaffolding (dated 2026-03-31, never committed) was removed 2026-04-16 rather than revived. Rationale: by the time we want CI, the repo state has evolved enough that scaffolding fresh is cleaner than dusting off 3-week-old workflows. No functional impact on v1.0 which is scoped as user-testable app + manual verification gates.

### System-by-Procedure Test Previously Fabricated Procedure URI
- **Symptom (fixed)**: `filtering.ts:313` used `'urn:example:procedure:1'` as a fallback when the server had no procedures, risking false positives/negatives.
- **Impact (fixed)**: A server with zero procedures returning empty 200 would have passed the test spuriously.
- **Resolution**: 2026-04-16 — test now SKIPs with reason "No procedure available on the server". See `src/engine/registry/filtering.ts:307-312`. Two unit tests updated to assert the SKIP behavior.
- **Kept in history** because Raze's Gate 4 live run is what caught it.

### Post-Fix Gate 2 (Evaluator) Run Missing for Sprint retro-eval — RESOLVED 2026-04-16
- **Symptom (resolved)**: Quinn's only evaluator report was dated 2026-04-02 (pre-fix). Fixes landed in `168c032`/`0cb78ff` but no re-evaluation had been run against current HEAD.
- **Resolution**: 2026-04-16 Quinn v2 run produced `.harness/evaluations/sprint-retro-eval-eval-v2.yaml` (CONCERNS 0.81); all 3 Quinn v1 BUGs verifiably RESOLVED; full agreement with Raze's Gate 4 verdict. UNVERIFIED scenarios closed by Task 1 (E2E) and Task 2 (live conformance fixture, 2026-04-16T22:19Z).

### Capability Spec Implementation Status Unreconciled — RESOLVED 2026-04-16
- **Symptom (resolved)**: All 7 `openspec/capabilities/*/spec.md` showed `Status: Draft | Last updated: 2026-03-31` despite v1.0 shipped.
- **Resolution**: Batch-updated 2026-04-16 — all 7 files flipped to `Status: Implemented | Last updated: 2026-04-16`. `progress-session/spec.md` further reconciled for two-step Discover→Configure→Start flow and extended with SCENARIO-SESS-CONFIRM-001/002 covering both client UX and backend enforcement of the destructive-opt-in gate.

### SWE Common Binary Deep Parsing Not Implemented
- **Symptom**: SWE Common Binary tests only validate Content-Type and non-empty body; they do not parse the binary payload structure.
- **Impact**: Low — surface-level conformance check is sufficient per the design spec.
- **Workaround**: Content-Type and non-empty body checks confirm the server can produce the encoding. Manual inspection may be needed for deeper validation.

### Browser Compatibility — Chromium + Firefox VERIFIED 2026-04-16
- **Status**: 2026-04-16 Task 1 ran `--project=chromium` (20/20 pass) and `--project=firefox` (20/20 pass) against `localhost:4000`. WebKit and Edge still blocked by missing system deps in WSL2 (see "Cross-Browser Playwright Blocked on WSL2" above).
- **Impact**: Low — chromium and firefox cover ~85%+ of the target user base. WebKit/Edge parity remains a hosted-deployment task.

### NFR-09 Uptime Monitoring Deferred
- **Symptom**: No uptime monitoring infrastructure in place.
- **Impact**: Only relevant for production-hosted deployments.
- **Workaround**: Docker health check provides container-level liveness.

### Requirement URIs Use Local Paths, Not Canonical OGC URIs
- **Symptom**: Test modules cite requirements as `/req/ogcapi-common/landing-page` (local) rather than the canonical `http://www.opengis.net/spec/ogcapi-common-1/1.0/req/core/…`.
- **Impact**: Low — internal traceability still works, but reduces cross-tool interop and alignment with OGC CITE TestResult reports.
- **Workaround**: Batch-rewrite requirement URIs to canonical OGC form when convenient; not blocking v1.0.
- **Source**: Raze 2026-04-16 Gate 4 live run.

### "Deployments in Collections" Heuristic Matching Undocumented
- **Symptom**: `deployments.ts:385-389` accepts `id === 'deployments' OR id === 'deployment' OR itemType includes 'deployment'`. The OGC spec text authorizing this heuristic is not cited in the module.
- **Impact**: If OGC mandates an exact collection id, one of these branches is wrong. Currently flagged as a potential false positive by Quinn (2026-04-02) and not adjudicated since.
- **Workaround**: Read OGC CS API Part 1 `/req/deployment/collections` text and either narrow the heuristic to match the spec, or document why the relaxation is safe.

## Resolved Issues

### features-core.ts rel=self audit (RESOLVED 2026-04-17 — rubric-6.1 exercise)
- **Finding (resolved)**: Raze's review of sprint user-testing-round-01 flagged `src/engine/registry/features-core.ts` `/req/ogcapi-features/items-links` as potentially the same class of bug as GH #3 (spec example asserted as requirement).
- **Audit outcome**: `self` IS normatively required on OGC API Features Part 1 items responses per OGC 17-069r4 §7.15 Requirement 28 A: *"The response SHALL include a link to this resource (i.e. `self`) and to the alternate representations of this resource (`alternate`) (permitted only if the resource is represented in alternate formats)."* — a SHALL clause, not an example. The existing assertion was **correct**. Distinguishing case: OGC Common Part 1 (19-072) landing page has `self` only as an illustrative example (GH #3); OGC Features Part 1 (17-069) items response has `self` as normative.
- **Resolution actions (2026-04-17)**:
  - Added source-citation comments at `src/engine/registry/features-core.ts:77-97` (REQ definition) and `:611-614` (assertion site), citing OGC 17-069r4 §7.15 Req 28 A.
  - Updated the failure message to reference the normative source so reviewers can audit quickly.
  - Added 5 regression tests at `tests/unit/engine/registry/features-core-links-normative.test.ts` covering the PASS (self present) / FAIL (self absent, cites 17-069) / minimal-self-only PASS / missing-links-array FAIL / audit-trail cases.
  - Added `REQ-TEST-002.5`, `REQ-TEST-CITE-002`, `SCENARIO-FEATURES-LINKS-001`, `SCENARIO-FEATURES-LINKS-002` to `openspec/capabilities/conformance-testing/spec.md`.
- **Generalization**: The audit produced `REQ-TEST-CITE-002` — a project-wide mandate that every `rel=*` assertion in `src/engine/registry/**/*.ts` must include a source-citation comment identifying the normative clause (`SHALL`/`MUST`/`REQUIRED`). This makes the next rubric-6.1 sweep mechanical: grep for `rel=` without nearby `/req/` or `OGC \d{2}-\d+` citation.

### GH #7 Observation-body runtime coupling (RESOLVED 2026-04-17 — REQ-TEST-DYNAMIC-002)
- **Prior residue (resolved)**: After sprint user-testing-round-01, `buildObservationBodyForDatastream` was called with the hardcoded `DATASTREAM_CREATE_BODY` fixture. A server that accepted our datastream insert but canonicalized `resultType` or `schema` would leave the observation body silently misaligned with the server's actual datastream.
- **Resolution (2026-04-17)**: `testCrudObservation` at `src/engine/registry/part2-crud.ts` now:
  1. POSTs the datastream (as before).
  2. **GETs the server's view of the newly-created datastream** (or the existing datastream-ID from the discovery cache if reusing).
  3. Parses the server response; FAILs with `REQ-TEST-DYNAMIC-002` + `parseable JSON` error if unparseable (SCENARIO-OBS-SCHEMA-003).
  4. Feeds the SERVER's datastream object into `buildObservationBodyForDatastream`; FAILs with `REQ-TEST-DYNAMIC-002` + `cannot mirror` error if the server's resultType isn't supported (SCENARIO-OBS-SCHEMA-002).
  5. Only then POSTs the derived observation body.
- **Builder type loosened**: `buildObservationBodyForDatastream` parameter relaxed from `typeof DATASTREAM_CREATE_BODY` to structural `DatastreamShapeForObservation = { resultType?: unknown; schema?: unknown; ... }` so the same builder serves both the authoring-time call (module load, REQ-TEST-DYNAMIC-001) and the runtime call (inside the CRUD test, REQ-TEST-DYNAMIC-002).
- **Regression tests**: 3 new cases in `tests/unit/engine/registry/part2-crud.test.ts` describe "CRUD Observation test": (a) unparseable JSON from GET datastream, (b) non-200 from GET datastream, (c) server rewrites to unsupported resultType. Each asserts `postMock` is called exactly once (the datastream POST) — proving the observation body is NOT silently POSTed when the runtime-coupling check trips. The existing "passes when observation POST returns 201" test was updated to include a valid GET-datastream mock so the full flow exercises.
- **Spec**: `REQ-TEST-DYNAMIC-002`, `SCENARIO-OBS-SCHEMA-002`, `SCENARIO-OBS-SCHEMA-003` in `openspec/capabilities/dynamic-data-testing/spec.md`. Earlier `SCENARIO-OBS-SCHEMA-001` retitled "authoring layer" for clarity.

### GH #1 — Assessments blocked on local development servers (RESOLVED 2026-04-17)
- **Symptom (resolved)**: SSRF guard rejected `http://localhost:*`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` etc. unconditionally — correct for production but blocked the primary developer workflow of testing `http://localhost:8080` against their own CS API implementation. The reporter (earocorn) flagged this as a "critical component" of debuggability.
- **Resolution**: Added opt-in env var `ALLOW_PRIVATE_NETWORKS=true`. When set at server startup: SSRF guard accepts localhost + RFC 1918 addresses (still blocks non-HTTP(S) schemes like ftp://, file://, data:); server log emits a prominent warning; `/api/health` returns `{allowPrivateNetworks: true}`; landing page displays an amber "Local-dev mode" banner; client-side URL validator relaxes the private-IP check. Default (unset or any value other than literal string `true`) preserves production-safe blocking. 8 new unit tests in `tests/unit/engine/ssrf-guard.test.ts` cover both the opt-in and default modes. Spec: `REQ-SSRF-002` + `SCENARIO-SSRF-LOCAL-001/002` in `openspec/capabilities/test-engine/spec.md`. Gate 2 persona check "Developer-testing-local-server" documented in `_bmad/github-issues-audit.md` item 4.

### GH #2 — Cannot authenticate when landing-page discovery returns 401 (RESOLVED 2026-04-17)
- **Symptom (resolved)**: Protected CS API endpoints return 401 at discovery time, but the authentication-config form was only available on the configure page — which is unreachable until discovery succeeds. Users with protected IUTs had no way to enter credentials.
- **Resolution**: Landing page (`src/app/page.tsx`) now catches 401/403 from `POST /api/assessments` and shows an inline "Authentication required" panel with the full `AuthConfigForm` (bearer/api-key/basic) and a "Discover with credentials" retry button. Successful credentials persist to sessionStorage under `auth:{sessionId}` and are pre-loaded into the configure-page auth form when the user reaches it. A distinct "Authentication rejected" message is shown when retry also fails. Spec: `REQ-AUTH-002` + `SCENARIO-AUTH-PROTECTED-001` in `openspec/capabilities/endpoint-discovery/spec.md`.

### GH #3 — Links conformance test used spec examples as requirements (RESOLVED 2026-04-17)
- **Symptom (resolved)**: `src/engine/registry/common.ts` `testLandingPageLinks` required `['self', 'service-desc', 'conformance']`. OGC API Common Part 1 (19-072) `/req/core/root-success` normatively requires only `(service-desc OR service-doc)` AND `conformance`; `self` appears only in illustrative landing-page examples. GeoRobotix's landing page (compliant) lacks `self` and was therefore FAILed as a false positive.
- **Resolution**: Rewrote the assertion to require `(service-desc OR service-doc)` AND `conformance`; `self` is no longer asserted. 5 new regression tests in `tests/unit/engine/registry/common-links-normative.test.ts` cover: (1) PASS when `self` absent but normative set present, (2) PASS with service-doc substituting service-desc, (3) FAIL when conformance missing, (4) FAIL when neither service-desc nor service-doc, (5) PASS for minimal normative set. Spec: `SCENARIO-LINKS-NORMATIVE-001` in `openspec/capabilities/conformance-testing/spec.md`. Related-class audit follow-up: `features-core.ts` still cites `rel=self` in `/req/ogcapi-features/items-links` — flagged by Raze 2026-04-17 for rubric-6.1 audit next sprint.

### GH #4 — Schemas not recursively pulled if they contain $ref (RESOLVED 2026-04-17)
- **Symptom (resolved)**: `scripts/fetch-schemas.ts` fetched a fixed list only; `$ref` targets pointing outside the list (e.g. `dataStream_create.json` → `dataStream.json` → `../../../../../common/timePeriod.json`) dangled and Ajv couldn't compile the closure. Schema validation silently weakened.
- **Resolution**: Rewrote the script to walk every fetched schema's `$ref`s, enqueue transitively-referenced files, and continue until closure is stable. Refs rewritten to a canonical bundle IRI so Ajv's URI resolver dereferences across directories. Bundle grew 75 → 126 schemas; `schema-validator.ts` switched to `ajv/dist/2020.js` for draft-2020-12 support. Gate 1 mechanical check: `tests/unit/engine/schema-bundle-integrity.test.ts`.

### GH #5 — Part 2 tests don't keep the correct API root (RESOLVED 2026-04-17)
- **Symptom (resolved)**: With `endpointUrl=https://api.example.com/sensorhub/api`, Part 2 tests hit `https://api.example.com/datastreams` instead of `https://api.example.com/sensorhub/api/datastreams`. Root cause: `part2-common.ts` used `['/datastreams', '/observations', ...]` with leading slashes; `crud.ts` and `update.ts` passed leading-slash arguments to the lifecycle helpers. Per WHATWG URL, `new URL('/x', 'https://host/a/')` drops the base path.
- **Resolution**: Rewrote the offending paths to be relative (no leading slash). Gate 1 mechanical check: `tests/unit/engine/registry/part2-url-construction.test.ts` runs every Part 2 module against a capturing mock with a non-root IUT base URL and asserts every outbound URL starts with that base.

### GH #6 — Datastream insertion body didn't validate against create-schema (RESOLVED 2026-04-17)
- **Symptom (resolved)**: Minimal body was `{name, outputName, schema: {obsFormat}}` — missed every other required field of `dataStream_create.json` once the schema closure (GH #4) resolved. A spec-strict server would reject the POST with 400, and CRUD tests would FAIL for reasons other than server non-conformance.
- **Resolution**: `DATASTREAM_CREATE_BODY` and `CONTROLSTREAM_CREATE_BODY` now carry the full required set (`id`, `formats`, `system@link`, `observedProperties`, time periods as 2-element ISO arrays, `resultType`, `live`, full SWE Quantity `resultSchema`). Gate 1 mechanical check: `tests/unit/engine/registry/crud-body-schemas.test.ts` validates each body against the corresponding `*_create.json` schema.

### GH #7 — Observation insertion didn't match inserted Datastream schema (RESOLVED 2026-04-17)
- **Symptom (resolved)**: Observation-insert body was `{phenomenonTime, resultTime, result: 42}` regardless of the datastream's declared `resultType`. If a future sprint switched the datastream to `resultType: 'Count'` or `'Category'`, the observation body would silently drift out of alignment.
- **Resolution**: `OBSERVATION_CREATE_BODY` is now produced by `buildObservationBodyForDatastream(DATASTREAM_CREATE_BODY)`, a builder that reads the datastream's `resultType` and synthesizes a conforming observation. Current impl handles `'measure'` (Quantity) → `{result: <number>}`; throws for unsupported types so authors can't silently keep a stale body. Gate 1 mechanical check: `tests/unit/engine/registry/observation-dynamic-schema.test.ts` asserts the observation's result type matches the datastream's resultType. Gate 4 Raze Section 6.3 extends this to cover Command ← ControlStream and Subsystem ← System at the integration level.

### Backend Destructive-Confirm Enforcement (RESOLVED 2026-04-16T22:27Z — F3 Option A)
- **Symptom (resolved)**: `src/server/routes/assessments.ts:185-232` (POST `/:id/start`) accepted requests without any destructive-opt-in check. A direct `curl -X POST` could bypass the client-side checkbox gate and execute CRUD/Update tests against the IUT.
- **Resolution**: Server now returns HTTP 400 `{ "code": "DESTRUCTIVE_CONFIRM_REQUIRED" }` when any selected class URI ends in `/conf/create-replace-delete` or `/conf/update` and the request body lacks `destructiveConfirmed: true`. Shared helper at `src/lib/destructive-classes.ts` (`isDestructiveClass`, `selectedHasDestructive`) used by both the configure page UX gate and the server handler. Client (`api-client.ts` + `configure/page.tsx`) sends `destructiveConfirmed` on Start. Six new unit tests in `tests/unit/server/assessments.test.ts` cover non-destructive happy path, destructive-without-confirm (400), destructive-with-confirm=false (400), destructive-with-confirm=true (200), 404-on-unknown-id, 409-on-already-completed. Live-curl verified against localhost:4000 — 400/400/200 behavior confirmed. SCENARIO-SESS-CONFIRM-002 added to `openspec/capabilities/progress-session/spec.md` documenting the backend enforcement contract.

### URL Construction Bug (67+34 instances, Fixed 2026-03-31 then verified in commit 168c032)
- **Problem**: `new URL('/path', baseUrl)` with leading slash discarded the base path. Affected 11 files in `src/engine/registry/`.
- **Fix**: All calls rewritten to `new URL('path', baseUrl)` (relative). Verified 2026-04-16: regex search returns 0 matches.

### Export Path Mismatch (Fixed in commit 168c032)
- **Problem**: Frontend called `/export/json` (path-based); backend expected `/export?format=json` (query-param).
- **Fix**: `api-client.ts:124` updated. JSON export works end-to-end.

### Stale Unit Test `assessments.test.ts:173` (Fixed in commit 168c032)
- **Problem**: Expected `{ id, status: 'discovering' }` but route returned `{ id, discoveryResult: {...} }` after contract change.
- **Fix**: Test updated to `{ id, discoveryResult: { landingPage, conformsTo, collectionIds, links } }`. 906/906 passing 2026-04-16.

### Type Check Errors (Fixed in commit 168c032)
- **Problem**: Missing `@types/pdfkit`, missing `vitest/globals` in tsconfig, unused `@ts-expect-error`.
- **Fix**: `@types/pdfkit@^0.17.5` added, `"vitest/globals"` added to tsconfig types, directives cleaned up. `tsc --noEmit` clean 2026-04-16.

### Playwright Port Hardcoded (Fixed in commit 168c032)
- **Problem**: `playwright.config.ts` hardcoded `baseURL: http://localhost:3000` while dev server ran on 4000.
- **Fix**: Parameterized via `CSAPI_PORT || PORT || '3000'`. E2E run against port 4000 still pending post-fix.

### `.js` Import Extensions Broke Next.js (Fixed in commit 168c032)
- **Problem**: 12 files had TS imports with `.js` extensions; Next.js webpack couldn't resolve them.
- **Fix**: Extensions removed across affected files.

### `POST /api/assessments` Response Shape Mismatch (Fixed in commit 168c032)
- **Problem**: Route returned `{ id, status }` but client expected `{ id, discoveryResult }`.
- **Fix**: Route updated + new `POST /:id/start` added for async test execution.

### `registerAllModules()` Never Called (Fixed in commit 168c032)
- **Problem**: Registry populated at import time but never initialized at server bootstrap; 0 tests ran at runtime.
- **Fix**: Explicit `registerAllModules()` call in server startup.

### Results Page Filters Operated at Class Level (Fixed in commit 0cb78ff)
- **Problem**: Status filters (pass/fail/skip) filtered conformance classes, not individual tests.
- **Fix**: Filters now operate at test level; failed/skipped classes auto-expand.

### SSE "Connection lost" Dead-End (Fixed in commit 168c032)
- **Problem**: SSE disconnect gave hard error with no recovery.
- **Fix**: Added polling fallback with auto-redirect to results page on completion.

### Skip Reasons Not Displayed in Results (Fixed in commit 168c032)
- **Problem**: Skipped tests showed no reason; UX gap for conformance reports.
- **Fix**: Skip reasons rendered in test detail; skipped classes auto-expand.

### `ipaddr.js` ESM Import (Fixed 2026-03-31)
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

### Gate 4 (Adversarial Review) Catches Methodology Gaps That Gate 2 Cannot
Gate 2 (Evaluator, Quinn) judges the code against the sprint contract. Gate 4 (Adversarial Reviewer, Raze) judges whether the evidence trail (ops/test-results.md, ops/metrics.md, capability spec statuses) was actually refreshed after the work was "done." On its first live run 2026-04-16, Raze caught that the retro-eval sprint was declared fixed in changelog but the test-results.md still carried pre-fix RETRY verdicts, the metrics turn log stopped 14 days prior, and none of the capability specs had been reconciled. These are exactly the kind of silent gaps other gates do not check for.

### Test Assertions that Fabricate Data are Worse than SKIPs
`filtering.ts` originally defaulted to `'urn:example:procedure:1'` when the server had no procedures, on the assumption the server "just needs to accept the parameter." For a compliance testing tool this is dangerous: a server returning empty 200 for unknown URIs would pass the test spuriously (false positive). A server returning 404 would fail for the wrong reason (false negative on an unrelated requirement). SKIP with a clear reason is always better than inventing input data.
