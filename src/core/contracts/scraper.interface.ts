import { EtlPayload } from "../types/domain.js";
import { UrlFilterConfig } from "../utils/url-filter.js";

export interface ScraperConfig {
  useMocks: boolean;
}

export interface RouteConfig {
  type: string; // e.g., "profile", "notices", "reports", "projects"
  subFolder?: string; // Optional folder name (e.g. "annual_progress_report"). If omitted, derived from URL slug
  live: string; // live HTTP URL (first/listing page)
  mock: string; // local absolute path to mock listing HTML
  detailMock?: string; // local path to mock detail page HTML
  detailSelector?: string; // CSS selector for detail "Read more" links on listing pages
  detailType?: string; // scraped page type name for queued detail pages
  paginated?: boolean; // true = follow pager links to crawl all listing pages
  pagerSelector?: string; // CSS selector for pager links (e.g. "ul.pager li a", "nav.page-numbers a")
  maxPages?: number; // cap on the number of paginated listing pages crawled
  baseUrl?: string; // required when paginated=true (e.g. "https://sainamainamun.gov.np")
  siteCode?: string; // municipality code, used to isolate crawlee storage per site
  urlFilters?: UrlFilterConfig; // include/exclude URL patterns applied to enqueued links
}

export interface ScrapedPage {
  type: string;
  url: string;
  html: string;
  subFolder?: string; // Resolved subfolder for storage (e.g. "annual_progress_report")
}

export interface IMunicipalityScraper {
  municipalityCode: string;
  routes?: RouteConfig[];
  extract(config: ScraperConfig): Promise<ScrapedPage[]>;
  transform(pages: ScrapedPage[]): Promise<EtlPayload> | EtlPayload;
  load(data: EtlPayload): Promise<void>;
  run(config: ScraperConfig): Promise<void>;
}
