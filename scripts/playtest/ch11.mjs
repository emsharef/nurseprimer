import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the Eleventh Night: makes every guess, pours the jars on all three sets, looks inside jars,
// moves the cost slider, saves to the Ward Board, and plays the four-in-the-morning alert stream (carefully
// at first, then fast), pausing once.
// Usage: node scripts/playtest/ch11.mjs <screenshot dir> [phone-light|phone-dark|desk ...]
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';
const want = process.argv.slice(3);
const runs = [[390, 844, 'phone', 'light'], [390, 844, 'phone', 'dark'], [360, 780, 'android', 'light'], [1280, 900, 'desk', 'light']]
  .filter(([, , tag, scheme]) => !want.length || want.includes(`${tag}-${scheme}`) || want.includes(tag));

const srv = await serve(dist);
const b = await chromium.launch();
for (const [w, h, tag, scheme] of runs) {
  const name = `${tag}-${scheme}`;
  const phone = tag !== 'desk';
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
  const page = await ctx.newPage();
  const tap = (sel) => (phone ? page.locator(sel).first().tap() : page.locator(sel).first().click());
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/11-how-sure/`);
  await page.waitForTimeout(800);

  // Part 1: the jars.
  await page.locator('[data-predict="top-jar"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch11-${name}-locked.png` });
  console.log(name, 'locked before guess:', await page.locator('.predict-locked').count());
  const held = async () => page.locator('.reveal-hold').count();
  console.log(name, 'reveals held before any guess:', await held(), '| night tab disabled:', await page.locator('[data-jars] [data-set="night"]').isDisabled());
  await tap('[data-predict="top-jar"] [data-option="Nearly all of them"]');
  await page.waitForSelector('[data-jars] [data-pour]:not([disabled])');
  await tap('[data-jars] [data-pour]');
  await page.waitForTimeout(1300);
  await tap('[data-jars] [data-jar="4"]');
  await page.waitForTimeout(200);
  console.log(name, 'day:', await page.locator('[data-jars] [data-readout]').innerText());
  console.log(name, 'top jar:', await page.locator('[data-jars] .inside-sum').innerText());
  await page.locator('[data-jars] .chart').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch11-${name}-jars-day.png` });
  await tap('[data-predict="top-jar"] ~ .predict-check button');
  console.log(name, 'check 1:', await page.locator('.predict-check p').first().innerText());
  console.log(name, 'reveals held after pouring Day:', await held());
  await tap('[data-predict="night-needle"] [data-option="Too calm: more urgent children than it says"]');
  await tap('[data-jars] [data-set="night"]');
  await tap('[data-jars] [data-pour]');
  await page.waitForTimeout(1300);
  await tap('[data-jars] [data-jar="1"]');
  console.log(name, 'reveals held after pouring Night:', await held());
  console.log(name, 'night jar 2:', await page.locator('[data-jars] .inside-sum').innerText());
  await page.locator('[data-jars] .chart').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch11-${name}-jars-night.png` });
  // Keyboard: arrow from Night to the 2 a.m. Set.
  await page.locator('[data-jars] [data-set="night"]').focus();
  await page.keyboard.press('ArrowRight');
  await tap('[data-jars] [data-pour]');
  await page.waitForTimeout(1300);
  console.log(name, '2am:', await page.locator('[data-jars] [data-readout]').innerText());
  await page.locator('[data-jars]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch11-${name}-jars-2am.png`, fullPage: false });

  // Part 2: the handover line.
  await tap('[data-predict="line"] [data-option="Much lower, around 10%"]');
  const slider = page.locator('#cost-ratio');
  await slider.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  console.log(name, 'at 100:', await page.locator('[data-line-text]').innerText());
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
  console.log(name, 'at 10:', await page.locator('[data-line-text]').innerText());
  console.log(name, 'table:', (await page.locator('[data-handover] [data-table]').innerText()).replace(/\s+/g, ' '));
  await tap('[data-handover] [data-set="night"]');
  await page.locator('[data-handover] .chart').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch11-${name}-line.png` });
  await tap('[data-handover] [data-save]');
  await page.locator('[data-ward-board] [data-set="night"]').first().click();
  await page.locator('[data-ward-board]').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/ch11-${name}-board.png` });
  console.log(name, 'board:', (await page.locator('[data-ward-board] tbody').innerText()).replace(/\s+/g, ' '));

  // Part 3: the alert stream. Careful for eight slips, then quicker, then agreeing on sight.
  await tap('[data-predict="every-slip"] [data-option="Most of them"]');
  await page.waitForSelector('[data-stream] [data-start]:not([disabled])');
  await tap('[data-stream] [data-start]');
  await page.waitForTimeout(500);
  await page.locator('[data-stream]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch11-${name}-stream.png` });
  for (let i = 0; i < 24; i++) {
    await page.waitForSelector('[data-stream] [data-agree][aria-disabled="false"]', { timeout: 15000 });
    await page.waitForTimeout(i < 8 ? 3500 : i < 16 ? 1500 : 300);
    if (i === 10) {
      await tap('[data-stream] [data-pause]');
      await page.waitForTimeout(1500);
      await page.locator('[data-stream] [data-slip]').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${out}/ch11-${name}-paused.png` });
      await tap('[data-stream] [data-pause]');
    }
    if (i === 15) await page.screenshot({ path: `${out}/ch11-${name}-stream-backlog.png` });
    const text = await page.locator('[data-stream] [data-slip-text]').innerText();
    // A careful reader overrules a couple of obvious needless alarms early on.
    const overrule = i < 8 && /felt tip|runny|sneezing/i.test(text);
    if (phone) await tap(overrule ? '[data-stream] [data-overrule]' : '[data-stream] [data-agree]');
    else {
      await page.keyboard.press(overrule ? 'o' : 'a');
      if (i === 3) console.log(name, 'focus after key:', await page.evaluate(() => document.activeElement?.textContent?.trim()));
    }
  }
  await page.waitForSelector('[data-stream] [data-done]:not([hidden])');
  console.log(name, 'stream:', (await page.locator('[data-stream] [data-done]').innerText()).replace(/\s+/g, ' ').slice(0, 900));
  await page.locator('[data-stream] [data-done]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch11-${name}-results.png` });
  await settle(page);
  await page.screenshot({ path: `${out}/ch11-${name}.png`, fullPage: true });
  console.log(name, 'errors:', errs);
  await page.close();
}
await b.close(); srv.close();
