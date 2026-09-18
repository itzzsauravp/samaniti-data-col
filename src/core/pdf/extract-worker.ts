import fs from "node:fs/promises";
import path from "node:path";
import { Document as MupdfDocument } from "mupdf";
import mupdf from "mupdf";
import { OEM, createWorker } from "tesseract.js";
import { prisma } from "../db/loader.js";

export type ExtractionMethod = "native" | "ocr" | "failed";

export interface PdfExtractionResult {
  text: string | null;
  method: ExtractionMethod;
  error?: string;
}

export interface PdfExtractConfig {
  minTextChars: number;
  tesseractLang: string;
  tessdataDir: string;
  ocrZoom: number;
}

export interface PdfExtractionBatchResult {
  processed: number;
  done: number;
  failed: number;
  skipped: number;
}

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function loadPdfExtractConfigFromEnv(): PdfExtractConfig {
  return {
    minTextChars: parsePositiveIntEnv("PDF_TEXT_MIN_CHARS", 80),
    tesseractLang: process.env.TESSERACT_LANG?.trim() || "nep+eng",
    tessdataDir:
      process.env.TESSDATA_DIR ??
      path.join(process.cwd(), "assets", "tessdata"),
    ocrZoom: parsePositiveIntEnv("PDF_OCR_ZOOM", 3),
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

function hasMeaningfulText(text: string, minChars: number): boolean {
  return text.replace(/\s+/g, "").length >= minChars;
}

function openDoc(data: Uint8Array | Buffer): MupdfDocument {
  return mupdf.Document.openDocument(data, "application/pdf");
}

async function extractNativePdfText(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  const doc = openDoc(data);
  try {
    const pageCount = doc.countPages();
    const parts: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      try {
        const stext = page.toStructuredText(null);
        try {
          parts.push(stext.asText());
        } finally {
          stext.destroy();
        }
      } finally {
        page.destroy();
      }
    }
    return parts.join("\n\n");
  } finally {
    doc.destroy();
  }
}

async function rasterizePdfPages(filePath: string, zoom: number): Promise<Buffer[]> {
  const data = await fs.readFile(filePath);
  const doc = openDoc(data);
  try {
    const pageCount = doc.countPages();
    const pages: Buffer[] = [];
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      try {
        const pixmap = page.toPixmap(
          mupdf.Matrix.scale(zoom, zoom),
          mupdf.ColorSpace.DeviceRGB,
          false,
        );
        try {
          pages.push(Buffer.from(pixmap.asPNG()));
        } finally {
          pixmap.destroy();
        }
      } finally {
        page.destroy();
      }
    }
    return pages;
  } finally {
    doc.destroy();
  }
}

async function extractOcrPdfText(
  filePath: string,
  config: PdfExtractConfig,
): Promise<string> {
  const pageImages = await rasterizePdfPages(filePath, config.ocrZoom);

  const worker = await createWorker(config.tesseractLang, OEM.LSTM_ONLY, {
    langPath: config.tessdataDir,
    cachePath: config.tessdataDir,
    cacheMethod: "none",
    gzip: false,
    logger: (message) => {
      if (message.status === "recognizing text") {
        console.log(`  [OCR] ${message.workerId} ${Math.round(message.progress * 100)}%`);
      }
    },
  });
  try {
    const parts: string[] = [];
    for (const png of pageImages) {
      const { data } = await worker.recognize(png);
      parts.push(data.text);
    }
    return parts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

export async function extractPdfText(
  filePath: string,
  config: PdfExtractConfig = loadPdfExtractConfigFromEnv(),
): Promise<PdfExtractionResult> {
  try {
    const nativeText = await extractNativePdfText(filePath);
    if (hasMeaningfulText(nativeText, config.minTextChars)) {
      return { text: nativeText, method: "native" };
    }
    console.log(
      `[PDF] Native text too sparse (${nativeText.replace(/\s+/g, "").length} chars); falling back to OCR.`,
    );
  } catch (err) {
    console.warn(`[PDF] Native extraction failed (${errorMessage(err)}); falling back to OCR.`);
  }

  try {
    console.log(`[PDF] Running tesseract OCR (${config.tesseractLang}) on ${filePath}...`);
    const ocrText = await extractOcrPdfText(filePath, config);
    return { text: ocrText, method: "ocr" };
  } catch (err) {
    return { text: null, method: "failed", error: errorMessage(err) };
  }
}

export async function processPendingPdfExtractions(
  limit = 10,
  config: PdfExtractConfig = loadPdfExtractConfigFromEnv(),
): Promise<PdfExtractionBatchResult> {
  const pending = await prisma.document.findMany({
    where: { downloadStatus: "ok", extractionStatus: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, fileName: true, storagePath: true, fileType: true },
  });

  let done = 0;
  let failed = 0;
  let skipped = 0;

  for (const doc of pending) {
    const fileType = doc.fileType?.toLowerCase() ?? "";
    const isPdf =
      fileType === "application/pdf" ||
      doc.fileName.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { extractionStatus: "skipped" },
      });
      skipped++;
      continue;
    }

    if (!doc.storagePath) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { extractionStatus: "failed" },
      });
      failed++;
      continue;
    }

    const filePath = path.isAbsolute(doc.storagePath)
      ? doc.storagePath
      : path.join(process.cwd(), doc.storagePath);

    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { extractionStatus: "failed" },
      });
      failed++;
      continue;
    }

    const result = await extractPdfText(filePath, config);
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        extractedText: result.text,
        extractionStatus: result.method === "failed" ? "failed" : "done",
        extractionMethod: result.method === "failed" ? null : result.method,
      },
    });

    if (result.method === "failed") {
      failed++;
      console.error(`[PDF] Extraction failed for ${doc.fileName}: ${result.error ?? "unknown error"}`);
    } else {
      done++;
      console.log(`[PDF] ${result.method} extracted ${result.text?.length ?? 0} char(s) — ${doc.fileName}`);
    }
  }

  return { processed: pending.length, done, failed, skipped };
}