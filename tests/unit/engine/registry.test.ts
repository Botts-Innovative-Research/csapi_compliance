// REQ-ENG-001: Every test maps 1:1 to a canonical OGC requirement URI.
// REQ-ENG-013: Standardized test result data structure.

import { describe, it, expect, beforeEach } from 'vitest';
import { TestRegistry } from '@/engine/registry';
import type {
  ConformanceClassDefinition,
  ConformanceClassTest,
  ExecutableTest,
  TestContext,
} from '@/lib/types';

// --- Helpers ---

function makeClassDef(
  overrides: Partial<ConformanceClassDefinition> = {},
): ConformanceClassDefinition {
  return {
    classUri: 'http://example.org/conf/alpha',
    name: 'Alpha',
    standardPart: 'test',
    dependencies: [],
    requirements: [
      {
        requirementUri: '/req/alpha/r1',
        conformanceUri: '/conf/alpha/r1',
        name: 'Alpha R1',
        priority: 'MUST',
        description: 'First alpha requirement',
      },
    ],
    isWriteOperation: false,
    ...overrides,
  };
}

function makeClassTest(
  defOverrides: Partial<ConformanceClassDefinition> = {},
): ConformanceClassTest {
  return {
    classDefinition: makeClassDef(defOverrides),
    createTests(_ctx: TestContext): ExecutableTest[] {
      return [];
    },
  };
}

// --- Tests ---

