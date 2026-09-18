import fs from 'node:fs/promises';
import * as cheerio from 'cheerio';

/** Default Drupal pager selector (Sainamaina's layout). */
export const DEFAULT_PAGER_SELECTOR =
  'ul.pager li.pager-item a, ul.pager li.pager-last a';

export interface PaginationOptions {
  /** CSS selector matching pager links. Defaults to the Drupal pager. */
  pagerSelector?: string;
  /** Cap on the number of paginated pages returned (unset = all). */
  maxPages?: number;
}

/**
 * Extracts all paginated listing page URLs from an initial listing page.
 *
 * Drupal pager:
 *   <ul class="pager">
 *     <li class="pager-current">1</li>
 *     <li class="pager-item"><a href="/en/budget-program?page=1">2</a></li>
 *     ...
 *   </ul>
 *
 * The pager selector is configurable so WordPress (`nav.page-numbers a`) and
 * custom layouts work too. Returns absolute, deduped URLs for pages 2..N,
 * optionally capped by `maxPages`.
 */
export function extractPaginationUrls(
  html: string,
  baseUrl: string,
  pagerSelector: string = DEFAULT_PAGER_SELECTOR,
  maxPages?: number,
): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  const seen = new Set<string>();

  $(pagerSelector).each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const absolute = href.startsWith('http') ? href : `${baseUrl}${href}`;
    const normalized = absolute.split('#')[0]; // strip fragment

    if (!seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
  });

  return maxPages != null ? urls.slice(0, maxPages) : urls;
}

/**
 * Reads a mock listing file and returns the same mock HTML for every paginated
 * URL that would be crawled in live mode. In mock mode we don't actually hit
 * multiple pages - the single saved mock represents all pages.
 */
export async function getMockPaginatedPages(
  mockFilePath: string,
  baseUrl: string,
  options: PaginationOptions = {},
): Promise<{ url: string; html: string }[]> {
  const html = await fs.readFile(mockFilePath, 'utf-8');
  const paginatedUrls = extractPaginationUrls(
    html,
    baseUrl,
    options.pagerSelector,
    options.maxPages,
  );

  return paginatedUrls.map((url) => ({ url, html }));
}