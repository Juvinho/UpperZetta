import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip())

base_dir = "upperzetta-ide-support"
vscode_dir = os.path.join(base_dir, "upperzetta-language")

# package.json
pkg_json = """{
  "name": "upperzetta-language",
  "displayName": "UpperZetta Language",
  "description": "Syntax highlighting, icons and language support for UpperZetta (.uz, .up, .upz)",
  "version": "1.0.0",
  "publisher": "zettasource",
  "icon": "icons/upperzetta-logo.svg",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Programming Languages", "Themes"],
  "keywords": ["upperzetta", "uz", "upz", "zettasource", "uvlm"],
  "activationEvents": ["onLanguage:upperzetta"],
  "main": "./src/extension.js",
  "contributes": {
    "languages": [
      {
        "id": "upperzetta",
        "aliases": ["UpperZetta", "uz"],
        "extensions": [".uz", ".up", ".upz"],
        "configuration": "./language-configuration.json",
        "icon": {
          "light": "./icons/uz-icon-light.svg",
          "dark":  "./icons/uz-icon-dark.svg"
        }
      }
    ],
    "grammars": [
      {
        "language": "upperzetta",
        "scopeName": "source.upperzetta",
        "path": "./syntaxes/upperzetta.tmLanguage.json"
      }
    ],
    "iconThemes": [
      {
        "id": "upperzetta-icons",
        "label": "UpperZetta File Icons",
        "path": "./icons/upperzetta-icon-theme.json"
      }
    ],
    "themes": [
      {
        "label": "UpperZetta Dark",
        "uiTheme": "vs-dark",
        "path": "./themes/upperzetta-dark.json"
      }
    ]
  }
}"""
create_file(os.path.join(vscode_dir, "package.json"), pkg_json)

# language-configuration.json
lang_config = """{
  "comments": {
    "lineComment": "//",
    "blockComment": ["/*", "*/"]
  },
  "brackets": [
    ["{", "}"],
    ["(", ")"],
    ["[", "]"]
  ],
  "autoClosingPairs": [
    { "open": "{", "close": "}" },
    { "open": "(", "close": ")" },
    { "open": "[", "close": "]" },
    { "open": "\\"", "close": "\\"" }
  ],
  "surroundingPairs": [
    ["{", "}"], ["(", ")"], ["\\"", "\\""]
  ],
  "indentationRules": {
    "increaseIndentPattern": "\\\\{\\\\s*$",
    "decreaseIndentPattern": "^\\\\s*\\\\}"
  },
  "onEnterRules": [
    {
      "beforeText": "\\\\{\\\\s*$",
      "action": { "indent": "indent" }
    }
  ],
  "wordPattern": "[a-zA-Z_][a-zA-Z0-9_]*(\\\\.([a-zA-Z_][a-zA-Z0-9_]*))?"
}"""
create_file(os.path.join(vscode_dir, "language-configuration.json"), lang_config)

