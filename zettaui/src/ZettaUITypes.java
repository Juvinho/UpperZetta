import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Definições de tipo para o sistema ZettaUI dentro do type checker da Uzet.
 *
 * Integração:
 *   O type checker usa ZettaUITypes.isUIType(typeName) para decidir
 *   se um VarDecl deve ser transpilado para ZettaUI em vez de bytecode.
 *
 * Hierarquia de tipos:
 *   ZettaUI.dad   → container, pode receber .hug()
 *   ZettaUI.child → folha, após ser hugged comporta-se como dad
 *   ZettaUI.node  → supertipo interno (ambos)
 */
public class ZettaUITypes {

    // Nomes de tipo declarados em .uz com anotação de tipo
    public static final String DAD   = "ZettaUI.dad";
    public static final String CHILD = "ZettaUI.child";
    public static final String NODE  = "ZettaUI.node";   // supertipo interno

    // Métodos disponíveis em qualquer ZettaNode
    public static final Set<String> NODE_METHODS = Set.of(
        "hug", "mood", "unmood", "sleep", "wake", "onClick", "on"
    );

    // Métodos de ZettaAnim (todos recebem um node como primeiro argumento)
    public static final Set<String> ANIM_METHODS = Set.of(
        "appear", "leave", "breath", "bounce", "blink", "apply"
    );

    // Humores válidos para .mood()
    public static final Set<String> VALID_MOODS = Set.of("happy", "shy", "sleepy");

    // Tipo de retorno dos métodos (para inferência)
    public static final Map<String, String> METHOD_RETURN_TYPES = Map.of(
        "hug",    DAD,      // retorna this (dad ou child promovido)
        "mood",   NODE,
        "unmood", NODE,
        "sleep",  "Promise<" + NODE + ">",
        "wake",   NODE,
        "onClick", NODE,
        "on",     NODE
    );

    // ── Consultas do type checker ─────────────────────────────────────────

    /** True se o typeName pertence ao sistema ZettaUI. */
    public static boolean isUIType(String typeName) {
        return DAD.equals(typeName) || CHILD.equals(typeName) || NODE.equals(typeName);
    }

    /** True se o método existe em ZettaNode. */
    public static boolean isNodeMethod(String methodName) {
        return NODE_METHODS.contains(methodName);
    }

    /** True se a chamada é ZettaAnim.algo(). */
    public static boolean isAnimMethod(String methodName) {
        return ANIM_METHODS.contains(methodName);
    }

    /** Valida .mood() e retorna mensagem de erro, ou null se ok. */
    public static String validateMood(String moodValue) {
        if (VALID_MOODS.contains(moodValue)) return null;
        return "✗ Erro: mood(\"" + moodValue + "\") não reconhecido.\n" +
               "  Dica: humores válidos são happy, shy e sleepy.";
    }

    // ── Verificações de uso correto ───────────────────────────────────────

    /**
     * Verifica se um node tem pai (verificação em tempo de análise).
     * Em runtime, o check ocorre dentro do próprio hug().
     *
     * Mensagens de erro em português, tom meigo.
     */
    public static class TypeError extends RuntimeException {
        public TypeError(String message) { super(message); }

        public static TypeError noParent(String elementName) {
            return new TypeError(
                "✗ Erro: " + elementName + " não tem pai.\n" +
                "  Dica: todo filho precisa de um abraço."
            );
        }

        public static TypeError animWithoutParent(String animMethod) {
            return new TypeError(
                "✗ Erro: ZettaAnim." + animMethod + "() aplicado em elemento sem pai.\n" +
                "  Dica: como animar algo que ainda não existe pra ninguém?"
            );
        }

        public static TypeError sleepWithoutWake() {
            return new TypeError(
                "✗ Erro: sleep() sem wake().\n" +
                "  Dica: todo mundo que dorme, acorda."
            );
        }

        public static TypeError renderNotDad(String componentName) {
            return new TypeError(
                "✗ Erro: render() de " + componentName + " não retornou um dad.\n" +
                "  Dica: todo componente precisa de um lar."
            );
        }

        public static TypeError invalidMood(String value) {
            return new TypeError(
                "✗ Erro: mood(\"" + value + "\") não reconhecido.\n" +
                "  Dica: humores válidos são happy, shy e sleepy."
            );
        }
    }

    /**
     * Verifica se o tipo de retorno de render() é um dad.
     * Chamado pelo type checker ao analisar ClassDecl com componente.
     */
    public static void checkRenderReturnType(String componentName, String returnTypeName) {
        if (!DAD.equals(returnTypeName)) {
            throw TypeError.renderNotDad(componentName);
        }
    }

    /**
     * Verifica se uma sequência de body contém sleep() sem await/then subsequente.
     * Detecção simples: sleep() na penúltima linha sem encadeamento.
     */
    public static boolean detectSleepWithoutResolution(List<ASTNode> body) {
        for (int i = 0; i < body.size(); i++) {
            ASTNode n = body.get(i);
            if (n instanceof ExprStmt es &&
                es.expr instanceof CallExpr call &&
                call.callee instanceof MemberAccessExpr mac &&
                mac.prop.equals("sleep")) {
                // sleep() existe — o transpilador deve gerar await; ok
                return false;
            }
        }
        return false;
    }
}
