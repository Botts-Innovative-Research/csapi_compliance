// REQ-ENG-001: Test-to-requirement URI mapping — TestRegistry ensures 1:1 mapping.
// REQ-ENG-013: Standardized test result data structure — registry validates structure integrity.

import type {
  ConformanceClassDefinition,
  ConformanceClassTest,
} from '@/lib/types';

/** Result of registry integrity validation. */
export interface RegistryValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Singleton registry of conformance class test modules.
 *
 * Populated at startup by importing all conformance class modules.
 * Provides lookup by class URI and integrity validation to ensure
 * every requirement maps 1:1 to a canonical OGC requirement URI.
 */
export class TestRegistry {
  private static instance: TestRegistry | null = null;

  private modules = new Map<string, ConformanceClassTest>();

  private constructor() {}

  static getInstance(): TestRegistry {
    if (!TestRegistry.instance) {
      TestRegistry.instance = new TestRegistry();
    }
    return TestRegistry.instance;
  }

  /** Reset the singleton (for testing only). */
  static resetInstance(): void {
    TestRegistry.instance = null;
  }

  /**
   * Register a conformance class test module.
   * Replaces any previously registered module with the same classUri.
   */
  register(classTest: ConformanceClassTest): void {
    const uri = classTest.classDefinition.classUri;
    this.modules.set(uri, classTest);
  }

  /** Look up a conformance class definition by its URI. */
  getClass(classUri: string): ConformanceClassDefinition | undefined {
    return this.modules.get(classUri)?.classDefinition;
  }

  /** Return all registered conformance class definitions. */
  getAllClasses(): ConformanceClassDefinition[] {
    return Array.from(this.modules.values()).map((m) => m.classDefinition);
  }

  /** Look up a conformance class test module by its class URI. */
  getTestModule(classUri: string): ConformanceClassTest | undefined {
    return this.modules.get(classUri);
  }

  /**
   * Validate the integrity of the registry:
   *  - Every requirement URI is unique (no duplicates across classes).
   *  - Every conformance URI is unique.
   *  - All dependency URIs reference registered classes.
   */
  validateIntegrity(): RegistryValidationResult {
    const errors: string[] = [];
    const requirementUris = new Map<string, string>(); // reqUri -> owning classUri
    const conformanceUris = new Map<string, string>(); // confUri -> owning classUri

    for (const mod of this.modules.values()) {
      const classDef = mod.classDefinition;

      for (const req of classDef.requirements) {
        // Check duplicate requirement URIs
        const existingReqOwner = requirementUris.get(req.requirementUri);
        if (existingReqOwner) {
          errors.push(
            `Duplicate requirement URI "${req.requirementUri}" found in classes "${existingReqOwner}" and "${classDef.classUri}"`,
          );
        } else {
          requirementUris.set(req.requirementUri, classDef.classUri);
        }

        // Check duplicate conformance URIs
        const existingConfOwner = conformanceUris.get(req.conformanceUri);
        if (existingConfOwner) {
          errors.push(
            `Duplicate conformance URI "${req.conformanceUri}" found in classes "${existingConfOwner}" and "${classDef.classUri}"`,
          );
        } else {
          conformanceUris.set(req.conformanceUri, classDef.classUri);
        }
      }

      // Check dependency references
      for (const depUri of classDef.dependencies) {
        if (!this.modules.has(depUri)) {
          errors.push(
            `Class "${classDef.classUri}" depends on unregistered class "${depUri}"`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
