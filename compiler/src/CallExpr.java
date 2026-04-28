/*
 * Decompiled with CFR 0.152.
 */
import java.util.List;

class CallExpr
extends ASTNode {
    ASTNode callee;
    List<ASTNode> args;

    CallExpr(ASTNode aSTNode, List<ASTNode> list) {
        this.callee = aSTNode;
        this.args = list;
    }
}
