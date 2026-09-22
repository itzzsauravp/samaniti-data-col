import { loadEtlData } from "../../../core/db/loader.js";
import { EtlPayload } from "../../../core/types/domain.js";

export async function load(data: EtlPayload): Promise<void> {
    await loadEtlData(data);
}