# syntaxes/upperzetta.tmLanguage.json
syntax = """{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "UpperZetta",
  "patterns": [
    {
      "name": "keyword.control.upperzetta",
      "match": "\\\\b(package|in|fun|return|class\\\\.public|componente)\\\\b"
    },
    {
      "name": "keyword.declaration.upperzetta",
      "match": "\\\\b(let|e\\\\.const)\\\\b"
    },
    {
      "name": "keyword.control.flow.upperzetta",
      "match": "\\\\b(if|else|while|for)\\\\b"
    },
    {
      "name": "storage.type.upperzetta",
      "match": "\\\\b(str|int|boolean|float|array|void)\\\\b"
    },
    {
      "name": "constant.language.boolean.upperzetta",
      "match": "\\\\b(true|false)\\\\b"
    },
    {
      "name": "constant.language.null.upperzetta",
      "match": "\\\\b(null)\\\\b"
    },
    {
      "name": "string.quoted.double.upperzetta",
      "begin": "\\"",
      "end": "\\"",
      "patterns": [
        {
          "name": "constant.character.escape.upperzetta",
          "match": "\\\\\\\\."
        }
      ]
    },
    {
      "name": "constant.numeric.integer.upperzetta",
      "match": "\\\\b\\\\d+(\\\\.\\\\d+)?\\\\b"
    },
    {
      "name": "comment.line.double-slash.upperzetta",
      "match": "//.*$"
    },
    {
      "name": "comment.block.upperzetta",
      "begin": "/\\\\*",
      "end": "\\\\*/"
    },
    {
      "name": "entity.name.function.upperzetta",
      "match": "(?<=fun\\\\s+)[a-zA-Z_][a-zA-Z0-9_]*"
    },
    {
      "name": "entity.name.class.upperzetta",
      "match": "(?<=class\\\\.public\\\\s+)[a-zA-Z_][a-zA-Z0-9_]*"
    },
    {
      "name": "entity.name.component.upperzetta",
      "match": "(?<=componente\\\\s+)[a-zA-Z_][a-zA-Z0-9_]*"
    },
    {
      "name": "support.function.builtin.upperzetta",
      "match": "\\\\bSystem\\\\.print\\\\b"
    },
    {
      "name": "entity.name.namespace.upperzetta",
      "match": "(?<=package\\\\s+in\\\\s+)[a-zA-Z0-9_\\\\.]+"
    },
    {
      "name": "keyword.operator.upperzetta",
      "match": "==|!=|>=|<=|&&|\\\\|\\\\||>|<|\\\\+|-|\\\\*|/"
    },
    {
      "name": "keyword.operator.return-type.upperzetta",
      "match": ">>"
    },
    {
      "name": "punctuation.type-separator.upperzetta",
      "match": "\\\\."
    }
  ],
  "scopeName": "source.upperzetta"
}"""
create_file(os.path.join(vscode_dir, "syntaxes", "upperzetta.tmLanguage.json"), syntax)

# themes/upperzetta-dark.json
theme = """{
  "name": "UpperZetta Dark",
  "colors": {
    "editor.background": "#0F0F17",
    "editorCursor.foreground": "#E53030",
    "editor.lineHighlightBackground": "#1A1A2E"
  },
  "tokenColors": [
    {
      "name": "Keywords",
      "scope": ["keyword.control.upperzetta", "keyword.declaration.upperzetta", "keyword.operator.return-type.upperzetta"],
      "settings": { "foreground": "#E53030" }
    },
    {
      "name": "Types",
      "scope": ["storage.type.upperzetta"],
      "settings": { "foreground": "#5BBCFF" }
    },
    {
      "name": "Strings",
      "scope": ["string.quoted.double.upperzetta"],
      "settings": { "foreground": "#A8FF78" }
    },
    {
      "name": "Numbers",
      "scope": ["constant.numeric.integer.upperzetta"],
      "settings": { "foreground": "#FFD166" }
    },
    {
      "name": "Comments",
      "scope": ["comment.line.double-slash.upperzetta", "comment.block.upperzetta"],
      "settings": { "foreground": "#555577" }
    },
    {
      "name": "Functions",
      "scope": ["entity.name.function.upperzetta"],
      "settings": { "foreground": "#FF9F43" }
    },
    {
      "name": "Classes / Components",
      "scope": ["entity.name.class.upperzetta", "entity.name.component.upperzetta"],
      "settings": { "foreground": "#C792EA" }
    },
    {
      "name": "System.print",
      "scope": ["support.function.builtin.upperzetta"],
      "settings": { "foreground": "#00D2D3" }
    }
  ]
}"""
create_file(os.path.join(vscode_dir, "themes", "upperzetta-dark.json"), theme)

# icons
svg_dark = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect width="16" height="16" rx="2" fill="#1E1E1E"/>
  <text x="8" y="10.5" font-family="'Arial Narrow', 'Roboto Condensed', sans-serif" font-weight="700" font-style="italic" font-size="7.5" fill="#E53030" text-anchor="middle" transform="skewX(-8)" stroke="#E5303033" stroke-width="0.5">UZ</text>
</svg>"""
create_file(os.path.join(vscode_dir, "icons", "uz-icon-dark.svg"), svg_dark)

svg_light = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <rect width="16" height="16" rx="2" fill="#F5F5F5"/>
  <text x="8" y="10.5" font-family="'Arial Narrow', 'Roboto Condensed', sans-serif" font-weight="700" font-style="italic" font-size="7.5" fill="#C01616" text-anchor="middle" transform="skewX(-8)" stroke="#C0161633" stroke-width="0.5">UZ</text>
</svg>"""
create_file(os.path.join(vscode_dir, "icons", "uz-icon-light.svg"), svg_light)

