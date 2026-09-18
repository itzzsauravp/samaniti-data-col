import path from "node:path";
import { RouteConfig } from "../../core/contracts/scraper.interface.js";
import { SiteConfig } from "../../core/contracts/site-config.js";
import { extractSlugFromUrl } from "../../core/utils/index.js";

/**
 * Derives crawler routes from a SiteConfig. This is the single place where a
 * config becomes routes; per-site route objects (listPath, pagination, detail
 * selectors, mocks) no longer need to be hand-written per scraper.
 */
export function buildRoutesFromSite(site: SiteConfig): RouteConfig[] {
  return site.entities.map((entity): RouteConfig => {
    const live = entity.listPath.startsWith("http")
      ? entity.listPath
      : `${site.baseUrl}${entity.listPath}`;
    const slug = extractSlugFromUrl(live);
    const mockName =
      entity.mockFile ?? `${entity.type}-${entity.typeLabel ?? slug}.html`;

    return {
      type: entity.type,
      subFolder: entity.subFolder ?? entity.typeLabel ?? slug,
      live,
      mock: path.resolve(site.mockBaseDir, mockName),
      detailMock: entity.detailMockFile
        ? path.resolve(site.mockBaseDir, entity.detailMockFile)
        : undefined,
      detailSelector: entity.detailSelector,
      detailType: entity.detailType,
      paginated: entity.paginated,
      pagerSelector: entity.pagerSelector,
      maxPages: entity.maxPages,
      baseUrl: site.baseUrl,
      siteCode: site.code,
      urlFilters: site.urlFilters,
    };
  });
}