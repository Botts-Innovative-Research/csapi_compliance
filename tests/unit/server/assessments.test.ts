// Integration-style tests for assessment API routes.
// Tests the Express routes directly using supertest — no Next.js required.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import crypto from 'node:crypto';
import { assessmentRoutes, type AssessmentDeps } from '@/server/routes/assessments';
import { healthRoutes } from '@/server/routes/health';
import type { AssessmentSession, AssessmentResults, HttpExchange } from '@/lib/types';

// --- Mock factories ---

function createMockSession(overrides: Partial<AssessmentSession> = {}): AssessmentSession {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    endpointUrl: overrides.endpointUrl ?? 'https://example.com/api',
    selectedClasses: overrides.selectedClasses ?? [],
    auth: overrides.auth ?? { type: 'none' },
    config: overrides.config ?? { timeoutMs: 30000, concurrency: 5 },
    cancelToken: overrides.cancelToken ?? {
      cancelled: false,
      onCancel: vi.fn(),
      cancel: vi.fn(),
    },
    status: overrides.status ?? 'running',
    results: overrides.results,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
  };
}

function createMockExchange(id: string): HttpExchange {
  return {
    id,
    request: {
      method: 'GET',
      url: 'https://example.com/api',
      headers: { authorization: 'Bearer secret-token-value-12345' },
    },
    response: {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: '{"ok": true}',
      responseTimeMs: 42,
    },
    metadata: {
      truncated: false,
      binaryBody: false,
      bodySize: 12,
    },
  };
}

function createMockResults(sessionId: string): AssessmentResults {
  const exchanges = new Map<string, HttpExchange>();
  exchanges.set('ex-1', createMockExchange('ex-1'));

  return {
    id: sessionId,
    endpointUrl: 'https://example.com/api',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    classes: [],
    exchanges,
    summary: {
      totalTests: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      compliancePercent: 100,
      totalClasses: 1,
      classesPassed: 1,
      classesFailed: 0,
      classesSkipped: 0,
      durationMs: 100,
    },
  };
}

// Mock the SSRF guard to allow test URLs through
vi.mock('@/server/middleware/ssrf-guard', () => ({
  validateUrl: vi.fn().mockResolvedValue(undefined),
}));

function createMockDeps(): AssessmentDeps {
  return {
    sessionManager: {
      create: vi.fn(),
      get: vi.fn(),
      updateStatus: vi.fn(),
      storeResults: vi.fn(),
      getRunningCount: vi.fn().mockReturnValue(0),
      evictExpired: vi.fn(),
      shutdown: vi.fn(),
    } as unknown as AssessmentDeps['sessionManager'],
    discoveryService: {
      discover: vi.fn().mockResolvedValue({
        cache: {
          landingPage: {},
          conformsTo: [],
          collectionIds: [],
          links: [],
        },
        declaredClasses: [],
        exchanges: new Map(),
      }),
    } as unknown as AssessmentDeps['discoveryService'],
    testRunner: {
      run: vi.fn().mockResolvedValue(createMockResults('test-id')),
      on: vi.fn(),
      removeListener: vi.fn(),
      emit: vi.fn(),
    } as unknown as AssessmentDeps['testRunner'],
    sseBroadcaster: {
      addClient: vi.fn(),
      removeClient: vi.fn(),
      broadcast: vi.fn(),
      getClientCount: vi.fn().mockReturnValue(0),
      clearHistory: vi.fn(),
    } as unknown as AssessmentDeps['sseBroadcaster'],
    resultStore: {
      dump: vi.fn().mockResolvedValue(undefined),
      loadDumps: vi.fn().mockResolvedValue([]),
      remove: vi.fn().mockResolvedValue(undefined),
      evictOlderThan: vi.fn().mockResolvedValue(0),
    } as unknown as AssessmentDeps['resultStore'],
  };
}

function createApp(deps: AssessmentDeps): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', healthRoutes());
  app.use('/api/assessments', assessmentRoutes(deps));
  return app;
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe('GET /api/health', () => {
  it('returns status=ok and the current allowPrivateNetworks flag', async () => {
    const deps = createMockDeps();
    const app = createApp(deps);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.allowPrivateNetworks).toBe('boolean');
  });
});

