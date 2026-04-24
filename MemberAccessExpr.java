/*
 * Decompiled with CFR 0.152.
 */
class MemberAccessExpr
extends ASTNode {
    ASTNode obj;
    String prop;

    MemberAccessExpr(ASTNode aSTNode, String string) {
        this.obj = aSTNode;
        this.prop = string;
    }
}
