import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory if present, or fallback to monorepo root .env
dotenv.config();
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
}

if (!process.env.DATABASE_URL) {
    throw new Error("[backend] DATABASE_URL is not set. Please check your root .env file.");
}

const app = express();
const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

const NEPAL_PROVINCES = [
    {
        id: "koshi",
        name: "Koshi Province",
        aliases: ["koshi", "province 1", "province 1 / koshi province"],
    },
    {
        id: "madhesh",
        name: "Madhesh Province",
        aliases: ["madhesh", "province 2", "madhesh province"],
    },
    {
        id: "bagmati",
        name: "Bagmati Province",
        aliases: ["bagmati", "province 3", "bagmati province"],
    },
    {
        id: "gandaki",
        name: "Gandaki Province",
        aliases: ["gandaki", "province 4", "gandaki province"],
    },
    {
        id: "lumbini",
        name: "Lumbini Province",
        aliases: ["lumbini", "province 5", "lumbini province"],
    },
    {
        id: "karnali",
        name: "Karnali Province",
        aliases: ["karnali", "province 6", "karnali province"],
    },
    {
        id: "sudurpashchim",
        name: "Sudurpashchim Province",
        aliases: [
            "sudurpashchim",
            "sudurpaschim",
            "province 7",
            "sudurpashchim province",
            "sudurpaschim province",
        ],
    },
];

// Get all provinces with live municipality counts and active status from DB
app.get("/api/provinces", async (req, res) => {
    try {
        const counts = await prisma.municipality.groupBy({
            by: ["province"],
            _count: { _all: true },
        });

        const countMap = new Map();
        for (const item of counts) {
            if (item.province) {
                countMap.set(item.province.toLowerCase().trim(), item._count._all);
            }
        }

        const provinces = NEPAL_PROVINCES.map((prov) => {
            let count = 0;
            for (const alias of prov.aliases) {
                const c = countMap.get(alias.toLowerCase());
                if (c) count += c;
            }
            return {
                id: prov.id,
                name: prov.name,
                count,
                active: count > 0,
            };
        });

        res.json(provinces);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get municipalities (optionally filtered by province)
app.get("/api/municipalities", async (req, res) => {
    try {
        const { province } = req.query;
        let where = {};

        if (province) {
            const provDef = NEPAL_PROVINCES.find(
                (p) =>
                    p.id.toLowerCase() === String(province).toLowerCase() ||
                    p.name.toLowerCase() === String(province).toLowerCase(),
            );

            if (provDef) {
                where = {
                    province: {
                        in: [...provDef.aliases, provDef.name],
                        mode: "insensitive",
                    },
                };
            } else {
                where = {
                    province: {
                        equals: String(province),
                        mode: "insensitive",
                    },
                };
            }
        }

        const municipalities = await prisma.municipality.findMany({
            where,
            include: { profile: true },
        });
        res.json(municipalities);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get municipality by id with projects, reports, notices and their documents
app.get("/api/municipalities/:id", async (req, res) => {
    try {
        const municipality = await prisma.municipality.findUnique({
            where: { id: req.params.id },
            include: {
                profile: true,
                projects: { include: { documents: true } },
                reports: { include: { documents: true } },
                notices: { include: { documents: true } },
            },
        });
        if (!municipality) {
            return res.status(404).json({ error: "Municipality not found" });
        }
        res.json(municipality);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Document download / serve endpoint
app.get("/api/documents/:id/download", async (req, res) => {
    try {
        const doc = await prisma.document.findUnique({
            where: { id: req.params.id },
        });

        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }

        if (doc.storagePath && fs.existsSync(doc.storagePath)) {
            return res.download(doc.storagePath, doc.fileName);
        } else if (doc.originalUrl) {
            return res.redirect(doc.originalUrl);
        } else {
            return res.status(404).json({ error: "File not available" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
