import { CheerioCrawler, RequestQueue } from "crawlee";
import { RouteConfig, ScrapedPage, ScraperConfig } from "../contracts/scraper.interface.js";
import {
    extractPaginationUrls,
    extractSlugFromUrl,
    scopeHtml,
    extractLinksFromHtml,
} from "../utils/index.js";

/**
 * Generic sequential crawler built on Crawlee's CheerioCrawler.
 *
 * For each route:
 *   1. Fetches Page 1 (the root listing page).
 *   2. If `detailSelector` is set, queues detail-page links instead of pushing
 *      the listing page itself. The detail pages are then scoped + pushed.
 *   3. If `paginated` is true, discovers all subsequent page URLs and processes
 *      each one through the same scoping/detail logic.
 *   4. If `detailSelector` is NOT set, the listing page itself is the content page
 *      and gets pushed directly to the results.
 */
export async function crawlRoutes(
    routes: RouteConfig[],
    _config?: ScraperConfig,
): Promise<ScrapedPage[]> {
    const pages: ScrapedPage[] = [];

    for (const route of routes) {
        const base = route.baseUrl ?? "https://sainamainamun.gov.np";

        // Per-route queue so pages do not bleed between routes
        const queue = await RequestQueue.open(`queue-${route.type}-${Date.now()}`);

        // Seed the queue with the root listing URL
        await queue.addRequest({
            url: route.live,
            userData: { route, isListingPage: true, pageNum: 1 },
        });

        const crawler = new CheerioCrawler({
            requestQueue: queue,
            maxConcurrency: 1,
            maxRequestsPerCrawl: 500,
            navigationTimeoutSecs: 120,
            requestHandlerTimeoutSecs: 120,
            maxRequestRetries: 2,

            async requestHandler({ request, $, body }) {
                const {
                    route: r,
                    isListingPage,
                    pageNum,
                } = request.userData as {
                    route: RouteConfig;
                    isListingPage: boolean;
                    pageNum: number;
                };

                const fullHtml = body.toString();

                // ── LISTING PAGE ──────────────────────────────────────────────────────
                if (isListingPage) {
                    // 1. Discover and enqueue paginated pages (only from Page 1)
                    if (r.paginated && pageNum === 1) {
                        const paginatedUrls = extractPaginationUrls(fullHtml, base);
                        console.log(
                            `[Crawler] Route "${r.type}" (${r.live}): discovered ${paginatedUrls.length} additional page(s).`,
                        );
                        let nextPageNum = 2;
                        for (const url of paginatedUrls) {
                            await queue.addRequest({
                                url,
                                userData: {
                                    route: r,
                                    isListingPage: true,
                                    pageNum: nextPageNum++,
                                },
                            });
                        }
                    }

                    // 2a. If detailSelector is defined → enqueue detail links, skip listing page
                    if (r.detailSelector) {
                        const detailLinks = extractLinksFromHtml(fullHtml, r.detailSelector, base);
                        console.log(
                            `[Crawler] Route "${r.type}" page ${pageNum}: found ${detailLinks.length} detail link(s).`,
                        );
                        for (const url of detailLinks) {
                            await queue.addRequest({
                                url,
                                userData: { route: r, isListingPage: false, pageNum: 0 },
                            });
                        }
                        return; // listing page done — don't push it to pages[]
                    }

                    // 2b. No detailSelector → listing page IS the content page
                    const scopedHtml = r.contentSelector
                        ? scopeHtml(fullHtml, r.contentSelector)
                        : ($("body").html() ?? fullHtml);

                    console.log(
                        `[Crawler] Route "${r.type}" page ${pageNum}: pushing listing page (${request.loadedUrl ?? request.url}).`,
                    );
                    pages.push({
                        url: request.loadedUrl ?? request.url,
                        html: scopedHtml,
                        routeType: r.type,
                        category: extractSlugFromUrl(r.live),
                    });
                    return;
                }

                // ── DETAIL PAGE ───────────────────────────────────────────────────────
                const detailRouteType = r.detailType ?? r.type;
                const targetSelector = r.detailContentSelector ?? r.contentSelector;
                const scopedHtml = targetSelector
                    ? scopeHtml(fullHtml, targetSelector)
                    : ($("body").html() ?? fullHtml);

                console.log(
                    `[Crawler] Route "${r.type}" detail page: pushing (${request.loadedUrl ?? request.url}).`,
                );
                pages.push({
                    url: request.loadedUrl ?? request.url,
                    html: scopedHtml,
                    routeType: detailRouteType,
                    category: extractSlugFromUrl(r.live),
                });
            },

            failedRequestHandler({ request }) {
                console.warn(
                    `[Crawler] Failed to fetch: ${request.url} (${request.errorMessages?.join(", ")})`,
                );
            },
        });

        await crawler.run();
        await queue.drop();
    }

    return pages;
}
