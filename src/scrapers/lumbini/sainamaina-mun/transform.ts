import * as cheerio from "cheerio";
import {
  DocumentData,
  EtlPayload,
  MunicipalityData,
  ProjectData,
  ReportData,
  NoticeData,
} from "../../../core/types/domain.js";
import { ScrapedPage } from "../../../core/contracts/scraper.interface.js";
import { parseNepaliFiscalYear } from "../../../core/utils/index.js";
import { downloadAndSaveDocument } from "../../../core/utils/file-download.js";
import { isRecordExisting } from "../../../core/db/loader.js";
import path from "node:path";

export const MUNICIPALITY_CODE = "SAINAMAINA";

export const MUNICIPALITY_METADATA: MunicipalityData = {
  code: MUNICIPALITY_CODE,
  nameNe: "सैनामैना नगरपालिका",
  nameEn: "Sainamaina Municipality",
  province: "Lumbini",
  district: "Rupandehi",
};

// ---------------------------------------------------------------------------
// Shared helper — always creates a DocumentData, even if download fails
// ---------------------------------------------------------------------------

async function buildDocument(
  fileUrl: string,
  titleNe: string,
  publishedDate: string | null,
  type: string,
  rootFolder: string,
): Promise<DocumentData> {
  const base = "https://sainamainamun.gov.np";
  const absoluteUrl = fileUrl.startsWith("http")
    ? fileUrl
    : `${base}${fileUrl}`;

  const result = await downloadAndSaveDocument(
    MUNICIPALITY_METADATA.province,
    MUNICIPALITY_METADATA.code,
    absoluteUrl,
    titleNe,
    publishedDate,
    type,
    rootFolder,
  );

  const rawFileName =
    absoluteUrl.split("/").pop()?.split("?")[0] || "attachment.pdf";
  const fileName = decodeURIComponent(rawFileName);

  return {
    fileName,
    fileType: absoluteUrl.endsWith(".pdf") ? "application/pdf" : null,
    originalUrl: absoluteUrl,
    storagePath: result.storagePath,
    downloadStatus: result.downloadStatus,
    downloadError: result.downloadError,
  };
}

// ---------------------------------------------------------------------------
// 1. Reports Transformer
// ---------------------------------------------------------------------------

async function transformReports(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  const $ = cheerio.load(page.html);
  const type =
    $("h3.section-title.border span").text().trim() ||
    $("h3.section-title span").text().trim() ||
    $("h3.section-title").text().trim() ||
    "Annual Report";

  const reports: ReportData[] = [];

  for (const el of $(".view-content .views-row").toArray()) {
    const $item = $(el);

    const $titleLink = $item.find(".views-field-title a");
    const titleNe = $titleLink.text().trim() || "शीर्षक उपलब्ध छैन";
    let rawSourceUrl;

    if (titleNe) {
      rawSourceUrl = `/ne/content/${titleNe.split("").join("-")}`;
    }
    rawSourceUrl = $titleLink.attr("href") || page.url;
    const publishedDate =
      $item.find(".views-field-created .field-content").text().trim() || null;

    const rawFileUrl =
      $item.find(".views-field-field-documents a").attr("href") || null;

    const base = "https://sainamainamun.gov.np";
    const sourceUrl = rawSourceUrl.startsWith("http")
      ? rawSourceUrl
      : `${base}${rawSourceUrl}`;

    if (await isRecordExisting(sourceUrl)) {
      console.log(`[Delta Skip] Report exists: ${sourceUrl}`);
      continue;
    }

    const documents: DocumentData[] = [];
    if (rawFileUrl) {
      documents.push(
        await buildDocument(
          rawFileUrl,
          titleNe,
          publishedDate,
          type,
          "reports",
        ),
      );
    }

    reports.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      type,
      fiscalYear: parseNepaliFiscalYear(titleNe) || null,
      publishedDate,
      sourceUrl,
      documents,
    });
  }

  if (reports.length === 0 && page.url) {
    const titleNe =
      $("h3.section-title span").text().trim() ||
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h1").text().trim() ||
      type;

    const documents: DocumentData[] = [];
    for (const el of $(
      ".field-name-field-supporting-documents a, .field-type-file a, .file a",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl) continue;
      documents.push(
        await buildDocument(rawFileUrl, titleNe, null, type, "reports"),
      );
    }

    reports.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      type,
      fiscalYear: parseNepaliFiscalYear(titleNe) || null,
      publishedDate: null,
      sourceUrl: page.url,
      documents,
    });
  }

  return { reports };
}

