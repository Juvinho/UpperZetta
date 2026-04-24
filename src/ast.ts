export interface Program {
  kind: "Program";
  body: Statement[];
}

export type Statement =
  | VariableDeclaration
  | AssignmentStatement
  | FunctionDeclaration
  | ReturnStatement
  | ExpressionStatement;

export interface TypeReference {
  name: string;
  typeArguments: TypeReference[];
}

export interface VariableDeclaration {
  kind: "VariableDeclaration";
  name: string;
  variableType: TypeReference;
  initializer: Expression;
}

export interface AssignmentStatement {
  kind: "AssignmentStatement";
  name: string;
  value: Expression;
}

export interface FunctionParameter {
  name: string;
  paramType?: TypeReference;
}

export interface FunctionDeclaration {
  kind: "FunctionDeclaration";
  name: string;
  params: FunctionParameter[];
  returnType?: TypeReference;
  body: Statement[];
}

export interface ReturnStatement {
  kind: "ReturnStatement";
  value?: Expression;
}

export interface ExpressionStatement {
  kind: "ExpressionStatement";
  expression: Expression;
}

export type Expression =
  | IdentifierExpression
  | NumberLiteralExpression
  | StringLiteralExpression
  | BooleanLiteralExpression
  | BinaryExpression
  | UnaryExpression
  | CallExpression;

export interface IdentifierExpression {
  kind: "IdentifierExpression";
  name: string;
}

export interface NumberLiteralExpression {
  kind: "NumberLiteralExpression";
  value: number;
}

export interface StringLiteralExpression {
  kind: "StringLiteralExpression";
  value: string;
}

export interface BooleanLiteralExpression {
  kind: "BooleanLiteralExpression";
  value: boolean;
}

export interface BinaryExpression {
  kind: "BinaryExpression";
  operator: "+" | "-" | "*" | "/";
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  kind: "UnaryExpression";
  operator: "-";
  operand: Expression;
}

export interface CallExpression {
  kind: "CallExpression";
  callee: Expression;
  args: Expression[];
}
