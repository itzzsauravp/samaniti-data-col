-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "extracted_text" TEXT,
ADD COLUMN     "extraction_method" TEXT,
ADD COLUMN     "extraction_status" TEXT NOT NULL DEFAULT 'pending';