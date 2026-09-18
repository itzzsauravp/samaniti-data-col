import cron from "node-cron";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");

const TRUE_VALUES = new Set(["true", "1"]);

let running = false;

function scraperArgs() {
  const codes = (process.env.SCRAPE_CRON_SITES ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

  const args = [
    "tsx",
    "src/scrapers/run.ts",
    ...(codes.length > 0 ? codes : ["--all"]),
    "--trigger=cron",
  ];

  if (TRUE_VALUES.has((process.env.SCRAPE_EXTRACT_PDFS ?? "").trim().toLowerCase())) {
    args.push("--extract");
  }

  return args;
}

function runScrapeOnce() {
  if (running) {
    console.warn("[cron] Previous scrape run still in progress; skipping this tick.");
    return;
  }
  running = true;

  const args = scraperArgs();
  console.log(`[cron] Starting scheduled scrape: npx ${args.join(" ")}`);

  const child = spawn("npx", args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: process.env,
  });

  child.on("error", (err) => {
    running = false;
    console.error("[cron] Failed to start scrape process:", err.message);
  });

  child.on("exit", (code) => {
    running = false;
    console.log(`[cron] Scrape process exited with code ${code ?? "unknown"}.`);
  });
}

/**
 * Starts the in-process scraper cron (node-cron) if CRON_ENABLED=true.
 * Returns the scheduled task, or null when disabled/invalid.
 */
export function startScraperCron() {
  const enabled = TRUE_VALUES.has(
    (process.env.CRON_ENABLED ?? "").trim().toLowerCase(),
  );
  if (!enabled) {
    console.log("[cron] Scraper cron disabled (set CRON_ENABLED=true to enable).");
    return null;
  }

  const schedule = process.env.SCRAPE_CRON?.trim() || "0 2 * * *";
  if (!cron.validate(schedule)) {
    console.error(`[cron] Invalid SCRAPE_CRON expression '${schedule}'; cron not started.`);
    return null;
  }

  const task = cron.schedule(schedule, runScrapeOnce, {
    scheduled: true,
    timezone: process.env.SCRAPE_CRON_TZ || undefined,
  });

  const scope = process.env.SCRAPE_CRON_SITES?.trim() || "all enabled municipalities";
  console.log(`[cron] Scraper cron enabled ('${schedule}') for ${scope}.`);
  return task;
} 
