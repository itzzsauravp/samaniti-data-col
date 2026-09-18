import { EtlPayload } from "../../../core/types/domain.js";
import { ScrapedPage } from "../../../core/contracts/scraper.interface.js";
import { loadKeywordFilterFromEnv } from "../../../core/utils/index.js";
import { SAINAMAINA_SITE } from "../../configs/sainamaina.js";
import { transformSite } from "../../core/generic-transform.js";

export const MUNICIPALITY_CODE = SAINAMAINA_SITE.municipality.code;
export const MUNICIPALITY_METADATA = SAINAMAINA_SITE.municipality;
export const KEYWORD_FILTER =
  SAINAMAINA_SITE.keywordFilter ?? loadKeywordFilterFromEnv();

export async function transform(pages: ScrapedPage[]): Promise<EtlPayload> {
  return transformSite(pages, SAINAMAINA_SITE);
}