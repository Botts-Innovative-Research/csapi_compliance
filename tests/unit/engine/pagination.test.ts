// SCENARIO coverage (WARN-003 traceability sweep 2026-04-17T19:35Z):
//   SCENARIO-ENG-PAGE-001..003 (next-link traversal, termination, cycle guard)

// Tests for pagination traversal — src/engine/pagination.ts
// REQ-ENG-009: Follow `next` links in paginated collections to retrieve all pages
// REQ-ENG-010: Configurable max pages limit and loop detection to prevent infinite traversal

import { describe, it, expect, vi } from 'vitest';
import type { HttpClientInterface, HttpResponse, HttpExchange, CancelToken } from '@/lib/types.js';
import { paginate } from '@/engine/pagination.js';

// --- Mock HTTP Client ---

/** Counter for generating unique exchange IDs. */
let exchangeCounter = 0;

/**
 * Create a mock HttpResponse for a given JSON body.
 */
function createMockResponse(body: Record<string, unknown>, url: string): HttpResponse {
  const bodyString = JSON.stringify(body);
  const exchangeId = `exchange-${++exchangeCounter}`;

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: bodyString,
    responseTimeMs: 10,
    exchange: {
      id: exchangeId,
      request: { method: 'GET', url, headers: {} },
      response: {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: bodyString,
        responseTimeMs: 10,
      },
      metadata: { truncated: false, binaryBody: false, bodySize: bodyString.length },
    } as HttpExchange,
  };
}

/**
 * Create a mock HTTP client that returns predefined responses per URL.
 */
