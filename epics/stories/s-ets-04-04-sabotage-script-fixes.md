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

- [x] Both bug fixes applied to scripts
- [ ] Hermetic end-to-end execution verified on a Linux-without-Docker-Desktop host (deferred to Quinn/Raze gate live verification per Pat's QUINN-RAZE-GATE-VERIFICATION-TIME-BUDGET mitigation; Generator does not run docker in Sprint 4 batch 1)
- [x] Spec implementation status updated (pending Quinn+Raze)
- [ ] Sprint 4 close artifact archived (gate-time)

## Implementation Notes (Generator Run 1, 2026-04-29)

Both mechanical bug fixes applied as separate atomic commits in
~/docker/gir/ets-ogcapi-connectedsystems10/:

  - HEAD~2 (4f65130) — `S-ETS-04-04: sabotage-test.sh stub bind 127.0.0.1 -> 0.0.0.0`
    Bug fix (a): the Python http.server.ThreadingTCPServer in
    scripts/sabotage-test.sh now binds to ("0.0.0.0", 0) instead of
    ("127.0.0.1", 0). The Python heredoc comment was also updated to
    reflect the cross-reference to fix (b).

  - HEAD~1 (d954ae9) — `S-ETS-04-04: smoke-test.sh add --add-host=host.docker.internal:host-gateway`
    Bug fix (b): scripts/smoke-test.sh's `docker run -d --name ... -p ...`
    invocation now includes `--add-host=host.docker.internal:host-gateway`
    (Docker 20.10+). On Linux without Docker Desktop this is required
    for the container to resolve `host.docker.internal` to the host's
    Docker bridge IP. A 5-line comment block was added explaining the
    constraint.

STUB-IUT-PORT-LEAK risk verification (Alex 2026-04-29 surfaced risk):
The existing `cleanup_all` trap in sabotage-test.sh (lines 76-90 at the
new HEAD) reads PID from `$STUB_PIDFILE` and kills by PID (`kill "$pid"`
followed by `kill -9 "$pid"`). It is NOT a port-based kill, so it will
NOT leave orphaned processes if a new run picks a different ephemeral
port. NO additional fix required for STUB-IUT-PORT-LEAK; the
write-to-file PID-tracking pattern is already in place.

Verification:
  - `mvn test` BUILD SUCCESS; surefire 61 / 0 fail / 0 err / 3 skip
    (UNCHANGED from Sprint 3 c56df10 baseline; no regression)
  - Live execution of the script is deferred to Quinn/Raze gate (per
    Pat's QUINN-RAZE-GATE-VERIFICATION-TIME-BUDGET mitigation; Generator
    does not run docker in Sprint 4 batch 1)

Composability: these fixes are PREREQUISITES for S-ETS-04-03 (credential-
leak E2E with stub IUT). Generator Run 2 will reuse the now-functional
0.0.0.0 stub primitive + host.docker.internal resolution for stub-iut.sh.
