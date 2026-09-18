import * as cheerio from "cheerio";
import {
  DocumentData,
  EtlPayload,
  NoticeData,
  ProjectData,
  ReportData,
} from "../../core/types/domain.js";
import { ScrapedPage } from "../../core/contracts/scraper.interface.js";
import {
  EntityConfig,
  EntitySelectors,
  SiteConfig,
  TitleFallback,
} from "../../core/contracts/site-config.js";
import { getSelectorProfile } from "../profiles/index.js";
import {
  isFilteredOut,
  loadKeywordFilterFromEnv,
  parseNepaliFiscalYear,
} from "../../core/utils/index.js";
import { isRecordExisting } from "../../core/db/loader.js";
import { downloadAndSaveDocument } from "../../core/utils/file-download.js";

const ROOT_FOLDER_BY_TYPE: Record<EntityConfig["type"], string> = {
  report: "reports",
  project: "project",
  notice: "notices",
};

function toAbsolute(baseUrl: string, url: string): string {
  return url.startsWith("http") ? url : `${baseUrl}${url}`;
}

/** Builds a document record with the site's base URL and metadata. */
export async function buildSiteDocument(
  site: SiteConfig,
  fileUrl: string,
  titleNe: string,
  publishedDate: string | null,
  subFolder: string,
  rootFolder: string,
): Promise<DocumentData> {
  const absoluteUrl = toAbsolute(site.baseUrl, fileUrl);

  const result = await downloadAndSaveDocument(
    site.municipality.province,
    site.municipality.code,
    absoluteUrl,
    titleNe,
    publishedDate,
    subFolder,
    rootFolder,
  );

  const rawFileName =
    absoluteUrl.split("/").pop()?.split("?")[0] || "attachment.pdf";
  const fileName = decodeURIComponent(rawFileName);

  return {
    fileName,
    fileType: absoluteUrl.endsWith(".pdf") ? "application/pdf" : null,
    originalUrl: absoluteUrl,
    storagePath: result.storagePath,
    downloadStatus: result.downloadStatus,
    downloadError: result.downloadError,
  };
}

interface ResolvedEntity {
  entity: EntityConfig;
  selectors: EntitySelectors;
}

function resolveEntity(site: SiteConfig, entity: EntityConfig): ResolvedEntity {
  const profile = getSelectorProfile(site.stack);
  const base = profile.entities[entity.type];
  if (!base) {
    throw new Error(
      `[transform] Stack '${site.stack}' has no selector profile for entity '${entity.type}' (site '${site.code}').`,
    );
  }
  return {
    entity,
    selectors: { ...base, ...(entity.selectors ?? {}) },
  };
}

function evalDetailTitle(
  $: cheerio.CheerioAPI,
  selectors: EntitySelectors,
  typeLabel: string,
): string {
  if (selectors.titleUsesType && typeLabel) return typeLabel;

  for (const fallback of selectors.titleFallbacks) {
    const node = $(fallback.selector);
    const text = fallback.attribute
      ? (node.attr(fallback.attribute) ?? "").trim()
      : node.text().trim();
    if (text) return text;
  }

  return selectors.defaultDetailTitle;
}

async function collectDetailDocuments(
  $: cheerio.CheerioAPI,
  site: SiteConfig,
  detailDocs: string,
  titleNe: string,
  subFolder: string,
  rootFolder: string,
): Promise<DocumentData[]> {
  const documents: DocumentData[] = [];
  for (const el of $(detailDocs).toArray()) {
    const rawFileUrl = $(el).attr("href");
    if (!rawFileUrl) continue;
    documents.push(
      await buildSiteDocument(site, rawFileUrl, titleNe, null, subFolder, rootFolder),
    );
  }
  return documents;
}

