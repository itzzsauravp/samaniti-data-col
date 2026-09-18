import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const HARION_SITE: SiteConfig = {
  code: "HARION",
  municipality: {
    code: "HARION",
    nameNe: "हरिवन नगरपालिका",
    nameEn: "Hariwan Municipality",
    province: "Madhesh",
    district: "Sarlahi",
  },
  baseUrl: "https://harionmun.gov.np",
  stack: "generic",
  mockBaseDir: path.resolve(__dirname, "../madhesh/harion-mun/mock-pages"),
  entities: [
    {
      type: "notice",
      typeLabel: "news_notice",
      listPath: "/category/news-notice/",
      mockFile: "news-notices.html",
      detailMockFile: "news-notice-detail.html",
      detailSelector: "h3 a",
      detailType: "noticeDetail",
      paginated: true,
      pagerSelector: ".pagination a",
selectors: {
        "rows": "div.grid__card",
        "dateField": null,
        "bodyField": "div.detail__page-inner-content",
        "titleFallbacks": [
          { "selector": "h1.news__title" },
          { "selector": "meta[property='og:title']", "attribute": "content" },
          { "selector": "title" }
        ]
      },
    },
  ],
};

export default HARION_SITE;
