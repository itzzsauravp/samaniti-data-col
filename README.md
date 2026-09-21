# Samaniti Data Collection & ETL Monorepo

TypeScript web scraping and ETL pipeline monorepo designed to extract, transform, and load (ETL) public local government portal data (municipalities, profiles, projects, reports, notices) across Nepal.

---

## What It Does

- **Crawls & Scrapes Municipal Portals**: Leverages Crawlee and Cheerio to dynamically crawl listings, pagination, and document links across local government websites in Nepal.
- **Parses & Transforms**: Cleans and normalizes HTML content into structured domain entities.
- **Telemetry & Logging**: Automatically tracks scraper run executions, durations, counts, status, and batch lineage (`runId`) in PostgreSQL.
- **Local Storage & Database ETL**: Downloads document attachments (PDFs, docs) and upserts records reliably into PostgreSQL using Prisma ORM.

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

4. **Initialize the Database**:
    ```bash
    npx prisma db push --accept-data-loss
    npm run db:generate
    ```

---

## Documentation

For detailed information on the project architecture, ETL pipeline, and how to configure custom scrapers, please refer to the `docs/` directory:

- [Project Structure & Architecture](docs/project-structure.md)
- [Comprehensive ETL Pipeline Guide](docs/etl-pipeline-guide.md)
