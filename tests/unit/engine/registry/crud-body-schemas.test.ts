// REQ-CRUD-001 (SCENARIO-CRUD-BODY-001): every CRUD test's request body
// validates against the corresponding OGC create-schema at test-authoring
// time. This is the Gate 1 invariant from `_bmad/github-issues-audit.md`
// item 2 — the mechanical check for issue #6.
//
// If this test fails, either (a) update the body builder in the affected
// test module to match the schema, or (b) confirm the schema change was
// intentional, then update the body alongside it.

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { SchemaValidator } from '@/engine/schema-validator';
import {
  DATASTREAM_CREATE_BODY,
  CONTROLSTREAM_CREATE_BODY,
  OBSERVATION_CREATE_BODY,
} from '@/engine/registry/part2-crud';

const SCHEMAS_DIR = resolve(__dirname, '..', '..', '..', '..', 'schemas');

describe('Part 2 CRUD request bodies validate against OGC create-schemas (REQ-CRUD-001)', () => {
  let validator: SchemaValidator;

  beforeAll(async () => {
    validator = new SchemaValidator();
    await validator.loadSchemas(SCHEMAS_DIR);
  });

  it('DATASTREAM_CREATE_BODY validates against connected-systems-2/json/dataStream_create.json (SCENARIO-CRUD-BODY-001)', () => {
    const result = validator.validate(
      'connected-systems-2/json/dataStream_create.json',
      DATASTREAM_CREATE_BODY,
    );
    expect(
      result.valid,
      result.valid
        ? 'ok'
        : `Datastream create body failed schema validation:\n${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
    ).toBe(true);
  });

  it('CONTROLSTREAM_CREATE_BODY validates against connected-systems-2/json/controlStream_create.json (SCENARIO-CRUD-BODY-001)', () => {
    const result = validator.validate(
      'connected-systems-2/json/controlStream_create.json',
      CONTROLSTREAM_CREATE_BODY,
    );
    expect(
      result.valid,
      result.valid
        ? 'ok'
        : `Control stream create body failed schema validation:\n${JSON.stringify(
            result.errors,
            null,
            2,
          )}`,
    ).toBe(true);
  });

  it('OBSERVATION_CREATE_BODY is a plain JSON object with phenomenonTime, resultTime, and a scalar result (SCENARIO-CRUD-BODY-001)', () => {
    // Observation-insert schema is derived dynamically from the parent
    // datastream's resultSchema (see REQ-TEST-DYNAMIC-001); there is no
    // single OGC "observation_create.json" to validate against. We assert
    // the body is shaped consistently with a SWE Quantity result so the
    // companion dynamic-schema test can detect drift.
    expect(OBSERVATION_CREATE_BODY).toMatchObject({
      phenomenonTime: expect.any(String),
      resultTime: expect.any(String),
      result: expect.any(Number),
    });
  });
});
