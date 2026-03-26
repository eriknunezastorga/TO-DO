# PRD – Simpel
**Product Requirements Document**
Version 1.0 | Status: Ready for development

---

## 1. Översikt

### 1.1 Produktbeskrivning
Simpel är en lokal, säker och lättanvänd uppgiftshanterare för Windows. Appen körs helt lokalt på användarens dator — ingen molnsynkronisering, inga konton, ingen internetuppkoppling krävs. All data sparas i en JSON-fil på användarens hårddisk.

### 1.2 Problembeskrivning
Professionella användare behöver hantera uppgifter, projekt och lösa anteckningar dagligen men är obekväma med molnbaserade verktyg när känslig information hanteras. Befintliga alternativ är antingen för komplexa, kräver prenumerationer eller synkroniserar data mot externa servrar.

### 1.3 Målgrupp
Enskilda yrkesverksamma och mindre team som:
- Arbetar med känslig information
- Vill ha full kontroll över sin data
- Behöver ett enkelt verktyg utan inlärningströskel
- Delar uppgifter med kollegor via e-post snarare än delade plattformar

### 1.4 Mål
- Starta appen med ett dubbelklick — ingen teknisk setup för slutanvändaren
- Alla uppgifter, anteckningar och projekt sparas permanent lokalt
- Modern, professionell design som känns som ett riktigt program
- Dela uppgifter med kollegor via e-post och JSON/Excel-export

---

## 2. Teknisk stack

| Komponent | Val | Motivering |
|---|---|---|
| Frontend | HTML5 + Vanilla JS + CSS3 | Portabelt, inga byggsteg, fungerar i pywebview |
| Desktop-wrapper | Python + pywebview | Skapar ett native Windows-fönster utan Electron |
| Datalagring | JSON-fil på disk | Transparent, backupbar, läsbar |
| Notifikationer | plyer (Python) + Web Notifications API | Windows-notiser utan extra tjänster |
| Excel-export | SheetJS (CDN) | Klientbaserad XLSX-generering |
| Typsnitt | Google Fonts – Outfit | Laddas vid uppstart, graceful fallback till system-ui |
| Installationsformat | ZIP → install.bat | Inga administratörsrättigheter krävs |

### 2.1 Arkitektur

```
Simpel/
├── Simpel.html        # Hela frontend-applikationen (single-file)
├── app.pyw            # Python-launcher med pywebview och fil-API
├── data.json          # Användardata (skapas automatiskt vid första körning)
├── install.bat        # Installationsskript för Windows
├── starta.bat         # Reservstart utan genväg
└── README.txt         # Snabbguide på svenska
```

### 2.2 Dataflöde

```
Simpel.html (JS) ←→ window.pywebview.api ←→ app.pyw ←→ data.json
```

- Allt state hålls i JS-minnet under sessionen
- `save()` anropas med debounce (500ms) efter varje ändring
- `load()` anropas vid appstart via `pywebviewready`-eventet
- Fallback till `localStorage` om appen öppnas direkt i webbläsare

---

## 3. Funktionskrav

### 3.1 Uppgiftshantering

#### Skapa uppgift
- Snabbfält överst på sidan: skriv titel + välj prioritet + tryck Enter
- Fullständigt formulär via "+ Ny uppgift"-knapp (modal)
- Alla fält i formuläret är valfria
- Genväg: tangent `N` öppnar nytt uppgiftsformulär

#### Uppgiftsfält
| Fält | Typ | Obligatoriskt | Beskrivning |
|---|---|---|---|
| Titel | text | Nej | Default: "(Namnlös uppgift)" |
| Anteckningar | textarea | Nej | Fritt textfält, visas under uppgiften |
| Projekt | select | Nej | Koppla till ett projekt |
| Återkommande | select | Nej | Ingen / Dagligen / Veckovis / Månadsvis |
| Deadline | date | Nej | Visar varning vid försenad/nära deadline |
| Taggar | text | Nej | Kommaseparerade, visas som chips |
| Prioritet | radio | Nej | Hög / Medel / Låg |
| Påminnelse | select | Nej | Se sektion 3.5 |

#### Redigera uppgift
- Klick på "Redigera"-knapp öppnar formuläret förifyllt med befintlig data

#### Ta bort uppgift
- Klick på "Ta bort"-knapp visar `confirm()`-dialog innan borttagning

#### Slutföra uppgift
- Checkbox till vänster om titeln
- Återkommande uppgifter: ny instans skapas automatiskt med nästa deadline

