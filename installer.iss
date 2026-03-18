[Setup]
AppName=WooForgeTLS
AppVersion=1.0.0
AppPublisher=Alex Sanchez
DefaultDirName={autopf}\WooForgeTLS
DefaultGroupName=WooForgeTLS
OutputDir=installer_output
OutputBaseFilename=WooForgeTLS_Setup
SetupIconFile=assets\wooforgetls.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\WooForgeTLS.exe

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el escritorio"; GroupDescription: "Accesos directos:"; Flags: unchecked

[Files]
Source: "dist\WooForgeTLS\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\WooForgeTLS"; Filename: "{app}\WooForgeTLS.exe"; WorkingDir: "{app}"
Name: "{group}\Desinstalar WooForgeTLS"; Filename: "{uninstallexe}"
Name: "{autodesktop}\WooForgeTLS"; Filename: "{app}\WooForgeTLS.exe"; Tasks: desktopicon; WorkingDir: "{app}"

[Run]
Filename: "{app}\WooForgeTLS.exe"; Description: "Abrir WooForgeTLS"; Flags: nowait postinstall skipifsilent