describe('POST /api/assessments', () => {
  let deps: AssessmentDeps;
  let app: Express;

  beforeEach(() => {
    deps = createMockDeps();
    app = createApp(deps);
  });

  it('creates a session, runs discovery, and returns 201 with id and discoveryResult', async () => {
    const mockSession = createMockSession({ status: 'discovering' });
    vi.mocked(deps.sessionManager.create).mockReturnValue(mockSession);

    const res = await request(app)
      .post('/api/assessments')
      .send({ endpointUrl: 'https://example.com/api' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', mockSession.id);
    expect(res.body).toHaveProperty('discoveryResult');
    expect(res.body.discoveryResult).toEqual(
      expect.objectContaining({
        landingPage: {},
        conformsTo: [],
        collectionIds: [],
        links: [],
      }),
    );
    expect(deps.sessionManager.create).toHaveBeenCalledWith(
      expect.objectContaining({
        endpointUrl: 'https://example.com/api',
      }),
    );
    expect(deps.discoveryService.discover).toHaveBeenCalled();
  });

  it('returns 400 when endpointUrl is missing', async () => {
    const res = await request(app)
      .post('/api/assessments')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/endpointUrl/i);
  });

  it('returns 400 when endpointUrl is not a string', async () => {
    const res = await request(app)
      .post('/api/assessments')
      .send({ endpointUrl: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/endpointUrl/i);
  });

  it('passes auth and config from request body', async () => {
    const mockSession = createMockSession({ status: 'discovering' });
    vi.mocked(deps.sessionManager.create).mockReturnValue(mockSession);

    const res = await request(app)
      .post('/api/assessments')
      .send({
        endpointUrl: 'https://example.com/api',
        auth: { type: 'bearer', token: 'mytoken' },
        config: { timeoutMs: 60000, concurrency: 3 },
      });

    expect(res.status).toBe(201);
    expect(deps.sessionManager.create).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({ type: 'bearer', token: 'mytoken' }),
        config: { timeoutMs: 60000, concurrency: 3 },
      }),
    );
  });

  it('uses default auth (none) and config when not provided', async () => {
    const mockSession = createMockSession({ status: 'discovering' });
    vi.mocked(deps.sessionManager.create).mockReturnValue(mockSession);

    await request(app)
      .post('/api/assessments')
      .send({ endpointUrl: 'https://example.com/api' });

    expect(deps.sessionManager.create).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({ type: 'none' }),
        config: expect.objectContaining({ timeoutMs: 30000, concurrency: 5 }),
      }),
    );
  });

  it('returns 429 when max concurrent sessions exceeded', async () => {
    vi.mocked(deps.sessionManager.create).mockImplementation(() => {
      throw new Error('Maximum concurrent sessions (5) exceeded');
    });

    const res = await request(app)
      .post('/api/assessments')
      .send({ endpointUrl: 'https://example.com/api' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/concurrent sessions/i);
  });
});

