// Tests for CredentialMasker — src/engine/credential-masker.ts
// REQ-CAP-006: Credential masking in captured HTTP exchanges
// REQ-CAP-007: Sensitive data protection for stored exchanges

import { describe, it, expect } from 'vitest';
import { CredentialMasker } from '@/engine/credential-masker.js';
import type { HttpExchange, AuthConfig } from '@/lib/types.js';

/** Helper: create a minimal HttpExchange for testing. */
function createExchange(overrides?: {
  id?: string;
  method?: string;
  url?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
}): HttpExchange {
  return {
    id: overrides?.id ?? 'ex-1',
    request: {
      method: overrides?.method ?? 'GET',
      url: overrides?.url ?? 'https://example.com/api',
      headers: overrides?.requestHeaders ?? { 'Content-Type': 'application/json' },
      body: overrides?.requestBody,
    },
    response: {
      statusCode: 200,
      headers: overrides?.responseHeaders ?? { 'Content-Type': 'application/json' },
      body: overrides?.responseBody ?? '{}',
      responseTimeMs: 42,
    },
    metadata: {
      truncated: false,
      binaryBody: false,
      bodySize: 2,
    },
  };
}

const bearerAuth: AuthConfig = { type: 'bearer', token: 'my-secret-bearer-token-12345' };
const basicAuth: AuthConfig = { type: 'basic', username: 'admin', password: 'supersecret' };
const apikeyAuth: AuthConfig = {
  type: 'apikey',
  headerName: 'X-API-Key',
  headerValue: 'abcdefghijklmnopqrstuvwxyz',
};
const noAuth: AuthConfig = { type: 'none' };

// ---------------------------------------------------------------------------
// maskValue
// ---------------------------------------------------------------------------

describe('CredentialMasker.maskValue', () => {
  it('long token shows first 4 + "***" + last 4', () => {
    const result = CredentialMasker.maskValue('abcdefghijklmnop');
    expect(result).toBe('abcd***mnop');
  });

  it('short token (<=8 chars) becomes "****"', () => {
    expect(CredentialMasker.maskValue('12345678')).toBe('****');
    expect(CredentialMasker.maskValue('short')).toBe('****');
  });

  it('empty string becomes "****"', () => {
    expect(CredentialMasker.maskValue('')).toBe('****');
  });
});

// ---------------------------------------------------------------------------
// maskExchange
// ---------------------------------------------------------------------------

describe('CredentialMasker.maskExchange', () => {
  it('masks Bearer token in Authorization header', () => {
    const exchange = createExchange({
      requestHeaders: {
        Authorization: 'Bearer my-secret-bearer-token-12345',
        'Content-Type': 'application/json',
      },
    });

    const masked = CredentialMasker.maskExchange(exchange, bearerAuth);

    expect(masked.request.headers['Authorization']).toBe(
      'Bearer my-s***2345',
    );
  });

  it('masks Basic auth in Authorization header', () => {
    const exchange = createExchange({
      requestHeaders: {
        Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
      },
    });

    const masked = CredentialMasker.maskExchange(exchange, basicAuth);

    expect(masked.request.headers['Authorization']).toMatch(/^Basic /);
    expect(masked.request.headers['Authorization']).not.toContain(
      'dXNlcjpwYXNzd29yZA==',
    );
    // The base64 value "dXNlcjpwYXNzd29yZA==" is 20 chars -> first4***last4
    expect(masked.request.headers['Authorization']).toBe(
      'Basic dXNl***ZA==',
    );
  });

  it('masks API key header value', () => {
    const exchange = createExchange({
      requestHeaders: {
        'X-API-Key': 'abcdefghijklmnopqrstuvwxyz',
        'Content-Type': 'application/json',
      },
    });

    const masked = CredentialMasker.maskExchange(exchange, apikeyAuth);

    expect(masked.request.headers['X-API-Key']).toBe('abcd***wxyz');
    expect(masked.request.headers['Content-Type']).toBe('application/json');
  });

  it('masks API key in URL query parameters', () => {
    const exchange = createExchange({
      url: 'https://example.com/api?X-API-Key=abcdefghijklmnopqrstuvwxyz&format=json',
    });

    const masked = CredentialMasker.maskExchange(exchange, apikeyAuth);

    expect(masked.request.url).toContain('X-API-Key=abcd***wxyz');
    expect(masked.request.url).toContain('format=json');
  });

  it('does not mutate original exchange', () => {
    const exchange = createExchange({
      requestHeaders: {
        Authorization: 'Bearer my-secret-bearer-token-12345',
      },
    });

    const originalAuthValue = exchange.request.headers['Authorization'];
    CredentialMasker.maskExchange(exchange, bearerAuth);

    expect(exchange.request.headers['Authorization']).toBe(originalAuthValue);
  });

  it('leaves non-auth headers untouched', () => {
    const exchange = createExchange({
      requestHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-Id': 'abc-123',
      },
    });

    const masked = CredentialMasker.maskExchange(exchange, noAuth);

    expect(masked.request.headers['Content-Type']).toBe('application/json');
    expect(masked.request.headers['Accept']).toBe('application/json');
    expect(masked.request.headers['X-Request-Id']).toBe('abc-123');
  });

  it('masks password fields in JSON request bodies', () => {
    const body = JSON.stringify({
      username: 'admin',
      password: 'supersecretpassword123',
      data: { token: 'inner-secret-token-value' },
    });

    const exchange = createExchange({ requestBody: body });
    const masked = CredentialMasker.maskExchange(exchange, noAuth);

    const parsedBody = JSON.parse(masked.request.body!);
    expect(parsedBody.username).toBe('admin');
    expect(parsedBody.password).toBe('supe***d123');
    expect(parsedBody.data.token).toBe('inne***alue');
  });
});

// ---------------------------------------------------------------------------
// maskAll
// ---------------------------------------------------------------------------

describe('CredentialMasker.maskAll', () => {
  it('masks all exchanges in the map', () => {
    const exchanges = new Map<string, HttpExchange>();

    exchanges.set(
      'ex-1',
      createExchange({
        id: 'ex-1',
        requestHeaders: { Authorization: 'Bearer token-one-secret-value' },
      }),
    );
    exchanges.set(
      'ex-2',
      createExchange({
        id: 'ex-2',
        requestHeaders: { Authorization: 'Bearer token-two-secret-value' },
      }),
    );

    const masked = CredentialMasker.maskAll(exchanges, bearerAuth);

    expect(masked.size).toBe(2);
    expect(masked.get('ex-1')!.request.headers['Authorization']).toMatch(
      /^Bearer .+\*\*\*.+$/,
    );
    expect(masked.get('ex-2')!.request.headers['Authorization']).toMatch(
      /^Bearer .+\*\*\*.+$/,
    );

    // Originals untouched
    expect(exchanges.get('ex-1')!.request.headers['Authorization']).toBe(
      'Bearer token-one-secret-value',
    );
  });
});
