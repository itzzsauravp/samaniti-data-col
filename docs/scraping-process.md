# How Scraping Works (Step-by-Step)

This document walks through the full scraping pipeline of this repo so a developer
can understand exactly what happens when you run a scraper. Everything is
**config-driven** — one municipality is one `SiteConfig`, and all the scraping
logic is shared.

```
npm run scrape -- SAINAMAINA
        │
        ▼
┌──────────────────── 1. SETUP ────────────────────┐
│ run.ts loads municipalities.json, resolves the     │
│ SiteConfig, creates a scrape_run_logs row          │
└──────────────────────┬────────────────────────────┘
                       ▼
┌──────────────────── 2. ROUTES ────────────────────┐
│ routes.ts turns the config into RouteConfig[]      │
│ (listing URL + selectors + pagination + mocks)     │
└──────────────────────┬────────────────────────────┘
                       ▼
┌──────────────────── 3. CRAWL ─────────────────────┐
│ crawler.ts fetches pages (live Crawlee or local    │
│ mock files), follows pagination + detail links,    │
│ returns ScrapedPage[] (url + HTML + type)          │
└──────────────────────┬────────────────────────────┘
                       ▼
┌──────────────────── 4. TRANSFORM ─────────────────┐
│ generic-transform.ts parses each HTML page with    │
│ Cheerio using site selectors + stack profile,      │
│ applies keyword filter + delta-skip, downloads     │
│ attached files, emits Project/Report/Notice records│
└──────────────────────┬────────────────────────────┘
                       ▼
┌──────────────────── 5. LOAD ──────────────────────┐
│ loader.ts upserts Municipality + records + Documents│
│ into Postgres via Prisma (sourceUrl = unique key)  │
└──────────────────────┬────────────────────────────┘
                       ▼
┌──────────────────── 6. EXPORT ────────────────────┐
│ export/text.ts writes a Nepali .txt transcript of  │
│ every record if EXPORT_TXT=true                    │
└──────────────────────┬────────────────────────────┘
                       ▼
┌──────────────────── 7. PDF EXTRACTION ────────────┐
│ (optional --extract) extract-worker.ts reads PDFs  │
│ natively (mupdf) or OCRs them (tesseract.js)       │
└──────────────────────────────────────────────────┘
```

Each step lives in its own module. The files you care about:

| Step | File |
|------|------|
| Orchestration | `src/scrapers/run.ts` |
| Config -> routes | `src/scrapers/core/routes.ts` |
| Crawling | `src/core/scraper/crawler.ts` |
| HTML -> records | `src/scrapers/core/generic-transform.ts` |
| Persistence | `src/core/db/loader.ts` |
| File download | `src/core/utils/file-download.ts` |
| TXT export | `src/core/export/text.ts` |
| PDF text/OCR | `src/core/pdf/extract-worker.ts` |
| Site configs | `src/scrapers/configs/<code>.ts` |
| Selector profiles | `src/scrapers/profiles/` (drupal7, wordpress, generic) |

---

## Step 1 — Setup (run.ts)

`npm run scrape -- SAINAMAINA` executes `src/scrapers/run.ts`:

1. `parseArgs()` reads CLI flags: `--all`, `--mock`, `--live`, `--extract`,
   `--extract-limit=N`, `--trigger=...`, plus the municipality codes.
2. `loadRegistry()` reads `src/scrapers/municipalities.json` — the master list of
   every municipality with its `config` file path, `stack`, `baseUrl`, `enabled`.
3. `resolveSite()` dynamically imports that config file (e.g. `.tsx`
   `src/scrapers/configs/sainamaina.ts`) and grabs the exported `SiteConfig`.
4. `recordStart()` inserts a `scrape_run_logs` row with status `running`
   (surfaced later in the web backend).

## Step 2 — Build Routes (routes.ts)

`buildRoutesFromSite(site)` converts the `SiteConfig` into one `RouteConfig` per
**entity** (entity = `notice`, `project`, or `report`).

A route bundles everything the crawler needs for that list:

