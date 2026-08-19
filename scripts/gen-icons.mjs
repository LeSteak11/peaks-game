// Generates placeholder PWA icons (solid sky with a simple snow-capped peak) as raw PNGs.
// Zero dependencies — real branded icons replace these in Step 6.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKY = [44, 95, 138];
const MOUNTAIN = [74, 64, 56];
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

function pixelAt(x, y, size, padded) {
  // Simple peak: triangle with a snow cap, on sky. Maskable variant shrinks it into a safe zone.
  const scale = padded ? 0.6 : 0.9;
  const cx = size / 2;
  const baseY = size * (padded ? 0.78 : 0.92);
  const topY = size * (padded ? 0.28 : 0.12);
  const halfW = (size * scale) / 2;
  const t = (y - topY) / (baseY - topY);
  if (t >= 0 && t <= 1 && Math.abs(x - cx) <= halfW * t) {
    return t < 0.28 ? SNOW : MOUNTAIN;
  }
  return SKY;
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
console.log('Placeholder icons written to public/');
