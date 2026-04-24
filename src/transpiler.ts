import {
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  Program,
  ReturnStatement,
  Statement,
  TypeReference,
  UnaryExpression,
  VariableDeclaration
} from "./ast";

interface Scope {
  declaredVariables: Set<string>;
  typedVariables: Map<string, TypeReference>;
  returnType?: TypeReference;
}

const RUNTIME_HELPERS = `function __upz_typeText(typeSpec) {
  if (!typeSpec || typeof typeSpec !== "object") {
    return "unknown";
  }

  const args = Array.isArray(typeSpec.typeArguments) ? typeSpec.typeArguments : [];
  if (args.length === 0) {
    return String(typeSpec.name);
  }

  return String(typeSpec.name) + "<" + args.map(__upz_typeText).join(", ") + ">";
}

function __upz_detectType(value) {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (Array.isArray(value)) {
    return "List";
  }

  if (value instanceof Map) {
    return "Map";
  }

  if (typeof value === "object" && value.constructor && value.constructor.name) {
    return value.constructor.name;
  }

  return typeof value;
}

function __upz_matchesType(value, typeSpec) {
  if (!typeSpec || typeof typeSpec !== "object") {
    return true;
  }

  const typeName = String(typeSpec.name);
  const args = Array.isArray(typeSpec.typeArguments) ? typeSpec.typeArguments : [];

  if (typeName === "void") {
    return value === undefined;
  }

  if (typeName === "int") {
    return typeof value === "number" && Number.isInteger(value);
  }

  if (typeName === "double") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (typeName === "boolean") {
    return typeof value === "boolean";
  }

  if (typeName === "String" || typeName === "string") {
    return typeof value === "string";
  }

  if (typeName === "List") {
    if (!Array.isArray(value)) {
      return false;
    }

    if (args.length >= 1) {
      return value.every(function (item) {
        return __upz_matchesType(item, args[0]);
      });
    }

    return true;
  }

  if (typeName === "Map") {
    if (value === null || value === undefined) {
      return false;
    }

    if (value instanceof Map) {
      if (args.length >= 2) {
        for (const entry of value.entries()) {
          if (!__upz_matchesType(entry[0], args[0])) {
            return false;
          }

          if (!__upz_matchesType(entry[1], args[1])) {
            return false;
          }
        }
      }

      return true;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      if (args.length >= 2) {
        for (const key of Object.keys(value)) {
          if (!__upz_matchesType(key, args[0])) {
            return false;
          }

          if (!__upz_matchesType(value[key], args[1])) {
            return false;
          }
        }
      }

      return true;
    }

    return false;
  }

  return value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    value.constructor &&
    value.constructor.name === typeName;
}

function __upz_assertType(value, typeSpec, label) {
  if (!__upz_matchesType(value, typeSpec)) {
    const expected = __upz_typeText(typeSpec);
    const received = __upz_detectType(value);
    throw new TypeError(label + " espera " + expected + ", recebeu " + received + ".");
  }
}
`;

export function transpile(program: Program): string {
  return new Transpiler().transpileProgram(program);
}

class Transpiler {
  private tempIndex = 0;

  transpileProgram(program: Program): string {
    const rootScope: Scope = {
      declaredVariables: new Set<string>(),
      typedVariables: new Map<string, TypeReference>()
    };

    const lines: string[] = [];
    lines.push("'use strict';");
    lines.push("");
    lines.push(RUNTIME_HELPERS.trimEnd());
    lines.push("");

    for (const statement of program.body) {
      lines.push(...this.transpileStatement(statement, rootScope, 0));
    }

    return lines.join("\n");
  }

  private transpileStatement(statement: Statement, scope: Scope, level: number): string[] {
    if (statement.kind === "VariableDeclaration") {
      return this.transpileVariableDeclaration(statement, scope, level);
    }

    if (statement.kind === "AssignmentStatement") {
      return this.transpileAssignment(statement, scope, level);
    }

    if (statement.kind === "FunctionDeclaration") {
      return this.transpileFunctionDeclaration(statement, scope, level);
    }

    if (statement.kind === "ReturnStatement") {
      return this.transpileReturnStatement(statement, scope, level);
    }

    if (statement.kind === "ExpressionStatement") {
      return this.transpileExpressionStatement(statement, level);
    }

    const neverStatement: never = statement;
    throw new Error(`Statement nao suportado: ${JSON.stringify(neverStatement)}`);
  }

  private transpileVariableDeclaration(
    statement: VariableDeclaration,
    scope: Scope,
    level: number
  ): string[] {
    const indent = this.indent(level);
    const valueExpression = this.transpileExpression(statement.initializer);

    scope.declaredVariables.add(statement.name);
    scope.typedVariables.set(statement.name, statement.variableType);

    return [
      `${indent}let ${statement.name} = ${valueExpression};`,
      `${indent}${this.assertTypeCall(statement.name, statement.variableType, statement.name)};`
    ];
  }

