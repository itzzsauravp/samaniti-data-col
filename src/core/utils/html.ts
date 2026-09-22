import { load as cheerioLoad, CheerioAPI, Cheerio, Element } from "cheerio";
import { DocumentData } from "../types/domain.js";

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
        // Trim whitespace/newlines — some themes (e.g. NEB) embed newlines inside href values
        const trimmed = href.trim();
        if (!trimmed) return;
        const absolute = trimmed.startsWith("http") ? trimmed : `${baseUrl}${trimmed}`;
        links.push(absolute);
    });
    return links;
}

export function extractDate($: CheerioAPI): string {
    return (
        // ISO timestamp from the content attribute of the meta/span tag
        $('span[property="dc:date dc:created"]').attr("content")?.trim() ||
        $('meta[property="dc:date"]').attr("content")?.trim() ||
        $('meta[property="article:published_time"]').attr("content")?.trim() ||
        // NEW: Handles the new theme's date container and cleans up SVG whitespace
        $(".meta.date").text().replace(/\s+/g, " ").trim() ||
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
        $(".news__title").text().trim() || // NEW: Specific to new municipality theme
        $(".section-title").text().trim() ||
        $(".node-title").text().trim() ||
        $("h1").text().trim() ||
        ""
    );
}

/**
 * Extracts the submission or creation date from HTML, trying multiple selectors in order of preference.
 */
export function extractDocumentLinks(
    $: CheerioAPI,
    baseUrl: string,
    $context?: Cheerio<Element>,
    hrefPattern?: RegExp,
): DocumentData[] {
    const documentsMap = new Map<string, DocumentData>();

    if (!$context) {
        return [];
    }

    const IGNORED_URL_PATTERNS: string[] = [
        "get.adobe.com",
        "adobe.com/acrobat",
        "adobe_reader",
        "download_acrobat",
        "get_adobe_reader",
        "/modules/file/icons/",
        "/misc/icons/",
        "newlogo.png",
        "logo.png",
        "logo.svg",
        "emblem_of_nepal",
        "/assets/image/",
        "/static/assets/",
    ];

    const IGNORED_TEXT_PATTERNS: string[] = [
        "download adobe",
        "adobe reader",
        "get adobe",
        "get acrobat",
    ];

    const isIgnored = (url: string, ...textCandidates: (string | undefined | null)[]): boolean => {
        const lowerUrl = url.toLowerCase();
        if (IGNORED_URL_PATTERNS.some((pattern) => lowerUrl.includes(pattern))) {
            return true;
        }

        const combinedText = textCandidates
            .filter((t): t is string => Boolean(t))
            .join(" ")
            .toLowerCase();
        return IGNORED_TEXT_PATTERNS.some((pattern) => combinedText.includes(pattern));
    };

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

    const toAbsoluteUrl = (url: string): string => {
        try {
            return new URL(url, baseUrl).href;
        } catch {
            return url;
        }
    };

    const getExtension = (url: string): string => {
        const cleanUrl = url.split("?")[0];
        const parts = cleanUrl.split(".");
        const ext = parts.length > 1 ? parts.pop() : "";
        return ext ? ext.toLowerCase() : "";
    };

    // 1. EXTRACT FROM ANCHOR TAGS
    $context.find("a[href]").each((_, el) => {
        const $a = $(el);
        const rawHref = $a.attr("href");

        if (!rawHref) return;
        const trimmedHref = rawHref.trim();
        if (!trimmedHref || trimmedHref.startsWith("javascript:") || trimmedHref.startsWith("#")) {
            return;
        }

        const absoluteUrl = toAbsoluteUrl(trimmedHref);
        const anchorText = $a.text();
        const titleAttr = $a.attr("title");

        if (isIgnored(absoluteUrl, anchorText, titleAttr)) {
            return;
        }

        if (hrefPattern && !hrefPattern.test(absoluteUrl)) {
            return;
        }

        const ext = getExtension(absoluteUrl);

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
            let fileName = getFirstNonEmptyString(anchorText, titleAttr, "Untitled Document");

            // NEW: Fix generic flipbook button names by decoding the file name from the URL
            if ($a.hasClass("df-ui-download") || fileName.toLowerCase().includes("download pdf")) {
                try {
                    const pathParts = absoluteUrl.split("?")[0].split("/");
                    const decodedName = decodeURIComponent(pathParts[pathParts.length - 1]);
                    if (decodedName) {
                        fileName = decodedName; // Will resolve to the actual Nepali file name
                    }
                } catch {
                    // Fallback silently to whatever generic name it had
                }
            }

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

    // 2. EXTRACT FROM IMAGE TAGS
    $context.find("img[src]").each((_, el) => {
        const $img = $(el);
        const rawSrc = $img.attr("src");

        if (!rawSrc) return;
        const trimmedSrc = rawSrc.trim();
        if (!trimmedSrc) return;

        const absoluteUrl = toAbsoluteUrl(trimmedSrc);
        const altText = $img.attr("alt");
        const titleText = $img.attr("title");

        if (isIgnored(absoluteUrl, altText, titleText)) {
            return;
        }

        if (hrefPattern && !hrefPattern.test(absoluteUrl)) {
            return;
        }

        const ext = getExtension(absoluteUrl);
        const isImageExtension = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);

        if (isImageExtension) {
            const parentLinkText = $img.closest("a").text();
            const rowTitleText = $context.find(".views-field-title").text();

            const fileName = getFirstNonEmptyString(
                altText,
                titleText,
                parentLinkText,
                rowTitleText,
                `Image_${Date.now()}.${ext}`,
            );

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

    // 3. EXTRACT FROM SCRIPT TAGS (e.g. DFlip flipbook: var pdf = '...')
    const fullHtml = $.html();
    const scriptMatches = fullHtml.matchAll(/var\s+pdf\s*=\s*['"]([^'"]+\.pdf[^'"]*)['"]/gi);
    for (const match of scriptMatches) {
        const rawPdfUrl = match[1].trim();
        const absoluteUrl = toAbsoluteUrl(rawPdfUrl);
        if (!isIgnored(absoluteUrl)) {
            let fileName = "Document.pdf";
            try {
                const pathParts = absoluteUrl.split("?")[0].split("/");
                const decoded = decodeURIComponent(pathParts[pathParts.length - 1]);
                if (decoded) fileName = decoded;
            } catch {}
            if (!documentsMap.has(absoluteUrl)) {
                documentsMap.set(absoluteUrl, {
                    fileName,
                    fileType: "pdf",
                    originalUrl: absoluteUrl,
                    storagePath: null,
                    downloadStatus: "skipped",
                    downloadError: null,
                });
            }
        }
    }

    return Array.from(documentsMap.values());
}
