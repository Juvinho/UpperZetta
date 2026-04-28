package uvlm.crypto;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.io.*;
import java.nio.file.*;
import java.security.*;
import java.util.Arrays;

/**
 * Manages the per-device key used to bind .uzs files to a machine.
 *
 * Key derivation priority:
 *   1. Read existing ~/.uvlm/.uvlm_dk (always wins — backward compatible).
 *   2. If absent, derive deterministically from hardware IDs via PBKDF2.
 *      → survives Windows reinstalls on the same hardware.
 *   3. If hardware IDs unavailable, fall back to random 32 bytes.
 *
 * Backup tracking: ~/.uvlm/.uvlm_backed_up is created when the user
 * exports or views the recovery phrase. Absence triggers a seal warning.
 */
public class DeviceKey {

    private static final String KEY_FILE    = ".uvlm_dk";
    private static final String BACKUP_FLAG = ".uvlm_backed_up";
    private static final byte[] HW_SALT     = "UVLM-HW-SALT-v1".getBytes();

    private static String cachedKey = null;

    // ── Public API ────────────────────────────────────────────────────────────

    /** Returns the DEVICE KEY string for this installation (hex, "DK-" prefix). */
    public static String get() throws Exception {
        if (cachedKey != null) return cachedKey;

        Path keyPath = keyPath();

        if (Files.exists(keyPath)) {
            cachedKey = Files.readString(keyPath).trim();
        } else {
            byte[] raw = deriveOrGenerate();
            cachedKey  = bytesToKeyString(raw);
            Arrays.fill(raw, (byte) 0);
            Files.writeString(keyPath, cachedKey);
            lockFile(keyPath);
        }

        return cachedKey;
    }

    /** True if user has exported or viewed the recovery phrase at least once. */
    public static boolean isBackedUp() throws Exception {
        return Files.exists(dir().resolve(BACKUP_FLAG));
    }

    /** Marks the key as backed-up (called after export or phrase display). */
    private static void markBackedUp() throws Exception {
        Path flag = dir().resolve(BACKUP_FLAG);
        if (!Files.exists(flag)) Files.writeString(flag, "ok");
    }

    /**
     * Displays the 34-word recovery phrase and marks key as backed-up.
     * The phrase encodes the raw 32-byte key — sufficient to restore on any machine.
     */
    public static void showPhrase() throws Exception {
        byte[] raw = keyStringToBytes(get());
        String phrase = RecoveryPhrase.encode(raw);
        Arrays.fill(raw, (byte) 0);

        String[] words = phrase.split(" ");
        System.out.println();
        System.out.println("  === RECOVERY PHRASE (anote em papel) ===");
        System.out.println();
        // Print in 6-word rows for readability
        for (int i = 0; i < words.length; i++) {
            if (i > 0 && i % 6 == 0) System.out.println();
            System.out.printf("  %2d. %-6s", i + 1, words[i]);
        }
        System.out.println();
        System.out.println();
        System.out.println("  ⚠  Sem essa frase, arquivos .uzs sao irrecuperaveis");
        System.out.println("     em caso de falha de hardware.");
        System.out.println();

        markBackedUp();
    }

    /**
     * Restores DEVICE KEY from a 34-word recovery phrase.
     * Overwrites any existing key file.
     */
    public static void importFromPhrase(String phrase) throws Exception {
        byte[] raw = RecoveryPhrase.decode(phrase);
        String keyStr = bytesToKeyString(raw);
        Arrays.fill(raw, (byte) 0);

        Path keyPath = keyPath();
        Files.writeString(keyPath, keyStr);
        lockFile(keyPath);
        cachedKey = keyStr;

        markBackedUp();
        System.out.println("[KEY] DEVICE KEY restaurada da recovery phrase.");
        System.out.println("[KEY] Arquivos .uzs desta chave agora podem ser abertos.");
    }

    /**
     * Exports DEVICE KEY to a .uvlmkey file for manual backup.
     */
    public static void exportKey(String outputPath) throws Exception {
        String key = get();
        Files.writeString(Paths.get(outputPath), "UVLM-DEVICE-KEY\n" + key + "\n");
        markBackedUp();
        System.out.println("[KEY] Chave exportada para: " + outputPath);
        System.out.println("[KEY] GUARDE ESTE ARQUIVO. Sem ele, .uzs nao abrem em outras maquinas.");
    }

    /**
     * Imports DEVICE KEY from a .uvlmkey file.
     */
    public static void importKey(String keyFilePath) throws Exception {
        String content = Files.readString(Paths.get(keyFilePath)).trim();
        String[] lines = content.split("[\r\n]+");
        if (lines.length < 2 || !lines[0].trim().equals("UVLM-DEVICE-KEY"))
            throw new IllegalArgumentException("Arquivo de chave invalido.");

        String importedKey = lines[1].trim();
        Path keyPath = keyPath();
        Files.writeString(keyPath, importedKey);
        lockFile(keyPath);
        cachedKey = importedKey;
        markBackedUp();

        System.out.println("[KEY] Chave importada com sucesso.");
    }

