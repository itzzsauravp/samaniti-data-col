import { IMunicipalityScraper, ScraperConfig } from '../../../core/contracts/scraper.interface.js';
import { MunicipalityProfileData, PublicationData } from '../../../core/types/domain.js';
import { extract } from './extract.js';
import { transform, MUNICIPALITY_CODE } from './transform.js';
import { load } from './load.js';
import { prisma } from '../../../core/db/loader.js';
import { fileURLToPath } from 'node:url';

export class SainamainaScraper implements IMunicipalityScraper {
  public municipalityCode = MUNICIPALITY_CODE;

  async extract(config: ScraperConfig): Promise<{ profileRaw: string; publicationsRaw: string[] }> {
    return extract(config);
  }

  transform(raw: { profileRaw: string; publicationsRaw: string[] }): {
    profile: MunicipalityProfileData;
    publications: PublicationData[];
  } {
    return transform(raw);
  }

  async load(data: { profile: MunicipalityProfileData; publications: PublicationData[] }): Promise<void> {
    return load(data);
  }

  async run(config: ScraperConfig): Promise<void> {
    console.log(`[SainamainaScraper] Starting ETL run for municipality: ${this.municipalityCode} (useMocks: ${config.useMocks})`);

    console.log('[SainamainaScraper] Extracting raw data...');
    const raw = await this.extract(config);

    console.log('[SainamainaScraper] Transforming raw data...');
    const data = this.transform(raw);

    console.log(`[SainamainaScraper] Loading data into database (Profile + ${data.publications.length} publications)...`);
    await this.load(data);

    console.log('[SainamainaScraper] ETL run completed successfully.');
  }
}

// Executable block when run directly via ts-node
if (process.env.USE_MOCK === 'true' || process.env.RUN_SCRAPER === 'true') {
  (async () => {
    const useMocks = process.env.USE_MOCK !== 'false';
    const scraper = new SainamainaScraper();
    try {
      await scraper.run({ useMocks });
    } catch (error) {
      console.error('[SainamainaScraper] Error during scraper run:', error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}
