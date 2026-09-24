import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ScraperTarget {
    province: string;
    municipality: string;
    cleanMun: string;
    path: string;
    displayName: string;
}

export interface ScraperResult {
    target: ScraperTarget;
    success: boolean;
    durationMs: number;
    exitCode: number | null;
    error?: string;
}

export function getAvailableScrapers(): ScraperTarget[] {
    const scrapersDir = path.join(__dirname, "src", "scrapers");
    const results: ScraperTarget[] = [];

    if (!fs.existsSync(scrapersDir)) return results;

    const provinces = fs.readdirSync(scrapersDir, { withFileTypes: true });
    for (const prov of provinces) {
        if (!prov.isDirectory()) continue;
        const provName = prov.name;
        const provPath = path.join(scrapersDir, provName);

        const municipalities = fs.readdirSync(provPath, { withFileTypes: true });
        for (const mun of municipalities) {
            if (!mun.isDirectory()) continue;
            const munName = mun.name;
            const indexPath = path.join(provPath, munName, "index.ts");
            if (fs.existsSync(indexPath)) {
                const cleanMun = munName.replace(/-mun$/, "");
                results.push({
                    province: provName,
                    municipality: munName,
                    cleanMun,
                    path: indexPath,
                    displayName: `${provName}:${cleanMun}`,
                });
            }
        }
    }
    return results;
}

export function resolveTargets(
    allScrapers: ScraperTarget[],
    targetArg?: string,
): { targets: ScraperTarget[]; isSingle: boolean; scopeDesc: string } {
    if (allScrapers.length === 0) {
        return { targets: [], isSingle: false, scopeDesc: "No scrapers available" };
    }

    if (!targetArg || targetArg.toLowerCase().trim() === "all") {
        return {
            targets: allScrapers,
            isSingle: false,
            scopeDesc: "All provinces & municipalities",
        };
    }

    const clean = targetArg.toLowerCase().trim();

    // 1. Check for province:municipality format
    if (clean.includes(":")) {
        const [prov, mun] = clean.split(":");
        const matched = allScrapers.find(
            (s) =>
                s.province === prov &&
                (s.municipality === mun || s.municipality === `${mun}-mun` || s.cleanMun === mun),
        );
        return {
            targets: matched ? [matched] : [],
            isSingle: true,
            scopeDesc: `Single scraper (${clean})`,
        };
    }

    // 2. Check if clean matches an entire province
    const provinceMatches = allScrapers.filter((s) => s.province === clean);
    if (provinceMatches.length > 0) {
        return {
            targets: provinceMatches,
            isSingle: false,
            scopeDesc: `Province '${clean}' (${provinceMatches.length} municipalities)`,
        };
    }

    // 3. Fallback: Check if clean matches a municipality name directly
    const munMatches = allScrapers.filter((s) => s.municipality === clean || s.cleanMun === clean);
    if (munMatches.length === 1) {
        return {
            targets: munMatches,
            isSingle: true,
            scopeDesc: `Single scraper (${munMatches[0].displayName})`,
        };
    }
    if (munMatches.length > 1) {
        return {
            targets: munMatches,
            isSingle: false,
            scopeDesc: `Matching municipalities (${munMatches.length})`,
        };
    }

    return { targets: [], isSingle: false, scopeDesc: `No matches for '${clean}'` };
}

function executeSingle(target: ScraperTarget, routeFilter?: string | null): Promise<number> {
    console.log(`[Runner] Executing scraper for '${target.displayName}'...\n`);
    return new Promise((resolve) => {
        const child = spawn("npx", ["tsx", target.path], {
            stdio: "inherit",
            env: {
                ...process.env,
                FILTER_ROUTE: routeFilter || process.env.FILTER_ROUTE || "",
                CRAWLEE_STORAGE_DIR: path.resolve(`./storage/tmp/crawlee-${target.municipality}-${Date.now()}`),
            },
        });

        child.on("close", (code) => {
            resolve(code ?? 0);
        });

        child.on("error", (err) => {
            console.error(`[Runner] Failed to start process for '${target.displayName}':`, err);
            resolve(1);
        });
    });
}

/**
 * Runs scrapers one-by-one in strict order. Safer for government portals
 * with rate limits and avoids Crawlee storage lock collisions.
 * This is the default mode for multi-target runs.
 */
