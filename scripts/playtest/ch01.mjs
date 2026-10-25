import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the First Night: writes the rule, steps and runs the tape on the test card, turns the card over,
// guesses and runs the felt-tip message, feeds the Day Shift through, saves to the Ward Board.
// Usage: node scripts/playtest/ch01.mjs <screenshot dir>
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';
const srv = await serve(dist);
const b = await chromium.launch();
for (const [w, h, tag, scheme] of [[1280, 900, 'desk', 'light'], [390, 844, 'phone', 'light'], [390, 844, 'phone-dark', 'dark'], [360, 740, 'phone360', 'light']]) {
  const phone = w < 500;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/01-tape/`);
  await page.waitForTimeout(600);
  const first = page.locator('[data-tape-machine]').first();
  console.log(tag, 'after-run hidden before run:', await page.locator('[data-after-run="card"]').isHidden(), await page.locator('[data-after-run="felttip"]').isHidden());
  await first.locator('button[type=submit]').click();
  console.log(tag, 'punched:', await first.locator('[data-form-msg]').innerText());
  for (let i = 0; i < 4; i++) await first.locator('[data-step]').click();
  console.log(tag, 'after 4 steps state:', await first.locator('[data-state]').innerText());
  await first.locator('[data-tape]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-tape-stepping.png` });
  await first.locator('[data-run]').click();
  await first.locator('[data-printout]:not([hidden])').waitFor({ timeout: 20000 });
  console.log(tag, 'test card:', await first.locator('[data-printout]').innerText(), '| read', await first.locator('[data-steps]').innerText());
  await first.locator('[data-turn]').click();
  await first.locator('.console').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-tape-done.png` });
  await first.locator('[data-encoded]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-turnover.png` });
  console.log(tag, 'card text shown after run:', await page.locator('[data-after-run="card"]').isVisible());

  const lockedBefore = await page.locator('.predict-locked').count();
  await page.locator('[data-predict="felt-tip"]').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/ch1-${tag}-locked.png` });
  await page.click('[data-predict="felt-tip"] [data-option="URGENT"]');
  const second = page.locator('[data-tape-machine]').nth(1);
  await second.locator('[data-run]').click();
  await second.locator('[data-printout]:not([hidden])').waitFor({ timeout: 30000 });
  console.log(tag, 'locked before:', lockedBefore, '| felt tip:', await second.locator('[data-printout]').innerText(), '| read', await second.locator('[data-steps]').innerText());
  await second.locator('.console').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-felttip.png` });
  await page.locator('[data-after-run="felttip"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-felttip-after.png` });
  await page.locator('.predict-check button').first().click();
  console.log(tag, 'check:', await page.locator('.predict-check p').first().innerText());

  await page.click('[data-predict="beat-wait"] [data-option="Just about"]');
  await page.click('[data-tape-score] [data-go]');
  await page.waitForSelector('[data-tape-score] [data-after]:not([hidden])', { timeout: 30000 });
  console.log(tag, 'day:', (await page.locator('[data-tape-score] .results').innerText()).replace(/\n/g, ' | '));
  await page.click('[data-tape-score] [data-save]');
  await page.locator('.predict-check button').last().click();
  console.log(tag, 'check2:', await page.locator('.predict-check p').last().innerText());
  await page.locator('[data-tape-score]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-score.png` });
  await page.locator('[data-ward-board]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-board.png` });
  await page.fill('[data-own-word]', 'glass');
  await page.click('[data-own] button');
  await page.waitForTimeout(1500);
  console.log(tag, 'own word:', (await page.locator('[data-tape-score] .results').innerText()).replace(/\n/g, ' | '));
  await page.click('[data-tape-score] [data-save]');
  await page.locator('[data-own]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch1-${tag}-own.png` });
  await settle(page);
  await page.screenshot({ path: `${out}/ch1-${tag}.png`, fullPage: true, scale: 'css' });
  console.log(tag, 'errors:', errs);
  await ctx.close();
}
await b.close(); srv.close();
