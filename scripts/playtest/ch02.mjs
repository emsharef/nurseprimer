import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the Second Night: guesses, applies Bea's patches, types a rule of its own (and a broken one),
// browses the wrong messages, saves; loads the three o'clock rulebook, switches to the Night Shift, saves;
// runs the speckly message through both rulebooks.
// Usage: node scripts/playtest/ch02.mjs <screenshot dir>
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';
const srv = await serve(dist);
const b = await chromium.launch();
for (const [w, h, tag, scheme] of [[1280, 900, 'desk', 'light'], [390, 844, 'phone', 'light'], [390, 844, 'phone-dark', 'dark']]) {
  const phone = w < 500;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/02-rulebook/`);
  await page.waitForTimeout(700);
  const ed = page.locator('[data-rule-editor]').first();
  await page.locator('[data-predict="glass-patch"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch2-${tag}-locked.png` });
  console.log(tag, 'locked:', await page.locator('.predict-locked').count());
  await page.click('[data-predict="glass-patch"] [data-option="Yes, a few"]');
  const stats = async (e) => (await e.locator('.stat-row').innerText()).replace(/\n/g, ' ');
  console.log(tag, 'start:', await stats(ed));
  const patches = ed.locator('[data-patch]');
  for (let i = 0; i < 3; i++) {
    await patches.nth(i).click();
    await page.waitForTimeout(100);
    console.log(tag, `patch ${i}:`, await stats(ed), '|', await ed.locator('[data-diff]').innerText());
  }
  await ed.locator('[data-diff]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch2-${tag}-patched.png` });
  await page.locator('.predict-check button').first().click();
  console.log(tag, 'check:', await page.locator('.predict-check p').first().innerText());

  // Type a rule of the reader's own, then a broken line.
  const ta = ed.locator('[data-src]');
  await ta.click();
  await ta.evaluate((el) => el.setSelectionRange(el.value.length, el.value.length));
  await ta.type('\nif any of "stiff neck", "mottled", "high pitched" -> urgent');
  await page.waitForTimeout(700);
  console.log(tag, 'own rule:', await stats(ed), '|', await ed.locator('[data-diff]').innerText());
  await ta.type('\nif "oops -> urgent');
  await page.waitForTimeout(700);
  console.log(tag, 'errors:', await ed.locator('[data-errors]').innerText());
  await ed.locator('[data-tab="alarms"]').click();
  await ed.locator('[data-more]').click();
  console.log(tag, 'alarms shown:', await ed.locator('[data-wrong] li').count());
  await ed.locator('.report summary').click();
  await ed.locator('[data-errors]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch2-${tag}-own.png` });
  await ed.locator('[data-save]').click();

  // Three o'clock.
  await page.click('[data-predict="night-shift"] [data-option="About twice as many"]');
  const three = page.locator('[data-rule-editor]').nth(1);
  console.log(tag, 'three day:', await stats(three));
  await three.locator('[data-split="night"]').click();
  console.log(tag, 'three night:', await stats(three));
  await three.locator('.status').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch2-${tag}-night.png` });
  await three.locator('[data-save]').click();
  await page.locator('.predict-check button').last().click();
  console.log(tag, 'check2:', await page.locator('.predict-check p').last().innerText());
  await page.locator('[data-ward-board] [data-set="night"]').first().click();
  await page.locator('[data-ward-board]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch2-${tag}-board.png` });

  const tester = page.locator('[data-rule-tester]');
  console.log(tag, 'speckly/three:', (await tester.locator('.out').innerText()).replace(/\n/g, ' | '));
  await tester.locator('[data-book="yours"]').click();
  console.log(tag, 'speckly/yours:', (await tester.locator('.out').innerText()).replace(/\n/g, ' | '));
  await tester.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch2-${tag}-speckly.png` });
  await settle(page);
  await page.screenshot({ path: `${out}/ch2-${tag}.png`, fullPage: true, scale: 'css' });
  console.log(tag, 'errors:', errs);
  await ctx.close();
}
await b.close(); srv.close();
