import fs from "node:fs/promises";
import path from "node:path";
import { load as cheerioLoad } from "cheerio";
import { CheerioCrawler } from "crawlee";
import {
  RouteConfig,
  ScrapedPage,
  ScraperConfig,
} from "../contracts/scraper.interface.js";
import {
  extractPaginationUrls,
  getMockPaginatedPages,
} from "../../scrapers/lumbini/sainamaina-mun/utils/paginate.js";

const BASE_URL = "https://sainamainamun.gov.np";

/**
 * Extracts all detail-page hrefs from a listing page HTML string.
 */
function extractDetailLinksFromHtml(html: string, selector: string): string[] {
  const $ = cheerioLoad(html);
  const links: string[] = [];
  $(selector).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const absolute = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    links.push(absolute);
  });
  return links;
}

/**
 * Generic crawler that extracts pages from a configured list of routes.
 * Supports both local mock files and live HTTP crawling via Crawlee.
 * Handles paginated listing pages and detail-page queueing.
 */
export async function crawlRoutes(
  routes: RouteConfig[],
  config: ScraperConfig,
): Promise<ScrapedPage[]> {
  // -------------------------------------------------------------------
  // MOCK MODE
  // -------------------------------------------------------------------
  if (config.useMocks) {
    const pages: ScrapedPage[] = [];

    for (const route of routes) {
      try {
        type ListingPage = { url: string; html: string };
        const listingPages: ListingPage[] = [];

        const firstHtml = await fs.readFile(route.mock, "utf-8");
        listingPages.push({ url: route.live, html: firstHtml });

        if (route.paginated) {
          const base = route.baseUrl ?? BASE_URL;
          const extraPages = await getMockPaginatedPages(route.mock, base);
          listingPages.push(...extraPages);
          console.log(
            `[crawlRoutes (mock)] Paginated route '${route.type}': found ${extraPages.length} extra page(s)`,
          );
        }

        if (route.detailSelector && route.detailMock !== undefined) {
          const detailMockPath =
            route.detailMock !== ""
              ? route.detailMock
              : path.resolve(
                  path.dirname(route.mock),
                  "budget-program-detail.html",
                );
          const detailHtml = await fs.readFile(detailMockPath, "utf-8");
          const detailType = route.detailType ?? `${route.type}Detail`;
          const allDetailUrls = new Set<string>();

          for (const { html } of listingPages) {
            const links = extractDetailLinksFromHtml(
              html,
              route.detailSelector,
            );
            links.forEach((l) => allDetailUrls.add(l));
          }

          console.log(
            `[crawlRoutes (mock)] Route '${route.type}': queued ${allDetailUrls.size} unique detail page(s)`,
          );

          for (const url of allDetailUrls) {
            pages.push({ type: detailType, url, html: detailHtml });
          }
        } else {
          for (const { url, html } of listingPages) {
            pages.push({ type: route.type, url, html });
          }
        }
      } catch (err) {
        console.warn(
          `[crawlRoutes] Could not process mock for route '${route.type}' at: ${route.mock}`,
          err,
        );
      }
    }

    return pages;
  }

  // -------------------------------------------------------------------
  // LIVE MODE
  // -------------------------------------------------------------------
  const pages: ScrapedPage[] = [];

  const crawler = new CheerioCrawler({
    respectRobotsTxtFile: true,
    maxRequestsPerCrawl: 200,
    navigationTimeoutSecs: 120,
    requestHandlerTimeoutSecs: 120,
    maxRequestRetries: 2,

    async requestHandler({ request, body, crawler: crawlerInstance }) {
      const route = request.userData.route as RouteConfig | undefined;
      const type = route?.type ?? "page";
      pages.push({
        type,
        url: request.loadedUrl ?? request.url,
        html: body.toString(),
      });

      if (route?.detailSelector) {
        const links = extractDetailLinksFromHtml(
          body.toString(),
          route.detailSelector,
        );
        for (const link of links) {
          await crawlerInstance.addRequests([
            { url: link, userData: { route } },
          ]);
        }
      }
    },
  });

  const startRequests = routes.map((route) => ({
    url: route.live,
    userData: { route },
  }));

  await crawler.run(startRequests);
  return pages;
}
