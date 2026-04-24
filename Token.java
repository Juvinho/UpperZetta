/*
 * Decompiled with CFR 0.152.
 */
class Token {
    String type;
    String val;
    int line;
    int col;

    Token(String string, String string2, int n, int n2) {
        this.type = string;
        this.val = string2;
        this.line = n;
        this.col = n2;
    }
}