#### Prioritetssortering
- Uppgifter sorteras automatiskt: Hög → Medel → Låg
- Manuell sortering per deadline via "Sortera datum"-knapp (växlar asc/desc)

#### Synliga åtgärdsknappar
- Tre knappar visas alltid på varje uppgiftskort: **Redigera**, **Dela**, **Ta bort**
- Visuell hover-effekt per knappfunktion (blå/grön/röd)

### 3.2 Projekthantering

- Skapa projekt med namn och färg (10 förinställda färger)
- Projekt visas i sidopanelen med antal aktiva uppgifter
- Klick på projekt filtrerar uppgiftslistan
- Uppgifter kopplas till projekt via select-fält

### 3.3 Vyer

#### Uppgiftsvy (lista)
- Standardvy
- Uppgifter renderas som individuella kort med tydlig visuell separation
- Vänsterbård i prioritetsfärg (röd/gul/grön)
- Skugga och kantlinje per kort
- Statistikrad: Aktiva / Idag / Försenade / Avklarade
- Filterknappar: Alla / Hög prioritet / Medel / Låg

#### Kalendervy
- Månadskalender med navigation (föregående/nästa månad)
- Uppgifter med deadline visas som färgade chips på rätt dag
- Klick på dag öppnar nytt uppgiftsformulär med datum förifyllt
- Klick på uppgiftschip öppnar redigera-formuläret

#### Anteckningsvy
- Lösa anteckningar utan koppling till uppgifter
- Varje anteckning är ett fritt textarea-kort
- Autospar vid blur
- Knapp "→ Gör till uppgift" kopierar anteckningstexten till uppgiftsformuläret
- Visas med gult bakgrundstema (skiljer sig visuellt från uppgifter)

#### Kanban-vy
- Tre kolumner: **Att göra** | **Pågår** | **Klart**
- Dra och släpp-funktionalitet mellan kolumner
- Dragning till "Klart" markerar uppgiften som avklarad
- Uppgifter sorteras efter prioritet inom varje kolumn

#### Avklarade uppgifter
- Separat vy för slutförda uppgifter
- Nedtonad visning (opacity 0.5) med genomstruken titel

### 3.4 Sökning
- Sökfält i topbaren filtrerar i realtid
- Söker i: titel, anteckningar, taggar
- Fungerar i alla vyer utom kalender och kanban

### 3.5 Påminnelser

#### Windows-notiser (primär metod)
- Kräver att användaren klickar "Aktivera notiser" första gången (browser permissions)
- Appen kontrollerar påminnelser var 60:e sekund via `setInterval`
- Python-sidan använder `plyer.notification.notify()` som fallback
- Påminnelse triggas när nuvarande tid matchar beräknad påminnelsetid (±60 sek)

#### Påminnelsealternativ per uppgift
| Val | Logik |
|---|---|
| Ingen | Ingen påminnelse |
| På dagen 09:00 | Deadline-datum kl 09:00 |
| 1 dag innan | Deadline - 1 dag, kl 09:00 |
| 2 dagar innan | Deadline - 2 dagar, kl 09:00 |
| 1 vecka innan | Deadline - 7 dagar, kl 09:00 |
| Anpassad | Specifikt datum + tid |

#### E-postpåminnelse (sekundär metod)
- Valfritt e-postfält i uppgiftsformuläret
- Vid sparande öppnas `mailto:`-länk med förifyllt ämne och brödtext
- Innehåller: uppgiftstitel, deadline, anteckningar, prioritet
- Användaren skickar manuellt från sin e-postklient

### 3.6 Dela uppgifter

#### Dela enskild uppgift via e-post
- "Dela"-knapp på varje uppgiftskort
- Öppnar `mailto:`-länk med:
  - Ämne: "Uppgift: [titel]"
  - Brödtext: titel, prioritet, deadline, projekt, taggar, anteckningar

#### Export/import

| Format | Funktion |
|---|---|
| JSON-export | Exporterar hela `state`-objektet. Används för backup och delning med kollegor. |
| JSON-import | Mergar importerad data (inga dubletter baserat på ID). |
| Excel-export | Genererar `.xlsx` via SheetJS med fyra flikar: Uppgifter, Anteckningar, Projekt, Statistik. |

