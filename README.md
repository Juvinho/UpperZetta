<div align="center">

# UpperZetta

### Uma linguagem de programação hostil à engenharia reversa.

[![License](https://img.shields.io/badge/license-MIT-red?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-black?style=flat-square)](https://github.com)
[![UVLM](https://img.shields.io/badge/runtime-UVLM-red?style=flat-square)](#uvlm)
[![GLP](https://img.shields.io/badge/GLP-member-black?style=flat-square)](#glp)

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

## GLP — Grupo de Linguagens Palíndromas

UpperZetta faz parte do **GLP**, um ecossistema de linguagens onde o código compilado se torna progressivamente **mais difícil de decompor e rastrear** até a fonte original. Cada camada de build adiciona ofuscação, tornando engenharia reversa extremamente trabalhosa por design.

O objetivo não é impedir — é tornar o custo do ataque maior que o valor do alvo.

## Sintaxe

```uz
package in exemplo.app;

e.const appName.str = "UpperZetta";

fun classifyAge(age.int) >> str {
    if (age < 12) {
        return "child";
    } else if (age < 18) {
        return "teen";
    } else if (age < 60) {
        return "adult";
    } else {
        return "elder";
    }
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
    fun render() {
        let user.int = 21;
        System.print(appName);
        System.print(classifyAge(user));
    }
}
```

### Elementos da sintaxe

| Construção | Exemplo |
|---|---|
| Pacote | `package in ui.app;` |
| Constante global | `e.const nome.str = "valor";` |
| Variável local | `let nome.tipo = valor;` |
| Função | `fun nome(param.tipo) >> retorno { ... }` |
| Classe pública | `class.public Nome { ... }` |
| Componente UI | `componente Home { fun render() { ... } }` |
| Saída padrão | `System.print("texto");` |

### Tipos

`str` · `int` · `float` · `boolean` · `void` · `array`

### Prefixos de escopo

- `e.` — variável/constante **global exportada**
- `i.` — variável/constante **interna ao módulo**
- `let` — variável **local**

## Extensões de arquivo

| Extensão | Descrição |
|---|---|
| `.uz` | Arquivo fonte UpperZetta, editável. |
| `.uzb` | Bytecode compilado pelo UVLM. Intencionalmente hostil à decompilação. |
| `.uzs` | Arquivo **selado** — fonte criptografado com AES-256-GCM + PBKDF2 (600.000 iterações). Totalmente reversível. |

## UVLM

**UpperZetta Virtual Legacy Machine** — a máquina virtual da linguagem, análoga à JVM, mas desenhada do zero com proteção em mente.

O pipeline é direto:

```
arquivo.uz   →   UVLM build   →   arquivo.uzb   →   UVLM run   →   execução
```

### Comandos principais

```bash
./oa-uvlm build arquivo.uz      # compila .uz para .uzb
./oa-uvlm run arquivo.uzb       # executa o bytecode
./oa-uvlm seal arquivo.uz       # gera .uzs criptografado
./oa-uvlm help                  # lista todos os comandos
```

## ZettaSource

A IDE oficial da UpperZetta, construída em Electron com visual minimalista inspirado no Vim.

### Recursos

- Syntax highlighting nativo para `.uz`
- Terminal integrado com suporte a comandos `oa-uvlm`
- Painel de output dedicado do UVLM
- Painel de problemas com análise estática
- Relatório GLP — inspeção das camadas de ofuscação aplicadas
- Suporte a edição e geração de arquivos selados `.uzs`

### Atalhos de build

Dentro do terminal da IDE:

```bash
./oa-uvlm_build      # build do arquivo atual
./oa-uvlm_run        # executa o último build
```

## Segurança

A proteção da UpperZetta opera em três camadas:

**1. Bytecode hostil.** O `.uzb` é gerado com instruction set proprietário e layout polimórfico. Cada build pode produzir bytecode estruturalmente diferente para o mesmo fonte.

**2. Arquivos selados.** O `.uzs` encapsula o fonte com AES-256-GCM derivado via PBKDF2 com 600.000 iterações. O ZettaSource permite a reversão total do `.uzs` para o `.uz` original mediante senha, facilitando o trabalho colaborativo seguro. Sem a senha, recuperar o fonte original é inviável dentro de qualquer janela de tempo útil.

**3. GLP.** A filiação ao Grupo de Linguagens Palíndromas adiciona ofuscação composta — cada linguagem do grupo contribui com uma camada que, combinada, multiplica o custo de reversão.

## Status

Versão atual: `1.0.0`

- Compilador `uz → uzb` funcional
- UVLM executando bytecode compilado
- ZettaSource IDE com instalador NSIS para Windows
- Selagem `.uzs` com AES-256 implementada

## Licença

MIT — ver [LICENSE](LICENSE).

---

<div align="center">

**UpperZetta** · construída para durar, desenhada para resistir.

</div>
