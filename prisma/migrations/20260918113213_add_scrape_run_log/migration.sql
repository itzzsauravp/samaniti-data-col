-- CreateTable
CREATE TABLE "scrape_run_logs" (
    "id" TEXT NOT NULL,
    "municipality_code" TEXT,
    "site_code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "pages_crawled" INTEGER NOT NULL DEFAULT 0,
    "projects_count" INTEGER NOT NULL DEFAULT 0,
    "reports_count" INTEGER NOT NULL DEFAULT 0,
    "notices_count" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "scrape_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scrape_run_logs_site_code_started_at_idx" ON "scrape_run_logs"("site_code", "started_at");