async function transformEntityPage(
  page: ScrapedPage,
  resolved: ResolvedEntity,
  site: SiteConfig,
  filter: ReturnType<typeof loadKeywordFilterFromEnv>,
): Promise<Partial<EtlPayload>> {
  const { entity, selectors } = resolved;
  const $ = cheerio.load(page.html);
  const subFolder = page.subFolder ?? entity.subFolder ?? entity.typeLabel ?? "";
  const typeLabel = entity.typeLabel ?? subFolder;
  const rootFolder = ROOT_FOLDER_BY_TYPE[entity.type];
  const code = site.municipality.code;

  const rows = $(selectors.rows).toArray();
  const items: (NoticeData | ProjectData | ReportData)[] = [];

  for (const el of rows) {
    const $item = $(el);
    const $titleLink = $item.find(selectors.titleLink);
    const titleNe = $titleLink.text().trim() || selectors.defaultRowTitle;
    const rawSourceUrl = $titleLink.attr("href") || page.url;
    const sourceUrl = toAbsolute(site.baseUrl, rawSourceUrl);

    if (isFilteredOut(filter, titleNe)) {
      console.log(`[Keyword Skip] ${entity.type} filtered out: ${titleNe}`);
      continue;
    }

    if (await isRecordExisting(sourceUrl)) {
      console.log(`[Delta Skip] exists: ${sourceUrl}`);
      continue;
    }

    const publishedDate = selectors.dateField
      ? $item.find(selectors.dateField).text().trim() || null
      : null;

    const rawFileUrl = $item.find(selectors.fileLink).attr("href");

    const documents: DocumentData[] = [];
    if (rawFileUrl) {
      documents.push(
        await buildSiteDocument(
          site,
          rawFileUrl,
          titleNe,
          publishedDate,
          subFolder,
          rootFolder,
        ),
      );
    }

    if (entity.type === "report") {
      items.push({
        municipalityCode: code,
        titleNe,
        titleEn: null,
        type: typeLabel,
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        publishedDate,
        sourceUrl,
        documents,
      });
    } else if (entity.type === "project") {
      items.push({
        municipalityCode: code,
        titleNe,
        titleEn: null,
        budgetAmount: null,
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        status: "",
        wardNo: null,
        type: typeLabel,
        sourceUrl,
        documents,
      });
    } else {
      items.push({
        municipalityCode: code,
        titleNe,
        titleEn: null,
        contentNe: null,
        type: typeLabel,
        publishedDate,
        sourceUrl,
        documents,
      });
    }
  }

  const useDetail =
    selectors.fallbackWhen === "emptyRows"
      ? rows.length === 0
      : items.length === 0 && Boolean(page.url);

  if (useDetail) {
    const titleNe = evalDetailTitle($, selectors, typeLabel);

    if (entity.type === "notice") {
      const contentNe = $(selectors.bodyField).text().trim() || null;
      if (isFilteredOut(filter, titleNe, contentNe)) {
        console.log(`[Keyword Skip] notice filtered out: ${titleNe}`);
        return {};
      }
      const documents = await collectDetailDocuments(
        $,
        site,
        selectors.detailDocs,
        titleNe,
        subFolder,
        rootFolder,
      );
      items.push({
        municipalityCode: code,
        titleNe,
        titleEn: null,
        contentNe,
        type: typeLabel,
        publishedDate: null,
        sourceUrl: page.url,
        documents,
      });
    } else if (entity.type === "report") {
      if (isFilteredOut(filter, titleNe)) {
        console.log(`[Keyword Skip] report filtered out: ${titleNe}`);
        return {};
      }
      const documents = await collectDetailDocuments(
        $,
        site,
        selectors.detailDocs,
        titleNe,
        subFolder,
        rootFolder,
      );
      items.push({
        municipalityCode: code,
        titleNe,
        titleEn: null,
        type: typeLabel,
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        publishedDate: null,
        sourceUrl: page.url,
        documents,
      });
    } else {
      if (isFilteredOut(filter, titleNe)) {
        console.log(`[Keyword Skip] project filtered out: ${titleNe}`);
        return {};
      }
      const documents = await collectDetailDocuments(
        $,
        site,
        selectors.detailDocs,
        titleNe,
        subFolder,
        rootFolder,
      );
      items.push({
        municipalityCode: code,
        titleNe,
        titleEn: null,
        budgetAmount: null,
        fiscalYear: parseNepaliFiscalYear(titleNe) || null,
        status: "",
        wardNo: null,
        type: typeLabel,
        sourceUrl: page.url,
        documents,
      });
    }
  }

  const partial: Partial<EtlPayload> = {};
  if (entity.type === "report") {
    partial.reports = items as ReportData[];
  } else if (entity.type === "project") {
    partial.projects = items as ProjectData[];
  } else {
    partial.notices = items as NoticeData[];
  }
  return partial;
}

/**
 * Generic table-driven transform: converts scraped pages into canonical domain
 * records using a site's config + stack selector profile. Preserves the keyword
 * filter, delta-skip and document download behaviour for every entity type.
 */
export async function transformSite(
  pages: ScrapedPage[],
  site: SiteConfig,
): Promise<EtlPayload> {
  const filter = site.keywordFilter ?? loadKeywordFilterFromEnv();

  const entityIndex = new Map<string, ResolvedEntity>();
  for (const entity of site.entities) {
    const resolved = resolveEntity(site, entity);
    for (const key of [entity.type, `${entity.type}s`, entity.detailType].filter(
      (k): k is string => Boolean(k),
    )) {
      entityIndex.set(key, resolved);
    }
  }

  let merged: Partial<EtlPayload> = {};

  for (const page of pages) {
    const resolved = entityIndex.get(page.type) ?? entityIndex.get(page.type.toLowerCase());
    if (!resolved) {
      console.warn(
        `[transform] No entity configured for page type '${page.type}'. Skipping.`,
      );
      continue;
    }
    const partial = await transformEntityPage(page, resolved, site, filter);

    merged = {
      ...merged,
      ...partial,
      projects: [...(merged.projects ?? []), ...(partial.projects ?? [])],
      reports: [...(merged.reports ?? []), ...(partial.reports ?? [])],
      notices: [...(merged.notices ?? []), ...(partial.notices ?? [])],
    };
  }

  return {
    municipality: site.municipality,
    ...merged,
  };
}