// REQ-ENG-007: DAG-based dependency ordering with topological sort and cycle detection
// REQ-ENG-008: Dependency failure cascading — skip dependents when prerequisites fail
// SCENARIO-ENG-DEP-001: Dependency resolution produces correct execution order (CRITICAL)

import { describe, it, expect } from 'vitest';
import { DependencyResolver } from '@/engine/dependency-resolver';
import type { TestRegistryInterface } from '@/engine/dependency-resolver';
import { CyclicDependencyError } from '@/engine/errors';
import type { ConformanceClassDefinition, ClassStatus } from '@/lib/types';

// --- Helpers ---

function makeClassDef(
  overrides: Partial<ConformanceClassDefinition> = {},
): ConformanceClassDefinition {
  return {
    classUri: 'http://example.org/conf/default',
    name: 'Default',
    standardPart: 'test',
    dependencies: [],
    requirements: [],
    isWriteOperation: false,
    ...overrides,
  };
}

/** Build a mock registry from an array of class definitions. */
function makeRegistry(classes: ConformanceClassDefinition[]): TestRegistryInterface {
  const map = new Map<string, ConformanceClassDefinition>();
  for (const c of classes) {
    map.set(c.classUri, c);
  }
  return {
    getClass: (uri: string) => map.get(uri),
    getAllClasses: () => [...map.values()],
  };
}

// --- Shared fixtures ---

const classA = makeClassDef({ classUri: 'http://example.org/conf/a', name: 'A', dependencies: [] });
const classB = makeClassDef({ classUri: 'http://example.org/conf/b', name: 'B', dependencies: ['http://example.org/conf/a'] });
const classC = makeClassDef({ classUri: 'http://example.org/conf/c', name: 'C', dependencies: ['http://example.org/conf/b'] });
const classD = makeClassDef({ classUri: 'http://example.org/conf/d', name: 'D', dependencies: ['http://example.org/conf/b', 'http://example.org/conf/c'] });

// --- Tests ---

describe('DependencyResolver.resolve', () => {
  // REQ-ENG-007: Linear chain topological sort
  it('should resolve a linear chain A -> B -> C in correct order', () => {
    const registry = makeRegistry([classA, classB, classC]);
    const plan = DependencyResolver.resolve(
      ['http://example.org/conf/a', 'http://example.org/conf/b', 'http://example.org/conf/c'],
      registry,
    );

    const uris = plan.orderedClasses.map((c) => c.classUri);
    expect(uris).toEqual([
      'http://example.org/conf/a',
      'http://example.org/conf/b',
      'http://example.org/conf/c',
    ]);
    expect(plan.autoIncluded).toHaveLength(0);
  });

  // REQ-ENG-007: Diamond dependency resolves correctly
  it('should resolve a diamond dependency with shared base first', () => {
    // Diamond: A (no deps), B depends on A, C depends on A, D depends on B and C
    const diamondA = makeClassDef({ classUri: 'http://example.org/conf/a', name: 'A', dependencies: [] });
    const diamondB = makeClassDef({ classUri: 'http://example.org/conf/b', name: 'B', dependencies: ['http://example.org/conf/a'] });
    const diamondC = makeClassDef({ classUri: 'http://example.org/conf/c', name: 'C', dependencies: ['http://example.org/conf/a'] });
    const diamondD = makeClassDef({ classUri: 'http://example.org/conf/d', name: 'D', dependencies: ['http://example.org/conf/b', 'http://example.org/conf/c'] });

    const registry = makeRegistry([diamondA, diamondB, diamondC, diamondD]);
    const plan = DependencyResolver.resolve(
      ['http://example.org/conf/a', 'http://example.org/conf/b', 'http://example.org/conf/c', 'http://example.org/conf/d'],
      registry,
    );

    const uris = plan.orderedClasses.map((c) => c.classUri);

    // A must come before B and C; B and C must come before D
    expect(uris.indexOf('http://example.org/conf/a')).toBeLessThan(uris.indexOf('http://example.org/conf/b'));
    expect(uris.indexOf('http://example.org/conf/a')).toBeLessThan(uris.indexOf('http://example.org/conf/c'));
    expect(uris.indexOf('http://example.org/conf/b')).toBeLessThan(uris.indexOf('http://example.org/conf/d'));
    expect(uris.indexOf('http://example.org/conf/c')).toBeLessThan(uris.indexOf('http://example.org/conf/d'));
  });

  // REQ-ENG-007: Auto-includes missing transitive dependencies
  it('should auto-include missing transitive dependencies', () => {
    const registry = makeRegistry([classA, classB, classC]);

    // User selects only C, which depends on B, which depends on A
    const plan = DependencyResolver.resolve(
      ['http://example.org/conf/c'],
      registry,
    );

    const uris = plan.orderedClasses.map((c) => c.classUri);
    expect(uris).toEqual([
      'http://example.org/conf/a',
      'http://example.org/conf/b',
      'http://example.org/conf/c',
    ]);
  });

  // REQ-ENG-007: Reports auto-included classes in the result
  it('should report auto-included classes', () => {
    const registry = makeRegistry([classA, classB, classC]);

    const plan = DependencyResolver.resolve(
      ['http://example.org/conf/c'],
      registry,
    );

    expect(plan.autoIncluded).toContain('http://example.org/conf/a');
    expect(plan.autoIncluded).toContain('http://example.org/conf/b');
    expect(plan.autoIncluded).toHaveLength(2);
  });

  // REQ-ENG-007: Cycle detection throws CyclicDependencyError
  it('should throw CyclicDependencyError for A -> B -> A', () => {
    const cycleA = makeClassDef({
      classUri: 'http://example.org/conf/a',
      name: 'A',
      dependencies: ['http://example.org/conf/b'],
    });
    const cycleB = makeClassDef({
      classUri: 'http://example.org/conf/b',
      name: 'B',
      dependencies: ['http://example.org/conf/a'],
    });
    const registry = makeRegistry([cycleA, cycleB]);

    expect(() =>
      DependencyResolver.resolve(
        ['http://example.org/conf/a', 'http://example.org/conf/b'],
        registry,
      ),
    ).toThrow(CyclicDependencyError);
  });

  // REQ-ENG-007: Cycle error includes the involved classes
  it('should include involved classes in CyclicDependencyError', () => {
    const cycleA = makeClassDef({
      classUri: 'http://example.org/conf/a',
      name: 'A',
      dependencies: ['http://example.org/conf/b'],
    });
    const cycleB = makeClassDef({
      classUri: 'http://example.org/conf/b',
      name: 'B',
      dependencies: ['http://example.org/conf/a'],
    });
    const registry = makeRegistry([cycleA, cycleB]);

    try {
      DependencyResolver.resolve(
        ['http://example.org/conf/a', 'http://example.org/conf/b'],
        registry,
      );
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(CyclicDependencyError);
      const cycleErr = err as CyclicDependencyError;
      expect(cycleErr.involvedClasses).toContain('http://example.org/conf/a');
      expect(cycleErr.involvedClasses).toContain('http://example.org/conf/b');
    }
  });

  // REQ-ENG-007: Single class with no dependencies
  it('should handle a single class with no dependencies', () => {
    const registry = makeRegistry([classA]);
    const plan = DependencyResolver.resolve(
      ['http://example.org/conf/a'],
      registry,
    );

    expect(plan.orderedClasses).toHaveLength(1);
    expect(plan.orderedClasses[0].classUri).toBe('http://example.org/conf/a');
    expect(plan.autoIncluded).toHaveLength(0);
  });

  // REQ-ENG-007: Empty selection returns empty plan
  it('should handle empty selection', () => {
    const registry = makeRegistry([classA, classB]);
    const plan = DependencyResolver.resolve([], registry);

    expect(plan.orderedClasses).toHaveLength(0);
    expect(plan.autoIncluded).toHaveLength(0);
  });
});

