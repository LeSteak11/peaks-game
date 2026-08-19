// Generates the branded Peaks PWA icon set as raw PNGs.
// Zero dependencies; includes standard, maskable, and Apple touch variants.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKY_TOP = [30, 72, 110];
const SKY_BOTTOM = [96, 148, 188];
const SUN = [232, 161, 60];
const BACK_PEAK = [58, 88, 114];
const MOUNTAIN = [61, 51, 44];
const SNOW = [255, 255, 255];

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function inPeak(x, y, size, cx, topY, baseY, halfW) {
  const t = (y - topY) / (baseY - topY);
  return t >= 0 && t <= 1 && Math.abs(x - cx) <= halfW * t ? (y - topY) / (baseY - topY) : null;
}

function pixelAt(x, y, size, padded) {
  // Layered peaks with snow caps, a sun, and a sky gradient. Maskable variant keeps
  // everything inside the safe zone.
  const s = padded ? 0.62 : 0.94;
  const baseY = size * (padded ? 0.76 : 0.9);

  // Front (main) peak.
  const front = inPeak(x, y, size, size * 0.46, size * (1 - s * 0.82), baseY, size * s * 0.46);
  if (front !== null) return front < 0.26 ? SNOW : MOUNTAIN;

  // Back peak, right of the main one.
  const back = inPeak(x, y, size, size * 0.72, size * (1 - s * 0.6), baseY, size * s * 0.34);
  if (back !== null) return back < 0.2 ? SNOW : BACK_PEAK;

  // Sun, upper right.
  const sunX = size * (padded ? 0.72 : 0.8);
  const sunY = size * (padded ? 0.3 : 0.2);
  const sunR = size * (padded ? 0.06 : 0.08);
  if ((x - sunX) ** 2 + (y - sunY) ** 2 <= sunR ** 2) return SUN;

  // Sky gradient.
  const g = y / size;
  return [
    Math.round(SKY_TOP[0] + (SKY_BOTTOM[0] - SKY_TOP[0]) * g),
    Math.round(SKY_TOP[1] + (SKY_BOTTOM[1] - SKY_TOP[1]) * g),
    Math.round(SKY_TOP[2] + (SKY_BOTTOM[2] - SKY_TOP[2]) * g),
  ];
}

function makePng(size, padded) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y, size, padded);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'pwa-192x192.png'), makePng(192, false));
writeFileSync(join(outDir, 'pwa-512x512.png'), makePng(512, false));
writeFileSync(join(outDir, 'pwa-maskable-512x512.png'), makePng(512, true));
writeFileSync(join(outDir, 'apple-touch-icon.png'), makePng(180, false));
console.log('Branded icons written to public/');
