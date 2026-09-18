import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const KANCHAN_SITE: SiteConfig = {
  code: "KANCHAN",
  municipality: {
    code: "KANCHAN",
    nameNe: "कञ्चन गाउँपालिका",
    nameEn: "Kanchan Rural Municipality",
    province: "Lumbini",
    district: "Rupandehi",
  },
  baseUrl: "https://kanchanmun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../lumbini/kanchan-mun/mock-pages"),
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
        rows: ".region-content .views-row",
        titleLink: ".node h2 a",
        fileLink: ".field-name-field-documents a",
      },
    },
  ],
};

export default KANCHAN_SITE;
