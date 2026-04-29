# Story: S-ETS-04-04 — Sabotage-script 2 bug fixes (stub bind 0.0.0.0 + docker --add-host=host.docker.internal)

**Epic**: epic-ets-04-teamengine-integration
**Sprint**: ets-04
**Priority**: P2 — 2 small mechanical fixes; identified in Sprint 3 close as carryover
**Estimated Complexity**: S
**Status**: Active (Sprint 4)

## Description

Sprint 3 ADR-010 §"Defense-in-depth role split" landed the bash sabotage script with two known issues that prevented hermetic CITE-SC-grade execution. Dana's Sprint 3 verdict log + Raze cumulative `architect_surfaced_risks_status` §STUB-SERVER-PORT-COLLISION-IN-CI both flagged these for Sprint 4 fix:

1. **Stub bind 127.0.0.1 → 0.0.0.0**: the stub server binds to localhost only, so a Docker container running smoke against `host.docker.internal:<port>` cannot reach the stub. One-line edit: `python3 -m http.server <port> --bind 0.0.0.0` (was `--bind 127.0.0.1` or default localhost binding).

2. **Docker `--add-host=host.docker.internal:host-gateway`**: Docker on Linux WITHOUT Docker Desktop does NOT auto-resolve `host.docker.internal` (only Docker Desktop's macOS/Windows variants do). The smoke-test.sh docker run command needs `--add-host=host.docker.internal:host-gateway` to expose the host's Docker bridge IP to the container.

Both fixes are mechanical, ~5 LOC each, no architecture decision required. Generator implements directly without Architect cycle. Sequence BEFORE S-ETS-04-03 if S-ETS-04-03 picks the stub-IUT path (these fixes are prerequisites for hermetic stub-IUT operation).

## Acceptance Criteria

- [ ] `scripts/sabotage-test.sh` stub server binds to 0.0.0.0 (verifiable via `netstat -tlnp | grep <stub-port>` showing `0.0.0.0:<port>` not `127.0.0.1:<port>` or `localhost:<port>`)
- [ ] `scripts/smoke-test.sh` (or sabotage-test.sh's docker run wrapper) uses `--add-host=host.docker.internal:host-gateway`
- [ ] bash sabotage script runs hermetically end-to-end on Linux-without-Docker-Desktop hosts (no `host.docker.internal` resolution failure; smoke container reaches the stub)
- [ ] Live execution evidence archived at `ets-ogcapi-connectedsystems10/ops/test-results/sprint-ets-04-04-sabotage-script-hermetic-<date>.{xml,log}`
- [ ] SCENARIO-ETS-CLEANUP-SABOTAGE-SCRIPT-HERMETIC-001 PASSES
- [ ] No regression in Sprint 3's existing sabotage-script behavior (one-level cascade-skip still demonstrably PASSES)

## Spec References

- REQ-ETS-CLEANUP-005 (modified) — extends ADR-010 dual-pattern to hermetic execution
- REQ-ETS-CLEANUP-012 (NEW) — Sabotage-script bug fixes for hermetic CITE-SC-grade execution

## Technical Notes

- Verify stub server bind address with `netstat -tlnp | grep <port>` AFTER the script starts the stub (before tearing it down).
- `--add-host=host.docker.internal:host-gateway` requires Docker 20.10+; verify host Docker version meets this minimum.
- Sprint 3 sabotage script used a bogus-IUT fallback path (direct point at unreachable host) rather than stub-server — Sprint 4 fixes activate the stub-server path.

## Dependencies

- None (orthogonal to all other Sprint 4 stories; prerequisite for S-ETS-04-03 if Architect picks stub-IUT path)

## Definition of Done

- [ ] Both bug fixes applied to scripts
- [ ] Hermetic end-to-end execution verified on a Linux-without-Docker-Desktop host
- [ ] Spec implementation status updated
- [ ] Sprint 4 close artifact archived
