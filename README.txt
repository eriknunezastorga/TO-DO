============================================
 SIMPEL – Lokal uppgiftshanterare
 Version 1.0
============================================

SNABBSTART
----------
1. Kör install.bat första gången (installerar beroenden + skapar genväg)
2. Dubbelklicka på "Simpel" på skrivbordet – eller kör starta.bat


FUNKTIONER
----------
• Uppgifter med prioritet (Hög/Medel/Låg), deadline, projekt, taggar
• Kalendervy – se uppgifter på rätt datum
• Kanban – dra och släpp mellan Att göra / Pågår / Klart
• Anteckningar – fria textnoter, konvertera till uppgift
• Påminnelser – Windows-notiser vid rätt tidpunkt
• Dela uppgifter via e-post
• Exportera/importera JSON (backup + delning)
• Exportera till Excel (.xlsx)
• AI-hjälp med Ollama (se nedan)


KORTKOMMANDON
-------------
N          Öppna formulär för ny uppgift
Ctrl+Space Skapa uppgift med AI (i snabbfältet)
Escape     Stäng öppen dialog


DATA
----
Din data sparas automatiskt i:
  %APPDATA%\Simpel\data.json

Filen är läsbar text (JSON) och kan öppnas i Anteckningar.
Gör en kopia av den för backup.


AI-FUNKTIONER (valfritt)
------------------------
Simpel stöder lokal AI via Ollama (ingen data lämnar din dator).

Installation (engångssteg):
1. Ladda ner Ollama: https://ollama.ai
2. Öppna en terminal och kör: ollama pull llama3.1:8b
3. Starta Simpel – AI-statusen i sidopanelen blir grön

AI-funktioner:
• Skapa uppgift från fri text (knapp "AI" i topbaren)
• Dela upp uppgift i deluppgifter ("Dela upp"-knapp)
• Veckosammanfattning (i Avklarade-vyn)
• Skrivhjälp i anteckningar (markera text)


BYGGA INSTALLER (.exe)
----------------------
Kräver PyInstaller och Inno Setup.

1. pip install pyinstaller
2. pyinstaller Simpel.spec
3. Kompilera Simpel.iss i Inno Setup → Simpel_Setup_v1.0.exe


AVINSTALLATION
--------------
1. Ta bort genvägen på skrivbordet
2. Ta bort mappen med Simpel-filerna
3. (Valfritt) Ta bort %APPDATA%\Simpel\ om du vill radera all data


SUPPORT
-------
Simpel är ett lokalt program – ingen support-kanal finns.
Appen är öppen källkod och kan modifieras fritt.

============================================