describe('GET /api/assessments/:id', () => {
  let deps: AssessmentDeps;
  let app: Express;

  beforeEach(() => {
    deps = createMockDeps();
    app = createApp(deps);
  });

  it('returns session status for a known id', async () => {
    const mockSession = createMockSession({ status: 'running' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).get(`/api/assessments/${mockSession.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(mockSession.id);
    expect(res.body.status).toBe('running');
    expect(res.body.endpointUrl).toBe(mockSession.endpointUrl);
  });

  it('returns 404 for unknown id', async () => {
    vi.mocked(deps.sessionManager.get).mockReturnValue(undefined);

    const res = await request(app).get('/api/assessments/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns results with masked credentials when available', async () => {
    const sessionId = 'session-with-results';
    const results = createMockResults(sessionId);
    const mockSession = createMockSession({
      id: sessionId,
      status: 'completed',
      results,
      auth: { type: 'bearer', token: 'secret-token' },
    });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).get(`/api/assessments/${sessionId}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toBeDefined();

    // The authorization header should be masked
    const exchangeValues = Object.values(res.body.results.exchanges) as HttpExchange[];
    expect(exchangeValues.length).toBe(1);
    const exchange = exchangeValues[0];
    expect(exchange.request.headers.authorization).not.toBe(
      'Bearer secret-token-value-12345',
    );
    expect(exchange.request.headers.authorization).toContain('***');
  });
});

// SCENARIO-SESS-CONFIRM-002 (progress-session/spec.md): backend must reject
// /start requests that select destructive conformance classes without an
// explicit destructiveConfirmed flag. Defense-in-depth against curl /
// scripted callers bypassing the client UX gate (SCENARIO-SESS-CONFIRM-001).
describe('POST /api/assessments/:id/start', () => {
  let deps: AssessmentDeps;
  let app: Express;

  beforeEach(() => {
    deps = createMockDeps();
    app = createApp(deps);
  });

  it('starts a non-destructive assessment and returns running status', async () => {
    const mockSession = createMockSession({ status: 'discovered' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app)
      .post(`/api/assessments/${mockSession.id}/start`)
      .send({
        conformanceClasses: [
          'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/core',
          'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
  });

  it('returns 400 when destructive class selected without destructiveConfirmed', async () => {
    const mockSession = createMockSession({ status: 'discovered' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app)
      .post(`/api/assessments/${mockSession.id}/start`)
      .send({
        conformanceClasses: [
          'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/system',
          'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete',
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DESTRUCTIVE_CONFIRM_REQUIRED');
    expect(res.body.error).toMatch(/destructive/i);
    expect(deps.testRunner.run).not.toHaveBeenCalled();
  });

  it('returns 400 when destructiveConfirmed is false with a destructive class', async () => {
    const mockSession = createMockSession({ status: 'discovered' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app)
      .post(`/api/assessments/${mockSession.id}/start`)
      .send({
        conformanceClasses: [
          'http://www.opengis.net/spec/ogcapi-connectedsystems-2/1.0/conf/update',
        ],
        destructiveConfirmed: false,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DESTRUCTIVE_CONFIRM_REQUIRED');
  });

  it('starts a destructive assessment when destructiveConfirmed=true', async () => {
    const mockSession = createMockSession({ status: 'discovered' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app)
      .post(`/api/assessments/${mockSession.id}/start`)
      .send({
        conformanceClasses: [
          'http://www.opengis.net/spec/ogcapi-connectedsystems-1/1.0/conf/create-replace-delete',
        ],
        destructiveConfirmed: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
  });

  it('returns 404 for unknown id', async () => {
    vi.mocked(deps.sessionManager.get).mockReturnValue(undefined);

    const res = await request(app)
      .post('/api/assessments/nonexistent/start')
      .send({ conformanceClasses: [] });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 409 when session is already completed', async () => {
    const mockSession = createMockSession({ status: 'completed' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app)
      .post(`/api/assessments/${mockSession.id}/start`)
      .send({ conformanceClasses: [] });

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('completed');
  });
});

describe('POST /api/assessments/:id/cancel', () => {
  let deps: AssessmentDeps;
  let app: Express;

  beforeEach(() => {
    deps = createMockDeps();
    app = createApp(deps);
  });

  it('cancels a running session and returns cancelled status', async () => {
    const cancelFn = vi.fn();
    const mockSession = createMockSession({
      status: 'running',
      cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: cancelFn },
    });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).post(
      `/api/assessments/${mockSession.id}/cancel`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: mockSession.id,
      status: 'cancelled',
    });
    expect(cancelFn).toHaveBeenCalled();
    expect(deps.sessionManager.updateStatus).toHaveBeenCalledWith(
      mockSession.id,
      'cancelled',
    );
  });

  it('cancels a discovering session', async () => {
    const cancelFn = vi.fn();
    const mockSession = createMockSession({
      status: 'discovering',
      cancelToken: { cancelled: false, onCancel: vi.fn(), cancel: cancelFn },
    });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).post(
      `/api/assessments/${mockSession.id}/cancel`,
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(cancelFn).toHaveBeenCalled();
  });

  it('returns 404 for unknown id', async () => {
    vi.mocked(deps.sessionManager.get).mockReturnValue(undefined);

    const res = await request(app).post('/api/assessments/nonexistent/cancel');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 409 when assessment is already completed', async () => {
    const mockSession = createMockSession({ status: 'completed' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).post(
      `/api/assessments/${mockSession.id}/cancel`,
    );

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/cannot cancel/i);
  });
});

describe('GET /api/assessments/:id/events', () => {
  let deps: AssessmentDeps;
  let app: Express;

  beforeEach(() => {
    deps = createMockDeps();
    app = createApp(deps);
  });

  it('sets SSE headers and registers a client', async () => {
    const mockSession = createMockSession({ status: 'running' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app)
      .get(`/api/assessments/${mockSession.id}/events`)
      .buffer(false)
      .parse((res, callback) => {
        // Read just enough to verify headers are set, then abort
        res.on('data', () => {
          // We got data (or headers) — that's enough
        });
        // Give the SSE endpoint time to register the client, then end
        setTimeout(() => {
          callback(null, {});
          (res as unknown as { destroy(): void }).destroy();
        }, 50);
      });

    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['connection']).toBe('keep-alive');
    expect(deps.sseBroadcaster.addClient).toHaveBeenCalledWith(
      expect.objectContaining({
        assessmentId: mockSession.id,
      }),
      undefined,
    );
  });

  it('returns 404 for unknown assessment', async () => {
    vi.mocked(deps.sessionManager.get).mockReturnValue(undefined);

    const res = await request(app).get('/api/assessments/nonexistent/events');

    expect(res.status).toBe(404);
  });
});

describe('GET /api/assessments/:id/export', () => {
  let deps: AssessmentDeps;
  let app: Express;

  beforeEach(() => {
    deps = createMockDeps();
    app = createApp(deps);
  });

  it('returns JSON export with masked credentials', async () => {
    const sessionId = 'export-session';
    const results = createMockResults(sessionId);
    const mockSession = createMockSession({
      id: sessionId,
      status: 'completed',
      results,
      auth: { type: 'bearer', token: 'secret-token' },
    });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).get(
      `/api/assessments/${sessionId}/export?format=json`,
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('csapi-compliance-');

    // ExportEngine wraps data in a versioned envelope
    expect(res.body.schemaVersion).toBe('1');
    expect(res.body.exportedAt).toBeDefined();
    expect(res.body.disclaimer).toBeDefined();

    // Exchanges should be an object (not a Map) inside data
    expect(res.body.data.exchanges).toBeDefined();
    expect(typeof res.body.data.exchanges).toBe('object');

    // Authorization header should be masked
    const exchange = res.body.data.exchanges['ex-1'];
    expect(exchange.request.headers.authorization).toContain('***');
  });

  it('returns PDF export with correct content type', async () => {
    const sessionId = 'pdf-session';
    const results = createMockResults(sessionId);
    const mockSession = createMockSession({
      id: sessionId,
      status: 'completed',
      results,
    });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).get(
      `/api/assessments/${sessionId}/export?format=pdf`,
    );

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('csapi-compliance-');
    expect(res.headers['content-disposition']).toContain('.pdf');
    // Should be a valid PDF (starts with %PDF-)
    expect(res.body).toBeDefined();
  });

  it('returns 400 for invalid format', async () => {
    const sessionId = 'bad-format';
    const results = createMockResults(sessionId);
    const mockSession = createMockSession({
      id: sessionId,
      status: 'completed',
      results,
    });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).get(
      `/api/assessments/${sessionId}/export?format=csv`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid format/i);
  });

  it('returns 400 when no results available', async () => {
    const mockSession = createMockSession({ status: 'running' });
    vi.mocked(deps.sessionManager.get).mockReturnValue(mockSession);

    const res = await request(app).get(
      `/api/assessments/${mockSession.id}/export?format=json`,
    );

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no results/i);
  });

  it('returns 404 for unknown assessment', async () => {
    vi.mocked(deps.sessionManager.get).mockReturnValue(undefined);

    const res = await request(app).get(
      '/api/assessments/nonexistent/export?format=json',
    );

    expect(res.status).toBe(404);
  });
});