function createMockHttpClient(
  responses: Map<string, Record<string, unknown>>
): HttpClientInterface {
  const mockGet = vi.fn(async (url: string): Promise<HttpResponse> => {
    const body = responses.get(url);
    if (!body) {
      throw new Error(`Unexpected URL in mock: ${url}`);
    }
    return createMockResponse(body, url);
  });

  return {
    get: mockGet,
    request: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClientInterface;
}

/** Standard item extractor for tests — pulls `items` array from body. */
function extractItems(body: Record<string, unknown>): unknown[] {
  const items = body.items;
  return Array.isArray(items) ? items : [];
}

describe('paginate', () => {
  beforeEach(() => {
    exchangeCounter = 0;
  });

  // REQ-ENG-009: Single page with no `next` link returns items from that page
  it('returns items from a single page when there is no next link', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/collections/things/items',
        {
          items: [{ id: 1 }, { id: 2 }],
          links: [{ rel: 'self', href: 'https://example.com/collections/things/items' }],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(
      client,
      'https://example.com/collections/things/items',
      extractItems
    );

    expect(result.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.pagesTraversed).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.exchangeIds).toHaveLength(1);
  });

  // REQ-ENG-009: Multi-page traversal follows `next` links across 3 pages
  it('follows next links across multiple pages', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items?page=1',
        {
          items: [{ id: 1 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=2' }],
        },
      ],
      [
        'https://example.com/items?page=2',
        {
          items: [{ id: 2 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=3' }],
        },
      ],
      [
        'https://example.com/items?page=3',
        {
          items: [{ id: 3 }],
          links: [{ rel: 'self', href: 'https://example.com/items?page=3' }],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items?page=1', extractItems, {
      maxPages: 10,
    });

    expect(result.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(result.pagesTraversed).toBe(3);
    expect(result.truncated).toBe(false);
    expect(result.exchangeIds).toHaveLength(3);
  });

  // REQ-ENG-010: Stops at maxPages limit and reports truncated=true
  it('stops at maxPages limit and sets truncated to true', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items?page=1',
        {
          items: [{ id: 1 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=2' }],
        },
      ],
      [
        'https://example.com/items?page=2',
        {
          items: [{ id: 2 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=3' }],
        },
      ],
      [
        'https://example.com/items?page=3',
        {
          items: [{ id: 3 }],
          links: [],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items?page=1', extractItems, {
      maxPages: 2,
    });

    expect(result.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.pagesTraversed).toBe(2);
    expect(result.truncated).toBe(true);
    expect(result.exchangeIds).toHaveLength(2);
  });

  // REQ-ENG-010: Detects URL loop (page links back to itself) and stops
  it('detects self-referencing URL loop and stops', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items',
        {
          items: [{ id: 1 }],
          links: [{ rel: 'next', href: 'https://example.com/items' }],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items', extractItems, {
      maxPages: 100,
    });

    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.pagesTraversed).toBe(1);
    expect(result.truncated).toBe(false);
  });

  // REQ-ENG-010: Detects URL loop (A -> B -> A cycle) and stops
  it('detects A -> B -> A cycle and stops', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items?page=a',
        {
          items: [{ id: 'a' }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=b' }],
        },
      ],
      [
        'https://example.com/items?page=b',
        {
          items: [{ id: 'b' }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=a' }],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items?page=a', extractItems, {
      maxPages: 100,
    });

    expect(result.items).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(result.pagesTraversed).toBe(2);
    expect(result.truncated).toBe(false);
  });

  // REQ-ENG-009: Handles empty items array on a page
  it('handles pages with empty items arrays', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items?page=1',
        {
          items: [{ id: 1 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=2' }],
        },
      ],
      [
        'https://example.com/items?page=2',
        {
          items: [],
          links: [],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items?page=1', extractItems, {
      maxPages: 10,
    });

    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.pagesTraversed).toBe(2);
    expect(result.truncated).toBe(false);
  });

  // REQ-ENG-009: Resolves relative `next` URLs against current page URL
  it('resolves relative next URLs against the current page URL', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/api/collections/things/items',
        {
          items: [{ id: 1 }],
          links: [{ rel: 'next', href: '?offset=10' }],
        },
      ],
      [
        'https://example.com/api/collections/things/items?offset=10',
        {
          items: [{ id: 2 }],
          links: [{ rel: 'next', href: '/api/collections/things/items?offset=20' }],
        },
      ],
      [
        'https://example.com/api/collections/things/items?offset=20',
        {
          items: [{ id: 3 }],
          links: [],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(
      client,
      'https://example.com/api/collections/things/items',
      extractItems,
      { maxPages: 10 }
    );

    expect(result.items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(result.pagesTraversed).toBe(3);

    // Verify the mock was called with resolved absolute URLs
    expect(client.get).toHaveBeenCalledWith('https://example.com/api/collections/things/items');
    expect(client.get).toHaveBeenCalledWith(
      'https://example.com/api/collections/things/items?offset=10'
    );
    expect(client.get).toHaveBeenCalledWith(
      'https://example.com/api/collections/things/items?offset=20'
    );
  });

  // REQ-ENG-009: Collects exchange IDs from all page requests
  it('collects exchange IDs from all page requests', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items?page=1',
        {
          items: [{ id: 1 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=2' }],
        },
      ],
      [
        'https://example.com/items?page=2',
        {
          items: [{ id: 2 }],
          links: [],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items?page=1', extractItems, {
      maxPages: 10,
    });

    expect(result.exchangeIds).toHaveLength(2);
    expect(result.exchangeIds[0]).toMatch(/^exchange-/);
    expect(result.exchangeIds[1]).toMatch(/^exchange-/);
    // Each exchange ID should be unique
    expect(new Set(result.exchangeIds).size).toBe(2);
  });

  // REQ-ENG-010: Respects cancellation token
  it('respects cancellation token and stops traversal', async () => {
    let callCount = 0;
    const cancelToken: CancelToken = {
      cancelled: false,
      onCancel: vi.fn(),
      cancel() {
        this.cancelled = true;
      },
    };

    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items?page=1',
        {
          items: [{ id: 1 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=2' }],
        },
      ],
      [
        'https://example.com/items?page=2',
        {
          items: [{ id: 2 }],
          links: [{ rel: 'next', href: 'https://example.com/items?page=3' }],
        },
      ],
      [
        'https://example.com/items?page=3',
        {
          items: [{ id: 3 }],
          links: [],
        },
      ],
    ]);

    // Wrap the client to cancel after the first page is fetched
    const innerClient = createMockHttpClient(responses);
    const wrappedGet = vi.fn(async (url: string) => {
      const result = await innerClient.get(url);
      callCount++;
      if (callCount >= 1) {
        cancelToken.cancel();
      }
      return result;
    });

    const client = {
      ...innerClient,
      get: wrappedGet,
    } as unknown as HttpClientInterface;

    const result = await paginate(client, 'https://example.com/items?page=1', extractItems, {
      maxPages: 10,
      cancelToken,
    });

    // Should have fetched only page 1 before cancellation stopped further traversal
    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.pagesTraversed).toBe(1);
    expect(wrappedGet).toHaveBeenCalledTimes(1);
  });

  // REQ-ENG-009: Returns correct pagesTraversed count
  it('returns correct pagesTraversed count', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items',
        {
          items: [],
          links: [],
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items', extractItems);

    expect(result.pagesTraversed).toBe(1);
  });

  // REQ-ENG-009: Handles response with no `links` array gracefully
  it('handles response with no links array gracefully', async () => {
    const responses = new Map<string, Record<string, unknown>>([
      [
        'https://example.com/items',
        {
          items: [{ id: 1 }, { id: 2 }],
          // No `links` property at all
        },
      ],
    ]);

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items', extractItems);

    expect(result.items).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.pagesTraversed).toBe(1);
    expect(result.truncated).toBe(false);
  });

  // REQ-ENG-010: Uses ENGINE_DEFAULTS.paginationMaxPages when no maxPages option is given
  it('defaults to ENGINE_DEFAULTS.paginationMaxPages when maxPages is not specified', async () => {
    // Create more pages than the default max (5)
    const responses = new Map<string, Record<string, unknown>>();
    for (let i = 1; i <= 7; i++) {
      responses.set(`https://example.com/items?page=${i}`, {
        items: [{ id: i }],
        links:
          i < 7
            ? [{ rel: 'next', href: `https://example.com/items?page=${i + 1}` }]
            : [],
      });
    }

    const client = createMockHttpClient(responses);
    const result = await paginate(client, 'https://example.com/items?page=1', extractItems);

    // ENGINE_DEFAULTS.paginationMaxPages is 5
    expect(result.pagesTraversed).toBe(5);
    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(5);
  });
});
