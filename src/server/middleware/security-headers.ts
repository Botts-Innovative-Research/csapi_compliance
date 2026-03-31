// Security headers middleware.
// Architecture.md 7.4: X-Content-Type-Options, X-Frame-Options, CSP, HSTS.

import type { RequestHandler, Request, Response, NextFunction } from 'express';

/**
 * Middleware that sets recommended security headers on every response.
 *
 * HSTS is only set when the request arrived over HTTPS (detected via
 * `X-Forwarded-Proto` or `req.secure`).
 */
export function securityHeaders(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
    );
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // HSTS only when the client connected over HTTPS
    const isHttps =
      req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (isHttps) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  };
}
