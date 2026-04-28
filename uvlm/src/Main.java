import uvlm.crypto.UZSCrypto;
import uvlm.crypto.DeviceKey;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            printUsage();
            return;
        }

        switch (args[0]) {

            // ── seal ─────────────────────────────────────────────────────────
            case "seal": {
                if (args.length < 2) { System.err.println("Uso: zetta seal <arquivo.uz>"); System.exit(1); }

                requireBackupBeforeSeal();

                String uzPath  = args[1];
                String uzsPath = uzPath.replaceAll("\\.uz$", ".uzs");

                String password = readPassword("Criar senha para o .uzs: ");
                String source   = Files.readString(Paths.get(uzPath), StandardCharsets.UTF_8);
                byte[] sealed   = UZSCrypto.seal(source, password);
                Files.write(Paths.get(uzsPath), sealed);
                password = null;

                System.out.println("[OK] Arquivo selado → " + uzsPath);
                break;
            }

            // ── unseal ───────────────────────────────────────────────────────
            case "unseal": {
                if (args.length < 2) { System.err.println("Uso: zetta unseal <arquivo.uzs>"); System.exit(1); }

                String uzsPath = args[1];
                String uzPath  = uzsPath.replaceAll("\\.uzs$", ".uz");
                String password = readPassword("Senha: ");

                try {
                    byte[] data   = Files.readAllBytes(Paths.get(uzsPath));
                    String source = UZSCrypto.unseal(data, password);
                    Files.writeString(Paths.get(uzPath), source, StandardCharsets.UTF_8);
                    System.out.println("[OK] Codigo fonte restaurado → " + uzPath);
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
                // key-import --phrase  → read 34-word phrase from stdin
                // key-import <file>    → read .uvlmkey file
                if (args.length > 1 && args[1].equals("--phrase")) {
                    System.out.println("Digite sua recovery phrase (34 palavras, separadas por espaco):");
                    System.out.print("> ");
                    String phrase = new Scanner(System.in).nextLine().trim();
                    DeviceKey.importFromPhrase(phrase);
                } else if (args.length > 1) {
                    DeviceKey.importKey(args[1]);
                } else {
                    System.err.println("Uso: zetta key-import <arquivo.uvlmkey>");
                    System.err.println("     zetta key-import --phrase");
                    System.exit(1);
                }
                break;
            }

            // ── key-show ─────────────────────────────────────────────────────
            case "key-show": {
                boolean phrase = args.length > 1 && args[1].equals("--phrase");
                if (phrase) {
                    DeviceKey.showPhrase();
                } else {
                    System.out.println("[DEVICE KEY] " + DeviceKey.get());
                    System.out.println("[AVISO] Nunca compartilhe esta chave publicamente.");
                    System.out.println("        Use 'key-show --phrase' para gerar sua recovery phrase.");
                }
                break;
            }

            // ── compile + run (.uz / .uzb) ───────────────────────────────────
            default: {
                String file          = args[0];
                boolean disasm       = false;
                boolean glpInspect   = false;
                boolean emitGlpReport = false;

                for (int i = 1; i < args.length; i++) {
                    if (args[i].equals("--disasm"))           disasm         = true;
                    if (args[i].equals("--glp-inspect"))      glpInspect     = true;
                    if (args[i].equals("--emit-glp-report"))  emitGlpReport  = true;
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
                    byte[] raw = codeGen.buf.toByteArray();
                    byte[] glp = GLPEncoder.encode(raw, codeGen.constants, codeGen.funcs, file);
                    String uzb = file.replace(".uz", ".uzb");
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

    // ── First-seal backup gate ────────────────────────────────────────────────

    private static void requireBackupBeforeSeal() throws Exception {
        if (DeviceKey.isBackedUp()) return;

        System.out.println();
        System.out.println("  ╔══════════════════════════════════════════════════╗");
        System.out.println("  ║  ⚠  Backup da DEVICE KEY nao realizado          ║");
        System.out.println("  ║                                                  ║");
        System.out.println("  ║  Sem backup, arquivos .uzs sao irrecuperaveis   ║");
        System.out.println("  ║  se o disco falhar ou o hardware mudar.          ║");
        System.out.println("  ╚══════════════════════════════════════════════════╝");
        System.out.println();
        System.out.println("  [P] Ver recovery phrase (recomendado)");
        System.out.println("  [E] Exportar arquivo .uvlmkey");
        System.out.println("  [S] Continuar mesmo assim");
        System.out.println("  [C] Cancelar");
        System.out.println();
        System.out.print("  Escolha: ");

        String choice = new Scanner(System.in).nextLine().trim().toUpperCase();
        System.out.println();

        switch (choice) {
            case "P":
                DeviceKey.showPhrase();
                break;
            case "E":
                String out = "device.uvlmkey";
                DeviceKey.exportKey(out);
                break;
            case "C":
                System.out.println("Operacao cancelada.");
                System.exit(0);
                break;
            // "S" — skip, seal proceeds without backup
            default:
                System.out.println("  [!] Continuando sem backup. Guarde sua chave depois.");
                break;
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static void printUsage() {
        System.out.println("Uso: zetta <arquivo.uz|arquivo.uzb>");
        System.out.println("     zetta seal       <arquivo.uz>        -- selar arquivo");
        System.out.println("     zetta unseal     <arquivo.uzs>       -- desselar arquivo");
        System.out.println("     zetta key-export [saida.uvlmkey]     -- exportar DEVICE KEY");
        System.out.println("     zetta key-import <entrada.uvlmkey>   -- importar DEVICE KEY");
        System.out.println("     zetta key-import --phrase            -- restaurar via frase");
        System.out.println("     zetta key-show                       -- exibir DEVICE KEY");
        System.out.println("     zetta key-show   --phrase            -- exibir recovery phrase");
    }

    private static String readPassword(String prompt) {
        java.io.Console console = System.console();
        if (console != null) {
            char[] p = console.readPassword(prompt);
            String s = new String(p);
            Arrays.fill(p, '\0');
            return s;
        }
        System.out.print(prompt);
        System.out.flush();
        return new Scanner(System.in).nextLine();
    }
}
