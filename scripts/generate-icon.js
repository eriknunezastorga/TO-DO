#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const src    = path.join(__dirname, '..', 'assets', 'icon.png');
const outDir = path.join(__dirname, '..', 'build');
const outPath = path.join(outDir, 'icon.png');

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, outPath);
console.log('Ikon kopierad:', outPath);
