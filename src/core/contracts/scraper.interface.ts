import { EtlPayload } from "../types/domain.js";

export interface ScraperConfig {
  useMocks: boolean;
}

export interface RouteConfig {
  type: string; // e.g., 'profile', 'notices', 'reports', 'projects'
  live: string; // live HTTP URL (first/listing page)
  mock: string; // local absolute path to mock listing HTML
  detailMock?: string; // local path to mock detail page HTML
  detailSelector?: string; // CSS selector for detail "Read more" links on listing pages
  detailType?: string; // scraped page type name for queued detail pages
  paginated?: boolean; // true = follow ul.pager links to crawl all listing pages
  baseUrl?: string; // required when paginated=true (e.g. "https://sainamainamun.gov.np")
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
  transform(pages: ScrapedPage[]): Promise<EtlPayload> | EtlPayload;
  load(data: EtlPayload): Promise<void>;
  run(config: ScraperConfig): Promise<void>;
}
