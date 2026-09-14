import * as cheerio from 'cheerio';
import { ContentType } from '@prisma/client';
import { MunicipalityProfileData, PublicationData } from '../../../core/types/domain.js';

export const MUNICIPALITY_CODE = 'SAINAMAINA';

export function transform(raw: {
  profileRaw: string;
  publicationsRaw: string[];
}): { profile: MunicipalityProfileData; publications: PublicationData[] } {
  // 1. Transform Profile HTML
  const $profile = cheerio.load(raw.profileRaw);

  const establishedBs = $profile('.established-bs').text().trim() || null;
  const totalWardsStr = $profile('.total-wards').text().trim();
  const totalWards = totalWardsStr ? parseInt(totalWardsStr, 10) : null;

  const populationStr = $profile('.population').text().trim();
  const population = populationStr ? parseInt(populationStr, 10) : null;

  const areaSqKmStr = $profile('.area-sq-km').text().trim();
  const areaSqKm = areaSqKmStr ? parseFloat(areaSqKmStr) : null;

  const includedVdcsNe = $profile('.included-vdcs').text().trim() || null;
  const email = $profile('.email').text().trim() || null;
  const website = $profile('.website').text().trim() || null;
  const facebookPage = $profile('.facebook').text().trim() || null;
  const mobileNo = $profile('.mobile').text().trim() || null;
  const twitterHandle = $profile('.twitter').text().trim() || null;

  const totalSchoolsStr = $profile('.total-schools').text().trim();
  const totalSchools = totalSchoolsStr ? parseInt(totalSchoolsStr, 10) : null;

  const profile: MunicipalityProfileData = {
    municipalityCode: MUNICIPALITY_CODE,
    establishedBs,
    totalWards,
    population,
    areaSqKm,
    includedVdcsNe,
    email,
    website,
    facebookPage,
    mobileNo,
    twitterHandle,
    totalSchools,
  };

  // 2. Transform Publications HTML
  const publications: PublicationData[] = [];

  for (const pubHtml of raw.publicationsRaw) {
    const $pub = cheerio.load(pubHtml);

    $pub('.publication-item').each((_, el) => {
      const $item = $pub(el);
      const titleNe = $item.find('.title').text().trim() || 'शीर्षक उपलब्ध छैन';
      const descriptionNe = $item.find('.description').text().trim() || null;
      const publishedDateBs = $item.find('.date-bs').text().trim() || null;
      const fileUrl = $item.find('.file-link').attr('href') || null;
      const sourceUrl = $item.find('.title a').attr('href') || `https://sainamainamun.gov.np/notice-${Math.random()}`;

      const typeStr = $item.find('.type').text().trim().toUpperCase();
      let contentType: ContentType = ContentType.NOTICE;
      if (typeStr === 'POLICY') contentType = ContentType.POLICY;
      else if (typeStr === 'PROJECT') contentType = ContentType.PROJECT;
      else if (typeStr === 'REPORT') contentType = ContentType.REPORT;

      publications.push({
        municipalityCode: MUNICIPALITY_CODE,
        titleNe,
        titleEn: null,
        descriptionNe,
        publishedDateBs,
        publishedDateAd: null,
        sourceUrl: sourceUrl.startsWith('http') ? sourceUrl : `https://sainamainamun.gov.np${sourceUrl}`,
        fileUrl: fileUrl ? (fileUrl.startsWith('http') ? fileUrl : `https://sainamainamun.gov.np${fileUrl}`) : null,
        contentType,
      });
    });
  }

  return { profile, publications };
}
