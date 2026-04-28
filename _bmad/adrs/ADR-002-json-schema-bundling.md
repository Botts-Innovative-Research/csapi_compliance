# ADR-002 — JSON Schema Bundling Mechanism

- **Status**: Accepted
- **Date**: 2026-04-27
- **Decider**: Architect (Alex)
- **Related**: REQ-ETS-SCAFFOLD-003, REQ-ETS-CORE-001, PRD FR-ETS-26, planner-handoff §`deferred_to_architect`, discovery-handoff §`flags.SCHEMAS-MAY-DRIFT` and §`flags.DUAL-MAINTENANCE-PROCESS`

## Context

The 126 OGC JSON Schemas at `csapi_compliance/schemas/` (covering `connected-systems-1`, `connected-systems-2`, `connected-systems-shared`, `external`, `fallback`, plus a `manifest.json`) were extracted at v1.0 build time from the OGC `ogcapi-connected-systems` repo by `scripts/fetch-schemas.ts`. Both the v1.0 web app (Ajv-based, frozen) and the new ETS (Kaizen-based, in-flight) need the same schema set. Pat's PRD asserts "126 JSON Schemas SHALL be reused verbatim, copied into `src/main/resources/schemas/` of the new repo" but defers the **mechanism** to me.

Four candidates surveyed:

1. **Git submodule** of `csapi_compliance` from the new ETS repo, pointing to a frozen commit (`ab53658`). Pulls all of v1.0 (15-20K LOC) in for ~2 MB of schemas.
2. **Symlink** in the dev tree only, with a Maven `maven-resources-plugin` execution that copies the schemas into `target/classes/schemas/` at build time.
3. **Extract to a third repo** `cs-api-schemas/` consumed by both the frozen web app and the new ETS via git submodule or package manager.
4. **Verbatim copy** at the point in time the new repo is created, with a manual periodic re-sync (CI script that diffs the two trees and warns).

