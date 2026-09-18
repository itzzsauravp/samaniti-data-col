import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const LAXMINIYA_SITE: SiteConfig = {
  code: "LAXMINIYA",
  municipality: {
    code: "LAXMINIYA",
    nameNe: "लक्ष्मीनिया गाउँपालिका",
    nameEn: "Laxminiya Rural Municipality",
    province: "Madhesh",
    district: "Dhanusha",
  },
  baseUrl: "https://laxminiyamun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../madhesh/laxminiya-mun/mock-pages"),
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
      maxPages: 40,
      selectors: {
          rows: ".region-content .views-row",
          titleLink: ".node h2 a",
          fileLink: ".field-name-field-documents a",
          "bodyField": "div.node div.content",
      },
    },
  ],
};

export default LAXMINIYA_SITE;