    // ── Key derivation ────────────────────────────────────────────────────────

    /**
     * Tries hardware derivation first; falls back to random if hardware IDs
     * are unavailable (containers, unusual environments).
     */
    private static byte[] deriveOrGenerate() throws Exception {
        String fingerprint = hardwareFingerprint();

        if (fingerprint != null && !fingerprint.isBlank()) {
            System.err.println("[KEY] Derivando chave do hardware...");
            PBEKeySpec spec = new PBEKeySpec(
                fingerprint.toCharArray(), HW_SALT, 600_000, 256);
            try {
                return SecretKeyFactory
                    .getInstance("PBKDF2WithHmacSHA512")
                    .generateSecret(spec)
                    .getEncoded();
            } finally {
                spec.clearPassword();
            }
        }

        // Fallback: random
        System.err.println("[KEY] Hardware nao disponivel — chave gerada aleatoriamente.");
        byte[] raw = new byte[32];
        new SecureRandom().nextBytes(raw);
        return raw;
    }

    /**
     * Collects stable hardware identifiers. Returns null on failure.
     * Windows: WMIC CPU ProcessorId + CSPRODUCT UUID.
     * Linux:   DMI product UUID + chassis serial.
     * macOS:   IOPlatformSerialNumber.
     */
    private static String hardwareFingerprint() {
        String os = System.getProperty("os.name", "").toLowerCase();
        try {
            if (os.contains("win")) {
                String cpu   = wmicGet("cpu", "ProcessorId");
                String board = wmicGet("csproduct", "UUID");
                String combined = cpu + ":" + board;
                return combined.equals(":") ? null : combined;

            } else if (os.contains("mac")) {
                String serial = execLine(new String[]{
                    "bash", "-c",
                    "ioreg -l -k IOPlatformSerialNumber | grep IOPlatformSerialNumber | head -1"
                });
                return serial.isEmpty() ? null : serial;

            } else {
                // Linux / BSD
                String uuid   = readFileQuiet("/sys/class/dmi/id/product_uuid");
                String serial = readFileQuiet("/sys/class/dmi/id/chassis_serial");
                String combined = uuid + ":" + serial;
                return combined.equals(":") ? null : combined;
            }
        } catch (Exception e) {
            return null;
        }
    }

    /** Runs `wmic <scope> get <prop> /value` and returns the value. */
    private static String wmicGet(String scope, String prop) {
        try {
            Process p = new ProcessBuilder("wmic", scope, "get", prop, "/value")
                .redirectErrorStream(true)
                .start();
            String out = new String(p.getInputStream().readAllBytes()).trim();
            p.waitFor();
            for (String line : out.split("[\r\n]+")) {
                if (line.contains("=")) {
                    String val = line.split("=", 2)[1].trim();
                    if (!val.isEmpty()) return val;
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    /** Runs a command and returns its trimmed stdout. */
    private static String execLine(String[] cmd) {
        try {
            Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
            String out = new String(p.getInputStream().readAllBytes()).trim();
            p.waitFor();
            return out;
        } catch (Exception e) { return ""; }
    }

    private static String readFileQuiet(String path) {
        try { return Files.readString(Paths.get(path)).trim(); }
        catch (Exception e) { return ""; }
    }

    // ── Format helpers ────────────────────────────────────────────────────────

    /** "DK-" + uppercase hex of 32 bytes. */
    private static String bytesToKeyString(byte[] raw) {
        StringBuilder sb = new StringBuilder(67);
        sb.append("DK-");
        for (byte b : raw) sb.append(String.format("%02X", b));
        return sb.toString();
    }

    /** Parses "DK-XXXX..." back to 32 bytes. */
    static byte[] keyStringToBytes(String key) {
        String hex = key.startsWith("DK-") ? key.substring(3) : key;
        if (hex.length() != 64) throw new IllegalStateException("Key format invalid");
        byte[] out = new byte[32];
        for (int i = 0; i < 32; i++)
            out[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
        return out;
    }

    // ── File helpers ─────────────────────────────────────────────────────────

    private static Path dir() throws Exception {
        Path d = Paths.get(System.getProperty("user.home"), ".uvlm");
        if (!Files.exists(d)) Files.createDirectories(d);
        return d;
    }

    private static Path keyPath() throws Exception {
        return dir().resolve(KEY_FILE);
    }

    private static void lockFile(Path p) {
        try {
            p.toFile().setReadable(false, false);
            p.toFile().setReadable(true, true);
            p.toFile().setWritable(false, false);
        } catch (Exception ignored) {}
    }
}
