// REQ-CAP-006: Credential masking in captured HTTP exchanges
// REQ-CAP-007: Sensitive data protection for stored exchanges

import type { HttpExchange, AuthConfig } from '@/lib/types';

/** Well-known headers that may carry credentials. */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
]);

/** JSON body field names that may contain passwords/secrets. */
const PASSWORD_FIELDS = new Set([
  'password',
  'passwd',
  'secret',
  'api_key',
  'apikey',
  'api-key',
  'access_token',
  'token',
  'client_secret',
]);

/**
 * Masks credentials in captured HTTP exchanges so they can be safely
 * stored and displayed without leaking secrets.
 */
export class CredentialMasker {
  /**
   * Mask a single value: show first 4 + last 4 chars, mask middle with ***.
   * If value <= 8 chars or is empty, mask entirely as "****".
   */
  static maskValue(value: string): string {
    if (value.length <= 8) {
      return '****';
    }
    return `${value.slice(0, 4)}***${value.slice(-4)}`;
  }

  /**
   * Mask credentials in an HttpExchange.
   *
   * Detects and masks:
   * - Authorization header values (Bearer tokens, Basic auth)
   * - API key header values (by matching the header name from AuthConfig)
   * - API key query parameters in URLs
   * - Password fields in JSON request bodies
   *
   * Returns a new HttpExchange with masked values (does not mutate input).
   */
  static maskExchange(exchange: HttpExchange, auth: AuthConfig): HttpExchange {
    const maskedRequestHeaders = CredentialMasker.maskHeaders(
      exchange.request.headers,
      auth,
    );

    const maskedUrl = CredentialMasker.maskUrl(exchange.request.url, auth);

    const maskedBody = CredentialMasker.maskJsonBody(exchange.request.body);

    const maskedResponseHeaders = CredentialMasker.maskHeaders(
      exchange.response.headers,
      auth,
    );

    return {
      id: exchange.id,
      request: {
        method: exchange.request.method,
        url: maskedUrl,
        headers: maskedRequestHeaders,
        body: maskedBody,
      },
      response: {
        statusCode: exchange.response.statusCode,
        headers: maskedResponseHeaders,
        body: exchange.response.body,
        responseTimeMs: exchange.response.responseTimeMs,
      },
      metadata: { ...exchange.metadata },
    };
  }

  /**
   * Mask all exchanges in a map.
   */
  static maskAll(
    exchanges: Map<string, HttpExchange>,
    auth: AuthConfig,
  ): Map<string, HttpExchange> {
    const masked = new Map<string, HttpExchange>();
    for (const [id, exchange] of exchanges) {
      masked.set(id, CredentialMasker.maskExchange(exchange, auth));
    }
    return masked;
  }

  // --- Private helpers ---

  /**
   * Mask header values for known sensitive headers and auth-config headers.
   */
  private static maskHeaders(
    headers: Record<string, string>,
    auth: AuthConfig,
  ): Record<string, string> {
    const masked: Record<string, string> = {};
    const authHeaderLower = auth.headerName?.toLowerCase();

    for (const [name, value] of Object.entries(headers)) {
      const lowerName = name.toLowerCase();

      if (SENSITIVE_HEADERS.has(lowerName)) {
        masked[name] = CredentialMasker.maskAuthorizationValue(lowerName, value);
      } else if (authHeaderLower && lowerName === authHeaderLower) {
        masked[name] = CredentialMasker.maskValue(value);
      } else {
        masked[name] = value;
      }
    }

    return masked;
  }

  /**
   * Mask an Authorization-style header value, preserving the scheme prefix.
   * e.g. "Bearer abc123..." -> "Bearer abc1***3..."
   */
  private static maskAuthorizationValue(
    headerName: string,
    value: string,
  ): string {
    if (
      headerName === 'authorization' ||
      headerName === 'proxy-authorization'
    ) {
      const spaceIdx = value.indexOf(' ');
      if (spaceIdx > 0) {
        const scheme = value.slice(0, spaceIdx);
        const credential = value.slice(spaceIdx + 1);
        return `${scheme} ${CredentialMasker.maskValue(credential)}`;
      }
    }
    return CredentialMasker.maskValue(value);
  }

  /**
   * Mask API key query parameters in a URL based on auth config.
   */
  private static maskUrl(url: string, auth: AuthConfig): string {
    if (auth.type !== 'apikey' || !auth.headerName) {
      return url;
    }

    try {
      const parsed = new URL(url);
      const paramName = auth.headerName;
      if (parsed.searchParams.has(paramName)) {
        const original = parsed.searchParams.get(paramName)!;
        parsed.searchParams.set(paramName, CredentialMasker.maskValue(original));
        return parsed.toString();
      }
    } catch {
      // Not a valid URL — return as-is
    }

    return url;
  }

  /**
   * Mask password-like fields in a JSON request body string.
   * Returns the original string if parsing fails or body is undefined.
   */
  private static maskJsonBody(body?: string): string | undefined {
    if (!body) {
      return body;
    }

    try {
      const parsed = JSON.parse(body);
      if (typeof parsed === 'object' && parsed !== null) {
        const masked = CredentialMasker.maskObjectFields(parsed);
        return JSON.stringify(masked);
      }
    } catch {
      // Not JSON — return as-is
    }

    return body;
  }

  /**
   * Recursively mask password-like fields in an object.
   */
  private static maskObjectFields(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (PASSWORD_FIELDS.has(key.toLowerCase()) && typeof value === 'string') {
        result[key] = CredentialMasker.maskValue(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = CredentialMasker.maskObjectFields(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
