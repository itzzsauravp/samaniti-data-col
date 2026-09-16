import * as cheerio from "cheerio";
import { NoticeData, DocumentData } from "../../../../core/types/domain.js";
import { buildDocument, MUNICIPALITY_CODE } from "../transform.js";
import { isRecordExisting } from "../../../../core/db/loader.js";
import { ScrapedPage } from "../../../../core/contracts/scraper.interface.js";

/**
 * Sub-transformers for different types of notices.
 */

export async function handleGenericNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  const notices: NoticeData[] = [];
  const rows = $(".view-content:eq(1) .views-row").toArray();

  if (rows.length > 0) {
    for (const el of rows) {
      const $item = $(el);
      const $titleLink = $item.find(".views-field-title a");
      const titleNe = $titleLink.text().trim();
      let rawSourceUrl;

      if (titleNe) {
        rawSourceUrl = `/ne/content/${titleNe}`;
      }

      rawSourceUrl = $titleLink.attr("href") || page.url;
      const publishedDate =
        $item.find(".views-field-created .field-content").text().trim() || null;
      const base = "https://sainamainamun.gov.np";
      const sourceUrl = rawSourceUrl.startsWith("http")
        ? rawSourceUrl
        : `${base}${rawSourceUrl}`;

      if (await isRecordExisting(sourceUrl)) {
        console.log(`[Delta Skip] Notice exists: ${sourceUrl}`);
        continue;
      }

      const rawFileUrl =
        $item.find(".views-field-field-documents a").attr("href") || null;

      const documents: DocumentData[] = [];
      if (rawFileUrl) {
        documents.push(
          await buildDocument(
            rawFileUrl,
            titleNe,
            publishedDate,
            page.subFolder as string, // noheadache fix (trust me)
            "notices",
          ),
        );
      }

      notices.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        contentNe: null,
        type,
        publishedDate,
        sourceUrl,
        documents,
      });
    }
  } else {
    const titleNe =
      type ||
      $("h3.section-title span").text().trim() ||
      $('span[property="dc:title"]').attr("content")?.trim() ||
      $("h1").text().trim();

    const contentNe = $(".field-name-body .field-item").text().trim() || null;

    const documents: DocumentData[] = [];
    for (const el of $(
      ".field-name-field-supporting-documents a, .field-type-file a, .file a",
    ).toArray()) {
      const rawFileUrl = $(el).attr("href");
      if (!rawFileUrl) continue;
      documents.push(
        await buildDocument(
          rawFileUrl,
          titleNe,
          null,
          page.subFolder,
          "notices",
        ),
      );
    }

    notices.push({
      municipalityCode: MUNICIPALITY_CODE,
      titleNe,
      titleEn: null,
      contentNe,
      type,
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
  // Specific logic for decisions/meeting minutes
  return handleGenericNotice($, type, page);
}

export async function handlePublicProcurementTenderNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  // Specific logic for procurement/tenders
  return handleGenericNotice($, type, page);
}

export async function handleActLawDirectivesNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  // Specific logic for acts/laws/directives
  return handleGenericNotice($, type, page);
}

export async function handleTaxFeesNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  // Specific logic for acts/laws/directives
  return handleGenericNotice($, type, page);
}

export async function handleDecisionNotice(
  $: cheerio.CheerioAPI,
  type: string | undefined,
  page: ScrapedPage,
): Promise<NoticeData[]> {
  // Specific logic for decisions/meeting minutes
  return handleGenericNotice($, type, page);
}
