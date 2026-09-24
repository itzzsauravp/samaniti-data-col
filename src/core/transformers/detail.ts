import * as cheerio from "cheerio";
import { DocumentData, EtlPayload, MunicipalityData, PolicyEntityData } from "../types/domain.js";
import { ScrapedPage } from "../contracts/scraper.interface.js";
import {
    extractTitle,
    extractDate,
    parseNepaliFiscalYear,
    extractDocumentLinks,
} from "../utils/index.js";

export interface DetailTransformOptions {
    municipalityCode?: string;
    contextSelector?: string;
}

/**
 * Standard content container selectors across Nepal government municipality portals.
 * Priority ordered from the most specific standard layout down to general fallbacks.
 */
export const DEFAULT_CONTEXT_SELECTORS = [
    ".introduction .container .row",
    ".introdution .container .row",
    ".introduction .container",
    ".detail__page-inner",
    ".region-content",
    "#content",
    ".node-content",
    "main",
    "body",
];

/**
 * Maps route types to database category ('project' | 'report' | 'notice').
 */
export function mapRouteToCategory(routeType?: string): string {
    const rt = (routeType || "").toLowerCase();
    if (rt.includes("project") || rt.includes("budget") || rt.includes("plan") || rt.includes("expenditure")) {
        return "project";
    }
    if (rt.includes("report") || rt.includes("audit") || rt.includes("publication") || rt.includes("hearing")) {
        return "report";
    }
    return "notice";
}

/**
 * Transforms a single detail page into a typed PolicyEntity record.
 * Captures all metadata, attached files/PDFs, and archives the raw $context HTML.
 */
export async function transformDetailPage(
    page: ScrapedPage,
    municipalityCode: string,
    options?: DetailTransformOptions,
): Promise<PolicyEntityData> {
    const $ = cheerio.load(page.html);
    const baseUrl = new URL(page.url).origin;

    // 1. Locate primary $context
    let $context: cheerio.Cheerio<any> = $("body");
    const customSelector = options?.contextSelector;

    if (customSelector && $(customSelector).length > 0) {
        $context = $(customSelector).first();
    } else {
        for (const selector of DEFAULT_CONTEXT_SELECTORS) {
            const el = $(selector);
            if (el.length > 0 && el.text().trim().length > 0) {
                $context = el.first();
                break;
            }
        }
    }

    if (!$context || $context.length === 0) {
        $context = $("body").length ? $("body") : $.root();
    }

    // 2. Extract Title
    let titleNe = extractTitle($);
    if (!titleNe) {
        titleNe = $context.find("h1, h2, .views-field-title, .title, .news__title").first().text().trim();
    }
    titleNe = titleNe.replace(/\s+/g, " ").trim();

    // 3. Extract Published Date
    const publishedDate = extractDate($) || null;

    // 4. Extract Fiscal Year
    const contextText = $context.text();
    const fiscalYear =
        parseNepaliFiscalYear(titleNe) ||
        parseNepaliFiscalYear(contextText) ||
        null;

    // 5. Extract Content Text
    let contentNe =
        $context
            .find(".field-type-text-with-summary, .field-name-body, .node-content, .content, article, p")
            .text()
            .trim() || null;

    if (contentNe) {
        contentNe = contentNe.replace(/\s+/g, " ").trim();
    }

    // 6. Extract Documents (PDFs, Images, Flipbooks, Word docs)
    const documents: DocumentData[] = extractDocumentLinks($, baseUrl, $context as any);

    // If sourceUrl itself points directly to a document
    if (documents.length === 0 && page.url.toLowerCase().endsWith(".pdf")) {
        const rawFileName = decodeURIComponent(page.url.split("/").pop()?.split("?")[0] || "document.pdf");
        documents.push({
            fileName: rawFileName,
            fileType: "pdf",
            originalUrl: page.url,
            storagePath: null,
            downloadStatus: "pending",
            downloadError: null,
        });
    }

    // 7. Save raw $context HTML for auditability and future reprocessing
    const contextHtml = $context.html() || page.html;

    // 8. Determine Category
    const category = mapRouteToCategory(page.routeType);

    return {
        municipalityCode,
        category,
        titleNe: titleNe || "शीर्षक उपलब्ध छैन",
        titleEn: null,
        contentNe,
        contentEn: null,
        type: page.category || null,
        fiscalYear,
        budgetAmount: null,
        status: "",
        wardNo: null,
        publishedDate,
        sourceUrl: decodeURIComponent(page.url),
        documents,
        metadata: {
            contextHtml,
            routeType: page.routeType,
        },
    };
}

/**
 * Universal transformer that processes all scraped detail pages directly into an EtlPayload.
 */
export async function transformPagesToEtlPayload(
    pages: ScrapedPage[],
    municipalityMetadata: MunicipalityData,
    options?: DetailTransformOptions,
): Promise<EtlPayload> {
    const policyEntities: PolicyEntityData[] = [];

    for (const page of pages) {
        try {
            const entity = await transformDetailPage(page, municipalityMetadata.code, options);
            policyEntities.push(entity);
        } catch (err: any) {
            console.error(`[transformDetailPage] Error parsing page ${page.url}:`, err.message);
        }
    }

    return {
        municipality: municipalityMetadata,
        policyEntities,
    };
}
