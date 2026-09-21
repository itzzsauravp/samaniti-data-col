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

export class SainamainaScraper implements IMunicipalityScraper {
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
        console.log(`[SainamainaScraper] Starting ETL run for '${this.municipalityCode}'`);

        const runId = await startScraperRun(this.municipalityCode, "Lumbini", MUNICIPALITY_METADATA);
        let projectsCount = 0;
        let reportsCount = 0;
        let noticesCount = 0;

        const pages = await this.extract(config);
        console.log(
            `[SainamainaScraper] Extracted ${pages.length} page(s). Processing incrementally...`,
        );

        for (const page of pages) {
            try {
                const partialData = await this.transform([page]);
                await this.load({ ...partialData, runId });

                projectsCount += partialData.projects?.length ?? 0;
                reportsCount += partialData.reports?.length ?? 0;
                noticesCount += partialData.notices?.length ?? 0;
            } catch (err) {
                console.error(`[SainamainaScraper] Error processing page ${page.url}:`, err);
            }
        }
        await finishScraperRun(runId, { projectsCount, reportsCount, noticesCount });
        console.log(`[SainamainaScraper] ETL run completed successfully.`);
    }
}

// Run directly: npm run scraper:sainamaina
import { startScraperRun, finishScraperRun } from "../../../core/db/loader.js";
import { MUNICIPALITY_METADATA } from "./transform.js";
(async () => {
    const scraper = new SainamainaScraper();
    try {
        await scraper.run();
    } catch (err) {
        console.error("[SainamainaScraper] Fatal error:", err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();
