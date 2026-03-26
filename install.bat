@echo off
chcp 65001 >nul
echo ============================================
echo  Simpel – Installation
echo ============================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [FEL] Python hittades inte.
    echo Ladda ner Python 3.10+ fran https://www.python.org/downloads/
    echo Se till att kryssa i "Add Python to PATH" under installationen.
    pause
    exit /b 1
)

echo Python hittades. Installerar beroenden...
echo.
pip install pywebview plyer
if errorlevel 1 (
    echo [FEL] pip install misslyckades. Kontrollera din internetanslutning.
    pause
    exit /b 1
)

echo.
echo Skapar skrivbordsgenväg...
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

powershell -NoProfile -Command ^
  "$ws = New-Object -ComObject WScript.Shell; ^
   $s = $ws.CreateShortcut([System.IO.Path]::Combine($env:USERPROFILE,'Desktop','Simpel.lnk')); ^
   $s.TargetPath = 'pythonw'; ^
   $s.Arguments = '\"%SCRIPT_DIR%\app.pyw\"'; ^
   $s.WorkingDirectory = '%SCRIPT_DIR%'; ^
   $s.IconLocation = 'shell32.dll,44'; ^
   $s.Description = 'Simpel – Uppgiftshanterare'; ^
   $s.Save()"

if errorlevel 1 (
    echo [VARNING] Genvägen kunde inte skapas automatiskt.
    echo Du kan starta appen via starta.bat istallet.
) else (
    echo Genväg "Simpel" skapad pa skrivbordet.
)

echo.
echo ============================================
echo  Installation klar!
echo ============================================
echo.
echo Vill du starta Simpel nu? (J/N)
set /p STARTA=
if /i "%STARTA%"=="J" (
    start pythonw "%SCRIPT_DIR%\app.pyw"
)
pause
