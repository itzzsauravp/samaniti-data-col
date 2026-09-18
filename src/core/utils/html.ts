import { load as cheerioLoad, CheerioAPI, Cheerio, Element } from "cheerio";
import { DocumentData } from "../types/domain.js";
import path from "node:path";

/**
 * Scopes a full page HTML string down to the inner HTML of the first element
 * matching `selector`. If the selector matches nothing, returns the full body HTML.
 */
export function scopeHtml(fullHtml: string, selector: string): string {
    const $ = cheerioLoad(fullHtml);
    const el = $(selector);
    if (!el.length) {
        console.warn(
            `[scopeHtml] Selector "${selector}" matched nothing — falling back to full body.`,
        );
        return $("body").length ? $.html($("body")) : fullHtml;
    }
    return $.html(el) ?? fullHtml;
}

/**
 * Extracts all absolute hrefs from an HTML string using a selector.
 */
export function extractLinksFromHtml(html: string, selector: string, baseUrl: string): string[] {
    const $ = cheerioLoad(html);
    const links: string[] = [];
    $(selector).each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const absolute = href.startsWith("http") ? href : `${baseUrl}${href}`;
        links.push(absolute);
    });
    return links;
}

/**
 * Checks if a page contains a views table (listing) or a detail view.
 */
export function isListView(html: string): boolean {
    const $ = cheerioLoad(html);
    return $(".views-row").length > 0;
}

/**
 * Extracts the title from HTML, trying multiple selectors in order of preference.
 */
export function extractTitle($: CheerioAPI): string {
    return (
        $('span[property="dc:title"]').attr("content")?.trim() ||
        $(".section-title").text().trim() ||
        $(".node-title").text().trim() ||
        $("h1").text().trim() ||
        ""
    );
}

/**
 * Extracts PDF/document links from HTML.
 */
export function extractDocumentLinks(
    $: CheerioAPI,
    baseUrl: string,
    $context?: Cheerio<Element>,
    hrefPattern?: RegExp | string,
    extraClass?: string,
): DocumentData[] {
    const fileExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "zip", "png", "jpg", "jpeg"];

    const extensionSelectors = fileExtensions.flatMap((ext) => [
        `a[href$='.${ext}']`,
        `a[href*='.${ext}?']`,
        `a[href*='.${ext}&']`,
    ]);

    const baseSelectors = [
        ".field-name-field-supporting-documents a",
        ".field-type-file a",
        ".file a",
        ...extensionSelectors,
    ];

    // Format extra class/selector (ensures leading dot if passed as "my-class")
    const formattedClass = extraClass
        ? extraClass.trim().startsWith(".")
            ? extraClass.trim()
            : `.${extraClass.trim()}`
        : "";

    // Append extra class/selector to each base selector if provided
    const selectors = formattedClass
        ? baseSelectors.map((sel) => `${sel}${formattedClass}`)
        : baseSelectors;

    const container = $context ?? $.root();
    const documentsMap = new Map<string, DocumentData>();

    // Normalize pattern to RegExp if a string is provided
    const pattern = typeof hrefPattern === "string" ? new RegExp(hrefPattern) : hrefPattern;

    for (const selector of selectors) {
        container.find(selector).each((_: number, el: any) => {
            const $el = $(el);
            const href = $el.attr("href");

            if (!href || href.startsWith("data:") || href.startsWith("javascript:")) return;

            // Check if href matches the user-provided regex pattern
            if (pattern && !pattern.test(href)) return;

            try {
                const absoluteUrl = new URL(href, baseUrl).href;

                // Skip if we already processed this exact URL in the current scope
                if (documentsMap.has(absoluteUrl)) return;

                // Extract filename from anchor text or fallback to URL pathname
                const urlPath = new URL(absoluteUrl).pathname;
                const linkText = $el.text().trim();
                const fallbackName = path.basename(urlPath) || "document";
                const fileName = linkText.length > 0 ? linkText : fallbackName;

                // Extract extension/fileType if available
                const ext = path.extname(urlPath).replace(".", "").toLowerCase();
                const fileType = ext || null;

                documentsMap.set(absoluteUrl, {
                    fileName,
                    fileType,
                    originalUrl: absoluteUrl,
                    storagePath: null,
                    downloadStatus: "skipped",
                    downloadError: null,
                });
            } catch {
                // Ignore malformed URLs
            }
        });
    }

    return Array.from(documentsMap.values());
}
