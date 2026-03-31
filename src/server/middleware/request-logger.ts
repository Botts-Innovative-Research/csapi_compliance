// Structured request logging via pino.
// NFR-11: never log auth headers, credentials, or request/response bodies.

import pino from 'pino';
import type { RequestHandler, Request, Response, NextFunction } from 'express';

/**
 * Application-wide logger instance.
 * Re-exported so other modules can use the same logger.
 */
export const logger = pino({
  level: process.env.CSAPI_LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
});

/** Headers that must never be logged (NFR-11). */
const REDACTED_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
]);

/**
 * Build a safe subset of request headers for logging.
 */
function safeHeaders(raw: Request['headers']): Record<string, string | string[] | undefined> {
  const safe: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    safe[key] = REDACTED_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return safe;
}

/**
 * Middleware that logs each HTTP request/response with timing information.
 *
 * Logged fields: method, url, status, responseTimeMs, contentLength.
 * Auth headers and request/response bodies are intentionally omitted.
 */
export function requestLogger(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    // Hook into the response finish event to capture the final status
    res.on('finish', () => {
      const responseTimeMs = Date.now() - start;

      logger.info(
        {
          req: {
            method: req.method,
            url: req.originalUrl || req.url,
            headers: safeHeaders(req.headers),
          },
          res: {
            statusCode: res.statusCode,
            contentLength: res.getHeader('content-length'),
          },
          responseTimeMs,
        },
        '%s %s %d %dms',
        req.method,
        req.originalUrl || req.url,
        res.statusCode,
        responseTimeMs,
      );
    });

    next();
  };
}

// ---------------------------------------------------------------
// Assessment lifecycle helpers — call these from route handlers
// to log domain events.
// ---------------------------------------------------------------

export function logAssessmentCreated(assessmentId: string, endpointUrl: string): void {
  logger.info({ event: 'assessment.created', assessmentId, endpointUrl }, 'Assessment created');
}

export function logAssessmentStarted(assessmentId: string): void {
  logger.info({ event: 'assessment.started', assessmentId }, 'Assessment started');
}

export function logAssessmentCompleted(assessmentId: string): void {
  logger.info({ event: 'assessment.completed', assessmentId }, 'Assessment completed');
}

export function logAssessmentCancelled(assessmentId: string): void {
  logger.info({ event: 'assessment.cancelled', assessmentId }, 'Assessment cancelled');
}
