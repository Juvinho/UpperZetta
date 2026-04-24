import { tokenize } from "./lexer";
import { parse } from "./parser";
import { transpile } from "./transpiler";
import { Program } from "./ast";
import { Token } from "./token";

export interface CompileResult {
  tokens: Token[];
  ast: Program;
  javascript: string;
}

export function compile(source: string): CompileResult {
  const tokens = tokenize(source);
  const ast = parse(tokens);
  const javascript = transpile(ast);

  return {
    tokens,
    ast,
    javascript
  };
}
