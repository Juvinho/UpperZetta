# ZettaSource IDE

IDE oficial da linguagem **Upperzetta (Uzet)** com foco em fluxo real de desenvolvimento.

## Diagnostico breve da base atual

Estado observado antes desta etapa:

- Editor Monaco, explorer, abas basicas, compile/run simulados, diagnostics e quick-open ja existiam.
- Nao havia terminal interativo real no painel.
- Nao havia fluxo Git completo dentro da IDE.
- Nao havia integracao util com GitHub (token + PR).
- Abas ainda sem operacoes avancadas de contexto e reabertura.

## Plano curto de evolucao aplicado

1. Expandir camada desktop (IPC) para terminal interativo + comandos Git.
2. Refatorar estado global para suportar sessoes de terminal, Git, GitHub, toasts e tabs avancadas.
3. Implementar painel inferior completo: Terminal, Compiler Output, Diagnostics e Git.
4. Evoluir tabs com contexto, reorder e atalhos de produtividade.
5. Integrar GitHub REST para criar/listar PRs via token em memoria.
6. Atualizar UX e README com fluxos de teste reais.

## Stack atual

| Camada | Tecnologia |
|---|---|
| Desktop shell | Electron |
| UI | React 19 + TypeScript |
| Bundler | Vite 7 |
| Editor | Monaco Editor |
| Git/GitHub | Git local via IPC + GitHub REST API |

### Nota sobre Tauri v2

O runtime atual desta workspace esta em Electron. A estrutura foi preparada para migracao incremental para Tauri v2 sem quebrar UI/estado (ver pasta `src/core/tauri`).

## Como rodar

```bash
cd ZettaSource
npm install
npm run dev
```

Build:

```bash
npm run build
```

Pacote NSIS:

```bash
npm run dist:nsis
```

## Estrutura de pastas atualizada (principal)

```txt
ZettaSource/
  electron/
    main.ts
    preload.ts
  shared/
    contracts.ts
  src/
    components/
      editor/MonacoEditorPane.tsx
      explorer/SidebarExplorer.tsx
      layout/
        TopBar.tsx
        EditorTabs.tsx
        StatusBar.tsx
        ToastStack.tsx
      panel/
        BottomPanel.tsx
        TerminalPanel.tsx
        GitPanel.tsx
      quickopen/QuickOpenModal.tsx
      welcome/WelcomeScreen.tsx
    core/
      commands/commands.ts
      compiler/compilerService.ts
      filesystem/workspaceService.ts
      git/gitService.ts
      github/githubService.ts
      language/uzetLanguage.ts
      parser/uzetValidator.ts
      tauri/README.md
      terminal/terminalService.ts
      theme/themeSystem.ts
      uzet/uzetConsole.ts
    hooks/useKeyboardShortcuts.ts
    state/ideStore.tsx
    styles/global.css
    types/
      global.d.ts
      ide.ts
    App.tsx
```

## Recursos implementados nesta etapa

### 1) Terminal integrado / console interativo

- Sessao de terminal real por shell do sistema, com stdout/stderr em tempo real.
- Comando manual no painel.
- Multipla sessoes de terminal.
- Limpar buffer da sessao.
- Interromper processo da sessao.
- Painel interno com tabs: Terminal, Compiler Output, Diagnostics, Git.
- Uzet Console (stub MVP) para comandos curtos e feedback imediato.

Arquivos-chave:

- `electron/main.ts` (IPC terminal + streaming)
- `electron/preload.ts`
- `src/core/terminal/terminalService.ts`
- `src/components/panel/TerminalPanel.tsx`
- `src/core/uzet/uzetConsole.ts`

### 2) Abas profissionais

- Botao de fechar por aba.
- Indicador visual de alteracao nao salva.
- Aba ativa destacada.
- Menu de contexto na aba:
  - Close
  - Close Others
  - Close All
  - Close Tabs to the Right
- Reordenacao por drag-and-drop.
- Overflow horizontal mantido.
- Reabrir ultima aba fechada (Ctrl/Cmd+Shift+T).

