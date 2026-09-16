/*
  Warnings:

  - You are about to drop the column `notice_type` on the `notices` table. All the data in the column will be lost.
  - You are about to drop the column `report_type` on the `reports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notices" DROP COLUMN "notice_type",
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "reports" DROP COLUMN "report_type",
ADD COLUMN     "type" TEXT;
