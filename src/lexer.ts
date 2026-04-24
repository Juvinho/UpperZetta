import { RESERVED_KEYWORDS, Token, TokenType } from "./token";

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
  "(": "LPAREN",
  ")": "RPAREN",
  ",": "COMMA",
  ":": "COLON",
  "=": "EQUAL",
  "+": "PLUS",
  "-": "MINUS",
  "*": "STAR",
  "/": "SLASH",
  "<": "LT",
  ">": "GT"
};

export function tokenize(source: string): Token[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const tokens: Token[] = [];
  const indentStack: number[] = [0];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex] ?? "";
    const lineNumber = lineIndex + 1;

    if (rawLine.includes("\t")) {
      throw new Error(
        `Tabs nao sao suportadas para indentacao (linha ${lineNumber}).`
      );
    }

    if (rawLine.trim() === "" || rawLine.trimStart().startsWith("#")) {
      continue;
    }

    const leadingSpaces = countLeadingSpaces(rawLine);
    const currentIndent = indentStack[indentStack.length - 1];

    if (leadingSpaces > currentIndent) {
      indentStack.push(leadingSpaces);
      tokens.push(makeToken("INDENT", "<INDENT>", lineNumber, 1));
    } else if (leadingSpaces < currentIndent) {
      while (indentStack.length > 1 && leadingSpaces < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        tokens.push(makeToken("DEDENT", "<DEDENT>", lineNumber, 1));
      }

      if (leadingSpaces !== indentStack[indentStack.length - 1]) {
        throw new Error(`Indentacao inconsistente na linha ${lineNumber}.`);
      }
    }

    tokenizeLine(rawLine.slice(leadingSpaces), lineNumber, leadingSpaces + 1, tokens);
    tokens.push(makeToken("NEWLINE", "\\n", lineNumber, rawLine.length + 1));
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push(makeToken("DEDENT", "<DEDENT>", lines.length, 1));
  }

  tokens.push(makeToken("EOF", "<EOF>", lines.length + 1, 1));
  return tokens;
}

function tokenizeLine(line: string, lineNumber: number, baseColumn: number, output: Token[]): void {
  let cursor = 0;

  while (cursor < line.length) {
    const char = line[cursor] ?? "";
    const column = baseColumn + cursor;

    if (char === " " || char === "\r") {
      cursor += 1;
      continue;
    }

    if (char === "#") {
      break;
    }

    if (char === "-" && line[cursor + 1] === ">") {
      output.push(makeToken("ARROW", "->", lineNumber, column));
      cursor += 2;
      continue;
    }

    if (char === "\"") {
      const [value, consumed] = readString(line.slice(cursor), lineNumber, column);
      output.push(makeToken("STRING", value, lineNumber, column));
      cursor += consumed;
      continue;
    }

    if (isDigit(char)) {
      const [value, consumed] = readNumber(line.slice(cursor));
      output.push(makeToken("NUMBER", value, lineNumber, column));
      cursor += consumed;
      continue;
    }

    if (isIdentifierStart(char)) {
      const [value, consumed] = readIdentifier(line.slice(cursor));
      const keywordType = RESERVED_KEYWORDS[value];
      output.push(makeToken(keywordType ?? "IDENTIFIER", value, lineNumber, column));
      cursor += consumed;
      continue;
    }

    const singleType = SINGLE_CHAR_TOKENS[char];
    if (singleType) {
      output.push(makeToken(singleType, char, lineNumber, column));
      cursor += 1;
      continue;
    }

    throw new Error(`Caractere inesperado '${char}' na linha ${lineNumber}, coluna ${column}.`);
  }
}

function readString(input: string, line: number, column: number): [string, number] {
  let escaped = false;
  let value = "";

  for (let i = 1; i < input.length; i += 1) {
    const char = input[i] ?? "";

    if (escaped) {
      if (char === "n") {
        value += "\n";
      } else if (char === "t") {
        value += "\t";
      } else if (char === "\"" || char === "\\") {
        value += char;
      } else {
        value += char;
      }
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      return [value, i + 1];
    }

    value += char;
  }

  throw new Error(`String nao terminada na linha ${line}, coluna ${column}.`);
}

function readNumber(input: string): [string, number] {
  let cursor = 0;
  let dotSeen = false;

  while (cursor < input.length) {
    const char = input[cursor] ?? "";

    if (char === ".") {
      if (dotSeen) {
        break;
      }
      dotSeen = true;
      cursor += 1;
      continue;
    }

    if (!isDigit(char)) {
      break;
    }

    cursor += 1;
  }

  return [input.slice(0, cursor), cursor];
}

function readIdentifier(input: string): [string, number] {
  let cursor = 0;
  while (cursor < input.length && isIdentifierPart(input[cursor] ?? "")) {
    cursor += 1;
  }
  return [input.slice(0, cursor), cursor];
}

function countLeadingSpaces(line: string): number {
  let count = 0;
  while (count < line.length && line[count] === " ") {
    count += 1;
  }
  return count;
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

function makeToken(type: TokenType, value: string, line: number, column: number): Token {
  return { type, value, line, column };
}
