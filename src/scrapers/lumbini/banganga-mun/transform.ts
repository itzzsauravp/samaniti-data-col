import { EtlPayload, MunicipalityData } from "../../../core/types/domain.js";
import { ScrapedPage } from "../../../core/contracts/scraper.interface.js";
import { transformPagesToEtlPayload } from "../../../core/transformers/detail.js";

export const MUNICIPALITY_CODE = "BANGANGA";

export const MUNICIPALITY_METADATA: MunicipalityData = {
    code: MUNICIPALITY_CODE,
    nameNe: "बाणगंगा नगरपालिका",
    nameEn: "Banganga Municipality",
    province: "Lumbini",
    district: "Kapilvastu",
};

export async function transform(pages: ScrapedPage[]): Promise<EtlPayload> {
    return transformPagesToEtlPayload(pages, MUNICIPALITY_METADATA, {
        contextSelector: ".detail__page-inner",
    });
}
