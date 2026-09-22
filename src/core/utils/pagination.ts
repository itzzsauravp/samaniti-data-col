import * as cheerio from "cheerio";

/**
 * Extracts all paginated listing page URLs from an initial listing page.
 *
 * Supports both:
 * 1. Traditional Drupal pager (`ul.pager li a`)
 * 2. New theme structure (`div.pagination a.pagination__btn`)
 *
 * @param html - HTML content of the first listing page
 * @param baseUrl - Base URL of the site (e.g. "https://banganga.gov.np")
 * @returns Array of absolute URLs for pages 1, 2, ... N
 */
export function extractPaginationUrls(
    html: string,
    baseUrl: string,
    currentUrl?: string,
): string[] {
    const $ = cheerio.load(html);

    // 1. Try legacy/Drupal primary pager first
    let $pager = $(".introduction .container ul.pager, .region-content ul.pager").first();

    // 2. If not found, fall back to the new custom pagination component
    if (!$pager.length) {
        $pager = $(".pagination").first();
    }

    if (!$pager.length) return [];

    const contextUrl = currentUrl || baseUrl;
    let sampleHref = "";
    let maxPage = 0;

    // Target both standard Drupal list links (`li a`) and standalone pagination buttons (`a.pagination__btn` or `a`)
    $pager.find("li a, a").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        // Match URLs with ?page=N or &page=N
        const match = href.match(/[?&]page=(\d+)/);
        if (match) {
            if (!sampleHref) sampleHref = href.trim();
            const p = parseInt(match[1], 10);
            if (p > maxPage) maxPage = p;
        }
    });

    if (maxPage > 1 && sampleHref) {
        const urls: string[] = [];
        // Start from page 2 — page 1 is already seeded as the root listing URL
        for (let p = 2; p <= maxPage; p++) {
            try {
                const u = new URL(sampleHref, contextUrl);
                u.searchParams.set("page", p.toString());
                urls.push(u.href);
            } catch {
                const cleanBase = contextUrl.split("?")[0].replace(/\/$/, "");
                urls.push(`${cleanBase}?page=${p}`);
            }
        }
        return urls;
    }

    // Fallback: Collect all valid pagination anchor links if pattern matching fails.
    // Skip any link that resolves to page=1 since page 1 is the root URL already seeded.
    const urls: string[] = [];
    const seen = new Set<string>();

    $pager.find("li.pager-item a, li.pager-last a, a.pagination__btn, a").each((_, el) => {
        const href = $(el).attr("href");
        if (!href || href === "#" || href.startsWith("javascript:")) return;

        // Trim whitespace/newlines (NEB theme embeds whitespace in href values)
        const trimmed = href.trim();
        if (!trimmed) return;

        // Skip page=1 links — page 1 is always the root listing URL already in the queue
        if (/[?&]page=1(&|$)/.test(trimmed)) return;

        let absolute: string;
        try {
            absolute = new URL(trimmed, contextUrl).href;
        } catch {
            absolute = trimmed.startsWith("http")
                ? trimmed
                : `${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
        }

        const normalized = absolute.split("#")[0];

        if (!seen.has(normalized)) {
            seen.add(normalized);
            urls.push(normalized);
        }
    });

    return urls;
}
