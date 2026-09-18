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
    parseNepaliFiscalYear,
    extractTitle,
    extractDocumentLinks,
} from "../../../core/utils/index.js";
import { Cheerio } from "crawlee";
import { getFileMetadata } from "../../../core/utils/file.js";

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
    _titleNe?: string,
    _publishedDate?: string | null,
): Promise<DocumentData> {
    const base = "https://sainamainamun.gov.np";
    const absoluteUrl = fileUrl.startsWith("http") ? fileUrl : `${base}${fileUrl}`;
    const rawFileName = absoluteUrl.split("/").pop()?.split("?")[0] || "attachment.pdf";
    const fileName = decodeURIComponent(rawFileName);

    return {
        fileName,
        fileType: getFileMetadata(fileName).mimeType,
        originalUrl: absoluteUrl,
        storagePath: null,
        downloadStatus: "pending",
        downloadError: null,
    };
}

// ---------------------------------------------------------------------------
// Shared transformers for listing rows
// ---------------------------------------------------------------------------

/**
 * Transforms a single row from a listing page into a Project record.
 */
async function transformProjectRow(
    $: cheerio.CheerioAPI,
    row: cheerio.Cheerio<any>,
    baseUrl: string,
    category: string,
): Promise<ProjectData> {
    const $titleLink = row.find("h2 a, .views-field-title a").first();
    const titleNe = $titleLink.text().trim().replace(/\s+/g, " ") || "";
    const rawHref = $titleLink.attr("href") || "";
    const sourceUrl = rawHref
        ? rawHref.startsWith("http")
            ? rawHref
            : `${baseUrl}${rawHref}`
        : "";

    // Collect file attachments in the row
    const docElements = row.find(".file a, a[href$='.pdf']").toArray();
    const documents: DocumentData[] = [];
    for (const docEl of docElements) {
        const rawFileUrl = $(docEl).attr("href");
        if (!rawFileUrl || rawFileUrl.startsWith("data:")) continue;
        const fileUrl = rawFileUrl.startsWith("http") ? rawFileUrl : `${baseUrl}${rawFileUrl}`;
        documents.push(await buildDocument(fileUrl, titleNe, null));
    }

    // If the link itself is a PDF
    if (documents.length === 0 && sourceUrl.endsWith(".pdf")) {
        documents.push(await buildDocument(sourceUrl, titleNe, null));
    }

    return {
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        budgetAmount: null,
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        status: "",
        wardNo: null,
        type: category,
        sourceUrl: decodeURIComponent(sourceUrl),
        documents,
    };
}

/**
 * Transforms a single row from a listing page into a Report record.
 */
async function transformReportRow(
    $: cheerio.CheerioAPI,
    row: cheerio.Cheerio<any>,
    baseUrl: string,
    category: string,
): Promise<ReportData> {
    const $titleLink = row.find(".views-field-title a");
    const titleNe = $titleLink.text().trim() || "";
    const rawSourceUrl = $titleLink.attr("href") || "";
    const publishedDate = row.find(".views-field-created .field-content").text().trim() || null;

    const rawFileUrl = row.find(".views-field-field-documents a").attr("href") || null;

    const sourceUrl = rawSourceUrl.startsWith("http") ? rawSourceUrl : `${baseUrl}${rawSourceUrl}`;

    const documents: DocumentData[] = [];
    if (rawFileUrl) {
        documents.push(await buildDocument(rawFileUrl, titleNe, publishedDate));
    }

    return {
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        type: category,
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        publishedDate,
        sourceUrl: decodeURIComponent(sourceUrl),
        documents,
    };
}

/**
 * Transforms a single row from a listing page into a Notice record.
 */
async function transformNoticeRow(
    $: cheerio.CheerioAPI,
    row: cheerio.Cheerio<any>,
    baseUrl: string,
    category: string,
): Promise<NoticeData> {
    const $titleLink = row.find(".views-field-title a");
    const titleNe = $titleLink.text().trim() || "";
    const rawSourceUrl = $titleLink.attr("href") || "";

    const sourceUrl = rawSourceUrl.startsWith("http") ? rawSourceUrl : `${baseUrl}${rawSourceUrl}`;

    return {
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        contentNe: null,
        type: category,
        publishedDate: null,
        sourceUrl: decodeURIComponent(sourceUrl),
        documents: [],
    };
}

// ---------------------------------------------------------------------------
// Detail page transformers
// ---------------------------------------------------------------------------

/**
 * Transforms a project detail page.
 */
async function transformProjectDetail(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;

    const titleNe = extractTitle($);
    const documents = await Promise.all(
        extractDocumentLinks($, baseUrl).map((url) => buildDocument(url, titleNe, null)),
    );

    console.log(`[Project Detail] "${titleNe}" | docs: ${documents.length} | url: ${page.url}`);

    return {
        projects: [
            {
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
            },
        ],
    };
}

/**
 * Transforms a report detail page.
 */
async function transformReportDetail(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;

    const titleNe = extractTitle($);
    const documents = await Promise.all(
        extractDocumentLinks($, baseUrl).map((url) => buildDocument(url, titleNe, null)),
    );

    return {
        reports: [
            {
                municipalityCode: MUNICIPALITY_CODE,
                titleNe,
                titleEn: null,
                type: page.category,
                fiscalYear: parseNepaliFiscalYear(titleNe) || null,
                publishedDate: null,
                sourceUrl: decodeURIComponent(page.url),
                documents,
            },
        ],
    };
}

/**
 * Transforms a notice detail page.
 */
async function transformNoticeDetail(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const titleNe = extractTitle($);
    const documents = await Promise.all(
        extractDocumentLinks($, new URL(page.url).origin).map((url) =>
            buildDocument(url, titleNe, null),
        ),
    );

    return {
        notices: [
            {
                municipalityCode: MUNICIPALITY_CODE,
                titleNe,
                titleEn: null,
                contentNe: $(".node-content, .content").text().trim() || null,
                type: page.category,
                publishedDate: null,
                sourceUrl: decodeURIComponent(page.url),
                documents,
            },
        ],
    };
}

// ---------------------------------------------------------------------------
// Listing page transformers
// ---------------------------------------------------------------------------

async function transformProjectListing(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;
    const rows = $(".views-row").toArray();

    console.log(`[Project Listing] ${rows.length} row(s) found on ${page.url}`);

    const projects = await Promise.all(
        rows.map((row) => transformProjectRow($, $(row), baseUrl, page.category || "")),
    );

    return { projects };
}

async function transformReportListing(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;
    const rows = $(".views-row").toArray();

    const reports = await Promise.all(
        rows.map((row) => transformReportRow($, $(row), baseUrl, page.category || "")),
    );

    return { reports };
}

async function transformNoticeListing(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;
    const rows = $(".views-row").toArray();

    const notices = await Promise.all(
        rows.map((row) => transformNoticeRow($, $(row), baseUrl, page.category || "")),
    );

    return { notices };
}

// ---------------------------------------------------------------------------
// Main transform function - routes to correct handler based on routeType
// ---------------------------------------------------------------------------

const TRANSFORMERS: Record<string, (page: ScrapedPage) => Promise<Partial<EtlPayload>>> = {
    // Reports
    report: transformReportListing,
    reportDetail: transformReportDetail,

    // Projects
    project: transformProjectListing,
    projectDetail: transformProjectDetail,

    // Notices
    notice: transformNoticeListing,
    noticeDetail: transformNoticeDetail,
};

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