**Excel-flikar:**
- **Uppgifter**: Alla fält inklusive prioritet, status, deadline, taggar, anteckningar, påminnelse
- **Anteckningar**: Text + skapad-datum
- **Projekt**: Namn, aktiva uppgifter, avklarade, totalt
- **Statistik**: Nyckeltal och framstegsprocent

---

## 4. Datamodell

### Task
```typescript
interface Task {
  id:            string;       // Date.now().toString()
  title:         string;
  notes:         string;
  projectId:     string | null;
  recurring:     'none' | 'daily' | 'weekly' | 'monthly';
  deadline:      string | null;  // ISO date: "YYYY-MM-DD"
  tags:          string[];
  priority:      'high' | 'medium' | 'low';
  kanbanCol:     'todo' | 'doing' | 'done';
  completed:     boolean;
  completedAt:   string | null;  // ISO datetime
  reminder:      'none' | 'onday' | '1day' | '2days' | '1week' | 'custom';
  reminderTime:  string;         // "HH:MM", default "09:00"
  reminderDate:  string | null;  // ISO date, only for custom
  reminderEmail: string | null;
  createdAt:     string;         // ISO datetime
  _notifFired?:  boolean;        // Runtime only, not persisted
}
```

### Project
```typescript
interface Project {
  id:    string;
  name:  string;
  color: string;  // Hex color
}
```

### Note
```typescript
interface Note {
  id:        string;
  text:      string;
  createdAt: string;   // ISO datetime
  updatedAt?: string;  // ISO datetime
}
```

### AppState (data.json)
```typescript
interface AppState {
  tasks:    Task[];
  projects: Project[];
  notes:    Note[];
}
```

---

## 5. Python API (pywebview)

Följande metoder exponeras via `js_api` i pywebview och anropas från JS som `await window.pywebview.api.[method]()`:

| Metod | Parametrar | Returnerar | Beskrivning |
|---|---|---|---|
| `load()` | — | `AppState` | Läser data.json. Returnerar tom state om filen saknas. |
| `save(data)` | `AppState` | `boolean` | Skriver data.json. |
| `get_data_path()` | — | `string` | Absolut sökväg till data.json. |
| `notify(title, message)` | `str, str` | `void` | Windows-notis via plyer. |
| `export_dialog(data)` | `AppState` | `{ok, path?, error?}` | Öppnar Spara-dialog, skriver JSON. |
| `import_dialog()` | — | `{ok, data?, error?}` | Öppnar Öppna-dialog, läser JSON. |

---

## 6. Design

### 6.1 Visuell profil
- **Typsnitt**: Outfit (Google Fonts), fallback: system-ui
- **Stil**: Professionell och ren — inga emojis i navigering, inga lekfulla element
- **Tema**: Ljust, vit yta (`#FFFFFF`) mot grå bakgrund (`#F2F3F7`)

### 6.2 Färgpalett

| Variabel | Hex | Användning |
|---|---|---|
| `--sb-bg` | `#3B4F7C` | Sidopanel bakgrund |
| `--accent` | `#2563EB` | Knappar, aktiva element, länkar |
| `--accent-lt` | `#EEF3FD` | Hover-bakgrund för accent-element |
| `--high` | `#DC2626` | Hög prioritet, försenade uppgifter |
| `--med` | `#D97706` | Medel prioritet, påminnelser |
| `--low` | `#16A34A` | Låg prioritet |
| `--note-bg` | `#FEFCE8` | Anteckningskort bakgrund |
| `--border` | `#E0E2EB` | Kanter och skiljelinjer |

### 6.3 Uppgiftskort
- Eget kort per uppgift (inte en lista med dividers)
- `gap: 10px` mellan kort
- `box-shadow` för djup
- Vänsterbård i prioritetsfärg (4px solid)
- Avrundade hörn: `border-radius: 10px`

### 6.4 Logotyp
- Ikon: blå rektangel (`#2563EB`) med vit SVG-bock
- Text: "Simpel" i Outfit 700, vit

### 6.5 Sidopanel
- Bakgrund: `#3B4F7C` (mellanblå, inte svart)
- Aktiv nav-item: `rgba(255,255,255,.14)` bakgrund + vit vänsterbård
- Text muted: `#B8C8E8`

---

## 7. Installationsflöde (Windows)

### Steg 1 — Förberedelse (användaren)
1. Ladda ner `Simpel_vX.zip`
2. Extrahera till valfri mapp (t.ex. `C:\Program\Simpel`)

