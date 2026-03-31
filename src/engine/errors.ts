// Custom error classes for the HTTP engine layer.
// REQ-ENG-011: Request timeout enforcement
// REQ-ENG-012: Graceful network error handling

/**
 * Thrown when a request targets a private/internal IP or disallowed scheme.
 */
export class SsrfError extends Error {
  public readonly url: string;

  constructor(url: string, reason: string) {
    super(`SSRF blocked: ${reason} (url: ${url})`);
    this.name = 'SsrfError';
    this.url = url;
  }
}

/**
 * Thrown when a request exceeds its configured timeout.
 * REQ-ENG-011.
 */
export class TimeoutError extends Error {
  public readonly url: string;
  public readonly timeoutMs: number;

  constructor(url: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms (url: ${url})`);
    this.name = 'TimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Thrown on DNS resolution failure, connection refused, or other transport errors.
 * REQ-ENG-012.
 */
export class NetworkError extends Error {
  public readonly url: string;
  public override readonly cause?: Error;

  constructor(url: string, message: string, cause?: Error) {
    super(`Network error: ${message} (url: ${url})`);
    this.name = 'NetworkError';
    this.url = url;
    this.cause = cause;
  }
}

/**
 * Thrown when an assessment or request is cancelled via CancelToken.
 */
export class CancellationError extends Error {
  constructor(message = 'Operation was cancelled') {
    super(message);
    this.name = 'CancellationError';
  }
}

/**
 * Thrown when the dependency graph contains a cycle.
 * REQ-ENG-007.
 */
export class CyclicDependencyError extends Error {
  public readonly involvedClasses: string[];

  constructor(involvedClasses: string[]) {
    super(`Cyclic dependency detected among: ${involvedClasses.join(', ')}`);
    this.name = 'CyclicDependencyError';
    this.involvedClasses = involvedClasses;
  }
}
