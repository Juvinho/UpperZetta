# Tauri Adapter Notes

A base atual em execucao desta workspace usa Electron para o shell desktop.

Este modulo `src/core/tauri` foi reservado para migracao incremental para Tauri v2 sem quebrar a arquitetura atual.

- UI/state/services continuam desacoplados do shell
- chamadas desktop estao concentradas em `window.zettaApi`
- migracao para Tauri pode manter a mesma API em um adapter compatível

Proxima etapa: criar `src-tauri` com comandos Rust equivalentes a terminal/git/openExternal e mapear para as mesmas interfaces.
