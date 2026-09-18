import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
    MunicipalityData,
    MunicipalityProfileData,
    ProjectData,
    ReportData,
    NoticeData,
    DocumentData,
    EtlPayload,
} from "../types/domain.js";

if (!process.env.DATABASE_URL) {
    throw new Error("[loader] DATABASE_URL environment variable is not set.");
}

// PrismaPg accepts a connection string, pg.PoolConfig, or pg.Pool directly.
const adapter = new PrismaPg(process.env.DATABASE_URL);
export const prisma = new PrismaClient({ adapter });

/**
 * Creates or updates the primary Municipality entry.
 */
export async function upsertMunicipality(data: MunicipalityData) {
    return await prisma.municipality.upsert({
        where: { code: data.code },
        update: {
            nameNe: data.nameNe,
            nameEn: data.nameEn,
            province: data.province,
            district: data.district,
        },
        create: {
            code: data.code,
            nameNe: data.nameNe,
            nameEn: data.nameEn,
            province: data.province,
            district: data.district,
        },
    });
}

/**
 * Creates or updates profile overview data for a municipality.
 */
export async function upsertMunicipalityProfile(data: MunicipalityProfileData): Promise<void> {
    const { municipalityCode, ...profileFields } = data;

    const municipality = await prisma.municipality.findUnique({
        where: { code: municipalityCode },
    });

    if (!municipality) {
        throw new Error(`Municipality with code '${municipalityCode}' not found.`);
    }

    await prisma.municipalityProfile.upsert({
        where: { municipalityId: municipality.id },
        update: { ...profileFields },
        create: {
            ...profileFields,
            municipalityId: municipality.id,
        },
    });
}

/**
 * Maps input document objects into Prisma upsert queries (unique by originalUrl),
 * and deduplicates documents to prevent unique constraint clashes in a single payload.
 */
function buildDocumentUpsertQuery(docs?: DocumentData[]) {
    if (!docs || docs.length === 0) return undefined;

    // Deduplicate documents by originalUrl using a Map
    const uniqueDocsMap = new Map<string, DocumentData>();
    for (const doc of docs) {
        if (doc.originalUrl) {
            uniqueDocsMap.set(doc.originalUrl, doc);
        }
    }

    return {
        connectOrCreate: Array.from(uniqueDocsMap.values()).map((doc) => ({
            where: { originalUrl: doc.originalUrl },
            create: {
                fileName: doc.fileName,
                fileType: doc.fileType,
                originalUrl: doc.originalUrl,
                storagePath: doc.storagePath,
                downloadStatus: doc.downloadStatus ?? "pending",
                downloadError: doc.downloadError ?? null,
            },
        })),
    };
}

/**
 * Upserts a Project record and links attached documents using `sourceUrl` as unique key.
 */
export async function upsertProject(data: ProjectData): Promise<void> {
    const { municipalityCode, documents, ...projectFields } = data;

    const municipality = await prisma.municipality.findUnique({
        where: { code: municipalityCode },
    });

    if (!municipality) {
        throw new Error(`Municipality with code '${municipalityCode}' not found.`);
    }

    await prisma.project.upsert({
        where: { sourceUrl: projectFields.sourceUrl },
        update: {
            titleNe: projectFields.titleNe,
            titleEn: projectFields.titleEn,
            budgetAmount: projectFields.budgetAmount,
            fiscalYear: projectFields.fiscalYear,
            status: projectFields.status,
            wardNo: projectFields.wardNo,
            type: projectFields.type,
            municipalityId: municipality.id,
        },
        create: {
            ...projectFields,
            municipalityId: municipality.id,
            documents: buildDocumentUpsertQuery(documents),
        },
    });
}

/**
 * Upserts a Report record and links attached documents using `sourceUrl` as unique key.
 */
export async function upsertReport(data: ReportData): Promise<void> {
    const { municipalityCode, documents, ...reportFields } = data;

    const municipality = await prisma.municipality.findUnique({
        where: { code: municipalityCode },
    });

    if (!municipality) {
        throw new Error(`Municipality with code '${municipalityCode}' not found.`);
    }

    await prisma.report.upsert({
        where: { sourceUrl: reportFields.sourceUrl },
        update: {
            titleNe: reportFields.titleNe,
            titleEn: reportFields.titleEn,
            type: reportFields.type,
            fiscalYear: reportFields.fiscalYear,
            publishedDate: reportFields.publishedDate,
            metadata: reportFields.metadata,
            municipalityId: municipality.id,
        },
        create: {
            ...reportFields,
            municipalityId: municipality.id,
            documents: buildDocumentUpsertQuery(documents),
        },
    });
}

/**
 * Upserts a Notice record and links attached documents using `sourceUrl` as unique key.
 */
export async function upsertNotice(data: NoticeData): Promise<void> {
    const { municipalityCode, documents, ...noticeFields } = data;

    const municipality = await prisma.municipality.findUnique({
        where: { code: municipalityCode },
    });

    if (!municipality) {
        throw new Error(`Municipality with code '${municipalityCode}' not found.`);
    }

    await prisma.notice.upsert({
        where: { sourceUrl: noticeFields.sourceUrl },
        update: {
            titleNe: noticeFields.titleNe,
            titleEn: noticeFields.titleEn,
            contentNe: noticeFields.contentNe,
            type: noticeFields.type,
            publishedDate: noticeFields.publishedDate,
            metadata: noticeFields.metadata,
            municipalityId: municipality.id,
        },
        create: {
            ...noticeFields,
            municipalityId: municipality.id,
            documents: buildDocumentUpsertQuery(documents),
        },
    });
}

/**
 * Master loader method to run all domain upserts sequentially for a scraper execution.
 */
export async function loadEtlData(payload: EtlPayload): Promise<void> {
    console.log("ETL Payload:", payload);

    // 1. Upsert target municipality base record
    await upsertMunicipality(payload.municipality);

    // 2. Upsert profile attributes if present
    if (payload.profile) {
        await upsertMunicipalityProfile(payload.profile);
    }

    // 3. Upsert projects list
    if (payload.projects && payload.projects.length > 0) {
        for (const project of payload.projects) {
            await upsertProject(project);
        }
    }

    // 4. Upsert reports list
    if (payload.reports && payload.reports.length > 0) {
        for (const report of payload.reports) {
            await upsertReport(report);
        }
    }

    // 5. Upsert notices list
    if (payload.notices && payload.notices.length > 0) {
        for (const notice of payload.notices) {
            await upsertNotice(notice);
        }
    }
}
