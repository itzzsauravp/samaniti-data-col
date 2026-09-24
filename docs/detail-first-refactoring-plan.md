# Architecture Refactoring Plan: Detail-First Crawler & Unified Extractor

**Document Version:** 1.0.0  
**Status:** Approved for Implementation  
**Target Codebase:** `src/core/` and `src/scrapers/`  

---

## 1. Executive Summary

This document specifies the architectural transition of the `samaniti-data-col` scraping engine from a fragmented **listing-row transformation** approach to a **unified, detail-first, model-driven** architecture.

### Objectives
1. **Detail-First Extraction**: Eliminate all listing row transforms (`transformProjectRow`, `transformNoticeRow`, `transformReportRow`). The crawler will treat listing pages exclusively as link discovery engines and visit the actual detail page for every single entity.
2. **Dual-Format Link Discovery**: Automatically detect whether a listing page presents data in **tabular format** (`<table>`) or **listing format** (`.views-row`, `.card`, etc.) to discover detail links without fragile per-route guessing, while maintaining full support for custom selector overrides (such as Banganga Municipality).
3. **Context Archival**: Scope and archive the primary detail container HTML (`$context.html()`, primarily `.introduction .container .row` or `.detail__page-inner`) into `metadata.contextHtml` for future auditability, offline re-parsing, and LLM indexing.
4. **Crash-Resilient Parallel Crawling**: Fix multi-process race conditions in Crawlee by isolating storage directories per scraper process, calibrating concurrency limits, and implementing polite retry/jitter hooks against Nepal Government Data Center (NITDC) servers.
5. **Preserved Test Isolation**: Centralize shared route definitions and transformation logic while retaining independent scraper entrypoints, enabling fast per-municipality and per-route testing (e.g. `npm run scraper lumbini:sainamaina -- --route=/budget-program`).

---

## 2. Root Cause Analysis of Current Deficiencies

### 2.1 Parallel Execution Crashes
When running `npm run scraper` across multiple municipalities simultaneously via `runner.ts`:
- **Crawlee Storage Clashing**: `CheerioCrawler` defaults to reading and writing queue state from `./storage/request_queues`. Multiple worker processes spawned via `child_process.spawn` attempt to lock and mutate the same SQLite/file stores simultaneously, causing `EBUSY`, lock contention, or silent failures.
- **Process & Connection Storm**: Launching `os.cpus().length` parallel processes (often 8–16 workers) saturates the database connection pool in `@prisma/adapter-pg` and leads to socket timeouts.
- **Gov.np Rate Limiting / WAF Drops**: Nepal municipality portals hosted on shared government infrastructure (GIDC/NITDC) drop bursts of connections with `429 Too Many Requests`, `ECONNRESET`, or `503 Service Unavailable`. Unhandled errors in a single child process trigger non-zero exit codes.

### 2.2 Duplication & Data Quality Loss in Listing Row Transforms
- Currently, each municipality scraper duplicates 300+ lines of `transformProjectListing`, `transformReportListing`, `transformNoticeListing`, and their corresponding row helpers.
- Listing rows contain truncated titles, lack full body text, often omit published dates or fiscal years, and fail to capture full resolution documents or embedded flipbooks.
- The raw HTML context is discarded, preventing retrospective verification.

### 2.3 Layout Variations Across Identical Routes
- Route `/budget-program` or `/act-law-directives` in Municipality A may render as an HTML `<table>`, while in Municipality B it renders as Drupal `.views-row` items.
- Scrapers previously tried to guess and hardcode distinct `detailSelector` or listing transforms per route, leading to high maintenance overhead.

---

