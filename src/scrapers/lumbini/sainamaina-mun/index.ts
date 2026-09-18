import "dotenv/config";
import {
  IMunicipalityScraper,
  ScrapedPage,
  ScraperConfig,
} from "../../../core/contracts/scraper.interface.js";
import { EtlPayload } from "../../../core/types/domain.js";
import { extract, ROUTES } from "./extract.js";
import { transform, MUNICIPALITY_CODE } from "./transform.js";
import { load } from "./load.js";
import { prisma } from "../../../core/db/loader.js";
import { exportEtlToTextIfEnabled } from "../../../core/export/index.js";

export class SainamainaScraper implements IMunicipalityScraper {
  public municipalityCode = MUNICIPALITY_CODE;
  public routes = ROUTES;

  async extract(config: ScraperConfig): Promise<ScrapedPage[]> {
    return extract(config);
  }

  async transform(pages: ScrapedPage[]): Promise<EtlPayload> {
    return transform(pages);
  }

  async load(data: EtlPayload): Promise<void> {
    return load(data);
  }

  async run(config: ScraperConfig): Promise<void> {
    console.log(
      `[SainamainaScraper] Starting ETL run for '${this.municipalityCode}' (useMocks: ${config.useMocks})`,
    );

    const pages = await this.extract(config);
    console.log(
      `[SainamainaScraper] Extracted ${pages.length} page(s): ${pages.map((p) => p.type).join(", ")}`,
    );

    const data = await this.transform(pages);
    const total =
      (data.projects?.length ?? 0) +
      (data.reports?.length ?? 0) +
      (data.notices?.length ?? 0);
    console.log(
      `[SainamainaScraper] Transformed → ${total} records (${data.projects?.length ?? 0} projects, ${data.reports?.length ?? 0} reports, ${data.notices?.length ?? 0} notices)`,
    );

    await this.load(data);
    console.log(`[SainamainaScraper] ETL run completed successfully.`);

    const exported = await exportEtlToTextIfEnabled(data);
    for (const file of exported) {
      console.log(
        `[SainamainaScraper] Exported TXT transcript (${file.recordCount} records): ${file.path}`,
      );
    }
  }
}

// Run directly: USE_MOCK=true npm run scraper:sainamaina
(async () => {
  const scraper = new SainamainaScraper();
  try {
    const rawMock = process.env.USE_MOCK?.trim().toLowerCase().replace(/['"]/g, "");
    const useMocks = rawMock === "true" || rawMock === "1";
    await scraper.run({ useMocks });
  } catch (err) {
    console.error("[SainamainaScraper] Fatal error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
