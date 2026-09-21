# Samaniti Data Collection & ETL Monorepo

TypeScript web scraping and ETL pipeline monorepo designed to extract, transform, and load (ETL) public local government portal data (municipalities, profiles, projects, reports, notices) across Nepal.

> New here? Read **[docs/scraping-process.md](docs/scraping-process.md)** for a step-by-step walkthrough of how the scraping pipeline works.

---

## Tech Stack

- **Language**: TypeScript (Node.js)
- **Scraping / Parsing**: Crawlee, Cheerio, Undici
- **Database / ORM**: PostgreSQL, Prisma
- **Utilities**: `nepali-date-converter`, `dotenv`

---

## Prerequisites

- **Node.js**: Version 18.x or higher
- **PostgreSQL**: Running instance or connection string for database access

---

## Installation & Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/samaniti/samaniti-data-col.git
   cd samaniti-data-col
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and update it with your database credentials and configuration options:

   ```bash
   cp .env.example .env
   ```

   Update `.env`:

   ```env
   DATABASE_URL='postgres://username:password@localhost:5432/samanitidb?schema=public'

   # Optional: Set to true if running scrapers locally using mock HTML pages
   USE_MOCK=false

   # Optional: Skip file downloads if desired
   SKIP_FILE_DOWNLOADS=false

   # Optional: Timeout for file downloads in milliseconds
   FILE_DOWNLOAD_TIMEOUT_MS=60000
   ```

4. **Initialize the Database**:
   Generate the Prisma client and run migrations against your PostgreSQL database:
   ```bash
   npm run db:generate
   npx prisma migrate dev --name init
   ```

---

## Running Scrapers

### Sainamaina Municipality Scraper

To run the crawler and scraper for Sainamaina Municipality (Lumbini Province):

```bash
npm run scraper:sainamaina
```

### Using Mock Pages (Offline / Development Mode)

If you wish to test extraction using local HTML mock pages rather than hitting live government portals:

1. Set `USE_MOCK=true` in your `.env` file.
2. Ensure required mock HTML files are placed in the site's configured mock folder (for Sainamaina: `src/scrapers/lumbini/sainamaina-mun/mock-pages/` - file names come from `src/scrapers/configs/sainamaina.ts`).
3. Run the scraper command.

### Filtering Items by Keywords (Include / Exclude)

You can limit which scraped items (notices, projects, reports) get stored using keyword filters configured through environment variables. Filtering happens during the transform stage, before documents are downloaded and records are saved.

```env
# Keep an item only if its title (or notice content) contains ANY of these comma-separated keywords.
INCLUDE_KEYWORDS=tax,land,allowance

# Always drop an item if its title (or notice content) contains ANY of these keywords.
EXCLUDE_KEYWORDS=cancelled,withdrawn
```

- Matching is **case-insensitive** substring matching.
- If `INCLUDE_KEYWORDS` is empty/unset, no include restriction is applied.
- **Exclude always wins** over include.
- A site config (`src/scrapers/configs/<code>.ts`) can override these with its own `keywordFilter`.
- Skipped items are logged with a `[Keyword Skip]` prefix.

Example:

```bash
INCLUDE_KEYWORDS=nagarik,vitta EXCLUDE_KEYWORDS=cancelled npm run scraper:sainamaina
```

### TXT Transcript Export

After a run, you can write a human-readable Nepali transcript of every record (title, dates, fiscal year, full notice text, and a list of attached files) to plain `.txt` files. This is the primary output format for citizens without internet or database access.

```env
EXPORT_TXT=true           # master switch (default: off)
EXPORT_TXT_DIR=storage/export   # output directory (created if missing)
```

- A file `<municipalityCode>-<timestamp>.txt` is written after each successful load.
- Each attached document is listed with its downloaded location so files can be served/distributed offline.

### URL Filtering and Pagination

Site configs can narrow which pages/links the crawler processes:

