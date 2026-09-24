import path from "node:path";
import { CheerioCrawler, Configuration, RequestQueue } from "crawlee";
import { RouteConfig, ScrapedPage, ScraperConfig } from "../contracts/scraper.interface.js";
import {
    extractPaginationUrls,
    extractSlugFromUrl,
    scopeHtml,
    extractDetailLinksFromListing,
} from "../utils/index.js";

/**
 * Universal Detail-First Crawler built on Crawlee's CheerioCrawler.
 *
 * For each route:
 *   1. Fetches Page 1 (listing URL).
 *   2. Automatically detects detail links from either Tabular layout (table tbody tr)
 *      or Listing layout (.views-row, cards), or uses explicit route.detailSelector if defined.
 *   3. Enqueues all discovered detail URLs.
 *   4. Discovers paginated listing pages (Page 2..N) if paginated=true, repeating link discovery.
 *   5. Visits every detail page, scopes HTML by detailContentSelector/contentSelector,
 *      and pushes ONLY detail pages to the resulting ScrapedPage array.
 */
export async function crawlRoutes(
    routes: RouteConfig[],
    config?: ScraperConfig,
): Promise<ScrapedPage[]> {
    const pages: ScrapedPage[] = [];

    // Optional route filtering for rapid single-route testing
    const routeFilter = config?.filterRoute || process.env.FILTER_ROUTE;
    const activeRoutes = routeFilter
        ? routes.filter(
              (r) =>
                  r.live.toLowerCase().includes(routeFilter.toLowerCase()) ||
                  r.type.toLowerCase().includes(routeFilter.toLowerCase()),
          )
        : routes;

    if (routeFilter) {
        console.log(
            `[Crawler] Route filter active: "${routeFilter}". Matched ${activeRoutes.length}/${routes.length} route(s).`,
        );
    }

    // Isolate Crawlee storage directory per process/run to avoid queue lock collisions in parallel
    const storageDir =
        process.env.CRAWLEE_STORAGE_DIR ||
        path.resolve(`./storage/tmp/crawlee-${process.pid}-${Date.now()}`);

    process.env.CRAWLEE_STORAGE_DIR = storageDir;
    const crawleeConfig = new Configuration({
        storageClientOptions: { storageDir },
        purgeOnStart: true,
    });

    for (const route of activeRoutes) {
        const base = route.baseUrl ?? new URL(route.live).origin;
        const queueName = `queue-${route.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const queue = await RequestQueue.open(queueName, { config: crawleeConfig });

        // Seed with root listing URL
        await queue.addRequest({
            url: route.live,
            userData: { route, isListingPage: true, pageNum: 1 },
        });

        // Polite pause between routes
        await new Promise((resolve) => setTimeout(resolve, 600));

        const crawler = new CheerioCrawler(
            {
                requestQueue: queue,
                maxConcurrency: 1,
                maxRequestsPerCrawl: 500,
                navigationTimeoutSecs: 120,
                requestHandlerTimeoutSecs: 120,
                maxRequestRetries: 3,
                preNavigationHooks: [
                    async () => {
                        // Jittered polite throttle (600ms - 1000ms) to respect target municipal servers
                        const delay = 600 + Math.floor(Math.random() * 400);
                        await new Promise((resolve) => setTimeout(resolve, delay));
                    },
                ],

                async requestHandler({ request, response, $, body }) {
                    const {
                        route: r,
                        isListingPage,
                        pageNum,
                    } = request.userData as {
                        route: RouteConfig;
                        isListingPage: boolean;
                        pageNum: number;
                    };

                    // Guard against HTTP error pages (404, 429, 500 etc.)
                    if (response?.statusCode && response.statusCode >= 400) {
                        console.warn(
                            `[Crawler] Skipping error page (${response.statusCode}): ${request.url}`,
                        );
                        return;
                    }

                    const fullHtml = body.toString();

                    // ── LISTING PAGE: LINK DISCOVERY ONLY ─────────────────────────────
                    if (isListingPage) {
                        // 1. Discover pagination URLs on Page 1
                        if (r.paginated && pageNum === 1) {
                            const currentListingUrl = request.loadedUrl ?? request.url;
                            const paginatedUrls = extractPaginationUrls(
                                fullHtml,
                                base,
                                currentListingUrl,
                            );
                            if (paginatedUrls.length > 0) {
                                console.log(
                                    `[Crawler] Route "${r.type}" (${r.live}): discovered ${paginatedUrls.length} pagination page(s).`,
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
                        }

                        // 2. Discover detail URLs (auto-detecting Table vs. Listing format)
                        const listingScope = r.contentSelector
                            ? scopeHtml(fullHtml, r.contentSelector)
                            : fullHtml;

                        const detailLinks = extractDetailLinksFromListing(
                            listingScope,
                            base,
                            r.detailSelector,
                        );

                        console.log(
                            `[Crawler] Route "${r.type}" page ${pageNum}: discovered ${detailLinks.length} detail link(s).`,
                        );

                        for (const url of detailLinks) {
                            await queue.addRequest({
                                url,
                                userData: { route: r, isListingPage: false, pageNum: 0 },
                            });
                        }

                        // Never push listing page to results — detail-first only!
                        return;
                    }

                    // ── DETAIL PAGE: COLLECT CONTENT ──────────────────────────────────
                    const detailRouteType = r.detailType ?? r.type;
                    const targetSelector = r.detailContentSelector ?? r.contentSelector;
                    const scopedHtml = targetSelector
                        ? scopeHtml(fullHtml, targetSelector)
                        : ($("body").html() ?? fullHtml);

                    console.log(
                        `[Crawler] Route "${r.type}" detail: pushing (${request.loadedUrl ?? request.url}).`,
                    );

                    pages.push({
                        url: request.loadedUrl ?? request.url,
                        html: scopedHtml,
                        routeType: detailRouteType,
                        category: extractSlugFromUrl(r.live),
                        isDetailPage: true,
                    });
                },

                failedRequestHandler({ request }) {
                    console.warn(
                        `[Crawler] Failed to fetch after retries: ${request.url} (${request.errorMessages?.join(", ")})`,
                    );
                },
            },
            crawleeConfig,
        );

        await crawler.run();
        try {
            await queue.drop();
        } catch {
            // Queue drop cleanup failure is non-fatal
        }
    }

    return pages;
}
