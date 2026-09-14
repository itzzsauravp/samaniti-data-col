import { IMunicipalityScraper, ScrapedPage, ScraperConfig } from '../../../core/contracts/scraper.interface.js';
import { EtlPayload } from '../../../core/types/domain.js';
import { extract, ROUTES } from './extract.js';
import { transform, MUNICIPALITY_CODE } from './transform.js';
import { load } from './load.js';
import { prisma } from '../../../core/db/loader.js';

export class SainamainaScraper implements IMunicipalityScraper {
  public municipalityCode = MUNICIPALITY_CODE;
  public routes = ROUTES;

  async extract(config: ScraperConfig): Promise<ScrapedPage[]> {
    return extract(config);
  }

  transform(pages: ScrapedPage[]): EtlPayload {
    return transform(pages);
  }

  async load(data: EtlPayload): Promise<void> {
    return load(data);
  }

  async run(config: ScraperConfig): Promise<void> {
    console.log(`[SainamainaScraper] Starting ETL run for '${this.municipalityCode}' (useMocks: ${config.useMocks})`);

    const pages = await this.extract(config);
    console.log(`[SainamainaScraper] Extracted ${pages.length} page(s): ${pages.map((p) => p.type).join(', ')}`);

    const data = this.transform(pages);
    const total = (data.projects?.length ?? 0) + (data.reports?.length ?? 0) + (data.notices?.length ?? 0);
    console.log(`[SainamainaScraper] Transformed → ${total} records (${data.projects?.length ?? 0} projects, ${data.reports?.length ?? 0} reports, ${data.notices?.length ?? 0} notices)`);

    await this.load(data);
    console.log(`[SainamainaScraper] ETL run completed successfully.`);
  }
}

// Run directly: USE_MOCK=true npm run scraper:sainamaina
if (process.env.USE_MOCK === 'true' || process.env.RUN_SCRAPER === 'true') {
  (async () => {
    const scraper = new SainamainaScraper();
    try {
      await scraper.run({ useMocks: process.env.USE_MOCK !== 'false' });
    } catch (err) {
      console.error('[SainamainaScraper] Fatal error:', err);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
