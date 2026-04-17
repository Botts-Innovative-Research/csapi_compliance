// REQ-ENG-012: Graceful error handling — caught exceptions produce fail results
// TestRunner orchestrates a full conformance assessment by wiring together
// the TestRegistry, DependencyResolver, ResultAggregator, and CaptureHttpClient.

import { EventEmitter } from 'events';
import pLimit from 'p-limit';

import type {
  AssessmentResults,
  AssessmentSession,
  AssessmentSummary,
  ClassStatus,
  ConformanceClassResult,
  ConformanceClassTest,
  DiscoveryCache,
  ExecutableTest,
  ProgressEvent,
  ProgressEventData,
  TestContext,
  TestResult,
} from '@/lib/types';

import { TestRegistry } from '@/engine/registry/registry';
import { DependencyResolver } from '@/engine/dependency-resolver';
import { CaptureHttpClient } from '@/engine/http-client';
import { SchemaValidator } from '@/engine/schema-validator';
import {
  aggregateClassResult,
  aggregateAssessmentSummary,
  skipResult,
  failResult,
} from '@/engine/result-aggregator';

/**
 * Orchestrates the execution of a conformance assessment.
 *
 * Flow:
 *  1. Resolve dependencies via DependencyResolver.resolve
 *  2. For each conformance class (sequential, in dependency order):
 *     a. Check DependencyResolver.shouldSkip — skip all tests if a prerequisite failed
 *     b. Obtain the ConformanceClassTest module from the registry
 *     c. Create executable tests via module.createTests(ctx)
 *     d. Run tests concurrently (bounded by p-limit)
 *     e. Aggregate class results
 *     f. Emit progress events
 *  3. Build AssessmentResults with summary
 *  4. Return results
 *
 * Events emitted (each carries a ProgressEvent payload):
 *   - 'class-started'
 *   - 'test-started'
 *   - 'test-completed'
 *   - 'class-completed'
 *   - 'assessment-completed'
 */
export class TestRunner extends EventEmitter {
  private registry: TestRegistry;

  constructor(registry: TestRegistry) {
    super();
    this.registry = registry;
  }

