// Unit tests for production middleware: rate-limiter, security-headers, request-logger.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import { createRateLimiter } from '@/server/middleware/rate-limiter';
import { securityHeaders } from '@/server/middleware/security-headers';

// --- Mock pino before importing the module that calls pino() at top level ---
vi.mock('pino', () => {
  const infoFn = vi.fn();
  const mockLogger = {
    info: infoFn,
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  const pinoFn = vi.fn(() => mockLogger);
  // Attach the mock logger for test access
  (pinoFn as unknown as { _mockLogger: typeof mockLogger })._mockLogger = mockLogger;
  return { default: pinoFn };
});

// Import after mock is set up
import { requestLogger } from '@/server/middleware/request-logger';
import pino from 'pino';

function getMockLogger() {
  return (pino as unknown as { _mockLogger: { info: ReturnType<typeof vi.fn> } })._mockLogger;
}

// ================================================================
// Rate Limiter
// ================================================================
describe('createRateLimiter', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
  });

  it('allows requests under the limit', async () => {
    app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 5 }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 5; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 when limit is exceeded', async () => {
    app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 3 }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      await request(app).get('/test');
    }

    // Next request should be rejected
    const res = await request(app).get('/test');
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many requests/i);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('resets after window expires', async () => {
    vi.useFakeTimers();

    app.use(createRateLimiter({ windowMs: 1000, maxRequests: 2 }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    // Exhaust the limit
    await request(app).get('/test');
    await request(app).get('/test');
    let res = await request(app).get('/test');
    expect(res.status).toBe(429);

    // Advance time past the window
    vi.advanceTimersByTime(1100);

    // Should be allowed again
    res = await request(app).get('/test');
    expect(res.status).toBe(200);

    vi.useRealTimers();
  });

  it('tracks per IP independently', async () => {
    app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 2 }));
    app.get('/test', (_req, res) => res.json({ ok: true }));

    // IP "1.1.1.1" — 2 requests (at limit)
    await request(app).get('/test').set('X-Forwarded-For', '1.1.1.1');
    await request(app).get('/test').set('X-Forwarded-For', '1.1.1.1');

    // IP "1.1.1.1" — 3rd request should be blocked
    const blocked = await request(app).get('/test').set('X-Forwarded-For', '1.1.1.1');
    expect(blocked.status).toBe(429);

    // IP "2.2.2.2" — different IP, should still be allowed
    const allowed = await request(app).get('/test').set('X-Forwarded-For', '2.2.2.2');
    expect(allowed.status).toBe(200);
  });

  it('exempts the health check endpoint', async () => {
    app.use(createRateLimiter({ windowMs: 60_000, maxRequests: 1 }));
    app.get('/health', (_req, res) => res.json({ status: 'ok' }));
    app.get('/other', (_req, res) => res.json({ ok: true }));

    // Use up the limit on /other
    await request(app).get('/other');
    const blocked = await request(app).get('/other');
    expect(blocked.status).toBe(429);

    // /health should still be reachable
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
  });
});

// ================================================================
// Security Headers
// ================================================================
describe('securityHeaders', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(securityHeaders());
    app.get('/test', (_req, res) => res.json({ ok: true }));
  });

  it('sets all expected security headers', async () => {
    const res = await request(app).get('/test');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-xss-protection']).toBe('0');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
  });

  it('sets HSTS only when X-Forwarded-Proto is https', async () => {
    // Without HTTPS — no HSTS
    const httpRes = await request(app).get('/test');
    expect(httpRes.headers['strict-transport-security']).toBeUndefined();

    // With HTTPS — HSTS present
    const httpsRes = await request(app)
      .get('/test')
      .set('X-Forwarded-Proto', 'https');
    expect(httpsRes.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });
});

// ================================================================
// Request Logger
// ================================================================
describe('requestLogger', () => {
  let app: Express;

  beforeEach(() => {
    getMockLogger().info.mockClear();
    app = express();
    app.use(requestLogger());
    app.get('/test', (_req, res) => res.json({ ok: true }));
  });

  it('logs method, url, and status code for each request', async () => {
    await request(app).get('/test');

    const mockInfo = getMockLogger().info;
    expect(mockInfo).toHaveBeenCalled();

    // Find the call that has the structured req/res fields
    const call = mockInfo.mock.calls.find(
      (c: unknown[]) => c[0] && typeof c[0] === 'object' && 'req' in (c[0] as Record<string, unknown>),
    );
    expect(call).toBeDefined();

    const logObj = call![0] as { req: { method: string; url: string }; res: { statusCode: number }; responseTimeMs: number };
    expect(logObj.req.method).toBe('GET');
    expect(logObj.req.url).toBe('/test');
    expect(logObj.res.statusCode).toBe(200);
    expect(typeof logObj.responseTimeMs).toBe('number');
  });

  it('redacts authorization headers', async () => {
    await request(app).get('/test').set('Authorization', 'Bearer secret');

    const mockInfo = getMockLogger().info;
    const call = mockInfo.mock.calls.find(
      (c: unknown[]) => c[0] && typeof c[0] === 'object' && 'req' in (c[0] as Record<string, unknown>),
    );
    expect(call).toBeDefined();

    const logObj = call![0] as { req: { headers: Record<string, string> } };
    expect(logObj.req.headers['authorization']).toBe('[REDACTED]');
  });
});
