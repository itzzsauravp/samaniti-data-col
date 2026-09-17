import { load as cheerioLoad } from "cheerio";

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
export function extractTitle($: cheerio.CheerioAPI): string {
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
export function extractDocumentLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const selectors = [
        ".field-name-field-supporting-documents a",
        ".field-type-file a",
        ".file a",
        "a[href$='.pdf']",
        "a[href*='.pdf']",
    ];

    const links: string[] = [];
    for (const selector of selectors) {
        $(selector).each((_, el) => {
            const href = $(el).attr("href");
            if (!href || href.startsWith("data:")) return;
            const absolute = href.startsWith("http") ? href : `${baseUrl}${href}`;
            links.push(absolute);
        });
    }
    return links;
}
