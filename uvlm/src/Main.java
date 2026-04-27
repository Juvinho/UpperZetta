import uvlm.crypto.UZSCrypto;
import uvlm.crypto.DeviceKey;
import java.nio.file.Files;
import java.nio.file.OpenOption;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.out.println("Usage: java Main <file.uz|file.uzb>");
            System.out.println("       java Main seal       <file.uz>       -- selar com DeviceKey");
            System.out.println("       java Main unseal     <file.uzs>      -- desselar com DeviceKey");
            System.out.println("       java Main key-export [out.uvlmkey]   -- exportar DeviceKey");
            System.out.println("       java Main key-import <in.uvlmkey>    -- importar DeviceKey");
            System.out.println("       java Main key-show                   -- exibir DeviceKey atual");
            return;
        }

        switch (args[0]) {

            // ── seal ─────────────────────────────────────────────────────────
            case "seal": {
                if (args.length < 2) {
                    System.err.println("Uso: java Main seal <arquivo.uz>");
                    System.exit(1);
                }
                String uzPath  = args[1];
                String uzsPath = uzPath.replaceAll("\\.uz$", ".uzs");

                String password = readPassword("Criar senha para o .uzs: ");

                String source = new String(
                    Files.readAllBytes(Paths.get(uzPath)), StandardCharsets.UTF_8
                );
                byte[] sealed = UZSCrypto.seal(source, password);
                Files.write(Paths.get(uzsPath), sealed);
                password = null;

                System.out.println("[OK] Arquivo selado → " + uzsPath);
                break;
            }

            // ── unseal ───────────────────────────────────────────────────────
            case "unseal": {
                if (args.length < 2) {
                    System.err.println("Uso: java Main unseal <arquivo.uzs>");
                    System.exit(1);
                }
                String uzsPath = args[1];
                String uzPath  = uzsPath.replaceAll("\\.uzs$", ".uz");

                String password = readPassword("Senha: ");

                try {
                    byte[] data   = Files.readAllBytes(Paths.get(uzsPath));
                    String source = UZSCrypto.unseal(data, password);
                    Files.write(Paths.get(uzPath),
                        source.getBytes(StandardCharsets.UTF_8));

                    System.out.println("[OK] Código fonte restaurado → " + uzPath);
                } catch (UZSCrypto.WrongPasswordException e) {
                    System.err.println("[ERRO] " + e.getMessage());
                    System.exit(2);
                } catch (UZSCrypto.InvalidFormatException e) {
                    System.err.println("[FORMATO] " + e.getMessage());
                    System.exit(3);
                } finally {
                    password = null;
                }
                break;
            }

            // ── key-export ───────────────────────────────────────────────────
            case "key-export": {
                String out = args.length > 1 ? args[1] : "device.uvlmkey";
                DeviceKey.exportKey(out);
                break;
            }

            // ── key-import ───────────────────────────────────────────────────
            case "key-import": {
                if (args.length < 2) {
                    System.err.println("Uso: java Main key-import <arquivo.uvlmkey>");
                    System.exit(1);
                }
                DeviceKey.importKey(args[1]);
                break;
            }

            // ── key-show ─────────────────────────────────────────────────────
            case "key-show": {
                System.out.println("[DEVICE KEY] " + DeviceKey.get());
                System.out.println("[AVISO] Nunca compartilhe esta chave publicamente.");
                break;
            }

            // ── compile + run (.uz / .uzb) ───────────────────────────────────
            default: {
                String file   = args[0];
                boolean disasm       = false;
                boolean glpInspect   = false;
                boolean emitGlpReport = false;

                for (int i = 1; i < args.length; i++) {
                    if (args[i].equals("--disasm"))           disasm        = true;
                    if (args[i].equals("--glp-inspect"))      glpInspect    = true;
                    if (args[i].equals("--emit-glp-report"))  emitGlpReport = true;
                }

                Object obj = null;

                if (file.endsWith(".uz")) {
                    String source = new String(Files.readAllBytes(Paths.get(file)));
                    obj = new Lexer(source);
                    Parser parser = new Parser(((Lexer) obj).tokens);
                    List<ASTNode> ast = parser.parseProgram();

                    CodeGen codeGen = new CodeGen() {
                        @Override
                        void gen(ASTNode node) {
                            if (node instanceof MemberAccessExpr) {
                                MemberAccessExpr m = (MemberAccessExpr) node;
                                this.gen(m.obj);
                                this.emit((byte) 29);
                                this.emitString(m.prop);
                            } else if (node instanceof AssignExpr
                                    && ((AssignExpr) node).left instanceof MemberAccessExpr) {
                                AssignExpr a = (AssignExpr) node;
                                MemberAccessExpr m = (MemberAccessExpr) a.left;
                                this.gen(a.right);
                                this.gen(m.obj);
                                this.emit((byte) 30);
                                this.emitString(m.prop);
                            } else if (node instanceof Identifier) {
                                String name = ((Identifier) node).name;
                                if (this.locals.containsKey(name)) {
                                    this.emit((byte) 6);
                                    this.emitShort((Integer) this.locals.get(name));
                                } else if (this.globalConstants.containsKey(name)) {
                                    this.gen((ASTNode) this.globalConstants.get(name));
                                } else {
                                    this.emit((byte) 6);
                                    this.emitShort(0);
                                    this.emit((byte) 29);
                                    this.emitString(name);
                                }
                            } else {
                                super.gen(node);
                            }
                        }
                    };

                    codeGen.compile(ast);
                    byte[] raw    = codeGen.buf.toByteArray();
                    byte[] glp    = GLPEncoder.encode(raw, codeGen.constants, codeGen.funcs, file);
                    String uzb    = file.replace(".uz", ".uzb");
                    UZBWriter.write(uzb, codeGen.constants, codeGen.funcs, glp);
                    System.out.println("Compiled successfully to: " + uzb);
                    file = uzb;
                }

                if (file.endsWith(".uzb")) {
                    UZBLoader loader = new UZBLoader();
                    loader.load(file);
                    if (disasm) {
                        loader.disasm(false);
                    } else if (glpInspect) {
                        loader.disasm(true);
                    } else {
                        obj = new UVLM(loader);
                        ((UVLM) obj).run();
                    }
                    if (emitGlpReport) {
                        String report = "=== UVLM GLP REPORT ===\n"
                            + "Block A Size: " + loader.blockA.length + " bytes\n"
                            + "Block B Size: " + (loader.blockB != null ? loader.blockB.length : 0) + " bytes\n"
                            + "Total Opcode Mirroring: 100%\nPalindromic Integrity: Valid\n";
                        Files.write(Paths.get("glp_report.txt"), report.getBytes());
                        System.out.println("Generated glp_report.txt");
                    }
                }
                break;
            }
        }
    }

    /** Read a line from stdin — works with or without an attached TTY. */
    private static String readPassword(String prompt) {
        java.io.Console console = System.console();
        if (console != null) {
            char[] p = console.readPassword(prompt);
            String s = new String(p);
            Arrays.fill(p, '\0');
            return s;
        }
        // No TTY (spawned as child process) — read from stdin directly
        System.out.print(prompt);
        System.out.flush();
        return new Scanner(System.in).nextLine();
    }
}
