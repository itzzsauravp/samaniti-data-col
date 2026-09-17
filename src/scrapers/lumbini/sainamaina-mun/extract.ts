import {
  RouteConfig,
  ScrapedPage,
  ScraperConfig,
} from "../../../core/contracts/scraper.interface.js";
import { crawlRoutes } from "../../../core/scraper/crawler.js";

export const BASE_URL = "https://sainamainamun.gov.np";

/**
 * Route definitions for Sainamaina Municipality portal.
 *
 * - type: entity group used to dispatch the correct transformer ("report", "project", "notice")
 * - contentSelector: CSS selector for listing pages (e.g. ".view-content")
 * - detailSelector: CSS selector for item links on listing page (e.g. ".views-field-title a").
 *     When provided, crawler enqueues and visits each detail link.
 * - detailContentSelector: CSS selector to scope the HTML on the detail page (e.g. ".node-article, .node-full").
 * - detailType: custom routeType passed to ScrapedPage for transformer dispatch ("projectDetail").
 * - paginated: true enables discovering and crawling all listing pages (Page 1 -> Page N)
 */
export const ROUTES: RouteConfig[] = [
  // {
  //   type: "project",
  //   live: `${BASE_URL}/ne/budget-program`,
  //   baseUrl: BASE_URL,
  //   paginated: true,
  //   contentSelector: ".container",
  //   detailSelector: "h2 a",
  //   detailContentSelector: ".container",
  //   detailType: "projectDetail",
  // },
  // {
  //   type: "project",
  //   live: `${BASE_URL}/ne/budget-program`,
  //   baseUrl: BASE_URL,
  //   paginated: true,
  //   contentSelector: ".region-content, .container",
  //   detailSelector: ".region-content h2 a",
  //   detailContentSelector: ".container",
  //   detailType: "projectDetail",
  // },
  {
    type: "report",
    live: `${BASE_URL}/ne/annual-progress-report`,
    baseUrl: BASE_URL,
    paginated: true,
    contentSelector: ".introduction, .container",
    detailSelector: ".region-content span.field-content a",
    detailContentSelector: ".container",
    detailType: "projectDetail",
  },
];

export async function extract(config?: ScraperConfig): Promise<ScrapedPage[]> {
  return crawlRoutes(ROUTES, config);
}
