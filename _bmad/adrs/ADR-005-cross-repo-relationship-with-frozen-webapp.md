# ADR-005 — Cross-Repo Relationship with the Frozen v1.0 Web App

- **Status**: Accepted
- **Date**: 2026-04-27
- **Decider**: Architect (Alex)
- **Related**: REQ-ETS-WEBAPP-FREEZE-001, REQ-ETS-SYNC-001, discovery-handoff §`flags.WEB-APP-FATE-USER-DECISION` and §`flags.DUAL-MAINTENANCE-PROCESS`, ADR-002 (schema bundling)

## Context

User decision 2026-04-27 froze the v1.0 web app at HEAD `ab53658` and named the new ETS as the certification-track deliverable. The two repos coexist:

- `csapi_compliance` (this repo) — Next.js/TypeScript web app, status FROZEN, README repositioned as "developer pre-flight tool, not certification-track".
- `ets-ogcapi-connectedsystems10` (per ADR-003 naming) — Java/TestNG ETS, status ACTIVE, certification-track.

Mary's `DUAL-MAINTENANCE-PROCESS` flag asks: how do these two repos reference each other? Three concerns:
1. **Discoverability**: a user finding either repo should know the other exists and which one is for which audience.
2. **Schema source-of-truth drift**: schemas live in both repos (ADR-002 chose verbatim copy). Drift detection.
3. **Spec-knowledge drift**: the 27 TS registry modules in v1.0 encode OGC requirement URIs. The new Java ETS must cover the same URIs (REQ-ETS-SYNC-001).

## Decision

The cross-repo relationship has **four artifacts** and **no code-level coupling**:

### 1. README cross-link (both directions)

- **`csapi_compliance/README.md`** (per REQ-ETS-WEBAPP-FREEZE-001): the first non-trivial paragraph reframes the repo as "developer pre-flight tool, not certification-track" and links to `github.com/<our-org>/ets-ogcapi-connectedsystems10`.
- **`ets-ogcapi-connectedsystems10/README.adoc`** (Sprint 1, S-ETS-01-01): a "Related Projects" section near the bottom links to `github.com/<our-org>/csapi_compliance` describing it as "the developer pre-flight web tool, frozen at v1.0, useful during shift-left CS API development."

### 2. Frozen tag on v1.0 (one-time)

- The `csapi_compliance` repo at HEAD `ab53658` SHALL be tagged `v1.0-frozen`. This makes the freeze point auditable and gives the new ETS a stable Git anchor for the schema-source provenance comment (ADR-002).
- The tag SHOULD be annotated (`git tag -a v1.0-frozen -m "Frozen 2026-04-27 at user-pivot to Java/TestNG ETS"`) so `git show v1.0-frozen` returns the freeze rationale.
- Done as part of REQ-ETS-WEBAPP-FREEZE-001 (separate epic, not Sprint 1).

### 3. Schema source-of-truth contract

Per ADR-002:
- Schemas live verbatim in **both** repos. Drift between them is acceptable because the v1.0 web app is frozen and only the new ETS picks up SWG errata.
- The new ETS pom.xml comment block records the upstream OGC SHA AND the `csapi_compliance@ab53658` provenance pointer. The v1.0 web app's existing `manifest.json` continues to record its own SHA.
- No CI integration between the repos. Each repo is independently buildable and reviewable. **No git submodule, no symlink, no shared package.**

### 4. URI-coverage diff (REQ-ETS-SYNC-001)

The new ETS repo SHALL host a script `scripts/sync-uri-coverage.sh` that:
- Reads `csapi_compliance/src/engine/registry/*.ts` from a configurable filesystem path (CI clones `csapi_compliance@v1.0-frozen` into a sibling working directory)
- Extracts every canonical OGC requirement URI from both sides (TS via regex on `requirement:` and `uri:` fields; Java via parsing `@Test(description=...)` strings)
- Diffs the URI sets
- Fails CI if any URI is in TS but not in Java without an entry in `ops/uri-coverage-allowlist.txt`

