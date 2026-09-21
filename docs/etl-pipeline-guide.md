# Comprehensive ETL Pipeline Guide

This guide provides a detailed, step-by-step walkthrough of how data flows through the Samaniti ETL pipeline—from the initial web crawling to database persistence and telemetry logging.

---

## The ETL Lifecycle

Each municipality scraper execution follows a structured pipeline: **Initialize (Telemetry) -> Extract -> Transform -> Load -> Finalize**.

### 1. Initialization & Telemetry Logging
Before any data is fetched, the scraper initializes its execution context:
1. The **`runner.ts`** or specific municipality **`index.ts`** calls `startScraperRun`.
2. A unique **`run_id`** is generated and saved in the `scraper_runs` table in PostgreSQL.
3. This `run_id` is passed throughout the pipeline to ensure every record has a batch lineage (audit log).

### 2. Extraction (Crawl & Scrape)
Driven by `src/core/scraper/crawler.ts`, extraction fetches the raw content from municipal portals based on two primary layouts:

- **Tabular Format**: Data is extracted directly from the listing page tables. The crawler scopes the `.view-content` table, pushes the rows, and moves on. This is used for simple listings like budgets and plans.
- **Columnar Format**: Data requires visiting individual detail pages. The crawler finds detail links using `detailSelector`, enqueues them, and fetches full article content/attachments from the detail page scope (`detailContentSelector`).

**Pagination Support**: The crawler automatically detects "Page 1...N" pagination on listing pages and enqueues all discovered URLs for thorough collection.

### 3. Transformation (Parse & Clean)
Transformation converts raw HTML into structured domain entities defined in `src/core/types/domain.ts`.

1. **Dispatcher Dispatch**: `src/core/constants/transformers.ts` takes `ScrapedPage[]` and dispatches each page to its corresponding handler (e.g., `reportDetail`, `project`).
2. **Standardized Row Parsers**: `src/core/scraper/base-transformer.ts` contains DRY logic to parse table rows, extract titles, normalize Nepali fiscal years (using `parseNepaliFiscalYear`), and clean strings.
3. **Document Extraction**: The transformer uses `extractDocumentLinks` to find file attachments (PDFs, DOCs). It normalizes URLs and builds `DocumentData` objects.

### 4. Load (Database & File Storage)
Driven by `src/core/db/loader.ts`, the loading phase handles persistence:

1. **Database Upserts**: Records are upserts into PostgreSQL using **`sourceUrl`** as a unique constraint. This prevents duplicates while updating existing records if they change.
2. **Batch Lineage**: The `runId` (log ID) is attached to every `Project`, `Report`, and `Notice`, linking them back to the specific execution run.
3. **Document Deduplication**: Documents are built and deduplicated by `originalUrl`.
4. **File Downloads**: If configured, the system downloads document attachments into `storage/`. Each download is tracked by its status (`pending`, `ok`, `failed`).

### 5. Finalization
Once all pages are processed:
1. Total counts of scraped projects, reports, and notices are calculated.
2. The `scraper_runs` record is updated with `endedAt` time, final status (`success` or `failed`), and total counts.
3. The database connection is closed.

---

## Key Utility Helpers
- **Nepali Date Converter**: Normalizes various Nepali date formats into ISO or searchable strings.
- **Fiscal Year Parser**: Extracts patterns like `2080/81` or `८०/८१` from titles to categorize data.
- **URL Normalizer**: Ensures all relative links from municipal portals are converted into absolute URLs for reliable storage and downloading.
