 Versionsuppdatering — arbetsflöde

  Sedan workflow-fixen (release.yml synkar package.json från taggen i CI)
  är git-taggen källan-till-sanning. .exe-installern byggs och publiceras
  ALLTID automatiskt med rätt version, oavsett vad package.json står på.

  Du behöver alltså inte längre bumpa package.json manuellt före tagg.
  (Du kan göra det ändå om du vill att master är i synk för tydlighet.)

  ---

  Steg 0 — Säkerställ att allt är committat och pushat

  Innan du taggar: kontrollera att working directory är ren OCH att
  origin/master är ikapp med din lokala master. Annars riskerar du att tagga
  en commit som inte innehåller alla dina senaste ändringar (CI checkar ut
  taggen från GitHub — inte din lokala disk).

    git status                    # Ska säga "nothing to commit, working tree clean"
    git log origin/master..HEAD   # Ska vara tomt (inga opushade commits)

  Om något ligger ocommittat:
    git add <filer>
    git commit -m "<beskrivande meddelande>"

  Om något ligger opushat:
    git push origin master

  Först när båda kommandona ovan är tysta — gå vidare till Steg 1.

  ---

  Steg 1 — Skapa och pusha en git-tagg

  git tag v2.4.1
  git push origin v2.4.1

  Det är taggen som triggar GitHub Actions automatiskt.

  ---
  Steg 2 — GitHub Actions bygger och publicerar (automatiskt)

  När taggen pushas kör .github/workflows/release.yml automatiskt:

  1. Synkar package.json version mot taggen (t.ex. v2.4.1 → 2.4.1)
  2. Kör npm run release → electron-builder bygger Simpel-Setup-2.4.1.exe
  3. Laddar upp .exe-filen till GitHub Releases
  4. Genererar latest.yml (metadata för auto-updater)

  Du kan följa bygget på: https://github.com/eriknunezastorga/TO-DO/actions

  ---
  Steg 3 — Dina användare uppdaterar automatiskt

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
  Kortversion: commit + push allt pågående → tagg med v → pusha taggen — resten sköter sig självt.
