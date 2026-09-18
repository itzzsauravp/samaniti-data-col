import fs from "node:fs/promises";
import path from "node:path";
import {
  DocumentData,
  EtlPayload,
  NoticeData,
  ProjectData,
  ReportData,
} from "../types/domain.js";

const RULE = "─".repeat(60);
const SEPARATOR = "─".repeat(60);

export interface ExportedTextFile {
  path: string;
  lineCount: number;
  recordCount: number;
}

export interface ExportTextOptions {
  dir?: string;
}

export function loadExportTxtConfigFromEnv(): { enabled: boolean; dir: string } {
  const raw = process.env.EXPORT_TXT?.trim().toLowerCase().replace(/['"]/g, "");
  return {
    enabled: raw === "true" || raw === "1",
    dir: process.env.EXPORT_TXT_DIR ?? "storage/export",
  };
}

function field(label: string, value?: string | number | null): string[] {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return [];
  }
  return [`${label}: ${value}`];
}

function documentBlock(doc: DocumentData, index: number): string[] {
  const lines = [`संलग्न फाइल ${index}: ${doc.fileName}`];
  if (doc.storagePath) {
    lines.push(`  स्थान: ${doc.storagePath}`);
  } else {
    lines.push(`  स्रोत: ${doc.originalUrl}`);
  }
  if (doc.downloadStatus === "failed") {
    lines.push(`  अवस्था: त्रुटि (${doc.downloadError ?? "अज्ञात"})`);
  } else if (doc.downloadStatus === "skipped") {
    lines.push(`  अवस्था: फाइल डाउनलोड छोडियो`);
  }
  return lines;
}

function noticeBlock(notice: NoticeData): string[] {
  const lines: string[] = [RULE];
  lines.push(`सूचना — ${notice.type ?? ""}`.trim());
  lines.push(...field("विषय", notice.titleNe));
  lines.push(...field("प्रकाशित मिति", notice.publishedDate));
  lines.push(...field("स्रोत", notice.sourceUrl));
  if (notice.contentNe) {
    lines.push("");
    lines.push(notice.contentNe);
  }
  for (const [i, doc] of (notice.documents ?? []).entries()) {
    lines.push("", ...documentBlock(doc, i + 1));
  }
  lines.push(SEPARATOR);
  return lines;
}

function reportBlock(report: ReportData): string[] {
  const lines: string[] = [RULE];
  lines.push(`प्रतिवेदन — ${report.type ?? ""}`.trim());
  lines.push(...field("विषय", report.titleNe));
  lines.push(...field("प्रकाशित मिति", report.publishedDate));
  lines.push(...field("आर्थिक वर्ष", report.fiscalYear));
  lines.push(...field("स्रोत", report.sourceUrl));
  for (const [i, doc] of (report.documents ?? []).entries()) {
    lines.push("", ...documentBlock(doc, i + 1));
  }
  lines.push(SEPARATOR);
  return lines;
}

function projectBlock(project: ProjectData): string[] {
  const lines: string[] = [RULE];
  lines.push(`निर्माण परियोजना — ${project.type ?? ""}`.trim());
  lines.push(...field("विषय", project.titleNe));
  lines.push(...field("बजेट (रु)", project.budgetAmount));
  lines.push(...field("आर्थिक वर्ष", project.fiscalYear));
  lines.push(...field("स्थिति", project.status));
  lines.push(...field("वडा", project.wardNo));
  lines.push(...field("स्रोत", project.sourceUrl));
  for (const [i, doc] of (project.documents ?? []).entries()) {
    lines.push("", ...documentBlock(doc, i + 1));
  }
  lines.push(SEPARATOR);
  return lines;
}

export function buildTextTranscript(data: EtlPayload): string {
  const m = data.municipality;
  const projects = data.projects ?? [];
  const reports = data.reports ?? [];
  const notices = data.notices ?? [];
  const total = projects.length + reports.length + notices.length;

  const lines: string[] = [];
  lines.push(`${m.nameNe}${m.nameEn ? ` (${m.nameEn})` : ""} नगरपालिका`);
  lines.push(
    `प्रदेश: ${m.province} | जिल्ला: ${m.district} | कोड: ${m.code}`,
  );
  lines.push("");
  lines.push(RULE);
  lines.push(
    `कुल अभिलेख: ${total} निर्माण: ${projects.length} प्रतिवेदन: ${reports.length} सूचना: ${notices.length}`,
  );
  lines.push("");

  if (projects.length > 0) {
    lines.push("[ निर्माण परियोजनाहरू ]");
    for (const project of projects) lines.push("", ...projectBlock(project));
  }

  if (reports.length > 0) {
    lines.push("[ प्रतिवेदनहरू ]");
    for (const report of reports) lines.push("", ...reportBlock(report));
  }

  if (notices.length > 0) {
    lines.push("[ सूचनाहरू ]");
    for (const notice of notices) lines.push("", ...noticeBlock(notice));
  }

  return lines.join("\n") + "\n";
}

export async function exportEtlToText(
  data: EtlPayload,
  options: ExportTextOptions = {},
): Promise<ExportedTextFile[]> {
  const config = loadExportTxtConfigFromEnv();
  const dir = options.dir ?? config.dir;
  await fs.mkdir(dir, { recursive: true });

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const filePath = path.join(
    dir,
    `${data.municipality.code.toLowerCase()}-${stamp}.txt`,
  );

  const transcript = buildTextTranscript(data);
  await fs.writeFile(filePath, transcript, "utf-8");

  const recordCount =
    (data.projects?.length ?? 0) +
    (data.reports?.length ?? 0) +
    (data.notices?.length ?? 0);

  return [
    {
      path: filePath,
      lineCount: transcript.split("\n").length,
      recordCount,
    },
  ];
}

export async function exportEtlToTextIfEnabled(
  data: EtlPayload,
  options: ExportTextOptions = {},
): Promise<ExportedTextFile[]> {
  if (!loadExportTxtConfigFromEnv().enabled) return [];
  return exportEtlToText(data, options);
}