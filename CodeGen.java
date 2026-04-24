/*
 * Decompiled with CFR 0.152.
 */
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

class CodeGen {
    ByteArrayOutputStream buf = new ByteArrayOutputStream();
    List<String> constants = new ArrayList<String>();
    List<FuncInfo> funcs = new ArrayList<FuncInfo>();
    Map<String, ASTNode> globalConstants = new HashMap<String, ASTNode>();
    Map<String, StructInfo> structs = new HashMap<String, StructInfo>();
    Map<String, Integer> locals;
    StructInfo currentStruct;

    CodeGen() {
    }

    void emit(byte by) {
        this.buf.write(by);
    }

    void emitShort(int n) {
        this.buf.write(n >> 8);
        this.buf.write(n);
    }

    void emitInt(int n) {
        this.buf.write(n >> 24);
        this.buf.write(n >> 16);
        this.buf.write(n >> 8);
        this.buf.write(n);
    }

    void emitString(String string) {
        byte[] byArray = string.getBytes();
        this.emitShort(byArray.length);
        try {
            this.buf.write(byArray);
        }
        catch (Exception exception) {
            // empty catch block
        }
    }

    int getConst(String string) {
        if (!this.constants.contains(string)) {
            this.constants.add(string);
        }
        return this.constants.indexOf(string);
    }

    void compile(List<ASTNode> list) {
        for (ASTNode aSTNode2 : list) {
            int n;
            StructInfo structInfo;
            if (aSTNode2 instanceof ConstDecl) {
                this.globalConstants.put(((ConstDecl)aSTNode2).name, ((ConstDecl)aSTNode2).init);
            }
            if (aSTNode2 instanceof ClassDecl) {
                ClassDecl aSTNode = (ClassDecl)aSTNode2;
                structInfo = new StructInfo();
                structInfo.name = aSTNode.name;
                for (n = 0; n < aSTNode.fields.size(); ++n) {
                    structInfo.fields.put(aSTNode.fields.get((int)n).name, n);
                }
                this.structs.put(aSTNode.name, structInfo);
            }
            if (!(aSTNode2 instanceof CompDecl)) continue;
            CompDecl aSTNode = (CompDecl)aSTNode2;
            structInfo = new StructInfo();
            structInfo.name = aSTNode.name;
            for (n = 0; n < aSTNode.fields.size(); ++n) {
                structInfo.fields.put(aSTNode.fields.get((int)n).name, n);
            }
            this.structs.put(aSTNode.name, structInfo);
        }
        for (ASTNode aSTNode2 : list) {
            if (!(aSTNode2 instanceof CompDecl)) continue;
            this.emit((byte)28);
            this.emitString(((CompDecl)aSTNode2).name);
            this.emit((byte)5);
            this.emitShort(0);
            this.emit((byte)6);
            this.emitShort(0);
            this.emit((byte)31);
            this.emitString("<init>");
            this.emit((byte)0);
            this.emit((byte)4);
            this.emit((byte)6);
            this.emitShort(0);
            this.emit((byte)31);
            this.emitString("render");
            this.emit((byte)0);
            this.emit((byte)32);
        }
        for (ASTNode aSTNode2 : list) {
            if (aSTNode2 instanceof FunDecl) {
                this.compileFunc(((FunDecl)aSTNode2).name, (FunDecl)aSTNode2, null);
            }
            if (aSTNode2 instanceof ClassDecl) {
                ClassDecl aSTNode = (ClassDecl)aSTNode2;
                for (FunDecl iterator2 : ((ClassDecl)aSTNode2).methods) {
                    this.compileFunc(aSTNode.name + "." + iterator2.name, iterator2, this.structs.get(aSTNode.name));
                }
            }
            if (!(aSTNode2 instanceof CompDecl)) continue;
            CompDecl aSTNode = (CompDecl)aSTNode2;
            int n = this.buf.size();
            this.locals = new HashMap<String, Integer>();
            this.locals.put("this", 0);
            this.currentStruct = this.structs.get(((CompDecl)aSTNode).name);
            for (ASTNode aSTNode3_raw : ((CompDecl)aSTNode).fields) { VarDecl aSTNode3 = (VarDecl)aSTNode3_raw;
                if (aSTNode3.init == null) continue;
                this.emit((byte)6);
                this.emitShort(0);
                this.gen(aSTNode3.init);
                this.emit((byte)30);
                this.emitString(aSTNode3.name);
            }
            this.emit((byte)3);
            this.emit((byte)0);
            this.emit((byte)25);
            this.funcs.add(new FuncInfo(((CompDecl)aSTNode).name + ".<init>", 0, n, this.buf.size() - n));
            for (ASTNode aSTNode3_raw : ((CompDecl)aSTNode).methods) { FunDecl aSTNode3 = (FunDecl)aSTNode3_raw;
                this.compileFunc(((CompDecl)aSTNode).name + "." + ((FunDecl)aSTNode3).name, (FunDecl)aSTNode3, this.structs.get(((CompDecl)aSTNode).name));
            }
        }
    }

