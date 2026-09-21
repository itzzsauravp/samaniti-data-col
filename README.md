# Samaniti Data Collection & ETL Monorepo

TypeScript web scraping and ETL pipeline monorepo designed to extract, transform, and load (ETL) public local government portal data (municipalities, profiles, projects, reports, notices) across Nepal.

---

## What It Does

- **Crawls & Scrapes Municipal Portals**: Leverages Crawlee and Cheerio to dynamically crawl listings, pagination, and document links across local government websites in Nepal.
- **Parses & Transforms**: Cleans and normalizes HTML content into structured domain entities (Projects, Reports, Notices, Municipality Profiles) with support for Nepali fiscal years, dates, and file attachments.
- **Telemetry & Logging**: Automatically tracks scraper run executions, durations, counts, status, and batch lineage (`log_id` / `runId`) in PostgreSQL.
- **Local Storage & Database ETL**: Downloads document attachments (PDFs, docs) into organized local storage directories (`storage/`) and upserts records reliably using Prisma ORM.

---

## Prerequisites

- **Node.js**: Version 18.x or higher
- **PostgreSQL**: Running instance or connection string for database access

---

## Installation & Setup

1. **Clone the repository**:
    ```bash
    git clone https://github.com/itzzsauravp/samaniti-data-col.git
    cd samaniti-data-col
    ```

2. **Install dependencies**:
    ```bash
    npm install
    ```

3. **Configure Environment Variables**:
   Copy the example environment file and update it with your database credentials:
    ```bash
    cp .env.example .env
    ```
    Update `.env`:
    ```env
    DATABASE_URL='postgres://username:password@localhost:5432/samanitidb?schema=public'
    SKIP_FILE_DOWNLOADS=false
    FILE_DOWNLOAD_TIMEOUT_MS=60000
    ```

4. **Initialize the Database**:
    ```bash
    npx prisma db push --accept-data-loss
    npm run db:generate
    ```

---

## Running Scrapers

Use the dynamic runner script to execute any municipality scraper:
```bash
npm run scraper lumbini:sarawal
npm run scraper lumbini:kanchan
```

---

## Documentation

For a deeper dive into how the system is organized and how the ETL pipeline works, please check the [`docs/`](docs/) directory:
- [Project Structure & Architecture Guide](docs/project-structure.md)
- [Comprehensive ETL Pipeline Guide](docs/etl-pipeline-guide.md)
