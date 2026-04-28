# Epic ETS-07: Web-App Freeze (README Reposition + Tag)

> Status: Quick-win — single-story epic, can land any time | Last updated: 2026-04-27

## Goal
Reposition the `csapi_compliance` README as a "developer pre-flight tool, not certification-track," with a prominent link to the new ETS repository, and tag HEAD `ab53658` as `v1.0-frozen`. Owns sub-deliverable 8 of the new ETS capability and resolves R-PIVOT-10. This is the only deliverable in the new scope that touches the v1.0 web-app codebase.

## Dependencies
- Depends on: ETS repo URL exists (needs `epic-ets-01-scaffold` to have created the sibling repo, even if empty)
- Blocks: nothing operationally; the freeze is administrative

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S-ETS-07-01 | (placeholder) README reposition + v1.0-frozen tag | Backlog | REQ-ETS-WEBAPP-FREEZE-001 |

## Acceptance Criteria
- [ ] First non-trivial paragraph of README identifies the project as a "developer pre-flight tool, not certification-track"
- [ ] README links to `github.com/<org>/ets-ogcapi-connectedsystems10`
- [ ] `git tag --list` shows `v1.0-frozen` pointing at `ab53658`
- [ ] No further feature commits to v1.0 functionality (bug-fix-only policy in effect)