Constraints from upstream:
- The schemas live inside `csapi_compliance` today and are derived from `opengeospatial/ogcapi-connected-systems` (the SWG repo). The SWG continues to publish errata, especially in SensorML and SWE Common (Mary's `SCHEMAS-MAY-DRIFT` flag).
- The v1.0 web app is **frozen** at HEAD `ab53658` (user gate 2026-04-27). It will not move; if errata land, only the new ETS picks them up.
- CITE reviewers want reproducible builds (REQ-ETS-SCAFFOLD-005, NFR-ETS-01). Schema source must be deterministically pinned.

## Decision

**Verbatim copy (option 4) at new-repo creation time, with the schemas committed to the new ETS repo at `src/main/resources/schemas/`. The OGC OpenAPI YAML (the upstream source) is pinned by commit SHA in the new ETS pom.xml. A CI script `scripts/check-schemas-against-upstream.sh` runs nightly in the new ETS repo and fails when the bundled schemas drift from the pinned SHA without a corresponding pin update.**

The frozen v1.0 web app keeps its own copy at `csapi_compliance/schemas/`. Drift between the two is **acknowledged as acceptable** because the v1.0 web app is on freeze. REQ-ETS-SYNC-001 (the TS↔Java URI diff script, separate from this ADR) is the integrity check across the language boundary; ADR-002 governs only the schema-source side.

Concretely:
- Sprint 1 step (manual one-time): `cp -r csapi_compliance/schemas/* <new-repo>/src/main/resources/schemas/`. Capture the source HEAD SHA in `ops/server.md` of the new repo (e.g. `Schemas copied from csapi_compliance@ab53658, derived from opengeospatial/ogcapi-connected-systems@<SHA>`).
- pom.xml step: add a Maven property `<connected-systems-yaml.sha>` and reference it in a comment block at the top of `pom.xml`. Initial value: the SHA pinned by `csapi_compliance/scripts/fetch-schemas.ts` at commit `ab53658`. Generator extracts that SHA in S-ETS-01-01.
- CI step (post-Sprint-1, deferred to fixture epic): a `scripts/check-schemas-against-upstream.sh` that hits the GitHub API for the pinned SHA, downloads the YAML, re-extracts the schemas using the same algorithm `csapi_compliance/scripts/fetch-schemas.ts` used (which can be ported to a Maven-built tool, but Sprint 1 doesn't need it), and diffs the result against `src/main/resources/schemas/`. Drift fails CI. Pin updates require a PR.

## Alternatives considered

- **Git submodule of csapi_compliance** (option 1): rejected. Brings 15-20K LOC of frozen TypeScript into the certification deliverable. CITE SC reviewers would (correctly) ask why a Java ETS depends on a TypeScript repo. Even if scoped to a `schemas/`-only sparse checkout, submodules are operationally fragile (forgotten `--recursive`, `submodule update`) and add no benefit over a verbatim copy.
- **Symlink + maven-resources copy** (option 2): rejected. Symlinks break on Windows developers (PRD NFR-ETS-06 requires Linux + macOS + WSL2 build parity). The build-time copy via `maven-resources-plugin` would work, but it gives the new ETS a non-portable filesystem dependency on the v1.0 repo's location; a CITE reviewer cloning only the ETS repo cannot build it. **Disqualifying.**
- **Third-repo extraction** (option 3): rejected for v1.0 / pre-beta. It is the architecturally cleanest answer, but creating and maintaining a third repo solely for ~2 MB of schemas adds governance overhead disproportionate to the value while the v1.0 web app is frozen and only the new ETS is live. Reconsider at the beta milestone (REQ-ETS-CITE-001) if/when the v1.0 web app is unfrozen for any reason.

## Consequences

**Positive**:
- New ETS repo is **self-contained** — `git clone <ets-repo> && mvn install` works on a host that has never seen `csapi_compliance`. Critical for CITE SC reviewers.
- Reproducible builds (NFR-ETS-01) are trivial: schemas are bytes inside the jar; no network fetch, no submodule resolution.
- The pin-to-SHA mechanism in pom.xml gives auditable provenance: any reviewer can re-derive the schemas from the upstream OGC repo.

**Negative**:
- Drift between the v1.0 web app's schemas and the new ETS's schemas can occur if errata land. **Mitigation**: the user gate has frozen the web app, so this is by-design, not accidental. REQ-ETS-SYNC-001 catches URI-coverage drift; schema-content drift is monitored by the upstream-check CI script (deferred post-Sprint-1).
- Manual re-pin process when OGC publishes errata: a developer must update the SHA in pom.xml, re-run the extraction, commit the schemas + the SHA pin together, and ADR the re-pin (NFR-ETS-07 quarterly review). This is intentional friction — schema changes deserve review.

**Risks**:
- If a SWG update changes a schema definition in a backward-incompatible way (e.g. tightening a `required` list), the ETS may begin to FAIL on previously-passing IUTs. **Mitigation**: re-pin updates are ADR-tracked (NFR-ETS-07) so the cause is traceable; the smoke test against GeoRobotix (SCENARIO-ETS-CORE-SMOKE-001) is the canary.

## Notes / references

- v1.0 schema layout (verified 2026-04-27): `csapi_compliance/schemas/{connected-systems-1, connected-systems-2, connected-systems-shared, external, fallback, manifest.json}` — 126 .json files total.
- Upstream SWG repo: https://github.com/opengeospatial/ogcapi-connected-systems (Mary's `SCHEMAS-MAY-DRIFT` flag — SensorML and SWE Common are in active update workstreams).
- v1.0 extraction script (referenced, not ported): `csapi_compliance/scripts/fetch-schemas.ts`.
- features10 reference: schemas embedded in the OpenAPI YAML and loaded at runtime via Kaizen `openapi-parser`. The CS API ETS uses the same Kaizen API but reads from the bundled `schemas/` directory rather than the live OpenAPI YAML, because the OGC CS API OpenAPI YAML is not yet structured the way features10's spec is. Re-evaluate at Part 2 (Sprint 4+) when the SWG settles the OpenAPI structure.
