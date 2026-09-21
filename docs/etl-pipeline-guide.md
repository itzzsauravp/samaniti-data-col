# Comprehensive ETL Pipeline Guide

This guide provides a detailed, step-by-step walkthrough of how data flows through the Samaniti ETL pipeline—from crawling to database persistence and telemetry auditing.

---

## The ETL Lifecycle

Each municipality scraper execution follows a structured pipeline: **Initialize (Telemetry) -> Extract -> Transform -> Load -> Finalize**.

### 1. Initialization & Scraper Telemetry
Before any HTTP requests are made, the execution is logged:
1. `runner.ts` or the municipality's `index.ts` invokes **`startScraperRun`**.
2. A unique **`run_id`** is generated in the `scraper_runs` table with status `"running"`.
3. This `run_id` is propagated down to every project, report, and notice created during this execution, providing precise batch lineage (audit trail).

### 2. Extraction (Crawlee & Route Factory)
Driven by `src/core/scraper/crawler.ts` and configured via `route-factory.ts`, extraction handles two distinct Drupal portal layouts:
- **Tabular Format (`format: "tabular"`)**: Data lives directly in table rows on the listing page. The crawler captures the listing page and passes table rows directly to the transformer without navigating to detail pages.
- **Columnar Format (`format: "columnar"`)**: Data requires visiting individual detail pages. The crawler extracts detail links using `detailSelector`, enqueues them, and fetches full content and attachments from the detail page scope.
- **Resource Optimization (`exclude`)**: Municipalities can pass an `exclude` array to `createStandardMunicipalityRoutes` to completely disable routes/endpoints that do not exist on their portal, avoiding wasted network requests.

### 3. Transformation (Base Transformers & Utilities)
Transformation converts raw HTML fragments into typed domain models (`ProjectData`, `ReportData`, `NoticeData`):
1. **Dispatcher Routing**: `executeTransform` maps each page's `routeType` to its respective handler.
2. **Base Transformers**: Shared parsing logic in `base-transformer.ts` extracts titles, cleans whitespace, parses Nepali fiscal years, and collects document attachments.
3. **Document Handling**: Attachments (PDFs, docs) are normalized into absolute URLs and prepared for local storage and database linking.

### 4. Loading & Persistence (`db/loader.ts`)
The loading phase saves extracted data into PostgreSQL:
1. **Upsert Operations**: Entities are upserted using `sourceUrl` as a unique constraint to avoid duplicates while refreshing stale records.
2. **Batch Lineage Assignment**: Each upserted record is linked to the active `run_id`.
3. **Document Connect-or-Create**: Attached files are deduplicated and linked via Prisma's `connectOrCreate`.

### 5. Finalization
Upon completing all pages:
1. Total item counts (`projectsCount`, `reportsCount`, `noticesCount`) are aggregated.
2. **`finishScraperRun`** is called to mark the run as `"success"` (or `"failed"` if an error occurred) and record the completion timestamp and total items scraped.
3. The Prisma client disconnects and the process exits.
