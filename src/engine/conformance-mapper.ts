// Maps conformance class URIs to human-readable names and standard parts.
// REQ-DISC-005: Map conformance URIs to requirements
// REQ-DISC-006: Display conformance classes with testability indicators

import { CS_PART1_CONF, CS_PART2_CONF, PARENT_CONF } from '@/lib/constants.js';

/** A declared conformance class discovered from the IUT. */
export interface DeclaredConformanceClass {
  /** The conformance class URI from the conformsTo array. */
  uri: string;
  /** Human-readable name. */
  name: string;
  /** Which standard part this belongs to (e.g., "cs-part1", "cs-part2", "ogcapi-common", "ogcapi-features"). */
  standardPart: string;
  /** Whether we have tests for this class (known URI). */
  supported: boolean;
}

/**
 * Map of known conformance class URIs to their metadata.
 * Populated from CS_PART1_CONF, CS_PART2_CONF, and PARENT_CONF constants.
 */
export const CONFORMANCE_CLASS_MAP: Map<string, { name: string; standardPart: string }> = new Map([
  // --- Part 1 (OGC 23-001) ---
  [CS_PART1_CONF.CORE, { name: 'Core', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.SYSTEM, { name: 'System Features', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.SUBSYSTEM, { name: 'Subsystem Features', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.DEPLOYMENT, { name: 'Deployment Features', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.SUBDEPLOYMENT, { name: 'Subdeployment Features', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.PROCEDURE, { name: 'Procedure Features', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.SAMPLING_FEATURE, { name: 'Sampling Feature Features', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.PROPERTY, { name: 'Property Definitions', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.ADVANCED_FILTERING, { name: 'Advanced Filtering', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.CRUD, { name: 'Create/Replace/Delete', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.UPDATE, { name: 'Update', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.GEOJSON, { name: 'GeoJSON Encoding', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.SENSORML, { name: 'SensorML Encoding', standardPart: 'cs-part1' }],
  [CS_PART1_CONF.API_COMMON, { name: 'API Common', standardPart: 'cs-part1' }],

  // --- Part 2 (OGC 23-002) ---
  [CS_PART2_CONF.COMMON, { name: 'API Common', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.DATASTREAM, { name: 'Datastream', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.CONTROLSTREAM, { name: 'Control Stream', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.FEASIBILITY, { name: 'Feasibility', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.SYSTEM_EVENT, { name: 'System Event', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.SYSTEM_HISTORY, { name: 'System History', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.ADVANCED_FILTERING, { name: 'Advanced Filtering', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.CRUD, { name: 'Create/Replace/Delete', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.UPDATE, { name: 'Update', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.JSON, { name: 'JSON Encoding', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.SWE_JSON, { name: 'SWE Common JSON Encoding', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.SWE_TEXT, { name: 'SWE Common Text Encoding', standardPart: 'cs-part2' }],
  [CS_PART2_CONF.SWE_BINARY, { name: 'SWE Common Binary Encoding', standardPart: 'cs-part2' }],

  // --- Parent Standards ---
  [PARENT_CONF.COMMON_CORE, { name: 'OGC API Common Core', standardPart: 'ogcapi-common' }],
  [PARENT_CONF.COMMON_JSON, { name: 'OGC API Common JSON', standardPart: 'ogcapi-common' }],
  [PARENT_CONF.COMMON_HTML, { name: 'OGC API Common HTML', standardPart: 'ogcapi-common' }],
  [PARENT_CONF.COMMON_OAS30, { name: 'OGC API Common OpenAPI 3.0', standardPart: 'ogcapi-common' }],
  [PARENT_CONF.FEATURES_CORE, { name: 'OGC API Features Core', standardPart: 'ogcapi-features' }],
  [PARENT_CONF.FEATURES_GEOJSON, { name: 'OGC API Features GeoJSON', standardPart: 'ogcapi-features' }],
]);

/**
 * Map an array of conformsTo URIs to DeclaredConformanceClass entries.
 * Known URIs get their human-readable name and standardPart from the map.
 * Unknown URIs are marked supported: false with a generic name.
 */
export function mapConformanceClasses(conformsTo: string[]): DeclaredConformanceClass[] {
  return conformsTo.map((uri) => {
    const known = CONFORMANCE_CLASS_MAP.get(uri);
    if (known) {
      return {
        uri,
        name: known.name,
        standardPart: known.standardPart,
        supported: true,
      };
    }
    return {
      uri,
      name: 'Unknown Conformance Class',
      standardPart: 'unknown',
      supported: false,
    };
  });
}