### Steg 2 — install.bat
Skriptet gör följande automatiskt:
1. Kontrollerar om Python finns (`python --version`)
2. Om Python saknas: laddar ner `python-3.12.4-amd64.exe` och installerar tyst
3. Kör `pip install pywebview plyer`
4. Skapar `Simpel.lnk` på skrivbordet via PowerShell + WScript.Shell
5. Erbjuder att starta appen direkt

### Steg 3 — Daglig användning
- Dubbelklick på genvägen "Simpel" på skrivbordet
- Alternativt: dubbelklick på `starta.bat`

### Avinstallation
1. Ta bort genvägen på skrivbordet
2. Ta bort installationsmappen
3. (Valfritt) Avinstallera Python via Windows Inställningar

---

## 8. Icke-funktionella krav

### Prestanda
- Appstart: under 3 sekunder på modern hårdvara
- Spara-operation: under 100ms (debounced 500ms)
- Renderingstid för 500+ uppgifter: under 200ms

### Säkerhet
- Ingen nätverkstrafik utom Google Fonts och SheetJS CDN vid uppstart
- All data stannar på användarens dator
- Inga cookies, inga trackers, inga analytics
- `confirm()`-dialog krävs vid borttagning av uppgift

### Tillgänglighet
- Minsta fönsterstorlek: 920×640 px
- Fönstret är resizable
- Kortkommandon: `N` (ny uppgift), `Escape` (stäng modal)
- Alla knappar har synlig hover-state

### Kompatibilitet
- Windows 10 och Windows 11
- Python 3.10+
- pywebview kräver Microsoft Edge WebView2 (ingår i Windows 11, automatisk installation i Windows 10)

---

## 9. Kortkommandon

| Tangent | Åtgärd |
|---|---|
| `N` | Öppna "Ny uppgift"-formuläret |
| `Enter` | Spara snabbuppgift i snabbfältet |
| `Escape` | Stäng öppen modal |

---

## 10. Kända begränsningar och beslut

| Begränsning | Beslut |
|---|---|
| Ingen offline-synkronisering | Medvetet val — lokal data är kärnvärdet |
| E-postpåminnelser öppnar lokalt e-postprogram | Kräver att användaren har Outlook/Thunderbird etc. konfigurerat |
| Windows-notiser kräver att appen är öppen | Dokumenteras tydligt i påminnelsevyn |
| Excel-export via SheetJS CDN | Kräver internetanslutning vid export. Alternativ: bunta SheetJS lokalt |
| Ingen mobilapp | Utanför scope för v1 |
| Ingen lösenordsskydd | Utanför scope för v1 — rekommendation: kryptera data.json manuellt |

---

## 11. Framtida versioner (utanför v1 scope)

- Lösenordsskydd / kryptering av data.json
- Mörkt läge
- Bulk-redigering av uppgifter
- Offline-first synk via delad nätverksmapp
- Påminnelser via Windows Task Scheduler (körs även när appen är stängd)
- Stöd för macOS och Linux

---

## 12. Godkännandekriterier (Definition of Done)

- [ ] Appen startar med dubbelklick utan felmeddelanden
- [ ] Data kvarstår efter att appen stängs och öppnas igen
- [ ] Alla uppgiftsfält är valfria — tom uppgift kan sparas
- [ ] Påminnelse triggas som Windows-notis vid rätt tidpunkt
- [ ] "Dela"-knapp öppnar e-postklient med korrekt förifyllt innehåll
- [ ] Excel-export genererar giltig `.xlsx`-fil med fyra flikar
- [ ] Kalendervy visar uppgifter på korrekta datum
- [ ] Anteckning kan konverteras till uppgift
- [ ] Kanban: dra och släpp fungerar, status uppdateras korrekt
- [ ] `install.bat` installerar och skapar genväg utan administratörsrättigheter
- [ ] Appen fungerar utan internetanslutning (undantaget typsnitt och SheetJS)

---

## 13. Installer — PyInstaller + Inno Setup

### 13.1 Motivering
Simpel levereras som en riktig Windows-installer (`.exe`) istället för ZIP + batch-fil. Detta ger:
- Installations-wizard med välkomstskärm, välj mapp, skrivbordsgenväg
- Registreras i Windows "Lägg till/ta bort program" → ren avinstallation
- Start-meny-genväg skapas automatiskt
- Inga manuella steg — användaren installerar som vilket program som helst
- Möjlighet att signera `.exe` med kodsigneringscertifikat för att undvika SmartScreen-varningar

