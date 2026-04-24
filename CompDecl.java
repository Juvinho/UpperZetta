/*
 * Decompiled with CFR 0.152.
 */
import java.util.List;

class CompDecl
extends ASTNode {
    String name;
    List<VarDecl> fields;
    List<FunDecl> methods;

    CompDecl(String string, List<VarDecl> list, List<FunDecl> list2) {
        this.name = string;
        this.fields = list;
        this.methods = list2;
    }
}
