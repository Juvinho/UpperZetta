@echo off
setlocal
cd /d "%~dp0"

echo [BUILD] Limpando saida anterior...
if exist out rmdir /s /q out
mkdir out

echo [BUILD] Compilando pacote uvlm.crypto...
javac -encoding UTF-8 -d out ^
  uvlm\src\crypto\DeviceKey.java ^
  uvlm\src\crypto\UZSCrypto.java
if errorlevel 1 ( echo [ERRO] Falha em uvlm.crypto & exit /b 1 )

echo [BUILD] Compilando classes de suporte...
javac -encoding UTF-8 -d out -cp out ^
  ASTNode.java ^
  ArrayAccessExpr.java ^
  ArrayLiteral.java ^
  AssignExpr.java ^
  BinaryExpr.java ^
  CallExpr.java ^
  ClassDecl.java ^
  CodeGen.java ^
  CompDecl.java ^
  ConstDecl.java ^
  ExprStmt.java ^
  ForStmt.java ^
  FuncInfo.java ^
  FunDecl.java ^
  GLPEncoder.java ^
  Identifier.java ^
  IfStmt.java ^
  Lexer.java ^
  Literal.java ^
  MemberAccessExpr.java ^
  NewExpr.java ^
  Opcodes.java ^
  Parser.java ^
  PrintStmt.java ^
  ReturnStmt.java ^
  StructInfo.java ^
  Token.java ^
  UVLM.java ^
  UZBLoader.java ^
  UZBWriter.java ^
  UZSDialog.java ^
  UZSSealEngine.java ^
  UZSUnsealEngine.java ^
  UZSWrongPasswordException.java ^
  VarDecl.java ^
  WhileStmt.java
if errorlevel 1 ( echo [ERRO] Falha nas classes de suporte & exit /b 1 )

echo [BUILD] Compilando Main...
javac -encoding UTF-8 -d out -cp out uvlm\src\Main.java
if errorlevel 1 ( echo [ERRO] Falha em Main.java & exit /b 1 )

echo [BUILD] Empacotando Main.jar...
jar cfm Main.jar MANIFEST.MF -C out .
if errorlevel 1 ( echo [ERRO] Falha ao empacotar JAR & exit /b 1 )

echo [BUILD] Copiando para o IDE...
copy /y Main.jar zettasource-ide\uvlm\Main.jar >nul
if errorlevel 1 ( echo [AVISO] Nao foi possivel copiar para zettasource-ide\uvlm\ )

echo.
echo [OK] Build concluido. Main.jar pronto.
endlocal