  /**
   * Execute a full assessment.
   */
  async run(
    session: AssessmentSession,
    discoveryCache: DiscoveryCache,
  ): Promise<AssessmentResults> {
    const assessmentStart = Date.now();

    // 1. Resolve dependency order
    const plan = DependencyResolver.resolve(
      session.selectedClasses,
      this.registry,
    );

    const totalClasses = plan.orderedClasses.length;

    // Create a fresh HTTP client for this assessment (isolates exchanges)
    const httpClient = new CaptureHttpClient(
      session.auth,
      session.config.timeoutMs,
    );

    // Schema validator — shared instance, schemas loaded externally at startup
    const schemaValidator = new SchemaValidator();

    // Build the TestContext shared by all test functions
    const ctx: TestContext = {
      httpClient,
      schemaValidator,
      baseUrl: session.endpointUrl.replace(/\/+$/, '') + '/',
      auth: session.auth,
      config: session.config,
      discoveryCache,
      cancelToken: session.cancelToken,
    };

    const classResults: ConformanceClassResult[] = [];
    const completedStatuses = new Map<string, ClassStatus>();
    let completedClassCount = 0;

    // 2. Execute classes sequentially in dependency order
    for (const classDef of plan.orderedClasses) {
      // Check cancellation between classes
      if (session.cancelToken.cancelled) {
        break;
      }

      const testModule: ConformanceClassTest | undefined =
        this.registry.getTestModule(classDef.classUri);

      if (!testModule) {
        // No module registered — skip the class
        const skippedTests = classDef.requirements.map((req) =>
          skipResult(req, 'No test module registered'),
        );
        const classResult = aggregateClassResult(
          classDef.classUri,
          classDef.name,
          skippedTests,
        );
        classResults.push(classResult);
        completedStatuses.set(classDef.classUri, classResult.status);
        completedClassCount++;
        continue;
      }

      // 2a. Check if this class should be skipped due to dependency failure
      const skipCheck = DependencyResolver.shouldSkip(
        classDef,
        completedStatuses,
      );

      if (skipCheck.skip) {
        const skippedTests = classDef.requirements.map((req) =>
          skipResult(req, skipCheck.reason ?? 'Dependency not met'),
        );
        const classResult = aggregateClassResult(
          classDef.classUri,
          classDef.name,
          skippedTests,
        );
        classResults.push(classResult);
        completedStatuses.set(classDef.classUri, classResult.status);
        completedClassCount++;

        this.emitProgress('class-completed', session.id, {
          className: classDef.name,
          classUri: classDef.classUri,
          status: 'skip',
          completedClasses: completedClassCount,
          totalClasses,
        });
        continue;
      }

      // Emit class-started
      this.emitProgress('class-started', session.id, {
        className: classDef.name,
        classUri: classDef.classUri,
        completedClasses: completedClassCount,
        totalClasses,
      });

      // 2b–c. Create executable tests
      let executableTests: ExecutableTest[];
      try {
        executableTests = testModule.createTests(ctx);
      } catch (err: unknown) {
        // If createTests itself throws, fail all requirements in this class
        const message =
          err instanceof Error ? err.message : String(err);
        const failedTests = classDef.requirements.map((req) =>
          failResult(req, `createTests failed: ${message}`, [], 0),
        );
        const classResult = aggregateClassResult(
          classDef.classUri,
          classDef.name,
          failedTests,
        );
        classResults.push(classResult);
        completedStatuses.set(classDef.classUri, classResult.status);
        completedClassCount++;

        this.emitProgress('class-completed', session.id, {
          className: classDef.name,
          classUri: classDef.classUri,
          status: classResult.status,
          completedClasses: completedClassCount,
          totalClasses,
        });
        continue;
      }

      const totalTests = executableTests.length;

      // 2d. Run tests concurrently within this class, bounded by p-limit
      const limit = pLimit(session.config.concurrency);
      let completedTestCount = 0;

      const testPromises = executableTests.map((test) =>
        limit(async (): Promise<TestResult> => {
          // Check cancellation before each test
          if (session.cancelToken.cancelled) {
            return skipResult(test.requirement, 'Assessment cancelled');
          }

          this.emitProgress('test-started', session.id, {
            className: classDef.name,
            classUri: classDef.classUri,
            testName: test.requirement.name,
            requirementUri: test.requirement.requirementUri,
          });

          const testStart = Date.now();
          let result: TestResult;

          try {
            result = await test.execute(ctx);
          } catch (err: unknown) {
            // REQ-ENG-012: Catch thrown exceptions and produce a fail result
            const message =
              err instanceof Error ? err.message : String(err);
            const durationMs = Date.now() - testStart;
            result = failResult(test.requirement, message, [], durationMs);
          }

          completedTestCount++;

          this.emitProgress('test-completed', session.id, {
            className: classDef.name,
            classUri: classDef.classUri,
            testName: test.requirement.name,
            requirementUri: test.requirement.requirementUri,
            status: result.status,
            completedTests: completedTestCount,
            totalTests,
          });

          return result;
        }),
      );

      const testResults = await Promise.all(testPromises);

      // 2e. Aggregate class result
      const classResult = aggregateClassResult(
        classDef.classUri,
        classDef.name,
        testResults,
      );
      classResults.push(classResult);
      completedStatuses.set(classDef.classUri, classResult.status);
      completedClassCount++;

      // 2f. Emit class-completed
      this.emitProgress('class-completed', session.id, {
        className: classDef.name,
        classUri: classDef.classUri,
        status: classResult.status,
        completedClasses: completedClassCount,
        totalClasses,
      });
    }

    // 3. Build assessment results
    const durationMs = Date.now() - assessmentStart;
    const summary: AssessmentSummary = aggregateAssessmentSummary(
      classResults,
      durationMs,
    );

    const wasCancelled = session.cancelToken.cancelled;

    const results: AssessmentResults = {
      id: session.id,
      endpointUrl: session.endpointUrl,
      startedAt: new Date(assessmentStart).toISOString(),
      completedAt: new Date().toISOString(),
      status: wasCancelled ? 'cancelled' : 'completed',
      classes: classResults,
      exchanges: httpClient.getExchanges(),
      summary,
    };

    // 4. Emit assessment-completed
    this.emitProgress('assessment-completed', session.id, {
      completedClasses: completedClassCount,
      totalClasses,
    });

    return results;
  }

  /** Emit a typed progress event. */
  private emitProgress(
    type: ProgressEvent['type'],
    assessmentId: string,
    data: ProgressEventData,
  ): void {
    const event: ProgressEvent = {
      type,
      assessmentId,
      timestamp: new Date().toISOString(),
      data,
    };
    this.emit(type, event);
  }
}