// ---------------------------------------------------------------------------
// 2. Projects Transformer
// ---------------------------------------------------------------------------

async function transformProject(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  const $ = cheerio.load(page.html);
  const type =
    $("h3.section-title.border span").text().trim() ||
    $("h3.section-title span").text().trim() ||
    $("h3.section-title").text().trim() ||
    "Unknown";

  let folderType = "project";
  if (
    page.type === "budgetProgramDetail" ||
    page.url.includes("budget-program")
  ) {
    folderType = "budget_program";
  } else if (
    page.type === "planProjectDetail" ||
    page.url.includes("plan-project")
  ) {
    folderType = "plan_project";
  }

  const projects: ProjectData[] = [];
  const rows = $(".introduction .views-row").toArray();

  if (rows.length > 0) {
    for (const el of rows) {
      const $item = $(el);
      const $titleLink = $item.find(".views-field-title a");
      let rawSourceUrl;
      const titleNe = $titleLink.text().trim() || "शीर्षक उपलब्ध छैन";
      //
      if (titleNe) {
        rawSourceUrl = `/ne/content/${titleNe.split("").join("-")}`;
      }
      rawSourceUrl = $titleLink.attr("href") || page.url;
      const base = "https://sainamainamun.gov.np";
      const sourceUrl = rawSourceUrl.startsWith("http")
        ? rawSourceUrl
        : `${base}${rawSourceUrl}`;

      if (await isRecordExisting(sourceUrl)) {
        console.log(`[Delta Skip] Project exists: ${sourceUrl}`);
        continue;
      }

      const rawFileUrl =
        $item.find(".views-field-field-documents a").attr("href") || null;

      const documents: DocumentData[] = [];
      if (rawFileUrl) {
        documents.push(
          await buildDocument(rawFileUrl, titleNe, null, folderType, "project"),
        );
      }

      projects.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        budgetAmount: null,
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        status: "",
        wardNo: null,
        type,
        sourceUrl,
        documents,
      });
    }
  } else {
    const titleNe =
      $("h3.section-title span").text().trim() ||
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h3.section-title").text().trim() ||
      $("h1").text().trim() ||
      "शीर्षक उपलब्ध छैन";

    const documents: DocumentData[] = [];
    for (const el of $(
      ".field-name-field-supporting-documents a, .field-type-file a, .file a",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl) continue;
      documents.push(
        await buildDocument(rawFileUrl, titleNe, null, folderType, "project"),
      );
    }

    projects.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null, // TODO: Data cleaning later
      budgetAmount: null,
      fiscalYear: parseNepaliFiscalYear(titleNe) || null,
      status: "",
      wardNo: null,
      type,
      sourceUrl: page.url,
      documents,
    });
  }

  return { projects };
}

// ---------------------------------------------------------------------------
// 3. Notices Transformer
// ---------------------------------------------------------------------------