### 13.2 Byggprocess

```
Källkod (Python + HTML)
    ↓
PyInstaller → dist/Simpel/  (mapp med .exe + alla beroenden)
    ↓
Inno Setup  → Simpel_Setup_v1.0.exe  (single-file installer)
```

**Steg 1 — PyInstaller**
```bash
pip install pyinstaller
pyinstaller --noconsole --onedir --name Simpel app.pyw
```
- `--noconsole` döljer terminalfönstret
- `--onedir` skapar en mapp (snabbare start än `--onefile`)
- Inkludera `Simpel.html` som data-fil i spec-filen

**PyInstaller spec-fil (Simpel.spec):**
```python
a = Analysis(
    ['app.pyw'],
    datas=[('Simpel.html', '.')],
    hiddenimports=['webview', 'plyer.platforms.win.notification'],
)
```

**Steg 2 — Inno Setup script (Simpel.iss):**
```ini
[Setup]
AppName=Simpel
AppVersion=1.0
AppPublisher=Ditt Namn
DefaultDirName={autopf}\Simpel
DefaultGroupName=Simpel
OutputBaseFilename=Simpel_Setup_v1.0
Compression=lzma2
SolidCompression=yes

[Files]
Source: "dist\Simpel\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\Simpel";     Filename: "{app}\Simpel.exe"
Name: "{commondesktop}\Simpel"; Filename: "{app}\Simpel.exe"

[Run]
Filename: "{app}\Simpel.exe"; Description: "Starta Simpel"; Flags: postinstall nowait
```

### 13.3 Datalagring vid installerad version
- `data.json` sparas i `%APPDATA%\Simpel\data.json` (inte i programmappen)
- Programfiler i `C:\Program Files\Simpel\` (skrivskyddad)
- Data-mappen skapas automatiskt vid första start
- Fördel: data överlever en ominstallation

### 13.4 Avinstallation
- Via Windows Inställningar → Appar → Simpel → Avinstallera
- Inno Setup genererar automatiskt en avinstallerare
- `data.json` sparas kvar (användaren väljer själv om den ska tas bort)

---

## 14. Lokal AI — Ollama + Llama 3.1 8B

### 14.1 Arkitektur

```
Simpel.html (JS)
    ↓  fetch("http://localhost:11434/api/generate")
Ollama (lokal server)
    ↓
Llama 3.1 8B (lokal modell)
    ↑
