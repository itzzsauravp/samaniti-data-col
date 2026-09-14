export interface MunicipalityData {
  code: string;
  nameNe: string;
  nameEn: string;
  province: string;
  district: string;
}

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

export interface DocumentData {
  fileName: string;
  fileType?: string | null;
  originalUrl: string;
  storagePath?: string | null;
}

export interface ProjectData {
  municipalityCode: string;
  titleNe: string;
  titleEn?: string | null;
  budgetAmount?: number | null;
  fiscalYear?: string | null;
  status?: string | null;
  wardNo?: number | null;
  sourceUrl: string;
  documents?: DocumentData[];
}

export interface ReportData {
  municipalityCode: string;
  titleNe: string;
  titleEn?: string | null;
  reportType?: string | null;
  fiscalYear?: string | null;
  publishedDate?: string | null;
  sourceUrl: string;
  documents?: DocumentData[];
}

export interface NoticeData {
  municipalityCode: string;
  titleNe: string;
  titleEn?: string | null;
  contentNe?: string | null;
  noticeType?: string | null;
  publishedDate?: string | null;
  sourceUrl: string;
  documents?: DocumentData[];
}

export interface EtlPayload {
  municipality: MunicipalityData;
  profile?: MunicipalityProfileData;
  projects?: ProjectData[];
  reports?: ReportData[];
  notices?: NoticeData[];
}
