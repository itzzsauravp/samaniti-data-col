import { RouteConfig } from "../contracts/scraper.interface.js";

export interface StandardRouteOptions {
    baseUrl: string;
}

/**
 * Generates standard DRY route configurations for Nepali Drupal municipal portals.
 */
export function createStandardMunicipalityRoutes({ baseUrl }: StandardRouteOptions): RouteConfig[] {
    return [
        // ── Projects (Tabular format: extracted directly from listing tables) ──
        {
            type: "project",
            live: `${baseUrl}/budget-program`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".introduction .container .view-content",
        },
        {
            type: "project",
            live: `${baseUrl}/plan-project`,
            baseUrl,
            paginated: false,
            format: "tabular",
            contentSelector: ".introduction .container .view-content",
        },
        {
            type: "project",
            live: `${baseUrl}/income-expenditure`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".introduction .container .view-content",
        },

        // ── Reports (Mixed tabular / columnar) ──
        {
            type: "report",
            live: `${baseUrl}/daily-progress-report`,
            baseUrl,
            paginated: true,
            format: "columnar",
            contentSelector: ".container .row .region-content",
            detailSelector: "table tbody tr a[href*='/content']",
            detailContentSelector: ".introduction .container",
            detailType: "reportDetail",
        },
        {
            type: "report",
            live: `${baseUrl}/trimester-progress-report`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "report",
        },
        {
            type: "report",
            live: `${baseUrl}/annual-progress-report`,
            baseUrl,
            paginated: false,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "report",
        },
        {
            type: "report",
            live: `${baseUrl}/audit-report`,
            baseUrl,
            paginated: false,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "report",
        },
        {
            type: "report",
            live: `${baseUrl}/monitoring-report`,
            baseUrl,
            paginated: false,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "report",
        },
        {
            type: "report",
            live: `${baseUrl}/public-hearing`,
            baseUrl,
            paginated: false,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "report",
        },
        {
            type: "report",
            live: `${baseUrl}/social-audit`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "report",
        },
        {
            type: "report",
            live: `${baseUrl}/publications`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "report",
        },

        // ── Notices ──
        {
            type: "notice",
            live: `${baseUrl}/news-notices`,
            baseUrl,
            paginated: false,
            format: "columnar",
            contentSelector: ".introduction .container .view-content",
            detailSelector: ".introduction .container .view-content h2 a",
            detailContentSelector: ".introduction .container",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}/public-procurement-tender-notices`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "notice",
        },
        {
            type: "notice",
            live: `${baseUrl}/act-law-directives`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "notice",
        },
        {
            type: "notice",
            live: `${baseUrl}/tax-and-fees`,
            baseUrl,
            paginated: false,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "notice",
        },
        {
            type: "notice",
            live: `${baseUrl}/municipal-council-decision`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "notice",
        },
        {
            type: "notice",
            live: `${baseUrl}/municipal-board-decision`,
            baseUrl,
            paginated: false,
            format: "columnar",
            contentSelector: ".introduction .container",
            detailSelector: ".introduction .container h2 a",
            detailContentSelector: ".introduction .container",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}/municipal-decision`,
            baseUrl,
            paginated: true,
            format: "tabular",
            contentSelector: ".container .row .region-content",
            detailType: "notice",
        },
    ];
}