## 3. Target System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │            Listing Page Discovery            │
                    │   (Discovers Pagination & Detail Links)      │
                    └──────────────────────┬───────────────────────┘
                                           │
                       ┌───────────────────┴───────────────────┐
                       ▼                                       ▼
            [Tabular Layout Detected]              [Listing Layout Detected]
            - table tbody tr td a                  - .views-row h2 a
            - .views-table tbody tr a              - .views-field-title a
            - table tr a                           - .field-content a
                       │                                       │
                       └───────────────────┬───────────────────┘
                                           │ (or custom detailSelector override)
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │               Detail Page Visit              │
                    │    Scoped to $context:                       │
                    │    .introduction .container .row             │
                    │    (Fallback: .detail__page-inner, etc.)     │
                    └──────────────────────┬───────────────────────┘
                                           │
               ┌───────────────────────────┼───────────────────────────┐
               ▼                           ▼                           ▼
        [Metadata & Body]           [All Documents]            [Context Archival]
        - Title (Ne/En)             - PDFs, Docs, Images       - Raw $context.html()
        - Published Date            - Embedded Flipbooks         stored in
        - Fiscal Year & Budget      - Full URLs resolved         metadata.contextHtml
               │                           │                           │
               └───────────────────────────┼───────────────────────────┘
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         Universal Detail Transformer         │
                    │  Transforms directly to Prisma domain models │
                    │        (PolicyEntity, Document)              │
                    └──────────────────────┬───────────────────────┘
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │              Database Upsert                 │
                    │       (Prisma via upsertPolicyEntity)        │
                    └──────────────────────────────────────────────┘
```

---

## 4. Technical Specifications

### 4.1 Resilient Parallel Crawler Engine (`src/core/scraper/crawler.ts`)
To prevent crashes during parallel runs:

1. **Storage Isolation**:
   ```typescript
   import { Configuration } from "crawlee";

   // Unique storage per scraper run / PID prevents SQLite lock collisions
   const storagePath = `./storage/tmp/crawlee-${municipalityCode}-${process.pid}-${Date.now()}`;
   const config = new Configuration({
       storageDir: storagePath,
       purgeOnStart: true,
   });
   ```
2. **Polite Request Handling**:
   - `maxConcurrency: 1` per individual scraper domain to respect target server limits.
   - `preNavigationHooks`: Inter-request delay of 600ms–1000ms with small randomized jitter to evade WAF rate limits.
   - `maxRequestRetries: 3` with exponential backoff.
   - Graceful `failedRequestHandler` that logs and marks failed URLs in metadata instead of crashing the process.
3. **Controlled Concurrency in `runner.ts`**:
   - Default concurrency capped at `3` (or user-specified via `-c` / `--concurrency`).

---

### 4.2 Unified Link Discovery Engine (`src/core/utils/html.ts`)
A dedicated function `extractDetailLinksFromListing(html: string, baseUrl: string, customSelector?: string): string[]` will handle link discovery:

1. **Explicit Override**:
   If `customSelector` is provided (e.g. Banganga's `h3.card__title a`), execute it first.
2. **Tabular Format Detection**:
   If `$("table").length > 0` within the listing container:
   - Target anchors in primary data columns: `table tbody tr td:first-child a`, `table tbody tr td.views-field-title a`, `table tbody tr a[href*='/content/']`, `table tbody tr a[href*='/node/']`.
   - Fallback: `table tbody tr td a` excluding download buttons or sort headers.
3. **Listing Format Detection**:
   If `.views-row` or `.region-content` is present:
   - Target `.views-row h2 a`, `.views-row .views-field-title a`, `.views-row .field-content a[href*='/content/']`.
   - Fallback: `h2 a, h3 a`.
4. **Link Hygiene**:
   - Exclude navigation anchors (`#`, `javascript:`, `/ne`, `/en`, `/user/login`, pagination links `?page=`).
   - Resolve all links to absolute URLs against `baseUrl`.
   - Deduplicate discovered URLs.

---

### 4.3 Detail Page Context & Archival Engine (`src/core/transformers/detail.ts`)

#### Context Selection Hierarchy
Detail pages scope extraction to `$context`:
1. `.introduction .container .row` (Standard Nepal Government Drupal portal pattern)
2. `.introduction .container`
3. `.detail__page-inner` (Banganga and newer municipal custom themes)
4. `.region-content` / `#content`
5. Fallback: `body`

