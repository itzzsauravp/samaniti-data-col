import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAvailableScrapers(): { province: string; municipality: string; path: string }[] {
    const scrapersDir = path.join(__dirname, "src", "scrapers");
    const results: { province: string; municipality: string; path: string }[] = [];

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
                results.push({
                    province: provName,
                    municipality: munName,
                    path: indexPath,
                });
            }
        }
    }
    return results;
}

export async function runScraper(target: string): Promise<void> {
    if (!target) {
        throw new Error("Please specify a scraper in the format province:municipality (e.g., lumbini:sainamaina)");
    }

    let province: string;
    let municipality: string;

    if (target.includes(":")) {
        const parts = target.split(":");
        province = parts[0].toLowerCase().trim();
        municipality = parts[1].toLowerCase().trim();
    } else {
        province = target.toLowerCase().trim();
        municipality = "";
    }

    if (!province || !municipality) {
        console.error("Error: Province and municipality are required in format province:municipality.");
        printUsageAndList();
        process.exit(1);
    }

    const available = getAvailableScrapers();

    // Match strategy:
    // Matches exact folder name or folder name with/without '-mun' suffix
    const match = available.find(
        (s) =>
            s.province === province &&
            (s.municipality === municipality ||
                s.municipality === `${municipality}-mun` ||
                `${s.municipality}-mun` === municipality ||
                s.municipality.replace(/-mun$/, "") === municipality.replace(/-mun$/, ""))
    );

    if (!match) {
        console.error(`\n[Runner] Error: Scraper not found for '${province}:${municipality}'\n`);
        printUsageAndList();
        process.exit(1);
    }

    console.log(`[Runner] Executing scraper for Province: '${match.province}', Municipality: '${match.municipality}'...`);

    const child = spawn("npx", ["tsx", match.path], {
        stdio: "inherit",
        shell: true,
        env: process.env,
    });

    child.on("close", (code) => {
        process.exit(code ?? 0);
    });

    child.on("error", (err) => {
        console.error("[Runner] Failed to start scraper process:", err);
        process.exit(1);
    });
}

function printUsageAndList() {
    console.log("Usage:");
    console.log("  npm run scraper <province>:<municipality>");
    console.log("  tsx runner.ts <province>:<municipality>\n");
    console.log("Examples:");
    console.log("  npm run scraper lumbini:sainamaina");
    console.log("  npm run scraper lumbini:kanchan");
    console.log("  npm run scraper bagmati:kathmandu\n");

    const available = getAvailableScrapers();
    if (available.length > 0) {
        console.log("Available Scrapers:");
        for (const s of available) {
            const munClean = s.municipality.replace(/-mun$/, "");
            console.log(`  - ${s.province}:${munClean}  (Path: src/scrapers/${s.province}/${s.municipality}/index.ts)`);
        }
    } else {
        console.log("No scrapers found in src/scrapers.");
    }
}

// CLI execution handling
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2).filter((arg) => !arg.startsWith("-"));

    let targetArg = args.find((arg) => arg.includes(":")) || args[0];
    if (args.length >= 2 && !targetArg?.includes(":")) {
        targetArg = `${args[0]}:${args[1]}`;
    }

    if (!targetArg) {
        printUsageAndList();
        process.exit(1);
    }

    runScraper(targetArg).catch((err) => {
        console.error("[Runner] Error:", err.message);
        process.exit(1);
    });
}
