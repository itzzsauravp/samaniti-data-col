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

        const pages = await this.extract(config);
        console.log(
            `[KanchanScraper] Extracted ${pages.length} page(s). Processing incrementally...`,
        );

        for (const page of pages) {
            try {
                const partialData = await this.transform([page]);
                await this.load(partialData);
            } catch (err) {
                console.error(`[KanchanScraper] Error processing page ${page.url}:`, err);
            }
        }
        console.log(`[KanchanScraper] ETL run completed successfully.`);
    }
}

// Run directly: npm run scraper lumbini:kanchan
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
