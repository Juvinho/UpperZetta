<div align="center">

# UpperZetta

### Uma linguagem de programação hostil à engenharia reversa.

[![License](https://img.shields.io/badge/license-MIT-red?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-black?style=flat-square)](https://github.com/Juvinho/UpperZetta/releases/tag/v1.0.0)
[![UVLM](https://img.shields.io/badge/runtime-UVLM-red?style=flat-square)](#uvlm)
[![GLP](https://img.shields.io/badge/bytecode-GLP-black?style=flat-square)](#glp--bytecode)

*Também chamada de **Uzet**. Arquivo: `.uz` · Bytecode: `.uzb` · Selado: `.uzs`*

</div>

---

## Filosofia

UpperZetta não nasceu para competir com Python em produtividade ou com Rust em performance. Ela nasceu para ser **difícil de quebrar**.

A sintaxe mistura três referências deliberadas:

- **Java** — estrutura rígida, tipagem explícita, orientação a objetos.
- **Python** — clareza visual, sintaxe que cabe na cabeça.
- **Kotlin** — funções expressivas, retornos declarados.

O resultado é uma linguagem de leitura simples, mas que compila para um bytecode intencionalmente hostil à decompilação.

## GLP — Bytecode

UpperZetta compila para o formato **GLP (Generative Logic Palindrome)** — um bytecode proprietário onde o arquivo `.uzb` armazena o código e seu espelho em ordem reversa na mesma estrutura. A integridade é verificada sem checksum externo: qualquer corrupção é detectada na leitura.

O objetivo não é impedir reversão — é tornar o custo do ataque maior que o valor do alvo.

## Download

**[→ ZettaSource IDE v1.0.0 (Releases)](https://github.com/Juvinho/UpperZetta/releases/tag/v1.0.0)**

| Arquivo | Descrição |
|---|---|
| `ZettaSource-Installer-Windows-x64.exe` | Instalador NSIS — recomendado |
| `ZettaSource-Portable-Windows-x64.exe` | Portátil, sem instalação |

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

## Extensões de arquivo

| Extensão | Descrição |
|---|---|
| `.uz` | Código-fonte UpperZetta (texto UTF-8) |
| `.uzb` | Bytecode GLP compilado (binário, hostil à decompilação) |
| `.uzs` | Arquivo **selado** — criptografado com AES-256 + PBKDF2 |

## UVLM

**UpperZetta Virtual Language Machine** — máquina virtual de pilha que executa bytecode `.uzb`, análoga à JVM mas desenhada do zero com proteção em mente.

```
arquivo.uz  →  compilador  →  arquivo.uzb  →  UVLM  →  execução
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

## Segurança

A proteção da UpperZetta opera em três camadas:

**1. Bytecode GLP.** O `.uzb` usa instruction set proprietário com layout palindrômico. A estrutura dificulta análise estática e decompilação.

**2. Arquivos selados.** Dois modos:
- **CLI (`UZS1`):** AES-256-CBC + PBKDF2-SHA512 + DEVICE KEY — arquivo vinculado à máquina de origem.
- **IDE Export (`UZS!`):** AES-256-GCM + PBKDF2-SHA512 com 600.000 iterações — portátil entre máquinas com a senha correta.

Sem a senha (e a DEVICE KEY no modo `UZS1`), recuperação do fonte é inviável.

**3. DEVICE KEY.** Chave única gerada na primeira execução da UVLM. Arquivos selados via CLI exigem senha **e** a DEVICE KEY da máquina de origem. Faça backup antes de formatar:

```bash
uz key-export backup.uvlmkey
```

## Status

Versão atual: `1.0.0`

- Compilador `uz → uzb` funcional
- UVLM executando bytecode GLP
- ZettaSource IDE v1.0.0 — instalador NSIS para Windows x64/arm64
- Selagem AES-256 (`UZS1` e `UZS!`) implementada
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
