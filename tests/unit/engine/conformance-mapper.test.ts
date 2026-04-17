// Tests for conformance-mapper.ts
// REQ-DISC-005: Map conformance URIs to requirements
// SCENARIO-DISC-FLOW-005: Map conformance classes to internal requirement set (CRITICAL)

import { describe, it, expect } from 'vitest';
import { CS_PART1_CONF, CS_PART2_CONF, PARENT_CONF } from '@/lib/constants.js';
import {
  mapConformanceClasses,
  CONFORMANCE_CLASS_MAP,
} from '@/engine/conformance-mapper.js';

describe('conformance-mapper', () => {
  describe('CONFORMANCE_CLASS_MAP', () => {
    it('contains entries for all Part 1 URIs', () => {
      for (const uri of Object.values(CS_PART1_CONF)) {
        expect(CONFORMANCE_CLASS_MAP.has(uri)).toBe(true);
      }
    });

    it('contains entries for all Part 2 URIs', () => {
      for (const uri of Object.values(CS_PART2_CONF)) {
        expect(CONFORMANCE_CLASS_MAP.has(uri)).toBe(true);
      }
    });

    it('contains entries for all parent standard URIs', () => {
      for (const uri of Object.values(PARENT_CONF)) {
        expect(CONFORMANCE_CLASS_MAP.has(uri)).toBe(true);
      }
    });
  });

  describe('mapConformanceClasses', () => {
    // --- Part 1 ---

    it('maps Part 1 Core URI correctly', () => {
      const result = mapConformanceClasses([CS_PART1_CONF.CORE]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uri: CS_PART1_CONF.CORE,
        name: 'Core',
        standardPart: 'cs-part1',
        supported: true,
      });
    });

    it('maps Part 1 System URI correctly', () => {
      const result = mapConformanceClasses([CS_PART1_CONF.SYSTEM]);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('System Features');
      expect(result[0].standardPart).toBe('cs-part1');
      expect(result[0].supported).toBe(true);
    });

    it('maps Part 1 Deployment URI correctly', () => {
      const result = mapConformanceClasses([CS_PART1_CONF.DEPLOYMENT]);
      expect(result[0].name).toBe('Deployment Features');
      expect(result[0].standardPart).toBe('cs-part1');
    });

    it('maps Part 1 Procedure URI correctly', () => {
      const result = mapConformanceClasses([CS_PART1_CONF.PROCEDURE]);
      expect(result[0].name).toBe('Procedure Features');
    });

    it('maps Part 1 Sampling Feature URI correctly', () => {
      const result = mapConformanceClasses([CS_PART1_CONF.SAMPLING_FEATURE]);
      expect(result[0].name).toBe('Sampling Feature Features');
    });

    it('maps Part 1 Property URI correctly', () => {
      const result = mapConformanceClasses([CS_PART1_CONF.PROPERTY]);
      expect(result[0].name).toBe('Property Definitions');
    });

    it('maps all Part 1 URIs with standardPart cs-part1 and supported true', () => {
      const uris = Object.values(CS_PART1_CONF);
      const result = mapConformanceClasses(uris);
      expect(result).toHaveLength(uris.length);
      for (const cls of result) {
        expect(cls.standardPart).toBe('cs-part1');
        expect(cls.supported).toBe(true);
      }
    });

    // --- Part 2 ---

    it('maps Part 2 Datastream URI correctly', () => {
      const result = mapConformanceClasses([CS_PART2_CONF.DATASTREAM]);
      expect(result[0]).toEqual({
        uri: CS_PART2_CONF.DATASTREAM,
        name: 'Datastream',
        standardPart: 'cs-part2',
        supported: true,
      });
    });

    it('maps Part 2 Control Stream URI correctly', () => {
      const result = mapConformanceClasses([CS_PART2_CONF.CONTROLSTREAM]);
      expect(result[0].name).toBe('Control Stream');
      expect(result[0].standardPart).toBe('cs-part2');
    });

    it('maps all Part 2 URIs with standardPart cs-part2 and supported true', () => {
      const uris = Object.values(CS_PART2_CONF);
      const result = mapConformanceClasses(uris);
      expect(result).toHaveLength(uris.length);
      for (const cls of result) {
        expect(cls.standardPart).toBe('cs-part2');
        expect(cls.supported).toBe(true);
      }
    });

    // --- Parent Standards ---

    it('maps OGC API Common Core URI correctly', () => {
      const result = mapConformanceClasses([PARENT_CONF.COMMON_CORE]);
      expect(result[0]).toEqual({
        uri: PARENT_CONF.COMMON_CORE,
        name: 'OGC API Common Core',
        standardPart: 'ogcapi-common',
        supported: true,
      });
    });

    it('maps OGC API Features Core URI correctly', () => {
      const result = mapConformanceClasses([PARENT_CONF.FEATURES_CORE]);
      expect(result[0]).toEqual({
        uri: PARENT_CONF.FEATURES_CORE,
        name: 'OGC API Features Core',
        standardPart: 'ogcapi-features',
        supported: true,
      });
    });

    it('maps all parent standard URIs with supported true', () => {
      const uris = Object.values(PARENT_CONF);
      const result = mapConformanceClasses(uris);
      expect(result).toHaveLength(uris.length);
      for (const cls of result) {
        expect(cls.supported).toBe(true);
        expect(['ogcapi-common', 'ogcapi-features']).toContain(cls.standardPart);
      }
    });

    // --- Unknown URIs ---

    it('returns unsupported for unknown URIs', () => {
      const unknownUri = 'http://example.com/unknown/conformance/class';
      const result = mapConformanceClasses([unknownUri]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        uri: unknownUri,
        name: 'Unknown Conformance Class',
        standardPart: 'unknown',
        supported: false,
      });
    });

    it('handles a mix of known and unknown URIs', () => {
      const uris = [
        CS_PART1_CONF.CORE,
        'http://example.com/custom/class',
        CS_PART2_CONF.DATASTREAM,
      ];
      const result = mapConformanceClasses(uris);
      expect(result).toHaveLength(3);
      expect(result[0].supported).toBe(true);
      expect(result[0].name).toBe('Core');
      expect(result[1].supported).toBe(false);
      expect(result[1].name).toBe('Unknown Conformance Class');
      expect(result[2].supported).toBe(true);
      expect(result[2].name).toBe('Datastream');
    });

    it('returns empty array for empty input', () => {
      const result = mapConformanceClasses([]);
      expect(result).toHaveLength(0);
    });
  });
});
