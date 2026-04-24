#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { compile } from "./compiler";

function printUsage(): void {
  console.log("Upeerzetta CLI");
  console.log("");
  console.log("Comandos:");
  console.log("  upeerzetta run <arquivo.upz>");
  console.log("  upeerzetta build <arquivo.upz> [saida.js]");
  console.log("  upeerzetta tokens <arquivo.upz>");
  console.log("  upeerzetta ast <arquivo.upz>");
  console.log("");
  console.log("Exemplo:");
  console.log("  node dist/cli.js run examples/ola.upz");
}

function requireInputPath(inputPath: string | undefined, command: string): string {
  if (!inputPath) {
    throw new Error(`O comando '${command}' precisa de um caminho de arquivo.`);
  }

  return resolve(inputPath);
}

function defaultOutputPath(inputPath: string): string {
  const dir = dirname(inputPath);
  const baseName = basename(inputPath, extname(inputPath));
  return resolve(dir, `${baseName}.js`);
}

function runCommand(command: string, inputArg?: string, outputArg?: string): void {
  const inputPath = requireInputPath(inputArg, command);
  const source = readFileSync(inputPath, "utf8");
  const result = compile(source);

  switch (command) {
    case "run": {
      const sourceTag = inputPath.replace(/\\/g, "/");
      const executable = `${result.javascript}\n//# sourceURL=${sourceTag}`;
      const fn = new Function(executable);
      fn();
      return;
    }

    case "build": {
      const outputPath = outputArg ? resolve(outputArg) : defaultOutputPath(inputPath);
      writeFileSync(outputPath, result.javascript, "utf8");
      console.log(`Arquivo gerado: ${outputPath}`);
      return;
    }

    case "tokens": {
      for (const token of result.tokens) {
        console.log(
          `${token.line}:${token.column}\t${token.type.padEnd(10, " ")}\t${JSON.stringify(token.value)}`
        );
      }
      return;
    }

    case "ast": {
      console.log(JSON.stringify(result.ast, null, 2));
      return;
    }

    default:
      throw new Error(`Comando desconhecido: ${command}`);
  }
}

const [, , command, inputArg, outputArg] = process.argv;

if (!command || command === "-h" || command === "--help" || command === "help") {
  printUsage();
  process.exit(0);
}

try {
  runCommand(command, inputArg, outputArg);
} catch (error) {
  const message = error instanceof Error ? error.message : "Erro desconhecido.";
  console.error(`Erro: ${message}`);
  process.exit(1);
}
