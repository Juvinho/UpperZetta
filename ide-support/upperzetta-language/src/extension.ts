import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const hoverProvider = vscode.languages.registerHoverProvider('upperzetta', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*(\\.([a-zA-Z_][a-zA-Z0-9_]*))?|>>/);
            const word = document.getText(range);

            const tooltips: { [key: string]: string } = {
                'e.const': '🔒 Constante imutável UpperZetta. Não pode ser reatribuída após declaração.',
                'fun': 'Declaração de função. Sintaxe: fun nome(param.tipo) >> tipoRetorno { }',
                'componente': 'Componente UI UpperZetta. O método render() é executado automaticamente.',
                '>>': 'Operador de tipo de retorno. Indica o tipo que a função retorna.',
                'System.print': 'Imprime um valor no console UVLM. Aceita str, int, boolean e concatenação.',
                'class.public': 'Declara uma classe pública UpperZetta com campos e métodos.',
                'package.in': 'Define o namespace do arquivo. Ex: package in app.logic;'
            };

            if (tooltips[word]) {
                return new vscode.Hover(tooltips[word]);
            }
            return null;
        }
    });

    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.text = '⚡ UpperZetta 1.0 | UVLM Ready';
    statusBar.command = 'upperzetta.showDocs';
    statusBar.show();

    const compileCmd = vscode.commands.registerCommand('upperzetta.compile', () => {
        if (vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage(`Compiling ${vscode.window.activeTextEditor.document.fileName}`);
            // Ex: execute java Main compile
        }
    });

    const runCmd = vscode.commands.registerCommand('upperzetta.run', () => {
        if (vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage(`Running ${vscode.window.activeTextEditor.document.fileName}`);
            // Ex: execute java Main build
        }
    });

    const disasmCmd = vscode.commands.registerCommand('upperzetta.disasm', () => {
        if (vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage(`Disassembling .uzb`);
        }
    });

    const glpCmd = vscode.commands.registerCommand('upperzetta.glp', () => {
        if (vscode.window.activeTextEditor) {
            vscode.window.showInformationMessage(`Showing GLP Report`);
        }
    });

    context.subscriptions.push(hoverProvider, statusBar, compileCmd, runCmd, disasmCmd, glpCmd);
}

export function deactivate() {}