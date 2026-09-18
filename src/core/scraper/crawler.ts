import fs from "node:fs/promises";
import path from "node:path";
import { load as cheerioLoad } from "cheerio";
import { CheerioCrawler, Configuration } from "crawlee";
import {
  RouteConfig,
  ScrapedPage,
  ScraperConfig,
} from "../contracts/scraper.interface.js";
import {
  extractPaginationUrls,
  getMockPaginatedPages,
} from "../../scrapers/lumbini/sainamaina-mun/utils/paginate.js";
import { extractSlugFromUrl, filterUrls, hostOfBase } from "../utils/index.js";

const BASE_URL = "https://sainamainamun.gov.np";

/** Absolute per-site crawlee storage directory (keeps site queues isolated). */
function crawleeStorageDir(siteCode?: string): string | null {
  if (!siteCode) return null;
  return path.join(process.cwd(), "storage", "crawlee", siteCode.toLowerCase());
}

/**
 * Extracts all detail-page hrefs from a listing page HTML string.
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
 * Generic crawler that extracts pages from a configured list of routes.
 * Supports both local mock files and live HTTP crawling via Crawlee.
 * Handles URL filtering, paginated listing pages and detail-page queueing.
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
        const subFolder = route.subFolder || extractSlugFromUrl(route.live);
        const base = route.baseUrl ?? BASE_URL;
        const defaultDomain = hostOfBase(base);

        const firstHtml = await fs.readFile(route.mock, "utf-8");
        listingPages.push({ url: route.live, html: firstHtml });

        if (route.paginated) {
          const extraPages = await getMockPaginatedPages(route.mock, base, {
            pagerSelector: route.pagerSelector,
            maxPages: route.maxPages,
          });
          for (const p of extraPages) {
            if (filterUrls([p.url], route.urlFilters, defaultDomain).length) {
              listingPages.push(p);
            }
          }
          console.log(
            `[crawlRoutes (mock)] Paginated route '${route.type}' (${subFolder}): ${listingPages.length} page(s)`,
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

          const links: string[] = [];
          for (const { html } of listingPages) {
            links.push(
              ...extractDetailLinksFromHtml(html, route.detailSelector, base),
            );
          }
          const allowedDetailUrls = filterUrls(
            links,
            route.urlFilters,
            defaultDomain,
          );

          console.log(
            `[crawlRoutes (mock)] Route '${route.type}' (${subFolder}): queued ${allowedDetailUrls.length} unique detail page(s)`,
          );

          for (const url of allowedDetailUrls) {
            pages.push({
              type: detailType,
              url,
              html: detailHtml,
              subFolder,
            });
          }
        } else {
          for (const { url, html } of listingPages) {
            pages.push({
              type: route.type,
              url,
              html,
              subFolder,
            });
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
  const storageDir = crawleeStorageDir(
    routes.find((r) => r.siteCode)?.siteCode,
  );

  const crawler = new CheerioCrawler(
    {
      respectRobotsTxtFile: true,
      maxRequestsPerCrawl: 200,
      navigationTimeoutSecs: 120,
      requestHandlerTimeoutSecs: 120,
      maxRequestRetries: 2,

    async requestHandler({ request, body, crawler: crawlerInstance }) {
      const route = request.userData.route as RouteConfig | undefined;
      const type = route?.type ?? "page";
      const subFolder =
        route?.subFolder ||
        (route?.live ? extractSlugFromUrl(route.live) : undefined);
      const base = route?.baseUrl ?? BASE_URL;
      const defaultDomain = hostOfBase(base);

      pages.push({
        type,
        url: request.loadedUrl ?? request.url,
        html: body.toString(),
        subFolder,
      });

      // Follow pagination for listing pages (filtered + capped).
      if (route?.paginated) {
        const pagerUrls = extractPaginationUrls(
          body.toString(),
          base,
          route.pagerSelector,
          route.maxPages,
        );
        const allowed = filterUrls(pagerUrls, route.urlFilters, defaultDomain);
        if (allowed.length > 0) {
          await crawlerInstance.addRequests(
            allowed.map((url) => ({ url, userData: { route } })),
          );
        }
      }

      // Queue detail pages found on this listing page (filtered).
      if (route?.detailSelector && route.detailType) {
        const links = extractDetailLinksFromHtml(
          body.toString(),
          route.detailSelector,
          base,
        );
        const allowed = filterUrls(links, route.urlFilters, defaultDomain);
        if (allowed.length > 0) {
          await crawlerInstance.addRequests(
            allowed.map((url) => ({ url, userData: { route } })),
          );
        }
      }
    },
    },
    storageDir
      ? new Configuration({
          storageClientOptions: { localDataDirectory: storageDir },
        })
      : undefined,
  );

  const startRequests = routes.map((route) => ({
    url: route.live,
    userData: { route },
  }));

  await crawler.run(startRequests);
  return pages;
}