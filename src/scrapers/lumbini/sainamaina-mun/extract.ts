import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RouteConfig,
  ScrapedPage,
  ScraperConfig,
} from "../../../core/contracts/scraper.interface.js";
import { crawlRoutes } from "../../../core/scraper/crawler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_URL = "https://sainamainamun.gov.np";

/**
 * Route definitions for Sainamaina Municipality portal.
 * Add or modify entries here when the portal gets new sections or URLs change.
 *
 * - type: entity group ("report", "project", "notice")
 * - subFolder: optional storage subfolder. If omitted, automatically derived from URL slug!
 */
export const ROUTES: RouteConfig[] = [
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/annual-progress-report`,
  //   mock: path.resolve(__dirname, "mock-pages/annual-progress-report.html"),
  // },
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/trimester-progress-report`,
  //   mock: path.resolve(__dirname, "mock-pages/annual-progress-report.html"), // reusing for now
  // },
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/audit-report`,
  //   mock: path.resolve(__dirname, "mock-pages/annual-progress-report.html"), // reusing for now
  // },
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/monitoring-report`,
  //   mock: path.resolve(__dirname, "mock-pages/annual-progress-report.html"), // reusing for now
  // },
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/public-hearing`,
  //   mock: path.resolve(__dirname, "mock-pages/annual-progress-report.html"), // reusing for now
  // },
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/public-audit`,
  //   mock: path.resolve(__dirname, "mock-pages/annual-progress-report.html"), // reusing for now
  // },
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/social-audit`,
  //   mock: path.resolve(__dirname, "mock-pages/annual-progress-report.html"), // reusing for now
  // },
  // {
  //   type: "report",
  //   live: `${BASE_URL}/en/publications`,
  //   mock: path.resolve(__dirname, "mock-pages/publications.html"),
  // },
  // {
  //   type: "project",
  //   live: `${BASE_URL}/en/budget-program`,
  //   mock: path.resolve(__dirname, "mock-pages/budget-program.html"),
  //   detailMock: path.resolve(
  //     __dirname,
  //     "mock-pages/budget-program-detail.html",
  //   ),
  //   detailSelector: "li.node-readmore a",
  //   detailType: "budgetProgramDetail",
  //   paginated: true,
  //   baseUrl: BASE_URL,
  // },
  // {
  //   type: "project",
  //   live: `${BASE_URL}/en/plan-project`,
  //   mock: path.resolve(__dirname, "mock-pages/budget-program.html"), // reusing
  //   detailMock: path.resolve(
  //     __dirname,
  //     "mock-pages/budget-program-detail.html",
  //   ), // reusing
  //   detailSelector: "li.node-readmore a",
  //   detailType: "planProjectDetail",
  //   paginated: true,
  //   baseUrl: BASE_URL,
  // },
  {
    type: "notice",
    live: `${BASE_URL}/en/news-notice`,
    mock: path.resolve(__dirname, "mock-pages/news-notice.html"),
    detailMock: path.resolve(__dirname, "mock-pages/new-notice-detail.html"),
    detailSelector: "li.node-readmore a",
    detailType: "noticeDetail",
    paginated: true,
    baseUrl: BASE_URL,
  },
  // {
  //   type: "notice",
  //   live: `${BASE_URL}/en/public-procurement-tender-notices`,
  //   mock: path.resolve(__dirname, "mock-pages/news-notice.html"), // reusing
  //   detailMock: "",
  //   detailSelector: "li.node-readmore a",
  //   detailType: "noticeDetail",
  //   paginated: true,
  //   baseUrl: BASE_URL,
  // },
  // {
  //   type: "notice",
  //   live: `${BASE_URL}/en/act-law-directives`,
  //   mock: path.resolve(__dirname, "mock-pages/act-law-directives.html"),
  //   detailMock: path.resolve(__dirname, "mock-pages/decisions-details.html"), // reusing
  //   detailSelector: "li.node-readmore a",
  //   detailType: "noticeDetail",
  //   paginated: true,
  //   baseUrl: BASE_URL,
  // },
  // {
  //   type: "notice",
  //   live: `${BASE_URL}/en/tax-and-fees`,
  //   mock: path.resolve(__dirname, "mock-pages/tax-fees.html"),
  //   detailMock: "",
  //   detailSelector: "li.node-readmore a",
  //   detailType: "noticeDetail",
  //   paginated: true,
  //   baseUrl: BASE_URL,
  // },
  // {
  //   type: "notice",
  //   live: `${BASE_URL}/en/decisions`,
  //   mock: path.resolve(__dirname, "mock-pages/decisions.html"),
  //   detailMock: path.resolve(__dirname, "mock-pages/decisions-details.html"),
  //   detailSelector: "li.node-readmore a",
  //   detailType: "noticeDetail",
  //   paginated: true,
  //   baseUrl: BASE_URL,
  // },
];

export async function extract(config: ScraperConfig): Promise<ScrapedPage[]> {
  return crawlRoutes(ROUTES, config);
}