- `urlFilters` (`{ include?, exclude?, allowedDomains? }`) applied to listing pager links and detail links during extraction. `include`/`exclude` are regex-source substring patterns; by default only URLs on the same domain as the site's `baseUrl` are followed (e.g. `mailto:`, telephone links and cross-domain links are dropped automatically).
- `pagerSelector` — CSS selector for pagination links (defaults to Drupal's `ul.pager li.pager-item a, ul.pager li.pager-last a`). Customize it for WordPress (`a.page-numbers`), etc.
- `maxPages` — cap on how many paginated listing pages to crawl per entity.
- Crawlee storage (request queues, etc.) is kept per site under `storage/crawlee/<siteCode>/` so runs resume independently per municipality.

### PDF Text Extraction and OCR

Scraped notices/reports are usually attached as PDFs, and many are scanned images. The extraction worker turns each downloaded PDF into searchable Nepali text so it can be shown inline to citizens:

1. It first tries **native text extraction** (`mupdf`). If the PDF has enough characters (`PDF_TEXT_MIN_CHARS`, default 80), that text is stored with `extraction_method = native`.
2. Otherwise it **rasterizes each page** and runs **local Tesseract OCR** (`tesseract.js`) with our bundled `nep` + `eng` traineddata, storing the result with `extraction_method = ocr`.

Run it on pending documents (Postgres acts as the queue via `documents.extraction_status`):

```bash
npm run extract:pdfs          # processes PDF_EXTRACT_LIMIT docs (default 10)
PDF_EXTRACT_LIMIT=100 npm run extract:pdfs
```

Relevant env (see `.env.example`): `PDF_TEXT_MIN_CHARS`, `TESSERACT_LANG` (default `nep+eng`), `TESSDATA_DIR` (default `assets/tessdata`), `PDF_OCR_ZOOM`, `PDF_EXTRACT_LIMIT`.

Each `Document` gains: `extracted_text`, `extraction_status` (`pending` / `done` / `failed` / `skipped`) and `extraction_method` (`native` / `ocr`).

### Adding a New Municipality

Every site is described by a data-only `SiteConfig`. A scaffolding script registers it and guesses the CMS stack:

```bash
# Optional: detect the stack first
npm run detect:stack -- https://newmun.gov.np

# Scaffold config + register in src/scrapers/municipalities.json
npm run new:site -- --code=KANCHAN --name-ne="कञ्चन नगरपालिका" --name-en="Kanchan Municipality" \
  --province=Lumbini --district=Rupandehi --url=https://kanchanmun.gov.np [--stack=drupal7]

# Review src/scrapers/configs/kanchan.ts (listPath + selectors), then run it
npm run scrape -- KANCHAN
```

### Running Scrapers (CLI)

The generic runner reads `src/scrapers/municipalities.json` and runs the full crawl → transform → load → export pipeline:

```bash
npm run scrape -- SAINAMAINA        # one site (or several: SAINAMAINA KANCHAN)
npm run scrape:all                  # every enabled municipality
npm run scrape -- SAINAMAINA --mock # use local mock HTML instead of live
npm run scrape -- SAINAMAINA --extract   # also extract PDF text afterwards
```

Each run records a row in `scrape_run_logs` (status, trigger, page/record counts, duration, error).

### Scheduled Scraping (cron)

Two options, and they can be combined:

- **Backend in-process cron (node-cron):** set `CRON_ENABLED=true` in the backend environment. The backend schedules `npm run scrape` automatically (default `0 2 * * *`, override with `SCRAPE_CRON`; scope with `SCRAPE_CRON_SITES`; timezone `SCRAPE_CRON_TZ`). Add `SCRAPE_EXTRACT_PDFS=true` to OCR new PDFs after each run.
- **System cron:** schedule the CLI directly, independent of the backend:
  ```cron
  0 2 * * * cd /path/to/samaniti-data-col && USE_MOCK=false npm run scrape:all -- --trigger=cron >> /var/log/samaniti-scrape.log 2>&1
  ```

### Multi-Site Architecture

The pipeline is config-driven. Every municipality is described by a data-only `SiteConfig` in `src/scrapers/configs/<code>.ts`; the extract/transform logic is shared and spins off the site's **stack selector profile** (`src/scrapers/profiles/` - drupal7, wordpress, generic). Adding a site therefore is mostly adding a config file.

```tree
src/scrapers/
├── configs/           # one SiteConfig per municipality
├── profiles/          # CSS selector defaults per CMS stack
├── core/              # shared pipeline: routes, generic transform
└── lumbini/sainamaina-mun/  # Sainamaina entry point (thin wrapper)
```

---

## Project Structure

```tree
├── prisma/
│   ├── migrations/         # Database migrations
│   └── schema.prisma       # Prisma database schema (Municipalities, Projects, Reports, Notices)
├── src/
│   ├── core/
│   │   ├── contracts/      # Scraper interfaces and base contracts
│   │   ├── db/             # Database loader and persistence logic
│   │   ├── export/         # Human-readable Nepali TXT transcript export
│   │   ├── pdf/            # PDF text extraction + local Tesseract OCR worker
│   │   ├── scraper/        # Crawlee crawler configuration
│   │   ├── types/          # Shared domain types
│   │   └── utils/          # File download, keyword/URL filtering and helper utilities
│   ├── scrapers/
│   │   ├── configs/        # One SiteConfig per municipality
│   │   ├── profiles/       # CSS selector defaults per CMS stack
│   │   ├── core/           # Shared routes + generic transform
│   │   └── lumbini/
│   │       └── sainamaina-mun/  # Sainamaina Municipality scraper (index, extract, transform, utils)
├── assets/
│   └── tessdata/           # Tesseract traineddata (nep, eng)
└── package.json
```

---

## Scripts

- `npm run build`: Compile TypeScript code to JavaScript (`dist/`)
- `npm start`: Run the compiled main application
- `npm run db:generate`: Generate Prisma client
- `npm run scraper:sainamaina`: Run the Sainamaina Municipality ETL scraper (legacy per-site entry)
- `npm run scrape -- <CODE>`: Run the generic runner for one or more registered municipalities
- `npm run scrape:all`: Run the generic runner for all enabled municipalities
- `npm run new:site -- ...`: Scaffold a new municipality config and register it
- `npm run detect:stack -- <url>`: Detect a portal's CMS stack to pick a selector profile
- `npm run extract:pdfs`: Extract Nepali text (native + OCR) from pending PDF documents

---

## License

This project is licensed under the [MIT License](LICENSE).
