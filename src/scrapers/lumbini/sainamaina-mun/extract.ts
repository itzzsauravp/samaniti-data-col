import {
  RouteConfig,
  ScrapedPage,
  ScraperConfig,
} from "../../../core/contracts/scraper.interface.js";
import { crawlRoutes } from "../../../core/scraper/crawler.js";
import { SAINAMAINA_SITE } from "../../configs/sainamaina.js";
import { buildRoutesFromSite } from "../../core/routes.js";

export const BASE_URL = SAINAMAINA_SITE.baseUrl;

/**
 * Crawler routes derived from the Sainamaina site config. Route definitions
 * (listings, pagination, detail selectors, mock files) now live in
 * src/scrapers/configs/sainamaina.ts.
 */
export const ROUTES: RouteConfig[] = buildRoutesFromSite(SAINAMAINA_SITE);

export async function extract(config: ScraperConfig): Promise<ScrapedPage[]> {
  return crawlRoutes(ROUTES, config);
}