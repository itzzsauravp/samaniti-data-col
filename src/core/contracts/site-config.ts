import { MunicipalityData } from "../types/domain.js";
import { KeywordFilter } from "../utils/keywords.js";
import { UrlFilterConfig } from "../utils/url-filter.js";

export type { UrlFilterConfig };

/**
 * Entity types that the generic pipeline can collect from a municipality portal.
 */
export type EntityType = "notice" | "project" | "report";

/** A selector plus an optional attribute to read (e.g. meta content). */
export interface TitleFallback {
  selector: string;
  attribute?: string;
}

/**
 * Resolved CSS selectors for a single entity type. Sites override subsets of
 * these per entity; unset keys fall back to the site's stack profile.
 */
export interface EntitySelectors {
  /** Listing rows container (e.g. ".view-content .views-row"). */
  rows: string;
  /** Link element containing the item title inside a listing row. */
  titleLink: string;
  /** Date element inside a listing row (null when entity has no dates). */
  dateField: string | null;
  /** File/document link element inside a listing row. */
  fileLink: string;
  /** Selector list for document links on a detail page. */
  detailDocs: string;
  /** Content body selector on a detail page. */
  bodyField: string;
  /** Ordered fallback selectors used to derive a detail page title. */
  titleFallbacks: TitleFallback[];
  /** Prepend the entity type label to the detail title fallbacks. */
  titleUsesType: boolean;
  /** Title used when a listing row has an empty title. */
  defaultRowTitle: string;
  /** Title used when every detail title fallback is empty. */
  defaultDetailTitle: string;
  /**
   * When to treat the current page as a detail (single-item) page:
   * - "emptyRows": no listing rows were found in the DOM.
   * - "emptyResult": no items were collected from the listing rows.
   */
  fallbackWhen: "emptyRows" | "emptyResult";
}

/** Scraping configuration for one entity group (notice/project/report) on a site. */
export interface EntityConfig {
  type: EntityType;
  /** Categorization label (stored as `type`, used as storage subFolder). */
  typeLabel: string;
  /** Listing page path (absolute URL or path relative to baseUrl). */
  listPath: string;
  /** Storage subFolder override (defaults to typeLabel). */
  subFolder?: string;
  /** Mock listing HTML file name inside `mockBaseDir`. */
  mockFile?: string;
  /** Mock detail HTML file name inside `mockBaseDir`. */
  detailMockFile?: string;
  /** CSS selector for detail "read more" links on a listing page. */
  detailSelector?: string;
  /** Scraped page type assigned to queued detail pages. */
  detailType?: string;
  /** True when the listing is paginated and pager links must be followed. */
  paginated?: boolean;
  /** Max listing pages to crawl for this entity (unset = follow all pager links). */
  maxPages?: number;
  /** Pager selector for paginated listings (defaults to the stack profile). */
  pagerSelector?: string;
  /** Per-entity selector overrides on top of the stack profile defaults. */
  selectors?: Partial<EntitySelectors>;
}

/** Complete, data-only description of a municipality portal scrape. */
export interface SiteConfig {
  /** Municipality code (unique key, e.g. "SAINAMAINA"). */
  code: string;
  /** Canonical municipality metadata written to the DB. */
  municipality: MunicipalityData;
  /** Origin of the portal, e.g. "https://sainamainamun.gov.np". */
  baseUrl: string;
  /** Stack profile key (e.g. "drupal7", "wordpress", "generic"). */
  stack: string;
  /** Directory holding this site's mock HTML files. */
  mockBaseDir: string;
  /** Entity groups to collect. */
  entities: EntityConfig[];
  /** Optional URL filters applied during crawling. */
  urlFilters?: UrlFilterConfig;
  /** Per-site keywords; overrides INCLUDE_KEYWORDS/EXCLUDE_KEYWORDS env. */
  keywordFilter?: KeywordFilter;
}

/** Selector defaults provided by a CMS stack ("drupal7", "wordpress", ...). */
export interface SelectorProfile {
  stack: string;
  entities: Record<EntityType, EntitySelectors>;
}