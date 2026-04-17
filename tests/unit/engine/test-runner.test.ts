// Tests for the TestRunner orchestrator — the main integration point.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestRunner } from '@/engine/test-runner';
import { TestRegistry } from '@/engine/registry/registry';
import { CancelTokenImpl } from '@/engine/cancel-token';
import type {
  AssessmentSession,
  ConformanceClassDefinition,
  ConformanceClassTest,
  DiscoveryCache,
  ExecutableTest,
  ProgressEvent,
  RequirementDefinition,
  TestContext,
  TestResult,
} from '@/lib/types';

// ---- Helpers ----

function makeRequirement(
  overrides: Partial<RequirementDefinition> = {},
): RequirementDefinition {
  return {
    requirementUri: '/req/test/default',
    conformanceUri: '/conf/test/default',
    name: 'Default Requirement',
    priority: 'MUST',
    description: 'Default description',
    ...overrides,
  };
}

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

/**
 * Build a mock ConformanceClassTest module that returns predetermined results.
 */
function makeMockModule(
  classDef: ConformanceClassDefinition,
  testFactory: (ctx: TestContext) => ExecutableTest[],
): ConformanceClassTest {
  return {
    classDefinition: classDef,
    createTests: testFactory,
  };
}

/**
 * Build a test factory that returns executable tests producing the given results.
 */
function makePassingTests(
  requirements: RequirementDefinition[],
): (ctx: TestContext) => ExecutableTest[] {
  return (_ctx: TestContext) =>
    requirements.map((req) => ({
      requirement: req,
      execute: async (): Promise<TestResult> => ({
        requirementUri: req.requirementUri,
        conformanceUri: req.conformanceUri,
        testName: req.name,
        status: 'pass',
        exchangeIds: [],
        durationMs: 1,
      }),
    }));
}

function makeFailingTests(
  requirements: RequirementDefinition[],
): (ctx: TestContext) => ExecutableTest[] {
  return (_ctx: TestContext) =>
    requirements.map((req) => ({
      requirement: req,
      execute: async (): Promise<TestResult> => ({
        requirementUri: req.requirementUri,
        conformanceUri: req.conformanceUri,
        testName: req.name,
        status: 'fail',
        failureMessage: 'Intentional test failure',
        exchangeIds: [],
        durationMs: 1,
      }),
    }));
}

function makeThrowingTests(
  requirements: RequirementDefinition[],
  errorMessage: string,
): (ctx: TestContext) => ExecutableTest[] {
  return (_ctx: TestContext) =>
    requirements.map((req) => ({
      requirement: req,
      execute: async (): Promise<TestResult> => {
        throw new Error(errorMessage);
      },
    }));
}

function makeDiscoveryCache(): DiscoveryCache {
  return {
    landingPage: {},
    conformsTo: [],
    collectionIds: [],
    links: [],
  };
}

