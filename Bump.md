 Versionsuppdatering — arbetsflöde

  ⚠ VIKTIGT — Bumpa ALLTID package.json FÖRE du skapar taggen.

  Electron-builder läser versionen från package.json, inte från git-taggen.
  Om du t.ex. taggar v2.4.0 medan package.json fortfarande säger 2.3.1:
   - .exe-filen byggs som Simpel-Setup-2.3.1.exe (fel namn)
   - GitHub Actions publicerar till v2.3.1-releasen, inte v2.4.0
   - Inget v2.4.0-release skapas → ingen användare ser uppdateringen via electron-updater

  Symptom: GitHub Actions rapporterar "success" men ingen ny release dyker upp.
  Fix: radera taggen lokalt + på origin, bumpa package.json, commit, tagga om, pusha.

  ---

  Steg 1 — Bumpa versionen i package.json
  
  Ändra "version" till ny version (följer semver: MAJOR.MINOR.PATCH):

  "version": "2.4.0"

  Gör en commit med ändringen:
  git add package.json
  git commit -m "Bumpa version till 2.4.0"

  ---
  Steg 2 — Skapa och pusha en git-tagg

  git tag v2.4.0
  git push origin master
  git push origin v2.4.0

  Det är taggen (v2.4.0) som triggar GitHub Actions automatiskt.

  ---
  Steg 3 — GitHub Actions bygger och publicerar (automatiskt)

  När taggen pushas kör .github/workflows/release.yml automatiskt:

  1. Kör npm run release → electron-builder bygger Simpel-Setup-2.4.0.exe
  2. Laddar upp .exe-filen till GitHub Releases
  3. Genererar latest.yml (metadata för auto-updater)

  Du kan följa bygget på: https://github.com/eriknunezastorga/TO-DO/actions

  ---
  Steg 4 — Dina användare uppdaterar automatiskt

  Din app (main.js) kontrollerar GitHub Releases var 4:e timme via electron-updater. När en ny version finns:

  1. Laddas ner i bakgrunden
  2. Användaren får en notis: "Uppdatering klar — startar om för att installera"
  3. Vid nästa omstart installeras den nya versionen

  Användare kan också trycka på en knapp i appen för att kontrollera manuellt (update:check).

  ---
  Vilken version ska jag sätta?

  ┌───────────────────┬──────────────────────┬───────────────┐
  │  Typ av ändring   │       Exempel        │    Version    │
  ├───────────────────┼──────────────────────┼───────────────┤
  │ Bugfix, liten fix │ Fixade ett kraschar  │ 2.3.1 → 2.3.2 │
  ├───────────────────┼──────────────────────┼───────────────┤
  │ Ny funktion       │ Lade till kalendervy │ 2.3.1 → 2.4.0 │
  ├───────────────────┼──────────────────────┼───────────────┤
  │ Stor omskrivning  │ Bytte databas        │ 2.3.1 → 3.0.0 │
  └───────────────────┴──────────────────────┴───────────────┘

  ---
  Kortversion: bumpa package.json → commit → tagg med v → pusha taggen — resten sköter sig självt.