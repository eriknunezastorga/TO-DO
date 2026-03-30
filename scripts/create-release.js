'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'eriknunezastorga';
const REPO = 'TO-DO';
const TAG = 'v2.1.0';
const EXE = path.join(__dirname, '..', 'dist', 'Simpel-Setup-2.1.0.exe');

if (!TOKEN) {
  console.error('Sätt GITHUB_TOKEN=<token> innan du kör skriptet.');
  process.exit(1);
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  // 1. Skapa release
  console.log('Skapar release...');
  const createRes = await request({
    hostname: 'api.github.com',
    path: `/repos/${OWNER}/${REPO}/releases`,
    method: 'POST',
    headers: {
      'Authorization': `token ${TOKEN}`,
      'User-Agent': 'simpel-release-script',
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
  }, JSON.stringify({
    tag_name: TAG,
    name: `Simpel ${TAG}`,
    body: 'Windows-installerare för Simpel – lokal uppgiftshanterare.\n\nLadda ner och kör `Simpel-Setup-2.1.0.exe` för att installera.\n\n**Nyheter i v2.1.0:**\n- Redigering och borttagning av projekt\n- Fixad AI-mall dropdown i anteckningar\n- Ny app-ikon och splash screen\n- Ökad AI-timeout och modellval',
    draft: false,
    prerelease: false,
  }));

  if (createRes.status !== 201) {
    // Release kan redan finnas
    if (createRes.body && createRes.body.errors && createRes.body.errors[0].code === 'already_exists') {
      console.log('Release finns redan, hämtar befintlig...');
      const getRes = await request({
        hostname: 'api.github.com',
        path: `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`,
        method: 'GET',
        headers: {
          'Authorization': `token ${TOKEN}`,
          'User-Agent': 'simpel-release-script',
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (getRes.status !== 200) {
        console.error('Kunde inte hämta release:', getRes.body);
        process.exit(1);
      }
      return uploadAsset(getRes.body.upload_url);
    }
    console.error('Kunde inte skapa release:', createRes.status, createRes.body);
    process.exit(1);
  }

  await uploadAsset(createRes.body.upload_url);
}

async function uploadAsset(uploadUrl) {
  // upload_url är t.ex. "https://uploads.github.com/repos/.../releases/.../assets{?name,label}"
  const base = uploadUrl.replace(/\{.*\}/, '');
  const fileName = path.basename(EXE);
  const fileData = fs.readFileSync(EXE);

  console.log(`Laddar upp ${fileName} (${(fileData.length / 1024 / 1024).toFixed(1)} MB)...`);

  const url = new URL(`${base}?name=${encodeURIComponent(fileName)}`);

  const res = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'User-Agent': 'simpel-release-script',
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileData.length,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, r => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => resolve({ status: r.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(fileData);
    req.end();
  });

  if (res.status === 201) {
    console.log(`\nKlart! Releasen finns nu på:`);
    console.log(`https://github.com/${OWNER}/${REPO}/releases/tag/${TAG}`);
  } else {
    console.error('Uppladdning misslyckades:', res.status, res.body);
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
