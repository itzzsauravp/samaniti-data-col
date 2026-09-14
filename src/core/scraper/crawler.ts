import fs from 'node:fs/promises';
import { CheerioCrawler } from 'crawlee';
import { RouteConfig, ScrapedPage, ScraperConfig } from '../contracts/scraper.interface.js';

/**
 * Generic crawler that extracts pages from a configured list of routes.
 * Supports both local mock files and live HTTP crawling via Crawlee.
 */
export async function crawlRoutes(
  routes: RouteConfig[],
  config: ScraperConfig,
): Promise<ScrapedPage[]> {
  if (config.useMocks) {
    const pages: ScrapedPage[] = [];
    for (const route of routes) {
      try {
        const html = await fs.readFile(route.mock, 'utf-8');
        pages.push({
          type: route.type,
          url: route.mock,
          html,
        });
      } catch (err) {
        console.warn(`[crawlRoutes] Could not read mock file for route '${route.type}' at: ${route.mock}`, err);
      }
    }
    return pages;
  }

  const pages: ScrapedPage[] = [];

  const crawler = new CheerioCrawler({
    respectRobotsTxtFile: true,
    maxRequestsPerCrawl: routes.length * 5,
    async requestHandler({ request, body }) {
      const html = typeof body === 'string' ? body : body.toString('utf-8');
      pages.push({
        type: request.userData.type || 'unknown',
        url: request.url,
        html,
      });
    },
    failedRequestHandler({ request }, error) {
      console.error(`[crawlRoutes] Request to ${request.url} failed:`, error);
    },
  });

  const crawlRequests = routes.map((route) => ({
    url: route.live,
    userData: { type: route.type },
  }));

  await crawler.run(crawlRequests);
  return pages;
}
