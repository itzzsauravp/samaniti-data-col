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
 * Extracts the submission or creation date from HTML, trying multiple selectors in order of preference.
 */
export function extractDate($: CheerioAPI): string {
    return (
        // ISO timestamp from the content attribute of the meta/span tag
        $('span[property="dc:date dc:created"]').attr("content")?.trim() ||
        $('meta[property="dc:date"]').attr("content")?.trim() ||
        $('meta[property="article:published_time"]').attr("content")?.trim() ||
        // Formatted human-readable date text inside the submitted div or date element
        $(".submitted span[property*='dc:date']").text().trim() ||
        $(".meta.submitted")
            .text()
            .replace(/^Submitted on:\s*/i, "")
            .trim() ||
        $("time").attr("datetime")?.trim() ||
        $("time").text().trim() ||
        ""
    );
}

/**
 * Extracts PDF/document links from HTML.
 */
export function extractDocumentLinks(
    $: CheerioAPI,
    baseUrl: string,
    $context: Cheerio<Element>,
    hrefPattern?: RegExp,
): DocumentData[] {
    const documentsMap = new Map<string, DocumentData>();

    // Helper to safely get the first non-empty string from a list of candidates
    const getFirstNonEmptyString = (...candidates: (string | undefined | null)[]): string => {
        for (const item of candidates) {
            if (item && typeof item === "string") {
                const trimmed = item.trim();
                if (trimmed.length > 0) {
                    return trimmed;
                }
            }
        }
        return "";
    };

    // Helper to normalize relative URLs to absolute URLs
    const toAbsoluteUrl = (url: string): string => {
        try {
            return new URL(url, baseUrl).href;
        } catch {
            return url;
        }
    };

    // Helper to extract clean file extensions (ignoring query parameters)
    const getExtension = (url: string): string => {
        const cleanUrl = url.split("?")[0];
        const parts = cleanUrl.split(".");
        return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
    };

    // 1. EXTRACT FROM ANCHOR TAGS (PDFs, DOCs, Zip, direct file links)
    $context.find("a[href]").each((_, el) => {
        const $a = $(el);
        const rawHref = $a.attr("href");

        if (!rawHref) return;
        const trimmedHref = rawHref.trim();
        if (!trimmedHref || trimmedHref.startsWith("javascript:") || trimmedHref.startsWith("#")) {
            return;
        }

        const absoluteUrl = toAbsoluteUrl(trimmedHref);

        // Filter by pattern if provided
        if (hrefPattern && !hrefPattern.test(absoluteUrl)) {
            return;
        }

        const ext = getExtension(absoluteUrl);

        // Check if link matches common document/media extensions or Drupal file wrapper classes
        const isDocExtension = [
            "pdf",
            "doc",
            "docx",
            "xls",
            "xlsx",
            "ppt",
            "pptx",
            "zip",
            "csv",
            "jpg",
            "jpeg",
            "png",
            "gif",
        ].includes(ext);
        const isFileContainer =
            $a.closest(".file, .field-type-file, .field-name-field-supporting-documents").length >
            0;

        if (isDocExtension || isFileContainer) {
            const anchorText = $a.text();
            const titleAttr = $a.attr("title");

            const fileName = getFirstNonEmptyString(anchorText, titleAttr, "Untitled Document");

            documentsMap.set(absoluteUrl, {
                fileName,
                fileType: ext || "unknown",
                originalUrl: absoluteUrl,
                storagePath: null,
                downloadStatus: "skipped",
                downloadError: null,
            });
        }
    });

    // 2. EXTRACT FROM IMAGE TAGS (Handles Drupal thumbnail/image fields)
    $context.find("img[src]").each((_, el) => {
        const $img = $(el);
        const rawSrc = $img.attr("src");

        if (!rawSrc) return;
        const trimmedSrc = rawSrc.trim();
        if (!trimmedSrc) return;

        // Skip Drupal default UI/file icons (e.g., application-pdf.png)
        if (trimmedSrc.includes("/modules/file/icons/") || trimmedSrc.includes("/misc/icons/")) {
            return;
        }

        const absoluteUrl = toAbsoluteUrl(trimmedSrc);

        // Filter by pattern if provided
        if (hrefPattern && !hrefPattern.test(absoluteUrl)) {
            return;
        }

        const ext = getExtension(absoluteUrl);
        const isImageExtension = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);

        if (isImageExtension) {
            const altText = $img.attr("alt");
            const titleText = $img.attr("title");
            const parentLinkText = $img.closest("a").text();
            const rowTitleText = $context.find(".views-field-title").text();

            const fileName = getFirstNonEmptyString(
                altText,
                titleText,
                parentLinkText,
                rowTitleText,
                `Image_${Date.now()}.${ext}`,
            );

            // Use the clean URL (without query params like ?itok=) as the map key to prevent duplicate entries
            const cleanUrl = absoluteUrl.split("?")[0];

            if (!documentsMap.has(cleanUrl)) {
                documentsMap.set(cleanUrl, {
                    fileName,
                    fileType: ext,
                    originalUrl: absoluteUrl,
                    storagePath: null,
                    downloadStatus: "skipped",
                    downloadError: null,
                });
            }
        }
    });

    return Array.from(documentsMap.values());
}
