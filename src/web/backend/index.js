import "dotenv/config";
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const app = express();
const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

// Get municipalities
app.get('/api/municipalities', async (req, res) => {
  const municipalities = await prisma.municipality.findMany({
    include: { profile: true }
  });
  res.json(municipalities);
});

// Get municipality by id with projects, reports, notices and their documents
app.get('/api/municipalities/:id', async (req, res) => {
  try {
    const municipality = await prisma.municipality.findUnique({
      where: { id: req.params.id },
      include: {
        profile: true,
        projects: { include: { documents: true } },
        reports: { include: { documents: true } },
        notices: { include: { documents: true } }
      }
    });
    if (!municipality) {
      return res.status(404).json({ error: 'Municipality not found' });
    }
    res.json(municipality);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Document download / serve endpoint
app.get('/api/documents/:id/download', async (req, res) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      return res.download(doc.storagePath, doc.fileName);
    } else if (doc.originalUrl) {
      return res.redirect(doc.originalUrl);
    } else {
      return res.status(404).json({ error: 'File not available' });
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
