import {
    EtlPayload,
    MunicipalityData,
} from "../../../core/types/domain.js";
import { ScrapedPage } from "../../../core/contracts/scraper.interface.js";
import { executeTransform } from "../../../core/constants/transformers.js";
import {
    transformProjectListing,
    transformReportListing,
    transformReportDetail,
    transformNoticeDetail,
} from "../../../core/scraper/base-transformer.js";

export const MUNICIPALITY_CODE = "KANCHAN";

export const MUNICIPALITY_METADATA: MunicipalityData = {
    code: MUNICIPALITY_CODE,
    nameNe: "कञ्चन गाउँपालिका",
    nameEn: "Kanchan Rural Municipality",
    province: "Lumbini",
    district: "Rupandehi",
};

const TRANSFORMERS: Record<string, (page: ScrapedPage) => Promise<Partial<EtlPayload>>> = {
    report: (page) => transformReportListing(page, MUNICIPALITY_CODE),
    reportDetail: (page) => transformReportDetail(page, MUNICIPALITY_CODE),
    project: (page) => transformProjectListing(page, MUNICIPALITY_CODE),
    projectDetail: (page) => transformReportDetail(page, MUNICIPALITY_CODE), // fallback
    notice: (page) => transformReportListing(page, MUNICIPALITY_CODE),
    noticeDetail: (page) => transformNoticeDetail(page, MUNICIPALITY_CODE),
};

export async function transform(pages: ScrapedPage[]): Promise<EtlPayload> {
    return executeTransform(pages, MUNICIPALITY_METADATA, TRANSFORMERS);
}
