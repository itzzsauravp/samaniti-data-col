# Project Structure & Architecture Guide

This document outlines the directory hierarchy and module responsibilities within the Samaniti Data Collection & ETL Monorepo.

---

## Directory Hierarchy Overview

```tree
samaniti-data-col/
├── docs/                      # Documentation & Architecture Guides
│   ├── project-structure.md   # Codebase layout and module organization
│   └── etl-pipeline-guide.md  # Detailed step-by-step ETL workflow explanation
├── prisma/
│   ├── migrations/            # SQL migration history
│   └── schema.prisma          # Prisma database schema (Municipalities, Projects, Reports, Notices, ScraperRuns)
├── src/
│   ├── core/                  # Shared core framework & utilities
│   │   ├── constants/         # Transformer dispatchers & file constants
│   │   ├── contracts/         # Scraper interfaces and route contracts
│   │   ├── db/                # Database loader & telemetry logger
│   │   ├── scraper/           # Crawlee crawler, route factory, base transformers
│   │   ├── types/             # Domain TypeScript interfaces
│   │   └── utils/             # Helper utilities (Nepali dates, URLs, HTML parsing, document downloads)
│   └── scrapers/              # Region & Municipality specific scraper implementations
│       └── lumbini/           # Lumbini Province scrapers
│           ├── kanchan-mun/   # Kanchan Rural Municipality
│           ├── sainamaina-mun/# Sainamaina Municipality
│           └── sarawal-mun/   # Sarawal Rural Municipality
├── storage/                   # Local storage directory for downloaded files
├── runner.ts                  # Dynamic CLI runner script
├── tsconfig.json              # TypeScript configuration
└── package.json               # Project manifest and scripts
```

---

## Core Modules (`src/core/`)

- **`contracts/scraper.interface.ts`**: Defines core contracts like `IMunicipalityScraper`, `RouteConfig`, and `RouteFormat` (`tabular` vs `columnar`).
- **`scraper/crawler.ts`**: Generic sequential web crawler built on Crawlee's `CheerioCrawler`.
- **`scraper/route-factory.ts`**: Standardized route generator for Nepali municipal portals supporting `overrides`, `exclude` (to disable unused endpoints and save resources), and `additionalRoutes`.
- **`scraper/base-transformer.ts`**: Shared transformers for table rows and detail pages.
- **`db/loader.ts`**: Prisma client setup, entity upsert logic, and `ScraperRun` telemetry tracking (`startScraperRun`, `finishScraperRun`).
- **`utils/`**: Reusable helper functions for parsing Nepali dates/fiscal years, scoping HTML, building documents, and handling downloads.

---

## Municipality Scrapers (`src/scrapers/`)

Each municipality folder (`<province>/<municipality-code>/`) contains:
- **`index.ts`**: Entry point that starts a telemetry run, executes the crawler and transformer incrementally, loads data, and logs completion.
- **`extract.ts`**: Clean route definitions leveraging `createStandardMunicipalityRoutes` with custom patches if needed.
- **`transform.ts`**: Maps scraped pages to domain payloads (`EtlPayload`).
- **`load.ts`**: Persists extracted data via the core loader.
