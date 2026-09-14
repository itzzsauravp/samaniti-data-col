import { EtlPayload } from '../types/domain.js';

export interface ScraperConfig {
  useMocks: boolean;
}

export interface RouteConfig {
  type: string; // e.g., 'profile', 'notices', 'reports', 'projects'
  live: string; // live HTTP URL
  mock: string; // local absolute or relative file path to mock HTML
}

export interface ScrapedPage {
  type: string;
  url: string;
  html: string;
}

export interface IMunicipalityScraper {
  municipalityCode: string;
  routes?: RouteConfig[];
  extract(config: ScraperConfig): Promise<ScrapedPage[]>;
  transform(pages: ScrapedPage[]): EtlPayload;
  load(data: EtlPayload): Promise<void>;
  run(config: ScraperConfig): Promise<void>;
}
