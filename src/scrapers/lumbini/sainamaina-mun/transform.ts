import * as cheerio from 'cheerio';
import {
  DocumentData,
  EtlPayload,
  MunicipalityData,
  MunicipalityProfileData,
  NoticeData,
  ProjectData,
  ReportData,
} from '../../../core/types/domain.js';
import { ScrapedPage } from '../../../core/contracts/scraper.interface.js';
import {
  parseNepaliInt,
  parseNepaliFloat,
  parseNepaliFiscalYear,
  normalizeNepaliDate,
} from '../../../core/utils/index.js';

export const MUNICIPALITY_CODE = 'SAINAMAINA';

export const MUNICIPALITY_METADATA: MunicipalityData = {
  code: MUNICIPALITY_CODE,
  nameNe: 'सैनामैना नगरपालिका',
  nameEn: 'Sainamaina Municipality',
  province: 'Lumbini',
  district: 'Rupandehi',
};

// ---------------------------------------------------------------------------
// Per-page transform handlers
// Each function receives the raw HTML for exactly one page and returns
// the slice of EtlPayload it is responsible for.
// ---------------------------------------------------------------------------

function transformProfile(html: string): Partial<EtlPayload> {
  const $ = cheerio.load(html);

  const profile: MunicipalityProfileData = {
    municipalityCode: MUNICIPALITY_CODE,
    establishedBs:   $('.established-bs').text().trim() || null,
    totalWards:      parseNepaliInt($('.total-wards').text()),
    population:      parseNepaliInt($('.population').text()),
    areaSqKm:        parseNepaliFloat($('.area-sq-km').text()),
    includedVdcsNe:  $('.included-vdcs').text().trim() || null,
    email:           $('.email').text().trim() || null,
    website:         $('.website').text().trim() || null,
    facebookPage:    $('.facebook').text().trim() || null,
    mobileNo:        $('.mobile').text().trim() || null,
    twitterHandle:   $('.twitter').text().trim() || null,
    totalSchools:    parseNepaliInt($('.total-schools').text()),
  };

  return { profile };
}

function transformNotices(html: string): Partial<EtlPayload> {
  const $ = cheerio.load(html);
  const projects: ProjectData[] = [];
  const reports:  ReportData[]  = [];
  const notices:  NoticeData[]  = [];

  $('.publication-item').each((_, el) => {
    const $item = $(el);
    const titleNe      = $item.find('.title').text().trim() || 'शीर्षक उपलब्ध छैन';
    const descriptionNe = $item.find('.description').text().trim() || null;
    const rawDateBs    = $item.find('.date-bs').text().trim() || null;
    const publishedDate = normalizeNepaliDate(rawDateBs) || rawDateBs;
    const rawFileUrl   = $item.find('.file-link').attr('href') || null;
    const rawSourceUrl = $item.find('.title a').attr('href') || `/notice-${Math.random()}`;

    const base       = 'https://sainamainamun.gov.np';
    const sourceUrl  = rawSourceUrl.startsWith('http') ? rawSourceUrl : `${base}${rawSourceUrl}`;
    const fileUrl    = rawFileUrl
      ? (rawFileUrl.startsWith('http') ? rawFileUrl : `${base}${rawFileUrl}`)
      : null;

    const documents: DocumentData[] = fileUrl
      ? [{
          fileName:    fileUrl.split('/').pop() || 'attachment.pdf',
          fileType:    fileUrl.endsWith('.pdf') ? 'application/pdf' : null,
          originalUrl: fileUrl,
          storagePath: null,
        }]
      : [];

    const typeStr    = $item.find('.type').text().trim().toUpperCase();
    const fiscalYear = parseNepaliFiscalYear(titleNe) || parseNepaliFiscalYear(descriptionNe);

    if (typeStr === 'PROJECT') {
      projects.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe, titleEn: null,
        budgetAmount: null, fiscalYear,
        status: 'Ongoing', wardNo: null,
        sourceUrl, documents,
      });
    } else if (typeStr === 'REPORT') {
      reports.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe, titleEn: null,
        reportType: 'General Report', fiscalYear,
        publishedDate, sourceUrl, documents,
      });
    } else {
      notices.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe, titleEn: null,
        contentNe: descriptionNe,
        noticeType: typeStr === 'POLICY' ? 'POLICY' : 'NOTICE',
        publishedDate, sourceUrl, documents,
      });
    }
  });

  return { projects, reports, notices };
}

// ---------------------------------------------------------------------------
// Transformer registry
// Add a new entry here when a new page type / route is added to ROUTES.
// The key must exactly match the `type` field in RouteConfig.
// ---------------------------------------------------------------------------
const TRANSFORMERS: Record<string, (html: string) => Partial<EtlPayload>> = {
  profile: transformProfile,
  notices: transformNotices,
};

// ---------------------------------------------------------------------------
// Main transform entry point
// Dispatches each scraped page to its handler and merges the results.
// ---------------------------------------------------------------------------
export function transform(pages: ScrapedPage[]): EtlPayload {
  let merged: Partial<EtlPayload> = {};

  for (const page of pages) {
    const handler = TRANSFORMERS[page.type];
    if (!handler) {
      console.warn(`[transform] No handler registered for page type '${page.type}'. Skipping.`);
      continue;
    }
    const partial = handler(page.html);

    // Merge arrays (projects/reports/notices) instead of overwriting
    merged = {
      ...merged,
      ...partial,
      projects: [...(merged.projects ?? []), ...(partial.projects ?? [])],
      reports:  [...(merged.reports  ?? []), ...(partial.reports  ?? [])],
      notices:  [...(merged.notices  ?? []), ...(partial.notices  ?? [])],
    };
  }

  return {
    municipality: MUNICIPALITY_METADATA,
    ...merged,
  };
}
