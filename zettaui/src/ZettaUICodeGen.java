import java.util.*;
import java.util.stream.*;

/**
 * Transpilador UpperZetta → JavaScript para componentes ZettaUI.
 *
 * Ativado quando o arquivo .uz contém `import zetta.web.*`.
 * Recebe o mesmo AST do compilador UVLM e produz um arquivo .js + .html.
 *
 * Regras de promoção de escopo:
 *   Variáveis ZettaUI declaradas em render() e referenciadas em outros
 *   métodos são promovidas para `this._nome` (campos de instância).
 *
 * Regra async:
 *   Métodos que contenham chamadas a `.sleep()` são gerados como `async`.
 *   Chamadas após um `.sleep()` recebem `await` automaticamente.
 */
public class ZettaUICodeGen {

    // ── Detecção ZettaUI ──────────────────────────────────────────────────

    private static final Set<String> UI_METHODS = Set.of(
        "hug", "mood", "unmood", "sleep", "wake", "onClick", "on"
    );
    private static final Set<String> ANIM_METHODS = Set.of(
        "appear", "leave", "breath", "bounce", "blink", "apply"
    );
    private static final Set<String> VALID_MOODS = Set.of("happy", "shy", "sleepy");

    // Variáveis ZettaUI promovidas para this._name por serem cross-method
    private final Set<String> promoted = new LinkedHashSet<>();

    // Variáveis ZettaUI locais do contexto de geração atual
    private final Set<String> uiLocals = new LinkedHashSet<>();

    // Nome do componente sendo transpilado
    private String componentName = "";

    // Métodos que contêm .sleep() e precisam ser async
    private final Set<String> asyncMethods = new LinkedHashSet<>();

    // ── Ponto de entrada ──────────────────────────────────────────────────

