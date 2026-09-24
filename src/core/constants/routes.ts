import { RouteConfig } from "../contracts/scraper.interface.js";

export interface StandardRouteOptions {
    hasNePrefix?: boolean;
    overrides?: RouteConfig[];
}

/**
 * Generates the unified, standard route definitions for Nepal government municipality portals.
 *
 * Each route defaults to:
 *   - Automatic link discovery on listing pages (Table or Listing layout)
 *   - detailContentSelector: ".introduction .container .row" (scoping the primary content on detail pages)
 */
export function createStandardGovRoutes(
    baseUrl: string,
    options?: StandardRouteOptions,
): RouteConfig[] {
    const prefix = options?.hasNePrefix ? "/ne" : "";

    const standardRoutes: RouteConfig[] = [
        // Projects & Budgets
        {
            type: "project",
            live: `${baseUrl}${prefix}/budget-program`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "projectDetail",
        },
        {
            type: "project",
            live: `${baseUrl}${prefix}/plan-project`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "projectDetail",
        },
        {
            type: "project",
            live: `${baseUrl}${prefix}/income-expenditure`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "projectDetail",
        },

        // Reports & Audits
        {
            type: "report",
            live: `${baseUrl}${prefix}/annual-progress-report`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "reportDetail",
        },
        {
            type: "report",
            live: `${baseUrl}${prefix}/trimester-progress-report`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "reportDetail",
        },
        {
            type: "report",
            live: `${baseUrl}${prefix}/audit-report`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "reportDetail",
        },
        {
            type: "report",
            live: `${baseUrl}${prefix}/publications`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "reportDetail",
        },
        {
            type: "report",
            live: `${baseUrl}${prefix}/monitoring-report`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "reportDetail",
        },
        {
            type: "report",
            live: `${baseUrl}${prefix}/public-hearing`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "reportDetail",
        },
        {
            type: "report",
            live: `${baseUrl}${prefix}/social-audit`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "reportDetail",
        },

        // Notices, Laws & Decisions
        {
            type: "notice",
            live: `${baseUrl}${prefix}/decisions`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}${prefix}/tax-and-fees`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}${prefix}/act-law-directives`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}${prefix}/public-procurement-tender-notices`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}${prefix}/news-notices`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}${prefix}/municipal-board-decision`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}${prefix}/municipal-council-decision`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
        {
            type: "notice",
            live: `${baseUrl}${prefix}/municipal-decision`,
            baseUrl,
            paginated: true,
            contentSelector: ".introduction .container",
            detailContentSelector: ".introduction .container .row",
            detailType: "noticeDetail",
        },
    ];

    if (!options?.overrides || options.overrides.length === 0) {
        return standardRoutes;
    }

    const routeMap = new Map<string, RouteConfig>();
    for (const r of standardRoutes) {
        routeMap.set(r.live, r);
    }
    for (const o of options.overrides) {
        routeMap.set(o.live, o);
    }

    return Array.from(routeMap.values());
}
