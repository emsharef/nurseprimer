

import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the Third Night: makes the guesses, turns a knob, trains, looks up a word, uses the reading glass.
// Usage: node scripts/playtest/ch03.mjs <screenshot dir>
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';

const srv = await serve(dist);

const b = await chromium.launch();
for (const [w, h, tag, scheme] of [[1280, 900, 'desk', 'light'], [390, 844, 'phone', 'dark']]) {
  const page = await b.newPage({ viewport: { width: w, height: h }, colorScheme: scheme });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/03-knobs/`);
  await page.waitForTimeout(800);
  await page.click('[data-predict="best-knob"] [data-option="glass"]');
  const glass = page.locator('#knob-glass'); await glass.focus(); for (let i = 0; i < 12; i++) await glass.press('ArrowRight');
  console.log(tag, 'after glass+3:', await page.locator('[data-knob-panel] .stat-row').innerText(), '|', await page.locator('[data-goal]').innerText());
  await page.click('[data-predict="beat-you"] [data-option="Yes, easily"]');
  await page.click('[data-train]');
  await page.waitForSelector('[data-after]:not([hidden])', { timeout: 20000 });
  console.log(tag, 'trained:', await page.locator('[data-day]').innerText(), '|', await page.locator('[data-compare]').innerText());
  await page.fill('[data-lookup]', 'myriverside'); await page.waitForTimeout(200);
  console.log(tag, 'lookup:', await page.locator('[data-lookup-out]').innerText());
  await page.click('[data-train-panel] [data-save]');
  await page.click('[data-predict="fade"] [data-option="Both"]');
  const glassW = page.locator('[data-predict="fade"] + figure');
  const presets = glassW.locator('[data-preset]');
  await presets.nth(0).click(); await page.waitForTimeout(200);
  console.log(tag, 'A:', await glassW.locator('[data-verdict]').innerText(), await glassW.locator('[data-sub]').innerText());
  await presets.nth(1).click(); await page.waitForTimeout(200);
  console.log(tag, 'B:', await glassW.locator('[data-verdict]').innerText());
  await settle(page);
  await page.screenshot({ path: `${out}/ch3-${tag}.png`, fullPage: true });
  console.log(tag, 'errors:', errs);
  await page.close();
}
await b.close(); srv.close();
