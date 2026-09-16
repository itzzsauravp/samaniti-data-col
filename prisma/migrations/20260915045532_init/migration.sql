-- CreateTable
CREATE TABLE "municipalities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_ne" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipality_profiles" (
    "id" TEXT NOT NULL,
    "established_bs" TEXT,
    "total_wards" INTEGER,
    "population" INTEGER,
    "area_sq_km" DOUBLE PRECISION,
    "included_vdcs_ne" TEXT,
    "email" TEXT,
    "website" TEXT,
    "facebook_page" TEXT,
    "mobile_no" TEXT,
    "twitter_handle" TEXT,
    "total_schools" INTEGER,
    "municipality_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipality_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "title_ne" TEXT NOT NULL,
    "title_en" TEXT,
    "budget_amount" DECIMAL(65,30),
    "fiscal_year" TEXT,
    "status" TEXT,
    "ward_no" INTEGER,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "title_ne" TEXT NOT NULL,
    "title_en" TEXT,
    "report_type" TEXT,
    "fiscal_year" TEXT,
    "published_date" TEXT,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,
    "title_ne" TEXT NOT NULL,
    "title_en" TEXT,
    "content_ne" TEXT,
    "notice_type" TEXT,
    "published_date" TEXT,
    "source_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT,
    "original_url" TEXT NOT NULL,
    "storage_path" TEXT,
    "project_id" TEXT,
    "report_id" TEXT,
    "notice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_code_key" ON "municipalities"("code");

-- CreateIndex
CREATE UNIQUE INDEX "municipality_profiles_municipality_id_key" ON "municipality_profiles"("municipality_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_source_url_key" ON "projects"("source_url");

-- CreateIndex
CREATE UNIQUE INDEX "reports_source_url_key" ON "reports"("source_url");

-- CreateIndex
CREATE UNIQUE INDEX "notices_source_url_key" ON "notices"("source_url");

-- AddForeignKey
ALTER TABLE "municipality_profiles" ADD CONSTRAINT "municipality_profiles_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notices" ADD CONSTRAINT "notices_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
