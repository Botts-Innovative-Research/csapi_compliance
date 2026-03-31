// REQ-ENG-005: Response body validation against JSON schemas using Ajv
// REQ-ENG-006: Schema loading from OGC OpenAPI definitions with $ref resolution

import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type {
  SchemaValidatorInterface,
  ValidationResult,
  SchemaError,
} from '@/lib/types';

/**
 * JSON Schema validation engine backed by Ajv.
 *
 * Validates HTTP response bodies against JSON schemas derived from OGC
 * OpenAPI definitions. Schemas are loaded at startup from a directory
 * and referenced by ID during test execution.
 */
export class SchemaValidator implements SchemaValidatorInterface {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.ajv);
  }

  /**
   * Load all JSON schema files from a directory tree.
   * Each file is registered with Ajv using a path-based ID derived from
   * its location relative to the schemas root directory.
   *
   * For a file at `schemasDir/connected-systems-1/system.json`, the ID
   * would be `connected-systems-1/system.json`.
   *
   * Called once at startup before any validation occurs. REQ-ENG-006.
   */
  async loadSchemas(schemasDir: string): Promise<void> {
    await this.loadSchemasFromDir(schemasDir, schemasDir);
  }

  /**
   * Recursively read JSON files from a directory and register each as
   * a schema with Ajv.
   */
  private async loadSchemasFromDir(
    dir: string,
    rootDir: string,
  ): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.loadSchemasFromDir(fullPath, rootDir);
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const content = await readFile(fullPath, 'utf-8');
        const schema = JSON.parse(content) as Record<string, unknown>;
        const id = relative(rootDir, fullPath);
        this.addSchema(id, schema);
      }
    }
  }

  /**
   * Register a single schema with Ajv under the given ID.
   * If the schema already defines an `$id`, Ajv will also index it
   * by that value, enabling `$ref` resolution across schemas.
   */
  addSchema(id: string, schema: object): void {
    this.ajv.addSchema(schema, id);
  }

  /**
   * Validate data against a registered schema. REQ-ENG-005.
   *
   * @param schemaRef - The schema ID (as registered via addSchema/loadSchemas)
   * @param data - The parsed response body to validate
   * @returns A ValidationResult indicating success or listing all errors
   */
  validate(schemaRef: string, data: unknown): ValidationResult {
    const validateFn = this.ajv.getSchema(schemaRef);

    if (!validateFn) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Schema "${schemaRef}" not found`,
            keyword: 'schemaNotFound',
            params: { schemaRef },
          },
        ],
      };
    }

    const valid = validateFn(data) as boolean;

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = this.mapErrors(validateFn.errors ?? []);
    return { valid: false, errors };
  }

  /** Check whether a schema with the given ID has been registered. */
  hasSchema(id: string): boolean {
    return !!this.ajv.getSchema(id);
  }

  /** Return the IDs of all explicitly registered schemas. */
  getSchemaIds(): string[] {
    // Ajv's internal schemas map includes meta-schemas and other built-ins.
    // We track our own IDs by enumerating the schemas object from Ajv's
    // internal state. The public API exposes `getSchema` but not a list,
    // so we access the internal `schemas` map.
    const schemas = (this.ajv as unknown as { schemas: Record<string, unknown> }).schemas;
    return Object.keys(schemas).filter(
      (key) =>
        // Exclude Ajv meta-schemas and internal entries
        !key.startsWith('http://json-schema.org/') &&
        !key.startsWith('https://json-schema.org/'),
    );
  }

  /**
   * Map Ajv error objects to our SchemaError type with clean JSON Pointer paths.
   */
  private mapErrors(ajvErrors: ErrorObject[]): SchemaError[] {
    return ajvErrors.map((err) => ({
      path: err.instancePath || '/',
      message: err.message ?? 'Unknown validation error',
      keyword: err.keyword,
      params: err.params as Record<string, unknown>,
    }));
  }
}
