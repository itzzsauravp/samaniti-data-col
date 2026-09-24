import { EtlPayload, MunicipalityData } from "../../../core/types/domain.js";
import { ScrapedPage } from "../../../core/contracts/scraper.interface.js";
import { transformPagesToEtlPayload } from "../../../core/transformers/detail.js";

export const MUNICIPALITY_CODE = "DHANKAUL";

export const MUNICIPALITY_METADATA: MunicipalityData = {
    code: MUNICIPALITY_CODE,
    nameNe: "धनकौल गाउँपालिका",
    nameEn: "Dhankaul Rural Municipality",
    province: "Madesh",
    district: "Sarlahi",
};

export async function transform(pages: ScrapedPage[]): Promise<EtlPayload> {
    return transformPagesToEtlPayload(pages, MUNICIPALITY_METADATA);
}
