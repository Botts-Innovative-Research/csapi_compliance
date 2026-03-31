// Tests for ExportEngine — src/engine/export-engine.ts
// S07-01: JSON export with versioned schema and credential masking
// S07-02: PDF export with summary and per-class breakdowns

import { describe, it, expect, beforeEach } from 'vitest';
import { ExportEngine, generateFilename } from '@/engine/export-engine.js';
import type {
  AssessmentResults,
  AuthConfig,
  ConformanceClassResult,
  HttpExchange,
  AssessmentSummary,
} from '@/lib/types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createExchange(id: string, overrides?: Partial<HttpExchange>): HttpExchange {
  return {
    id,
    request: {
      method: 'GET',
      url: 'https://example.com/api',
      headers: { Authorization: 'Bearer super-secret-token-12345' },
      body: undefined,
    },
    response: {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: '{"status":"ok"}',
      responseTimeMs: 42,
    },
    metadata: {
      truncated: false,
      binaryBody: false,
      bodySize: 15,
    },
    ...overrides,
  };
}

function createClassResult(overrides?: Partial<ConformanceClassResult>): ConformanceClassResult {
  return {
    classUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
    className: 'Core',
    status: 'pass',
    tests: [
      {
        requirementUri: '/req/core/landing-page',
        conformanceUri: '/conf/core/landing-page',
        testName: 'Landing Page Response',
        status: 'pass',
        exchangeIds: ['ex-1'],
        durationMs: 50,
      },
    ],
    counts: { pass: 1, fail: 0, skip: 0 },
    ...overrides,
  };
}

function createSummary(overrides?: Partial<AssessmentSummary>): AssessmentSummary {
  return {
    totalTests: 3,
    passed: 2,
    failed: 1,
    skipped: 0,
    compliancePercent: 66.7,
    totalClasses: 1,
    classesPassed: 0,
    classesFailed: 1,
    classesSkipped: 0,
    durationMs: 1500,
    ...overrides,
  };
}

function createResults(overrides?: Partial<AssessmentResults>): AssessmentResults {
  const exchanges = new Map<string, HttpExchange>();
  exchanges.set('ex-1', createExchange('ex-1'));
  exchanges.set('ex-2', createExchange('ex-2'));

  return {
    id: 'assess-001',
    endpointUrl: 'https://example.com/api',
    startedAt: '2026-03-30T10:00:00Z',
    completedAt: '2026-03-30T10:01:30Z',
    status: 'completed',
    classes: [
      createClassResult(),
      createClassResult({
        classUri: 'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
        className: 'System',
        status: 'fail',
        tests: [
          {
            requirementUri: '/req/system/canonical-url',
            conformanceUri: '/conf/system/canonical-url',
            testName: 'System Canonical URL',
            status: 'pass',
            exchangeIds: ['ex-1'],
            durationMs: 30,
          },
          {
            requirementUri: '/req/system/collection',
            conformanceUri: '/conf/system/collection',
            testName: 'System Collection',
            status: 'fail',
            failureMessage: 'Expected status 200 but got 404',
            exchangeIds: ['ex-2'],
            durationMs: 25,
          },
        ],
        counts: { pass: 1, fail: 1, skip: 0 },
      }),
    ],
    exchanges,
    summary: createSummary(),
    ...overrides,
  };
}

const bearerAuth: AuthConfig = { type: 'bearer', token: 'super-secret-token-12345' };
const noAuth: AuthConfig = { type: 'none' };

// ---------------------------------------------------------------------------
// JSON Export Tests
// ---------------------------------------------------------------------------

