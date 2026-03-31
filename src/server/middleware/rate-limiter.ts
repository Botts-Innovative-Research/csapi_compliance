// In-memory rate limiter middleware.
// Architecture.md 7.5: max requests per IP per minute, 429 with Retry-After.

import type { RequestHandler, Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  windowMs: number;    // Time window in ms (default: 60000 = 1 min)
  maxRequests: number; // Max requests per window (default: 30)
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  windowMs: 60_000,
  maxRequests: 30,
};

/**
 * Create an in-memory rate limiter that tracks requests per IP.
 *
 * Returns HTTP 429 with a `Retry-After` header when the limit is exceeded.
 * The health check endpoint (`GET /api/health`) is exempt.
 */
export function createRateLimiter(
  options?: Partial<RateLimiterOptions>,
): RequestHandler {
  const { windowMs, maxRequests } = { ...DEFAULT_OPTIONS, ...options };
  const clients = new Map<string, WindowEntry>();

  // Periodically clean up expired entries (every windowMs)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of clients) {
      if (now >= entry.resetAt) {
        clients.delete(ip);
      }
    }
  }, windowMs);

  // Allow the timer to be garbage-collected when the process exits
  cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Exempt health check endpoint
    if (req.method === 'GET' && req.path === '/health') {
      next();
      return;
    }

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';

    const now = Date.now();
    let entry = clients.get(ip);

    // Create or reset window if expired
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      clients.set(ip, entry);
    }

    entry.count += 1;

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
      });
      return;
    }

    next();
  };
}
