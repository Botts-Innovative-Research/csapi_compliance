// Tests for result aggregation — src/engine/result-aggregator.ts
// REQ-ENG-013: Standardized test result data structure
// SCENARIO-ENG-RESULT-001: Result aggregation produces canonical verdict structure (CRITICAL)

import { describe, it, expect } from 'vitest';
import type { RequirementDefinition, TestResult } from '@/lib/types';
import {
  passResult,
  failResult,
  skipResult,
  aggregateClassResult,
  aggregateAssessmentSummary,
  assertionFailure,
} from '@/engine/result-aggregator';

/** Shared fixture for a sample requirement definition. */
function makeRequirement(overrides?: Partial<RequirementDefinition>): RequirementDefinition {
  return {
    requirementUri: '/req/system/canonical-url',
    conformanceUri: '/conf/system/canonical-url',
    name: 'Canonical URL',
    priority: 'MUST',
    description: 'Verify the system returns a canonical URL',
    ...overrides,
  };
}

describe('result-aggregator', () => {
  // ----------------------------------------------------------------
  // REQ-ENG-002: Three-state result enum (pass/fail/skip)
  // ----------------------------------------------------------------

  describe('passResult', () => {
    it('creates correct structure with status "pass"', () => {
      // REQ-ENG-002: pass state
      const req = makeRequirement();
      const result = passResult(req, ['ex-1', 'ex-2'], 42);

      expect(result.status).toBe('pass');
      expect(result.requirementUri).toBe(req.requirementUri);
      expect(result.conformanceUri).toBe(req.conformanceUri);
      expect(result.testName).toBe(req.name);
      expect(result.exchangeIds).toEqual(['ex-1', 'ex-2']);
      expect(result.durationMs).toBe(42);
      expect(result.failureMessage).toBeUndefined();
      expect(result.skipReason).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // REQ-ENG-003: Structured failure messages with assertion details
  // ----------------------------------------------------------------

  describe('failResult', () => {
    it('includes failure message with status "fail"', () => {
      // REQ-ENG-002: fail state
      // REQ-ENG-003: structured failure message
      const req = makeRequirement();
      const msg = 'Expected status 200 but got 404';
      const result = failResult(req, msg, ['ex-3'], 100);

      expect(result.status).toBe('fail');
      expect(result.failureMessage).toBe(msg);
      expect(result.requirementUri).toBe(req.requirementUri);
      expect(result.conformanceUri).toBe(req.conformanceUri);
      expect(result.testName).toBe(req.name);
      expect(result.exchangeIds).toEqual(['ex-3']);
      expect(result.durationMs).toBe(100);
      expect(result.skipReason).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // REQ-ENG-004: Skip reason recording
  // ----------------------------------------------------------------

  describe('skipResult', () => {
    it('includes skip reason with status "skip"', () => {
      // REQ-ENG-002: skip state
      // REQ-ENG-004: skip reason recording
      const req = makeRequirement();
      const reason = 'Endpoint does not advertise conformance class';
      const result = skipResult(req, reason);

      expect(result.status).toBe('skip');
      expect(result.skipReason).toBe(reason);
      expect(result.requirementUri).toBe(req.requirementUri);
      expect(result.conformanceUri).toBe(req.conformanceUri);
      expect(result.testName).toBe(req.name);
      expect(result.exchangeIds).toEqual([]);
      expect(result.durationMs).toBe(0);
      expect(result.failureMessage).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // REQ-ENG-014: Conformance class result aggregation
  // ----------------------------------------------------------------

  describe('aggregateClassResult', () => {
    it('all pass -> class passes', () => {
      // REQ-ENG-014: class passes only if ALL tests pass
      const tests: TestResult[] = [
        passResult(makeRequirement({ name: 'Test A' }), ['ex-1'], 10),
        passResult(makeRequirement({ name: 'Test B' }), ['ex-2'], 20),
      ];

      const result = aggregateClassResult(
        'http://www.opengis.net/spec/ogcapi-cs-1/1.0/conf/system',
        'System',
        tests,
      );

      expect(result.status).toBe('pass');
      expect(result.counts).toEqual({ pass: 2, fail: 0, skip: 0 });
      expect(result.classUri).toBe('http://www.opengis.net/spec/ogcapi-cs-1/1.0/conf/system');
      expect(result.className).toBe('System');
      expect(result.tests).toHaveLength(2);
    });

    it('one fail -> class fails', () => {
      // REQ-ENG-014: a single failure causes class failure
      const tests: TestResult[] = [
        passResult(makeRequirement({ name: 'Test A' }), ['ex-1'], 10),
        failResult(makeRequirement({ name: 'Test B' }), 'Missing field', ['ex-2'], 20),
        passResult(makeRequirement({ name: 'Test C' }), ['ex-3'], 15),
      ];

      const result = aggregateClassResult('urn:class:1', 'Mixed', tests);

      expect(result.status).toBe('fail');
      expect(result.counts).toEqual({ pass: 2, fail: 1, skip: 0 });
    });

    it('all skip -> class skips', () => {
      // REQ-ENG-014: all skipped tests produce a skipped class
      const tests: TestResult[] = [
        skipResult(makeRequirement({ name: 'Test A' }), 'Not supported'),
        skipResult(makeRequirement({ name: 'Test B' }), 'Dependency missing'),
      ];

      const result = aggregateClassResult('urn:class:2', 'Skipped Class', tests);

      expect(result.status).toBe('skip');
      expect(result.counts).toEqual({ pass: 0, fail: 0, skip: 2 });
    });
  });

  describe('aggregateAssessmentSummary', () => {
    it('produces correct counts and compliance %', () => {
      // REQ-ENG-014: assessment-level aggregation
      const classA = aggregateClassResult('urn:a', 'A', [
        passResult(makeRequirement({ name: 'A1' }), [], 10),
        passResult(makeRequirement({ name: 'A2' }), [], 20),
      ]);
      const classB = aggregateClassResult('urn:b', 'B', [
        failResult(makeRequirement({ name: 'B1' }), 'err', [], 5),
      ]);

      const summary = aggregateAssessmentSummary([classA, classB], 500);

      expect(summary.totalTests).toBe(3);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.skipped).toBe(0);
      // Compliance: 2 / (2+1) * 100 = 66.67
      expect(summary.compliancePercent).toBeCloseTo(66.67, 1);
      expect(summary.totalClasses).toBe(2);
      expect(summary.classesPassed).toBe(1);
      expect(summary.classesFailed).toBe(1);
      expect(summary.classesSkipped).toBe(0);
      expect(summary.durationMs).toBe(500);
    });

    it('compliance % with mixed results (3 pass, 1 fail, 1 skip -> 75%)', () => {
      // REQ-ENG-014: skipped tests excluded from compliance denominator
      // Compliance % = passed / (passed + failed) * 100 = 3 / (3+1) * 100 = 75
      const classA = aggregateClassResult('urn:a', 'A', [
        passResult(makeRequirement({ name: 'A1' }), [], 10),
        passResult(makeRequirement({ name: 'A2' }), [], 10),
        passResult(makeRequirement({ name: 'A3' }), [], 10),
      ]);
      const classB = aggregateClassResult('urn:b', 'B', [
        failResult(makeRequirement({ name: 'B1' }), 'err', [], 10),
      ]);
      const classC = aggregateClassResult('urn:c', 'C', [
        skipResult(makeRequirement({ name: 'C1' }), 'Not applicable'),
      ]);

      const summary = aggregateAssessmentSummary([classA, classB, classC], 1000);

      expect(summary.totalTests).toBe(5);
      expect(summary.passed).toBe(3);
      expect(summary.failed).toBe(1);
      expect(summary.skipped).toBe(1);
      expect(summary.compliancePercent).toBe(75);
      expect(summary.totalClasses).toBe(3);
      expect(summary.classesPassed).toBe(1);
      expect(summary.classesFailed).toBe(1);
      expect(summary.classesSkipped).toBe(1);
    });

    it('returns 0% compliance when all tests are skipped', () => {
      // REQ-ENG-014: edge case - no non-skipped tests
      const classA = aggregateClassResult('urn:a', 'A', [
        skipResult(makeRequirement({ name: 'A1' }), 'N/A'),
      ]);

      const summary = aggregateAssessmentSummary([classA], 50);

      expect(summary.compliancePercent).toBe(0);
      expect(summary.totalTests).toBe(1);
      expect(summary.skipped).toBe(1);
    });
  });

  // ----------------------------------------------------------------
  // REQ-ENG-003: Structured failure messages with assertion details
  // ----------------------------------------------------------------

  describe('assertionFailure', () => {
    it('formats message correctly with assertion, expected, and actual', () => {
      // REQ-ENG-003: structured failure message with expected/actual values
      const msg = assertionFailure(
        'Response status code must be 200',
        '200',
        '404',
      );

      expect(msg).toContain('Assertion failed: Response status code must be 200');
      expect(msg).toContain('Expected: 200');
      expect(msg).toContain('Actual:   404');
    });
  });
});
