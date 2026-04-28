import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;

/**
 * UZS sealed-file crypto — AES-256-CBC + PBKDF2-SHA512 + hardware-tied Device Key.
 * Format: magic(4) + salt(16) + iv(16) + ciphertext
 */
public class UZSCrypto {
    private static final byte[] SALT_FIXO = "UPPERZETTA_HARDWARE_SALT_2026".getBytes();
    private static final byte[] MAGIC = {0x55, 0x5A, 0x53, 0x31}; // UZS1

    public static byte[] getDeviceKey() {
        try {
            String seed = getCpuId() + ":" + getMotherboardUUID();
            PBEKeySpec spec = new PBEKeySpec(seed.toCharArray(), SALT_FIXO, 600_000, 256);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            return factory.generateSecret(spec).getEncoded();
        } catch (Exception e) {
            return new byte[32]; // Vague fallback
        }
    }

    private static String getCpuId() {
        try {
            java.util.Scanner s = new java.util.Scanner(Runtime.getRuntime().exec("wmic cpu get processorid").getInputStream()).useDelimiter("\\A");
            return s.hasNext() ? s.next().split("\\n")[1].trim() : "unknown-cpu";
        } catch (Exception e) { return "fallback-cpu"; }
    }

    private static String getMotherboardUUID() {
        try {
            java.util.Scanner s = new java.util.Scanner(Runtime.getRuntime().exec("wmic baseboard get serialnumber").getInputStream()).useDelimiter("\\A");
            return s.hasNext() ? s.next().split("\\n")[1].trim() : "unknown-mb";
        } catch (Exception e) { return "fallback-mb"; }
    }

    public static String generateRecoveryPhrase(byte[] deviceKey) {
        String[] words = {"apple", "banana", "circuit", "tunnel", "verde", "marble", "ocean", "planet", "guitar", "winter", "summer", "coffee", "silver", "golden", "bridge", "forest", "desert", "oxygen", "nebula", "quartz", "shadow", "valley", "window", "zenith"};
        java.util.Random rnd = new java.util.Random(java.util.Arrays.hashCode(deviceKey));
        StringBuilder sb = new StringBuilder();
        for(int i=0; i<24; i++) {
            sb.append(words[rnd.nextInt(words.length)]).append(i == 23 ? "" : " ");
        }
        return sb.toString();
    }

    static byte[] deriveKey(char[] password, byte[] salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password, salt, 100_000, 256);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512").generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();
        }
    }

    private static byte[] checksum(byte[] data) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(data);
        byte[] chk = new byte[4];
        for (int i = 0; i < hash.length; i++) chk[i & 3] ^= hash[i];
        return chk;
    }

    public static byte[] seal(byte[] source, char[] userPass) throws Exception {
        SecureRandom rng = new SecureRandom();
        byte[] salt = new byte[16]; rng.nextBytes(salt);
        byte[] iv   = new byte[16]; rng.nextBytes(iv);
        byte[] key = deriveKey(userPass, salt);
        try {
            byte[] chk = checksum(source);
            byte[] plain = new byte[4 + source.length];
            System.arraycopy(chk, 0, plain, 0, 4);
            System.arraycopy(source, 0, plain, 4, source.length);
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
            byte[] encrypted = cipher.doFinal(plain);
            byte[] out = new byte[4 + 16 + 16 + encrypted.length];
            System.arraycopy(MAGIC, 0, out, 0, 4);
            System.arraycopy(salt, 0, out, 4, 16);
            System.arraycopy(iv, 0, out, 20, 16);
            System.arraycopy(encrypted, 0, out, 36, encrypted.length);
            return out;
        } finally {
            Arrays.fill(key, (byte) 0);
        }
    }

    public static byte[] unseal(byte[] uzsData, char[] userPass) throws Exception {
        if (uzsData.length < 36) throw new Exception("Arquivo curto");
        byte[] salt = Arrays.copyOfRange(uzsData, 4, 20);
        byte[] iv   = Arrays.copyOfRange(uzsData, 20, 36);
        byte[] encrypted = Arrays.copyOfRange(uzsData, 36, uzsData.length);
        byte[] key = deriveKey(userPass, salt);
        try {
            Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new IvParameterSpec(iv));
            byte[] plain = cipher.doFinal(encrypted);
            byte[] storedChk = Arrays.copyOfRange(plain, 0, 4);
            byte[] source = Arrays.copyOfRange(plain, 4, plain.length);
            if (!Arrays.equals(storedChk, checksum(source))) throw new Exception("Senha incorreta");
            return source;
        } finally {
            Arrays.fill(key, (byte) 0);
        }
    }
}
