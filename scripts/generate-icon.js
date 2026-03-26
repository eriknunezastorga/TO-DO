#!/usr/bin/env node
'use strict';

const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 för PNG-chunks
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c;
}
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

const W = 256, H = 256;
const RADIUS = 48; // hörnradie

// IHDR: RGBA (color type 6)
const ihdr = Buffer.allocUnsafe(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

// Pixeldata med filter-byte per rad (RGBA)
const raw = Buffer.alloc(H * (1 + W * 4));

for (let y = 0; y < H; y++) {
  const base = y * (1 + W * 4);
  raw[base] = 0; // filter: None

  for (let x = 0; x < W; x++) {
    const off = base + 1 + x * 4;

    // Avrundade hörn
    let inside = true;
    const inCorner = (x < RADIUS || x >= W - RADIUS) && (y < RADIUS || y >= H - RADIUS);
    if (inCorner) {
      const cx = x < RADIUS ? RADIUS : W - 1 - RADIUS;
      const cy = y < RADIUS ? RADIUS : H - 1 - RADIUS;
      const dx = x - cx, dy = y - cy;
      inside = dx * dx + dy * dy <= RADIUS * RADIUS;
    }

    if (inside) {
      // Vertikal gradient: mörkare grön (#1e8449) → ljusare (#27ae60)
      const t = y / (H - 1);
      raw[off]     = Math.round(30  + (39  - 30)  * t); // R
      raw[off + 1] = Math.round(132 + (174 - 132) * t); // G
      raw[off + 2] = Math.round(73  + (96  - 73)  * t); // B
      raw[off + 3] = 255;
    } else {
      raw[off] = 0; raw[off + 1] = 0; raw[off + 2] = 0; raw[off + 3] = 0;
    }
  }
}

const idat = zlib.deflateSync(raw);

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);

const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'icon.png');
fs.writeFileSync(outPath, png);
console.log('Ikon skapad:', outPath);
