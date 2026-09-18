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
    buildDocument,
} from "../../../core/utils/index.js";
import { unwatchFile } from "node:fs";
import { executeTransform } from "../../../core/constants/transformers.js";

export const MUNICIPALITY_CODE = "KANCHAN";

export const MUNICIPALITY_METADATA: MunicipalityData = {
    code: MUNICIPALITY_CODE,
    nameNe: "कञ्चन गाउँपालिका",
    nameEn: "Kanchan Rural Municipality",
    province: "Lumbini",
    district: "Rupandehi",
};

// ---------------------------------------------------------------------------
// Shared transformers for listing rows
// ---------------------------------------------------------------------------

/**
 * Transforms a single row from a listing page into a Project record.
 */
async function transformProjectRow(
    $: cheerio.CheerioAPI,
    row: cheerio.Cheerio<cheerio.Element>,
    baseUrl: string,
    category: string,
): Promise<ProjectData> {
    // 1. Title and Detail Source URL Extraction
    const titleAnchor = row.find(".views-field-title a, h2 a").first();
    const titleNe = titleAnchor.text().trim().replace(/\s+/g, " ") || "";
    const rawHref = titleAnchor.attr("href") || "";

    let sourceUrl = "";
    if (rawHref) {
        try {
            sourceUrl = decodeURIComponent(new URL(rawHref, baseUrl).href);
        } catch {
            sourceUrl = rawHref;
        }
    }

    // 2. Fiscal Year Extraction
    const fiscalYearAnchor = row.find(".views-field-field-fiscal-year a");
    const fiscalYearCellText = fiscalYearAnchor.text().trim();
    const fiscalYear = fiscalYearCellText || parseNepaliFiscalYear(titleNe) || null;

    // 3. Additional Metadata (Creation Date, Fiscal Year Link)
    const createdTd = row.find(".views-field-created");
    const dateCreated = createdTd.text().trim() || null;
    const rawFiscalYearHref = fiscalYearAnchor.attr("href") || "";

    let fiscalYearUrl: string | null = null;
    if (rawFiscalYearHref) {
        try {
            fiscalYearUrl = new URL(rawFiscalYearHref, baseUrl).href;
        } catch {
            fiscalYearUrl = rawFiscalYearHref;
        }
    }

    // 4. File attachments scoped strictly to this row
    const documents: DocumentData[] = extractDocumentLinks($, baseUrl, row);

    return {
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        budgetAmount: null,
        fiscalYear,
        status: "",
        wardNo: null,
        type: category || null,
        sourceUrl,
        documents,
        metadata: {
            dateCreated,
            fiscalYear,
        },
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
    // 1. Title and Detail Source URL Extraction
    const titleAnchor = row.find(".views-field-title a, h2 a").first();
    const titleNe = titleAnchor.text().trim().replace(/\s+/g, " ") || "";
    const rawHref = titleAnchor.attr("href") || "";

    let sourceUrl = "";
    if (rawHref) {
        try {
            sourceUrl = decodeURIComponent(new URL(rawHref, baseUrl).href);
        } catch {
            sourceUrl = rawHref;
        }
    }

    // 2. Fiscal Year Extraction
    const fiscalYearAnchor = row.find(".views-field-field-fiscal-year a");
    const fiscalYearCellText = fiscalYearAnchor.text().trim();
    const fiscalYear = fiscalYearCellText || parseNepaliFiscalYear(titleNe) || null;

    // 3. Additional Metadata (Creation Date, Fiscal Year Link)
    const createdTd = row.find(".views-field-created");
    const dateCreated = createdTd.text().trim() || null;

    // 4. File attachments scoped strictly to this row
    const documents: DocumentData[] = extractDocumentLinks($, baseUrl, row);

    return {
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        fiscalYear,
        type: category || null,
        sourceUrl,
        documents,
        publishedDate: dateCreated,
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
    const titleEl = row.find("h2 a");
    const dateEl = row.find('.meta.submitted span[property="dc:date dc:created"]');
    const docEl = row.find(".field-name-field-documents a");

    const titleNe = titleEl.text().trim() || "";
    const rawLink = titleEl.attr("href") || "";
    const sourceUrl = rawLink
        ? rawLink.startsWith("http")
            ? rawLink
            : `${baseUrl}${rawLink}`
        : "";

    const publishedDate = dateEl.attr("content") || dateEl.text().trim() || null;

    const documents: DocumentData[] = [];
    const docHref = docEl.attr("href");
    if (docHref) {
        const fullDocUrl = docHref.startsWith("http") ? docHref : `${baseUrl}${docHref}`;
        documents.push(
            await buildDocument(fullDocUrl, baseUrl, docEl.text().trim() || titleNe, publishedDate),
        );
    }

    return {
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        contentNe: null,
        type: category,
        publishedDate,
        sourceUrl: decodeURIComponent(sourceUrl),
        documents,
    };
}

// ---------------------------------------------------------------------------
// Detail page transformers
// ---------------------------------------------------------------------------

/**
 * Transforms a project detail page. (NOT USED)
 */
async function transformProjectDetail(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;

    const titleNe = extractTitle($);
    const documents = extractDocumentLinks($, baseUrl);

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
 * Transforms a report detail page. (NOT USED)
 */
async function transformReportDetail(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;

    const titleNe = extractTitle($);
    const documents = extractDocumentLinks($, baseUrl);

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
    const publishedDate = $(".meta.submitted span").attr("content") || null;

    if (page.category === "news_notices") {
        const documents = extractDocumentLinks(
            $,
            new URL(page.url).origin,
            $(".content .field-item"),
        );

        return {
            notices: [
                {
                    municipalityCode: MUNICIPALITY_CODE,
                    titleNe,
                    titleEn: null,
                    contentNe: null,
                    type: page.category,
                    publishedDate,
                    sourceUrl: decodeURIComponent(page.url),
                    documents,
                },
            ],
        };
    } else {
        const documents = extractDocumentLinks(
            $,
            new URL(page.url).origin,
            $(".content .field-item"),
        );
        console.log("Documents:", documents);

        return {
            notices: [
                {
                    municipalityCode: MUNICIPALITY_CODE,
                    titleNe,
                    titleEn: null,
                    contentNe: null,
                    type: page.category,
                    publishedDate,
                    sourceUrl: decodeURIComponent(page.url),
                    documents,
                },
            ],
        };
    }
}

// ---------------------------------------------------------------------------
// Listing page transformers
// ---------------------------------------------------------------------------

async function transformProjectListing(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;
    const rows = $(".view-content table tbody tr").toArray();

    console.log(`[Project Listing] ${rows.length} row(s) found on ${page.url}`);

    const projects = await Promise.all(
        rows.map((row) => transformProjectRow($, $(row), baseUrl, page.category || "")),
    );

    return { projects };
}

async function transformReportListing(page: ScrapedPage): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;
    const rows = $(".view-content table tbody tr").toArray();

    console.log(`[Project Listing] ${rows.length} row(s) found on ${page.url}`);

    const reports = await Promise.all(
        rows.map((row) => transformReportRow($, $(row), baseUrl, page.category || "")),
    );

    return { reports };
}

// NOT USED
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
    return executeTransform(pages, MUNICIPALITY_METADATA, TRANSFORMERS);
}