describe('TestRegistry', () => {
  beforeEach(() => {
    TestRegistry.resetInstance();
  });

  // REQ-ENG-001: register a class and retrieve it by URI
  it('should register a class and retrieve it by URI', () => {
    const registry = TestRegistry.getInstance();
    const classTest = makeClassTest();
    registry.register(classTest);

    const retrieved = registry.getClass('http://example.org/conf/alpha');
    expect(retrieved).toBeDefined();
    expect(retrieved!.classUri).toBe('http://example.org/conf/alpha');
    expect(retrieved!.name).toBe('Alpha');
  });

  // REQ-ENG-001: getTestModule returns the correct module
  it('should return the test module via getTestModule', () => {
    const registry = TestRegistry.getInstance();
    const classTest = makeClassTest();
    registry.register(classTest);

    const mod = registry.getTestModule('http://example.org/conf/alpha');
    expect(mod).toBeDefined();
    expect(mod!.classDefinition.classUri).toBe('http://example.org/conf/alpha');
    expect(typeof mod!.createTests).toBe('function');
  });

  it('should return undefined for unregistered class URI', () => {
    const registry = TestRegistry.getInstance();
    expect(registry.getClass('http://example.org/conf/nonexistent')).toBeUndefined();
    expect(registry.getTestModule('http://example.org/conf/nonexistent')).toBeUndefined();
  });

  // REQ-ENG-001: getAllClasses returns all registered classes
  it('should return all registered classes via getAllClasses', () => {
    const registry = TestRegistry.getInstance();

    registry.register(makeClassTest({ classUri: 'http://example.org/conf/a', name: 'A' }));
    registry.register(makeClassTest({ classUri: 'http://example.org/conf/b', name: 'B' }));
    registry.register(makeClassTest({ classUri: 'http://example.org/conf/c', name: 'C' }));

    const all = registry.getAllClasses();
    expect(all).toHaveLength(3);

    const uris = all.map((c) => c.classUri).sort();
    expect(uris).toEqual([
      'http://example.org/conf/a',
      'http://example.org/conf/b',
      'http://example.org/conf/c',
    ]);
  });

  // REQ-ENG-001: integrity validation passes for a valid registry
  it('should pass integrity validation when all URIs are unique and deps are resolved', () => {
    const registry = TestRegistry.getInstance();

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/core',
        name: 'Core',
        dependencies: [],
        requirements: [
          {
            requirementUri: '/req/core/r1',
            conformanceUri: '/conf/core/r1',
            name: 'Core R1',
            priority: 'MUST',
            description: 'Core requirement',
          },
        ],
      }),
    );

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/ext',
        name: 'Extension',
        dependencies: ['http://example.org/conf/core'],
        requirements: [
          {
            requirementUri: '/req/ext/r1',
            conformanceUri: '/conf/ext/r1',
            name: 'Ext R1',
            priority: 'MUST',
            description: 'Extension requirement',
          },
        ],
      }),
    );

    const result = registry.validateIntegrity();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // REQ-ENG-001: duplicate requirement URI detection
  it('should detect duplicate requirement URIs across classes', () => {
    const registry = TestRegistry.getInstance();

    const sharedReqUri = '/req/shared/duplicate';

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/classA',
        name: 'Class A',
        requirements: [
          {
            requirementUri: sharedReqUri,
            conformanceUri: '/conf/classA/r1',
            name: 'A R1',
            priority: 'MUST',
            description: 'Requirement in class A',
          },
        ],
      }),
    );

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/classB',
        name: 'Class B',
        requirements: [
          {
            requirementUri: sharedReqUri,
            conformanceUri: '/conf/classB/r1',
            name: 'B R1',
            priority: 'MUST',
            description: 'Requirement in class B with same URI',
          },
        ],
      }),
    );

    const result = registry.validateIntegrity();
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Duplicate requirement URI');
    expect(result.errors[0]).toContain(sharedReqUri);
  });

  // REQ-ENG-001: duplicate conformance URI detection
  it('should detect duplicate conformance URIs across classes', () => {
    const registry = TestRegistry.getInstance();

    const sharedConfUri = '/conf/shared/duplicate';

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/classA',
        name: 'Class A',
        requirements: [
          {
            requirementUri: '/req/classA/r1',
            conformanceUri: sharedConfUri,
            name: 'A R1',
            priority: 'MUST',
            description: 'Requirement in class A',
          },
        ],
      }),
    );

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/classB',
        name: 'Class B',
        requirements: [
          {
            requirementUri: '/req/classB/r1',
            conformanceUri: sharedConfUri,
            name: 'B R1',
            priority: 'MUST',
            description: 'Requirement in class B with same conf URI',
          },
        ],
      }),
    );

    const result = registry.validateIntegrity();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate conformance URI'))).toBe(true);
    expect(result.errors.some((e) => e.includes(sharedConfUri))).toBe(true);
  });

  // REQ-ENG-001: dependency validation — unknown dependency is flagged
  it('should flag unknown dependency URIs', () => {
    const registry = TestRegistry.getInstance();

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/orphan',
        name: 'Orphan',
        dependencies: ['http://example.org/conf/nonexistent'],
        requirements: [
          {
            requirementUri: '/req/orphan/r1',
            conformanceUri: '/conf/orphan/r1',
            name: 'Orphan R1',
            priority: 'MUST',
            description: 'Orphan requirement',
          },
        ],
      }),
    );

    const result = registry.validateIntegrity();
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('unregistered class');
    expect(result.errors[0]).toContain('http://example.org/conf/nonexistent');
  });

  // REQ-ENG-013: integrity validation fails when multiple errors exist
  it('should report multiple validation errors simultaneously', () => {
    const registry = TestRegistry.getInstance();

    // Class with a duplicate requirement URI AND a missing dependency
    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/first',
        name: 'First',
        dependencies: [],
        requirements: [
          {
            requirementUri: '/req/shared/dup',
            conformanceUri: '/conf/first/r1',
            name: 'First R1',
            priority: 'MUST',
            description: 'First requirement',
          },
        ],
      }),
    );

    registry.register(
      makeClassTest({
        classUri: 'http://example.org/conf/second',
        name: 'Second',
        dependencies: ['http://example.org/conf/missing'],
        requirements: [
          {
            requirementUri: '/req/shared/dup',
            conformanceUri: '/conf/second/r1',
            name: 'Second R1',
            priority: 'MUST',
            description: 'Second requirement with dup URI',
          },
        ],
      }),
    );

    const result = registry.validateIntegrity();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some((e) => e.includes('Duplicate requirement URI'))).toBe(true);
    expect(result.errors.some((e) => e.includes('unregistered class'))).toBe(true);
  });

  it('should be a singleton', () => {
    const a = TestRegistry.getInstance();
    const b = TestRegistry.getInstance();
    expect(a).toBe(b);
  });
});
