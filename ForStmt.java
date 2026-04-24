/*
 * Decompiled with CFR 0.152.
 */
import java.util.List;

class ForStmt
extends ASTNode {
    ASTNode init;
    ASTNode cond;
    ASTNode inc;
    List<ASTNode> body;

    ForStmt(ASTNode aSTNode, ASTNode aSTNode2, ASTNode aSTNode3, List<ASTNode> list) {
        this.init = aSTNode;
        this.cond = aSTNode2;
        this.inc = aSTNode3;
        this.body = list;
    }
}
