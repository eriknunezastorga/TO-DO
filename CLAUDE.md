# Simpel — CLAUDE.md

Lokal Windows-uppgiftshanterare utan molnberoende. All data sparas lokalt.

---

## Arkitektur

```
Simpel.html   — Hela frontend (CSS + HTML + JS, ~1900 rader, single-file)
main.js       — Electron main process (backend: fil-I/O, dialoger, notiser, Ollama)
preload.js    — Context bridge (exponerar window.electronApi till Simpel.html)
```

### Backend-tiers i Simpel.html (bridge-lager, rad ~852)
Prioritetsordning vid dispatch:
1. **Electron** — `window.electronApi` (sätts av preload.js)
2. **Tauri** — `window.__TAURI_INTERNALS__` (src-tauri/ finns men används ej just nu)
3. **localStorage** — fallback när filen öppnas direkt i webbläsare

### Data
- Fil: `%APPDATA%\Simpel\data.json`
- Schema: `{ tasks: [], projects: [], notes: [] }`
- All persistering går via `bridge.call('save', state)` → `main.js` ipcMain handler

---

## Starta / bygga

```bash
npm start          # Starta i dev-läge (Electron-fönster)
npm run build      # Bygg installationsfil → dist\Simpel Setup 2.0.0.exe
```

**Navigera till projektmappen i CMD:**
```
cd /d C:\Users\ba369\Desktop\Simpel
npm start
```
> Flaggan `/d` krävs för att byta enhet och mapp samtidigt (t.ex. från `H:\` till `C:\`).

> **OBS:** Kör alltid i **CMD** (inte PowerShell). PowerShell blockerar unsigned scripts (PSSecurityException).
> Öppna CMD via `Win + R` → `cmd`, navigera till projektmappen och kör `npm start`.
> Alternativt: kör `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` i PowerShell som administratör en gång för att lösa problemet permanent.

Öppna `Simpel.html` direkt i webbläsare fungerar också (localStorage-fallback).

---

## API-metoder (bridge ↔ main process)

| Metod | Beskrivning |
|---|---|
| `load()` | Läser data.json → returnerar AppState |
| `save(data)` | Skriver AppState till data.json |
| `get_data_path()` | Returnerar absolut sökväg till data.json |
| `notify(title, msg)` | Windows toast-notis |
| `export_dialog(data)` | Spara-dialog → skriver JSON-fil |
| `import_dialog()` | Öppna-dialog → läser JSON-fil |
| `ensure_ollama()` | Startar `ollama serve` om det inte redan körs |

---

## AI-funktioner (kräver Ollama + llama3.1:8b lokalt)

1. Naturligt språk → Uppgift (Ctrl+Space eller AI-knapp i toolbar)
2. Dela upp uppgift i deluppgifter (AI-knapp på uppgiftskortet)
3. Veckosammanfattning med streaming
4. Skrivhjälp i anteckningar (markera text → flytande toolbar)

Ollama startas automatiskt av `main.js` vid app-start via `child_process.spawn('ollama', ['serve'])`.
Frontend pollar `http://localhost:11434` var 30:e sekund (`checkOllama()`).

---

## Vyer i appen

| Vy | Funktion |
|---|---|
| Tasks | Huvudlista, prioritet (hög/medium/låg), deadline, projekt-taggar |
| Calendar | Kalendervy med uppgifter per dag |
| Kanban | Drag & drop: Att göra / Pågår / Klart |
| Notes | Anteckningar med AI-skrivhjälp |
| Completed | Avklarade uppgifter |

---

## Miljö & beroenden

- **Node.js** v24.14.0 / npm 11.9.0
- **Electron** ^34.0.0 (förkompilerad binär via npm — ingen lokal C/Rust-kompilering)
- **electron-builder** ^25.0.0 (paketering till NSIS-installer)
- **Python** + pywebview (legacy, app.pyw finns kvar men används inte aktivt)

### Viktig miljöbegränsning
Symantec Endpoint Protection (Heur.AdvML.B) blockerar Rust build-scripts i temp-mappen.
**Använd inte** `cargo build` / `cargo tauri dev` på denna maskin utan AV-undantag.
Tauri-filer finns i `src-tauri/` för framtida bruk på annan maskin.

---

## Filer i projektet

```
Simpel.html       Frontend (redigera CSS/JS/HTML här)
main.js           Electron backend (redigera API-handlers här)
preload.js        Context bridge (redigera om nya API-metoder läggs till)
package.json      Node.js-projekt + electron-builder-config
app.pyw           Legacy Python-backend (pywebview), används ej
src-tauri/        Tauri v2 Rust-projekt (ej byggt pga AV, sparat för framtiden)
Simpel.spec       PyInstaller-config (legacy)
Simpel.iss        Inno Setup-script (legacy)
install.bat       Python-installationsscript (legacy)
prd.md            Produktkravsdokument
README.txt        Snabbguide på svenska
```

---

## Designprinciper

- **Single-file frontend**: All CSS, HTML och JS i `Simpel.html`. Ingen bundler.
- **Lokal data**: Ingen server, ingen molntjänst, aldrig.
- **Tre-tier bridge**: Samma `Simpel.html` körs i Electron, Tauri och webbläsare.
- **Svenska UI**: Alla texter i gränssnittet är på svenska.
