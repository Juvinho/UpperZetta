; assistedInstaller.nsh
; ZettaSource IDE - Custom NSIS Installer Hooks
; Included by installer.nsh — defines macros called by electron-builder template

; ─────────────────────────────────────────────
!macro customHeader
  !system "echo Iniciando instalação ZettaSource..."
!macroend

; ─────────────────────────────────────────────
!macro customInit
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\ZettaSource" "UninstallString"
  StrCmp $R0 "" skipUninstall

  MessageBox MB_OKCANCEL|MB_ICONQUESTION \
    "ZettaSource já está instalado.$\n$\nClique OK para remover a versão anterior antes de instalar a nova." \
    IDOK doUninstall
  Abort

  doUninstall:
    ExecWait '$R0 /S _?=$INSTDIR'
    Delete "$R0"

  skipUninstall:
!macroend

; ─────────────────────────────────────────────
!macro customInstall
  ; ── Associações de arquivo UpperZetta ──────

  WriteRegStr HKCR ".uz" "" "UpperZetta.Source"
  WriteRegStr HKCR "UpperZetta.Source" "" "UpperZetta Source File"
  WriteRegStr HKCR "UpperZetta.Source\DefaultIcon" "" "$INSTDIR\resources\uz-file.ico,0"
  WriteRegStr HKCR "UpperZetta.Source\shell\open\command" "" '"$INSTDIR\ZettaSource.exe" "%1"'

  WriteRegStr HKCR ".uzs" "" "UpperZetta.Sealed"
  WriteRegStr HKCR "UpperZetta.Sealed" "" "UpperZetta Sealed File"
  WriteRegStr HKCR "UpperZetta.Sealed\DefaultIcon" "" "$INSTDIR\resources\uzs-file.ico,0"
  WriteRegStr HKCR "UpperZetta.Sealed\shell\open\command" "" '"$INSTDIR\ZettaSource.exe" "%1"'

  WriteRegStr HKCR ".uzb" "" "UpperZetta.Binary"
  WriteRegStr HKCR "UpperZetta.Binary" "" "UpperZetta Binary File"
  WriteRegStr HKCR "UpperZetta.Binary\DefaultIcon" "" "$INSTDIR\resources\uzb-file.ico,0"
  WriteRegStr HKCR "UpperZetta.Binary\shell\open\command" "" '"$INSTDIR\ZettaSource.exe" "%1"'
  WriteRegStr HKCR "UpperZetta.Binary\shell\disassemble\command" "" '"$INSTDIR\ZettaSource.exe" "--disasm" "%1"'
  WriteRegStr HKCR "UpperZetta.Binary\shell\disassemble" "" "Disassemblar com ZettaSource"

  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, p 0, p 0)'

  ; ── Atalho no menu de contexto do Explorer ──
  WriteRegStr HKCR "Directory\shell\ZettaSource" "" "Abrir com ZettaSource"
  WriteRegStr HKCR "Directory\shell\ZettaSource" "Icon" "$INSTDIR\ZettaSource.exe,0"
  WriteRegStr HKCR "Directory\shell\ZettaSource\command" "" '"$INSTDIR\ZettaSource.exe" "%V"'

  WriteRegStr HKCR "Directory\Background\shell\ZettaSource" "" "Abrir com ZettaSource"
  WriteRegStr HKCR "Directory\Background\shell\ZettaSource" "Icon" "$INSTDIR\ZettaSource.exe,0"
  WriteRegStr HKCR "Directory\Background\shell\ZettaSource\command" "" '"$INSTDIR\ZettaSource.exe" "%V"'

  ; ── Registro de versão e publisher ──
  WriteRegStr HKLM "Software\ZettaSource" "InstallPath" "$INSTDIR"
  WriteRegStr HKLM "Software\ZettaSource" "Version" "${VERSION}"
  WriteRegStr HKLM "Software\ZettaSource" "Publisher" "UpperZetta Project"
!macroend

; ─────────────────────────────────────────────
!macro customUnInstall
  DeleteRegKey HKCR ".uz"
  DeleteRegKey HKCR "UpperZetta.Source"
  DeleteRegKey HKCR ".uzs"
  DeleteRegKey HKCR "UpperZetta.Sealed"
  DeleteRegKey HKCR ".uzb"
  DeleteRegKey HKCR "UpperZetta.Binary"

  DeleteRegKey HKCR "Directory\shell\ZettaSource"
  DeleteRegKey HKCR "Directory\Background\shell\ZettaSource"

  DeleteRegKey HKLM "Software\ZettaSource"

  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, p 0, p 0)'

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Deseja remover também as configurações e preferências do usuário?" \
    IDNO skipUserData

  RMDir /r "$APPDATA\ZettaSource"

  skipUserData:
!macroend
