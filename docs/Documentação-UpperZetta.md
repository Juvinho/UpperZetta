# Documentação UpperZetta

> **Versão:** 1.0 · **Runtime:** UVLM (UpperZetta Virtual Language Machine) · **Extensão:** `.uz`

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquivos e Extensões](#2-arquivos-e-extensões)
3. [Estrutura de um Programa](#3-estrutura-de-um-programa)
4. [Tipos de Dados](#4-tipos-de-dados)
5. [Variáveis e Constantes](#5-variáveis-e-constantes)
6. [Operadores](#6-operadores)
7. [Controle de Fluxo](#7-controle-de-fluxo)
8. [Funções](#8-funções)
9. [Classes](#9-classes)
10. [Componentes](#10-componentes)
11. [Arrays](#11-arrays)
12. [Saída de Dados](#12-saída-de-dados)
13. [Sistema de Pacotes](#13-sistema-de-pacotes)
14. [Modelo de Compilação](#14-modelo-de-compilação)
15. [Selar e Desselar Arquivos (.uzs)](#15-selar-e-desselar-arquivos-uzs)
16. [ZettaSource IDE](#16-zettasource-ide)
17. [Erros Comuns](#17-erros-comuns)
18. [Referência Rápida](#18-referência-rápida)
19. [Exemplos Completos](#19-exemplos-completos)

---

## 1. Visão Geral

UpperZetta (ou **UZ**) é uma linguagem de programação compilada e tipada estaticamente, executada sobre a **UVLM** — uma máquina virtual de pilha que compila código-fonte `.uz` para bytecode `.uzb`.

**Características principais:**
- Tipagem estática com anotação de tipo inline (`nome.tipo`)
- Orientação a objetos via `class.public` e `componente`
- Compilação para bytecode GLP (formato palindrômico verificável)
- Proteção de código-fonte via criptografia AES-256 (arquivos `.uzs`)
- Suporte a arrays, floats, strings e objetos

---

## 2. Arquivos e Extensões

| Extensão | Descrição |
|----------|-----------|
| `.uz`    | Código-fonte UpperZetta (texto legível) |
| `.uzb`   | Bytecode compilado (execução direta pela UVLM) |
| `.uzs`   | Arquivo selado — código-fonte ou bytecode criptografado com senha |

```
main.uz  →  [compilar]  →  main.uzb  →  [executar]  →  saída
main.uz  →  [selar]     →  main.uzs  →  [desselar]  →  main.uz
```

---

## 3. Estrutura de um Programa

Um programa UpperZetta mínimo segue esta estrutura:

```uz
package in meu.pacote;

componente Home {
    fun render() {
        System.print("Olá, UpperZetta!");
    }
}
```

A ordem dos elementos em um arquivo `.uz` é:

1. **Declaração de pacote** (opcional, mas recomendada)
2. **Constantes globais** (`e.const`)
3. **Funções globais** (`fun`)
4. **Classes** (`class.public`)
5. **Componentes** (`componente`)

> O ponto de entrada do programa é o método `render()` do componente `Home`.

---

## 4. Tipos de Dados

| Tipo      | Descrição                        | Exemplo de valor       |
|-----------|----------------------------------|------------------------|
| `int`     | Número inteiro (32 bits)         | `42`, `-7`, `0`        |
| `float`   | Número de ponto flutuante        | `3.14`, `8.5`, `-0.5`  |
| `str`     | Cadeia de caracteres (string)    | `"Olá"`, `"UZ"`        |
| `boolean` | Valor lógico                     | `true`, `false`        |
| `array`   | Vetor de valores                 | `[1, 2, 3]`            |
| `void`    | Ausência de retorno (em funções) | —                      |

### Literais

```uz
42          // int
3.14        // float
"texto"     // str (aspas duplas obrigatórias)
true        // boolean
false       // boolean
[1, 2, 3]  // array
```

---

## 5. Variáveis e Constantes

### Variáveis — `let`

Sintaxe: `let nome.tipo;` ou `let nome.tipo = valor;`

```uz
let idade.int;
let nome.str = "João";
let ativo.boolean = true;
let preco.float = 9.99;
let numeros.array = [10, 20, 30];
```

> A anotação de tipo usa **ponto** (`.`), não dois-pontos. `let x.int` significa "variável `x` do tipo `int`".

### Constantes — `e.const`

Sintaxe: `e.const nome.tipo = valor;`

Constantes são declaradas **no escopo global** (fora de funções e classes). Seu valor não pode ser reatribuído.

```uz
e.const PI.float = 3.14159;
e.const APP_NAME.str = "MinhaApp";
e.const MAX_TENTATIVAS.int = 3;
```

### Reatribuição

Variáveis são reatribuídas sem palavra-chave:

```uz
let contador.int = 0;
contador = contador + 1;   // correto
```

---

## 6. Operadores

### Aritméticos

| Operador | Operação       | Exemplo          |
|----------|----------------|------------------|
| `+`      | Adição / concat | `a + b`, `"a" + "b"` |
| `-`      | Subtração       | `a - b`          |
| `*`      | Multiplicação   | `a * b`          |
| `/`      | Divisão         | `a / b`          |

> `+` com strings realiza **concatenação**: `"valor: " + x` converte `x` para string automaticamente.

### Relacionais

| Operador | Significado       |
|----------|-------------------|
| `==`     | Igual             |
| `!=`     | Diferente         |
| `<`      | Menor que         |
| `>`      | Maior que         |
| `<=`     | Menor ou igual    |
| `>=`     | Maior ou igual    |

### Lógicos

| Operador | Significado |
|----------|-------------|
| `&&`     | E lógico (AND) |
| `\|\|`  | OU lógico (OR) |

### Atribuição

```uz
x = expressao;           // atribuição simples
obj.campo = valor;       // atribuição de campo
arr[indice] = valor;     // atribuição de elemento de array
```

### Precedência (maior para menor)

1. Chamadas de função, acesso de membro (`.`), indexação (`[]`)
2. `*`, `/`
3. `+`, `-`
4. `<`, `>`, `<=`, `>=`
5. `==`, `!=`
6. `&&`
7. `||`
8. `=` (atribuição — direita para esquerda)

---

## 7. Controle de Fluxo

### if / else

```uz
if (condicao) {
    // ...
}

if (condicao) {
    // ...
} else {
    // ...
}

if (condicao) {
    // ...
} else if (outra) {
    // ...
} else {
    // ...
}
```

Chaves são opcionais para blocos de **uma única instrução**:

```uz
if (x > 0)
    System.print("positivo");
```

### while

```uz
let i.int = 0;
while (i < 10) {
    System.print("iteração: " + i);
    i = i + 1;
}
```

### for

Sintaxe: `for (init; condição; incremento) { ... }`

```uz
for (let i.int = 0; i < 5; i = i + 1) {
    System.print("i = " + i);
}
```

> UpperZetta não possui `break` nem `continue` no UVLM atual. Use uma variável flag para sair de loops.

---

## 8. Funções

### Declaração

```uz
fun nomeDaFuncao(param1.tipo1, param2.tipo2) >> tipoRetorno {
    // corpo
    return valor;
}
```

- `>>` separa os parâmetros do tipo de retorno
- `void` é o tipo de retorno quando a função não retorna nada (omita o `return`)
- Parâmetros usam a mesma sintaxe `nome.tipo` que variáveis

### Exemplos

```uz
// Sem parâmetros, sem retorno
fun saudar() {
    System.print("Olá!");
}

// Com parâmetros e retorno
fun somar(a.int, b.int) >> int {
    return a + b;
}

// Retorno de string
fun classificar(nota.float) >> str {
    if (nota >= 7.0) { return "Aprovado"; }
    else { return "Reprovado"; }
}

// Float
fun media(a.float, b.float) >> float {
    return (a + b) / 2.0;
}
```

### Chamada de Função

```uz
saudar();
let resultado.int = somar(3, 5);
let msg.str = classificar(8.5);
System.print(msg);
```

### Recursão

```uz
fun fatorial(n.int) >> int {
    if (n <= 1) { return 1; }
    return n * fatorial(n - 1);
}
```

---

## 9. Classes

Classes encapsulam dados (campos) e comportamento (métodos).

### Declaração

```uz
class.public NomeDaClasse {
    let campo1.tipo;
    let campo2.tipo;

    fun metodo(param.tipo) >> tipoRetorno {
        // acessa campos diretamente pelo nome
        return campo1;
    }
}
```

> Dentro de métodos, os campos da classe são acessados **diretamente pelo nome**, sem `this.`.
> O UVLM injeta o objeto como local `0`, e o acesso a campos não declarados como locais sobe para o objeto automaticamente.

### Instanciação

```uz
let obj.NomeDaClasse = new NomeDaClasse();
obj.campo1 = "valor";
let resultado.tipo = obj.metodo(argumento);
```

### Exemplo Completo

```uz
class.public Usuario {
    let nome.str;
    let idade.int;
    let ativo.boolean;

    fun ehAdulto() >> boolean {
        return idade >= 18;
    }

    fun podeEntrar() >> boolean {
        if (ativo == true && idade >= 18) { return true; }
        else { return false; }
    }

    fun rotulo() >> str {
        if (ativo == false) { return "inativo"; }
        else if (idade < 18) { return "menor"; }
        else { return "adulto_ativo"; }
    }
}

componente Home {
    fun render() {
        let u.Usuario = new Usuario();
        u.nome = "Maria";
        u.idade = 25;
        u.ativo = true;

        System.print(u.nome);
        System.print(u.rotulo());
    }
}
```

### Campos em Classes vs. Componentes

| Aspecto | `class.public` | `componente` |
|---------|---------------|-------------|
| Campos com valor inicial | Não | Sim |
| Instanciável com `new` | Sim | Não (singleton implícito) |
| Ponto de entrada | Não | `render()` é o entry point |
| Uso típico | Modelos de dados | Lógica principal / UI |

---

## 10. Componentes

`componente` é um tipo especial de classe que pode inicializar campos na declaração e cujo método `render()` é o ponto de entrada do programa.

### Declaração

```uz
componente NomeDoComponente {
    let campo.tipo = valorInicial;

    fun render() {
        // código principal aqui
    }

    fun metodoAuxiliar(param.tipo) >> tipo {
        // ...
    }
}
```

### Exemplo

```uz
package in app.principal;

e.const VERSAO.str = "1.0.0";

componente Home {
    let titulo.str = "Minha Aplicação";

    fun render() {
        System.print(titulo);
        System.print("Versão: " + VERSAO);

        let soma.int = calcular(10, 20);
        System.print("Resultado: " + soma);
    }

    fun calcular(a.int, b.int) >> int {
        return a + b;
    }
}
```

---

## 11. Arrays

Arrays são criados com colchetes e suportam leitura e escrita por índice.

### Criação

```uz
let numeros.array = [1, 2, 3, 4, 5];
let nomes.array = ["Ana", "Bruno", "Carlos"];
let misturado.array = [1, "dois", true, 3.14];
let vazio.array = [];
```

### Acesso por Índice

Índices começam em `0`:

```uz
let primeiro.int = numeros[0];   // 1
let segundo.str = nomes[1];      // "Bruno"
```

### Modificação

```uz
numeros[0] = 99;
nomes[2] = "Carla";
```

### Iterar um Array

UpperZetta não tem `foreach` nativo — use `for` com índice:

```uz
let notas.array = [8.5, 9.0, 7.5];

for (let i.int = 0; i < 3; i = i + 1) {
    System.print("nota: " + notas[i]);
}
```

### Arrays como Parâmetro de Função

```uz
fun somarDois(arr.array) >> float {
    return arr[0] + arr[1];
}

let resultado.float = somarDois([4.5, 5.5]);
```

---

## 12. Saída de Dados

### `System.print`

Única função de saída nativa da linguagem. Aceita qualquer tipo.

```uz
System.print("Texto literal");
System.print(42);
System.print(3.14);
System.print(true);
System.print("Valor: " + variavel);
System.print(objeto.campo);
System.print(array[0]);
```

**Comportamento por tipo:**

| Tipo | Saída |
|------|-------|
| `str` | Texto tal como está |
| `int` | Número inteiro |
| `float` | Número com decimais |
| `boolean` | `true` ou `false` |
| Concatenação (`+`) | Converte o lado não-string para string |

### Concatenação de Strings

```uz
let nome.str = "João";
let idade.int = 30;
System.print("Nome: " + nome + ", Idade: " + idade);
// Saída: Nome: João, Idade: 30
```

---

## 13. Sistema de Pacotes

A declaração de pacote é a primeira instrução do arquivo. Define o namespace lógico do módulo.

### Sintaxe

```uz
package in nome.do.pacote;
```

### Exemplos

```uz
package in app.util;
package in teste.logica;
package in meu.projeto.modelos;
```

> O compilador atual lê a declaração de pacote mas não a usa para resolução de módulos. É documentação de namespace e metadado do arquivo selado `.uzs`.

---

## 14. Modelo de Compilação

### Pipeline

```
Código-fonte (.uz)
      │
      ▼
  [Lexer] — tokenização com regex
      │
      ▼
  [Parser] — AST (Abstract Syntax Tree)
      │
      ▼
  [CodeGen] — geração de bytecode UVLM
      │
      ▼
  [GLPEncoder] — formato GLP (Generative Logic Palindrome)
      │
      ▼
  Bytecode (.uzb)
      │
      ▼
  [UVLM] — execução na máquina virtual de pilha
```

### Invocar o Compilador

```bash
# Compilar .uz → .uzb e executar
java -cp Main.jar Main programa.uz

# Executar .uzb já compilado
java -cp Main.jar Main programa.uzb

# Desassemblar bytecode
java -cp Main.jar Main programa.uzb --disasm
```

### Bytecode UVLM

A UVLM é uma **máquina virtual de pilha** com 256 registradores locais por frame. Cada instrução opera sobre valores na pilha (`push`/`pop`).

**Tipos internos de valor:**

| ID | Tipo UZ |
|----|---------|
| 1 | `int` |
| 2 | `str` |
| 3 | `boolean` |
| 4 | objeto |
| 5 | `null` |
| 6 | `float` |
| 7 | `array` |

### Formato GLP

O bytecode `.uzb` usa o formato **GLP (Generative Logic Palindrome)**: o arquivo é palindrômico — Block A (código) e Block B (espelho). Isso permite verificação de integridade sem checksum externo.

---

## 15. Selar e Desselar Arquivos (.uzs)

Arquivos `.uzs` são versões criptografadas de `.uz` (código-fonte) ou `.uzb` (bytecode).

### Selar via CLI

```bash
java -cp Main.jar Main seal meuarquivo.uz
# → Solicita senha → gera meuarquivo.uzs
```

### Desselar via CLI

```bash
java -cp Main.jar Main unseal meuarquivo.uzs
# → Solicita senha → restaura meuarquivo.uz
```

### Selar e Desselar via ZettaSource IDE

- **Selar:** Menu `Arquivo → Selar Código-Fonte (.uzs)...` ou `Ctrl+Shift+E`
- **Abrir .uzs:** `Arquivo → Abrir Arquivo...` → selecione `.uzs` → insira senha

### DEVICE KEY — Chave de Dispositivo

Cada instalação do UVLM gera uma **DEVICE KEY** única na primeira execução, salva em:

```
~/.uvlm/.uvlm_dk
```

Arquivos selados com `seal` dependem **tanto da senha quanto da DEVICE KEY**. Sem ela, mesmo a senha correta não abre o arquivo em outro computador.

#### Exportar a DEVICE KEY (para migrar entre máquinas)

```bash
java -cp Main.jar Main key-export backup.uvlmkey
```

#### Importar DEVICE KEY

```bash
java -cp Main.jar Main key-import backup.uvlmkey
```

#### Ver DEVICE KEY atual

```bash
java -cp Main.jar Main key-show
```

### Formatos de Criptografia

| Magic | Algoritmo | Gerado por |
|-------|-----------|-----------|
| `UZS!` | AES-256-GCM, PBKDF2-SHA512 600k iter | ZettaSource IDE (Export) |
| `UZS1` | AES-256-CBC, PBKDF2-SHA512 100k iter + DEVICE KEY | CLI `seal` |

---

## 16. ZettaSource IDE

IDE nativa para UpperZetta baseada em Electron + CodeMirror 6.

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+N` | Novo arquivo |
| `Ctrl+O` | Abrir arquivo |
| `Ctrl+S` | Salvar |
| `Ctrl+Shift+S` | Salvar como |
| `Ctrl+W` | Fechar aba |
| `F5` | Compilar e executar |
| `Ctrl+Shift+B` | Compilar |
| `Ctrl+Shift+E` | Selar arquivo (.uzs) |
| `Ctrl+Shift+P` | Command Palette |
| `Ctrl+B` | Alternar sidebar |
| `` Ctrl+` `` | Abrir terminal |
| `Ctrl+,` | Configurações |
| `Ctrl+F` | Buscar no arquivo |
| `Ctrl+H` | Substituir |

### Highlighting de Sintaxe

| Elemento | Cor |
|----------|-----|
| Palavras-chave (`fun`, `let`, `if`...) | Vermelho |
| Tipos (`int`, `str`, `float`...) | Azul |
| Strings | Verde |
| Números | Laranja |
| Comentários | Cinza itálico |
| Nomes de função | Laranja dourado |
| Nomes de classe | Roxo |
| Builtins (`System`, `Math`) | Ciano |

### Painel Output UVLM

Exibe saída do compilador e do programa. Erros com formato `UZ-XXXX:linha:coluna` são **clicáveis** — clique para ir direto à linha do erro no editor.

---

## 17. Erros Comuns

### Erro de Sintaxe

```
Syntax error at 5:10 expected ;
```
→ Ponto-e-vírgula ausente na linha 5, coluna 10.

```
Unexpected token
```
→ Token fora de lugar. Verifique se o tipo está anotado corretamente (`nome.tipo`).

### Tipo não anotado

**Errado:**
```uz
let x = 10;        // ERRO: falta o tipo
fun soma(a, b) {}  // ERRO: parâmetros sem tipo
```

**Correto:**
```uz
let x.int = 10;
fun soma(a.int, b.int) >> int { return a + b; }
```

### Classe declarada errada

**Errado:**
```uz
class Pessoa { ... }          // ERRO: falta .public
```

**Correto:**
```uz
class.public Pessoa { ... }
```

### Constante dentro de função

**Errado:**
```uz
fun main() {
    e.const X.int = 10;       // ERRO: e.const só no escopo global
}
```

**Correto:**
```uz
e.const X.int = 10;

componente Home {
    fun render() {
        System.print(X);      // OK: acessa constante global
    }
}
```

### Campo de classe com valor inicial

**Errado:**
```uz
class.public Produto {
    let preco.float = 9.99;   // ERRO: class não suporta init
}
```

**Correto em classe:**
```uz
class.public Produto {
    let preco.float;           // sem init
}
```

**Correto em componente (suporta init):**
```uz
componente Home {
    let preco.float = 9.99;   // OK
}
```

---

## 18. Referência Rápida

### Palavras-chave

```
package    in         e.const    let
fun        return     class.public  componente
if         else       while      for
new        true       false      System.print
```

### Sintaxe de Tipo

```
nome.int        nome.float     nome.str
nome.boolean    nome.array     nome.NomeDaClasse
```

### Retorno de Função

```
fun f() >> int { ... }        // retorna int
fun g() { ... }               // sem retorno (void)
```

### Gramática Resumida

```
programa     → (pacote)? (const | fun | class | componente)*
pacote       → "package in" IDENT ("." IDENT)* ";"
const        → "e.const" IDENT "." IDENT "=" expr ";"
variável     → "let" IDENT "." IDENT ("=" expr)? ";"
fun          → "fun" IDENT "(" params ")" (">>" IDENT)? "{" stmt* "}"
params       → (IDENT "." IDENT ("," IDENT "." IDENT)*)?
class        → "class.public" IDENT "{" (variável | fun)* "}"
componente   → "componente" IDENT "{" (variável | fun)* "}"
stmt         → if | while | for | print | return | let | expr ";"
if           → "if" "(" expr ")" bloco ("else" bloco)?
while        → "while" "(" expr ")" bloco
for          → "for" "(" (let | expr ";" ) expr ";" expr ")" bloco
print        → "System.print" "(" expr ")" ";"
return       → "return" expr? ";"
bloco        → "{" stmt* "}" | stmt
expr         → assign
assign       → log ("=" assign)?
log          → eq (("&&" | "||") eq)*
eq           → rel (("==" | "!=") rel)*
rel          → add (("<"|">"|"<="|">=") add)*
add          → mul (("+" | "-") mul)*
mul          → call (("*" | "/") call)*
call         → prim (("(" args ")" | "." IDENT | "[" expr "]"))*
prim         → NUMBER | STRING | "true" | "false"
             | "new" IDENT "()"
             | IDENT | "(" expr ")"
             | "[" (expr ("," expr)*)? "]"
```

---

## 19. Exemplos Completos

### Hello World

```uz
package in exemplo.hello;

componente Home {
    fun render() {
        System.print("Olá, Mundo!");
    }
}
```

### Calculadora Simples

```uz
package in exemplo.calc;

fun somar(a.int, b.int) >> int { return a + b; }
fun subtrair(a.int, b.int) >> int { return a - b; }
fun multiplicar(a.int, b.int) >> int { return a * b; }
fun dividir(a.float, b.float) >> float { return a / b; }

componente Home {
    fun render() {
        System.print("Soma:       " + somar(10, 5));
        System.print("Subtração:  " + subtrair(10, 5));
        System.print("Múltiplicação: " + multiplicar(10, 5));
        System.print("Divisão:    " + dividir(10.0, 3.0));
    }
}
```

### Classificação com if/else

```uz
package in exemplo.classif;

fun classificarNota(nota.float) >> str {
    if (nota >= 9.0) { return "Excelente"; }
    else if (nota >= 7.0) { return "Bom"; }
    else if (nota >= 5.0) { return "Regular"; }
    else { return "Insuficiente"; }
}

componente Home {
    fun render() {
        let notas.array = [9.5, 7.2, 5.0, 3.8];

        System.print(classificarNota(notas[0]));
        System.print(classificarNota(notas[1]));
        System.print(classificarNota(notas[2]));
        System.print(classificarNota(notas[3]));
    }
}
```

### Loop e Acumulador

```uz
package in exemplo.loop;

fun somarAte(n.int) >> int {
    let soma.int = 0;
    for (let i.int = 1; i <= n; i = i + 1) {
        soma = soma + i;
    }
    return soma;
}

componente Home {
    fun render() {
        System.print("1 a 10: " + somarAte(10));
        System.print("1 a 100: " + somarAte(100));

        let x.int = 1;
        while (x <= 5) {
            System.print("x = " + x);
            x = x + 1;
        }
    }
}
```

### Classe com Métodos

```uz
package in exemplo.classes;

class.public Retangulo {
    let largura.float;
    let altura.float;

    fun area() >> float {
        return largura * altura;
    }

    fun perimetro() >> float {
        return 2.0 * (largura + altura);
    }

    fun ehQuadrado() >> boolean {
        return largura == altura;
    }
}

componente Home {
    fun render() {
        let r.Retangulo = new Retangulo();
        r.largura = 4.0;
        r.altura = 6.0;

        System.print("Área: " + r.area());
        System.print("Perímetro: " + r.perimetro());

        if (r.ehQuadrado()) {
            System.print("É um quadrado.");
        } else {
            System.print("Não é um quadrado.");
        }
    }
}
```

### Fibonacci

```uz
package in exemplo.fibonacci;

fun fib(n.int) >> int {
    if (n <= 1) { return n; }
    return fib(n - 1) + fib(n - 2);
}

componente Home {
    fun render() {
        for (let i.int = 0; i <= 10; i = i + 1) {
            System.print("fib(" + i + ") = " + fib(i));
        }
    }
}
```

### Trabalhando com Arrays

```uz
package in exemplo.arrays;

e.const TAMANHO.int = 5;

fun maior(arr.array) >> float {
    let m.float = arr[0];
    for (let i.int = 1; i < TAMANHO; i = i + 1) {
        if (arr[i] > m) {
            m = arr[i];
        }
    }
    return m;
}

componente Home {
    fun render() {
        let valores.array = [3.5, 8.1, 2.9, 7.4, 5.0];

        System.print("Maior valor: " + maior(valores));

        for (let i.int = 0; i < TAMANHO; i = i + 1) {
            System.print("valores[" + i + "] = " + valores[i]);
        }
    }
}
```

### Componente com Estado

```uz
package in exemplo.estado;

componente Contador {
    let valor.int = 0;
    let nome.str = "Contador Principal";

    fun render() {
        System.print(nome);
        incrementar();
        incrementar();
        incrementar();
        System.print("Valor final: " + valor);
    }

    fun incrementar() {
        valor = valor + 1;
        System.print("incrementado para: " + valor);
    }

    fun resetar() {
        valor = 0;
    }
}
```

---

*Documentação gerada para UpperZetta v1.0 · UVLM Runtime · ZettaSource IDE v2.0.0*
