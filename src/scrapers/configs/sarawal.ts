import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SARAWAL_SITE: SiteConfig = {
  code: "SARAWAL",
  municipality: {
    code: "SARAWAL",
    nameNe: "सरावल गाउँपालिका",
    nameEn: "Sarawal Rural Municipality",
    province: "Lumbini",
    district: "Nawalparasi (Bardaghat Susta West)",
  },
  baseUrl: "https://sarawalmun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../lumbini/sarawal-mun/mock-pages"),
  entities: [
    {
      type: "notice",
      typeLabel: "news_notice",
      listPath: "/news-notices",
      mockFile: "news-notices.html",
      detailMockFile: "news-notice-detail.html",
      detailSelector: "li.node-readmore a",
      detailType: "noticeDetail",
      paginated: true,
      maxPages: 30,
      selectors: {
          "bodyField": "div.node div.content",
      },
    },
  ],
};

export default SARAWAL_SITE;
