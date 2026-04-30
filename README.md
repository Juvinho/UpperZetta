<div align="center">

# UpperZetta

### Uma linguagem de programação hostil à engenharia reversa.

[![License](https://img.shields.io/badge/license-MIT-red?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.1-black?style=flat-square)](https://github.com/Juvinho/UpperZetta/releases/tag/v1.0.1)
[![UVLM](https://img.shields.io/badge/runtime-UVLM-red?style=flat-square)](#uvlm)
[![GLP](https://img.shields.io/badge/bytecode-GLP-black?style=flat-square)](#glp--bytecode)
[![Zetta.web](https://img.shields.io/badge/lib-zetta.web-red?style=flat-square)](#zettaweb)

*Também chamada de **Uzet**. Arquivo: `.uz` · Bytecode: `.uzb` · Selado: `.uzs`*

</div>

---

## Filosofia

UpperZetta não nasceu para competir com Python em produtividade ou com Rust em performance. Ela nasceu para ser **difícil de quebrar**.

A sintaxe mistura três referências deliberadas:

- **Java** — estrutura rígida, tipagem explícita, orientação a objetos.
- **Python** — clareza visual, sintaxe que cabe na cabeça.
- **Kotlin** — funções expressivas, retornos declarados.

O resultado é uma linguagem de leitura simples, mas que compila para um bytecode intencionalmente hostil e executa em um runtime impiedoso. **Sintaxe meiga, runtime sem piedade.**

## GLP — Bytecode

UpperZetta compila para o formato **GLP (Generative Logic Palindrome)** — um bytecode proprietário onde o arquivo `.uzb` armazena o código e seu espelho em ordem reversa na mesma estrutura. A integridade é verificada sem checksum externo: qualquer corrupção é detectada na leitura.

O objetivo não é impedir reversão — é tornar o custo do ataque maior que o valor do alvo.

## Download

**[→ ZettaSource IDE v1.0.1 (Releases)](https://github.com/Juvinho/UpperZetta/releases/tag/v1.0.1)**

| Arquivo | Descrição |
|---|---|
| `ZettaSource-Setup-1.0.1.exe` | Instalador — recomendado |
| `ZettaSource-1.0.1.exe` | Portátil, sem instalação |

**Requisitos:** Java 11+ no PATH · Windows 10/11 x64

## Sintaxe

```uz
package in exemplo.app;

e.const appName.str = "UpperZetta";

fun classifyAge(age.int) >> str {
    if (age < 12) { return "child"; }
    else if (age < 18) { return "teen"; }
    else if (age < 60) { return "adult"; }
    else { return "elder"; }
}

class.public User {
    let name.str;
    let age.int;
    let active.boolean;

    fun canEnter() >> boolean {
        if (active == true && age >= 18) {
            return true;
        } else {
            return false;
        }
    }
}

componente Home {
    let title.str = "Demo";

    fun render() {
        let age.int = 21;
        System.print(appName);
        System.print(classifyAge(age));

        let u.User = new User();
        u.name = "Felipe";
        u.age = age;
        u.active = true;
        System.print(u.name + ": " + u.canEnter());
    }
}
```

### Elementos da sintaxe

| Construção | Exemplo |
|---|---|
| Pacote | `package in ui.app;` |
| Constante global | `e.const nome.str = "valor";` |
| Variável | `let nome.tipo = valor;` |
| Função | `fun nome(param.tipo) >> retorno { ... }` |
| Classe pública | `class.public Nome { ... }` |
| Componente / entry point | `componente Home { fun render() { ... } }` |
| Instanciação | `let x.Classe = new Classe();` |
| Saída | `System.print(valor);` |

### Tipos

| Tipo | Exemplo |
|---|---|
| `int` | `let x.int = 42;` |
| `float` | `let pi.float = 3.14;` |
| `str` | `let s.str = "texto";` |
| `boolean` | `let ok.boolean = true;` |
| `array` | `let v.array = [1, 2, 3];` |

### Operadores

`+` `-` `*` `/` · `==` `!=` `<` `>` `<=` `>=` · `&&` `||`

> **Sem** `+=`, `-=`, `++`, `--`, `%`, `!`, `break`, `continue`, `switch`
>
> `&&` e `||` **não** usam curto-circuito — ambos os lados sempre avaliados.
> Use `if` aninhado para verificar nulidade antes de acessar campos.

## Zetta.web

`zetta.web` é a biblioteca de UI web da UpperZetta. Arquivos `.uz` que importam `zetta.web` são **transpilados para JavaScript** em vez de compilados para bytecode UVLM — zero dependências externas, apenas o runtime `zettaui.js`.

```
arquivo.uz  →  [transpilador ZettaUI]  →  arquivo.js + arquivo.html
```

### Imports

```uz
import zetta.web.ZettaUI;
import zetta.web.ZettaAnim;
```

O compilador detecta `import zetta.web` e ativa o modo transpilador automaticamente.

### Estrutura de componente

```uz
import zetta.web.ZettaUI;
import zetta.web.ZettaAnim;

package in ui.app;

componente MeuApp {
    let titulo.str = "UpperZetta";

    fun render() >> ZettaUI.dad {
        let root.ZettaUI.dad   = ZettaUI.dad("app");
        let h1.ZettaUI.child   = ZettaUI.child("h1", titulo);
        let btn.ZettaUI.child  = ZettaUI.child("button", "Clique");

        ZettaAnim.appear(h1);
        btn.onClick(fun handleClick());

        root.hug(h1);
        root.hug(btn);
        return root;
    }

    fun handleClick() {
        ZettaAnim.bounce(h1);
        btn.mood("shy");
        btn.sleep(300);
        btn.mood("happy");
    }
}
```

### API ZettaUI

| Método | Descrição |
|--------|-----------|
| `ZettaUI.dad(classe)` | Cria container `div` |
| `ZettaUI.child(tag, texto)` | Cria elemento filho (h1, p, button, input…) |
| `.hug(filho)` | Insere filho no nó pai, retorna `this` |
| `.onClick(fun metodo())` | Listener de clique |
| `.on(evento, fun metodo())` | Listener genérico |
| `.mood(nome)` | Aplica humor CSS (`happy` · `shy` · `sleepy`) |
| `.unmood(nome)` | Remove humor |
| `.sleep(ms)` | Suspende visualmente N ms (gera `async/await`) |
| `.wake()` | Cancela sleep em andamento |

### Animações ZettaAnim

| Método | Efeito |
|--------|--------|
| `ZettaAnim.appear(nó)` | FadeIn + sobe levemente |
| `ZettaAnim.leave(nó)` | FadeOut + desce levemente |
| `ZettaAnim.breath(nó)` | Pulso suave em loop |
| `ZettaAnim.bounce(nó)` | Quica uma vez |
| `ZettaAnim.blink(nó)` | Pisca uma vez |
| `ZettaAnim.apply(nó, nome, ms)` | Animação com duração customizada |

### Compilar para web

```bash
java -cp Main.jar Main src/App.uz
# Saída: src/App.js  +  src/App.html
```

> Documentação completa: [`docs/ZettaUI-Web.md`](docs/ZettaUI-Web.md)

---

## Extensões de arquivo

| Extensão | Descrição |
|---|---|
| `.uz` | Código-fonte UpperZetta (texto UTF-8) |
| `.uzb` | Bytecode GLP compilado (polimórfico, hostil) |
| `.uzs` | Arquivo **selado** — AES-256-GCM + Ofuscação de Entropia |

## UVLM

**UpperZetta Virtual Language Machine** — máquina virtual de pilha que executa bytecode `.uzb`, desenhada com uma filosofia de **Paranóia Ativa**. Diferente de VMs convencionais, a UVLM não tenta ajudar o desenvolvedor a debugar; ela tenta ativamente enganar quem tenta analisá-la.

```
arquivo.uz  →  compilador (shuffle + dead code)  →  arquivo.uzb  →  UVLM (polimorfismo + jitter)  →  execução
```

### CLI

```bash
# Usando alias 'uz' (ver documentação para configurar)
uz programa.uz              # compilar e executar
uz programa.uzb             # executar bytecode
uz build programa.uz        # compilar apenas → gera .uzb
uz programa.uzb --disasm    # disassembly do bytecode
uz seal arquivo.uz          # criptografar → .uzs
uz unseal arquivo.uzs       # restaurar com senha
uz key-show                 # ver DEVICE KEY desta máquina
uz key-export backup.key    # backup da DEVICE KEY
uz key-import backup.key    # restaurar DEVICE KEY
uz --version                # versão
```

**Sem alias:** substitua `uz` por `java -cp Main.jar Main`.

## ZettaSource

IDE oficial construída com Electron + CodeMirror 6.

### Recursos

- Syntax highlighting nativo para `.uz`
- Compilação one-click e painel de output UVLM
- Suporte completo a `.uz`, `.uzb`, `.uzs`
- Selagem/desselagem via menu ou atalho
- Gerenciamento de DEVICE KEY integrado

### Atalhos

| Atalho | Ação |
|---|---|
| `F5` | Compilar e executar |
| `Ctrl+Shift+B` | Compilar apenas (gera `.uzb`) |
| `Ctrl+F5` | Executar sem recompilar |
| `Ctrl+Shift+E` | Selar arquivo como `.uzs` |
| `Ctrl+O` | Abrir (`.uz`, `.uzb`, `.uzs`) |
| `Ctrl+/` | Comentar/descomentar linha |
| `Ctrl+Shift+P` | Command Palette |

A proteção da UpperZetta opera em quatro camadas de hostilidade crescente:

### 🛡️ Camada 1 — Bytecode Hostil
*   **Opcode Shuffling:** A tabela de instruções é embaralhada deterministicamente por compilação. Um opcode que significa `ADD` em um binário pode significar `PUSH` em outro.
*   **Dead Code Injection:** O compilador injeta instruções falsas (NOPs disfarçados) que confundem decompiladores mas são ignoradas pela UVLM.
*   **Chained Checksum:** A integridade é verificada em tempo real. Qualquer alteração no binário ativa mecanismos de defesa.

### 🛡️ Camada 2 — Runtime Paranóico
*   **Detecção de Debugger:** A UVLM monitora argumentos da JVM e detecta anomalias de timing causadas por breakpoints.
*   **Modo Mentira (Silent Corruption):** Se um debugger for detectado, a VM não para; ela entra em "Modo Mentira", corrompendo sutilmente cálculos matemáticos e strings para frustrar o atacante.
*   **Timing Jitter:** Injeção de delays microscópicos aleatórios para inviabilizar ataques de análise temporal.
*   **Polimorfismo em Memória:** O bytecode é armazenado transformado na RAM e restaurado apenas no instante da execução.

### 🛡️ Camada 3 — Selagem Brutal (.uzs)
*   **Autodestruição:** Arquivos `.uzs` permitem apenas 5 tentativas de senha. Após isso, o arquivo **se sobrescreve com zeros**.
*   **Entropy Masking:** O conteúdo cifrado é recodificado para parecer prosa (texto aleatório), ocultando a assinatura estatística de criptografia.
*   **Fake Headers:** Arquivos selados disfarçam-se de outros formatos (ex: JPEG) para enganar identificadores de arquivos.

### 🛡️ Camada 4 — Identidade de Máquina
*   **Hardware-tied Key:** A DEVICE KEY é derivada do hardware real (CPU ID + Motherboard UUID) via PBKDF2 (600k iterações).
*   **Recovery Phrase:** Sistema de backup estilo BIP39 (24 palavras) para restaurar acesso em caso de troca de hardware.

## Status

Versão atual: `1.0.1`

- Compilador `uz → uzb` funcional
- UVLM executando bytecode GLP
- ZettaSource IDE v1.0.1 — instalador para Windows x64/arm64
- Selagem AES-256 (`UZS1` e `UZS!`) implementada
- **`zetta.web` — transpilador ZettaUI para JS+HTML** (novo em v1.0.1)
- Documentação técnica completa em [`documentação/upperzetta1.o.md`](documentação/upperzetta1.o.md)

## Documentação

Referência técnica completa: **[`documentação/upperzetta1.o.md`](documentação/upperzetta1.o.md)**

Cobre: sintaxe completa · semântica · bytecode UVLM · formato GLP · CLI reference · ZettaSource IDE · exemplos · padrões · migração de outras linguagens.

## Build

```bat
:: Windows
build.bat
```

```bash
# Unix/macOS
mkdir -p out
javac -encoding UTF-8 -d out uvlm/src/crypto/DeviceKey.java uvlm/src/crypto/UZSCrypto.java
javac -encoding UTF-8 -d out -cp out *.java
javac -encoding UTF-8 -d out -cp out uvlm/src/Main.java
jar cfm Main.jar MANIFEST.MF -C out .
```

```bash
# IDE (requer Node.js)
cd zettasource-ide && npm install && npm run build
```

## Licença

MIT — ver [LICENSE](LICENSE).

---

<div align="center">

**UpperZetta** · construída para durar, desenhada para resistir.

</div>
