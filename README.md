# Samaniti Data Collection & ETL Monorepo

TypeScript web scraping and ETL pipeline monorepo designed to extract, transform, and load (ETL) public local government portal data (municipalities, profiles, projects, reports, notices) across Nepal.

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
│   │   ├── scraper/        # Crawlee crawler configuration
│   │   ├── types/          # Shared domain types
│   │   └── utils/          # File download and helper utilities
│   └── scrapers/
│       └── lumbini/
│           └── sainamaina-mun/  # Sainamaina Municipality scraper (index, extract, transform, utils)
└── package.json
```

---

## Scripts

- `npm run build`: Compile TypeScript code to JavaScript (`dist/`)
- `npm start`: Run the compiled main application
- `npm run db:generate`: Generate Prisma client
- `npm run scraper:sainamaina`: Run the Sainamaina Municipality ETL scraper

---

## License

This project is licensed under the [MIT License](LICENSE).
