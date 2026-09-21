# Project Structure & Architecture Guide

This document provides a comprehensive overview of the codebase organization for the Samaniti Data Collection & ETL Monorepo.

---

## Directory Hierarchy Overview

```tree
samaniti-data-col/
├── docs/                      # Documentation & Architecture Guides
│   ├── project-structure.md   # Codebase layout and module responsibilities
│   └── etl-pipeline-guide.md  # Detailed step-by-step ETL workflow explanation
├── prisma/
│   ├── migrations/            # SQL migration history
│   └── schema.prisma          # Prisma schema (Municipalities, Projects, Reports, Notices, ScraperRuns)
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

## Key Modules & Responsibilities

### 1. `src/core/` (Framework Core)
The `core` directory contains all shared infrastructure and utilities:
- **`contracts/scraper.interface.ts`**: Defines standard contracts (`IMunicipalityScraper`, `RouteConfig`, `ScrapedPage`).
- **`types/domain.ts`**: TypeScript interfaces representing domain entities (`ProjectData`, `ReportData`, `NoticeData`, `EtlPayload`).
- **`scraper/crawler.ts`**: Generic sequential web crawler built on Crawlee's `CheerioCrawler`.
- **`scraper/route-factory.ts`**: Standardized route generator for Nepali municipal portals.
- **`scraper/base-transformer.ts`**: Shared transformers for table rows and detail pages.
- **`db/loader.ts`**: Prisma client initialization, entity upsert logic, and `ScraperRun` telemetry tracking.
- **`utils/`**: Reusable modules for parsing Nepali dates/fiscal years, scoping HTML, building documents, and handling download timeouts.

### 2. `src/scrapers/` (Municipality Implementations)
Organized hierarchically by `<province>/<municipality-code>/`:
Each municipality folder contains:
- **`index.ts`**: Scraper entry class implementing `IMunicipalityScraper` and triggering ETL execution.
- **`extract.ts`**: Route definitions using the `route-factory` and crawler invocation.
- **`transform.ts`**: Mapping scraped pages to structured `EtlPayload`.
- **`load.ts`**: Executing database upserts.

### 3. `runner.ts` (Dynamic CLI Runner)
Provides a dynamic CLI interface to execute scrapers by target string (e.g., `lumbini:sarawal`). Automatically locates matching municipality modules under `src/scrapers/` and spawns the execution process.