describe('ExportEngine', () => {
  let engine: ExportEngine;

  beforeEach(() => {
    engine = new ExportEngine();
  });

  describe('exportJson', () => {
    it('includes schemaVersion "1"', () => {
      const results = createResults();
      const exported = engine.exportJson(results, noAuth);

      expect(exported.schemaVersion).toBe('1');
    });

    it('masks credentials in exported exchanges', () => {
      const results = createResults();
      const exported = engine.exportJson(results, bearerAuth);

      const data = exported.data as Record<string, unknown>;
      const exchanges = data.exchanges as Record<string, HttpExchange>;

      // The Authorization header should be masked
      const ex1 = exchanges['ex-1'];
      expect(ex1.request.headers['Authorization']).not.toBe(
        'Bearer super-secret-token-12345',
      );
      expect(ex1.request.headers['Authorization']).toContain('Bearer');
      expect(ex1.request.headers['Authorization']).toContain('***');
    });

    it('includes all class results', () => {
      const results = createResults();
      const exported = engine.exportJson(results, noAuth);

      const data = exported.data as Record<string, unknown>;
      const classes = data.classes as ConformanceClassResult[];

      expect(classes).toHaveLength(2);
      expect(classes[0].className).toBe('Core');
      expect(classes[1].className).toBe('System');
    });

    it('includes disclaimer text', () => {
      const results = createResults();
      const exported = engine.exportJson(results, noAuth);

      expect(exported.disclaimer).toBeTruthy();
      expect(exported.disclaimer).toContain('automated compliance assessment');
    });

    it('converts Map<string, HttpExchange> to plain object', () => {
      const results = createResults();
      const exported = engine.exportJson(results, noAuth);

      const data = exported.data as Record<string, unknown>;
      const exchanges = data.exchanges;

      // Should be a plain object, not a Map
      expect(exchanges).not.toBeInstanceOf(Map);
      expect(typeof exchanges).toBe('object');
      expect(exchanges).toHaveProperty('ex-1');
      expect(exchanges).toHaveProperty('ex-2');
    });

    it('has correct structure with exportedAt and data', () => {
      const results = createResults();
      const exported = engine.exportJson(results, noAuth);

      expect(exported).toHaveProperty('schemaVersion');
      expect(exported).toHaveProperty('exportedAt');
      expect(exported).toHaveProperty('disclaimer');
      expect(exported).toHaveProperty('data');

      // exportedAt should be a valid ISO date string
      expect(() => new Date(exported.exportedAt)).not.toThrow();
      expect(new Date(exported.exportedAt).toISOString()).toBe(exported.exportedAt);

      // data should contain the assessment fields
      const data = exported.data as Record<string, unknown>;
      expect(data).toHaveProperty('id', 'assess-001');
      expect(data).toHaveProperty('endpointUrl', 'https://example.com/api');
      expect(data).toHaveProperty('startedAt');
      expect(data).toHaveProperty('completedAt');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('classes');
      expect(data).toHaveProperty('exchanges');
      expect(data).toHaveProperty('summary');
    });

    it('is fully JSON-serializable', () => {
      const results = createResults();
      const exported = engine.exportJson(results, noAuth);

      // Should round-trip through JSON.stringify/parse without error
      const json = JSON.stringify(exported);
      const parsed = JSON.parse(json);

      expect(parsed.schemaVersion).toBe('1');
      expect(parsed.data.id).toBe('assess-001');
      expect(parsed.data.exchanges['ex-1']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // PDF Export Tests
  // ---------------------------------------------------------------------------

  describe('exportPdf', () => {
    it('returns a Buffer', async () => {
      const results = createResults();
      const pdf = await engine.exportPdf(results, noAuth);

      expect(pdf).toBeInstanceOf(Buffer);
    });

    it('returns a non-empty Buffer', async () => {
      const results = createResults();
      const pdf = await engine.exportPdf(results, noAuth);

      expect(pdf.length).toBeGreaterThan(0);
    });

    it('includes endpoint URL in PDF content', async () => {
      const results = createResults();
      const pdf = await engine.exportPdf(results, noAuth);

      // PDF content is binary but text strings are often embedded as-is
      const pdfText = pdf.toString('latin1');
      expect(pdfText).toContain('https://example.com/api');
    });

    it('starts with PDF magic bytes', async () => {
      const results = createResults();
      const pdf = await engine.exportPdf(results, noAuth);

      // PDF files start with %PDF-
      const header = pdf.subarray(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });
  });

  // ---------------------------------------------------------------------------
  // Partial Results Export
  // ---------------------------------------------------------------------------

  describe('partial results export', () => {
    it('exports partial results as JSON', () => {
      const results = createResults({
        status: 'partial',
        completedAt: undefined,
        classes: [createClassResult()],
        summary: createSummary({
          totalTests: 1,
          passed: 1,
          failed: 0,
          compliancePercent: 100,
        }),
      });

      const exported = engine.exportJson(results, noAuth);
      expect(exported.schemaVersion).toBe('1');

      const data = exported.data as Record<string, unknown>;
      expect(data.status).toBe('partial');
      expect(data.completedAt).toBeUndefined();
    });

    it('exports partial results as PDF', async () => {
      const results = createResults({
        status: 'partial',
        completedAt: undefined,
        classes: [createClassResult()],
        summary: createSummary({
          totalTests: 1,
          passed: 1,
          failed: 0,
          compliancePercent: 100,
        }),
      });

      const pdf = await engine.exportPdf(results, noAuth);
      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Filename generation
  // ---------------------------------------------------------------------------

  describe('generateFilename', () => {
    it('produces correct filename convention', () => {
      const filename = generateFilename('https://example.com/api', 'json');

      expect(filename).toMatch(/^csapi-compliance-example\.com-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('handles invalid URLs gracefully', () => {
      const filename = generateFilename('not-a-url', 'pdf');

      expect(filename).toMatch(/^csapi-compliance-unknown-\d{4}-\d{2}-\d{2}\.pdf$/);
    });
  });
});
