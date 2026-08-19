// Scripted QA checklist (PM, Step 6): fresh install → daily → refresh mid-game →
// resume → stuck → undo → finish → share → revisit → practice → next-day rollover.
// Runs against a dev server; prints PASS/FAIL per item and exits non-zero on failure.
// Usage: node scripts/qa.mjs [baseUrl]
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.argv[2] ?? 'http://localhost:5199';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'status', 'img');
mkdirSync(OUT, { recursive: true });

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) throw new Error('no local Chrome/Edge found');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const browser = await puppeteer.launch({ executablePath, headless: 'new' });
try {
  await browser
    .defaultBrowserContext()
    .overridePermissions(new URL(BASE_URL).origin, [
      'clipboard-read',
      'clipboard-write',
      'clipboard-sanitized-write',
    ]);
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 700, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.slot');
  await page.evaluate(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = 'light';
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.slot');

  const q = (sel) => page.$(sel);
  const state = () =>
    page.evaluate(() => {
      const { controller, engine } = window.__peaks;
      const s = controller.getState();
      return {
        seed: s.seed,
        score: s.score,
        draws: s.draws,
        undosUsed: s.undosUsed,
        pack: s.pack.length,
        moves: controller.getMoves().length,
        stuck: engine.isStuck(s),
        summit: engine.isSummit(s),
        undoLimit: s.undoLimit,
      };
    });

  // 1 — fresh install → daily
  const s1 = await state();
  const todaySeed = await page.evaluate(() => {
    const d = new Date();
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  });
  check('fresh install starts today’s daily', s1.seed === todaySeed && s1.undoLimit === 3);
  check('hint shown on first visit', !!(await q('.hint')));
  check(
    '🔀 hidden in daily mode',
    await page.$eval('.new-climb', (el) => getComputedStyle(el).display === 'none'),
  );
  check(
    'undo shows daily budget',
    (await page.$eval('.undo-btn', (el) => el.textContent)) === 'Undo · 3',
  );

  // 2 — a few moves, then refresh mid-game → exact resume
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const { controller, engine } = window.__peaks;
      const legal = engine.legalMoves(controller.getState());
      const m = legal[0];
      if (!m) return;
      if (m.type === 'tap') controller.tap(m.slot);
      else controller.draw();
    });
    await sleep(170);
  }
  const before = await state();
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.slot');
  const after = await state();
  check(
    'mid-game refresh resumes exactly (score/draws/moves/pack)',
    JSON.stringify(before) === JSON.stringify(after),
    `before=${JSON.stringify(before)} after=${JSON.stringify(after)}`,
  );

  // 3 — drive to stuck WITHOUT using undos: drain the pack first, then tap out
  for (let guard = 0; guard < 120; guard++) {
    const done = await page.evaluate(() => {
      const { controller, engine } = window.__peaks;
      const s = controller.getState();
      if (engine.isStuck(s) || engine.isSummit(s)) return true;
      if (s.pack.length > 0) controller.draw();
      else {
        const tap = engine.legalMoves(s).find((m) => m.type === 'tap');
        if (!tap) return true;
        controller.tap(tap.slot);
      }
      return false;
    });
    if (done) break;
    await sleep(170);
  }
  const stuckState = await state();
  check(
    'reached stuck with undos remaining (soft-stuck)',
    stuckState.stuck && stuckState.undosUsed === 0,
  );
  check(
    'no modal yet — stuck is soft',
    !(await page.$eval('.modal-overlay', (el) => !el.classList.contains('hidden'))),
  );
  check(
    'Finish climb visible',
    await page.$eval('.finish-btn', (el) => !el.classList.contains('hidden')),
  );
  check('Undo still enabled', await page.$eval('.undo-btn', (el) => !el.disabled));
  await page.screenshot({ path: join(OUT, 'p1s6-360-soft-stuck.png') });

  // 4 — undo out of stuck, continue, then Finish
  await page.click('.undo-btn');
  await sleep(200);
  const reopened = await state();
  check('undo re-opens the game', !reopened.stuck && reopened.undosUsed === 1);
  // Re-play the same move to get back to stuck, then finish deliberately.
  for (let guard = 0; guard < 10 && !(await state()).stuck; guard++) {
    await page.evaluate(() => {
      const { controller, engine } = window.__peaks;
      const s = controller.getState();
      if (s.pack.length > 0) controller.draw();
      else {
        const tap = engine.legalMoves(s).find((m) => m.type === 'tap');
        if (tap) controller.tap(tap.slot);
      }
    });
    await sleep(170);
  }
  await page.click('.finish-btn');
  await sleep(300);
  check(
    'Finish climb finalizes → results modal',
    await page.$eval('.modal-overlay', (el) => !el.classList.contains('hidden')),
  );

  // 5 — share (desktop pointer in headless → copy path)
  await page.click('.share-btn');
  await sleep(400);
  const label = await page.$eval('.share-btn', (el) => el.textContent);
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  check('share shows Copied!', label === 'Copied!');
  check(
    'clipboard has spec share text',
    !!clip && /^Peaks #\d+ ⛰️ /.test(clip),
    JSON.stringify(clip),
  );

  // 6 — revisit: reload shows results + countdown immediately
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(400);
  check(
    'revisit shows results modal',
    await page.$eval('.modal-overlay', (el) => !el.classList.contains('hidden')),
  );
  const countdown = await page.$eval('.results-countdown', (el) => el.textContent);
  check('countdown formatted', /Next summit in \d{2}:\d{2}/.test(countdown ?? ''), countdown ?? '');

  // 7 — practice mode
  await page.click('.practice-btn');
  await sleep(300);
  check(
    'practice banner visible with countdown',
    await page.$eval(
      '.practice-banner',
      (el) =>
        getComputedStyle(el).display !== 'none' &&
        /Practice climb · Next summit in \d{2}:\d{2}/.test(el.textContent ?? ''),
    ),
  );
  check(
    '🔀 visible in practice',
    await page.$eval('.new-climb', (el) => getComputedStyle(el).display !== 'none'),
  );
  check(
    'practice undo is unlimited',
    (await page.$eval('.undo-btn', (el) => el.textContent)) === 'Undo',
  );
  await page.screenshot({ path: join(OUT, 'p1s6-360-practice.png') });

  // 8 — next-day rollover (fake the clock +24h)
  await page.evaluateOnNewDocument(() => {
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() + 86_400_000;
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.slot');
  await sleep(300);
  const rolled = await state();
  const modalOpen = await page.$eval('.modal-overlay', (el) => !el.classList.contains('hidden'));
  check(
    'next UTC day unlocks a new daily (new seed, no modal)',
    !modalOpen && rolled.seed !== todaySeed && rolled.undoLimit === 3,
    `seed=${rolled.seed}`,
  );
} finally {
  await browser.close();
}

console.log(failures === 0 ? '\nQA: all checks passed' : `\nQA: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
