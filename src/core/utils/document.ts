import { DocumentData } from "../types/domain.js";
import { getFileMetadata } from "./file.js";

/**
 * Builds a DocumentData object from a file URL and base URL.
 *
 * @param fileUrl - The relative or absolute file URL
 * @param baseUrl - The base URL of the municipality site (e.g. "https://sainamainamun.gov.np")
 * @param _titleNe - Optional Nepali title for context
 * @param _publishedDate - Optional published date for context
 */
export async function buildDocument(
    fileUrl: string,
    baseUrl: string,
    _titleNe?: string,
    _publishedDate?: string | null,
): Promise<DocumentData> {
    const absoluteUrl = fileUrl.startsWith("http") ? fileUrl : `${baseUrl}${fileUrl}`;
    const rawFileName = absoluteUrl.split("/").pop()?.split("?")[0] || "attachment.pdf";
    const fileName = decodeURIComponent(rawFileName);

    return {
        fileName,
        fileType: getFileMetadata(fileName).mimeType,
        originalUrl: absoluteUrl,
        storagePath: null,
        downloadStatus: "pending",
        downloadError: null,
    };
}
