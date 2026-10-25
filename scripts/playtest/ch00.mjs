// Playtest of the Prologue: sorts the six messages, reveals Bea's calls, screenshots at phone and desktop.
// Usage: node scripts/playtest/ch00.mjs <screenshot dir>
import { chromium } from 'playwright';
import { serve, settle } from '../lib/serve.mjs';

const out = process.argv[2] ?? '.';
const srv = await serve('apps/site/dist');
const b = await chromium.launch();
for (const [w, h, tag, scheme, mobile] of [[390, 844, 'phone', 'light', true], [1280, 900, 'desk', 'dark', false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/00-speaking-tube/`);
  await page.waitForSelector('[data-sort-desk] .card');
  const cards = page.locator('[data-sort-desk] .card');
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    const btn = cards.nth(i).locator(i % 2 ? '[data-call="urgent"]' : '[data-call="can_wait"]');
    mobile ? await btn.tap() : await btn.click();
  }
  await page.locator('[data-reveal]').click();
  console.log(tag, 'result:', await page.locator('[data-result]').innerText());
  await settle(page);
  await page.screenshot({ path: `${out}/ch00-${tag}.png`, fullPage: true });
  console.log(tag, 'errors:', errs);
  await ctx.close();
}
await b.close();
srv.close();
