import * as cheerio from "cheerio";
import {
    DocumentData,
    EtlPayload,
    ProjectData,
    ReportData,
    NoticeData,
} from "../types/domain.js";
import { ScrapedPage } from "../contracts/scraper.interface.js";
import {
    parseNepaliFiscalYear,
    extractTitle,
    extractDocumentLinks,
    extractDate,
} from "../utils/index.js";

/**
 * Transforms a single project row from a listing table.
 */
export async function transformProjectRow(
    $: cheerio.CheerioAPI,
    row: cheerio.Cheerio<cheerio.Element>,
    baseUrl: string,
    category: string,
    municipalityCode: string,
): Promise<ProjectData> {
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

    const fiscalYearAnchor = row.find(".views-field-field-fiscal-year a");
    const fiscalYearCellText = fiscalYearAnchor.text().trim();
    const fiscalYear = fiscalYearCellText || parseNepaliFiscalYear(titleNe) || null;

    const createdTd = row.find(".views-field-created");
    const dateCreated = createdTd.text().trim() || null;

    const documents: DocumentData[] = extractDocumentLinks($, baseUrl, row);

    return {
        municipalityCode,
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
 * Transforms a single report row from a listing table.
 */
export async function transformReportRow(
    $: cheerio.CheerioAPI,
    row: cheerio.Cheerio<cheerio.Element>,
    baseUrl: string,
    category: string,
    municipalityCode: string,
): Promise<ReportData> {
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

    const fiscalYearAnchor = row.find(".views-field-field-fiscal-year a");
    const fiscalYearCellText = fiscalYearAnchor.text().trim();
    const fiscalYear = fiscalYearCellText || parseNepaliFiscalYear(titleNe) || null;

    const createdTd = row.find(".views-field-created");
    const dateCreated = createdTd.text().trim() || null;

    const documents: DocumentData[] = extractDocumentLinks($, baseUrl, row);

    return {
        municipalityCode,
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
 * Transforms a project listing page containing tables.
 */
export async function transformProjectListing(
    page: ScrapedPage,
    municipalityCode: string,
): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;
    const rows = $(".view-content table tbody tr").toArray();

    const projects = await Promise.all(
        rows.map((row) => transformProjectRow($, $(row), baseUrl, page.category || "", municipalityCode)),
    );

    return { projects };
}

/**
 * Transforms a report listing page containing tables.
 */
export async function transformReportListing(
    page: ScrapedPage,
    municipalityCode: string,
): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;
    const rows = $(".view-content table tbody tr").toArray();

    const reports = await Promise.all(
        rows.map((row) => transformReportRow($, $(row), baseUrl, page.category || "", municipalityCode)),
    );

    return { reports };
}

/**
 * Standard detail page transformer for reports.
 */
export async function transformReportDetail(
    page: ScrapedPage,
    municipalityCode: string,
): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;

    const titleNe = extractTitle($);
    const publishedDate = extractDate($);
    const documents = extractDocumentLinks($, baseUrl, $(".content .field-item"));

    return {
        reports: [
            {
                municipalityCode,
                titleNe,
                titleEn: null,
                type: page.category,
                fiscalYear: parseNepaliFiscalYear(titleNe) || null,
                publishedDate,
                sourceUrl: decodeURIComponent(page.url),
                documents,
            },
        ],
    };
}

/**
 * Standard detail page transformer for notices.
 */
export async function transformNoticeDetail(
    page: ScrapedPage,
    municipalityCode: string,
): Promise<Partial<EtlPayload>> {
    const $ = cheerio.load(page.html);
    const titleNe = extractTitle($);
    const publishedDate = $(".meta.submitted span").attr("content") || null;
    const documents = extractDocumentLinks($, new URL(page.url).origin, $(".content .field-item"));

    return {
        notices: [
            {
                municipalityCode,
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
