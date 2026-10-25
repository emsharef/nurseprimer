import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the Fifth Night: makes the guesses, explores the word map (find, zoom, tap, neighbours), trains the
// map-reader, opens the lists, saves to the Ward Board, and uses the reading glass presets.
// Usage: node scripts/playtest/ch05.mjs <screenshot dir>
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';

const srv = await serve(dist);
const b = await chromium.launch();
for (const [w, h, tag, scheme] of [[1280, 900, 'desk', 'light'], [390, 844, 'phone', 'light'], [390, 844, 'phonedark', 'dark']]) {
  const phone = tag.startsWith('phone');
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/05-words-as-places/`);
  await page.waitForTimeout(800);
  await page.locator('[data-predict="speckles"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch5-${tag}-locked.png` });
  console.log(tag, 'locked before guess:', await page.locator('.predict-locked').count());
  await page.click('[data-predict="speckles"] [data-option="Among the rash words"]');
  await page.click('[data-word-map] [data-word="speckles"]');
  await page.waitForTimeout(200);
  console.log(tag, 'speckles:', (await page.locator('[data-word-map] [data-nbrs]').innerText()).replace(/\s+/g, ' '));
  await page.locator('[data-word-map]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch5-${tag}-map.png` });
  await page.click('[data-word-map] [data-zoom="in"]');
  await page.click('[data-word-map] [data-zoom="in"]');
  await page.locator('[data-word-map] .map').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch5-${tag}-map-zoom.png` });
  // Keyboard: step to a neighbour.
  await page.locator('[data-word-map] .nb').first().focus();
  await page.keyboard.press('Enter');
  console.log(tag, 'after neighbour:', await page.locator('[data-word-map] [data-title]').innerText());
  // Search by typing.
  await page.fill('[data-word-map] [data-find]', 'felt');
  await page.press('[data-word-map] [data-find]', 'Enter');
  console.log(tag, 'felt:', (await page.locator('[data-word-map] [data-nbrs]').innerText()).replace(/\s+/g, ' ').slice(0, 120));
  await page.fill('[data-word-map] [data-find]', 'zzzz');
  await page.press('[data-word-map] [data-find]', 'Enter');
  console.log(tag, 'unknown:', await page.locator('[data-word-map] [data-title]').innerText());
  await page.click('[data-word-map] [data-zoom="reset"]');
  // Tap a dot in the middle of the map.
  const box = await page.locator('[data-word-map] .map').boundingBox();
  const dot = await page.locator('[data-word-map] circle.dot').nth(40).boundingBox();
  if (phone) await page.touchscreen.tap(dot.x + dot.width / 2, dot.y + dot.height / 2);
  else await page.mouse.click(dot.x + dot.width / 2, dot.y + dot.height / 2);
  console.log(tag, 'tapped:', await page.locator('[data-word-map] [data-title]').innerText(), '| map box', Math.round(box.width), 'x', Math.round(box.height));

  await page.click('[data-predict="night"] [data-option="Fewer missed emergencies"]');
  await page.click('[data-map-train] [data-train]');
  await page.waitForSelector('[data-map-train] [data-after]:not([hidden])', { timeout: 60000 });
  console.log(tag, 'progress:', await page.locator('[data-map-train] [data-progress]').innerText());
  console.log(tag, 'table:', (await page.locator('[data-map-train] table').innerText()).replace(/\s+/g, ' '));
  await page.locator('[data-map-train] details').first().click();
  await page.locator('[data-map-train] table').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch5-${tag}-train.png` });
  await page.locator('[data-map-train] details').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch5-${tag}-lists.png` });
  console.log(tag, 'lists:', await page.locator('[data-map-train] details summary').allInnerTexts());
  await page.click('[data-map-train] [data-save]');
  await page.locator('.predict-check button').first().click();
  console.log(tag, 'check1:', await page.locator('.predict-check p').first().innerText());

  await page.click('[data-predict="felt"] [data-option="Urgent"]');
  const glass = page.locator('[data-map-glass]');
  const presets = glass.locator('[data-preset]');
  for (let i = 0; i < 4; i++) {
    await presets.nth(i).click(); await page.waitForTimeout(150);
    console.log(tag, `glass ${i}:`, await glass.locator('[data-verdict]').innerText(), '|', await glass.locator('[data-sub]').innerText(), '|', await glass.locator('[data-bow]').innerText(), '| lands', await glass.locator('[data-lands]').innerText());
    if (i === 0) { await glass.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/ch5-${tag}-glass.png` }); }
  }
  await page.locator('[data-ward-board] [data-set="night"]').first().click();
  await page.locator('[data-ward-board]').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch5-${tag}-board.png` });
  await settle(page);
  await page.screenshot({ path: `${out}/ch5-${tag}.png`, fullPage: true });
  console.log(tag, 'errors:', errs);
  await page.close();
}
await b.close(); srv.close();
