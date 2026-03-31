// Pagination traversal for OGC API paginated collection endpoints.
// REQ-ENG-009: Follow `next` links in paginated collections to retrieve all pages
// REQ-ENG-010: Configurable max pages limit and loop detection to prevent infinite traversal

import { ENGINE_DEFAULTS } from '@/lib/constants.js';
import type { HttpClientInterface, CancelToken, LinkObject } from '@/lib/types.js';

export interface PaginationOptions {
  /** Maximum number of pages to traverse. Default from ENGINE_DEFAULTS. */
  maxPages?: number;
  /** Cancel token for cooperative cancellation. */
  cancelToken?: CancelToken;
}

export interface PaginatedResult<T = unknown> {
  /** All items collected across all pages. */
  items: T[];
  /** Number of pages traversed. */
  pagesTraversed: number;
  /** Whether max pages was reached before exhausting results. */
  truncated: boolean;
  /** All exchange IDs from paginated requests. */
  exchangeIds: string[];
}

/**
 * Find the `next` link relation in a response body's `links` array.
 * Returns the href string or undefined if not found.
 */
function findNextLink(body: Record<string, unknown>): string | undefined {
  const links = body.links;
  if (!Array.isArray(links)) return undefined;

  const nextLink = (links as LinkObject[]).find(
    (link) => link.rel === 'next' && typeof link.href === 'string' && link.href.length > 0
  );
  return nextLink?.href;
}

/**
 * Resolve a potentially relative URL against a base URL.
 * If the href is already absolute, returns it as-is.
 */
function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    // If URL resolution fails, return the href unchanged
    return href;
  }
}

/**
 * Traverse a paginated OGC API collection endpoint.
 * Follows `next` link relations until exhausted or maxPages reached.
 * Detects URL loops (same URL visited twice).
 *
 * REQ-ENG-009, REQ-ENG-010
 *
 * @param httpClient - HTTP client for making requests
 * @param initialUrl - URL of the first page
 * @param extractItems - Function to extract items from a page response body
 * @param options - Pagination options
 */
export async function paginate<T = unknown>(
  httpClient: HttpClientInterface,
  initialUrl: string,
  extractItems: (body: Record<string, unknown>) => T[],
  options?: PaginationOptions
): Promise<PaginatedResult<T>> {
  const maxPages = options?.maxPages ?? ENGINE_DEFAULTS.paginationMaxPages;
  const cancelToken = options?.cancelToken;

  const items: T[] = [];
  const exchangeIds: string[] = [];
  const visitedUrls = new Set<string>();

  let currentUrl: string | undefined = initialUrl;
  let pagesTraversed = 0;
  let truncated = false;

  while (currentUrl != null) {
    // REQ-ENG-010: Check max pages limit
    if (pagesTraversed >= maxPages) {
      truncated = true;
      break;
    }

    // Cooperative cancellation check
    if (cancelToken?.cancelled) {
      break;
    }

    // REQ-ENG-010: Loop detection — stop if we've visited this URL before
    if (visitedUrls.has(currentUrl)) {
      break;
    }
    visitedUrls.add(currentUrl);

    // Fetch the current page
    const response = await httpClient.get(currentUrl);
    exchangeIds.push(response.exchange.id);
    pagesTraversed++;

    // Parse the response body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(response.body) as Record<string, unknown>;
    } catch {
      // If the body isn't valid JSON, stop traversal
      break;
    }

    // Extract items from this page
    const pageItems = extractItems(body);
    items.push(...pageItems);

    // REQ-ENG-009: Find the `next` link to continue traversal
    const nextHref = findNextLink(body);
    if (nextHref == null) {
      // No next link — we've reached the last page
      currentUrl = undefined;
    } else {
      // Resolve relative URLs against the current page URL
      currentUrl = resolveUrl(nextHref, currentUrl);
    }
  }

  return {
    items,
    pagesTraversed,
    truncated,
    exchangeIds,
  };
}