svg_logo = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="16" fill="#1A1A2E"/>
  <text x="64" y="70" font-family="'Arial Narrow', 'Roboto Condensed', sans-serif" font-weight="700" font-style="italic" font-size="60" fill="#E53030" text-anchor="middle" transform="skewX(-8)" filter="drop-shadow(0 4px 8px #E5303044)">UZ</text>
  <text x="64" y="105" font-family="'Arial Narrow', 'Roboto Condensed', sans-serif" font-size="14" fill="#888" text-anchor="middle" letter-spacing="3">UpperZetta</text>
</svg>"""
create_file(os.path.join(vscode_dir, "icons", "upperzetta-logo.svg"), svg_logo)

icon_theme = """{
  "iconDefinitions": {
    "_uz_dark": { "iconPath": "./uz-icon-dark.svg" },
    "_uz_light": { "iconPath": "./uz-icon-light.svg" }
  },
  "fileExtensions": {
    "uz": "_uz_dark",
    "up": "_uz_dark",
    "upz": "_uz_dark"
  },
  "light": {
    "fileExtensions": {
      "uz": "_uz_light",
      "up": "_uz_light",
      "upz": "_uz_light"
    }
  }
}"""
create_file(os.path.join(vscode_dir, "icons", "upperzetta-icon-theme.json"), icon_theme)

# src/extension.ts
ext_ts = """import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const hoverProvider = vscode.languages.registerHoverProvider('upperzetta', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position, /[a-zA-Z_][a-zA-Z0-9_]*(\\\\.([a-zA-Z_][a-zA-Z0-9_]*))?|>>/);
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
"""
create_file(os.path.join(vscode_dir, "src", "extension.ts"), ext_ts)

# intellij plugin
intellij_dir = os.path.join(base_dir, "intellij-plugin")
create_file(os.path.join(intellij_dir, "resources", "META-INF", "plugin.xml"), '''<idea-plugin>
  <id>com.zettasource.upperzetta</id>
  <name>UpperZetta Language Support</name>
  <vendor>ZettaSource</vendor>
  <description>Provides syntax highlighting and language features for UpperZetta.</description>
</idea-plugin>''')
create_file(os.path.join(intellij_dir, "src", "UpperZettaFileType.kt"), '''package com.zettasource.upperzetta
import com.intellij.openapi.fileTypes.LanguageFileType

class UpperZettaFileType : LanguageFileType(UpperZettaLanguage.INSTANCE) {
    override fun getName() = "UpperZetta File"
    override fun getDescription() = "UpperZetta Language File"
    override fun getDefaultExtension() = "uz"
    override fun getIcon() = UpperZettaIcons.FILE
}''')
create_file(os.path.join(intellij_dir, "src", "UpperZettaLanguage.kt"), '''package com.zettasource.upperzetta
import com.intellij.lang.Language

class UpperZettaLanguage : Language("UpperZetta") {
    companion object {
        val INSTANCE = UpperZettaLanguage()
    }
}''')

# os integration
os_dir = os.path.join(base_dir, "os-integration")
create_file(os.path.join(os_dir, "windows", "upperzetta.reg"), '''Windows Registry Editor Version 5.00
[HKEY_CLASSES_ROOT\\.uz]
@="UpperZettaFile"
[HKEY_CLASSES_ROOT\\UpperZettaFile\\DefaultIcon]
@="C:\\\\Path\\\\To\\\\uz-icon.ico"''')

create_file(os.path.join(os_dir, "linux", "upperzetta.desktop"), '''[Desktop Entry]
Type=Application
Name=UpperZetta
MimeType=text/x-upperzetta;
Icon=uz-icon''')

create_file(os.path.join(os_dir, "macos", "Info.plist.snippet"), '''<dict>
    <key>CFBundleDocumentTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeExtensions</key>
            <array>
                <string>uz</string>
                <string>up</string>
                <string>upz</string>
            </array>
            <key>CFBundleTypeIconFile</key>
            <string>uz-icon.icns</string>
            <key>CFBundleTypeName</key>
            <string>UpperZetta Source File</string>
        </dict>
    </array>
</dict>''')

print("Created ide extensions.")
