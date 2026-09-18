import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sainamaina Municipality (Lumbini, Rupandehi) - Drupal 7 portal.
 * Mock HTML files live in the legacy per-scraper mock-pages folder.
 */
export const SAINAMAINA_SITE: SiteConfig = {
  code: "SAINAMAINA",
  municipality: {
    code: "SAINAMAINA",
    nameNe: "सैनामैना नगरपालिका",
    nameEn: "Sainamaina Municipality",
    province: "Lumbini",
    district: "Rupandehi",
  },
  baseUrl: "https://sainamainamun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../lumbini/sainamaina-mun/mock-pages"),
  entities: [
    {
      type: "notice",
      typeLabel: "news_notice",
      listPath: "/en/news-notice",
      mockFile: "news-notice.html",
      detailMockFile: "new-notice-detail.html",
      detailSelector: "li.node-readmore a",
      detailType: "noticeDetail",
      paginated: true,
    },
  ],
};

export default SAINAMAINA_SITE;