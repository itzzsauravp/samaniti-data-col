import path from "node:path";
import { fileURLToPath } from "node:url";
import { SiteConfig } from "../../core/contracts/site-config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const KSHIRESHWORNATH_SITE: SiteConfig = {
  code: "KSHIRESHWORNATH",
  municipality: {
    code: "KSHIRESHWORNATH",
    nameNe: "क्षिरेश्वरनाथ नगरपालिका",
    nameEn: "Kshireshwor Nath Municipality",
    province: "Madhesh",
    district: "Dhanusha",
  },
  baseUrl: "https://kshireshwornathmun.gov.np",
  stack: "drupal7",
  mockBaseDir: path.resolve(__dirname, "../madhesh/kshireshwornath-mun/mock-pages"),
  entities: [
    {
      type: "notice",
      typeLabel: "news_notice",
      listPath: "/ne/news-notices",
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

export default KSHIRESHWORNATH_SITE;
