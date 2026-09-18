import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SHUDDHODHAN_SITE: SiteConfig = {
  code: "SHUDDHODHAN",
  municipality: {
    code: "SHUDDHODHAN",
    nameNe: "शुद्धोदन गाउँपालिका",
    nameEn: "Shuddhodhan Rural Municipality",
    province: "Lumbini",
    district: "Rupandehi",
  },
  baseUrl: "https://shuddhodhanmunrupandehi.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../lumbini/shuddhodhan-mun/mock-pages"),
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

export default SHUDDHODHAN_SITE;