- `live` — full listing URL, e.g. `https://sainamainamun.gov.np/en/news-notice`
- `mock` — local mock HTML path (used when `USE_MOCK=true`)
- `type` / `detailType` — page type tags used later by the transform step
- `detailSelector` — CSS selector for "read more" links that point to detail pages
- `paginated` + `pagerSelector` + `maxPages` — pagination behaviour
- `urlFilters` — include/exclude/allowed-domain rules copied from the site config

## Step 3 — Crawl (crawler.ts)

`crawlRoutes(routes, { useMocks })` returns `ScrapedPage[]`
(`{ type, url, html, subFolder }`). Two modes:

### Mock mode (offline, `USE_MOCK=true` or `--mock`)
- Reads each mock HTML file from disk (`route.mock`).
- If paginated, reuses the same mock HTML for every page URL the pager would
  produce (`getMockPaginatedPages`).
- If the route has `detailSelector` + `detailMockFile`, it extracts detail links
  from the listing and emits a copy of the detail mock per link.
- No network requests.

### Live mode (default)
- Uses **Crawlee** (`CheerioCrawler`), with `respectRobotsTxtFile: true`,
  retries, and a per-site storage dir at `storage/crawlee/<siteCode>/`.
- Each fetched listing page is pushed as a `ScrapedPage`.
- Detail links are extracted from the page, filtered (`filterUrls` — drops
  `mailto:`, cross-domain, and exclude-matched links), deduplicated
  (`normalizeSourceUrl`, strips `?page=` params), and queued.
- Pagination links are extracted (`extractPaginationUrls`), filtered, capped by
  `maxPages`, and queued.
- Duplicate listing signatures are tracked so broken pagination servers that
  return the same page over and over are crawled only once.

Result: an in-memory array of raw HTML pages.

## Step 4 — Transform (generic-transform.ts)

`transformSite(pages, site)` converts raw HTML into domain records
(`ProjectData[]`, `ReportData[]`, `NoticeData[]`) using Cheerio.

1. Resolves the **selector profile** for the site's stack
   (`getSelectorProfile(site.stack)`) and merges in per-entity overrides.
2. For every page, `transformEntityPage` loads the HTML and iterates the
   selector for listing rows (`selectors.rows`).
3. For each row it:
   - Reads the title + link (`selectors.titleLink`).
   - Skips rows with no title/link (`[Row Skip]`).
   - Applies the **keyword filter** (`isFilteredOut` — include/exclude keywords,
     exclude always wins). Skipped items log `[Keyword Skip]`.
   - **Delta-skip:** queries the DB via `isRecordExisting(sourceUrl)` and skips
     if the record already exists (`[Delta Skip]`). This is what makes re-runs
     cheap — only new pages get stored.
   - Reads the date (`selectors.dateField`) and attached file link
     (`selectors.fileLink`).
   - For the file link it calls `buildSiteDocument` → `downloadAndSaveDocument`
     which downloads the file into
     `storage/<province>/<municipality>/<rootFolder>/<typeFolder>/<timestamp>.<ext>`
     and returns the path + status (`ok`/`failed`/`skipped`).
   - Builds a `Project`/`Report`/`Notice` record with `municipalityCode`,
     `titleNe`, `fiscalYear` (parsed from the Nepali title), `publishedDate`,
     `sourceUrl`, and the downloaded `documents`.
   - `normalizeSourceUrl` strips `?page=` so the same notice is never stored
     once per pagination page.
4. A listing row may be absent while the page itself **is** a detail page
   (driven by `selectors.fallbackWhen`). In that case it extracts the title via
   `titleFallbacks`, the full body via `bodyField` (for notices), and all
   `detailDocs` file links.

The merged result is an `EtlPayload`:
`{ municipality, projects?, reports?, notices? }`.

## Step 5 — Load (loader.ts)

`loadEtlData(payload)` persists everything to PostgreSQL via Prisma:

1. `upsertMunicipality` — create/update the municipality row (`code` unique).
2. `upsertMunicipalityProfile` — if a profile object was scraped.
3. `upsertProject` / `upsertReport` / `upsertNotice` — upsert each record using
   `sourceUrl` as the unique key, then `createMany` only the documents that
   aren't already linked (dedupes by `originalUrl`).