describe('DependencyResolver.shouldSkip', () => {
  // REQ-ENG-008: shouldSkip returns true when a dependency failed
  it('should return skip=true when a dependency has failed', () => {
    const completedResults = new Map<string, ClassStatus>();
    completedResults.set('http://example.org/conf/a', 'fail');

    const result = DependencyResolver.shouldSkip(classB, completedResults);
    expect(result.skip).toBe(true);
    expect(result.reason).toBeDefined();
  });

  // REQ-ENG-008: shouldSkip returns false when all dependencies passed
  it('should return skip=false when all dependencies passed', () => {
    const completedResults = new Map<string, ClassStatus>();
    completedResults.set('http://example.org/conf/a', 'pass');

    const result = DependencyResolver.shouldSkip(classB, completedResults);
    expect(result.skip).toBe(false);
    expect(result.reason).toBeUndefined();
  });

  // REQ-ENG-008: Reason message names the failed class URI
  it('should return reason naming the failed class URI', () => {
    const completedResults = new Map<string, ClassStatus>();
    completedResults.set('http://example.org/conf/a', 'fail');

    const result = DependencyResolver.shouldSkip(classB, completedResults);
    expect(result.skip).toBe(true);
    expect(result.reason).toContain('http://example.org/conf/a');
    expect(result.reason).toContain('failed');
  });

  // REQ-ENG-008: shouldSkip only checks direct dependencies (not transitive)
  it('should only check direct dependencies, not transitive ones', () => {
    // classC depends on B (directly). B depends on A.
    // If A failed but B passed, C should NOT be skipped (only direct deps matter).
    const completedResults = new Map<string, ClassStatus>();
    completedResults.set('http://example.org/conf/a', 'fail');
    completedResults.set('http://example.org/conf/b', 'pass');

    const result = DependencyResolver.shouldSkip(classC, completedResults);
    expect(result.skip).toBe(false);
  });

  // REQ-ENG-008: Class with no dependencies is never skipped
  it('should not skip a class with no dependencies', () => {
    const completedResults = new Map<string, ClassStatus>();
    const result = DependencyResolver.shouldSkip(classA, completedResults);
    expect(result.skip).toBe(false);
  });
});
