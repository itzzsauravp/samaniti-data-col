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

export class KanchanScraper implements IMunicipalityScraper {
    public municipalityCode = MUNICIPALITY_CODE;
    public routes = ROUTES;

    async extract(config?: ScraperConfig): Promise<ScrapedPage[]> {
        return extract(config);
    }

    async transform(pages: ScrapedPage[]): Promise<EtlPayload> {
        return transform(pages);
    }

    async load(data: EtlPayload): Promise<void> {
        return load(data);
    }

    async run(config?: ScraperConfig): Promise<void> {
        console.log(`[KanchanScraper] Starting ETL run for '${this.municipalityCode}'`);

        const runId = await startScraperRun(this.municipalityCode, "Lumbini", MUNICIPALITY_METADATA);
        let projectsCount = 0;
        let reportsCount = 0;
        let noticesCount = 0;

        const pages = await this.extract(config);
        console.log(
            `[KanchanScraper] Extracted ${pages.length} page(s). Processing incrementally...`,
        );

        for (const page of pages) {
            try {
                const partialData = await this.transform([page]);
                await this.load({ ...partialData, runId });

                projectsCount += partialData.projects?.length ?? 0;
                reportsCount += partialData.reports?.length ?? 0;
                noticesCount += partialData.notices?.length ?? 0;
            } catch (err) {
                console.error(`[KanchanScraper] Error processing page ${page.url}:`, err);
            }
        }
        await finishScraperRun(runId, { projectsCount, reportsCount, noticesCount });
        console.log(`[KanchanScraper] ETL run completed successfully.`);
    }
}

// Run directly: npm run scraper:kanchan
import { startScraperRun, finishScraperRun } from "../../../core/db/loader.js";
import { MUNICIPALITY_METADATA } from "./transform.js";
(async () => {
    const scraper = new KanchanScraper();
    try {
        await scraper.run();
    } catch (err) {
        console.error("[KanchanScraper] Fatal error:", err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();