Arquivos-chave:

- `src/components/layout/EditorTabs.tsx`
- `src/state/ideStore.tsx`
- `src/hooks/useKeyboardShortcuts.ts`

### 3) Git integrado

- Status de arquivos (modificados/novos/deletados) via `git status --porcelain`.
- Stage / Unstage por arquivo.
- Commit com mensagem.
- Branch atual e troca de branch.
- Pull / Push.
- Refresh status.
- Diff textual basico por arquivo.
- Remoto origin exibido e abertura no navegador.

Arquivos-chave:

- `electron/main.ts` (handlers git)
- `src/core/git/gitService.ts`
- `src/components/panel/GitPanel.tsx`

### 4) GitHub integrado (MVP util)

- Token pessoal via input (guardado apenas em memoria no estado da UI).
- Parse do remote origin para owner/repo quando possivel.
- Criacao real de Pull Request pela API GitHub.
- Listagem de PRs abertos.
- Abertura de URL de PR e remoto no navegador.

Arquivos-chave:

- `src/core/github/githubService.ts`
- `src/components/panel/GitPanel.tsx`
- `electron/main.ts` (`system:openExternal`)

## Atalhos

- `Ctrl/Cmd + S` salvar
- `Ctrl/Cmd + P` quick open
- `Ctrl/Cmd + B` compilar
- `Ctrl/Cmd + Enter` executar
- `Ctrl/Cmd + W` fechar aba ativa
- `Ctrl/Cmd + Shift + T` reabrir aba fechada
- `Ctrl/Cmd + \`` alternar painel terminal
- `Ctrl/Cmd + Shift + G` abrir painel Git

## Como testar cada fluxo

### Fluxo 1: edicao + terminal

1. Abrir pasta de projeto.
2. Abrir arquivo `.uz`.
3. Abrir painel Terminal.
4. Executar comando (ex.: `npm run build`).
5. Ver saida ao vivo.
6. Compilar e executar pela barra superior.

### Fluxo 2: multiplas abas

1. Abrir varios arquivos.
2. Fechar uma aba no `X`.
3. Botao direito numa aba para `Close Others` / `Close Tabs to the Right` / `Close All`.
4. Arrastar abas para reordenar.
5. `Ctrl/Cmd + Shift + T` para reabrir a ultima fechada.

### Fluxo 3: Git

1. Editar arquivo.
2. Abrir painel Git e clicar Refresh.
3. Stage arquivo.
4. Escrever commit message.
5. Commit.
6. Push.

### Fluxo 4: GitHub

1. No painel GitHub, informar token (PAT), owner, repo.
2. Preencher base/compare/title/body.
3. Clicar `Create Pull Request`.
4. Abrir URL retornada.
5. `List PRs` para listar abertos.

## Seguranca e limitacoes MVP

- Token GitHub fica apenas em memoria da sessao da UI.
- Nao ha persistencia em disco nem keychain nesta versao.
- Uzet Console e um stub util para UX; runtime oficial ainda nao plugado.
- Shell desktop atual e Electron; migracao para Tauri v2 ficou preparada arquiteturalmente.

## O que ja funciona

- Terminal interativo real, multi-sessao, stop/clear.
- Tabs avancadas com contexto, reorder e reabrir ultima.
- Painel Git completo para ciclo basico stage/commit/push/pull/branch.
- Integracao GitHub util para criar/listar PRs.
- Toasters e feedback visual de operacoes.
- Status bar mais informativa (branch e sessao terminal ativa).

## Proxima versao (preparado)

1. Adapter Tauri v2 com comandos Rust equivalentes ao IPC atual.
2. Persistencia segura de credenciais GitHub via keychain.
3. Terminal com PTY completo (renderizacao ANSI e resize) via backend dedicado.
4. Diff side-by-side e stage por hunk.
5. Runtime oficial Uzet no console (substituir stub).
6. Go to definition e autocomplete semantico via LSP.
