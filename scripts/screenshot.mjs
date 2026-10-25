#!/usr/bin/env node
// Screenshots of built pages for visual review. Usage: node scripts/screenshot.mjs <dist> <outdir> [paths...]
import { createServer } from 'node:http';
import { readFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const [dist = 'apps/site/dist', out = 'screenshots', ...paths] = process.argv.slice(2);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const origin = `http://127.0.0.1:${server.address().port}`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const [w, h, tag] of [[1280, 900, 'desk'], [390, 844, 'phone']]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, colorScheme: theme });
    for (const path of paths.length ? paths : ['/']) {
      await page.goto(origin + path);
      await page.evaluate(() => document.fonts.ready);
      const name = (path.replace(/\//g, '_') || 'home').replace(/^_|_$/g, '') || 'home';
      await page.screenshot({ path: join(out, `${name}-${theme}-${tag}.png`), fullPage: true });
    }
    await page.close();
  }
}
await browser.close();
server.close();
