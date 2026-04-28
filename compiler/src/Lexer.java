/*
 * Decompiled with CFR 0.152.
 */
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class Lexer {
    List<Token> tokens = new ArrayList<Token>();

    Lexer(String string) {
        String[] stringArray = new String[]{"KWPACKAGE", "\\bpackage\\b", "KWIN", "\\bin\\b", "KWLET", "\\blet\\b", "KWCONST", "\\be\\.const\\b", "KWFUN", "\\bfun\\b", "KWRETURN", "\\breturn\\b", "KWCLASS", "\\bclass\\.public\\b", "KWCOMP", "\\bcomponente\\b", "KWIF", "\\bif\\b", "KWELSE", "\\belse\\b", "KWWHILE", "\\bwhile\\b", "KWFOR", "\\bfor\\b", "KWPRINT", "\\bSystem\\.print\\b", "KWTRUE", "\\btrue\\b", "KWFALSE", "\\bfalse\\b", "KWNEW", "\\bnew\\b", "ARROW", ">>", "OPLOG", "&&|\\|\\|", "OPREL", "==|!=|<=|>=|<|>", "OPARITH", "[\\+\\-\\*/]", "ASSIGN", "=", "IDENT", "[a-zA-Z_]\\w*", "STRING", "\"[^\"]*\"", "NUMBER", "\\d+(\\.\\d+)?", "DOT", "\\.", "PUNCT", "[{}();,\\[\\]]", "WHITESPACE", "\\s+"};
        StringBuilder stringBuilder = new StringBuilder();
        for (int i = 0; i < stringArray.length; i += 2) {
            stringBuilder.append("|(?<").append(stringArray[i]).append(">").append(stringArray[i + 1]).append(")");
        }
        Matcher matcher = Pattern.compile(stringBuilder.substring(1)).matcher(string);
        int n = 1;
        int n2 = 1;
        block1: while (matcher.find()) {
            for (int i = 0; i < stringArray.length; i += 2) {
                String string2;
                if (matcher.group(stringArray[i]) == null) continue;
                if (!stringArray[i].equals("WHITESPACE")) {
                    this.tokens.add(new Token(stringArray[i], matcher.group(), n, n2));
                }
                if ((string2 = matcher.group()).contains("\n")) {
                    n += string2.split("\n", -1).length - 1;
                    n2 = string2.length() - string2.lastIndexOf(10);
                    continue block1;
                }
                n2 += string2.length();
                continue block1;
            }
        }
    }
}
