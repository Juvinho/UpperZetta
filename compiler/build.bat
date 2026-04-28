@echo off
setlocal
cd /d "%~dp0"

echo [BUILD] Limpando saida anterior...
if exist out rmdir /s /q out
mkdir out

echo [BUILD] Limpando saida anterior...
if exist out rmdir /s /q out
mkdir out

echo [BUILD] Compilando classes de suporte...
javac -encoding UTF-8 -d out -cp out ^
  src\ASTNode.java ^
  src\ArrayAccessExpr.java ^
  src\ArrayLiteral.java ^
  src\AssignExpr.java ^
  src\Base85Custom.java ^
  src\BinaryExpr.java ^
  src\CallExpr.java ^
  src\ClassDecl.java ^
  src\CodeGen.java ^
  src\CompDecl.java ^
  src\ConstDecl.java ^
  src\ExprStmt.java ^
  src\ForStmt.java ^
  src\FuncInfo.java ^
  src\FunDecl.java ^
  src\GLPEncoder.java ^
  src\Identifier.java ^
  src\IfStmt.java ^
  src\Lexer.java ^
  src\Literal.java ^
  src\MemberAccessExpr.java ^
  src\NewExpr.java ^
  src\Opcodes.java ^
  src\Parser.java ^
  src\PrintStmt.java ^
  src\ReturnStmt.java ^
  src\StructInfo.java ^
  src\Token.java ^
  src\UVLM.java ^
  src\UZBLoader.java ^
  src\UZBWriter.java ^
  src\UZSCrypto.java ^
  src\UZSDialog.java ^
  src\UZSSealEngine.java ^
  src\UZSUnsealEngine.java ^
  src\UZSWrongPasswordException.java ^
  src\VarDecl.java ^
  src\WhileStmt.java
if errorlevel 1 ( echo [ERRO] Falha nas classes de suporte & exit /b 1 )

echo [BUILD] Compilando Main...
javac -encoding UTF-8 -d out -cp out src\Main.java
if errorlevel 1 ( echo [ERRO] Falha em Main.java & exit /b 1 )

echo [BUILD] Empacotando Main.jar...
jar cfm Main.jar MANIFEST.MF -C out .
if errorlevel 1 ( echo [ERRO] Falha ao empacotar JAR & exit /b 1 )

echo [BUILD] Copiando para o IDE...
copy /y Main.jar ..\zettasource-ide\uvlm\Main.jar >nul
if errorlevel 1 ( echo [AVISO] Nao foi possivel copiar para zettasource-ide\uvlm\ )

echo.
echo [OK] Build concluido. Main.jar pronto.
endlocal
