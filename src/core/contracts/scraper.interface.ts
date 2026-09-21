import { EtlPayload } from "../types/domain.js";

export interface ScraperConfig {
  timeoutMs?: number;
}

export type RouteFormat = "tabular" | "columnar";

export interface RouteConfig {
  type: "project" | "report" | "notice";
  live: string;
  baseUrl?: string;
  paginated?: boolean;
  format?: RouteFormat;
  contentSelector?: string; // For Listing Pages (e.g., ".view-content")
  tableRowSelector?: string; // For tabular format
  detailSelector?: string; // To extract detail URLs from Listing (e.g., ".views-row h2 a")
  detailContentSelector?: string; // For Detail Pages (e.g., ".region-content" or "#content")
  detailType?: string;
}

export interface ScrapedPage {
  url: string;
  html: string; // Scoped HTML fragment (or full body if no contentSelector)
  routeType: string; // Carries route.type through extraction for transformer dispatch
  category?: string; // this will basically be mapped as 'type' in the database
}

export interface IMunicipalityScraper {
  municipalityCode: string;
  routes?: RouteConfig[];
  extract(config?: ScraperConfig): Promise<ScrapedPage[]>;
  transform(pages: ScrapedPage[]): Promise<EtlPayload> | EtlPayload;
  load(data: EtlPayload): Promise<void>;
  run(config?: ScraperConfig): Promise<void>;
}
