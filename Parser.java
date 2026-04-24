/*
 * Decompiled with CFR 0.152.
 */
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class Parser {
    List<Token> tokens;
    int pos = 0;

    Parser(List<Token> list) {
        this.tokens = list;
    }

    Token current() {
        return this.pos < this.tokens.size() ? this.tokens.get(this.pos) : null;
    }

    Token prev() {
        return this.tokens.get(this.pos - 1);
    }

    boolean match(String string) {
        return this.match(string, null);
    }

    boolean match(String string, String string2) {
        Token token = this.current();
        if (token != null && token.type.equals(string) && (string2 == null || token.val.equals(string2))) {
            ++this.pos;
            return true;
        }
        return false;
    }

    Token consume(String string) {
        return this.consume(string, null);
    }

    Token consume(String string, String string2) {
        if (this.match(string, string2)) {
            return this.prev();
        }
        Token token = this.current();
        throw new RuntimeException("Syntax error at " + (String)(token != null ? token.line + ":" + token.col : "EOF") + " expected " + (string2 != null ? string2 : string));
    }

    List<ASTNode> parseProgram() {
        ArrayList<ASTNode> arrayList = new ArrayList<ASTNode>();
        while (this.pos < this.tokens.size()) {
            ASTNode aSTNode;
            String string;
            if (this.match("KWPACKAGE")) {
                this.consume("KWIN");
                this.consume("IDENT");
                while (this.match("DOT")) {
                    this.consume("IDENT");
                }
                this.consume("PUNCT", ";");
                continue;
            }
            if (this.match("KWCONST")) {
                string = this.consume((String)"IDENT").val;
                this.consume("DOT");
                this.consume("IDENT");
                this.consume("ASSIGN");
                aSTNode = this.parseExpr();
                this.consume("PUNCT", ";");
                arrayList.add(new ConstDecl(string, aSTNode));
                continue;
            }
            if (this.match("KWLET")) {
                string = this.consume((String)"IDENT").val;
                this.consume("DOT");
                this.consume("IDENT");
                aSTNode = null;
                if (this.match("ASSIGN")) {
                    aSTNode = this.parseExpr();
                }
                this.consume("PUNCT", ";");
                arrayList.add(new VarDecl(string, aSTNode));
                continue;
            }
            if (this.match("KWFUN")) {
                arrayList.add(this.parseFun());
                continue;
            }
            if (this.match("KWCLASS")) {
                arrayList.add(this.parseClass());
                continue;
            }
            if (this.match("KWCOMP")) {
                arrayList.add(this.parseComp());
                continue;
            }
            throw new RuntimeException("Unexpected " + this.current().val);
        }
        return arrayList;
    }

    FunDecl parseFun() {
        String string = this.consume((String)"IDENT").val;
        this.consume("PUNCT", "(");
        ArrayList<String> arrayList = new ArrayList<String>();
        if (!this.match("PUNCT", ")")) {
            do {
                arrayList.add(this.consume((String)"IDENT").val);
                this.consume("DOT");
                this.consume("IDENT");
            } while (this.match("PUNCT", ","));
            this.consume("PUNCT", ")");
        }
        if (this.match("ARROW")) {
            this.consume("IDENT");
        }
        this.consume("PUNCT", "{");
        return new FunDecl(string, arrayList, this.parseBlock());
    }

    ClassDecl parseClass() {
        String string = this.consume((String)"IDENT").val;
        this.consume("PUNCT", "{");
        ArrayList<VarDecl> arrayList = new ArrayList<VarDecl>();
        ArrayList<FunDecl> arrayList2 = new ArrayList<FunDecl>();
        while (!this.match("PUNCT", "}")) {
            if (this.match("KWLET")) {
                String string2 = this.consume((String)"IDENT").val;
                this.consume("DOT");
                this.consume("IDENT");
                this.consume("PUNCT", ";");
                arrayList.add(new VarDecl(string2, null));
                continue;
            }
            if (!this.match("KWFUN")) continue;
            arrayList2.add(this.parseFun());
        }
        return new ClassDecl(string, arrayList, arrayList2);
    }

    CompDecl parseComp() {
        String string = this.consume((String)"IDENT").val;
        this.consume("PUNCT", "{");
        ArrayList<VarDecl> arrayList = new ArrayList<VarDecl>();
        ArrayList<FunDecl> arrayList2 = new ArrayList<FunDecl>();
        while (!this.match("PUNCT", "}")) {
            if (this.match("KWLET")) {
                String string2 = this.consume((String)"IDENT").val;
                this.consume("DOT");
                this.consume("IDENT");
                ASTNode aSTNode = null;
                if (this.match("ASSIGN")) {
                    aSTNode = this.parseExpr();
                }
                this.consume("PUNCT", ";");
                arrayList.add(new VarDecl(string2, aSTNode));
                continue;
            }
            if (!this.match("KWFUN")) continue;
            arrayList2.add(this.parseFun());
        }
        return new CompDecl(string, arrayList, arrayList2);
    }

    List<ASTNode> parseBlock() {
        ArrayList<ASTNode> arrayList = new ArrayList<ASTNode>();
        while (!this.match("PUNCT", "}")) {
            arrayList.add(this.parseStmt());
        }
        return arrayList;
    }

    ASTNode parseStmt() {
        if (this.match("KWIF")) {
            this.consume("PUNCT", "(");
            ASTNode aSTNode = this.parseExpr();
            this.consume("PUNCT", ")");
            List<ASTNode> list = this.match("PUNCT", "{") ? this.parseBlock() : Arrays.asList(this.parseStmt());
            List<ASTNode> list2 = null;
            if (this.match("KWELSE")) {
                if (this.match("KWIF")) {
                    --this.pos;
                    list2 = Arrays.asList(this.parseStmt());
                } else {
                    list2 = this.match("PUNCT", "{") ? this.parseBlock() : Arrays.asList(this.parseStmt());
                }
            }
            return new IfStmt(aSTNode, list, list2);
        }
        if (this.match("KWWHILE")) {
            this.consume("PUNCT", "(");
            ASTNode aSTNode = this.parseExpr();
            this.consume("PUNCT", ")");
            return new WhileStmt(aSTNode, this.match("PUNCT", "{") ? this.parseBlock() : Arrays.asList(this.parseStmt()));
        }
        if (this.match("KWFOR")) {
            ASTNode aSTNode;
            Object object;
            this.consume("PUNCT", "(");
            ASTNode aSTNode2 = null;
            if (this.match("KWLET")) {
                object = this.consume((String)"IDENT").val;
                this.consume("DOT");
                this.consume("IDENT");
                aSTNode = null;
                if (this.match("ASSIGN")) {
                    aSTNode = this.parseExpr();
                }
                this.consume("PUNCT", ";");
                aSTNode2 = new VarDecl((String)object, aSTNode);
            } else {
                aSTNode2 = new ExprStmt(this.parseExpr());
            }
            object = this.parseExpr();
            this.consume("PUNCT", ";");
            aSTNode = this.parseExpr();
            this.consume("PUNCT", ")");
            return new ForStmt(aSTNode2, (ASTNode)object, aSTNode, this.match("PUNCT", "{") ? this.parseBlock() : Arrays.asList(this.parseStmt()));
        }
        if (this.match("KWPRINT")) {
            this.consume("PUNCT", "(");
            ASTNode aSTNode = this.parseExpr();
            this.consume("PUNCT", ")");
            this.consume("PUNCT", ";");
            return new PrintStmt(aSTNode);
        }
        if (this.match("KWRETURN")) {
            ASTNode aSTNode;
            ASTNode aSTNode3 = aSTNode = this.match("PUNCT", ";") ? null : this.parseExpr();
            if (aSTNode != null) {
                this.consume("PUNCT", ";");
            }
            return new ReturnStmt(aSTNode);
        }
        if (this.match("KWLET")) {
            String string = this.consume((String)"IDENT").val;
            this.consume("DOT");
            this.consume("IDENT");
            ASTNode aSTNode = null;
            if (this.match("ASSIGN")) {
                aSTNode = this.parseExpr();
            }
            this.consume("PUNCT", ";");
            return new VarDecl(string, aSTNode);
        }
        ASTNode aSTNode = this.parseExpr();
        this.consume("PUNCT", ";");
        return new ExprStmt(aSTNode);
    }

    ASTNode parseExpr() {
        return this.parseAssign();
    }

    ASTNode parseAssign() {
        ASTNode aSTNode = this.parseLog();
        if (this.match("ASSIGN")) {
            return new AssignExpr(aSTNode, this.parseAssign());
        }
        return aSTNode;
    }

    ASTNode parseLog() {
        ASTNode aSTNode = this.parseEq();
        while (this.match("OPLOG")) {
            String string = this.prev().val;
            aSTNode = new BinaryExpr(aSTNode, string, this.parseEq());
        }
        return aSTNode;
    }

    ASTNode parseEq() {
        ASTNode aSTNode = this.parseRel();
        while (this.match("OPREL", "==") || this.match("OPREL", "!=")) {
            String string = this.prev().val;
            aSTNode = new BinaryExpr(aSTNode, string, this.parseRel());
        }
        return aSTNode;
    }

    ASTNode parseRel() {
        ASTNode aSTNode = this.parseAdd();
        while (this.match("OPREL", "<") || this.match("OPREL", "<=") || this.match("OPREL", ">") || this.match("OPREL", ">=")) {
            String string = this.prev().val;
            aSTNode = new BinaryExpr(aSTNode, string, this.parseAdd());
        }
        return aSTNode;
    }

    ASTNode parseAdd() {
        ASTNode aSTNode = this.parseMul();
        while (this.match("OPARITH", "+") || this.match("OPARITH", "-")) {
            String string = this.prev().val;
            aSTNode = new BinaryExpr(aSTNode, string, this.parseMul());
        }
        return aSTNode;
    }

    ASTNode parseMul() {
        ASTNode aSTNode = this.parseCall();
        while (this.match("OPARITH", "*") || this.match("OPARITH", "/")) {
            String string = this.prev().val;
            aSTNode = new BinaryExpr(aSTNode, string, this.parseCall());
        }
        return aSTNode;
    }

    ASTNode parseCall() {
        ASTNode aSTNode = this.parsePrim();
        while (true) {
            if (this.match("PUNCT", "(")) {
                ArrayList<ASTNode> arrayList = new ArrayList<ASTNode>();
                if (!this.match("PUNCT", ")")) {
                    do {
                        arrayList.add(this.parseExpr());
                    } while (this.match("PUNCT", ","));
                    this.consume("PUNCT", ")");
                }
                aSTNode = new CallExpr(aSTNode, arrayList);
                continue;
            }
            if (this.match("DOT")) {
                aSTNode = new MemberAccessExpr(aSTNode, this.consume((String)"IDENT").val);
                continue;
            }
            if (this.match("PUNCT", "[")) {
                ASTNode index = this.parseExpr();
                this.consume("PUNCT", "]");
                aSTNode = new ArrayAccessExpr(aSTNode, index);
                continue;
            }
            break;
        }
        return aSTNode;
    }

    ASTNode parsePrim() {
        if (this.match("NUMBER")) {
            String val = this.prev().val;
            if (val.contains(".")) return new Literal(Float.parseFloat(val));
            return new Literal(Integer.parseInt(val));
        }
        if (this.match("STRING")) {
            return new Literal(this.prev().val.substring(1, this.prev().val.length() - 1));
        }
        if (this.match("KWTRUE")) {
            return new Literal(true);
        }
        if (this.match("KWFALSE")) {
            return new Literal(false);
        }
        if (this.match("KWNEW")) {
            String string = this.consume((String)"IDENT").val;
            this.consume("PUNCT", "(");
            this.consume("PUNCT", ")");
            return new NewExpr(string);
        }
        if (this.match("IDENT")) {
            return new Identifier(this.prev().val);
        }
        if (this.match("PUNCT", "(")) {
            ASTNode aSTNode = this.parseExpr();
            this.consume("PUNCT", ")");
            return aSTNode;
        }
        if (this.match("PUNCT", "[")) {
            ArrayList<ASTNode> arrayList = new ArrayList<ASTNode>();
            if (!this.match("PUNCT", "]")) {
                do {
                    arrayList.add(this.parseExpr());
                } while (this.match("PUNCT", ","));
                this.consume("PUNCT", "]");
            }
            return new ArrayLiteral(arrayList);
        }
        throw new RuntimeException("Expected expression at " + this.current().line + ":" + this.current().col);
    }
}
