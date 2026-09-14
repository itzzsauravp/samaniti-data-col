import { loadEtlData } from '../../../core/db/loader.js';
import { MunicipalityProfileData, PublicationData } from '../../../core/types/domain.js';

export async function load(data: {
  profile: MunicipalityProfileData;
  publications: PublicationData[];
}): Promise<void> {
  await loadEtlData(data);
}
