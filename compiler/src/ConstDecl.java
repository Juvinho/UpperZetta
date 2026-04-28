/*
 * Decompiled with CFR 0.152.
 */
class ConstDecl
extends ASTNode {
    String name;
    ASTNode init;

    ConstDecl(String string, ASTNode aSTNode) {
        this.name = string;
        this.init = aSTNode;
    }
}
