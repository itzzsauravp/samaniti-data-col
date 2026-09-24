import {
    RouteConfig,
    ScrapedPage,
    ScraperConfig,
} from "../../../core/contracts/scraper.interface.js";
import { crawlRoutes } from "../../../core/scraper/crawler.js";
import { createStandardGovRoutes } from "../../../core/constants/routes.js";

export const BASE_URL = "https://sainamainamun.gov.np";

/**
 * Standard routes for Sainamaina Municipality portal (with /ne prefix).
 * Auto-detects table vs listing detail links on listing pages.
 */
export const ROUTES: RouteConfig[] = createStandardGovRoutes(BASE_URL, {
    hasNePrefix: true,
});

export async function extract(config?: ScraperConfig): Promise<ScrapedPage[]> {
    return crawlRoutes(ROUTES, config);
}
