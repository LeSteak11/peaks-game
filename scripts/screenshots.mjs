// Dev/QA screenshot harness for status reports. Drives the running dev server with
// puppeteer-core using a locally installed Chrome/Edge (no browser download).
// Usage: node scripts/screenshots.mjs [baseUrl]   (default http://localhost:5199)
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
if (!executablePath) {
  console.error('No local Chrome/Edge found — install one or add its path to CANDIDATES.');
  process.exit(1);
}

const SEED = 20260904; // fixed seed → reproducible screenshots

async function freshGame(page, iceCount = 2) {
  await page.evaluate(
    (seed, ice) => window.__peaks.controller.newGame(seed, { iceCount: ice, undoLimit: null }),
    SEED,
    iceCount,
  );
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  }, theme);
}

/**
 * Clear-tap repeatedly (drawing when needed) until the combo reaches `target`.
 * One move per iteration with a pause — the app's 150ms input lock (double-tap
 * guard) rightly swallows anything faster.
 */
async function buildCombo(page, target) {
  for (let guard = 0; guard < 120; guard++) {
    const done = await page.evaluate((n) => {
      const { controller, engine } = window.__peaks;
      const state = controller.getState();
      if (state.combo >= n) return true;
      const clearTap = engine
        .legalMoves(state)
        .find((m) => m.type === 'tap' && engine.tapAction(state, m.slot) === 'clear');
      if (clearTap) controller.tap(clearTap.slot);
      else if (state.pack.length > 0) controller.draw();
      else return true;
      return false;
    }, target);
    if (done) return;
    await new Promise((r) => setTimeout(r, 170));
  }
}

/** Doctor a state so one iced card is exposed-frozen and one is exposed-cracked. */
async function exposeIceStates(page) {
  await page.evaluate(() => {
    const { controller } = window.__peaks;
    const s = controller.getState();
    const board = s.board.map((slot, i) => {
      if (i >= 18 && i <= 21) return { ...slot, cleared: true }; // uncovers slots 9 & 10
      if (i === 9) return { ...slot, ice: 'intact' };
      if (i === 10) return { ...slot, ice: 'cracked' };
      return slot;
    });
    controller.restore({ ...s, board });
  });
}

async function shot(page, name) {
  const path = join(OUT, name);
  await new Promise((r) => setTimeout(r, 350)); // let transitions settle
  await page.screenshot({ path });
  console.log('saved', name);
}

const browser = await puppeteer.launch({ executablePath, headless: 'new' });
try {
  const page = await browser.newPage();

  // --- 360px phone ---
  await page.setViewport({ width: 360, height: 700, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.slot');

  await freshGame(page);
  await setTheme(page, 'light');
  await shot(page, 'p1s4-360-light.png');

  await setTheme(page, 'dark');
  await shot(page, 'p1s4-360-dark.png');

  await setTheme(page, 'light');
  await buildCombo(page, 3);
  await shot(page, 'p1s4-360-combo.png');

  await freshGame(page, 3);
  await exposeIceStates(page);
  await shot(page, 'p1s4-360-ice.png');

  // --- desktop ---
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await freshGame(page);
  await setTheme(page, 'light');
  await shot(page, 'p1s4-desktop-light.png');

  await setTheme(page, 'dark');
  await shot(page, 'p1s4-desktop-dark.png');

  // --- Step 5: real daily loop, end to end (fresh profile ≙ fresh device) ---
  await browser
    .defaultBrowserContext()
    .overridePermissions(new URL(BASE_URL).origin, [
      'clipboard-read',
      'clipboard-write',
      'clipboard-sanitized-write',
    ]);
  await page.setViewport({ width: 360, height: 700, deviceScaleFactor: 2 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('.slot');
  await setTheme(page, 'light');
  await shot(page, 'p1s5-360-daily-start.png'); // hint, no 🔀, "Undo · 3"

  // Play today's summit to the end (first legal move each step, paced past the input lock).
  for (let guard = 0; guard < 200; guard++) {
    const done = await page.evaluate(() => {
      const { controller, engine } = window.__peaks;
      const s = controller.getState();
      if (engine.isSummit(s) || engine.isStuck(s)) return true;
      const legal = engine.legalMoves(s);
      if (legal.length === 0) return true;
      const m = legal[0];
      if (m.type === 'tap') controller.tap(m.slot);
      else controller.draw();
      return false;
    });
    if (done) break;
    await new Promise((r) => setTimeout(r, 170));
  }
  await shot(page, 'p1s5-360-results.png'); // results modal, streak, countdown

  await page.click('.share-btn');
  await new Promise((r) => setTimeout(r, 400));
  const shareLabel = await page.$eval('.share-btn', (el) => el.textContent);
  const clipboard = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  console.log('share button after click:', JSON.stringify(shareLabel));
  console.log('clipboard now contains:', JSON.stringify(clipboard));
  await shot(page, 'p1s5-360-share-copied.png');

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 400));
  await shot(page, 'p1s5-360-revisit.png'); // same-day revisit: results + countdown
} finally {
  await browser.close();
}
console.log('done →', OUT);
