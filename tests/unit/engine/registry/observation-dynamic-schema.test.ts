// REQ-TEST-DYNAMIC-001 (SCENARIO-OBS-SCHEMA-001): Observation/Command
// bodies derive from the parent-resource schema. Mechanical check for
// issue #7 — an observation test that inserts a Datastream with
// `resultType: 'measure'` (Quantity) must NOT then POST an observation
// whose `result` is a string or object.
//
// If this test fails, verify that the observation body builder in
// `part2-crud.ts` reads the datastream's resultType/resultSchema and
// shapes the observation's `result` to match. This is a sentinel against
// hardcoded observation bodies that silently diverge from the datastream
// schema the test just inserted.

import { describe, it, expect } from 'vitest';
import {
  DATASTREAM_CREATE_BODY,
  OBSERVATION_CREATE_BODY,
  buildObservationBodyForDatastream,
} from '@/engine/registry/part2-crud';

describe('Observation body derives from parent Datastream schema (REQ-TEST-DYNAMIC-001)', () => {
  it('OBSERVATION_CREATE_BODY.result type matches DATASTREAM_CREATE_BODY.resultType (SCENARIO-OBS-SCHEMA-001)', () => {
    expect(DATASTREAM_CREATE_BODY.resultType).toBe('measure');
    // A 'measure' resultType with a Quantity resultSchema requires the
    // observation's `result` property to be a number.
    expect(typeof OBSERVATION_CREATE_BODY.result).toBe('number');
  });

  it('OBSERVATION_CREATE_BODY carries both phenomenonTime and resultTime (SCENARIO-OBS-SCHEMA-001)', () => {
    expect(typeof OBSERVATION_CREATE_BODY.phenomenonTime).toBe('string');
    expect(typeof OBSERVATION_CREATE_BODY.resultTime).toBe('string');
  });

  it('builder throws if the datastream resultType is not supported, forcing the author to update the observation body (SCENARIO-OBS-SCHEMA-001)', () => {
    const mutated = {
      ...DATASTREAM_CREATE_BODY,
      resultType: 'record' as 'measure',
    };
    expect(() => buildObservationBodyForDatastream(mutated)).toThrow(
      /Unsupported datastream resultType/i,
    );
  });

  it('DATASTREAM_CREATE_BODY.schema.resultSchema references the same definition as observedProperties (SCENARIO-OBS-SCHEMA-001)', () => {
    const observed = DATASTREAM_CREATE_BODY.observedProperties[0];
    const resultSchema = DATASTREAM_CREATE_BODY.schema.resultSchema;
    // The resultSchema's definition must line up with the datastream's
    // observedProperties definition; otherwise the observation result
    // would measure a property the datastream never advertised.
    expect(resultSchema.definition).toBe(observed.definition);
  });
});
