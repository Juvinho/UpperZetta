/*
 * Decompiled with CFR 0.152.
 */
class VarDecl
extends ASTNode {
    String name;
    ASTNode init;

    VarDecl(String string, ASTNode aSTNode) {
        this.name = string;
        this.init = aSTNode;
    }
}
