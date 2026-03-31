// REQ-ENG-005: Response body validation against JSON schemas using Ajv
// REQ-ENG-006: Schema loading from OGC OpenAPI definitions with $ref resolution
//
// Tests validate SchemaValidator behavior through its public interface.
// No direct Ajv imports — everything is tested via the SchemaValidator class.

import { describe, it, expect, beforeEach } from 'vitest';
import { SchemaValidator } from '@/engine/schema-validator';

describe('SchemaValidator', () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  // --- Basic validation (REQ-ENG-005) ---

  describe('validate() with simple schema', () => {
    const personSchema = {
      type: 'object',
      required: ['name', 'age'],
      properties: {
        name: { type: 'string' },
        age: { type: 'integer', minimum: 0 },
      },
      additionalProperties: false,
    };

    it('returns valid for data matching the schema', () => {
      validator.addSchema('person', personSchema);
      const result = validator.validate('person', { name: 'Alice', age: 30 });

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('returns invalid with error paths for data violating the schema', () => {
      validator.addSchema('person', personSchema);
      const result = validator.validate('person', { name: 123, age: -1 });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);

      const namePath = result.errors.find((e) => e.path === '/name');
      expect(namePath).toBeDefined();
      expect(namePath!.keyword).toBe('type');
      expect(namePath!.message).toContain('string');

      const agePath = result.errors.find((e) => e.path === '/age');
      expect(agePath).toBeDefined();
      expect(agePath!.keyword).toBe('minimum');
    });
  });

  // --- allErrors mode (REQ-ENG-005) ---

  describe('allErrors mode', () => {
    it('reports multiple errors in a single validation pass', () => {
      const schema = {
        type: 'object',
        required: ['a', 'b', 'c'],
        properties: {
          a: { type: 'string' },
          b: { type: 'number' },
          c: { type: 'boolean' },
        },
      };

      validator.addSchema('multi', schema);
      const result = validator.validate('multi', {});

      expect(result.valid).toBe(false);
      // Should report all three missing required properties
      const requiredErrors = result.errors.filter((e) => e.keyword === 'required');
      expect(requiredErrors.length).toBe(3);

      const missingProps = requiredErrors.map((e) => e.params['missingProperty']);
      expect(missingProps).toContain('a');
      expect(missingProps).toContain('b');
      expect(missingProps).toContain('c');
    });
  });

  // --- $ref resolution between schemas (REQ-ENG-006) ---

  describe('$ref resolution', () => {
    it('resolves $ref between two separately registered schemas', () => {
      const addressSchema = {
        $id: 'address',
        type: 'object',
        required: ['street', 'city'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
      };

      const customerSchema = {
        $id: 'customer',
        type: 'object',
        required: ['name', 'address'],
        properties: {
          name: { type: 'string' },
          address: { $ref: 'address' },
        },
      };

      validator.addSchema('address', addressSchema);
      validator.addSchema('customer', customerSchema);

      const validResult = validator.validate('customer', {
        name: 'Acme Corp',
        address: { street: '123 Main St', city: 'Metropolis' },
      });
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validate('customer', {
        name: 'Acme Corp',
        address: { street: 123 },
      });
      expect(invalidResult.valid).toBe(false);

      // Errors should include path through the $ref'd schema
      const streetError = invalidResult.errors.find((e) => e.path === '/address/street');
      expect(streetError).toBeDefined();
      expect(streetError!.keyword).toBe('type');

      const cityMissing = invalidResult.errors.find(
        (e) => e.keyword === 'required' && e.params['missingProperty'] === 'city',
      );
      expect(cityMissing).toBeDefined();
    });
  });

  // --- Missing schema handling ---

  describe('missing schema', () => {
    it('returns validation failure instead of throwing an exception', () => {
      const result = validator.validate('nonexistent-schema', { any: 'data' });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].keyword).toBe('schemaNotFound');
      expect(result.errors[0].message).toContain('nonexistent-schema');
      expect(result.errors[0].path).toBe('');
    });
  });

  // --- hasSchema ---

  describe('hasSchema()', () => {
    it('returns false for an unregistered schema ID', () => {
      expect(validator.hasSchema('does-not-exist')).toBe(false);
    });

    it('returns true after a schema has been added', () => {
      validator.addSchema('simple', { type: 'object' });
      expect(validator.hasSchema('simple')).toBe(true);
    });
  });

  // --- getSchemaIds ---

  describe('getSchemaIds()', () => {
    it('returns an empty list when no schemas are registered', () => {
      expect(validator.getSchemaIds()).toEqual([]);
    });

    it('returns IDs for all registered schemas', () => {
      validator.addSchema('alpha', { type: 'object' });
      validator.addSchema('beta', { type: 'array', items: { type: 'string' } });

      const ids = validator.getSchemaIds();
      expect(ids).toContain('alpha');
      expect(ids).toContain('beta');
    });
  });

  // --- Format validation (REQ-ENG-005) ---

  describe('format validation', () => {
    const uriSchema = {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
      },
    };

    const dateTimeSchema = {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
      },
    };

    it('accepts a valid URI string', () => {
      validator.addSchema('uri-check', uriSchema);
      const result = validator.validate('uri-check', {
        url: 'https://example.com/api/v1',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid URI string', () => {
      validator.addSchema('uri-check', uriSchema);
      const result = validator.validate('uri-check', {
        url: 'not a uri',
      });
      expect(result.valid).toBe(false);
      const uriError = result.errors.find((e) => e.keyword === 'format');
      expect(uriError).toBeDefined();
      expect(uriError!.path).toBe('/url');
    });

    it('accepts a valid date-time string', () => {
      validator.addSchema('dt-check', dateTimeSchema);
      const result = validator.validate('dt-check', {
        timestamp: '2024-01-15T10:30:00Z',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid date-time string', () => {
      validator.addSchema('dt-check', dateTimeSchema);
      const result = validator.validate('dt-check', {
        timestamp: 'not-a-date',
      });
      expect(result.valid).toBe(false);
      const dtError = result.errors.find((e) => e.keyword === 'format');
      expect(dtError).toBeDefined();
      expect(dtError!.path).toBe('/timestamp');
    });
  });

  // --- Nested object validation with error paths (REQ-ENG-005) ---

  describe('nested object validation', () => {
    const nestedSchema = {
      type: 'object',
      required: ['metadata'],
      properties: {
        metadata: {
          type: 'object',
          required: ['title', 'contact'],
          properties: {
            title: { type: 'string' },
            contact: {
              type: 'object',
              required: ['email'],
              properties: {
                email: { type: 'string', format: 'email' },
                phone: { type: 'string' },
              },
            },
          },
        },
      },
    };

    it('validates deeply nested valid data', () => {
      validator.addSchema('nested', nestedSchema);
      const result = validator.validate('nested', {
        metadata: {
          title: 'OGC Service',
          contact: {
            email: 'admin@ogc.org',
            phone: '+1-555-0100',
          },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('reports errors with correct JSON Pointer paths for nested failures', () => {
      validator.addSchema('nested', nestedSchema);
      const result = validator.validate('nested', {
        metadata: {
          title: 42,
          contact: {
            email: 'not-an-email',
          },
        },
      });

      expect(result.valid).toBe(false);

      const titleError = result.errors.find((e) => e.path === '/metadata/title');
      expect(titleError).toBeDefined();
      expect(titleError!.keyword).toBe('type');

      const emailError = result.errors.find((e) => e.path === '/metadata/contact/email');
      expect(emailError).toBeDefined();
      expect(emailError!.keyword).toBe('format');
    });

    it('reports correct path when a nested required property is missing', () => {
      validator.addSchema('nested', nestedSchema);
      const result = validator.validate('nested', {
        metadata: {
          title: 'Test',
          contact: {},
        },
      });

      expect(result.valid).toBe(false);
      const emailMissing = result.errors.find(
        (e) => e.keyword === 'required' && e.params['missingProperty'] === 'email',
      );
      expect(emailMissing).toBeDefined();
      expect(emailMissing!.path).toBe('/metadata/contact');
    });
  });

  // --- Schema loading from directory (REQ-ENG-006) ---

  describe('loadSchemas()', () => {
    it('loads JSON schema files from a directory', async () => {
      // Use a temporary directory with test schema files
      const { mkdtemp, writeFile, mkdir } = await import('node:fs/promises');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const { rmSync } = await import('node:fs');

      const tempDir = await mkdtemp(join(tmpdir(), 'schema-test-'));

      try {
        // Create a flat schema
        await writeFile(
          join(tempDir, 'item.json'),
          JSON.stringify({
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'string' } },
          }),
        );

        // Create a nested directory with another schema
        const subDir = join(tempDir, 'sub');
        await mkdir(subDir);
        await writeFile(
          join(subDir, 'detail.json'),
          JSON.stringify({
            type: 'object',
            required: ['value'],
            properties: { value: { type: 'number' } },
          }),
        );

        await validator.loadSchemas(tempDir);

        expect(validator.hasSchema('item.json')).toBe(true);
        expect(validator.hasSchema('sub/detail.json')).toBe(true);

        const itemResult = validator.validate('item.json', { id: 'abc' });
        expect(itemResult.valid).toBe(true);

        const detailResult = validator.validate('sub/detail.json', { value: 42 });
        expect(detailResult.valid).toBe(true);

        const invalidResult = validator.validate('sub/detail.json', { value: 'nope' });
        expect(invalidResult.valid).toBe(false);
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  // --- Error structure completeness (REQ-ENG-005) ---

  describe('SchemaError structure', () => {
    it('populates all SchemaError fields for each validation error', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'integer', minimum: 1, maximum: 100 },
        },
      };

      validator.addSchema('bounded', schema);
      const result = validator.validate('bounded', { count: 200 });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);

      const error = result.errors[0];
      expect(error).toHaveProperty('path');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('keyword');
      expect(error).toHaveProperty('params');
      expect(typeof error.path).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.keyword).toBe('string');
      expect(typeof error.params).toBe('object');
    });
  });
});