Ingen data lämnar datorn
```

Ollama körs som en bakgrundstjänst på Windows och exponerar ett REST API på `localhost:11434`. Simpel anropar detta API direkt från JavaScript med vanlig `fetch()`. Inget extra Python-bibliotek behövs.

### 14.2 Modellval

| Modell | RAM-krav | Hastighet | Kvalitet svenska | Rekommendation |
|---|---|---|---|---|
| Llama 3.1 8B | ~8GB VRAM / 12GB RAM | ~2–4 sek | Bra | ✅ **Primärt val** |
| Llama 3.1 70B | ~40GB RAM | ~15–30 sek | Utmärkt | Reserv om 64GB+ RAM |
| Mistral 7B | ~8GB | ~2–3 sek | God | Alternativ |
| Phi-3 Mini | ~4GB | ~1 sek | Godkänd | Budget-alternativ |

**Primärt val: `llama3.1:8b`** — bästa balansen mellan hastighet, kvalitet och minneskrav för 16GB RAM + GPU.

### 14.3 Installation av Ollama (användaren gör detta en gång)

Simpel kontrollerar vid start om Ollama är installerat. Om det saknas visas en informationspanel med länk och instruktioner.

```bash
# Användaren installerar Ollama från ollama.ai
# Sedan laddar de ner modellen:
ollama pull llama3.1:8b
```

Alternativt kan install.bat / Inno Setup-installern automatisera detta.

### 14.4 AI-funktioner att implementera

#### Funktion 1 — Naturligt språk → Uppgift
**Trigger:** Knapp "✨ Skapa med AI" bredvid snabbfältet, eller Ctrl+Space i snabbfältet.
**Flöde:**
1. Användaren skriver fritt: *"Skicka offerten till Kund AB innan torsdag, viktig"*
2. Simpel skickar text till Ollama med strukturerat prompt
3. AI returnerar JSON med `title`, `deadline`, `priority`, `tags`, `notes`
4. Uppgiftsformuläret öppnas förifyllt — användaren bekräftar eller justerar

**Prompt-mall:**
```
Du är en assistent som extraherar uppgiftsinformation från fri text.
Svara ENDAST med giltig JSON, inget annat.
Schema: {"title": string, "deadline": "YYYY-MM-DD eller null", "priority": "high|medium|low", "tags": string[], "notes": string}
Text: "{input}"
Datum idag: {today}
```

#### Funktion 2 — Dela upp uppgift i deluppgifter
**Trigger:** Knapp "Dela upp med AI" på en uppgift (visas i redigera-vyn).
**Flöde:**
1. Skickar uppgiftens titel + anteckningar till Ollama
2. AI returnerar lista med 3–6 konkreta deluppgifter
3. Användaren ser en preview och bockar av vilka som ska läggas till
4. Valda deluppgifter skapas med koppling till ursprungsuppgiftens projekt

**Prompt-mall:**
```
Dela upp följande uppgift i 3-6 konkreta, genomförbara deluppgifter.
Svara ENDAST med en JSON-array av strängar.
Uppgift: "{title}"
Beskrivning: "{notes}"
```

#### Funktion 3 — Veckosammanfattning
**Trigger:** Knapp "AI-sammanfattning" i avklarade-vyn eller sidopanelen.
**Flöde:**
1. Samlar uppgifter från senaste 7 dagarna (avklarade + aktiva + försenade)
2. Skickar strukturerad data till Ollama
3. AI returnerar en 3–5 meningar lång svensk text
4. Visas i en modal — kan kopieras eller skickas via e-post

**Prompt-mall:**
```
Skriv en professionell veckosammanfattning på svenska baserat på följande uppgiftsdata.
Max 5 meningar. Inkludera: vad avklarades, vad är försenat, vad är prioriterat.
Data: {json_summary}
```

#### Funktion 4 — Skrivhjälp i anteckningsfältet
**Trigger:** Flytande verktygsfält visas när text är markerad i en anteckning.
**Alternativ:** Förbättra / Förkorta / Expandera / Gör till punktlista
**Flöde:**
1. Markerad text + valt alternativ skickas till Ollama
2. AI-svar streamas in och ersätter markerad text
3. Undo-funktion (Ctrl+Z) återställer originaltext

### 14.5 UI-integration

```
Simpel-gränssnittet
├── Snabbfält          → [✨ Skapa med AI]-knapp
├── Uppgiftskort       → [Dela upp]-knapp i redigera-läge
├── Sidopanel          → [Veckorapport]-knapp under export-sektionen
├── Anteckningskort    → Flytande AI-verktygsfält vid textmarkering
└── Statusindikator    → Liten prick i topbaren: grön=Ollama aktiv, grå=ej tillgänglig
```

### 14.6 Felhantering och graceful degradation

| Scenario | Hantering |
|---|---|
| Ollama ej installerat | Informationspanel med installationslänk. AI-knappar visas men är nedtonade. |
| Ollama installerat men ej igång | Simpel försöker starta Ollama automatiskt via `subprocess`. |
| Modell ej nedladdad | Uppmaning att köra `ollama pull llama3.1:8b` |
| Timeout (>15 sek) | Avbryt + visa "AI-svar tog för lång tid" |
| Ogiltig JSON från AI | Fallback: visa råsvar i en modal istället |

### 14.7 Starta Ollama automatiskt (app.pyw)

```python
import subprocess
import requests

def ensure_ollama():
    """Kontrollera om Ollama körs, starta annars."""
    try:
        requests.get("http://localhost:11434", timeout=2)
        return True  # Redan igång
    except Exception:
        try:
            subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(2)
            return True
        except FileNotFoundError:
            return False  # Ollama ej installerat
```

### 14.8 Streaming-svar

För bättre användarupplevelse bör AI-svar streamas (token för token) istället för att vänta på komplett svar. Ollama stöder streaming via `"stream": true` i API-anropet.

```javascript
async function streamOllama(prompt, onToken) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.1:8b",
      prompt: prompt,
      stream: true
    })
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      const data = JSON.parse(line);
      if (data.response) onToken(data.response);
    }
  }
}
```

### 14.9 Integritet och säkerhet
- All AI-bearbetning sker lokalt — inga anrop till externa API:er
- Ollama och modellen körs på användarens dator
- Ingen data loggas eller sparas av Ollama utöver konversationshistorik i minnet
- Känslig text i uppgifter och anteckningar lämnar aldrig datorn