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
import {
  extractSlugFromUrl,
  parseNepaliFiscalYear,
} from "../../../core/utils/index.js";
import { isRecordExisting } from "../../../core/db/loader.js";

export const MUNICIPALITY_CODE = "SAINAMAINA";

export const MUNICIPALITY_METADATA: MunicipalityData = {
  code: MUNICIPALITY_CODE,
  nameNe: "सैनामैना नगरपालिका",
  nameEn: "Sainamaina Municipality",
  province: "Lumbini",
  district: "Rupandehi",
};

// ---------------------------------------------------------------------------
// Shared document builder
// ---------------------------------------------------------------------------

export async function buildDocument(
  fileUrl: string,
  titleNe: string,
  publishedDate: string | null,
): Promise<DocumentData> {
  const base = "https://sainamainamun.gov.np";
  const absoluteUrl = fileUrl.startsWith("http")
    ? fileUrl
    : `${base}${fileUrl}`;
  const rawFileName =
    absoluteUrl.split("/").pop()?.split("?")[0] || "attachment.pdf";
  const fileName = decodeURIComponent(rawFileName);

  return {
    fileName,
    fileType: absoluteUrl.endsWith(".pdf") ? "application/pdf" : null,
    originalUrl: absoluteUrl,
    storagePath: null,
    downloadStatus: "pending",
    downloadError: null,
  };
}

// ---------------------------------------------------------------------------
// 1. Projects Transformers
// ---------------------------------------------------------------------------

/**
 * Transforms an individual project detail page visited by the crawler.
 */
async function transformProjectDetail(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  const $ = cheerio.load(page.html);
  const baseUrl = new URL(page.url).origin;

  const titleNe =
    $('span[property="dc:title"]').attr("content")?.trim() ||
    $(".section-title").text().trim() ||
    $("h1").text().trim() ||
    "";

  const documents: DocumentData[] = [];

  const docElements = $(
    ".field-name-field-supporting-documents a, .field-type-file a, .file a, a[href$='.pdf'], a[href*='.pdf']",
  ).toArray();

  const hrefs = docElements
    .map((el) => $(el).attr("href"))
    .filter(
      (href): href is string =>
        Boolean(href) && !(href as string).startsWith("data:"),
    );

  console.log("These are extracted hrefs:", hrefs);
  console.log("These are doc elements:", docElements);

  for (const el of docElements) {
    const rawFileUrl = $(el).attr("href");
    if (!rawFileUrl || rawFileUrl.startsWith("data:")) continue;
    const fileUrl = rawFileUrl.startsWith("http")
      ? rawFileUrl
      : `${baseUrl}${rawFileUrl}`;
    documents.push(await buildDocument(fileUrl, titleNe, null));
  }

  const project: ProjectData = {
    municipalityCode: MUNICIPALITY_CODE,
    titleNe,
    titleEn: null,
    budgetAmount: null,
    fiscalYear: parseNepaliFiscalYear(titleNe) || null,
    status: "",
    wardNo: null,
    sourceUrl: decodeURIComponent(page.url),
    documents,
    type: page.category,
  };

  console.log(
    `[Project Detail] "${project.titleNe}" | docs: ${documents.length} | url: ${project.sourceUrl}`,
  );
  return { projects: [project] };
}

/**
 * Transforms a table/listing page where items already contain their documents directly.
 */
async function transformProjectListing(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  const $ = cheerio.load(page.html);
  const baseUrl = new URL(page.url).origin;

  const projects: ProjectData[] = [];
  const rows = $(".views-row").toArray();
  console.log(`[Project Listing] ${rows.length} row(s) found on ${page.url}`);

  let index = 0;
  for (const el of rows) {
    const $item = $(el);
    const $titleLink = $item.find("h2 a, .views-field-title a").first();
    const titleNe = $titleLink.text().trim().replace(/\s+/g, " ") || "";

    const rawHref = $titleLink.attr("href") || "";
    const sourceUrl = rawHref
      ? rawHref.startsWith("http")
        ? rawHref
        : `${baseUrl}${rawHref}`
      : page.url;

    try {
      if (await isRecordExisting(sourceUrl)) {
        console.log(`  [Delta Skip] exists: ${sourceUrl}`);
        index++;
        continue;
      }
    } catch {
      // DB check offline, proceed
    }

    // Collect file attachments present directly in the listing row
    const docElements = $item.find(".file a, a[href$='.pdf']").toArray();
    const documents: DocumentData[] = [];
    for (const docEl of docElements) {
      const rawFileUrl = $(docEl).attr("href");
      if (!rawFileUrl || rawFileUrl.startsWith("data:")) continue;
      const fileUrl = rawFileUrl.startsWith("http")
        ? rawFileUrl
        : `${baseUrl}${rawFileUrl}`;
      documents.push(await buildDocument(fileUrl, titleNe, null));
    }

    // If the title link itself is a direct document
    if (
      documents.length === 0 &&
      (sourceUrl.endsWith(".pdf") || sourceUrl.includes(".pdf"))
    ) {
      documents.push(await buildDocument(sourceUrl, titleNe, null));
    }

    const project: ProjectData = {
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      budgetAmount: null,
      fiscalYear: parseNepaliFiscalYear(titleNe) || null,
      status: "",
      wardNo: null,
      type: page.category,
      sourceUrl: decodeURIComponent(sourceUrl),
      documents,
    };

    projects.push(project);
    index++;
  }

  return { projects };
}

