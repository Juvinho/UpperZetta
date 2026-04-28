/*
 * Decompiled with CFR 0.152.
 */
class BinaryExpr
extends ASTNode {
    ASTNode left;
    ASTNode right;
    String op;

    BinaryExpr(ASTNode aSTNode, String string, ASTNode aSTNode2) {
        this.left = aSTNode;
        this.op = string;
        this.right = aSTNode2;
    }
}
