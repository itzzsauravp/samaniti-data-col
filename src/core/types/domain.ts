import { ContentType } from '@prisma/client';

export interface MunicipalityProfileData {
  municipalityCode: string;
  establishedBs?: string | null;
  totalWards?: number | null;
  population?: number | null;
  areaSqKm?: number | null;
  includedVdcsNe?: string | null;
  email?: string | null;
  website?: string | null;
  facebookPage?: string | null;
  mobileNo?: string | null;
  twitterHandle?: string | null;
  totalSchools?: number | null;
}

export interface PublicationData {
  municipalityCode: string;
  titleNe: string;
  titleEn?: string | null;
  descriptionNe?: string | null;
  publishedDateBs?: string | null;
  publishedDateAd?: Date | null;
  sourceUrl: string;
  fileUrl?: string | null;
  storagePath?: string | null;
  contentType: ContentType;
}
