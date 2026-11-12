import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

const routes = [
  '/',
  '/alarm',
  '/nuclear',
  '/chat',
  '/libraries',
  '/assistant',
  '/atlas',
  '/cycle',
  '/morse',
  '/shelves',
  '/shelves/voda',
  '/shelves/teplo',
  '/shelves/pomosh',
  '/shelves/radiaciya',
  '/shelves/eda',
  '/shelves/navigaciya',
  '/shelves/svyaz',
  '/shelves/ukrytiya',
  '/shelves/oruzhie',
  '/shelves/psihologiya',
  '/shelves/pravo',
];

async function main() {
  const serverFuncPath = resolve(root, '.vercel/output/functions/__server.func/index.mjs');
  if (!existsSync(serverFuncPath)) {
    console.error('Server function not found at', serverFuncPath);
    process.exit(1);
  }

  const fileUrl = pathToFileURL(serverFuncPath).href;
  const mod = await import(fileUrl);
  const handler = mod.default;

  const outDir = resolve(root, '.vercel/output/static');

  for (const route of routes) {
    try {
      const url = `http://localhost${route}`;
      const res = await handler.fetch(new Request(url));
      if (res.status === 200) {
        const html = await res.text();
        if (route === '/') {
          writeFileSync(resolve(outDir, 'index.html'), html, 'utf8');
        } else {
          // write e.g. .vercel/output/static/alarm.html and .vercel/output/static/alarm/index.html
          const cleanRoute = route.replace(/^\//, '');
          const filePath = resolve(outDir, `${cleanRoute}.html`);
          mkdirSync(dirname(filePath), { recursive: true });
          writeFileSync(filePath, html, 'utf8');

          const dirPath = resolve(outDir, cleanRoute);
          mkdirSync(dirPath, { recursive: true });
          writeFileSync(resolve(dirPath, 'index.html'), html, 'utf8');
        }
        console.log(`Prerendered ${route} -> OK`);
      } else {
        console.warn(`Prerendered ${route} -> status ${res.status}`);
      }
    } catch (e) {
      console.warn(`Failed to prerender ${route}:`, e.message);
    }
  }

  console.log('All static pages generated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
