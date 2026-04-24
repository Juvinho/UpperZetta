; ═══════════════════════════════════════════════════════════════
; ZettaSource NSIS Custom Installer Script
; Injected via nsis.include in electron-builder.yml
; ═══════════════════════════════════════════════════════════════
; NOTE: Do NOT redefine MUI_ICON, MUI_UNICON, MUI_HEADERIMAGE_BITMAP,
; MUI_WELCOMEFINISHPAGE_BITMAP, or MUI_FINISHPAGE_RUN here.
; electron-builder defines these before including this file.
; MUI_FINISHPAGE_RUN is defined by the template's assistedInstaller.nsh.
; ═══════════════════════════════════════════════════════════════

; Load custom installer hooks (customInstall, customUnInstall, customInit, customHeader)
!include "${BUILD_RESOURCES_DIR}\assistedInstaller.nsh"

!include "MUI2.nsh"

; ─── MUI Settings ───────────────────────────────────────────────
!define MUI_ABORTWARNING

; ─── Welcome Page ───────────────────────────────────────────────
!define MUI_WELCOMEPAGE_TITLE "Bem-vindo ao ZettaSource 1.0"
!define MUI_WELCOMEPAGE_TEXT "Este assistente irá guiá-lo pela instalação do ZettaSource — a IDE oficial para a linguagem UpperZetta.$\n$\nFecha outros programas antes de continuar para evitar conflitos durante a instalação.$\n$\nClique em Próximo para continuar."

; ─── License Page ───────────────────────────────────────────────
!define MUI_LICENSEPAGE_RADIOBUTTONS
!define MUI_LICENSEPAGE_RADIOBUTTONS_TEXT_ACCEPT "Aceito os termos da licença"
!define MUI_LICENSEPAGE_RADIOBUTTONS_TEXT_DECLINE "Não aceito os termos da licença"

; ─── Directory Page ─────────────────────────────────────────────
!define MUI_DIRECTORYPAGE_TEXT_TOP "Selecione o diretório onde o ZettaSource será instalado."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Diretório de Destino"

; ─── Finish Page ────────────────────────────────────────────────
; MUI_FINISHPAGE_RUN is defined by electron-builder template — do not redefine
!define MUI_FINISHPAGE_TITLE "Instalação Concluída"
!define MUI_FINISHPAGE_TEXT "O ZettaSource foi instalado com sucesso no seu computador.$\n$\nClique em Concluir para fechar este assistente."
!define MUI_FINISHPAGE_RUN_TEXT "Abrir ZettaSource agora"
!define MUI_FINISHPAGE_LINK "Ver notas da versão no GitHub"
!define MUI_FINISHPAGE_LINK_LOCATION "https://github.com/zettasource/zettasource-releases/releases"