#### Extracted Data Fields
| Field | Extraction Method |
|---|---|
| `titleNe` | `extractTitle($)` or `$context.find("h1, h2, .page-header").first().text()` |
| `publishedDate` | `extractDate($)` (supporting `dc:date`, `.submitted`, `.meta.date`) |
| `fiscalYear` | Parsed from title or metadata via `parseNepaliFiscalYear(title)` |
| `budgetAmount` | Regex extraction of budget figures (for `project` routes) |
| `contentNe` | Sanitized text from `$context.find(".field-type-text-with-summary, .content, p")` |
| `documents` | `extractDocumentLinks($, baseUrl, $context)` (PDFs, images, attachments, flipbooks) |
| `metadata.contextHtml` | Raw HTML of `$context.html()` preserved for offline audit and LLM re-processing |

---

### 4.4 Centralization vs. Independent Testing Strategy

To solve the risk of losing independent testing capabilities when centralizing:

1. **Shared Route Directory (`src/core/constants/routes.ts`)**:
   Provides `getStandardGovRoutes(baseUrl, overrides?)` defining standard routes (`/budget-program`, `/annual-progress-report`, `/news-notices`, `/decisions`, etc.).
2. **Independent Municipality Scrapers Preserved**:
   Each municipality keeps its dedicated directory:
   - `src/scrapers/lumbini/sainamaina-mun/index.ts`
   - `src/scrapers/lumbini/banganga-mun/index.ts`
   - etc.
3. **Granular CLI Testing Options**:
   - Test a single municipality:
     ```bash
     npm run scraper lumbini:sainamaina
     ```
   - Test a **single route** on a single municipality without scraping other pages:
     ```bash
     npm run scraper lumbini:sainamaina -- --route=/budget-program
     ```
   - Run province-level parallel execution:
     ```bash
     npm run scraper lumbini --concurrency=3
     ```

---

## 5. Implementation Roadmap

### Phase 1: Crawler & Runner Hardening
- [ ] Add unique `CRAWLEE_STORAGE_DIR` per process in `src/core/scraper/crawler.ts`.
- [ ] Implement exponential backoff, request jitter, and retry handling.
- [ ] Update `runner.ts` default concurrency to `3` and add `--route` argument pass-through.

### Phase 2: Unified Link Discovery
- [ ] Implement `extractDetailLinksFromListing` in `src/core/utils/html.ts`.
- [ ] Refactor `crawler.ts` to use auto-discovery for all listing pages.
- [ ] Ensure listing pages are never pushed as data items into `ScrapedPage[]`.

### Phase 3: Universal Detail Transformer
- [ ] Create `src/core/transformers/detail.ts` to process detail pages into `PolicyEntityData`.
- [ ] Incorporate `$context` HTML extraction into `metadata.contextHtml`.
- [ ] Remove `transform*Row` and `transform*Listing` methods from existing scrapers.

### Phase 4: Shared Standard Routes & Municipality Migration
- [ ] Create `src/core/constants/routes.ts` with `getStandardGovRoutes`.
- [ ] Migrate `sainamaina-mun`, `kanchan-mun`, `sarawal-mun`, `bardaghat-mun`, `shuddhodhan-mun`, `dhankaul-mun`, and `durgabhagwati-mun` to standard routes + universal detail transformer.
- [ ] Verify `banganga-mun` retains custom selectors (`.category-1 .custom-container`, `h3.card__title a`, `.detail__page-inner`) while using the universal detail pipeline.

### Phase 5: Verification & Quality Assurance
- [ ] Test single-route execution on Sainamaina (`/budget-program`).
- [ ] Test tabular vs listing route discovery.
- [ ] Execute parallel run across Lumbini province (`npm run scraper lumbini -c 3`) and verify 0 crashes.
- [ ] Confirm documents and `contextHtml` are populated in PostgreSQL.

---

## 6. Risk Mitigation Matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Target municipality server blocks requests | Medium | Medium | Polite throttle (600–1000ms delay + jitter), max concurrency 1 per domain. |
| Crawlee process queue lock contention | High | High | Dynamic per-process storage directory (`storagePath` with PID and timestamp). |
| Detail page context selector mismatch | Low | Low | Cascading selector fallback (`.introduction .container .row` -> `.detail__page-inner` -> `body`). |
| Database connection pool exhaustion | Medium | Medium | Sequential database loading per scraper process, capped parallel runner workers. |
