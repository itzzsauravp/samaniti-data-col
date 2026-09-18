import "dotenv/config";
import { processPendingPdfExtractions } from "./extract-worker.js";
import { prisma } from "../db/loader.js";

(async () => {
  const rawLimit = parseInt(process.env.PDF_EXTRACT_LIMIT ?? "10", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;

  try {
    const result = await processPendingPdfExtractions(limit);
    console.log(
      `[pdf-extract] Processed ${result.processed} document(s): ${result.done} extracted, ${result.failed} failed, ${result.skipped} skipped (non-PDF).`,
    );
  } catch (err) {
    console.error("[pdf-extract] Fatal error:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();