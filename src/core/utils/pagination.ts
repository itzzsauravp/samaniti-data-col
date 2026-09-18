import * as cheerio from "cheerio";

/**
 * Extracts all paginated listing page URLs from an initial listing page.
 *
 * Drupal pager:
 *   <ul class="pager">
 *     <li class="pager-current">1</li>
 *     <li class="pager-item"><a href="/en/budget-program?page=1">2</a></li>
 *     ...
 *     <li class="pager-last"><a href="/en/budget-program?page=3">last »</a></li>
 *   </ul>
 *
 * Scopes to the main content pager first (to avoid capturing sidebar blocks),
 * parses max page number if present, and returns absolute URLs for pages 2, 3, ... N.
 *
 * @param html - HTML content of the first listing page
 * @param baseUrl - Base URL of the site (e.g. "https://sainamainamun.gov.np")
 * @returns Array of absolute URLs for pages 2, 3, ... N
 */
export function extractPaginationUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    // Target the primary content pager first to ignore secondary sidebar blocks
    const $pager = $("#block-system-main ul.pager, .region-content ul.pager, ul.pager").first();
    if (!$pager.length) return [];

    let basePath = "";
    let maxPage = 0;

    $pager.find("li a").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const match = href.match(/(.*?)[?&]page=(\d+)/);
        if (match) {
            if (!basePath) basePath = match[1];
            const p = parseInt(match[2], 10);
            if (p > maxPage) maxPage = p;
        }
    });

    if (basePath && maxPage > 0) {
        const urls: string[] = [];
        for (let p = 1; p <= maxPage; p++) {
            urls.push(`${baseUrl}${basePath}?page=${p}`);
        }
        return urls;
    }

    // Fallback: collect all links from pager-item and pager-last
    const urls: string[] = [];
    const seen = new Set<string>();
    $pager.find("li.pager-item a, li.pager-last a").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        const absolute = href.startsWith("http") ? href : `${baseUrl}${href}`;
        const normalized = absolute.split("#")[0];

        if (!seen.has(normalized)) {
            seen.add(normalized);
            urls.push(normalized);
        }
    });

    return urls;
}
