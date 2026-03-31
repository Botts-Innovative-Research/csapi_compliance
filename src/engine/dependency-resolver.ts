// REQ-ENG-007: DAG-based dependency ordering with topological sort and cycle detection
// REQ-ENG-008: Dependency failure cascading — skip dependents when prerequisites fail

import type {
  ConformanceClassDefinition,
  ClassStatus,
  ResolvedPlan,
} from '@/lib/types';
import { CyclicDependencyError } from './errors';

/** Minimal interface for registry access, to decouple from the singleton. */
export interface TestRegistryInterface {
  getClass(classUri: string): ConformanceClassDefinition | undefined;
  getAllClasses(): ConformanceClassDefinition[];
}

/**
 * Resolves conformance class dependencies into a valid execution order
 * and checks whether classes should be skipped due to failed prerequisites.
 */
export class DependencyResolver {
  /**
   * Resolve selected conformance classes into an execution order.
   * - Performs topological sort based on class dependencies (Kahn's algorithm)
   * - Auto-includes transitive dependencies not explicitly selected
   * - Throws CyclicDependencyError if the graph contains cycles
   *
   * @param selected - URIs of classes the user selected to test
   * @param registry - TestRegistry containing all class definitions
   * @returns ResolvedPlan with orderedClasses and autoIncluded list
   */
  static resolve(selected: string[], registry: TestRegistryInterface): ResolvedPlan {
    if (selected.length === 0) {
      return { orderedClasses: [], autoIncluded: [] };
    }

    // Expand the selection to include all transitive dependencies
    const selectedSet = new Set(selected);
    const allNeeded = new Set<string>();
    const autoIncluded: string[] = [];

    const addWithDeps = (uri: string): void => {
      if (allNeeded.has(uri)) return;
      const classDef = registry.getClass(uri);
      if (!classDef) return; // unknown class, skip silently
      allNeeded.add(uri);
      for (const dep of classDef.dependencies) {
        addWithDeps(dep);
      }
    };

    for (const uri of selected) {
      addWithDeps(uri);
    }

    // Identify auto-included classes (needed but not originally selected)
    for (const uri of allNeeded) {
      if (!selectedSet.has(uri)) {
        autoIncluded.push(uri);
      }
    }

    // Build in-degree map and adjacency list for Kahn's algorithm
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // dependency -> list of classes that depend on it

    for (const uri of allNeeded) {
      if (!inDegree.has(uri)) inDegree.set(uri, 0);
      if (!dependents.has(uri)) dependents.set(uri, []);
    }

    for (const uri of allNeeded) {
      const classDef = registry.getClass(uri)!;
      for (const dep of classDef.dependencies) {
        if (allNeeded.has(dep)) {
          inDegree.set(uri, (inDegree.get(uri) ?? 0) + 1);
          dependents.get(dep)!.push(uri);
        }
      }
    }

    // Kahn's algorithm: BFS topological sort
    const queue: string[] = [];
    for (const [uri, degree] of inDegree) {
      if (degree === 0) queue.push(uri);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const dependent of dependents.get(current) ?? []) {
        const newDegree = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    // If not all nodes were processed, there is a cycle
    if (sorted.length !== allNeeded.size) {
      const cycleMembers = [...allNeeded].filter((uri) => !sorted.includes(uri));
      throw new CyclicDependencyError(cycleMembers);
    }

    const orderedClasses = sorted.map((uri) => registry.getClass(uri)!);

    return { orderedClasses, autoIncluded };
  }

  /**
   * Check if a dependent class should be skipped based on prerequisite results.
   * A class is skipped if ANY of its direct dependencies failed.
   *
   * @param classDef - The class to check
   * @param completedResults - Map of classUri -> ClassStatus for already-completed classes
   * @returns { skip: boolean; reason?: string }
   */
  static shouldSkip(
    classDef: ConformanceClassDefinition,
    completedResults: Map<string, ClassStatus>,
  ): { skip: boolean; reason?: string } {
    for (const depUri of classDef.dependencies) {
      const status = completedResults.get(depUri);
      if (status === 'fail') {
        // Look up the dependency name for a useful message
        return {
          skip: true,
          reason: `Dependency not met: ${depUri} failed`,
        };
      }
    }
    return { skip: false };
  }
}