async function executeSequential(
    targets: ScraperTarget[],
    routeFilter?: string | null,
): Promise<ScraperResult[]> {
    console.log(`\n[Runner] 🔁 Starting sequential execution of ${targets.length} scraper(s)...\n`);

    const results: ScraperResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < targets.length; i++) {
        const target = targets[i];
        const itemStartTime = Date.now();

        console.log(`[Runner] [${i + 1}/${targets.length}] Starting ${target.displayName}`);

        const exitCode = await executeSingle(target, routeFilter);
        const durationMs = Date.now() - itemStartTime;
        const success = exitCode === 0;

        if (success) {
            console.log(
                `[Runner] ✅ ${target.displayName} completed in ${(durationMs / 1000).toFixed(1)}s (${i + 1}/${targets.length})`,
            );
        } else {
            console.error(
                `[Runner] ❌ ${target.displayName} failed (exit ${exitCode}) in ${(durationMs / 1000).toFixed(1)}s (${i + 1}/${targets.length})`,
            );
        }

        results.push({ target, success, durationMs, exitCode });
    }

    const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n============================================================`);
    console.log(`[Runner] 📊 Execution Summary (Sequential)`);
    console.log(`============================================================`);
    for (const r of results) {
        const icon = r.success ? "✅" : "❌";
        const dur = (r.durationMs / 1000).toFixed(1) + "s";
        console.log(
            `  ${icon} ${r.target.displayName.padEnd(25)} Duration: ${dur.padStart(6)}${r.success ? "" : ` (Exit Code: ${r.exitCode})`}`,
        );
    }
    console.log(`------------------------------------------------------------`);
    console.log(`Total: ${results.length} | Succeeded: ${successful} | Failed: ${failed}`);
    console.log(`Total Elapsed Time: ${totalDurationSec}s`);
    console.log(`============================================================\n`);

    return results;
}

async function executeParallel(
    targets: ScraperTarget[],
    concurrency: number,
    routeFilter?: string | null,
): Promise<ScraperResult[]> {
    console.log(`\n[Runner] 🚀 Starting parallel execution of ${targets.length} scraper(s)...`);
    console.log(
        `[Runner] Concurrency: ${concurrency} parallel workers (Available CPU cores: ${os.cpus().length})\n`,
    );

    const results: ScraperResult[] = [];
    let completedCount = 0;
    const startTime = Date.now();

    let currentIndex = 0;

    async function worker(workerId: number): Promise<void> {
        while (currentIndex < targets.length) {
            const index = currentIndex++;
            const target = targets[index];
            const prefix = `[${target.displayName}]`;
            const itemStartTime = Date.now();

            console.log(`[Runner] [Worker ${workerId}] Starting ${target.displayName}`);

            const result = await new Promise<ScraperResult>((resolve) => {
                const child = spawn("npx", ["tsx", target.path], {
                    stdio: ["ignore", "pipe", "pipe"],
                    env: {
                        ...process.env,
                        FILTER_ROUTE: routeFilter || process.env.FILTER_ROUTE || "",
                        CRAWLEE_STORAGE_DIR: path.resolve(`./storage/tmp/crawlee-${target.municipality}-${Date.now()}`),
                    },
                });

                if (child.stdout) {
                    const rlOut = readline.createInterface({ input: child.stdout });
                    rlOut.on("line", (line) => {
                        console.log(`${prefix} ${line}`);
                    });
                }

                if (child.stderr) {
                    const rlErr = readline.createInterface({ input: child.stderr });
                    rlErr.on("line", (line) => {
                        console.error(`${prefix} [stderr] ${line}`);
                    });
                }

                child.on("close", (code) => {
                    const durationMs = Date.now() - itemStartTime;
                    const success = code === 0;
                    completedCount++;
                    if (success) {
                        console.log(
                            `[Runner] ✅ ${target.displayName} completed successfully in ${(durationMs / 1000).toFixed(1)}s (${completedCount}/${targets.length})`,
                        );
                    } else {
                        console.error(
                            `[Runner] ❌ ${target.displayName} failed with code ${code} in ${(durationMs / 1000).toFixed(1)}s (${completedCount}/${targets.length})`,
                        );
                    }
                    resolve({
                        target,
                        success,
                        durationMs,
                        exitCode: code,
                    });
                });

                child.on("error", (err) => {
                    const durationMs = Date.now() - itemStartTime;
                    completedCount++;
                    console.error(
                        `[Runner] ❌ ${target.displayName} encountered process error: ${err.message}`,
                    );
                    resolve({
                        target,
                        success: false,
                        durationMs,
                        exitCode: 1,
                        error: err.message,
                    });
                });
            });

            results.push(result);
        }
    }

    const workerCount = Math.min(concurrency, targets.length);
    const workers = Array.from({ length: workerCount }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n============================================================`);
    console.log(`[Runner] 📊 Execution Summary`);
    console.log(`============================================================`);
    for (const r of results) {
        const icon = r.success ? "✅" : "❌";
        const dur = (r.durationMs / 1000).toFixed(1) + "s";
        console.log(
            `  ${icon} ${r.target.displayName.padEnd(25)} Duration: ${dur.padStart(6)}${r.success ? "" : ` (Exit Code: ${r.exitCode})`}`,
        );
    }
    console.log(`------------------------------------------------------------`);
    console.log(`Total: ${results.length} | Succeeded: ${successful} | Failed: ${failed}`);
    console.log(`Total Elapsed Time: ${totalDurationSec}s`);
    console.log(`============================================================\n`);

    return results;
}

