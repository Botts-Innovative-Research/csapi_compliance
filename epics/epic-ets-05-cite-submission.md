# Epic ETS-05: CITE Submission + Three-Implementation Outreach

> Status: Calendar-bound — activates at beta milestone, not a code epic | Last updated: 2026-04-27

## Goal
Publish the ETS to OSSRH/Maven Central, prepare an outreach package for OpenSensorHub and `SomethingCreativeStudios/connected-systems-go` to participate in CITE three-implementation testing, and file a CITE SubCommittee submission ticket requesting beta status. Owns sub-deliverable 7 of the new ETS capability.

## Dependencies
- Depends on: `epic-ets-02-part1-classes` AND `epic-ets-03-part2-classes` (need feature-complete ETS), `epic-ets-04-teamengine-integration` (needs working TeamEngine deployment)
- Blocks: official OGC release (CITE SC review + TC vote come from this submission)

## Stories

| ID | Story | Status | OpenSpec Refs |
|----|-------|--------|---------------|
| S-ETS-05-01 | (placeholder) Set up OSSRH credentials + GPG signing in CI | Backlog | REQ-ETS-CITE-001 |
| S-ETS-05-02 | (placeholder) Maven Central publish at beta milestone | Backlog | REQ-ETS-CITE-001, NFR-ETS-14 |
| S-ETS-05-03 | (placeholder) Outreach package for OpenSensorHub | Backlog | REQ-ETS-CITE-002 |
| S-ETS-05-04 | (placeholder) Outreach package for connected-systems-go | Backlog | REQ-ETS-CITE-002 |
| S-ETS-05-05 | (placeholder) GeoRobotix beta-test record formalization | Backlog | REQ-ETS-CITE-002 |
| S-ETS-05-06 | (placeholder) File CITE SC submission ticket | Backlog | REQ-ETS-CITE-003 |

## Acceptance Criteria
- [ ] Artifact `org.opengis.cite:ets-ogcapi-connectedsystems10:<version>` available on Maven Central
- [ ] Three-implementation pool has formal commitment: GeoRobotix + OpenSensorHub + connected-systems-go
- [ ] CITE SC submission ticket filed and acknowledged
- [ ] Beta status granted by CITE SC (out of our control; tracked as a milestone)

## Notes
- Calendar-driven, not code-driven. Activated when Part 1 + Part 2 ETS work is feature-complete.
- Outreach risk is the dominant non-code risk per Discovery flag THREE-IMPL-RULE-RISK.
