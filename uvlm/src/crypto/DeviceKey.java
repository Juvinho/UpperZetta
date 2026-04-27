package uvlm.crypto;

import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.UUID;

/**
 * Gerencia a chave única de dispositivo do UVLM.
 * Gerada uma vez, armazenada localmente, usada em toda criptografia .uzs.
 */
public class DeviceKey {

    private static final String KEY_FILE_NAME = ".uvlm_dk";
    private static String cachedKey = null;

    /**
     * Retorna a DEVICE KEY desta instalação.
     * Se não existir, gera e salva automaticamente.
     */
    public static String get() throws Exception {
        if (cachedKey != null) return cachedKey;

        Path keyPath = getKeyPath();

        if (Files.exists(keyPath)) {
            cachedKey = new String(Files.readAllBytes(keyPath)).trim();
        } else {
            cachedKey = generate();
            Files.write(keyPath, cachedKey.getBytes());
            try {
                keyPath.toFile().setReadable(false, false);
                keyPath.toFile().setReadable(true, true);  // só o dono lê
                keyPath.toFile().setWritable(false, false); // ninguém escreve
            } catch (Exception ignored) {}
        }

        return cachedKey;
    }

    /**
     * Gera uma chave única combinando:
     * - UUID aleatório (base da unicidade)
     * - Hash de informações do ambiente (vincula à instalação)
     * - Timestamp de geração
     */
    private static String generate() throws Exception {
        String uuid = UUID.randomUUID().toString().replace("-", "");

        String envData = String.join("|",
            System.getProperty("user.name",    "?"),
            System.getProperty("os.name",      "?"),
            System.getProperty("os.arch",      "?"),
            System.getProperty("java.version", "?")
        );

        String raw = uuid + envData + System.currentTimeMillis();

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hashBytes = digest.digest(raw.getBytes("UTF-8"));

        StringBuilder hex = new StringBuilder();
        for (byte b : hashBytes) {
            hex.append(String.format("%02x", b));
        }

        return "DK-" + hex.toString().toUpperCase();
    }

    /**
     * Localiza o arquivo da chave em ~/.uvlm/.uvlm_dk
     */
    private static Path getKeyPath() throws Exception {
        Path dir = Paths.get(System.getProperty("user.home"), ".uvlm");
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }
        return dir.resolve(KEY_FILE_NAME);
    }

    /**
     * Exporta a DEVICE KEY para backup manual.
     * Necessário para restaurar .uzs em outra máquina.
     */
    public static void exportKey(String outputPath) throws Exception {
        String key = get();
        Files.write(Paths.get(outputPath), ("UVLM-DEVICE-KEY\n" + key + "\n").getBytes());
        System.out.println("[KEY] Chave exportada para: " + outputPath);
        System.out.println("[KEY] GUARDE ESTE ARQUIVO. Sem ele, .uzs desta maquina nao abrem em outras.");
    }

    /**
     * Importa uma DEVICE KEY de outro dispositivo.
     * Permite abrir .uzs criados em outra máquina.
     */
    public static void importKey(String keyFilePath) throws Exception {
        String content = new String(Files.readAllBytes(Paths.get(keyFilePath))).trim();
        String[] lines = content.split("\n");

        if (lines.length < 2 || !lines[0].trim().equals("UVLM-DEVICE-KEY")) {
            throw new IllegalArgumentException("Arquivo de chave invalido.");
        }

        String importedKey = lines[1].trim();
        Path keyPath = getKeyPath();
        Files.write(keyPath, importedKey.getBytes());
        cachedKey = importedKey;

        System.out.println("[KEY] Chave importada com sucesso.");
        System.out.println("[KEY] Arquivos .uzs desta chave agora podem ser abertos.");
    }
}