function printUsageAndList(available: ScraperTarget[]) {
    console.log("Usage:");
    console.log(
        "  npm run scraper                              # Run all scrapers, sequential (default)",
    );
    console.log(
        "  npm run scraper <province>                   # Run all scrapers in a province, sequential",
    );
    console.log(
        "  npm run scraper <province>:<municipality>    # Run a specific municipality\n",
    );
    console.log("Options:");
    console.log(
        "  --mode=seq|par                               # Execution mode. seq=sequential (default), par=parallel",
    );
    console.log(
        "  --concurrency=<N>, -c <N>                   # Max parallel workers when --mode=par (default: min(cpus,3))",
    );
    console.log(
        "  --route=<path>                               # Filter to a single route for fast testing\n",
    );
    console.log("Examples:");
    console.log("  npm run scraper lumbini                         # Sequential (default)");
    console.log("  npm run scraper lumbini --mode=par              # Parallel");
    console.log("  npm run scraper lumbini --mode=par -c 2         # Parallel, 2 workers");
    console.log("  npm run scraper lumbini:sainamaina              # Single municipality");
    console.log("  npm run scraper lumbini:sainamaina --route=/budget-program  # Single route\n");

    if (available.length > 0) {
        console.log("Available Scrapers:");
        for (const s of available) {
            console.log(
                `  - ${s.displayName.padEnd(25)} (Path: src/scrapers/${s.province}/${s.municipality}/index.ts)`,
            );
        }
    } else {
        console.log("No scrapers found in src/scrapers.");
    }
}

export async function runScraper(targetArg?: string): Promise<void> {
    const rawArgs = process.argv.slice(2);

    let customConcurrency: number | null = null;
    let routeFilter: string | null = null;
    let execMode: "seq" | "par" = "seq"; // Default: sequential
    const positionalArgs: string[] = [];

    for (let i = 0; i < rawArgs.length; i++) {
        const arg = rawArgs[i];
        if (arg === "--help" || arg === "-h") {
            const all = getAvailableScrapers();
            printUsageAndList(all);
            process.exit(0);
        } else if (arg.startsWith("--concurrency=")) {
            const val = parseInt(arg.split("=")[1], 10);
            if (!isNaN(val) && val > 0) customConcurrency = val;
        } else if (arg.startsWith("--route=")) {
            routeFilter = arg.split("=")[1];
        } else if (arg.startsWith("--mode=")) {
            const m = arg.split("=")[1].toLowerCase();
            if (m === "par" || m === "parallel") execMode = "par";
            else if (m === "seq" || m === "sequential") execMode = "seq";
            else {
                console.error(`[Runner] Unknown --mode value "${m}". Use: --mode=seq or --mode=par`);
                process.exit(1);
            }
        } else if (arg === "-c" && i + 1 < rawArgs.length) {
            const val = parseInt(rawArgs[++i], 10);
            if (!isNaN(val) && val > 0) customConcurrency = val;
        } else if (!arg.startsWith("-")) {
            positionalArgs.push(arg);
        }
    }

    let finalTarget: string | undefined = targetArg;
    if (!finalTarget) {
        if (positionalArgs.length === 1) {
            finalTarget = positionalArgs[0];
        } else if (positionalArgs.length >= 2) {
            finalTarget = positionalArgs[0].includes(":")
                ? positionalArgs[0]
                : `${positionalArgs[0]}:${positionalArgs[1]}`;
        }
    }

    const allScrapers = getAvailableScrapers();
    const { targets, isSingle, scopeDesc } = resolveTargets(allScrapers, finalTarget);

    if (targets.length === 0) {
        console.error(`\n[Runner] Error: No scrapers found for target '${finalTarget ?? ""}'.\n`);
        printUsageAndList(allScrapers);
        process.exit(1);
    }

    if (isSingle) {
        const exitCode = await executeSingle(targets[0], routeFilter);
        process.exit(exitCode);
    } else {
        console.log(`[Runner] Target Scope: ${scopeDesc}`);
        let results: ScraperResult[];

        if (execMode === "par") {
            const cpus = os.cpus().length || 4;
            const concurrency = customConcurrency || Math.min(cpus, 3);
            results = await executeParallel(targets, concurrency, routeFilter);
        } else {
            results = await executeSequential(targets, routeFilter);
        }

        const hasFailure = results.some((r) => !r.success);
        process.exit(hasFailure ? 1 : 0);
    }
}

// CLI execution handling
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    runScraper().catch((err) => {
        console.error("[Runner] Error:", err.message);
        process.exit(1);
    });
}