This script lives in the new ETS repo, not `csapi_compliance` — the v1.0 web app is frozen and gets no new CI workflows. Implementation deferred until Part 1 is feature-complete (per REQ-ETS-SYNC-001 spec note); placeholder script + allowlist file SHOULD be committed in Sprint 2.

## Alternatives considered

- **Move `csapi_compliance` schemas to a third repo `cs-api-schemas`** (ADR-002 option 3): rejected for v1.0 / pre-beta but reconsidered at beta milestone.
- **Soft-fork the v1.0 web app**: rejected. The web app is frozen by user decision; even a minor co-evolution adds maintenance cost the user explicitly declined.
- **Monorepo (move new ETS into `csapi_compliance/ets/`)**: rejected. (a) CITE SC reviewers expect the ETS to be a standalone repo with the OGC ETS layout; nesting it under a TypeScript web app is a structural smell. (b) Maven artifacts published from a subdir of a multi-language repo create artifact-coordinate / provenance ambiguity. (c) The user's pivot framing explicitly named "sibling repo" as the topology decision.
- **Archive `csapi_compliance` as read-only on GitHub**: rejected for now. The `v1.0-frozen` tag + README reposition is sufficient; full archival makes the repo non-obviously findable and removes the pre-flight-tool utility. Consider archival at the beta milestone if cross-repo confusion materializes.

## Consequences

**Positive**:
- Each repo is independently understandable and reviewable. CITE SC reviewers can clone the new ETS without ever loading the v1.0 web app.
- The frozen tag preserves the v1.0 audit trail (1003 unit tests, 9 epics, 39 stories at HEAD `ab53658`) for OGC SC review or future re-publication, without committing to maintenance.
- The cross-link pair (README ↔ README.adoc) gives both audiences (CS API developer using the web app vs. CITE submitter using the ETS) a one-click path to the other tool.
- No build-time or runtime coupling means a v1.0 dep upgrade (or its absence) cannot break the ETS build.

**Negative**:
- Schemas drift over time. **Accepted** — this is the cost of the freeze.
- The URI-diff script (REQ-ETS-SYNC-001) requires the new ETS's CI to clone `csapi_compliance@v1.0-frozen` into the workspace. Adds ~30 seconds to CI runs. Acceptable.
- A reader who finds only one repo via search must follow the cross-link to find the other. SEO / discoverability risk is small (both repos live in our org).

**Risks**:
- If errata land in CS API Part 1 that affect URIs already covered by v1.0, the URI-diff script flags them as "missing in ETS" until the ETS catches up. **Mitigation**: that's exactly the script's purpose — it is a forcing function, not a bug. Allowlist entries document deliberate divergence.
- If the user later un-freezes v1.0 (e.g. for a security fix), the cross-link sentence in the README must be reviewed. **Mitigation**: ADR-005 lives in the new ETS's `_bmad/adrs/` and is referenced in `csapi_compliance/README.md` after the reposition; a reader can find this ADR from either side.

## Notes / references

- User pivot decision (2026-04-27): `_bmad/product-brief.md` v2.0 §`User Decisions`.
- Discovery flag `WEB-APP-FATE-USER-DECISION`: `.harness/handoffs/discovery-handoff.yaml` line 116-124.
- Discovery flag `DUAL-MAINTENANCE-PROCESS`: `.harness/handoffs/discovery-handoff.yaml` line 126-133.
- REQ-ETS-WEBAPP-FREEZE-001: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` §Sub-deliverable 8.
- REQ-ETS-SYNC-001: `openspec/capabilities/ets-ogcapi-connectedsystems/spec.md` §Sub-deliverable 9.
- ADR-002 (schemas verbatim copy): `_bmad/adrs/ADR-002-json-schema-bundling.md`.
- v1.0 frozen architecture (preserved): `_bmad/architecture-v1-frozen.md`.
