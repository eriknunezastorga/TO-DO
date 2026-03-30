#!/usr/bin/env node
'use strict';

// Tar originalbilden, hittar ikonens bounding box, croppar + lägger
// en mörk teal-bakgrund så ikonen syns bra i taskbaren.

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// --- CRC32 ---
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
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

// --- PNG parse ---
function parsePNG(buf) {
  let pos = 8;
  let width, height, colorType;
  const idatChunks = [];
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos); pos += 4;
    const type   = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
    const data   = buf.slice(pos, pos + length); pos += length + 4;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === 'IDAT') { idatChunks.push(data); }
  }
  return { width, height, colorType, compressed: Buffer.concat(idatChunks) };
}

// --- PNG decode → RGBA ---
function decodePNG({ width, height, colorType, compressed }) {
  const raw = zlib.inflateSync(compressed);
  const ch  = colorType === 6 ? 4 : 3;
  const bpp = ch;
  const stride = width * ch;
  const tmp = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src    = raw.slice(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const base   = y * stride;
    for (let x = 0; x < stride; x++) {
      const L  = x >= bpp ? tmp[base + x - bpp] : 0;
      const U  = y  > 0   ? tmp[(y-1) * stride + x] : 0;
      const UL = (y > 0 && x >= bpp) ? tmp[(y-1)*stride+x-bpp] : 0;
      let v;
      switch (filter) {
        case 0: v = src[x]; break;
        case 1: v = (src[x] + L) & 0xFF; break;
        case 2: v = (src[x] + U) & 0xFF; break;
        case 3: v = (src[x] + ((L+U)>>1)) & 0xFF; break;
        case 4: {
          const p = L+U-UL;
          const pa=Math.abs(p-L), pb=Math.abs(p-U), pc=Math.abs(p-UL);
          v = (src[x] + (pa<=pb&&pa<=pc ? L : pb<=pc ? U : UL)) & 0xFF;
          break;
        }
        default: v = src[x];
      }
      tmp[base+x] = v;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i*4]   = tmp[i*ch];
    rgba[i*4+1] = tmp[i*ch+1];
    rgba[i*4+2] = tmp[i*ch+2];
    rgba[i*4+3] = ch === 4 ? tmp[i*ch+3] : 255;
  }
  return rgba;
}

// --- Hitta bounding box för ikonen (allt som inte är bakgrundsfärg) ---
function findBounds(rgba, width, height, bgR, bgG, bgB, threshold) {
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i], g = rgba[i+1], b = rgba[i+2];
      const d = Math.sqrt((r-bgR)**2+(g-bgG)**2+(b-bgB)**2);
      if (d > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, maxX, minY, maxY };
}

// --- Skala ner RGBA (nearest-neighbor) ---
function scale(rgba, srcW, srcH, dstW, dstH) {
  const out = new Uint8Array(dstW * dstH * 4);
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min((x / dstW * srcW) | 0, srcW-1);
      const sy = Math.min((y / dstH * srcH) | 0, srcH-1);
      const si = (sy * srcW + sx) * 4;
      const di = (y  * dstW + x)  * 4;
      out[di]   = rgba[si];
      out[di+1] = rgba[si+1];
      out[di+2] = rgba[si+2];
      out[di+3] = rgba[si+3];
    }
  }
  return out;
}

// --- Encode RGBA → PNG ---
function encodePNG(rgba, width, height) {
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride+1)] = 0;
    for (let x = 0; x < stride; x++) raw[y*(stride+1)+1+x] = rgba[y*stride+x];
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  return Buffer.concat([sig, makeChunk('IHDR',ihdr), makeChunk('IDAT',idat), makeChunk('IEND',Buffer.alloc(0))]);
}

// ============================================================
// MAIN
// ============================================================
const srcPath   = path.join(__dirname, '..', 'assets', 'icon-original.png');
const assetPath = path.join(__dirname, '..', 'assets', 'icon.png');
const buildPath = path.join(__dirname, '..', 'build',  'icon.png');

const buf = fs.readFileSync(srcPath);
console.log('Läser:', srcPath);

const parsed = parsePNG(buf);
console.log(`Storlek: ${parsed.width}x${parsed.height}`);
const rgba = decodePNG(parsed);

// Bakgrundsfärg från övre vänster hörn
const bgR = rgba[0], bgG = rgba[1], bgB = rgba[2];
console.log(`Bakgrund: rgb(${bgR},${bgG},${bgB})`);

// Hitta ikonens exakta bounds
const bounds = findBounds(rgba, parsed.width, parsed.height, bgR, bgG, bgB, 50);
console.log(`Ikon-bounds: (${bounds.minX},${bounds.minY}) → (${bounds.maxX},${bounds.maxY})`);

const iconW = bounds.maxX - bounds.minX + 1;
const iconH = bounds.maxY - bounds.minY + 1;

// Lägg till 5% padding runt ikonen
const pad = Math.round(Math.max(iconW, iconH) * 0.05);
const cropX = Math.max(0, bounds.minX - pad);
const cropY = Math.max(0, bounds.minY - pad);
const cropW = Math.min(parsed.width  - cropX, iconW + pad * 2);
const cropH = Math.min(parsed.height - cropY, iconH + pad * 2);

// Skapa kvadratisk output (ta den längre sidan)
const side = Math.max(cropW, cropH);
const out  = new Uint8Array(side * side * 4);

// Fyll med mörkt teal-bakgrund (#0d3d4a) — syns bra mot både ljus och mörk taskbar
const [bgOutR, bgOutG, bgOutB] = [13, 61, 74];

// Centrera ikonen i kvadraten
const offX = Math.round((side - cropW) / 2);
const offY = Math.round((side - cropH) / 2);

for (let y = 0; y < side; y++) {
  for (let x = 0; x < side; x++) {
    const di = (y * side + x) * 4;
    const srcX = cropX + (x - offX);
    const srcY = cropY + (y - offY);

    if (srcX < 0 || srcX >= parsed.width || srcY < 0 || srcY >= parsed.height
        || x < offX || y < offY || x >= offX + cropW || y >= offY + cropH) {
      // Bakgrundsfärg
      out[di] = bgOutR; out[di+1] = bgOutG; out[di+2] = bgOutB; out[di+3] = 255;
    } else {
      const si = (srcY * parsed.width + srcX) * 4;
      const r = rgba[si], g = rgba[si+1], b = rgba[si+2];
      // Blanda ikonpixel med bakgrund baserat på likhet med originalbakgrund
      const d = Math.sqrt((r-bgR)**2+(g-bgG)**2+(b-bgB)**2);
      if (d < 50) {
        // Bakgrundspixel → ersätt med ny bakgrund
        out[di] = bgOutR; out[di+1] = bgOutG; out[di+2] = bgOutB; out[di+3] = 255;
      } else {
        out[di] = r; out[di+1] = g; out[di+2] = b; out[di+3] = 255;
      }
    }
  }
}

// Skala till 512x512 för bra kvalitet
const final512 = scale(out, side, side, 512, 512);
const finalPng = encodePNG(final512, 512, 512);

fs.writeFileSync(assetPath, finalPng);
fs.copyFileSync(assetPath, buildPath);
console.log(`Klar! Ikon sparad (512x512) med teal-bakgrund.`);