function makeSession(
  overrides: Partial<AssessmentSession> = {},
): AssessmentSession {
  return {
    id: 'test-assessment-001',
    endpointUrl: 'http://example.org/api',
    selectedClasses: [],
    auth: { type: 'none' },
    config: { timeoutMs: 5000, concurrency: 3 },
    cancelToken: new CancelTokenImpl(),
    status: 'running',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---- Tests ----

describe('TestRunner', () => {
  let registry: TestRegistry;

  beforeEach(() => {
    TestRegistry.resetInstance();
    registry = TestRegistry.getInstance();
  });

  afterEach(() => {
    TestRegistry.resetInstance();
  });

  describe('basic execution', () => {
    it('should run tests in dependency order (sequential across classes)', async () => {
      const reqA = makeRequirement({
        requirementUri: '/req/a/1',
        conformanceUri: '/conf/a/1',
        name: 'Req A1',
      });
      const reqB = makeRequirement({
        requirementUri: '/req/b/1',
        conformanceUri: '/conf/b/1',
        name: 'Req B1',
      });
      const reqC = makeRequirement({
        requirementUri: '/req/c/1',
        conformanceUri: '/conf/c/1',
        name: 'Req C1',
      });

      const classA = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        dependencies: [],
        requirements: [reqA],
      });
      const classB = makeClassDef({
        classUri: 'http://example.org/conf/b',
        name: 'Class B',
        dependencies: ['http://example.org/conf/a'],
        requirements: [reqB],
      });
      const classC = makeClassDef({
        classUri: 'http://example.org/conf/c',
        name: 'Class C',
        dependencies: ['http://example.org/conf/b'],
        requirements: [reqC],
      });

      // Track execution order
      const executionOrder: string[] = [];

      registry.register(
        makeMockModule(classA, (_ctx) => [
          {
            requirement: reqA,
            execute: async () => {
              executionOrder.push('A');
              return {
                requirementUri: reqA.requirementUri,
                conformanceUri: reqA.conformanceUri,
                testName: reqA.name,
                status: 'pass',
                exchangeIds: [],
                durationMs: 1,
              };
            },
          },
        ]),
      );
      registry.register(
        makeMockModule(classB, (_ctx) => [
          {
            requirement: reqB,
            execute: async () => {
              executionOrder.push('B');
              return {
                requirementUri: reqB.requirementUri,
                conformanceUri: reqB.conformanceUri,
                testName: reqB.name,
                status: 'pass',
                exchangeIds: [],
                durationMs: 1,
              };
            },
          },
        ]),
      );
      registry.register(
        makeMockModule(classC, (_ctx) => [
          {
            requirement: reqC,
            execute: async () => {
              executionOrder.push('C');
              return {
                requirementUri: reqC.requirementUri,
                conformanceUri: reqC.conformanceUri,
                testName: reqC.name,
                status: 'pass',
                exchangeIds: [],
                durationMs: 1,
              };
            },
          },
        ]),
      );

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: [
          'http://example.org/conf/a',
          'http://example.org/conf/b',
          'http://example.org/conf/c',
        ],
      });

      const results = await runner.run(session, makeDiscoveryCache());

      // A must execute before B, B before C
      expect(executionOrder).toEqual(['A', 'B', 'C']);
      expect(results.classes).toHaveLength(3);
      expect(results.classes[0].classUri).toBe('http://example.org/conf/a');
      expect(results.classes[1].classUri).toBe('http://example.org/conf/b');
      expect(results.classes[2].classUri).toBe('http://example.org/conf/c');
    });

    it('should run tests concurrently within a class', async () => {
      const reqs = Array.from({ length: 5 }, (_, i) =>
        makeRequirement({
          requirementUri: `/req/a/${i}`,
          conformanceUri: `/conf/a/${i}`,
          name: `Req A${i}`,
        }),
      );

      const classDef = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        requirements: reqs,
      });

      // Track concurrent execution: tests delay slightly and record
      // start/end timestamps to prove overlap
      const concurrencyLog: Array<{ start: number; end: number }> = [];

      registry.register(
        makeMockModule(classDef, (_ctx) =>
          reqs.map((req) => ({
            requirement: req,
            execute: async (): Promise<TestResult> => {
              const start = Date.now();
              // Simulate async work
              await new Promise((r) => setTimeout(r, 20));
              const end = Date.now();
              concurrencyLog.push({ start, end });
              return {
                requirementUri: req.requirementUri,
                conformanceUri: req.conformanceUri,
                testName: req.name,
                status: 'pass',
                exchangeIds: [],
                durationMs: end - start,
              };
            },
          })),
        ),
      );

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: ['http://example.org/conf/a'],
        config: { timeoutMs: 5000, concurrency: 5 },
      });

      await runner.run(session, makeDiscoveryCache());

      // If tests ran sequentially, total time would be >= 5 * 20ms = 100ms
      // With concurrency, some tests should overlap
      expect(concurrencyLog).toHaveLength(5);

      // At least some tests should have overlapping time ranges
      let hasOverlap = false;
      for (let i = 0; i < concurrencyLog.length; i++) {
        for (let j = i + 1; j < concurrencyLog.length; j++) {
          const a = concurrencyLog[i];
          const b = concurrencyLog[j];
          if (a.start < b.end && b.start < a.end) {
            hasOverlap = true;
            break;
          }
        }
        if (hasOverlap) break;
      }
      expect(hasOverlap).toBe(true);
    });
  });

  describe('dependency failure cascading', () => {
    it('should skip dependent class when prerequisite fails', async () => {
      const reqA = makeRequirement({
        requirementUri: '/req/a/1',
        conformanceUri: '/conf/a/1',
        name: 'Req A1',
      });
      const reqB = makeRequirement({
        requirementUri: '/req/b/1',
        conformanceUri: '/conf/b/1',
        name: 'Req B1',
      });

      const classA = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        dependencies: [],
        requirements: [reqA],
      });
      const classB = makeClassDef({
        classUri: 'http://example.org/conf/b',
        name: 'Class B',
        dependencies: ['http://example.org/conf/a'],
        requirements: [reqB],
      });

      registry.register(makeMockModule(classA, makeFailingTests([reqA])));
      registry.register(makeMockModule(classB, makePassingTests([reqB])));

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: [
          'http://example.org/conf/a',
          'http://example.org/conf/b',
        ],
      });

      const results = await runner.run(session, makeDiscoveryCache());

      expect(results.classes[0].status).toBe('fail');
      expect(results.classes[1].status).toBe('skip');
      expect(results.classes[1].tests[0].status).toBe('skip');
      expect(results.classes[1].tests[0].skipReason).toContain(
        'Dependency not met',
      );
    });
  });

  describe('progress events', () => {
    it('should emit progress events in correct order', async () => {
      const reqA = makeRequirement({
        requirementUri: '/req/a/1',
        conformanceUri: '/conf/a/1',
        name: 'Req A1',
      });

      const classDef = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        requirements: [reqA],
      });

      registry.register(makeMockModule(classDef, makePassingTests([reqA])));

      const runner = new TestRunner(registry);
      const events: ProgressEvent[] = [];

      runner.on('class-started', (e: ProgressEvent) => events.push(e));
      runner.on('test-started', (e: ProgressEvent) => events.push(e));
      runner.on('test-completed', (e: ProgressEvent) => events.push(e));
      runner.on('class-completed', (e: ProgressEvent) => events.push(e));
      runner.on('assessment-completed', (e: ProgressEvent) => events.push(e));

      const session = makeSession({
        selectedClasses: ['http://example.org/conf/a'],
      });
      await runner.run(session, makeDiscoveryCache());

      const types = events.map((e) => e.type);
      expect(types).toEqual([
        'class-started',
        'test-started',
        'test-completed',
        'class-completed',
        'assessment-completed',
      ]);

      // Verify event payloads
      expect(events[0].assessmentId).toBe('test-assessment-001');
      expect(events[0].data.className).toBe('Class A');
      expect(events[2].data.status).toBe('pass');
    });

    it('should include correct counts in events', async () => {
      const reqs = [
        makeRequirement({
          requirementUri: '/req/a/1',
          conformanceUri: '/conf/a/1',
          name: 'R1',
        }),
        makeRequirement({
          requirementUri: '/req/a/2',
          conformanceUri: '/conf/a/2',
          name: 'R2',
        }),
      ];

      const classDef = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        requirements: reqs,
      });

      registry.register(makeMockModule(classDef, makePassingTests(reqs)));

      const runner = new TestRunner(registry);
      const completedEvents: ProgressEvent[] = [];
      runner.on('test-completed', (e: ProgressEvent) =>
        completedEvents.push(e),
      );

      const session = makeSession({
        selectedClasses: ['http://example.org/conf/a'],
      });
      await runner.run(session, makeDiscoveryCache());

      // The last test-completed event should have completedTests == totalTests
      const last = completedEvents[completedEvents.length - 1];
      expect(last.data.totalTests).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should catch thrown exceptions and produce fail results (REQ-ENG-012)', async () => {
      const req = makeRequirement({
        requirementUri: '/req/a/1',
        conformanceUri: '/conf/a/1',
        name: 'Throwing test',
      });

      const classDef = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        requirements: [req],
      });

      registry.register(
        makeMockModule(
          classDef,
          makeThrowingTests([req], 'Something went wrong'),
        ),
      );

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: ['http://example.org/conf/a'],
      });

      const results = await runner.run(session, makeDiscoveryCache());

      expect(results.classes[0].status).toBe('fail');
      expect(results.classes[0].tests[0].status).toBe('fail');
      expect(results.classes[0].tests[0].failureMessage).toBe(
        'Something went wrong',
      );
    });

    it('should handle createTests throwing an error', async () => {
      const req = makeRequirement({
        requirementUri: '/req/a/1',
        conformanceUri: '/conf/a/1',
        name: 'R1',
      });

      const classDef = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        requirements: [req],
      });

      registry.register(
        makeMockModule(classDef, () => {
          throw new Error('Module initialization failed');
        }),
      );

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: ['http://example.org/conf/a'],
      });

      const results = await runner.run(session, makeDiscoveryCache());

      expect(results.classes[0].status).toBe('fail');
      expect(results.classes[0].tests[0].failureMessage).toContain(
        'createTests failed',
      );
    });
  });

  describe('cancellation', () => {
    it('should stop after current class when cancelled', async () => {
      const reqA = makeRequirement({
        requirementUri: '/req/a/1',
        conformanceUri: '/conf/a/1',
        name: 'Req A1',
      });
      const reqB = makeRequirement({
        requirementUri: '/req/b/1',
        conformanceUri: '/conf/b/1',
        name: 'Req B1',
      });

      const classA = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        dependencies: [],
        requirements: [reqA],
      });
      const classB = makeClassDef({
        classUri: 'http://example.org/conf/b',
        name: 'Class B',
        dependencies: [],
        requirements: [reqB],
      });

      const cancelToken = new CancelTokenImpl();

      // Class A's test cancels the token during execution
      registry.register(
        makeMockModule(classA, (_ctx) => [
          {
            requirement: reqA,
            execute: async (): Promise<TestResult> => {
              cancelToken.cancel();
              return {
                requirementUri: reqA.requirementUri,
                conformanceUri: reqA.conformanceUri,
                testName: reqA.name,
                status: 'pass',
                exchangeIds: [],
                durationMs: 1,
              };
            },
          },
        ]),
      );
      registry.register(makeMockModule(classB, makePassingTests([reqB])));

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: [
          'http://example.org/conf/a',
          'http://example.org/conf/b',
        ],
        cancelToken,
      });

      const results = await runner.run(session, makeDiscoveryCache());

      // Class A should be in results, Class B should not (cancelled before it started)
      expect(results.classes).toHaveLength(1);
      expect(results.classes[0].classUri).toBe('http://example.org/conf/a');
      expect(results.status).toBe('cancelled');
    });

    it('should skip remaining tests within a class when cancelled', async () => {
      const reqs = Array.from({ length: 5 }, (_, i) =>
        makeRequirement({
          requirementUri: `/req/a/${i}`,
          conformanceUri: `/conf/a/${i}`,
          name: `Req ${i}`,
        }),
      );

      const classDef = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        requirements: reqs,
      });

      const cancelToken = new CancelTokenImpl();
      let execCount = 0;

      registry.register(
        makeMockModule(classDef, (_ctx) =>
          reqs.map((req) => ({
            requirement: req,
            execute: async (): Promise<TestResult> => {
              execCount++;
              if (execCount === 1) {
                // Cancel after first test starts
                cancelToken.cancel();
              }
              return {
                requirementUri: req.requirementUri,
                conformanceUri: req.conformanceUri,
                testName: req.name,
                status: 'pass',
                exchangeIds: [],
                durationMs: 1,
              };
            },
          })),
        ),
      );

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: ['http://example.org/conf/a'],
        cancelToken,
        config: { timeoutMs: 5000, concurrency: 1 }, // concurrency 1 to ensure sequential
      });

      const results = await runner.run(session, makeDiscoveryCache());

      // Some tests should have been skipped due to cancellation
      const skippedTests = results.classes[0].tests.filter(
        (t) => t.status === 'skip',
      );
      expect(skippedTests.length).toBeGreaterThan(0);
    });
  });

  describe('assessment results', () => {
    it('should produce correct AssessmentResults with summary', async () => {
      const reqPass = makeRequirement({
        requirementUri: '/req/a/pass',
        conformanceUri: '/conf/a/pass',
        name: 'Passing test',
      });
      const reqFail = makeRequirement({
        requirementUri: '/req/a/fail',
        conformanceUri: '/conf/a/fail',
        name: 'Failing test',
      });

      const classDef = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        requirements: [reqPass, reqFail],
      });

      registry.register(
        makeMockModule(classDef, (_ctx) => [
          {
            requirement: reqPass,
            execute: async (): Promise<TestResult> => ({
              requirementUri: reqPass.requirementUri,
              conformanceUri: reqPass.conformanceUri,
              testName: reqPass.name,
              status: 'pass',
              exchangeIds: [],
              durationMs: 1,
            }),
          },
          {
            requirement: reqFail,
            execute: async (): Promise<TestResult> => ({
              requirementUri: reqFail.requirementUri,
              conformanceUri: reqFail.conformanceUri,
              testName: reqFail.name,
              status: 'fail',
              failureMessage: 'Expected 200 but got 404',
              exchangeIds: [],
              durationMs: 2,
            }),
          },
        ]),
      );

      const runner = new TestRunner(registry);
      const session = makeSession({
        selectedClasses: ['http://example.org/conf/a'],
      });

      const results = await runner.run(session, makeDiscoveryCache());

      expect(results.id).toBe('test-assessment-001');
      expect(results.endpointUrl).toBe('http://example.org/api');
      expect(results.status).toBe('completed');
      expect(results.startedAt).toBeDefined();
      expect(results.completedAt).toBeDefined();
      expect(results.exchanges).toBeInstanceOf(Map);

      // Summary
      expect(results.summary.totalTests).toBe(2);
      expect(results.summary.passed).toBe(1);
      expect(results.summary.failed).toBe(1);
      expect(results.summary.skipped).toBe(0);
      expect(results.summary.compliancePercent).toBe(50);
      expect(results.summary.totalClasses).toBe(1);
      expect(results.summary.classesFailed).toBe(1);
      expect(results.summary.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty selection gracefully', async () => {
      const runner = new TestRunner(registry);
      const session = makeSession({ selectedClasses: [] });

      const results = await runner.run(session, makeDiscoveryCache());

      expect(results.classes).toHaveLength(0);
      expect(results.summary.totalTests).toBe(0);
      expect(results.summary.passed).toBe(0);
      expect(results.summary.failed).toBe(0);
      expect(results.summary.skipped).toBe(0);
      expect(results.summary.compliancePercent).toBe(0);
      expect(results.status).toBe('completed');
    });
  });

  describe('auto-includes dependencies', () => {
    it('should auto-include unselected dependencies and run them', async () => {
      const reqA = makeRequirement({
        requirementUri: '/req/a/1',
        conformanceUri: '/conf/a/1',
        name: 'Req A1',
      });
      const reqB = makeRequirement({
        requirementUri: '/req/b/1',
        conformanceUri: '/conf/b/1',
        name: 'Req B1',
      });

      const classA = makeClassDef({
        classUri: 'http://example.org/conf/a',
        name: 'Class A',
        dependencies: [],
        requirements: [reqA],
      });
      const classB = makeClassDef({
        classUri: 'http://example.org/conf/b',
        name: 'Class B',
        dependencies: ['http://example.org/conf/a'],
        requirements: [reqB],
      });

      registry.register(makeMockModule(classA, makePassingTests([reqA])));
      registry.register(makeMockModule(classB, makePassingTests([reqB])));

      const runner = new TestRunner(registry);
      // Only select B — A should be auto-included
      const session = makeSession({
        selectedClasses: ['http://example.org/conf/b'],
      });

      const results = await runner.run(session, makeDiscoveryCache());

      // Both classes should appear in results, A before B
      expect(results.classes).toHaveLength(2);
      expect(results.classes[0].classUri).toBe('http://example.org/conf/a');
      expect(results.classes[0].status).toBe('pass');
      expect(results.classes[1].classUri).toBe('http://example.org/conf/b');
      expect(results.classes[1].status).toBe('pass');
    });
  });
});
