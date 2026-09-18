# Samaniti Data Collection & ETL Monorepo

TypeScript web scraping and ETL pipeline monorepo designed to extract, transform, and load (ETL) public local government portal data (municipalities, profiles, projects, reports, notices) across Nepal.

---

## What It Does

- **Crawls & Scrapes Municipal Portals**: Leverages Crawlee and Cheerio to dynamically crawl listings, pagination, and document links across local government websites in Nepal (e.g., Lumbini Province municipalities like Sainamaina and Kanchan).
- **Parses & Transforms**: Cleans and normalizes HTML content into structured domain entities (Projects, Reports, Notices, Municipality Profiles) with support for Nepali fiscal years, dates, and file attachments.
- **Local Storage & Database ETL**: Automatically downloads document attachments (PDFs, docs) into organized local storage directories (`storage/`) and upserts records reliably into PostgreSQL using Prisma ORM.
- **Dynamic Scraper Runner**: Provides a flexible CLI utility (`runner.ts`) to run any municipality scraper dynamically across provinces and municipalities.

---

## Tech Stack

- **Language**: TypeScript (Node.js)
- **Scraping / Parsing**: Crawlee, Cheerio, Undici
- **Database / ORM**: PostgreSQL, Prisma
- **Utilities**: `nepali-date-converter`, `dotenv`, `tsx`

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
   Copy the example environment file and update it with your database credentials and configuration options:

    ```bash
    cp .env.example .env
    ```

    Update `.env`:

    ```env
    DATABASE_URL='postgres://username:password@localhost:5432/samanitidb?schema=public'

    # Optional: Skip file downloads if desired
    SKIP_FILE_DOWNLOADS=false

    # Optional: Timeout for file downloads in milliseconds
    FILE_DOWNLOAD_TIMEOUT_MS=60000
    ```

4. **Initialize the Database**:
   Generate the Prisma client and run migrations against your PostgreSQL database:
    ```bash
    npm run db:generate
    npx prisma db push
    ```

---

## Running Scrapers

Use the dynamic runner script to execute any municipality scraper by specifying its `<province>:<municipality>`:

```bash
npm run scraper lumbini:sainamaina
npm run scraper lumbini:kanchan
```

If run without arguments, it will automatically list all available province and municipality scrapers in the repository.

---

## Project Structure

```tree
├── prisma/
│   ├── migrations/         # Database migrations
│   └── schema.prisma       # Prisma database schema (Municipalities, Projects, Reports, Notices)
├── src/
│   ├── core/
│   │   ├── constants/      # Shared constants & base transformers
│   │   ├── contracts/      # Scraper interfaces and base contracts
│   │   ├── db/             # Database loader and persistence logic
│   │   ├── scraper/        # Crawlee crawler configuration
│   │   ├── types/          # Shared domain types
│   │   └── utils/          # File download, HTML, pagination, and helper utilities
│   └── scrapers/
│       └── lumbini/
│           ├── sainamaina-mun/  # Sainamaina Municipality scraper
│           └── kanchan-mun/     # Kanchan Municipality scraper
├── runner.ts               # Dynamic CLI runner utility
└── package.json
```

---

## Scripts

- `npm run build`: Compile TypeScript code to JavaScript (`dist/`)
- `npm run scraper <province>:<municipality>`: Run any municipality ETL scraper dynamically (e.g. `npm run scraper lumbini:sainamaina`)
- `npm run db:generate`: Generate Prisma client
- `npm run db:push`: Push Prisma schema to database
- `npm run lint`: Run ESLint

---

## License

This project is licensed under the [MIT License](LICENSE).
