export type TokenType =
  | "DEF"
  | "RETURN"
  | "TRUE"
  | "FALSE"
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "NEWLINE"
  | "INDENT"
  | "DEDENT"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "COLON"
  | "ARROW"
  | "EQUAL"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "LT"
  | "GT"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

export const RESERVED_KEYWORDS: Record<string, TokenType> = {
  def: "DEF",
  return: "RETURN",
  true: "TRUE",
  false: "FALSE"
};
