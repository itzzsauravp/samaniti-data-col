import "dotenv/config";
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const app = express();
const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());

app.get('/api/municipalities', async (req, res) => {
  const municipalities = await prisma.municipality.findMany({
    include: { profile: true, projects: true, reports: true, notices: true }
  });
  res.json(municipalities);
});

const server = app.listen(5002, async () => {
  try {
    const res = await fetch('http://localhost:5002/api/municipalities');
    const data = await res.json();
    console.log('API Test Successful! Fetched municipalities count:', data.length);
    if (data.length > 0) {
      console.log('Municipality name:', data[0].nameEn, data[0].nameNe);
      console.log('Projects count:', data[0].projects?.length);
      console.log('Notices count:', data[0].notices?.length);
      console.log('Reports count:', data[0].reports?.length);
    }
  } catch (err) {
    console.error('API Test Failed:', err);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
});
