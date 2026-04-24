# ZettaSource Terminal (xterm.js) - Overview

Resumo curto do novo terminal integrado implementado em React + xterm.js.

Principais pontos
- UI: Painel inferior com abas, layout de panes (split), visual clean e dark.
- Render: `xterm.js` para renderização ANSI/VT100 real.
- Backend: usa a camada desktop atual (`window.zettaApi`) que fala com o Electron main.
- PTY: Se `node-pty` estiver instalado, o backend usará PTY para comportamento de terminal nativo; caso contrário, usa `child_process.spawn` como fallback.

Como funciona
- O renderer cria sessions via `window.zettaApi.createTerminalSession` (exposto pelo `preload.ts`).
- Eventos do backend chegam via `terminal:data` e são encaminhados ao estado da IDE.
- `TerminalView` (xterm wrapper) consome `terminalSessions[].buffer` e escreve os chunks no xterm.
- O input do usuário no xterm é enviado para o backend usando `window.zettaApi.writeTerminal` (envia keystrokes/raw data).

Como abrir um novo terminal
- Use o botão `+` nas abas do painel Terminal.
- Ou execute: `Ctrl/Cmd + \`` para abrir/fechar o painel (atalho já existente no app).

Como dividir (split)
- Clique no botão `Split` na barra do terminal — a versão atual cria uma visualização dividida do terminal ativo (compartilhando a mesma sessão).

Conectar a comandos reais
- O backend Electron já executa shells reais (resolve o shell do sistema). Para melhorar comportamento com aplicações TTY (ex: `top`, `vim`) instale `node-pty` como dependência e rebuild do Electron:

  npm install --save node-pty

- O código faz `require('node-pty')` de forma opcional; se presente, será usado automaticamente.

Observações e próximas etapas
- Search, copy/paste e recursos avançados estão preparados (xterm addons), mas alguns podem estar em MVP.
- Para migração a Tauri v2, implemente um adaptador que exponha APIs equivalentes (`createTerminal`, `writeTerminal`, `killTerminal`, `resizeTerminal`) via `@tauri-apps/api`.
