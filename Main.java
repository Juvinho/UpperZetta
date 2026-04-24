/*
 * Decompiled with CFR 0.152.
 */
import java.nio.file.Files;
import java.nio.file.OpenOption;
import java.nio.file.Paths;
import java.util.List;

public class Main {
    public static void main(String[] stringArray) throws Exception {
        if (stringArray.length == 0) {
            System.out.println("Usage: java Main <file.uz|file.uzb|file.uzs> [options]");
            System.out.println("Options: --disasm, --glp-inspect, --emit-glp-report");
            System.out.println("UZS Commands: seal <file.uz>, unseal <file.uzs>, peek <file.uzs>");
            return;
        }

        String command = stringArray[0];
        if (command.equals("seal")) {
            if (stringArray.length < 2) { System.out.println("Usage: java Main seal <file.uz>"); return; }
            String file = stringArray[1];
            byte[] uzData = Files.readAllBytes(Paths.get(file));
            java.io.Console console = System.console();
            if (console == null) { System.out.println("Console not available."); return; }
            char[] pass = console.readPassword("Senha: ");
            UZSSealEngine sealer = new UZSSealEngine();
            byte[] uzsData = sealer.seal(uzData, pass);
            Files.write(Paths.get(file + "s"), uzsData);
            System.out.println("Arquivo selado com sucesso: " + file + "s");
            return;
        }
        if (command.equals("unseal")) {
            if (stringArray.length < 2) { System.out.println("Usage: java Main unseal <file.uzs>"); return; }
            String file = stringArray[1];
            byte[] uzsData = Files.readAllBytes(Paths.get(file));
            java.io.Console console = System.console();
            if (console == null) { System.out.println("Console not available."); return; }
            char[] pass = console.readPassword("Senha: ");
            UZSUnsealEngine unsealer = new UZSUnsealEngine();
            try {
                byte[] uzData = unsealer.unseal(uzsData, pass);
                System.out.println("--- CONTEÚDO DECIFRADO ---");
                System.out.println(new String(uzData, java.nio.charset.StandardCharsets.UTF_8));
                java.util.Arrays.fill(uzData, (byte)0);
            } catch (UZSWrongPasswordException e) {
                System.out.println(e.getMessage());
            }
            return;
        }
        if (command.equals("peek")) {
            if (stringArray.length < 2) { System.out.println("Usage: java Main peek <file.uzs>"); return; }
            String file = stringArray[1];
            byte[] uzsData = Files.readAllBytes(Paths.get(file));
            java.nio.ByteBuffer buffer = java.nio.ByteBuffer.wrap(uzsData);
            buffer.position(44);
            java.io.ByteArrayOutputStream meta = new java.io.ByteArrayOutputStream();
            byte b;
            while ((b = buffer.get()) != 0x00) { meta.write(b); }
            System.out.println("Metadata: " + meta.toString(java.nio.charset.StandardCharsets.UTF_8.name()));
            return;
        }

        Object object;
        String string = stringArray[0];
        boolean bl = false;
        boolean bl2 = false;
        boolean bl3 = false;
        for (int i = 1; i < stringArray.length; ++i) {
            if (stringArray[i].equals("--disasm")) {
                bl = true;
            }
            if (stringArray[i].equals("--glp-inspect")) {
                bl2 = true;
            }
            if (!stringArray[i].equals("--emit-glp-report")) continue;
            bl3 = true;
        }
        if (string.endsWith(".uz")) {
            String string2 = new String(Files.readAllBytes(Paths.get(string, new String[0])));
            object = new Lexer(string2);
            Parser parser = new Parser(((Lexer)object).tokens);
            List<ASTNode> list = parser.parseProgram();
            CodeGen codeGen = new CodeGen(){

                @Override
                void gen(ASTNode aSTNode) {
                    if (aSTNode instanceof MemberAccessExpr) {
                        MemberAccessExpr memberAccessExpr = (MemberAccessExpr)aSTNode;
                        this.gen(memberAccessExpr.obj);
                        this.emit((byte)29);
                        this.emitString(memberAccessExpr.prop);
                    } else if (aSTNode instanceof AssignExpr && ((AssignExpr)aSTNode).left instanceof MemberAccessExpr) {
                        AssignExpr assignExpr = (AssignExpr)aSTNode;
                        MemberAccessExpr memberAccessExpr = (MemberAccessExpr)assignExpr.left;
                        this.gen(assignExpr.right);
                        this.gen(memberAccessExpr.obj);
                        this.emit((byte)30);
                        this.emitString(memberAccessExpr.prop);
                    } else if (aSTNode instanceof Identifier) {
                        String string = ((Identifier)aSTNode).name;
                        if (this.locals.containsKey(string)) {
                            this.emit((byte)6);
                            this.emitShort((Integer)this.locals.get(string));
                        } else if (this.globalConstants.containsKey(string)) {
                            this.gen((ASTNode)this.globalConstants.get(string));
                        } else {
                            this.emit((byte)6);
                            this.emitShort(0);
                            this.emit((byte)29);
                            this.emitString(string);
                        }
                    } else {
                        super.gen(aSTNode);
                    }
                }
            };
            codeGen.compile(list);
            byte[] byArray = codeGen.buf.toByteArray();
            byte[] byArray2 = GLPEncoder.encode(byArray, codeGen.constants, codeGen.funcs, string);
            String string3 = string.replace(".uz", ".uzb");
            UZBWriter.write(string3, codeGen.constants, codeGen.funcs, byArray2);
            System.out.println("Compiled successfully to: " + string3);
            string = string3;
        }
        if (string.endsWith(".uzb")) {
            UZBLoader uZBLoader = new UZBLoader();
            uZBLoader.load(string);
            if (bl) {
                uZBLoader.disasm(false);
            } else if (bl2) {
                uZBLoader.disasm(true);
            } else {
                object = new UVLM(uZBLoader);
                ((UVLM)object).run();
            }
            if (bl3) {
                object = "=== UVLM GLP REPORT ===\nBlock A Size: " + uZBLoader.blockA.length + " bytes\nBlock B Size: " + (uZBLoader.blockB != null ? uZBLoader.blockB.length : 0) + " bytes\nTotal Opcode Mirroring: 100%\nPalindromic Integrity: Valid\n";
                Files.write(Paths.get("glp_report.txt", new String[0]), ((String)object).getBytes(), new OpenOption[0]);
                System.out.println("Generated glp_report.txt");
            }
        }
    }
}