    void compileFunc(String string, FunDecl funDecl, StructInfo structInfo) {
        int n = this.buf.size();
        this.locals = new HashMap<String, Integer>();
        this.currentStruct = structInfo;
        if (structInfo != null) {
            this.locals.put("this", 0);
        }
        for (String object : funDecl.params) {
            this.locals.put(object, this.locals.size());
        }
        for (ASTNode aSTNode : funDecl.body) {
            this.gen(aSTNode);
        }
        this.emit((byte)3);
        this.emit((byte)0);
        this.emit((byte)25);
        this.funcs.add(new FuncInfo(string, funDecl.params.size(), n, this.buf.size() - n));
    }

    /*
     * Enabled aggressive block sorting
     */
    void gen(ASTNode aSTNode) {
        if (aSTNode instanceof Literal) {
            Object object = ((Literal)aSTNode).value;
            if (object instanceof Integer) {
                this.emit((byte)1);
                this.emitInt((Integer)object);
                return;
            }
            if (object instanceof Float) {
                this.emit((byte)33);
                this.emitInt(Float.floatToIntBits((Float)object));
                return;
            }
            if (object instanceof String) {
                this.emit((byte)2);
                this.emitShort(this.getConst((String)object));
                return;
            }
            if (object instanceof Boolean) {
                this.emit((byte)3);
                this.emit((byte)((Boolean)object != false ? 1 : 0));
                return;
            }
            return;
        }
        if (aSTNode instanceof ArrayLiteral) {
            ArrayLiteral arr = (ArrayLiteral)aSTNode;
            for (ASTNode el : arr.elements) {
                this.gen(el);
            }
            this.emit((byte)1);
            this.emitInt(arr.elements.size());
            this.emit((byte)34);
            return;
        }
        if (aSTNode instanceof ArrayAccessExpr) {
            ArrayAccessExpr acc = (ArrayAccessExpr)aSTNode;
            this.gen(acc.array);
            this.gen(acc.index);
            this.emit((byte)35);
            return;
        }
        if (aSTNode instanceof Identifier) {
            String string = ((Identifier)aSTNode).name;
            if (this.locals.containsKey(string)) {
                this.emit((byte)6);
                this.emitShort(this.locals.get(string));
                return;
            }
            if (this.globalConstants.containsKey(string)) {
                this.gen(this.globalConstants.get(string));
                return;
            }
            if (this.currentStruct == null) throw new RuntimeException("Unknown var " + string);
            if (!this.currentStruct.fields.containsKey(string)) throw new RuntimeException("Unknown var " + string);
            this.emit((byte)6);
            this.emitShort(0);
            this.emit((byte)29);
            this.emitShort(this.currentStruct.fields.get(string));
            return;
        }
        if (aSTNode instanceof VarDecl) {
            VarDecl varDecl = (VarDecl)aSTNode;
            this.locals.put(varDecl.name, this.locals.size());
            if (varDecl.init != null) {
                this.gen(varDecl.init);
                this.emit((byte)5);
                this.emitShort(this.locals.get(varDecl.name));
                return;
            }
            this.emit((byte)3);
            this.emit((byte)0);
            this.emit((byte)5);
            this.emitShort(this.locals.get(varDecl.name));
            return;
        }
        if (aSTNode instanceof BinaryExpr) {
            BinaryExpr binaryExpr = (BinaryExpr)aSTNode;
            this.gen(binaryExpr.left);
            this.gen(binaryExpr.right);
            switch (binaryExpr.op) {
                case "+": {
                    this.emit((byte)7);
                    return;
                }
                case "-": {
                    this.emit((byte)8);
                    return;
                }
                case "*": {
                    this.emit((byte)9);
                    return;
                }
                case "/": {
                    this.emit((byte)10);
                    return;
                }
                case "==": {
                    this.emit((byte)11);
                    return;
                }
                case "!=": {
                    this.emit((byte)12);
                    return;
                }
                case "<": {
                    this.emit((byte)13);
                    return;
                }
                case "<=": {
                    this.emit((byte)15);
                    return;
                }
                case ">": {
                    this.emit((byte)14);
                    return;
                }
                case ">=": {
                    this.emit((byte)17);
                    return;
                }
                case "&&": {
                    this.emit((byte)18);
                    return;
                }
                case "||": {
                    this.emit((byte)19);
                    return;
                }
            }
            return;
        }
        if (aSTNode instanceof AssignExpr) {
            AssignExpr assignExpr = (AssignExpr)aSTNode;
            this.gen(assignExpr.right);
            if (assignExpr.left instanceof Identifier) {
                String string = ((Identifier)assignExpr.left).name;
                if (this.locals.containsKey(string)) {
                    this.emit((byte)5);
                    this.emitShort(this.locals.get(string));
                    return;
                }
                if (this.currentStruct == null) return;
                if (!this.currentStruct.fields.containsKey(string)) return;
                this.emit((byte)6);
                this.emitShort(0);
                this.emit((byte)30);
                this.emitShort(this.currentStruct.fields.get(string));
                return;
            }
            if (assignExpr.left instanceof ArrayAccessExpr) {
                ArrayAccessExpr acc = (ArrayAccessExpr)assignExpr.left;
                this.gen(acc.array);
                this.gen(acc.index);
                this.emit((byte)36);
                return;
            }
            if (!(assignExpr.left instanceof MemberAccessExpr)) return;
            return;
        } else {
            if (aSTNode instanceof CallExpr) {
                CallExpr callExpr = (CallExpr)aSTNode;
                if (callExpr.callee instanceof Identifier) {
                    Iterator<ASTNode> iterator = callExpr.args.iterator();
                    while (true) {
                        if (!iterator.hasNext()) {
                            this.emit((byte)24);
                            this.emitString(((Identifier)callExpr.callee).name);
                            this.emit((byte)callExpr.args.size());
                            return;
                        }
                        ASTNode aSTNode2 = iterator.next();
                        this.gen(aSTNode2);
                    }
                }
                if (!(callExpr.callee instanceof MemberAccessExpr)) return;
                MemberAccessExpr memberAccessExpr = (MemberAccessExpr)callExpr.callee;
                this.gen(memberAccessExpr.obj);
                Iterator<ASTNode> iterator = callExpr.args.iterator();
                while (true) {
                    if (!iterator.hasNext()) {
                        this.emit((byte)31);
                        this.emitString(memberAccessExpr.prop);
                        this.emit((byte)callExpr.args.size());
                        return;
                    }
                    ASTNode aSTNode3 = iterator.next();
                    this.gen(aSTNode3);
                }
            }
            if (aSTNode instanceof MemberAccessExpr) {
                MemberAccessExpr memberAccessExpr = (MemberAccessExpr)aSTNode;
                this.gen(memberAccessExpr.obj);
                return;
            }
            if (aSTNode instanceof IfStmt) {
                IfStmt ifStmt = (IfStmt)aSTNode;
                this.gen(ifStmt.cond);
                this.emit((byte)23);
                int n = this.buf.size();
                this.emitInt(0);
                for (ASTNode aSTNode4 : ifStmt.thenB) {
                    this.gen(aSTNode4);
                }
                this.emit((byte)21);
                int n2 = this.buf.size();
                this.emitInt(0);
                this.patchInt(n, this.buf.size() - (n + 4));
                if (ifStmt.elseB != null) {
                    for (ASTNode aSTNode5 : ifStmt.elseB) {
                        this.gen(aSTNode5);
                    }
                }
                this.patchInt(n2, this.buf.size() - (n2 + 4));
                return;
            }
            if (aSTNode instanceof WhileStmt) {
                WhileStmt whileStmt = (WhileStmt)aSTNode;
                int n = this.buf.size();
                this.gen(whileStmt.cond);
                this.emit((byte)23);
                int n3 = this.buf.size();
                this.emitInt(0);
                Iterator<ASTNode> iterator = whileStmt.body.iterator();
                while (true) {
                    if (!iterator.hasNext()) {
                        this.emit((byte)21);
                        this.emitInt(n - (this.buf.size() + 4));
                        this.patchInt(n3, this.buf.size() - (n3 + 4));
                        return;
                    }
                    ASTNode aSTNode6 = iterator.next();
                    this.gen(aSTNode6);
                }
            }
            if (aSTNode instanceof ForStmt) {
                ForStmt forStmt = (ForStmt)aSTNode;
                this.gen(forStmt.init);
                int n = this.buf.size();
                this.gen(forStmt.cond);
                this.emit((byte)23);
                int n4 = this.buf.size();
                this.emitInt(0);
                for (ASTNode aSTNode7 : forStmt.body) {
                    this.gen(aSTNode7);
                }
                this.gen(forStmt.inc);
                if (forStmt.inc instanceof CallExpr) {
                    this.emit((byte)4);
                }
                this.emit((byte)21);
                this.emitInt(n - (this.buf.size() + 4));
                this.patchInt(n4, this.buf.size() - (n4 + 4));
                return;
            }
            if (aSTNode instanceof PrintStmt) {
                this.gen(((PrintStmt)aSTNode).expr);
                this.emit((byte)26);
                return;
            }
            if (aSTNode instanceof ReturnStmt) {
                ReturnStmt returnStmt = (ReturnStmt)aSTNode;
                if (returnStmt.expr != null) {
                    this.gen(returnStmt.expr);
                } else {
                    this.emit((byte)3);
                    this.emit((byte)0);
                }
                this.emit((byte)25);
                return;
            }
            if (aSTNode instanceof ExprStmt) {
                ExprStmt exprStmt = (ExprStmt)aSTNode;
                this.gen(exprStmt.expr);
                if (!(exprStmt.expr instanceof CallExpr)) return;
                this.emit((byte)4);
                return;
            }
            if (!(aSTNode instanceof NewExpr)) return;
            this.emit((byte)28);
            this.emitString(((NewExpr)aSTNode).className);
        }
    }

    void patchInt(int n, int n2) {
        byte[] byArray = this.buf.toByteArray();
        byArray[n] = (byte)(n2 >> 24);
        byArray[n + 1] = (byte)(n2 >> 16);
        byArray[n + 2] = (byte)(n2 >> 8);
        byArray[n + 3] = (byte)n2;
        this.buf.reset();
        try {
            this.buf.write(byArray);
        }
        catch (Exception exception) {
            // empty catch block
        }
    }
}
