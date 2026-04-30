# ZettaUI Web

> **Módulo:** `zetta.web` · **Runtime:** `zettaui.js` · **Saída:** `.js` + `.html`

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Configuração e Estrutura de Arquivos](#2-configuração-e-estrutura-de-arquivos)
3. [Declaração de Componente Web](#3-declaração-de-componente-web)
4. [ZettaUI — API de Nós](#4-zettaui--api-de-nós)
5. [ZettaAnim — Animações](#5-zettaanim--animações)
6. [Humores (Moods)](#6-humores-moods)
7. [Eventos](#7-eventos)
8. [Sleep e Wake](#8-sleep-e-wake)
9. [Promoção de Campos Cross-Method](#9-promoção-de-campos-cross-method)
10. [CLI — Compilação Web](#10-cli--compilação-web)
11. [Exemplos Completos](#11-exemplos-completos)
12. [Erros Comuns](#12-erros-comuns)
13. [Referência Rápida](#13-referência-rápida)

---

## 1. Visão Geral

**ZettaUI** é o sistema de UI web da UpperZetta. Arquivos `.uz` que importam `zetta.web` são transpilados para JavaScript em vez de compilados para bytecode UVLM.

```
arquivo.uz  →  [transpilador ZettaUI]  →  arquivo.js + arquivo.html
```

Características:
- Zero dependências externas — apenas o runtime `zettaui.js`
- API declarativa baseada em `dad` (container) e `child` (elemento filho)
- Animações CSS nativas via `ZettaAnim`
- Suporte a `async`/`await` automático para chamadas `.sleep()`
- Promoção automática de variáveis referenciadas em múltiplos métodos

---

## 2. Configuração e Estrutura de Arquivos

### Estrutura recomendada

```
meu-projeto/
├── src/
│   └── App.uz
├── runtime/
│   ├── zettaui.js     ← runtime (copiar de zettaui/runtime/)
│   └── zettaui.css    ← injetado automaticamente pelo runtime
└── dist/
    ├── App.js         ← gerado pelo compilador
    └── App.html       ← gerado automaticamente (só na 1ª vez)
```

### Importações obrigatórias

Todo arquivo `.uz` que usa ZettaUI deve declarar os imports no topo:

```uz
import zetta.web.ZettaUI;
import zetta.web.ZettaAnim;
```

> O compilador detecta `import zetta.web` e ativa o modo transpilador. As linhas de import são removidas antes do parse e não geram código JS — elas servem apenas como flag de roteamento.

---

## 3. Declaração de Componente Web

Componentes web usam a mesma palavra-chave `componente` da linguagem, mas com o módulo `zetta.web` importado.

### Estrutura

```uz
import zetta.web.ZettaUI;
import zetta.web.ZettaAnim;

package in ui.app;

componente NomeDoComponente {
    let campo.str = "valor inicial";

    fun render() >> ZettaUI.dad {
        let root.ZettaUI.dad = ZettaUI.dad("minha-classe");
        // ... monta a árvore ...
        return root;
    }

    fun metodoAuxiliar() {
        // pode referenciar campos do render() se promovidos
    }
}
```

### Regras

| Regra | Detalhe |
|-------|---------|
| `render()` obrigatório | É o ponto de entrada — monta e retorna o nó raiz |
| Retorno de `render()` | Deve ser um `ZettaUI.dad` (container) |
| Campos com `= valor` | Inicializados no `constructor()` gerado |
| Métodos auxiliares | Podem referenciar variáveis UI do `render()` se promovidos |

---

## 4. ZettaUI — API de Nós

### `ZettaUI.dad(className)`

Cria um container (`div`) com a classe CSS fornecida.

```uz
let layout.ZettaUI.dad = ZettaUI.dad("app-root");
let card.ZettaUI.dad   = ZettaUI.dad("card");
```

Gerado como:
```js
const _layout = ZettaUI.dad("app-root");
const _card   = ZettaUI.dad("card");
```

### `ZettaUI.child(tag, content)`

Cria um elemento filho com a tag HTML e conteúdo de texto.

```uz
let titulo.ZettaUI.child = ZettaUI.child("h1", "Olá mundo");
let paragrafo.ZettaUI.child = ZettaUI.child("p", descricao);
let btn.ZettaUI.child = ZettaUI.child("button", "Clique aqui");
```

Tags suportadas: qualquer tag HTML válida — `h1`–`h6`, `p`, `span`, `button`, `input`, `img`, `div`, `a`, etc.

### `.hug(filho)`

Insere um filho dentro do nó pai. Retorna `this` para encadeamento.

```uz
card.hug(titulo);
card.hug(paragrafo);
card.hug(btn);
layout.hug(card);
```

> Após receber `.hug()`, um `child` também pode abraçar outros elementos — todo abraçado vira lar.

**Encadeamento:**
```uz
layout.hug(card).hug(rodape);
```

### Hierarquia completa

```uz
fun render() >> ZettaUI.dad {
    let root.ZettaUI.dad   = ZettaUI.dad("app");
    let header.ZettaUI.dad = ZettaUI.dad("header");
    let titulo.ZettaUI.child = ZettaUI.child("h1", "Meu App");
    let nav.ZettaUI.child    = ZettaUI.child("nav", "Menu");

    header.hug(titulo);
    header.hug(nav);
    root.hug(header);
    return root;
}
```

---

## 5. ZettaAnim — Animações

Todas as animações são aplicadas com `ZettaAnim.método(nó)`.

### `ZettaAnim.appear(nó)`

FadeIn suave com leve subida. Use após adicionar o elemento ao DOM (dentro do `if (ativo == true)` ou diretamente).

```uz
ZettaAnim.appear(titulo);
```

### `ZettaAnim.leave(nó)`

FadeOut suave com descida. O elemento se torna não-clicável após a animação.

```uz
ZettaAnim.leave(mensagem);
```

### `ZettaAnim.breath(nó)`

Pulso suave em loop — o elemento "respira". Ideal para cards em destaque.

```uz
ZettaAnim.breath(card);
```

### `ZettaAnim.bounce(nó)`

Uma quicada rápida. Ideal para chamar atenção sem ansiedade.

```uz
ZettaAnim.bounce(btn);
```

### `ZettaAnim.blink(nó)`

Pisca uma vez. Útil para feedback visual de ação.

```uz
ZettaAnim.blink(icone);
```

### `ZettaAnim.apply(nó, nome, duracaoMs)`

Aplica animação por nome com duração customizada.

```uz
ZettaAnim.apply(card, "bounce", 800);
ZettaAnim.apply(logo, "breath", 3000);
```

> O `nome` é sem o prefixo `zetta-` — use `"bounce"`, não `"zetta-bounce"`.

---

## 6. Humores (Moods)

Humores são classes CSS semânticas aplicadas com `.mood()`.

### `.mood(nome)`

```uz
btn.mood("happy");
btn.mood("shy");
btn.mood("sleepy");
```

| Humor | Efeito visual |
|-------|--------------|
| `happy` | Opacidade total, sem filtro — confiante e presente |
| `shy` | Opacidade 60%, escala 97%, leve desaturação — recuado |
| `sleepy` | Opacidade 50%, blur leve, desaturação — distante e lento |

### `.unmood(nome)`

Remove o humor:

```uz
btn.unmood("shy");
```

### Encadeamento de humores

```uz
btn.mood("shy");
// ... algum tempo depois ...
btn.unmood("shy");
btn.mood("happy");
```

---

## 7. Eventos

### `.onClick(callback)`

Registra handler de clique. O argumento é uma referência a método com `fun`:

```uz
btn.onClick(fun handleClick());
```

Gerado como:
```js
_btn.onClick(() => this.handleClick())
```

### `.on(evento, callback)`

Handler genérico para qualquer evento DOM:

```uz
input.on("input", fun handleInput());
form.on("submit", fun handleSubmit());
```

### Definição do método handler

```uz
componente Form {
    fun handleSubmit() {
        // lógica aqui
    }

    fun render() >> ZettaUI.dad {
        let root.ZettaUI.dad = ZettaUI.dad("form");
        let btn.ZettaUI.child = ZettaUI.child("button", "Enviar");
        btn.onClick(fun handleSubmit());
        root.hug(btn);
        return root;
    }
}
```

---

## 8. Sleep e Wake

### `.sleep(ms)`

Suspende visualmente o elemento por `ms` milissegundos. Retorna uma `Promise`.

Métodos que contêm `.sleep()` são gerados automaticamente como `async`, e o `await` é inserido antes da chamada:

```uz
fun handleClick() {
    btn.mood("shy");
    btn.sleep(300);      // ← await inserido automaticamente
    btn.mood("happy");
}
```

Gerado como:
```js
async handleClick() {
    this._btn.mood("shy");
    await this._btn.sleep(300);
    this._btn.mood("happy");
}
```

### `.wake()`

Cancela um sleep em andamento e restaura o elemento imediatamente:

```uz
btn.wake();
```

---

## 9. Promoção de Campos Cross-Method

Variáveis `ZettaUI` declaradas em `render()` e referenciadas em outros métodos são **promovidas automaticamente** para `this._nome`.

### Exemplo

```uz
componente Card {
    fun handleClick() {
        ZettaAnim.bounce(titulo);   // ← usa 'titulo' de render()
    }

    fun render() >> ZettaUI.dad {
        let titulo.ZettaUI.child = ZettaUI.child("h1", "Título");
        //  ^^^^^^ promovido para this._titulo
        let btn.ZettaUI.child = ZettaUI.child("button", "OK");
        //  ^^^ promovido (referenciado em handleClick via bounce)

        btn.onClick(fun handleClick());
        // ...
    }
}
```

Gerado como:
```js
constructor() {
    this._titulo = null;   // promovido
    this._btn    = null;   // promovido
}

async handleClick() {
    ZettaAnim.bounce(this._titulo);
}

render() {
    this._titulo = ZettaUI.child("h1", "Título");
    this._btn    = ZettaUI.child("button", "OK");
    // ...
}
```

> Variáveis não referenciadas em outros métodos permanecem como `const _nome` locais do `render()`.

---

## 10. CLI — Compilação Web

### Compilar arquivo `.uz` com ZettaUI

```bash
java -cp Main.jar Main src/App.uz
```

Saída:
```
Transpiled to: src/App.js
Generated: src/App.html
```

- `.js` — sempre gerado/sobrescrito a cada compilação
- `.html` — gerado apenas se não existir (preserve suas customizações)

### Flags disponíveis (modo UVLM — não se aplicam ao modo web)

Quando o arquivo contém `import zetta.web`, os flags `--disasm`, `--glp-inspect` e `--emit-glp-report` são ignorados — o transpilador retorna imediatamente após gerar o JS.

---

## 11. Exemplos Completos

### Hello World Web

```uz
import zetta.web.ZettaUI;

package in ui.hello;

componente Hello {
    fun render() >> ZettaUI.dad {
        let root.ZettaUI.dad     = ZettaUI.dad("app");
        let msg.ZettaUI.child    = ZettaUI.child("h1", "Olá, ZettaUI!");
        root.hug(msg);
        return root;
    }
}
```

---

### Card Interativo

```uz
import zetta.web.ZettaUI;
import zetta.web.ZettaAnim;

package in ui.app;

e.const APP_NAME.str = "UpperZetta";

componente Card {
    let titulo.str  = "Meu Card";
    let ativo.boolean = true;

    fun handleClick() {
        ZettaAnim.bounce(titulo);
        btn.mood("shy");
        btn.sleep(300);
        btn.mood("happy");
    }

    fun render() >> ZettaUI.dad {
        let layout.ZettaUI.dad = ZettaUI.dad("app-root");
        let card.ZettaUI.dad   = ZettaUI.dad("card");

        let titulo.ZettaUI.child = ZettaUI.child("h1", titulo);
        let sub.ZettaUI.child    = ZettaUI.child("p", "Bem vindo a " + APP_NAME);
        let btn.ZettaUI.child    = ZettaUI.child("button", "Clique");

        if (ativo == true) {
            ZettaAnim.appear(titulo);
            ZettaAnim.breath(card);
        }

        btn.onClick(fun handleClick());

        card.hug(titulo);
        card.hug(sub);
        card.hug(btn);
        layout.hug(card);

        return layout;
    }
}
```

---

### Lista de Itens

```uz
import zetta.web.ZettaUI;
import zetta.web.ZettaAnim;

package in ui.lista;

componente Lista {
    fun render() >> ZettaUI.dad {
        let root.ZettaUI.dad  = ZettaUI.dad("lista-app");
        let lista.ZettaUI.dad = ZettaUI.dad("lista");

        let itens.array = ["Primeiro", "Segundo", "Terceiro"];

        for (let i.int = 0; i < 3; i = i + 1) {
            let item.ZettaUI.child = ZettaUI.child("li", itens[i]);
            ZettaAnim.appear(item);
            lista.hug(item);
        }

        root.hug(lista);
        return root;
    }
}
```

---

### Toggle de Visibilidade

```uz
import zetta.web.ZettaUI;
import zetta.web.ZettaAnim;

package in ui.toggle;

componente Toggle {
    let visivel.boolean = true;

    fun toggleConteudo() {
        if (visivel == true) {
            ZettaAnim.leave(conteudo);
            visivel = false;
        } else {
            ZettaAnim.appear(conteudo);
            visivel = true;
        }
    }

    fun render() >> ZettaUI.dad {
        let root.ZettaUI.dad      = ZettaUI.dad("toggle-app");
        let conteudo.ZettaUI.dad  = ZettaUI.dad("conteudo");
        let texto.ZettaUI.child   = ZettaUI.child("p", "Conteúdo visível");
        let btn.ZettaUI.child     = ZettaUI.child("button", "Alternar");

        conteudo.hug(texto);
        btn.onClick(fun toggleConteudo());

        root.hug(btn);
        root.hug(conteudo);
        return root;
    }
}
```

---

## 12. Erros Comuns

### `render() não retornou um dad`

```
✗ Erro ZettaUI: render() não retornou um dad.
  Dica: todo componente precisa de um lar.
```

**Causa:** `render()` retornou um `ZettaUI.child` ou `null` em vez de um `ZettaUI.dad`.

**Correção:** Certifique-se de que a última instrução de `render()` é `return nomeDad;`.

---

### `X não tem pai`

```
✗ Erro ZettaUI: [objeto] não tem pai.
  Dica: todo filho precisa de um abraço.
```

**Causa:** `.hug()` recebeu algo que não é um `ZettaNode`.

**Correção:** Apenas nós criados com `ZettaUI.dad()` ou `ZettaUI.child()` podem ser abraçados.

---

### `mood("xyz") não reconhecido`

```
⚠ ZettaUI: mood("xyz") não reconhecido.
  Dica: humores válidos são happy, shy e sleepy.
```

**Causa:** Humor inválido passado para `.mood()`.

**Correção:** Use apenas `"happy"`, `"shy"` ou `"sleepy"`.

---

### `ZettaAnim.appear() em elemento sem pai`

```
⚠ ZettaUI: ZettaAnim.appear() em elemento sem pai.
  Dica: como animar algo que ainda não existe pra ninguém?
```

**Causa:** `ZettaAnim.appear()` chamado antes de `.hug()` adicionar o elemento ao DOM.

**Correção:** Chame `ZettaAnim.appear()` *antes* de chamar `.hug()` — o runtime anima na entrada.

---

### Variável UI não atualiza em outro método

**Causa:** A variável não foi promovida porque o transpilador não detectou a referência.

**Solução:** Referencie a variável diretamente pelo nome no método auxiliar — o transpilador detecta e promove para `this._nome` automaticamente.

---

## 13. Referência Rápida

### ZettaUI

| Método | Assinatura | Descrição |
|--------|-----------|-----------|
| `ZettaUI.dad` | `dad(className: str)` | Cria container `div` |
| `ZettaUI.child` | `child(tag: str, content: str)` | Cria elemento filho |
| `.hug` | `hug(filho: ZettaNode)` | Insere filho, retorna `this` |
| `.mood` | `mood(nome: str)` | Aplica humor CSS |
| `.unmood` | `unmood(nome: str)` | Remove humor CSS |
| `.sleep` | `sleep(ms: int)` | Suspende visualmente, retorna Promise |
| `.wake` | `wake()` | Cancela sleep |
| `.onClick` | `onClick(fn)` | Listener de clique |
| `.on` | `on(evento: str, fn)` | Listener genérico |

### ZettaAnim

| Método | Efeito |
|--------|--------|
| `ZettaAnim.appear(nó)` | FadeIn + sobe levemente |
| `ZettaAnim.leave(nó)` | FadeOut + desce levemente |
| `ZettaAnim.breath(nó)` | Pulso em loop |
| `ZettaAnim.bounce(nó)` | Quica uma vez |
| `ZettaAnim.blink(nó)` | Pisca uma vez |
| `ZettaAnim.apply(nó, nome, ms)` | Animação customizada |

### Humores

| Humor | Aparência |
|-------|-----------|
| `"happy"` | Normal, confiante |
| `"shy"` | Opaco, retraído, levemente desaturado |
| `"sleepy"` | Semi-transparente, blur, lento |

### Palavras-chave de tipo ZettaUI

```uz
ZettaUI.dad      // container (div)
ZettaUI.child    // elemento filho (qualquer tag)
ZettaUI.node     // supertipo (interno)
```

---

*ZettaUI Web — parte do ecossistema UpperZetta v1.0*
