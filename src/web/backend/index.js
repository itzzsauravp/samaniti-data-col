import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import swaggerUi from 'swagger-ui-express';
import { startScraperCron } from './scraper-cron.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

const app = express();
const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Samaniti Data Collection API',
    version: '1.0.0',
    description: 'API for accessing scraped local-government data (municipalities, notices, projects, reports and attached documents) across Nepal.',
  },
  servers: [
    { url: '/api', description: 'Backend base URL' },
  ],
  tags: [
    { name: 'Municipalities', description: 'Municipality records and their scraped data' },
    { name: 'Records', description: 'All scraped notices, projects and reports' },
    { name: 'Documents', description: 'Downloaded attachments' },
  ],
  paths: {
    '/municipalities': {
      get: {
        tags: ['Municipalities'],
        summary: 'List all municipalities',
        description: 'Returns every municipality with its profile data.',
        responses: {
          200: {
            description: 'List of municipalities',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Municipality' } } } },
          },
        },
      },
    },
    '/municipalities/{id}': {
      get: {
        tags: ['Municipalities'],
        summary: 'Get a single municipality with all its scraped data',
        description: 'Returns a municipality with its profile, notices, projects, reports and their documents.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Municipality UUID', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Municipality with related records', content: { 'application/json': { schema: { $ref: '#/components/schemas/MunicipalityDetail' } } } },
          404: { description: 'Municipality not found' },
        },
      },
    },
    '/records': {
      get: {
        tags: ['Records'],
        summary: 'Fetch all scraped records',
        description: 'Returns every scraped notice, project and report across all municipalities (optionally filtered by municipality code and/or record type), including the attached documents.',
        parameters: [
          { name: 'municipalityCode', in: 'query', required: false, description: 'Filter by municipality code, e.g. SAINAMAINA', schema: { type: 'string' } },
          { name: 'type', in: 'query', required: false, description: 'Only return one collection: notice | project | report', schema: { type: 'string', enum: ['notice', 'project', 'report'] } },
        ],
        responses: {
          200: {
            description: 'Scraped records grouped by type',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RecordsResponse' } } },
          },
        },
      },
    },
    '/documents/{id}/download': {
      get: {
        tags: ['Documents'],
        summary: 'Download a document',
        description: 'Streams the downloaded file from local storage, or redirects to the original URL when unavailable.',
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'Document UUID', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'File download (or redirect to original URL)' },
          404: { description: 'Document not found' },
        },
      },
    },
  },
  components: {
    schemas: {
      Municipality: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          nameNe: { type: 'string' },
          nameEn: { type: 'string' },
          province: { type: 'string' },
          district: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      MunicipalityDetail: {
        type: 'object',
        allOf: [
          { $ref: '#/components/schemas/Municipality' },
          {
            type: 'object',
            properties: {
              profile: { $ref: '#/components/schemas/MunicipalityProfile' },
              notices: { type: 'array', items: { $ref: '#/components/schemas/Notice' } },
              projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
              reports: { type: 'array', items: { $ref: '#/components/schemas/Report' } },
            },
          },
        ],
      },
      MunicipalityProfile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          establishedBs: { type: 'string', nullable: true },
          totalWards: { type: 'integer', nullable: true },
          population: { type: 'integer', nullable: true },
          areaSqKm: { type: 'number', nullable: true },
          email: { type: 'string', nullable: true },
          website: { type: 'string', nullable: true },
          facebookPage: { type: 'string', nullable: true },
          mobileNo: { type: 'string', nullable: true },
          twitterHandle: { type: 'string', nullable: true },
          totalSchools: { type: 'integer', nullable: true },
        },
      },
      Notice: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titleNe: { type: 'string' },
          titleEn: { type: 'string', nullable: true },
          contentNe: { type: 'string', nullable: true },
          type: { type: 'string', nullable: true },
          publishedDate: { type: 'string', nullable: true },
          sourceUrl: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          municipality: { $ref: '#/components/schemas/MunicipalityRef' },
          documents: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
        },
      },
      Project: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titleNe: { type: 'string' },
          titleEn: { type: 'string', nullable: true },
          budgetAmount: { type: 'number', nullable: true },
          fiscalYear: { type: 'string', nullable: true },
          status: { type: 'string', nullable: true },
          wardNo: { type: 'integer', nullable: true },
          type: { type: 'string', nullable: true },
          sourceUrl: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          municipality: { $ref: '#/components/schemas/MunicipalityRef' },
          documents: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
        },
      },
      Report: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titleNe: { type: 'string' },
          titleEn: { type: 'string', nullable: true },
          type: { type: 'string', nullable: true },
          fiscalYear: { type: 'string', nullable: true },
          publishedDate: { type: 'string', nullable: true },
          sourceUrl: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          municipality: { $ref: '#/components/schemas/MunicipalityRef' },
          documents: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
        },
      },
      MunicipalityRef: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          nameNe: { type: 'string' },
          nameEn: { type: 'string' },
          province: { type: 'string' },
          district: { type: 'string' },
        },
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fileName: { type: 'string' },
          fileType: { type: 'string', nullable: true },
          originalUrl: { type: 'string' },
          storagePath: { type: 'string', nullable: true },
          downloadStatus: { type: 'string' },
          downloadError: { type: 'string', nullable: true },
          extractedText: { type: 'string', nullable: true },
          extractionStatus: { type: 'string' },
          extractionMethod: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      RecordsResponse: {
        type: 'object',
        properties: {
          notices: { type: 'array', items: { $ref: '#/components/schemas/Notice' } },
          projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } },
          reports: { type: 'array', items: { $ref: '#/components/schemas/Report' } },
        },
      },
    },
  },
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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

// Fetch all scraped records (notices, projects, reports) across all municipalities
app.get('/api/records', async (req, res) => {
  try {
    const { municipalityCode, type } = req.query;
    const where = municipalityCode
      ? { municipality: { code: String(municipalityCode).toUpperCase() } }
      : undefined;

    const include = {
      municipality: {
        select: { code: true, nameNe: true, nameEn: true, province: true, district: true },
      },
      documents: true,
    };
    const orderBy = { createdAt: 'desc' };

    const output = {};
    if (!type || type === 'notice') {
      output.notices = await prisma.notice.findMany({ where, include, orderBy });
    }
    if (!type || type === 'project') {
      output.projects = await prisma.project.findMany({ where, include, orderBy });
    }
    if (!type || type === 'report') {
      output.reports = await prisma.report.findMany({ where, include, orderBy });
    }

    res.json(output);
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
  startScraperCron();
});