The `Document` row is the bridge between a record and its downloaded file. It
keeps `downloadStatus` and later `extractionStatus` / `extractionMethod` for the
PDF step.

## Step 6 — Export (export/text.ts)

If `EXPORT_TXT=true`, `exportEtlToTextIfEnabled` writes
`storage/export/<municipalityCode>-<timestamp>.txt` — a human-readable Nepali
transcript (`सूचना ...`, `प्रतिवेदन ...`, `निर्माण परियोजना ...`) with each
record's title, dates, fiscal year, full notice body, and attached files with
their local storage location.

## Step 7 — PDF Text Extraction (extract-worker.ts)

Only runs when `--extract` is passed or `SCRAPE_EXTRACT_PDFS=true`. It processes
documents where `downloadStatus='ok'` and `extractionStatus='pending'`
(Postgres acts as the queue):

1. Skips/non-PDF files get `extractionStatus = 'skipped'`; missing files fail.
2. **Native pass:** `mupdf` extracts embedded text. If it has enough characters
   (`PDF_TEXT_MIN_CHARS`, default 80) the text is saved with
   `extraction_method = 'native'`.
3. **OCR fallback:** otherwise each page is rasterized (`PDF_OCR_ZOOM`, default 3)
   and run through local `tesseract.js` with `nep+eng` traineddata
   (`assets/tessdata/`), saving text with `extraction_method = 'ocr'`.
4. Failures are stored with `extraction_status = 'failed'` and an error message.

---

## What makes a "site"? The SiteConfig

Everything above is driven by one data-only object. See
`src/core/contracts/site-config.ts`:

```ts
SiteConfig {
  code, municipality, baseUrl, stack,
  mockBaseDir,
  entities: EntityConfig[],   // one per notice/project/report
  urlFilters?, keywordFilter?
}

EntityConfig {
  type, typeLabel, listPath,
  subFolder?, mockFile?, detailMockFile?,
  detailSelector?, detailType?,
  paginated?, maxPages?, pagerSelector?,
  selectors?                    // override stack profile defaults
}
```

If an entity doesn't override selectors, it inherits them from the **stack
profile** (`src/scrapers/profiles/drupal7.ts`, `wordpress.ts`, `generic.ts`) —
the default CSS layout for that CMS. Adding a municipality is usually: add a
config file, register it in `municipalities.json`, run it.

## End-to-end trace (Sainamaina)

```
npm run scrape -- SAINAMAINA
  run.ts        loads src/scrapers/configs/sainamaina.ts
  routes.ts     route: type=notice, live=.../en/news-notice, paginated
  crawler.ts    GET /en/news-notice → queue ?page=1..N → queue each detail page
                (all inside storage/crawlee/sainamaina/)
  transform     rows: .view-content .views-row
                title: .views-field-title a
                files: .views-field-field-documents a
                downloads → storage/lumbini/sainamaina/notices/news_notice/
  loader.ts     upsert Municipality, Notice (sourceUrl unique), Documents
  export        storage/export/sainamaina-<ts>.txt  (if EXPORT_TXT=true)
  extract       mupdf native text → tesseract OCR  (if --extract)
```

## Common CLI / env knobs

```bash
npm run scrape -- SAINAMAINA             # one site
npm run scrape -- SAINAMAINA --mock      # offline, uses mock HTML
npm run scrape -- SAINAMAINA --extract   # also OCR attached PDFs
npm run scrape:all                       # every enabled site
```

Environment variables that change behaviour: `USE_MOCK`, `SKIP_FILE_DOWNLOADS`,
`FILE_DOWNLOAD_TIMEOUT_MS`, `INCLUDE_KEYWORDS`, `EXCLUDE_KEYWORDS`,
`EXPORT_TXT`, `EXPORT_TXT_DIR`, `PDF_TEXT_MIN_CHARS`, `TESSERACT_LANG`,
`TESSDATA_DIR`, `PDF_OCR_ZOOM`, `PDF_EXTRACT_LIMIT`. See `README.md` and
`.env.example` for full details.