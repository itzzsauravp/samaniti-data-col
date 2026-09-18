import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MANARASHISWA_SITE: SiteConfig = {
  code: "MANARASHISWA",
  municipality: {
    code: "MANARASHISWA",
    nameNe: "मनराशिसवा नगरपालिका",
    nameEn: "Manarashiswa Municipality",
    province: "Madhesh",
    district: "Mahottari",
  },
  baseUrl: "https://manarashiswamun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../madhesh/manarashiswa-mun/mock-pages"),
  entities: [
    {
      type: "notice",
      typeLabel: "news_notice",
      listPath: "/news-notices",
      mockFile: "news-notices.html",
      detailMockFile: "news-notice-detail.html",
      detailSelector: ".views-field-title a",
      detailType: "noticeDetail",
      paginated: true,
      maxPages: 40,
      selectors: {
          rows: ".view-display-id-page .views-row",
          titleLink: ".views-field-title a",
          fileLink: ".views-field-field-documents a",
          "bodyField": "div.node div.content",
      },
    },
  ],
};

export default MANARASHISWA_SITE;
