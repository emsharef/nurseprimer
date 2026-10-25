import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the Tenth Night: sets permissions, steps through the clean run, guesses, finds the planted note,
// switches lines into the tube, signs or refuses held actions, and takes least privilege.
// Usage: node scripts/playtest/ch10.mjs <screenshot dir>
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';

const srv = await serve(dist);
const b = await chromium.launch();
const runs = [[1280, 900, 'desk', 'light'], [390, 844, 'phone', 'light'], [390, 844, 'phone', 'dark'], [360, 780, 'android', 'light']];
for (const [w, h, tag0, scheme] of runs) {
  const tag = `${tag0}-${scheme}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: tag0 !== 'desk', hasTouch: tag0 !== 'desk', deviceScaleFactor: tag0 !== 'desk' ? 2 : 1 });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(`${srv.origin}/chapters/10-hands/`);
  await page.waitForTimeout(800);
  const traces = page.locator('[data-trace]');
  console.log(tag, 'traces:', await traces.count());
  console.log(tag, 'answers hidden before guessing:', await page.locator('[data-ag-body][hidden]').count(), 'of', await page.locator('[data-ag-body]').count());

  // 1. Permissions panel: full hands to start.
  const panel = page.locator('[data-perm-panel]').first();
  await panel.scrollIntoViewIfNeeded();
  await panel.locator('[data-preset="full"]').click();
  await page.screenshot({ path: `${out}/ch10-${tag}-perms.png` });
  console.log(tag, 'status:', await panel.locator('[data-status]').innerText());

  // 2. The clean run, step by step.
  const clean = traces.nth(0);
  await clean.locator('[data-next]').scrollIntoViewIfNeeded();
  for (let i = 0; i < 3; i++) await clean.locator('[data-next]').click();
  await page.waitForTimeout(300);
  await clean.locator('[data-tape]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch10-${tag}-clean-steps.png` });
  const bar = await clean.locator('.controls').boundingBox();
  console.log(tag, 'step bar on screen after 3 steps:', bar && bar.y + bar.height <= h + 1 && bar.y >= 0);
  await clean.locator('[data-all]').click();
  await page.waitForTimeout(200);
  console.log(tag, 'clean outcome:', (await clean.locator('[data-headline]').innerText()));
  await clean.locator('[data-outcome]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch10-${tag}-clean-outcome.png` });

  // 3. The blunt slip: guess, then find it.
  await page.click('[data-predict="blunt"] [data-option]:last-child');
  const blunt = traces.nth(1);
  await blunt.locator('[data-next]').scrollIntoViewIfNeeded();
  for (let i = 0; i < 6; i++) if (await blunt.locator('[data-next]').isEnabled()) await blunt.locator('[data-next]').click();
  const wrong = blunt.locator('button.note.pick:not([data-note="planted"])').first();
  if (await wrong.count()) { await wrong.click(); console.log(tag, 'wrong pick feedback:', await blunt.locator('[data-feedback]').innerText()); }
  const planted = blunt.locator('button.note.pick[data-note="planted"]');
  console.log(tag, 'planted button visible:', await planted.count());
  if (await planted.count()) await planted.click();
  console.log(tag, 'found feedback:', await blunt.locator('[data-feedback]').innerText());
  await page.waitForTimeout(200);
  await blunt.locator('.note.planted.found').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch10-${tag}-slip-found.png` });
  await blunt.locator('[data-all]').click();
  console.log(tag, 'blunt outcome:', await blunt.locator('[data-headline]').innerText(), '|', await blunt.locator('[data-out-list]').innerText());
  await page.locator('.predict-check button').first().click().catch(() => {});
  console.log(tag, 'blunt answer revealed:', await page.locator('[data-after-guess="blunt"] [data-ag-body]').isVisible());

  // 4. The careful slip on the old line, with full hands, then ask-first (sign it), then least privilege.
  await page.click('[data-predict="old-line"] [data-option]:first-child');
  const careful = traces.nth(2);
  await careful.locator('[data-all]').scrollIntoViewIfNeeded();
  await careful.locator('[data-all]').click();
  await page.waitForTimeout(200);
  console.log(tag, 'old-line answer revealed:', await page.locator('[data-after-guess="old-line"] [data-ag-body]').isVisible());
  console.log(tag, 'careful/old/full:', await careful.locator('[data-headline]').innerText(), '|', await careful.locator('[data-tally]').innerText());
  await careful.locator('[data-outcome]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch10-${tag}-old-full.png` });

  const panel2 = page.locator('[data-perm-panel]').nth(1);
  await panel2.locator('[data-preset="ask"]').click();
  await careful.locator('[data-all]').click();
  const sign = careful.locator('[data-decide="call"][data-v="approve"]');
  console.log(tag, 'held call to sign:', await sign.count());
  await careful.locator('[data-outcome]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch10-${tag}-old-ask.png` });
  if (await sign.count()) { await sign.click(); console.log(tag, 'after signing:', await careful.locator('[data-headline]').innerText()); }

  await page.click('[data-predict="least"] [data-option]:first-child').catch(() => {});
  await panel2.locator('[data-preset="least"]').click();
  await careful.locator('[data-all]').click();
  console.log(tag, 'least answer revealed:', await page.locator('[data-after-guess="least"] [data-ag-body]').isVisible());
  console.log(tag, 'careful/old/least:', await careful.locator('[data-headline]').innerText(), '|', await careful.locator('[data-tally]').innerText());
  await careful.locator('[data-outcome]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch10-${tag}-old-least.png` });

  // Switch to the main line, keyboard only.
  const opus = careful.locator('input[data-model-pick][value="claude-opus-5-5"]');
  await opus.focus(); await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  await careful.locator('[data-all]').click();
  console.log(tag, 'careful/main/least:', await careful.locator('[data-headline]').innerText());

  await page.locator('[data-tally-table]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch10-${tag}-tally.png` });
  await settle(page);
  await page.screenshot({ path: `${out}/ch10-${tag}.png`, fullPage: true });
  console.log(tag, 'errors:', errs);
  await page.close();
}
await b.close(); srv.close();
