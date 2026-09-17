import { load as cheerioLoad } from "cheerio";
import { CheerioCrawler, RequestQueue } from "crawlee";
import {
  RouteConfig,
  ScrapedPage,
  ScraperConfig,
} from "../contracts/scraper.interface.js";
import { extractPaginationUrls } from "../../scrapers/lumbini/sainamaina-mun/utils/paginate.js";
import { isRecordExisting } from "../db/loader.js";
import { extractSlugFromUrl } from "../utils/url.js";

/**
 * Scopes a full page HTML string down to the inner HTML of the first element
 * matching `selector`. If the selector matches nothing, returns the full body HTML.
 */
function scopeHtml(fullHtml: string, selector: string): string {
  const $ = cheerioLoad(fullHtml);
  const el = $(selector);
  if (!el.length) {
    console.warn(
      `[scopeHtml] Selector "${selector}" matched nothing — falling back to full body.`,
    );
    return $("body").length ? $.html($("body")) : fullHtml;
  }
  return $.html(el) ?? fullHtml;
}

/**
 * Extracts all absolute detail-page hrefs from a full listing page HTML string.
 */
function extractDetailLinksFromHtml(
  html: string,
  selector: string,
  baseUrl: string,
): string[] {
  const $ = cheerioLoad(html);
  const links: string[] = [];
  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const absolute = href.startsWith("http") ? href : `${baseUrl}${href}`;
    links.push(absolute);
  });
  return links;
}

/**
 * Generic sequential crawler built on Crawlee's CheerioCrawler.
 *
 * For each route:
 *   1. Fetches Page 1 (the root listing page).
 *   2. If `contentSelector` is set, scopes the HTML to that element before
 *      passing it to transform — transform only ever sees relevant markup.
 *   3. If `detailSelector` is set, queues detail-page links instead of pushing
 *      the listing page itself. The detail pages are then scoped + pushed.
 *   4. If `paginated` is true, discovers all subsequent page URLs and processes
 *      each one through the same scoping/detail logic.
 */
export async function crawlRoutes(
  routes: RouteConfig[],
  config?: ScraperConfig,
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

          // 2a. If the route has a detail selector → enqueue detail pages; listing page itself is skipped.
          if (r.detailSelector) {
            const detailLinks = extractDetailLinksFromHtml(
              fullHtml,
              r.detailSelector,
              base,
            );
            console.log(
              `[Crawler] Route "${r.type}" page ${pageNum}: found ${detailLinks.length} detail link(s).`,
            );
            for (const url of detailLinks) {
              try {
                if (await isRecordExisting(url)) {
                  console.log(
                    `[Crawler] [Delta Skip] Record exists in DB: ${url}`,
                  );
                  continue;
                }
              } catch {
                // If DB check fails or DB offline, continue crawl
              }

              await queue.addRequest({
                url,
                userData: { route: r, isListingPage: false, pageNum: 0 },
              });
            }
            return; // listing page done — don't push it to pages[]
          }

          // 2b. No detail selector → listing page IS the content page.
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