async function transformNotice(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  const $ = cheerio.load(page.html);
  const type =
    $("h3.section-title.border span").text().trim() ||
    $("h3.section-title span").text().trim() ||
    $("h3.section-title").text().trim() ||
    "Notice";

  let folderType = "notices";
  if (page.url.includes("decisions")) {
    folderType = "decisions";
  } else if (page.url.includes("tax-and-fees")) {
    folderType = "tax_and_fees";
  } else if (page.url.includes("news-notice")) {
    folderType = "news_notice";
  } else if (page.url.includes("public-procurement-tender-notices")) {
    folderType = "tenders";
  } else if (page.url.includes("act-law-directives")) {
    folderType = "acts_laws";
  }

  const notices: NoticeData[] = [];
  const rows = $(".view-content .views-row").toArray();

  if (rows.length > 0) {
    for (const el of rows) {
      const $item = $(el);
      const $titleLink = $item.find(".views-field-title a");
      const titleNe = $titleLink.text().trim();
      let rawSourceUrl;

      // since the link to visit is structured like ${base}/ne/content/${titleNe}
      if (titleNe) {
        rawSourceUrl = `/ne/content/${titleNe}`;
      }

      rawSourceUrl = $titleLink.attr("href") || page.url; // Produces literal concrete link with jargons, try not to keep the link like this as much as possible
      const publishedDate =
        $item.find(".views-field-created .field-content").text().trim() || null;
      const base = "https://sainamainamun.gov.np";
      const sourceUrl = rawSourceUrl.startsWith("http")
        ? rawSourceUrl
        : `${base}${rawSourceUrl}`;

      if (await isRecordExisting(sourceUrl)) {
        console.log(`[Delta Skip] Notice exists: ${sourceUrl}`);
        continue;
      }

      const rawFileUrl =
        $item.find(".views-field-field-documents a").attr("href") || null;

      const documents: DocumentData[] = [];
      if (rawFileUrl) {
        documents.push(
          await buildDocument(
            rawFileUrl,
            titleNe,
            publishedDate,
            folderType,
            "notices",
          ),
        );
      }

      notices.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        contentNe: null,
        type,
        publishedDate,
        sourceUrl,
        documents,
      });
    }
  } else {
    const titleNe =
      $("h3.section-title span").text().trim() ||
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h1").text().trim() ||
      type;

    const contentNe = $(".field-name-body .field-item").text().trim() || null;

    const documents: DocumentData[] = [];
    for (const el of $(
      ".field-name-field-supporting-documents a, .field-type-file a, .file a",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl) continue;
      documents.push(
        await buildDocument(rawFileUrl, titleNe, null, folderType, "notices"),
      );
    }

    notices.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      contentNe,
      type,
      publishedDate: null,
      sourceUrl: page.url,
      documents,
    });
  }

  return { notices };
}

// ---------------------------------------------------------------------------
// Transformer registry (Exactly 3 transformers)
// ---------------------------------------------------------------------------

const TRANSFORMERS: Record<
  string,
  (page: ScrapedPage) => Promise<Partial<EtlPayload>>
> = {
  report: transformReports,
  reportDetail: transformReports,
  project: transformProject,
  projectDetail: transformProject,
  budgetProgramDetail: transformProject,
  planProjectDetail: transformProject,
  notice: transformNotice,
  noticeDetail: transformNotice,
  notices: transformNotice,
};

// ---------------------------------------------------------------------------
// Main transform entry point
// ---------------------------------------------------------------------------
export async function transform(pages: ScrapedPage[]): Promise<EtlPayload> {
  let merged: Partial<EtlPayload> = {};

  for (const page of pages) {
    const handler =
      TRANSFORMERS[page.type] || TRANSFORMERS[page.type.toLowerCase()];
    if (!handler) {
      console.warn(
        `[transform] No handler registered for page type '${page.type}'. Skipping.`,
      );
      continue;
    }
    const partial = await handler(page);

    merged = {
      ...merged,
      ...partial,
      projects: [...(merged.projects ?? []), ...(partial.projects ?? [])],
      reports: [...(merged.reports ?? []), ...(partial.reports ?? [])],
      notices: [...(merged.notices ?? []), ...(partial.notices ?? [])],
    };
  }

  return {
    municipality: MUNICIPALITY_METADATA,
    ...merged,
  };
}
