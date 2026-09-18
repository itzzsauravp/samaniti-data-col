import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BARDAGHAT_SITE: SiteConfig = {
  code: "BARDAGHAT",
  municipality: {
    code: "BARDAGHAT",
    nameNe: "बर्दघाट नगरपालिका",
    nameEn: "Bardaghat Municipality",
    province: "Lumbini",
    district: "Nawalparasi (Bardaghat Susta West)",
  },
  baseUrl: "https://bardaghatmun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../lumbini/bardaghat-mun/mock-pages"),
  entities: [
    {
      type: "notice",
      typeLabel: "news_notice",
      listPath: "/news-notices",
      mockFile: "news-notices.html",
      detailMockFile: "news-notice-detail.html",
      detailSelector: "table.views-table tbody tr td.views-field-title a",
      detailType: "noticeDetail",
      paginated: true,
      maxPages: 40,
      selectors: {
          "rows": "table.views-table tbody tr",
          "dateField": null,
          "fileLink": "td.views-field-field-supporting-documents a",
          "bodyField": "div.node div.content",
      },
    },
  ],
};

export default BARDAGHAT_SITE;
