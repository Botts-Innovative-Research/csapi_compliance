// CaptureHttpClient — makes HTTP requests to the IUT, captures exchanges, enforces timeouts.
// REQ-ENG-011: Request timeout enforcement
// REQ-ENG-012: Graceful network error handling (no cascading failures)

import crypto from 'node:crypto';
import { ENGINE_DEFAULTS } from '@/lib/constants.js';
import { validateUrl } from '@/server/middleware/ssrf-guard.js';
import { TimeoutError, NetworkError } from '@/engine/errors.js';
import type {
  HttpClientInterface,
  RequestOptions,
  HttpResponse,
  HttpExchange,
  CapturedRequest,
  CapturedResponse,
  AuthConfig,
} from '@/lib/types.js';

/** Content-Type prefixes that are positively known to be binary. */
const BINARY_CONTENT_TYPES = [
  'image/',
  'audio/',
  'video/',
  'application/octet-stream',
  'application/zip',
  'application/gzip',
  'application/pdf',
  'application/protobuf',
  'application/grpc',
  'application/wasm',
  'application/x-tar',
  'font/',
  'model/',
];

/**
 * Returns true if the Content-Type header indicates a binary (non-text) body.
 * Uses a positive match against known binary types. Unknown or unrecognised
 * content types (e.g., "auto") are treated as text to avoid discarding
 * potentially readable content.
 */
function isBinaryContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return BINARY_CONTENT_TYPES.some((prefix) => ct.startsWith(prefix));
}

/**
 * Build auth headers from an AuthConfig.
 */
function buildAuthHeaders(auth: AuthConfig): Record<string, string> {
  switch (auth.type) {
    case 'bearer':
      if (auth.token) return { Authorization: `Bearer ${auth.token}` };
      return {};
    case 'apikey':
      if (auth.headerName && auth.headerValue) return { [auth.headerName]: auth.headerValue };
      return {};
    case 'basic': {
      if (auth.username != null && auth.password != null) {
        const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        return { Authorization: `Basic ${encoded}` };
      }
      return {};
    }
    case 'none':
    default:
      return {};
  }
}

/**
 * Flatten a Headers object into a plain Record<string, string>.
 * Multiple values for the same header are joined with ', '.
 */
function flattenHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * HTTP client that captures every request/response pair as an HttpExchange.
 * Implements HttpClientInterface.
 */
export class CaptureHttpClient implements HttpClientInterface {
  private auth: AuthConfig;
  private defaultTimeoutMs: number;
  private exchanges: Map<string, HttpExchange>;

  constructor(auth: AuthConfig, defaultTimeoutMs: number = ENGINE_DEFAULTS.timeoutMs) {
    this.auth = auth;
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.exchanges = new Map();
  }

