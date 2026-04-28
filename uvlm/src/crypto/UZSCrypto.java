package uvlm.crypto;

import javax.crypto.*;
import javax.crypto.spec.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Arrays;

/**
 * Criptografia AES-256-CBC para arquivos .uzs.
 * Vincula cada arquivo à DEVICE KEY da instalação + senha do usuário.
 *
 * UZS1: MAGIC(4) + SALT(16) + IV(16) + CHECKSUM(4) + CIPHERTEXT
 * UZS2: MAGIC(4) + SALT(16) + IV(16) + CIPHERTEXT + HMAC(32)
 */
public class UZSCrypto {

     private static final int    ITERATIONS          = 100_000;
     private static final int    KEY_BITS_V1         = 256;
     private static final int    KEY_MATERIAL_BITS   = 512;
     private static final int    MAC_BYTES           = 32;
     private static final byte[] MAGIC_V1            = {0x55, 0x5A, 0x53, 0x31}; // "UZS1"
     private static final byte[] MAGIC_V2            = {0x55, 0x5A, 0x53, 0x32}; // "UZS2"
     private static final String GENERIC_ERROR       = "Algo nao esta certo.\nDica: algumas coisas nao sao pra ser abertas.";

    // ── Password combination ─────────────────────────────────────────────────

    /**
     * Intercala a senha do usuário com a DEVICE KEY char-a-char.
     * A descriptografia exige AMBAS — senha correta E mesma DEVICE KEY.
     */
    private static char[] buildPassword(String userPassword) throws Exception {
        String deviceKey = DeviceKey.get();

        int uLen = userPassword.length();
        int dLen = deviceKey.length();
        int max  = Math.max(uLen, dLen);

        StringBuilder sb = new StringBuilder(uLen + dLen);
        for (int i = 0; i < max; i++) {
            if (i < uLen) sb.append(userPassword.charAt(i));
            if (i < dLen) sb.append(deviceKey.charAt(i));
        }

        char[] result = sb.toString().toCharArray();
        sb.delete(0, sb.length()); // clear from heap
        return result;
    }

    // ── Key derivation ───────────────────────────────────────────────────────

