/*
 * Decompiled with CFR 0.152.
 */
class AssignExpr
extends ASTNode {
    ASTNode left;
    ASTNode right;

    AssignExpr(ASTNode aSTNode, ASTNode aSTNode2) {
        this.left = aSTNode;
        this.right = aSTNode2;
    }
}
