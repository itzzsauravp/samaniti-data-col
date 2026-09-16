import fs from 'node:fs/promises';
import * as cheerio from 'cheerio';

/**
 * Extracts all paginated listing page URLs from an initial listing page.
 *
 * Sainamaina municipality pages use a standard Drupal pager:
 *   <ul class="pager">
 *     <li class="pager-current">1</li>
 *     <li class="pager-item"><a href="/en/budget-program?page=1">2</a></li>
 *     ...
 *     <li class="pager-last"><a href="/en/budget-program?page=3">last »</a></li>
 *   </ul>
 *
 * This utility reads the first page HTML (live URL or mock file), finds all
 * pager links (excluding the current page), and returns absolute URLs for all
 * subsequent pages so they can be enqueued for crawling.
 *
 * @param html - HTML content of the first listing page
 * @param baseUrl - Base URL of the site (e.g. "https://sainamainamun.gov.np")
 * @returns Array of absolute URLs for pages 2, 3, ... N
 */
export function extractPaginationUrls(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const urls: string[] = [];
  const seen = new Set<string>();

  $('ul.pager li.pager-item a, ul.pager li.pager-last a').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    const absolute = href.startsWith('http') ? href : `${baseUrl}${href}`;
    const normalized = absolute.split('#')[0]; // strip fragment

    if (!seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
  });

  return urls;
}

/**
 * Reads a mock listing file and returns the same mock HTML for every paginated
 * URL that would be crawled in live mode. In mock mode we don't actually hit
 * multiple pages – we treat the single saved mock as representative of all pages.
 *
 * @param mockFilePath - Absolute path to the saved listing mock HTML file
 * @param baseUrl - Base URL of the site
 * @returns Array of { url, html } tuples (one per paginated page found in pager)
 */
export async function getMockPaginatedPages(
  mockFilePath: string,
  baseUrl: string,
): Promise<{ url: string; html: string }[]> {
  const html = await fs.readFile(mockFilePath, 'utf-8');
  const paginatedUrls = extractPaginationUrls(html, baseUrl);

  // In mock mode: serve the same HTML for every page (no real network requests)
  return paginatedUrls.map((url) => ({ url, html }));
}
