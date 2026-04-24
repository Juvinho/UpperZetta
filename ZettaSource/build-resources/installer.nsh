; ZettaSource NSIS custom installer script
; Inclui associação de arquivos .uz, .up e .upz

!macro customInstall
  ; Associar extensão .uz
  WriteRegStr HKCU "Software\Classes\.uz" "" "ZettaSource.uzetFile"
  WriteRegStr HKCU "Software\Classes\ZettaSource.uzetFile" "" "Uzet Source File"
  WriteRegStr HKCU "Software\Classes\ZettaSource.uzetFile\DefaultIcon" "" "$INSTDIR\ZettaSource.exe,0"
  WriteRegStr HKCU "Software\Classes\ZettaSource.uzetFile\shell\open\command" "" '"$INSTDIR\ZettaSource.exe" "%1"'

  ; Associar extensão .up
  WriteRegStr HKCU "Software\Classes\.up" "" "ZettaSource.upFile"
  WriteRegStr HKCU "Software\Classes\ZettaSource.upFile" "" "Upperzetta File"
  WriteRegStr HKCU "Software\Classes\ZettaSource.upFile\DefaultIcon" "" "$INSTDIR\ZettaSource.exe,0"
  WriteRegStr HKCU "Software\Classes\ZettaSource.upFile\shell\open\command" "" '"$INSTDIR\ZettaSource.exe" "%1"'

  ; Associar extensão .upz
  WriteRegStr HKCU "Software\Classes\.upz" "" "ZettaSource.upzFile"
  WriteRegStr HKCU "Software\Classes\ZettaSource.upzFile" "" "Upperzetta Bundle"
  WriteRegStr HKCU "Software\Classes\ZettaSource.upzFile\DefaultIcon" "" "$INSTDIR\ZettaSource.exe,0"
  WriteRegStr HKCU "Software\Classes\ZettaSource.upzFile\shell\open\command" "" '"$INSTDIR\ZettaSource.exe" "%1"'

  ; Notificar Windows sobre mudanças de associação
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend

!macro customUninstall
  DeleteRegKey HKCU "Software\Classes\.uz"
  DeleteRegKey HKCU "Software\Classes\.up"
  DeleteRegKey HKCU "Software\Classes\.upz"
  DeleteRegKey HKCU "Software\Classes\ZettaSource.uzetFile"
  DeleteRegKey HKCU "Software\Classes\ZettaSource.upFile"
  DeleteRegKey HKCU "Software\Classes\ZettaSource.upzFile"
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend
