// Records a ~10s gameplay GIF for status reports: a few taps, a draw, an undo.
// Requires a running dev server and ffmpeg on PATH.
// Usage: node scripts/gif.mjs [baseUrl]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const BASE_URL = process.argv[2] ?? 'http://localhost:5199';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'status', 'img');
mkdirSync(OUT_DIR, { recursive: true });
const WEBM = join(OUT_DIR, 'p1s4-gameplay.webm');
const GIF = join(OUT_DIR, 'p1s4-gameplay.gif');

const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) throw new Error('no local Chrome/Edge found');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath, headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 620, deviceScaleFactor: 1 });
  await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.slot');
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light';
    window.__peaks.controller.newGame(20260904, { iceCount: 2, undoLimit: null });
  });
  await sleep(400);

  const recorder = await page.screencast({ path: WEBM });

  // ~10s of play: prefer clear taps, sprinkle a draw, end on an undo.
  const script = ['tap', 'tap', 'draw', 'tap', 'tap', 'draw', 'tap', 'undo'];
  for (const kind of script) {
    await page.evaluate((k) => {
      const { controller, engine } = window.__peaks;
      const state = controller.getState();
      if (k === 'undo') return void controller.undo();
      if (k === 'draw') return void controller.draw();
      const clearTap = engine
        .legalMoves(state)
        .find((m) => m.type === 'tap' && engine.tapAction(state, m.slot) === 'clear');
      if (clearTap) controller.tap(clearTap.slot);
      else controller.draw();
    }, kind);
    await sleep(1100);
  }

  await recorder.stop();
} finally {
  await browser.close();
}

execFileSync('ffmpeg', [
  '-y',
  '-i',
  WEBM,
  '-vf',
  'fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
  GIF,
]);
rmSync(WEBM);
console.log('saved', GIF);
