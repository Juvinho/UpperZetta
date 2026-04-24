import {
  AssignmentStatement,
  BinaryExpression,
  BooleanLiteralExpression,
  CallExpression,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  FunctionParameter,
  IdentifierExpression,
  NumberLiteralExpression,
  Program,
  ReturnStatement,
  Statement,
  StringLiteralExpression,
  TypeReference,
  UnaryExpression,
  VariableDeclaration
} from "./ast";
import { Token, TokenType } from "./token";

export function parse(tokens: Token[]): Program {
  return new Parser(tokens).parseProgram();
}

class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  parseProgram(): Program {
    const body: Statement[] = [];
    this.skipNewlines();

    while (!this.isAtEnd()) {
      body.push(this.parseStatement());
      this.consumeOptionalNewline();
      this.skipNewlines();
    }

    return { kind: "Program", body };
  }

  private parseStatement(): Statement {
    if (this.match("DEF")) {
      return this.parseFunctionDeclaration();
    }

    if (this.match("RETURN")) {
      return this.parseReturnStatement();
    }

    if (this.isTypedVariableDeclarationStart()) {
      return this.parseVariableDeclaration();
    }

    if (this.check("IDENTIFIER") && this.checkNext("EQUAL")) {
      return this.parseAssignmentStatement();
    }

    const expression = this.parseExpression();
    return this.makeExpressionStatement(expression);
  }

  private parseFunctionDeclaration(): FunctionDeclaration {
    const name = this.expect("IDENTIFIER", "Esperado nome da funcao apos 'def'.").value;
    this.expect("LPAREN", "Esperado '(' apos nome da funcao.");

    const params: FunctionParameter[] = [];
    if (!this.check("RPAREN")) {
      do {
        params.push(this.parseFunctionParameter());
      } while (this.match("COMMA"));
    }

    this.expect("RPAREN", "Esperado ')' no fim da lista de parametros.");

    let returnType: TypeReference | undefined;
    if (this.match("ARROW")) {
      returnType = this.parseTypeReference();
    }

    this.expect("COLON", "Esperado ':' apos assinatura da funcao.");
    this.expect("NEWLINE", "Esperado quebra de linha apos ':' da funcao.");
    this.expect("INDENT", "Esperado bloco indentado no corpo da funcao.");

    const body: Statement[] = [];
    this.skipNewlines();
    while (!this.check("DEDENT") && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.consumeOptionalNewline();
      this.skipNewlines();
    }

    this.expect("DEDENT", "Esperado dedent no fim do corpo da funcao.");

    return {
      kind: "FunctionDeclaration",
      name,
      params,
      returnType,
      body
    };
  }

  private parseFunctionParameter(): FunctionParameter {
    const checkpoint = this.current;
    const typeEnd = this.tryTypeReferenceEndAt(this.current);

    if (typeEnd !== null && this.get(typeEnd)?.type === "IDENTIFIER") {
      const paramType = this.parseTypeReference();
      const name = this.expect("IDENTIFIER", "Esperado nome do parametro.").value;
      return { name, paramType };
    }

    this.current = checkpoint;
    const name = this.expect("IDENTIFIER", "Esperado nome do parametro.").value;
    return { name };
  }

  private parseReturnStatement(): ReturnStatement {
    if (this.check("NEWLINE") || this.check("DEDENT") || this.check("EOF")) {
      return { kind: "ReturnStatement" };
    }

    const value = this.parseExpression();
    return { kind: "ReturnStatement", value };
  }

  private parseVariableDeclaration(): VariableDeclaration {
    const variableType = this.parseTypeReference();
    const name = this.expect("IDENTIFIER", "Esperado nome da variavel tipada.").value;
    this.expect("EQUAL", "Esperado '=' na declaracao de variavel.");
    const initializer = this.parseExpression();

    return {
      kind: "VariableDeclaration",
      name,
      variableType,
      initializer
    };
  }

  private parseAssignmentStatement(): AssignmentStatement {
    const name = this.expect("IDENTIFIER", "Esperado nome da variavel.").value;
    this.expect("EQUAL", "Esperado '=' na atribuicao.");
    const value = this.parseExpression();

    return {
      kind: "AssignmentStatement",
      name,
      value
    };
  }

  private parseExpression(): Expression {
    return this.parseAdditiveExpression();
  }

  private parseAdditiveExpression(): Expression {
    let expression = this.parseMultiplicativeExpression();

    while (this.match("PLUS", "MINUS")) {
      const operatorToken = this.previous();
      const right = this.parseMultiplicativeExpression();
      expression = this.makeBinaryExpression(
        operatorToken.type === "PLUS" ? "+" : "-",
        expression,
        right
      );
    }

    return expression;
  }

  private parseMultiplicativeExpression(): Expression {
    let expression = this.parseUnaryExpression();

    while (this.match("STAR", "SLASH")) {
      const operatorToken = this.previous();
      const right = this.parseUnaryExpression();
      expression = this.makeBinaryExpression(
        operatorToken.type === "STAR" ? "*" : "/",
        expression,
        right
      );
    }

    return expression;
  }

  private parseUnaryExpression(): Expression {
    if (this.match("MINUS")) {
      const operand = this.parseUnaryExpression();
      return this.makeUnaryExpression("-", operand);
    }

    return this.parseCallExpression();
  }

  private parseCallExpression(): Expression {
    let expression = this.parsePrimaryExpression();

    while (this.match("LPAREN")) {
      const args: Expression[] = [];
      if (!this.check("RPAREN")) {
        do {
          args.push(this.parseExpression());
        } while (this.match("COMMA"));
      }

      this.expect("RPAREN", "Esperado ')' no fim da chamada de funcao.");
      expression = this.makeCallExpression(expression, args);
    }

    return expression;
  }

  private parsePrimaryExpression(): Expression {
    if (this.match("NUMBER")) {
      const raw = this.previous().value;
      const value = Number(raw);
      if (Number.isNaN(value)) {
        throw this.error(this.previous(), `Numero invalido '${raw}'.`);
      }
      return this.makeNumberLiteral(value);
    }

    if (this.match("STRING")) {
      return this.makeStringLiteral(this.previous().value);
    }

    if (this.match("TRUE")) {
      return this.makeBooleanLiteral(true);
    }

    if (this.match("FALSE")) {
      return this.makeBooleanLiteral(false);
    }

    if (this.match("IDENTIFIER")) {
      return this.makeIdentifier(this.previous().value);
    }

    if (this.match("LPAREN")) {
      const expression = this.parseExpression();
      this.expect("RPAREN", "Esperado ')' apos expressao agrupada.");
      return expression;
    }

    throw this.error(this.peek(), `Expressao inesperada '${this.peek().value}'.`);
  }

  private parseTypeReference(): TypeReference {
    const nameToken = this.expect("IDENTIFIER", "Esperado nome do tipo.");
    const typeArguments: TypeReference[] = [];

    if (this.match("LT")) {
      do {
        typeArguments.push(this.parseTypeReference());
      } while (this.match("COMMA"));

      this.expect("GT", "Esperado '>' no fechamento de tipo generico.");
    }

    return {
      name: nameToken.value,
      typeArguments
    };
  }

  private isTypedVariableDeclarationStart(): boolean {
    const typeEnd = this.tryTypeReferenceEndAt(this.current);
    if (typeEnd === null) {
      return false;
    }

    return this.get(typeEnd)?.type === "IDENTIFIER" && this.get(typeEnd + 1)?.type === "EQUAL";
  }

  private tryTypeReferenceEndAt(start: number): number | null {
    const first = this.get(start);
    if (!first || first.type !== "IDENTIFIER") {
      return null;
    }

    let cursor = start + 1;
    if (this.get(cursor)?.type === "LT") {
      cursor += 1;

      const firstArgEnd = this.tryTypeReferenceEndAt(cursor);
      if (firstArgEnd === null) {
        return null;
      }
      cursor = firstArgEnd;

      while (this.get(cursor)?.type === "COMMA") {
        cursor += 1;
        const nextArgEnd = this.tryTypeReferenceEndAt(cursor);
        if (nextArgEnd === null) {
          return null;
        }
        cursor = nextArgEnd;
      }

      if (this.get(cursor)?.type !== "GT") {
        return null;
      }

      cursor += 1;
    }

    return cursor;
  }

  private skipNewlines(): void {
    while (this.match("NEWLINE")) {
      // Ignora linhas vazias entre statements.
    }
  }

  private consumeOptionalNewline(): void {
    if (this.check("NEWLINE")) {
      this.advance();
    }
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }

    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return type === "EOF";
    }

    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    return this.peek(1).type === type;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    throw this.error(this.peek(), message);
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(offset = 0): Token {
    const index = Math.min(this.current + offset, this.tokens.length - 1);
    return this.tokens[index] as Token;
  }

  private previous(): Token {
    return this.tokens[this.current - 1] as Token;
  }

  private get(index: number): Token | undefined {
    return this.tokens[index];
  }

  private error(token: Token, message: string): Error {
    return new Error(`${message} (linha ${token.line}, coluna ${token.column})`);
  }

  private makeIdentifier(name: string): IdentifierExpression {
    return {
      kind: "IdentifierExpression",
      name
    };
  }

  private makeNumberLiteral(value: number): NumberLiteralExpression {
    return {
      kind: "NumberLiteralExpression",
      value
    };
  }

  private makeStringLiteral(value: string): StringLiteralExpression {
    return {
      kind: "StringLiteralExpression",
      value
    };
  }

  private makeBooleanLiteral(value: boolean): BooleanLiteralExpression {
    return {
      kind: "BooleanLiteralExpression",
      value
    };
  }

  private makeBinaryExpression(
    operator: BinaryExpression["operator"],
    left: Expression,
    right: Expression
  ): BinaryExpression {
    return {
      kind: "BinaryExpression",
      operator,
      left,
      right
    };
  }

  private makeUnaryExpression(
    operator: UnaryExpression["operator"],
    operand: Expression
  ): UnaryExpression {
    return {
      kind: "UnaryExpression",
      operator,
      operand
    };
  }

  private makeCallExpression(callee: Expression, args: Expression[]): CallExpression {
    return {
      kind: "CallExpression",
      callee,
      args
    };
  }

  private makeExpressionStatement(expression: Expression): ExpressionStatement {
    return {
      kind: "ExpressionStatement",
      expression
    };
  }
}
