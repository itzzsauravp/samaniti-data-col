import {
    RouteConfig,
    ScrapedPage,
    ScraperConfig,
} from "../../../core/contracts/scraper.interface.js";
import { crawlRoutes } from "../../../core/scraper/crawler.js";
import { createStandardMunicipalityRoutes } from "../../../core/scraper/route-factory.js";

export const BASE_URL = "https://sainamainamun.gov.np";
export const ROUTES: RouteConfig[] = createStandardMunicipalityRoutes({ baseUrl: BASE_URL });

export async function extract(config?: ScraperConfig): Promise<ScrapedPage[]> {
    return crawlRoutes(ROUTES, config);
}
