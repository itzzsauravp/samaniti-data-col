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

export class BardaghatScraper implements IMunicipalityScraper {
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
        console.log(`[BardaghatScraper] Starting ETL run for '${this.municipalityCode}'`);

        const pages = await this.extract(config);
        console.log(
            `[BardaghatScraper] Extracted ${pages.length} page(s). Processing incrementally...`,
        );

        for (const page of pages) {
            try {
                const partialData = await this.transform([page]);
                await this.load(partialData);
            } catch (err) {
                console.error(`[BardaghatScraper] Error processing page ${page.url}:`, err);
            }
        }
        console.log(`[BardaghatScraper] ETL run completed successfully.`);
    }
}

// Run directly: npm run scraper lumbini:bardaghat
(async () => {
    const scraper = new BardaghatScraper();
    try {
        await scraper.run();
    } catch (err) {
        console.error("[BardaghatScraper] Fatal error:", err);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();