async function transformProject(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  if (page.routeType === "projectDetail") {
    return transformProjectDetail(page);
  }
  const $ = cheerio.load(page.html);
  if (
    $('span[property="dc:title"]').length ||
    $(".node-article").length ||
    !$(".views-row").length
  ) {
    return transformProjectDetail(page);
  }
  return transformProjectListing(page);
}

// ---------------------------------------------------------------------------
// 2. Reports Transformer
// ---------------------------------------------------------------------------

async function transformReports(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  const $ = cheerio.load(page.html);
  const baseUrl = new URL(page.url).origin;
  const reports: ReportData[] = [];

  const rows = $(".views-row").toArray();

  if (rows.length > 0) {
    let index = 0;
    for (const el of rows) {
      const $item = $(el);

      const $titleLink = $item.find(".views-field-title a");
      const titleNe = $titleLink.text().trim() || "";
      const rawSourceUrl = $titleLink.attr("href") || page.url;
      const publishedDate =
        $item.find(".views-field-created .field-content").text().trim() || null;

      const rawFileUrl =
        $item.find(".views-field-field-documents a").attr("href") || null;

      const sourceUrl = rawSourceUrl.startsWith("http")
        ? rawSourceUrl
        : `${baseUrl}${rawSourceUrl}`;

      try {
        if (await isRecordExisting(sourceUrl)) {
          console.log(`  [Delta Skip] Report exists: ${sourceUrl}`);
          index++;
          continue;
        }
      } catch {
        // proceed
      }

      const documents: DocumentData[] = [];
      if (rawFileUrl) {
        documents.push(await buildDocument(rawFileUrl, titleNe, publishedDate));
      }

      reports.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        type: "",
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        publishedDate,
        sourceUrl,
        documents,
      });
      index++;
    }
  } else {
    // Detail page fallback
    const titleNe =
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h3.section-title").text().trim() ||
      $("h1").text().trim() ||
      "";

    const documents: DocumentData[] = [];
    for (const el of $(
      ".field-name-field-supporting-documents a, .field-type-file a, .file a, a[href$='.pdf']",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl || rawFileUrl.startsWith("data:")) continue;
      const fileUrl = rawFileUrl.startsWith("http")
        ? rawFileUrl
        : `${baseUrl}${rawFileUrl}`;
      documents.push(await buildDocument(fileUrl, titleNe, null));
    }

    reports.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      type: "",
      fiscalYear: parseNepaliFiscalYear(titleNe) || null,
      publishedDate: null,
      sourceUrl: decodeURIComponent(page.url),
      documents,
    });
  }

  return { reports };
}

// ---------------------------------------------------------------------------
// 3. Notices Transformer
// ---------------------------------------------------------------------------

async function transformNotice(
  page: ScrapedPage,
): Promise<Partial<EtlPayload>> {
  const $ = cheerio.load(page.html);
  const baseUrl = new URL(page.url).origin;
  const notices: NoticeData[] = [];
  const rows = $(".views-row").toArray();

  if (rows.length > 0) {
    for (const el of rows) {
      const $item = $(el);
      const $titleLink = $item.find(".views-field-title a");
      const titleNe = $titleLink.text().trim() || "";
      const rawSourceUrl = $titleLink.attr("href") || page.url;
      const sourceUrl = rawSourceUrl.startsWith("http")
        ? rawSourceUrl
        : `${baseUrl}${rawSourceUrl}`;

      try {
        if (await isRecordExisting(sourceUrl)) {
          console.log(`  [Delta Skip] Notice exists: ${sourceUrl}`);
          continue;
        }
      } catch {
        // proceed
      }

      notices.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        contentNe: null,
        type: "",
        publishedDate: null,
        sourceUrl: decodeURIComponent(sourceUrl),
        documents: [],
      });
    }
  } else {
    // Detail notice
    const titleNe =
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h3.section-title").text().trim() ||
      $("h1").text().trim() ||
      "";

    const documents: DocumentData[] = [];
    for (const el of $(
      ".field-name-field-supporting-documents a, .field-type-file a, .file a, a[href$='.pdf']",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl || rawFileUrl.startsWith("data:")) continue;
      const fileUrl = rawFileUrl.startsWith("http")
        ? rawFileUrl
        : `${baseUrl}${rawFileUrl}`;
      documents.push(await buildDocument(fileUrl, titleNe, null));
    }

    notices.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      contentNe: $(".node-content, .content").text().trim() || null,
      type: "",
      publishedDate: null,
      sourceUrl: decodeURIComponent(page.url),
      documents,
    });
  }

  return { notices };
}

// ---------------------------------------------------------------------------
// Transformer registry
// ---------------------------------------------------------------------------

const TRANSFORMERS: Record<
  string,
  (page: ScrapedPage) => Promise<Partial<EtlPayload>>
> = {
  report: transformReports,
  reportDetail: transformReports,
  reportdetail: transformReports,
  project: transformProject,
  projectDetail: transformProjectDetail,
  projectdetail: transformProjectDetail,
  budgetProgramDetail: transformProjectDetail,
  planProjectDetail: transformProjectDetail,
  notice: transformNotice,
  noticeDetail: transformNotice,
  noticedetail: transformNotice,
};

// ---------------------------------------------------------------------------
// Main transform entry point
// ---------------------------------------------------------------------------
export async function transform(pages: ScrapedPage[]): Promise<EtlPayload> {
  let merged: Partial<EtlPayload> = {};

  for (const page of pages) {
    const key = page.routeType;
    const handler = TRANSFORMERS[key] ?? TRANSFORMERS[key?.toLowerCase()];
    if (!handler) {
      console.warn(
        `[transform] No handler for routeType "${page.routeType}". Skipping ${page.url}`,
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
