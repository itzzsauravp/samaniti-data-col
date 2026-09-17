import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Starting database reset...\n");

    try {
        // Delete all documents first (they have foreign keys to projects/reports/notices)
        console.log("Deleting documents...");
        const documentsDeleted = await prisma.document.deleteMany({});
        console.log(`✅ Deleted ${documentsDeleted.count} documents\n`);

        // Delete projects, reports, notices (cascade deletes documents via FK)
        console.log("Deleting projects...");
        const projectsDeleted = await prisma.project.deleteMany({});
        console.log(`✅ Deleted ${projectsDeleted.count} projects\n`);

        console.log("Deleting reports...");
        const reportsDeleted = await prisma.report.deleteMany({});
        console.log(`✅ Deleted ${reportsDeleted.count} reports\n`);

        console.log("Deleting notices...");
        const noticesDeleted = await prisma.notice.deleteMany({});
        console.log(`✅ Deleted ${noticesDeleted.count} notices\n`);

        // Delete profiles
        console.log("Deleting municipality profiles...");
        const profilesDeleted = await prisma.municipalityProfile.deleteMany({});
        console.log(`✅ Deleted ${profilesDeleted.count} profiles\n`);

        // Delete municipalities
        console.log("Deleting municipalities...");
        const municipalitiesDeleted = await prisma.municipality.deleteMany({});
        console.log(`✅ Deleted ${municipalitiesDeleted.count} municipalities\n`);

        console.log("Database reset complete!");
        console.log("\nSummary:");
        console.log(`Documents: ${documentsDeleted.count}`);
        console.log(`Projects:  ${projectsDeleted.count}`);
        console.log(`Reports:   ${reportsDeleted.count}`);
        console.log(`Notices:   ${noticesDeleted.count}`);
        console.log(`Profiles:  ${profilesDeleted.count}`);
        console.log(`Municipalities: ${municipalitiesDeleted.count}`);
    } catch (error) {
        console.error("❌ Error during database reset:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
