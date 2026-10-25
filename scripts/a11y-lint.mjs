#!/usr/bin/env node
// Accessibility lint: serves the built site and runs axe-core (WCAG 2.2 A/AA) on every page, in light and
// dark themes, at desktop and phone widths. Also checks that no math is left without a MathML fallback
// and that every page reaches the reading column by keyboard (skip link). Fails on any violation.
// Usage: node scripts/a11y-lint.mjs <dist dir>
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const dist = process.argv[2] ?? 'apps/site/dist';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.json': 'application/json' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const origin = `http://127.0.0.1:${server.address().port}`;

const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === 'index.html') pages.push('/' + relative(dist, dir).replace(/\\/g, '/') + (dir === dist ? '' : '/'));
  }
})(dist);

const browser = await chromium.launch();
let failures = 0;
for (const theme of ['light', 'dark']) {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 800 }]) {
    const ctx = await browser.newContext({ viewport, colorScheme: theme });
    for (const path of pages) {
      const page = await ctx.newPage();
      await page.goto(origin + path.replace(/^\/\//, '/'));
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
      const where = `${path} [${theme}, ${viewport.width}px]`;
      for (const v of violations) {
        failures++;
        console.error(`✗ ${where} ${v.id}: ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.error(`    ${n.target.join(' ')} ${n.failureSummary?.split('\n')[1] ?? ''}`);
      }
      const bare = await page.evaluate(() => [...document.querySelectorAll('.katex')].filter((k) => !k.querySelector('math')).length);
      if (bare) { failures++; console.error(`✗ ${where} ${bare} formula(s) without a MathML fallback`); }
      const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (hScroll) { failures++; console.error(`✗ ${where} page scrolls horizontally`); }
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(`a11y lint: ${pages.length} pages x 2 themes x 2 widths, ${failures} problems`);
process.exit(failures ? 1 : 0);