  private transpileAssignment(statement: AssignmentStatement, scope: Scope, level: number): string[] {
    const indent = this.indent(level);
    const valueExpression = this.transpileExpression(statement.value);
    const lines: string[] = [];

    if (scope.declaredVariables.has(statement.name)) {
      lines.push(`${indent}${statement.name} = ${valueExpression};`);
    } else {
      scope.declaredVariables.add(statement.name);
      lines.push(`${indent}let ${statement.name} = ${valueExpression};`);
    }

    const knownType = scope.typedVariables.get(statement.name);
    if (knownType) {
      lines.push(`${indent}${this.assertTypeCall(statement.name, knownType, statement.name)};`);
    }

    return lines;
  }

  private transpileFunctionDeclaration(
    statement: FunctionDeclaration,
    parentScope: Scope,
    level: number
  ): string[] {
    const indent = this.indent(level);
    const lines: string[] = [];

    parentScope.declaredVariables.add(statement.name);

    const functionScope: Scope = {
      declaredVariables: new Set<string>(),
      typedVariables: new Map<string, TypeReference>(),
      returnType: statement.returnType
    };

    const params = statement.params.map((param) => param.name).join(", ");
    lines.push(`${indent}function ${statement.name}(${params}) {`);

    const bodyIndent = this.indent(level + 1);
    for (const param of statement.params) {
      functionScope.declaredVariables.add(param.name);
      if (param.paramType) {
        functionScope.typedVariables.set(param.name, param.paramType);
        lines.push(
          `${bodyIndent}${this.assertTypeCall(param.name, param.paramType, param.name)};`
        );
      }
    }

    for (const bodyStatement of statement.body) {
      lines.push(...this.transpileStatement(bodyStatement, functionScope, level + 1));
    }

    lines.push(`${indent}}`);
    return lines;
  }

  private transpileReturnStatement(statement: ReturnStatement, scope: Scope, level: number): string[] {
    const indent = this.indent(level);
    const returnType = scope.returnType;

    if (!returnType) {
      if (!statement.value) {
        return [`${indent}return;`];
      }
      return [`${indent}return ${this.transpileExpression(statement.value)};`];
    }

    const isVoid = returnType.name === "void";
    if (isVoid) {
      if (statement.value) {
        throw new Error("Funcao com retorno void nao pode retornar valor.");
      }
      return [`${indent}return;`];
    }

    if (!statement.value) {
      throw new Error("Funcao tipada precisa retornar um valor.");
    }

    const tempName = `__upz_ret_${this.tempIndex}`;
    this.tempIndex += 1;

    return [
      `${indent}const ${tempName} = ${this.transpileExpression(statement.value)};`,
      `${indent}${this.assertTypeCall(tempName, returnType, "return")};`,
      `${indent}return ${tempName};`
    ];
  }

  private transpileExpressionStatement(statement: ExpressionStatement, level: number): string[] {
    const indent = this.indent(level);
    return [`${indent}${this.transpileExpression(statement.expression)};`];
  }

  private transpileExpression(expression: Expression): string {
    switch (expression.kind) {
      case "IdentifierExpression":
        return expression.name;
      case "NumberLiteralExpression":
        return Number.isInteger(expression.value)
          ? expression.value.toString()
          : expression.value.toString();
      case "StringLiteralExpression":
        return JSON.stringify(expression.value);
      case "BooleanLiteralExpression":
        return expression.value ? "true" : "false";
      case "UnaryExpression":
        return this.transpileUnaryExpression(expression);
      case "BinaryExpression":
        return this.transpileBinaryExpression(expression);
      case "CallExpression":
        return this.transpileCallExpression(expression);
      default: {
        const neverExpression: never = expression;
        throw new Error(`Expressao nao suportada: ${JSON.stringify(neverExpression)}`);
      }
    }
  }

  private transpileUnaryExpression(expression: UnaryExpression): string {
    return `(-${this.transpileExpression(expression.operand)})`;
  }

  private transpileBinaryExpression(expression: BinaryExpression): string {
    const left = this.transpileExpression(expression.left);
    const right = this.transpileExpression(expression.right);
    return `(${left} ${expression.operator} ${right})`;
  }

  private transpileCallExpression(expression: CallExpression): string {
    const args = expression.args.map((arg) => this.transpileExpression(arg)).join(", ");

    if (expression.callee.kind === "IdentifierExpression" && expression.callee.name === "print") {
      return `console.log(${args})`;
    }

    const callee = this.transpileExpression(expression.callee);
    return `${callee}(${args})`;
  }

  private assertTypeCall(valueExpression: string, typeRef: TypeReference, label: string): string {
    return `__upz_assertType(${valueExpression}, ${JSON.stringify(typeRef)}, ${JSON.stringify(label)})`;
  }

  private indent(level: number): string {
    return "  ".repeat(level);
  }
}