    /**
     * Transpila um AST completo para JavaScript.
     * Retorna o JS gerado como String.
     */
    public String transpile(List<ASTNode> ast, String sourceFile) {
        // 1ª passagem: coletar promoções e métodos async
        for (ASTNode node : ast) {
            if (node instanceof ClassDecl) {
                analyzeComponent((ClassDecl) node);
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("// Gerado pelo transpilador ZettaUI — UpperZetta\n");
        sb.append("// Fonte: ").append(sourceFile).append("\n\n");
        sb.append("import { ZettaUI, ZettaAnim } from '../runtime/zettaui.js';\n\n");

        for (ASTNode node : ast) {
            if (node instanceof VarDecl) {
                sb.append(genTopLevelVar((VarDecl) node)).append("\n");
            } else if (node instanceof ClassDecl) {
                sb.append(genComponent((ClassDecl) node)).append("\n");
            }
        }

        // Boilerplate de montagem (último componente encontrado)
        if (!componentName.isEmpty()) {
            sb.append("// ── Montagem ─────────────────────────────────────────\n");
            sb.append("const _app = new ").append(componentName).append("();\n");
            sb.append("const _root = _app.render();\n");
            sb.append("if (!(_root instanceof ZettaUI.ZettaNode)) {\n");
            sb.append("  ZettaUI._err(\n");
            sb.append("    'render() não retornou um dad.\\n'\n");
            sb.append("    + 'Dica: todo componente precisa de um lar.'\n");
            sb.append("  );\n");
            sb.append("}\n");
            sb.append("ZettaUI.mount(_root);\n");
        }

        return sb.toString();
    }

    // ── 1ª passagem: análise ──────────────────────────────────────────────

    private void analyzeComponent(ClassDecl comp) {
        componentName = comp.name;

        // Coletar nomes das variáveis ZettaUI declaradas em render()
        Set<String> renderLocals = new LinkedHashSet<>();
        FunDecl render = findMethod(comp, "render");
        if (render != null) {
            collectUILocals(render.body, renderLocals);
        }

        // Verificar quais dessas aparecem em outros métodos
        for (FunDecl method : comp.methods) {
            if (method.name.equals("render")) continue;
            boolean hasSleep = containsSleep(method.body);
            if (hasSleep) asyncMethods.add(method.name);
            for (String local : renderLocals) {
                if (referencesName(method.body, local)) {
                    promoted.add(local);
                }
            }
        }
    }

    private void collectUILocals(List<ASTNode> body, Set<String> out) {
        for (ASTNode node : body) {
            if (node instanceof VarDecl v && isUIInit(v.init)) {
                out.add(v.name);
            }
        }
    }

    private boolean isUIInit(ASTNode expr) {
        if (!(expr instanceof CallExpr call)) return false;
        if (!(call.callee instanceof MemberAccessExpr mac)) return false;
        if (!(mac.obj instanceof Identifier id)) return false;
        return id.name.equals("ZettaUI");
    }

    private boolean containsSleep(List<ASTNode> body) {
        for (ASTNode n : body) {
            if (n instanceof ExprStmt es && isSleepCall(es.expr)) return true;
        }
        return false;
    }

    private boolean isSleepCall(ASTNode expr) {
        if (!(expr instanceof CallExpr call)) return false;
        if (!(call.callee instanceof MemberAccessExpr mac)) return false;
        return mac.prop.equals("sleep");
    }

    private boolean referencesName(List<ASTNode> body, String name) {
        for (ASTNode n : body) {
            if (n instanceof ExprStmt es && exprReferences(es.expr, name)) return true;
            if (n instanceof IfStmt is) {
                if (referencesName(is.thenB, name)) return true;
                if (is.elseB != null && referencesName(is.elseB, name)) return true;
            }
        }
        return false;
    }

    private boolean exprReferences(ASTNode expr, String name) {
        if (expr instanceof Identifier id) return id.name.equals(name);
        if (expr instanceof CallExpr call) {
            if (exprReferences(call.callee, name)) return true;
            for (ASTNode a : call.args) if (exprReferences(a, name)) return true;
        }
        if (expr instanceof MemberAccessExpr mac) return exprReferences(mac.obj, name);
        return false;
    }

    private FunDecl findMethod(ClassDecl comp, String name) {
        return comp.methods.stream().filter(m -> m.name.equals(name)).findFirst().orElse(null);
    }

    // ── Geração de nó raiz ────────────────────────────────────────────────

    private String genTopLevelVar(VarDecl v) {
        return "const " + jsName(v.name) + " = " + genExpr(v.init) + ";";
    }

    private String genComponent(ClassDecl comp) {
        StringBuilder sb = new StringBuilder();
        sb.append("class ").append(comp.name).append(" {\n\n");

        // constructor com campos
        sb.append("  constructor() {\n");
        for (VarDecl f : comp.fields) {
            sb.append("    this.").append(jsName(f.name))
              .append(" = ").append(genExpr(f.init)).append(";\n");
        }
        // promoted ZettaUI refs inicializadas como null
        for (String p : promoted) {
            sb.append("    this._").append(p).append(" = null;\n");
        }
        sb.append("  }\n\n");

        // métodos
        for (FunDecl m : comp.methods) {
            sb.append(genMethod(m)).append("\n");
        }

        sb.append("}\n");
        return sb.toString();
    }

    private String genMethod(FunDecl m) {
        uiLocals.clear();
        boolean isRender = m.name.equals("render");
        boolean isAsync  = asyncMethods.contains(m.name);

        // Coleta locais ZettaUI desta função
        if (isRender) {
            collectUILocals(m.body, uiLocals);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("  ");
        if (isAsync) sb.append("async ");
        sb.append(m.name).append("(");
        sb.append(String.join(", ", m.params));
        sb.append(") {\n");

        sb.append(genBody(m.body, isRender, "    "));

        // Verificação render(): garantir retorno ZettaUI.dad
        if (isRender) {
            sb.append("\n");
            sb.append("    // ZettaUI garante que render() retorne um dad\n");
        }

        sb.append("  }\n");
        return sb.toString();
    }

    private String genBody(List<ASTNode> body, boolean inRender, String indent) {
        StringBuilder sb = new StringBuilder();
        for (ASTNode node : body) {
            sb.append(genStmt(node, inRender, indent));
        }
        return sb.toString();
    }

    // ── Statements ────────────────────────────────────────────────────────

    private String genStmt(ASTNode node, boolean inRender, String indent) {
        if (node instanceof VarDecl v) {
            return genVarDecl(v, inRender, indent);
        }
        if (node instanceof ExprStmt es) {
            return genExprStmt(es, indent);
        }
        if (node instanceof ReturnStmt rs) {
            return indent + "return " + genExpr(rs.expr) + ";\n";
        }
        if (node instanceof IfStmt is) {
            return genIfStmt(is, inRender, indent);
        }
        return indent + "// [stmt não suportado: " + node.getClass().getSimpleName() + "]\n";
    }

    private String genVarDecl(VarDecl v, boolean inRender, String indent) {
        boolean isUINode = isUIInit(v.init);

        if (inRender && promoted.contains(v.name)) {
            // Promovida → this._name
            return indent + "this._" + v.name + " = " + genExpr(v.init) + ";\n";
        }

        String keyword = isUINode ? "const" : "let";
        String ref     = inRender && uiLocals.contains(v.name)
                         ? "_" + v.name    // prefixo _ para nós locais
                         : jsName(v.name);
        return indent + keyword + " " + ref + " = " + genExpr(v.init) + ";\n";
    }

    private String genExprStmt(ExprStmt es, String indent) {
        // Detecta sleep() → gera await
        if (isSleepCall(es.expr)) {
            return indent + "await " + genExpr(es.expr) + ";\n";
        }
        return indent + genExpr(es.expr) + ";\n";
    }

    private String genIfStmt(IfStmt is, boolean inRender, String indent) {
        StringBuilder sb = new StringBuilder();
        sb.append(indent).append("if (").append(genExpr(is.cond)).append(") {\n");
        sb.append(genBody(is.thenB, inRender, indent + "  "));
        sb.append(indent).append("}");
        if (is.elseB != null && !is.elseB.isEmpty()) {
            sb.append(" else {\n");
            sb.append(genBody(is.elseB, inRender, indent + "  "));
            sb.append(indent).append("}");
        }
        sb.append("\n");
        return sb.toString();
    }

    // ── Expressões ────────────────────────────────────────────────────────

    private String genExpr(ASTNode node) {
        if (node instanceof Literal l) {
            return genLiteral(l);
        }
        if (node instanceof Identifier id) {
            return genIdentifier(id);
        }
        if (node instanceof BinaryExpr b) {
            return genExpr(b.left) + " " + mapOp(b.op) + " " + genExpr(b.right);
        }
        if (node instanceof AssignExpr a) {
            return genExpr(a.left) + " = " + genExpr(a.right);
        }
        if (node instanceof MemberAccessExpr mac) {
            return genExpr(mac.obj) + "." + mac.prop;
        }
        if (node instanceof CallExpr call) {
            return genCall(call);
        }
        return "/* expr? */";
    }

    private String genLiteral(Literal l) {
        if (l.value instanceof String s) return "\"" + s.replace("\"", "\\\"") + "\"";
        if (l.value instanceof Boolean b) return b.toString();
        if (l.value == null) return "null";
        return l.value.toString();
    }

    private String genIdentifier(Identifier id) {
        // promoted → this._name
        if (promoted.contains(id.name)) return "this._" + id.name;
        // ui local → _name (prefixo para não colidir com JS)
        if (uiLocals.contains(id.name)) return "_" + id.name;
        // campo do componente
        return id.name;
    }

    private String genCall(CallExpr call) {
        // ZettaAnim.método(node, ...)
        if (call.callee instanceof MemberAccessExpr mac &&
            mac.obj instanceof Identifier id &&
            id.name.equals("ZettaAnim")) {
            return genAnimCall(mac.prop, call.args);
        }

        // nó.método(args) — validações em mood()
        if (call.callee instanceof MemberAccessExpr mac &&
            mac.prop.equals("mood") &&
            call.args.size() == 1 &&
            call.args.get(0) instanceof Literal l &&
            l.value instanceof String mood) {
            if (!VALID_MOODS.contains(mood)) {
                System.err.println(
                    "✗ Erro: mood(\"" + mood + "\") não reconhecido.\n" +
                    "  Dica: humores válidos são happy, shy e sleepy."
                );
            }
        }

        // onClick(fun métodoNome()) → () => this.método()
        if (call.callee instanceof MemberAccessExpr mac &&
            mac.prop.equals("onClick") &&
            call.args.size() == 1) {
            ASTNode arg0 = call.args.get(0);
            String fn = resolveCallbackArg(arg0);
            return genExpr(mac.obj) + ".onClick(() => " + fn + ")";
        }

        // Chamada genérica
        String callee = genExpr(call.callee);
        String args   = call.args.stream().map(this::genExpr).collect(Collectors.joining(", "));
        return callee + "(" + args + ")";
    }

    private String genAnimCall(String method, List<ASTNode> args) {
        if (args.isEmpty()) return "ZettaAnim." + method + "()";
        String target = genExpr(args.get(0));
        StringBuilder sb = new StringBuilder("ZettaAnim.").append(method).append("(").append(target);
        for (int i = 1; i < args.size(); i++) {
            sb.append(", ").append(genExpr(args.get(i)));
        }
        sb.append(")");
        return sb.toString();
    }

    /**
     * Resolve `fun métodoNome()` como referência de callback.
     * Em uz: btn.onClick(fun handleClick()) → JS: () => this.handleClick()
     */
    private String resolveCallbackArg(ASTNode arg) {
        if (arg instanceof CallExpr call &&
            call.callee instanceof Identifier id) {
            return "this." + id.name + "()";
        }
        return genExpr(arg);
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private String jsName(String uzName) {
        // uz usa kebab/snake — JS usa camelCase (sem transformação por ora)
        return uzName;
    }

    private String mapOp(String uzOp) {
        return switch (uzOp) {
            case "==" -> "===";
            case "!=" -> "!==";
            default   -> uzOp;
        };
    }
}
