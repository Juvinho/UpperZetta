/*
 * Decompiled with CFR 0.152.
 */
import java.util.List;

class WhileStmt
extends ASTNode {
    ASTNode cond;
    List<ASTNode> body;

    WhileStmt(ASTNode aSTNode, List<ASTNode> list) {
        this.cond = aSTNode;
        this.body = list;
    }
}
