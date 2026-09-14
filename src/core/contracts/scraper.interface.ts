import { MunicipalityProfileData, PublicationData } from '../types/domain.js';

export interface ScraperConfig {
  useMocks: boolean;
}

export interface IMunicipalityScraper {
  municipalityCode: string;
  extract(config: ScraperConfig): Promise<{ profileRaw: string; publicationsRaw: string[] }>;
  transform(raw: { profileRaw: string; publicationsRaw: string[] }): { profile: MunicipalityProfileData; publications: PublicationData[] };
  load(data: { profile: MunicipalityProfileData; publications: PublicationData[] }): Promise<void>;
  run(config: ScraperConfig): Promise<void>;
}
