// Lists elements that stick out past the right edge of the viewport. Usage: node scripts/playtest/overflow.mjs <path> [width]
import { chromium } from 'playwright';
import { serve, settle } from '../lib/serve.mjs';

const [path = '/', width = '1280'] = process.argv.slice(2);
const srv = await serve('apps/site/dist');
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: +width, height: 900 } });
await page.goto(srv.origin + path);
await settle(page);
const res = await page.evaluate(() => {
  const W = document.documentElement.clientWidth;
  return [...document.querySelectorAll('body *')]
    .map((el) => ({ el, r: el.getBoundingClientRect() }))
    .filter(({ r }) => r.right > W + 1 && r.width > 0)
    .slice(0, 12)
    .map(({ el, r }) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} right=${Math.round(r.right)} width=${Math.round(r.width)} (viewport ${W})`);
});
console.log(res.join('\n') || 'no overflow');
await b.close();
srv.close();
