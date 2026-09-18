import "dotenv/config";
import fs from "node:fs/promises";
import { crawlRoutes } from "../core/scraper/crawler.js";
import { SiteConfig } from "../core/contracts/site-config.js";
import { loadEtlData, prisma } from "../core/db/loader.js";
import { exportEtlToTextIfEnabled } from "../core/export/index.js";
import { buildRoutesFromSite } from "./core/routes.js";
import { transformSite } from "./core/generic-transform.js";

interface RegistryEntry {
  code: string;
  nameNe: string;
  nameEn: string;
  province: string;
  district: string;
  baseUrl: string;
  stack: string;
  config: string;
  exportName?: string;
  enabled?: boolean;
}

interface Registry {
  municipalities: RegistryEntry[];
}

interface RunOptions {
  useMocks: boolean;
  extract: boolean;
  extractLimit: number;
  trigger: string;
}

function parseArgs(argv: string[]): {
  all: boolean;
  codes: string[];
  mock: boolean;
  live: boolean;
  extract: boolean;
  extractLimit?: number;
  trigger: string;
} {
  const result = {
    all: false,
    codes: [] as string[],
    mock: false,
    live: false,
    extract: false,
    extractLimit: undefined as number | undefined,
    trigger: "manual",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--all") {
      result.all = true;
    } else if (arg === "--mock") {
      result.mock = true;
    } else if (arg === "--live") {
      result.live = true;
    } else if (arg === "--extract") {
      result.extract = true;
    } else if (arg.startsWith("--extract-limit=")) {
      result.extractLimit = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--trigger=")) {
      result.trigger = arg.split("=")[1] || "manual";
    } else if (arg === "--trigger") {
      result.trigger = argv[++i] || "manual";
    } else if (!arg.startsWith("--")) {
      result.codes.push(arg.toUpperCase());
    }
  }

  return result;
}

async function loadRegistry(): Promise<Registry> {
  const raw = await fs.readFile(
    new URL("./municipalities.json", import.meta.url),
    "utf-8",
  );
  return JSON.parse(raw) as Registry;
}

async function resolveSite(entry: RegistryEntry): Promise<SiteConfig> {
  const moduleUrl = new URL(entry.config, import.meta.url);
  const mod = (await import(moduleUrl.href)) as Record<string, unknown>;
  const site = (
    (entry.exportName ? mod[entry.exportName] : undefined) ?? mod.default
  ) as SiteConfig | undefined;
  if (!site) {
    throw new Error(
      `[run] Config '${entry.config}' for '${entry.code}' has no default or '${entry.exportName ?? "exportName"}' export.`,
    );
  }
  return site;
}

async function recordStart(
  site: SiteConfig,
  trigger: string,
): Promise<string | null> {
  try {
    const log = await prisma.scrapeRunLog.create({
      data: {
        municipalityCode: site.municipality.code,
        siteCode: site.code,
        status: "running",
        trigger,
      },
      select: { id: true },
    });
    return log.id;
  } catch (err) {
    console.warn(`[run] Could not create scrape run log: ${String(err)}`);
    return null;
  }
}

async function recordFinish(
  logId: string | null,
  data: {
    status: "success" | "failed";
    pagesCrawled: number;
    projects: number;
    reports: number;
    notices: number;
    durationMs: number;
    errorMessage?: string;
  },
): Promise<void> {
  if (!logId) return;
  try {
    await prisma.scrapeRunLog.update({
      where: { id: logId },
      data: {
        status: data.status,
        pagesCrawled: data.pagesCrawled,
        projectsCount: data.projects,
        reportsCount: data.reports,
        noticesCount: data.notices,
        durationMs: data.durationMs,
        errorMessage: data.errorMessage ?? null,
        finishedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn(`[run] Could not update scrape run log: ${String(err)}`);
  }
}

async function runSite(
  site: SiteConfig,
  options: RunOptions,
): Promise<boolean> {
  const startedAt = Date.now();
  const logId = await recordStart(site, options.trigger);
  console.log(
    `\n[run] ${site.code} (${site.stack}) — useMocks: ${options.useMocks}, trigger: ${options.trigger}`,
  );

  try {
    const routes = buildRoutesFromSite(site);
    const pages = await crawlRoutes(routes, { useMocks: options.useMocks });
    console.log(`[run] ${site.code}: crawled ${pages.length} page(s).`);

    const payload = await transformSite(pages, site);
    const projects = payload.projects?.length ?? 0;
    const reports = payload.reports?.length ?? 0;
    const notices = payload.notices?.length ?? 0;
    console.log(
      `[run] ${site.code}: transformed ${projects + reports + notices} record(s) (${projects} projects, ${reports} reports, ${notices} notices).`,
    );

    await loadEtlData(payload);
    console.log(`[run] ${site.code}: load complete.`);

    const exported = await exportEtlToTextIfEnabled(payload);
    for (const file of exported) {
      console.log(`[run] ${site.code}: exported TXT transcript to ${file.path}`);
    }

    if (options.extract) {
      const { processPendingPdfExtractions } = await import("../core/pdf/index.js");
      const batch = await processPendingPdfExtractions(options.extractLimit);
      console.log(
        `[run] ${site.code}: PDF extraction processed ${batch.processed} (${batch.done} done, ${batch.failed} failed).`,
      );
    }

    await recordFinish(logId, {
      status: "success",
      pagesCrawled: pages.length,
      projects,
      reports,
      notices,
      durationMs: Date.now() - startedAt,
    });
    console.log(`[run] ${site.code}: SUCCESS.`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error(`[run] ${site.code}: FAILED — ${message}`);
    await recordFinish(logId, {
      status: "failed",
      pagesCrawled: 0,
      projects: 0,
      reports: 0,
      notices: 0,
      durationMs: Date.now() - startedAt,
      errorMessage: message,
    });
    return false;
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const registry = await loadRegistry();

  const enabled = registry.municipalities.filter((m) => m.enabled !== false);
  const selected = args.all
    ? enabled
    : enabled.filter((m) => args.codes.includes(m.code.toUpperCase()));

  if (args.codes.length > 0) {
    for (const code of args.codes) {
      if (!enabled.some((m) => m.code.toUpperCase() === code)) {
        console.warn(`[run] No enabled municipality registered for code '${code}'.`);
      }
    }
  }

  if (selected.length === 0) {
    console.error(
      "[run] Nothing to run. Pass one or more municipality codes, or --all. Available: " +
        enabled.map((m) => m.code).join(", "),
    );
    process.exitCode = 1;
    return;
  }

  const rawMock = process.env.USE_MOCK?.trim().toLowerCase().replace(/['"]/g, "");
  const envMock = rawMock === "true" || rawMock === "1";
  const useMocks = args.mock ? true : args.live ? false : envMock;
  const rawLimit = args.extractLimit ?? Number(process.env.PDF_EXTRACT_LIMIT ?? "10");
  const extractLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;
  const extract =
    args.extract ||
    ["true", "1"].includes(
      (process.env.SCRAPE_EXTRACT_PDFS ?? "").trim().toLowerCase(),
    );

  const options: RunOptions = { useMocks, extract, extractLimit, trigger: args.trigger };

  let failures = 0;
  for (const entry of selected) {
    try {
      const site = await resolveSite(entry);
      const ok = await runSite(site, options);
      if (!ok) failures++;
    } catch (err) {
      failures++;
      console.error(`[run] ${entry.code}: FAILED to initialize — ${String(err)}`);
    }
  }

  console.log(
    `\n[run] Finished: ${selected.length - failures}/${selected.length} site(s) succeeded.`,
  );
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("[run] Fatal error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });