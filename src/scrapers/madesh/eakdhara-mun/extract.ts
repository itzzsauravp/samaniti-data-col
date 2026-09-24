import {
    RouteConfig,
    ScrapedPage,
    ScraperConfig,
} from "../../../core/contracts/scraper.interface.js";
import { crawlRoutes } from "../../../core/scraper/crawler.js";
import { createStandardGovRoutes } from "../../../core/constants/routes.js";

export const BASE_URL = "https://ekdaramun.gov.np";
export const ROUTES: RouteConfig[] = createStandardGovRoutes(BASE_URL, {
    hasNePrefix: false,
});

export async function extract(config?: ScraperConfig): Promise<ScrapedPage[]> {
    return crawlRoutes(ROUTES, config);
}
