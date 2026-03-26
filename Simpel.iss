; Inno Setup script for Simpel
; Requires: Inno Setup 6+ from https://jrsoftware.org/isinfo.php
; Build with: iscc Simpel.iss
; Or open in Inno Setup IDE and press Compile

#define AppName "Simpel"
#define AppVersion "1.0"
#define AppPublisher "Simpel"
#define AppExeName "Simpel.exe"

[Setup]
AppId={{8F3A2C1D-4B5E-4F6A-9D8C-1E2F3A4B5C6D}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=installer
OutputBaseFilename=Simpel_Setup_v{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=commandline

[Languages]
Name: "swedish"; MessagesFile: "compiler:Languages\Swedish.isl"

[Tasks]
Name: "desktopicon"; Description: "Skapa en genväg på skrivbordet"; GroupDescription: "Ytterligare ikoner:"; Flags: unchecked

[Files]
Source: "dist\{#AppName}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\Avinstallera {#AppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Starta {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Data folder is preserved on uninstall (user data in %APPDATA%\Simpel)
; To also remove data, uncomment the line below:
; Type: filesandordirs; Name: "{userappdata}\Simpel"
