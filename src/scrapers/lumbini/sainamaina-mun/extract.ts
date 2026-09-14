import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CheerioCrawler } from 'crawlee';
import { ScraperConfig } from '../../../core/contracts/scraper.interface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const URL_MAP = {
  profile: {
    live: 'https://sainamainamun.gov.np/en/node/5',
    mock: path.resolve(__dirname, 'mock-pages/profile.html'),
  },
  publications: {
    live: 'https://sainamainamun.gov.np/en/notices',
    mock: path.resolve(__dirname, 'mock-pages/publications.html'),
  },
};

export async function extract(
  config: ScraperConfig
): Promise<{ profileRaw: string; publicationsRaw: string[] }> {
  if (config.useMocks) {
    const profileRaw = await fs.readFile(URL_MAP.profile.mock, 'utf-8');
    const publicationsRaw = [await fs.readFile(URL_MAP.publications.mock, 'utf-8')];
    return { profileRaw, publicationsRaw };
  }

  let profileRaw = '';
  const publicationsRaw: string[] = [];

  const crawler = new CheerioCrawler({
    respectRobotsTxt: true,
    async requestHandler({ request, body }: { request: any; body: any }) {
      const html = typeof body === 'string' ? body : body.toString('utf-8');
      if (request.userData.type === 'profile') {
        profileRaw = html;
      } else if (request.userData.type === 'publications') {
        publicationsRaw.push(html);
      }
    },
  } as any);

  await crawler.run([
    {
      url: URL_MAP.profile.live,
      userData: { type: 'profile' },
    },
    {
      url: URL_MAP.publications.live,
      userData: { type: 'publications' },
    },
  ]);

  return { profileRaw, publicationsRaw };
}
