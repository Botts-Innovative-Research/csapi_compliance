// REQ-ENG-002: Three-state result enum (pass/fail/skip)
// REQ-ENG-003: Structured failure messages with assertion details
// REQ-ENG-004: Skip reason recording
// REQ-ENG-014: Conformance class result aggregation

import type {
  RequirementDefinition,
  TestResult,
  ConformanceClassResult,
  ClassStatus,
  AssessmentSummary,
} from '@/lib/types';

/** Create a pass result. */
export function passResult(
  requirement: RequirementDefinition,
  exchangeIds: string[],
  durationMs: number,
): TestResult {
  return {
    requirementUri: requirement.requirementUri,
    conformanceUri: requirement.conformanceUri,
    testName: requirement.name,
    status: 'pass',
    exchangeIds,
    durationMs,
  };
}

/** Create a fail result with detailed assertion message. REQ-ENG-003. */
export function failResult(
  requirement: RequirementDefinition,
  message: string,
  exchangeIds: string[],
  durationMs: number,
): TestResult {
  return {
    requirementUri: requirement.requirementUri,
    conformanceUri: requirement.conformanceUri,
    testName: requirement.name,
    status: 'fail',
    failureMessage: message,
    exchangeIds,
    durationMs,
  };
}

/** Create a skip result with reason. REQ-ENG-004. */
export function skipResult(
  requirement: RequirementDefinition,
  reason: string,
): TestResult {
  return {
    requirementUri: requirement.requirementUri,
    conformanceUri: requirement.conformanceUri,
    testName: requirement.name,
    status: 'skip',
    skipReason: reason,
    exchangeIds: [],
    durationMs: 0,
  };
}

/**
 * Aggregate test results into a class result. REQ-ENG-014.
 * A class passes only if ALL its tests pass.
 * If all tests are skipped, the class is skipped.
 * Otherwise (any failure), the class fails.
 */
export function aggregateClassResult(
  classUri: string,
  className: string,
  tests: TestResult[],
): ConformanceClassResult {
  const counts = { pass: 0, fail: 0, skip: 0 };
  for (const test of tests) {
    counts[test.status]++;
  }

  let status: ClassStatus;
  if (counts.fail > 0) {
    status = 'fail';
  } else if (counts.pass === 0 && counts.skip > 0) {
    // All tests skipped, none passed or failed
    status = 'skip';
  } else {
    status = 'pass';
  }

  return {
    classUri,
    className,
    status,
    tests,
    counts,
  };
}

/**
 * Aggregate class results into assessment summary.
 * Compliance % = passed / (passed + failed) * 100 (skipped excluded from denominator).
 */
export function aggregateAssessmentSummary(
  classes: ConformanceClassResult[],
  durationMs: number,
): AssessmentSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let classesPassed = 0;
  let classesFailed = 0;
  let classesSkipped = 0;

  for (const cls of classes) {
    passed += cls.counts.pass;
    failed += cls.counts.fail;
    skipped += cls.counts.skip;

    switch (cls.status) {
      case 'pass':
        classesPassed++;
        break;
      case 'fail':
        classesFailed++;
        break;
      case 'skip':
        classesSkipped++;
        break;
    }
  }

  const denominator = passed + failed;
  const compliancePercent = denominator > 0 ? (passed / denominator) * 100 : 0;

  return {
    totalTests: passed + failed + skipped,
    passed,
    failed,
    skipped,
    compliancePercent,
    totalClasses: classes.length,
    classesPassed,
    classesFailed,
    classesSkipped,
    durationMs,
  };
}

/** Helper: build a structured failure message with expected/actual values. */
export function assertionFailure(
  assertion: string,
  expected: string,
  actual: string,
): string {
  return `Assertion failed: ${assertion}\n  Expected: ${expected}\n  Actual:   ${actual}`;
}
