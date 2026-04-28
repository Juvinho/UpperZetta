/*
 * Decompiled with CFR 0.152.
 */
import java.util.List;

class IfStmt
extends ASTNode {
    ASTNode cond;
    List<ASTNode> thenB;
    List<ASTNode> elseB;

    IfStmt(ASTNode aSTNode, List<ASTNode> list, List<ASTNode> list2) {
        this.cond = aSTNode;
        this.thenB = list;
        this.elseB = list2;
    }
}
