import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DHANKAUL_SITE: SiteConfig = {
  code: "DHANKAUL",
  municipality: {
    code: "DHANKAUL",
    nameNe: "धनकौल गाउँपालिका",
    nameEn: "Dhankaul Rural Municipality",
    province: "Madhesh",
    district: "Sarlahi",
  },
  baseUrl: "https://dhankaulmun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../madhesh/dhankaul-mun/mock-pages"),
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
      selectors: {
          "bodyField": "div.node div.content",
      },
    },
  ],
};

export default DHANKAUL_SITE;
