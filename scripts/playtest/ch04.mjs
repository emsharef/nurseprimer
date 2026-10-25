import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the Fourth Night: trains Wick with wires, wagers on the Night Shift, strikes the app line off a slip,
// deletes and adds the line across whole shifts, retrains without it, and checks the Ward Board.
// Usage: node scripts/playtest/ch04.mjs <screenshot dir>
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';

const srv = await serve(dist);
const b = await chromium.launch();
for (const [w, h, tag, scheme] of [[1280, 900, 'desk', 'light'], [390, 844, 'phone', 'light'], [390, 844, 'phone-dark', 'dark']]) {
  const phone = tag.startsWith('phone');
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/04-purple-ink/`);
  await page.waitForTimeout(800);

  const wired = page.locator('[data-wire-panel][data-kind="wired"]');
  await wired.locator('[data-train]').click();
  await page.waitForTimeout(400);
  await wired.screenshot({ path: `${out}/ch4-${tag}-training.png` });
  await wired.locator('[data-after]:not([hidden])').waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await wired.screenshot({ path: `${out}/ch4-${tag}-trained.png` });
  console.log(tag, 'trained:', (await wired.locator('[data-after]').innerText()).replace(/\n+/g, ' | '));

  const wager = page.locator('[data-wager]');
  await wager.locator('[data-range]').fill('12');
  await wager.screenshot({ path: `${out}/ch4-${tag}-wager.png` });
  await wager.locator('[data-lock]').click();
  await wager.locator('[data-after]:not([hidden])').waitFor({ timeout: 60000 });
  await wager.screenshot({ path: `${out}/ch4-${tag}-wager-reveal.png` });
  console.log(tag, 'wager:', (await wager.locator('[data-after]').innerText()).replace(/\n+/g, ' | '));
  await wager.locator('[data-save]').click();

  await page.click('[data-predict="strike"] [data-option="Can wait"]');
  const ins = page.locator('[data-insides]');
  console.log(tag, 'slip before:', await ins.locator('[data-verdict]').innerText());
  await ins.locator('[data-strike]').click();
  await page.waitForTimeout(500);
  await ins.screenshot({ path: `${out}/ch4-${tag}-insides.png` });
  console.log(tag, 'slip struck:', await ins.locator('[data-verdict]').innerText(), '|', await ins.locator('[data-sub]').innerText());
  for (const id of ['d0331', 'd0205', 'line-only']) {
    await ins.locator(`[data-preset="${id}"]`).click();
    const a = await ins.locator('[data-verdict]').innerText();
    if (id !== 'line-only') await ins.locator('[data-strike]').click();
    console.log(tag, id, a, '->', await ins.locator('[data-verdict]').innerText());
  }
  await page.locator('.predict-check button').first().click();

  const ol = page.locator('[data-one-line]');
  await ol.locator('[data-mode="delete"]').click();
  await page.waitForTimeout(1600);
  await ol.screenshot({ path: `${out}/ch4-${tag}-delete.png` });
  console.log(tag, 'delete:', (await ol.locator('[data-what]').innerText()), (await ol.locator('[data-tally]').innerText()).replace(/\s+/g, ' '));
  await ol.locator('[data-mode="add"]').click();
  await page.waitForTimeout(1600);
  await ol.screenshot({ path: `${out}/ch4-${tag}-add.png` });
  console.log(tag, 'add:', (await ol.locator('[data-what]').innerText()), (await ol.locator('[data-tally]').innerText()).replace(/\s+/g, ' '));

  const clean = page.locator('[data-wire-panel][data-kind="clean"]');
  await clean.locator('[data-train]').click();
  await clean.locator('[data-after]:not([hidden])').waitFor({ timeout: 60000 });
  await page.waitForTimeout(300);
  await clean.screenshot({ path: `${out}/ch4-${tag}-clean.png` });
  console.log(tag, 'clean:', (await clean.locator('[data-cmp]').innerText()).replace(/\s+/g, ' '));
  await clean.locator('[data-save]').click();

  const board = page.locator('[data-ward-board]').first();
  await board.locator('[data-set="night"]').click();
  await board.screenshot({ path: `${out}/ch4-${tag}-board.png` });
  console.log(tag, 'board night:', (await board.locator('tbody').innerText()).replace(/\s+/g, ' '));
  await settle(page);
  await page.screenshot({ path: `${out}/ch4-${tag}.png`, fullPage: true });
  console.log(tag, 'errors:', errs);
  await page.close();
}
await b.close(); srv.close();
