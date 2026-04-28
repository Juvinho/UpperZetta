/*
 * Decompiled with CFR 0.152.
 */
import java.util.List;

class FunDecl
extends ASTNode {
    String name;
    List<String> params;
    List<ASTNode> body;

    FunDecl(String string, List<String> list, List<ASTNode> list2) {
        this.name = string;
        this.params = list;
        this.body = list2;
    }
}
