import { serve, settle } from '../lib/serve.mjs';
import { chromium } from 'playwright';
// Playtest of the Sixth Night: guesses, runs the counting machine, trains Wick (in full on desktop; on the phone
// with the CPU slowed 4x to stand in for a mid-range phone, then takes the precomputed skip), checks the page
// stays responsive during training, uses the recorded GPT-2 panel, and tries the download with the network to
// Hugging Face blocked (the failure path).
// Usage: node scripts/playtest/ch06.mjs <screenshot dir> [--real]   (--real: also do the real GPT-2 download on desktop)
const dist = 'apps/site/dist', out = process.argv[2] ?? '.';
const real = process.argv.includes('--real');
const srv = await serve(dist);
const b = await chromium.launch();

const runs = [[1280, 900, 'desk', 'light'], [390, 844, 'phone', 'dark'], [390, 844, 'phone', 'light']];
for (const [w, h, tag, scheme] of runs) {
  const name = `${tag}-${scheme}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, isMobile: tag === 'phone', hasTouch: tag === 'phone', deviceScaleFactor: tag === 'phone' ? 2 : 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  if (!(real && tag === 'desk')) await page.route(/huggingface\.co|hf\.co|jsdelivr/, (r) => r.abort('internetdisconnected'));
  // On the phone runs, #slow-device makes the training worker idle 3/4 of the time, like a device 4x slower.
  await page.goto(`${srv.origin}/chapters/06-next-word/${tag === 'phone' ? '#slow-device' : ''}`);
  await page.waitForTimeout(800);

  // 1. The counting machine.
  await page.locator('[data-predict="after-she-has-a"]').scrollIntoViewIfNeeded();
  console.log(name, 'locked before guess:', await page.locator('.predict-locked').count());
  await page.click('[data-predict="after-she-has-a"] [data-option="fever"]');
  await page.waitForSelector('[data-counting] .nw-bar');
  console.log(name, 'lookup:', await page.locator('[data-counting] [data-lookup]').innerText());
  console.log(name, 'bars:', (await page.locator('[data-counting] .nw-bar .w').allInnerTexts()).join(' | '));
  await page.locator('[data-counting] button.nw-bar').first().click();
  await page.click('[data-counting] [data-run]');
  await page.waitForFunction(() => document.querySelector('[data-counting] [data-tape] .end'), null, { timeout: 20000 });
  console.log(name, 'tape:', await page.locator('[data-counting] [data-tape]').innerText());
  await page.locator('[data-counting]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch6-${name}-counting.png` });
  await page.click('[data-counting] .nw-chip >> nth=1');
  await page.check('[data-counting] [name="ng-order"][value="1"]');
  await page.click('[data-counting] [data-run]');
  await page.waitForFunction(() => document.querySelector('[data-counting] [data-tape] .end'), null, { timeout: 20000 });
  console.log(name, 'no-memory tape:', (await page.locator('[data-counting] [data-tape]').innerText()).slice(0, 160));
  await page.locator('.predict-check button').first().click();
  console.log(name, 'check 1:', await page.locator('.predict-check p').first().innerText());

  // 2. Wick learns to speak.
  await page.click('[data-predict="first-guess"] [data-option="About 1 in 4"]');
  const cdp = await ctx.newCDPSession(page);
  if (tag === 'phone') await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.locator('[data-voice] [data-go]').scrollIntoViewIfNeeded();
  const t0 = Date.now();
  await page.click('[data-voice] [data-go]');
  // Responsiveness: the longest gap between main-thread timers over 5 seconds of training.
  const gap = await page.evaluate(() => new Promise((res) => {
    let last = performance.now(), worst = 0;
    const end = last + 5000;
    const tick = () => { const now = performance.now(); worst = Math.max(worst, now - last); last = now; if (now < end) setTimeout(tick, 0); else res(Math.round(worst)); };
    setTimeout(tick, 0);
  }));
  console.log(name, 'longest main-thread gap during training (ms):', gap);
  if (tag === 'phone') {
    await page.waitForSelector('[data-voice] [data-skip]:not([hidden])', { timeout: 30000 }).catch(() => console.log(name, 'NO skip button offered'));
    console.log(name, 'status:', await page.locator('[data-voice] [data-status]').innerText());
    console.log(name, 'skip note:', await page.locator('[data-voice] [data-skip-note]').innerText());
    await page.locator('[data-voice] .chart').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/ch6-${name}-training.png` });
    await page.click('[data-voice] [data-skip]');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  }
  await page.waitForSelector('[data-voice] [data-after]:not([hidden])', { timeout: 240000 });
  console.log(name, `training done after ${Math.round((Date.now() - t0) / 1000)} s:`, await page.locator('[data-voice] [data-status]').innerText());
  const lines = await page.locator('[data-voice] [data-lines] li').allInnerTexts();
  console.log(name, 'tape lines:', lines.length, '| first:', lines[0]?.replace(/\n/g, ' '), '| last:', lines.at(-1)?.replace(/\n/g, ' '));
  await page.click('[data-voice] [data-continue]');
  await page.waitForFunction(() => document.querySelector('[data-voice] [data-out]')?.textContent);
  console.log(name, 'continued:', await page.locator('[data-voice] [data-out]').innerText(), '|', await page.locator('[data-voice] [data-window]').innerText());
  await page.locator('[data-voice] .chart').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch6-${name}-voice.png` });
  await page.locator('[data-voice] [data-after]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch6-${name}-voice-after.png` });
  if (tag === 'desk') {
    await page.click('[data-voice] [data-long]');
    await page.waitForFunction(() => /100,000/.test(document.querySelector('[data-voice] [data-title]')?.textContent ?? ''));
    console.log(name, 'long:', await page.locator('[data-voice] [data-status]').innerText(), '|', (await page.locator('[data-voice] [data-lines] li').last().innerText()).replace(/\n/g, ' '));
  }

  // 3. GPT-2, recorded.
  const g = page.locator('[data-gpt2]');
  await g.scrollIntoViewIfNeeded();
  console.log(name, 'gpt2 pieces:', await g.locator('[data-piece-count]').innerText(), '| bars:', (await g.locator('.nw-bar .w').allInnerTexts()).slice(0, 4).join(' | '));
  await g.locator('[data-temp]').fill('0.25');
  await g.locator('[data-temp]').dispatchEvent('input');
  console.log(name, 'T=0.25 top:', (await g.locator('.nw-bar .pct').allInnerTexts()).slice(0, 2).join(' '));
  await g.locator('.nw-chip >> nth=4').click();
  console.log(name, 'MyRiverside pieces:', (await g.locator('[data-pieces] li').allInnerTexts()).join('|'));
  await g.locator('.nw-chip >> nth=0').click();
  await page.screenshot({ path: `${out}/ch6-${name}-gpt2.png` });
  if (!(real && tag === 'desk')) {
    await g.locator('[data-load]').click();
    await page.waitForFunction(() => /didn|couldn/.test(document.querySelector('[data-gpt2] [data-load-status]')?.textContent ?? ''), null, { timeout: 30000 })
      .catch(() => {});
    console.log(name, 'blocked download says:', await g.locator('[data-load-status]').innerText());
  } else {
    const d0 = Date.now();
    await g.locator('[data-load]').click();
    await page.waitForFunction(() => /Live/.test(document.querySelector('[data-gpt2] [data-mode-line]')?.textContent ?? ''), null, { timeout: 600000 });
    console.log(name, `real download+start: ${Math.round((Date.now() - d0) / 1000)} s`);
    await g.locator('[data-text]').fill('my daughter is 3 and has a temperature of 38.5. should i take her to a&e?');
    await page.waitForTimeout(1500);
    console.log(name, 'live pieces:', await g.locator('[data-piece-count]').innerText(), '| bars:', (await g.locator('.nw-bar .w').allInnerTexts()).slice(0, 5).join(' | '));
    await g.locator('[data-run]').click();
    await page.waitForFunction(() => document.querySelector('[data-gpt2] [data-run]')?.textContent === 'Print 30 more', null, { timeout: 120000 });
    console.log(name, 'live tape:', await g.locator('[data-tape]').innerText(), '| per guess:', await g.locator('[data-ms]').innerText());
    await g.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/ch6-${name}-gpt2-live.png` });
  }

  // 4. The break.
  await page.click('[data-predict="answers"] [data-option="An answer, like the tube’s"]');
  await page.locator('.continuations').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${out}/ch6-${name}-break.png` });
  await settle(page);
  await page.screenshot({ path: `${out}/ch6-${name}.png`, fullPage: true });
  console.log(name, 'errors:', errs.filter((e) => !/internetdisconnected|Failed to load resource|ERR_INTERNET/.test(e)));
  await ctx.close();
}
await b.close();
srv.close();
