import { PrismaClient } from '@prisma/client';
import { MunicipalityProfileData, PublicationData } from '../types/domain.js';

export const prisma = new PrismaClient();

export async function upsertMunicipalityProfile(data: MunicipalityProfileData): Promise<void> {
  const { municipalityCode, ...profileFields } = data;

  // Ensure the Municipality record exists
  const municipality = await prisma.municipality.upsert({
    where: { code: municipalityCode },
    update: {},
    create: {
      code: municipalityCode,
      nameNe: municipalityCode,
      nameEn: municipalityCode,
      province: 'Unknown',
      district: 'Unknown',
    },
  });

  // Upsert the profile linked to the municipality
  await prisma.municipalityProfile.upsert({
    where: { municipalityId: municipality.id },
    update: {
      ...profileFields,
    },
    create: {
      ...profileFields,
      municipalityId: municipality.id,
    },
  });
}

export async function upsertPublication(data: PublicationData): Promise<void> {
  const { municipalityCode, ...pubFields } = data;

  // Ensure the Municipality record exists
  const municipality = await prisma.municipality.upsert({
    where: { code: municipalityCode },
    update: {},
    create: {
      code: municipalityCode,
      nameNe: municipalityCode,
      nameEn: municipalityCode,
      province: 'Unknown',
      district: 'Unknown',
    },
  });

  await prisma.publication.upsert({
    where: { sourceUrl: pubFields.sourceUrl },
    update: {
      titleNe: pubFields.titleNe,
      titleEn: pubFields.titleEn,
      descriptionNe: pubFields.descriptionNe,
      publishedDateBs: pubFields.publishedDateBs,
      publishedDateAd: pubFields.publishedDateAd,
      fileUrl: pubFields.fileUrl,
      storagePath: pubFields.storagePath,
      contentType: pubFields.contentType,
      municipalityId: municipality.id,
    },
    create: {
      ...pubFields,
      municipalityId: municipality.id,
    },
  });
}

export async function loadEtlData(payload: {
  profile: MunicipalityProfileData;
  publications: PublicationData[];
}): Promise<void> {
  await upsertMunicipalityProfile(payload.profile);
  for (const publication of payload.publications) {
    await upsertPublication(publication);
  }
}
