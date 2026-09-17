import * as cheerio from "cheerio";
import { NoticeData, DocumentData } from "../../../../core/types/domain.js";
import { buildDocument, MUNICIPALITY_CODE } from "../transform.js";
import { isRecordExisting } from "../../../../core/db/loader.js";
import { ScrapedPage } from "../../../../core/contracts/scraper.interface.js";
import { extractSlugFromUrl } from "../../../../core/utils/index.js";

/**
 * Sub-transformers for different types of notice pages.
 *
 * NOTE: These functions receive a ScrapedPage where `html` is already scoped
 * by the crawler's contentSelector — they should not need to navigate outside
 * the provided fragment.
 */

export async function handleGenericNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  const notices: NoticeData[] = [];
  const rows = $(".view-content").eq(1).find(".views-row").toArray();
  const baseUrl = new URL(page.url).origin;

  if (rows.length > 0) {
    let index = 0;
    for (const el of rows) {
      const $item = $(el);
      const $titleLink = $item.find(".views-field-title a");
      const titleNe = $titleLink.text().trim() || "";
      const rawSourceUrl = $titleLink.attr("href") || page.url;
      const publishedDate =
        $item.find(".views-field-created .field-content").text().trim() || null;
      const rawFileUrl =
        $item.find(".views-field-field-documents a").attr("href") || null;

      const sourceUrl = rawSourceUrl.startsWith("http")
        ? rawSourceUrl
        : `${baseUrl}${rawSourceUrl}`;

      if (await isRecordExisting(sourceUrl)) {
        console.log(`[Delta Skip] Notice exists: ${sourceUrl}`);
        index++;
        continue;
      }

      const documents: DocumentData[] = [];
      if (rawFileUrl) {
        documents.push(await buildDocument(rawFileUrl, titleNe, publishedDate));
      }

      notices.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        contentNe: null,
        type: type ?? "",
        publishedDate,
        sourceUrl,
        documents,
      });
      index++;
    }
  } else {
    // Detail page fallback
    const titleNe =
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h1").text().trim() ||
      "";

    const contentNe = $(".field-name-body .field-item").text().trim() || null;

    const documents: DocumentData[] = [];
    for (const el of $(
      ".field-name-field-supporting-documents a, .field-type-file a, .file a",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl) continue;
      documents.push(await buildDocument(rawFileUrl, titleNe, null));
    }

    notices.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      contentNe,
      type: type ?? "",
      publishedDate: null,
      sourceUrl: page.url,
      documents,
    });
  }

  return notices;
}

export async function handleNewsNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  const notices: NoticeData[] = [];
  const baseUrl = new URL(page.url).origin;

  // Listing page check: if there are rows, skip (crawler handles detail queuing)
  const isListingPage = $(".view-content").eq(1).find(".views-row").length > 0;
  if (isListingPage) {
    console.log(`[handleNewsNotice] Listing page — detail links already queued by crawler: ${page.url}`);
    return [];
  }

  if (await isRecordExisting(page.url)) {
    console.log(`[Delta Skip] Notice exists: ${page.url}`);
    return [];
  }

  const titleNe =
    $(".section-title .border").text().trim() ||
    $('span[property="dc:title"]').attr("content")?.trim() ||
    $("h1").text().trim() ||
    "";

  const contentNe = $(".field-name-body .field-item").text().trim() || null;
  const documents: DocumentData[] = [];

  const mediaElements = $(".field-item .even a, .field-item .even img").toArray();
  for (const el of mediaElements) {
    const $el = $(el);
    const tag = $el.get(0)?.tagName?.toLowerCase();
    let rawFileUrl: string | null = null;
    if (tag === "a") rawFileUrl = $el.attr("href") || null;
    else if (tag === "img") rawFileUrl = $el.attr("src") || null;

    if (!rawFileUrl || rawFileUrl.startsWith("data:")) continue;
    const fileUrl = rawFileUrl.startsWith("http") ? rawFileUrl : `${baseUrl}${rawFileUrl}`;
    documents.push(await buildDocument(fileUrl, titleNe, null));
  }

  notices.push({
    municipalityCode: MUNICIPALITY_CODE,
    titleNe,
    titleEn: null,
    contentNe,
    type: type ?? "",
    publishedDate: null,
    sourceUrl: page.url,
    documents,
  });

  return notices;
}

export async function handlePublicProcurementTenderNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  return handleGenericNotice($, type, page);
}

export async function handleActLawDirectivesNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  const notices: NoticeData[] = [];
  const baseUrl = new URL(page.url).origin;

  const tableLinks = $("table h2 a").toArray();

  if (tableLinks.length > 0) {
    let index = 0;
    for (const el of tableLinks) {
      const $a = $(el);
      const titleNe = $a.text().trim();
      const rawSourceUrl = $a.attr("href");
      if (!rawSourceUrl || !titleNe) continue;

      const sourceUrl = rawSourceUrl.startsWith("http")
        ? rawSourceUrl
        : `${baseUrl}${rawSourceUrl}`;

      if (await isRecordExisting(sourceUrl)) {
        console.log(`[Delta Skip] Notice exists: ${sourceUrl}`);
        index++;
        continue;
      }

      const $row = $a.closest("tr");
      const rawFileUrl = $row.find("a[href$='.pdf'], .file a").attr("href") || null;

      const documents: DocumentData[] = [];
      if (rawFileUrl) {
        documents.push(await buildDocument(rawFileUrl, titleNe, null));
      }

      notices.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        contentNe: null,
        type: type ?? "",
        publishedDate: null,
        sourceUrl,
        documents,
      });
      index++;
    }
  } else {
    // Detail page
    const titleNe =
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h1").text().trim() ||
      "";

    const contentNe = $(".field-name-body .field-item").text().trim() || null;
    const documents: DocumentData[] = [];

    for (const el of $(
      ".field-name-field-documents a, .field-name-field-supporting-documents a, .field-type-file a, .file a",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl) continue;
      documents.push(await buildDocument(rawFileUrl, titleNe, null));
    }

    notices.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      contentNe,
      type: type ?? "",
      publishedDate: null,
      sourceUrl: page.url,
      documents,
    });
  }

  return notices;
}

export async function handleTaxFeesNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  return handleGenericNotice($, type, page);
}

export async function handleDecisionNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  return handleGenericNotice($, type, page);
}