    private static byte[] deriveKey(char[] password, byte[] salt, int bits) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password, salt, ITERATIONS, bits);
        try {
            return SecretKeyFactory
                    .getInstance("PBKDF2WithHmacSHA512")
                    .generateSecret(spec)
                    .getEncoded();
        } finally {
            spec.clearPassword();
        }
    }

    private static byte[] deriveKey(char[] password, byte[] salt) throws Exception {
        return deriveKey(password, salt, KEY_BITS_V1);
    }

    private static byte[] hmacSha256(byte[] key, byte[] header, byte[] ciphertext) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        mac.update(header);
        mac.update(ciphertext);
        return mac.doFinal();
    }

    // ── Checksum ─────────────────────────────────────────────────────────────

    /** XOR-fold of SHA-256(data) → 4 bytes. Detects wrong password cheaply. */
    private static int checksum(byte[] data) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(data);
        int chk = 0;
        for (int i = 0; i < hash.length; i++) {
            chk ^= (hash[i] & 0xFF) << ((i % 4) * 8);
        }
        return chk;
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /**
     * Criptografa código fonte .uz → bytes do .uzs.
     */
    public static byte[] seal(String sourceCode, String userPassword) throws Exception {
        char[] password = buildPassword(userPassword);
        try {
            SecureRandom rng  = new SecureRandom();
            byte[] salt = new byte[16]; rng.nextBytes(salt);
            byte[] iv   = new byte[16]; rng.nextBytes(iv);

            byte[] keyMaterial = deriveKey(password, salt, KEY_MATERIAL_BITS);
            byte[] encKey = Arrays.copyOfRange(keyMaterial, 0, 32);
            byte[] macKey = Arrays.copyOfRange(keyMaterial, 32, 64);
            try {
                byte[] plain = sourceCode.getBytes(StandardCharsets.UTF_8);

                Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(Cipher.ENCRYPT_MODE,
                        new SecretKeySpec(encKey, "AES"),
                        new IvParameterSpec(iv));
                byte[] encrypted = cipher.doFinal(plain);
                Arrays.fill(plain, (byte) 0);

                byte[] header = new byte[36];
                System.arraycopy(MAGIC_V2, 0, header, 0, 4);
                System.arraycopy(salt,     0, header, 4, 16);
                System.arraycopy(iv,       0, header, 20, 16);

                byte[] mac = hmacSha256(macKey, header, encrypted);

                ByteBuffer out = ByteBuffer.allocate(header.length + encrypted.length + mac.length);
                out.put(header);
                out.put(encrypted);
                out.put(mac);
                return out.array();
            } finally {
                Arrays.fill(encKey, (byte) 0);
                Arrays.fill(macKey, (byte) 0);
                Arrays.fill(keyMaterial, (byte) 0);
            }
        } finally {
            Arrays.fill(password, '\0');
        }
    }

    /**
     * Descriptografa .uzs → código fonte .uz original.
     * Lança WrongPasswordException se senha ou DEVICE KEY estiver incorreta.
     */
    public static String unseal(byte[] sealedData, String userPassword) throws Exception {
        if (sealedData.length < 4) {
            throw new InvalidFormatException(GENERIC_ERROR);
        }

        byte[] magic = Arrays.copyOfRange(sealedData, 0, 4);
        if (Arrays.equals(magic, MAGIC_V2)) {
            return unsealV2(sealedData, userPassword);
        }
        if (Arrays.equals(magic, MAGIC_V1)) {
            return unsealV1(sealedData, userPassword);
        }

        throw new InvalidFormatException(GENERIC_ERROR);
    }

    private static String unsealV2(byte[] sealedData, String userPassword) throws Exception {
        int minLen = 4 + 16 + 16 + MAC_BYTES;
        if (sealedData.length < minLen) {
            throw new InvalidFormatException(GENERIC_ERROR);
        }

        byte[] salt = Arrays.copyOfRange(sealedData, 4, 20);
        byte[] iv   = Arrays.copyOfRange(sealedData, 20, 36);

        int macStart = sealedData.length - MAC_BYTES;
        if (macStart <= 36) {
            throw new InvalidFormatException(GENERIC_ERROR);
        }

        byte[] encrypted = Arrays.copyOfRange(sealedData, 36, macStart);
        byte[] storedMac = Arrays.copyOfRange(sealedData, macStart, sealedData.length);

        char[] password = buildPassword(userPassword);
        try {
            byte[] keyMaterial = deriveKey(password, salt, KEY_MATERIAL_BITS);
            byte[] encKey = Arrays.copyOfRange(keyMaterial, 0, 32);
            byte[] macKey = Arrays.copyOfRange(keyMaterial, 32, 64);
            try {
                byte[] header = new byte[36];
                System.arraycopy(MAGIC_V2, 0, header, 0, 4);
                System.arraycopy(salt,     0, header, 4, 16);
                System.arraycopy(iv,       0, header, 20, 16);

                byte[] computedMac = hmacSha256(macKey, header, encrypted);
                if (!MessageDigest.isEqual(computedMac, storedMac)) {
                    throw new WrongPasswordException(GENERIC_ERROR);
                }

                Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(Cipher.DECRYPT_MODE,
                        new SecretKeySpec(encKey, "AES"),
                        new IvParameterSpec(iv));

                byte[] plain;
                try {
                    plain = cipher.doFinal(encrypted);
                } catch (BadPaddingException | IllegalBlockSizeException e) {
                    throw new WrongPasswordException(GENERIC_ERROR);
                }

                String source = new String(plain, StandardCharsets.UTF_8);
                Arrays.fill(plain, (byte) 0);
                return source;
            } finally {
                Arrays.fill(encKey, (byte) 0);
                Arrays.fill(macKey, (byte) 0);
                Arrays.fill(keyMaterial, (byte) 0);
            }
        } finally {
            Arrays.fill(password, '\0');
        }
    }

    private static String unsealV1(byte[] sealedData, String userPassword) throws Exception {
        if (sealedData.length < 40) {
            throw new InvalidFormatException(GENERIC_ERROR);
        }

        ByteBuffer buf = ByteBuffer.wrap(sealedData);

        byte[] magic = new byte[4];
        buf.get(magic);
        if (!Arrays.equals(magic, MAGIC_V1)) {
            throw new InvalidFormatException(GENERIC_ERROR);
        }

        byte[] salt = new byte[16]; buf.get(salt);
        byte[] iv   = new byte[16]; buf.get(iv);
        int expectedChk = buf.getInt();

        byte[] encrypted = new byte[buf.remaining()];
        buf.get(encrypted);

        char[] password = buildPassword(userPassword);
        try {
            byte[] key = deriveKey(password, salt);
            try {
                Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(Cipher.DECRYPT_MODE,
                        new SecretKeySpec(key, "AES"),
                        new IvParameterSpec(iv));

                byte[] plain;
                try {
                    plain = cipher.doFinal(encrypted);
                } catch (BadPaddingException | IllegalBlockSizeException e) {
                    throw new WrongPasswordException(GENERIC_ERROR);
                }

                if (checksum(plain) != expectedChk) {
                    Arrays.fill(plain, (byte) 0);
                    throw new WrongPasswordException(GENERIC_ERROR);
                }

                String source = new String(plain, StandardCharsets.UTF_8);
                Arrays.fill(plain, (byte) 0);
                return source;
            } finally {
                Arrays.fill(key, (byte) 0);
            }
        } finally {
            Arrays.fill(password, '\0');
        }
    }

    // ── Exceptions ───────────────────────────────────────────────────────────

    public static class WrongPasswordException extends Exception {
        public WrongPasswordException(String m) { super(m); }
    }

    public static class InvalidFormatException extends Exception {
        public InvalidFormatException(String m) { super(m); }
    }
}
