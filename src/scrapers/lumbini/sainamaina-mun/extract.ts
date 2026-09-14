import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RouteConfig, ScrapedPage, ScraperConfig } from '../../../core/contracts/scraper.interface.js';
import { crawlRoutes } from '../../../core/scraper/crawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Route definitions for Sainamaina Municipality portal.
 * Add or modify entries here when the portal gets new sections or URLs change.
 */
export const ROUTES: RouteConfig[] = [
  {
    type: 'profile',
    live: 'https://sainamainamun.gov.np/en/node/5',
    mock: path.resolve(__dirname, 'mock-pages/profile.html'),
  },
  {
    type: 'notices',
    live: 'https://sainamainamun.gov.np/en/notices',
    mock: path.resolve(__dirname, 'mock-pages/publications.html'),
  },
];

export async function extract(config: ScraperConfig): Promise<ScrapedPage[]> {
  return crawlRoutes(ROUTES, config);
}