  /**
   * General request method.
   * 1. Validate URL against SSRF guard
   * 2. Apply auth headers
   * 3. Send request via fetch with AbortSignal for timeout
   * 4. Capture request + response as HttpExchange
   * 5. Handle errors gracefully (timeout, DNS, connection refused)
   * 6. Truncate response body if > maxResponseBodySizeBytes
   * 7. Detect binary content (non-text Content-Type)
   */
  async request(opts: RequestOptions): Promise<HttpResponse> {
    // 1. SSRF validation
    await validateUrl(opts.url);

    // 2. Build headers: auth + caller-supplied
    const authHeaders = buildAuthHeaders(this.auth);
    const mergedHeaders: Record<string, string> = {
      ...authHeaders,
      ...(opts.headers ?? {}),
    };

    // Serialise body if it's an object
    let bodyPayload: string | undefined;
    if (opts.body != null) {
      if (typeof opts.body === 'string') {
        bodyPayload = opts.body;
      } else {
        bodyPayload = JSON.stringify(opts.body);
        if (!mergedHeaders['Content-Type'] && !mergedHeaders['content-type']) {
          mergedHeaders['Content-Type'] = 'application/json';
        }
      }
    }

    // 3. Timeout via AbortSignal
    const timeoutMs = opts.timeoutMs ?? this.defaultTimeoutMs;

    const startTime = performance.now();
    let response: Response;
    try {
      response = await fetch(opts.url, {
        method: opts.method,
        headers: mergedHeaders,
        body: bodyPayload,
        signal: AbortSignal.timeout(timeoutMs),
        // @ts-expect-error -- Node fetch redirect option
        redirect: 'follow',
      });
    } catch (err: unknown) {
      // 5. Classify errors
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        throw new TimeoutError(opts.url, timeoutMs);
      }
      if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
        // AbortError from user cancellation
        if (err instanceof Error && err.name === 'AbortError') {
          throw new TimeoutError(opts.url, timeoutMs);
        }
        // TypeError from fetch usually means DNS/connection failure
        throw new NetworkError(opts.url, (err as Error).message, err as Error);
      }
      // Catch-all for unexpected errors (Node undici errors, etc.)
      const error = err instanceof Error ? err : new Error(String(err));
      throw new NetworkError(opts.url, error.message, error);
    }

    const responseTimeMs = Math.round(performance.now() - startTime);

    // 4. Read response body
    const responseHeaders = flattenHeaders(response.headers);
    const contentType = responseHeaders['content-type'];
    const binaryBody = isBinaryContentType(contentType);

    let rawBody: string;
    let truncated = false;
    let bodySize: number;

    if (binaryBody) {
      // For binary content, read as ArrayBuffer to get size but don't store full content
      const buffer = await response.arrayBuffer();
      bodySize = buffer.byteLength;
      rawBody = `[binary content: ${contentType ?? 'unknown'}, ${bodySize} bytes]`;
      truncated = false;
    } else {
      rawBody = await response.text();
      bodySize = Buffer.byteLength(rawBody, 'utf-8');

      // 6. Truncate if too large
      if (bodySize > ENGINE_DEFAULTS.maxResponseBodySizeBytes) {
        rawBody = rawBody.slice(0, ENGINE_DEFAULTS.maxResponseBodySizeBytes);
        truncated = true;
      }
    }

    // Build captured request
    const capturedRequest: CapturedRequest = {
      method: opts.method.toUpperCase(),
      url: opts.url,
      headers: mergedHeaders,
      ...(bodyPayload != null ? { body: bodyPayload } : {}),
    };

    // Build captured response
    const capturedResponse: CapturedResponse = {
      statusCode: response.status,
      headers: responseHeaders,
      body: rawBody,
      responseTimeMs,
    };

    // Build exchange
    const exchangeId = crypto.randomUUID();
    const exchange: HttpExchange = {
      id: exchangeId,
      request: capturedRequest,
      response: capturedResponse,
      metadata: {
        truncated,
        binaryBody,
        bodySize,
      },
    };

    // Store exchange
    this.exchanges.set(exchangeId, exchange);

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: rawBody,
      responseTimeMs,
      exchange,
    };
  }

  /** GET convenience method. */
  async get(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'GET', url, headers });
  }

  /** POST convenience method. */
  async post(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'POST', url, body: body as string | object | undefined, headers });
  }

  /** PUT convenience method. */
  async put(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'PUT', url, body: body as string | object | undefined, headers });
  }

  /** PATCH convenience method. */
  async patch(url: string, body?: unknown, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'PATCH', url, body: body as string | object | undefined, headers });
  }

  /** DELETE convenience method. */
  async delete(url: string, headers?: Record<string, string>): Promise<HttpResponse> {
    return this.request({ method: 'DELETE', url, headers });
  }

  /** Get all captured exchanges. */
  getExchanges(): Map<string, HttpExchange> {
    return this.exchanges;
  }

  /** Clear captured exchanges. */
  clearExchanges(): void {
    this.exchanges.clear();
  }
}
