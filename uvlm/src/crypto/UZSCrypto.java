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
 * Formato: MAGIC(4) + SALT(16) + IV(16) + CHECKSUM(4) + CIPHERTEXT
 */
public class UZSCrypto {

    private static final int    ITERATIONS = 100_000;
    private static final int    KEY_BITS   = 256;
    private static final byte[] MAGIC      = {0x55, 0x5A, 0x53, 0x31}; // "UZS1"

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

    private static byte[] deriveKey(char[] password, byte[] salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password, salt, ITERATIONS, KEY_BITS);
        try {
            return SecretKeyFactory
                    .getInstance("PBKDF2WithHmacSHA512")
                    .generateSecret(spec)
                    .getEncoded();
        } finally {
            spec.clearPassword();
        }
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

            byte[] key = deriveKey(password, salt);
            try {
                byte[] plain = sourceCode.getBytes(StandardCharsets.UTF_8);
                int chk = checksum(plain);

                Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(Cipher.ENCRYPT_MODE,
                        new SecretKeySpec(key, "AES"),
                        new IvParameterSpec(iv));
                byte[] encrypted = cipher.doFinal(plain);

                // MAGIC(4) + SALT(16) + IV(16) + CHECKSUM(4) + CIPHERTEXT
                ByteBuffer out = ByteBuffer.allocate(40 + encrypted.length);
                out.put(MAGIC);
                out.put(salt);
                out.put(iv);
                out.putInt(chk);
                out.put(encrypted);
                return out.array();
            } finally {
                Arrays.fill(key, (byte) 0);
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
        if (sealedData.length < 40)
            throw new InvalidFormatException("Arquivo muito curto para ser .uzs valido.");

        ByteBuffer buf = ByteBuffer.wrap(sealedData);

        byte[] magic = new byte[4];
        buf.get(magic);
        if (!Arrays.equals(magic, MAGIC))
            throw new InvalidFormatException("Magic invalido — nao e um .uzs UZS1.");

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
                    throw new WrongPasswordException(
                            "Senha incorreta ou arquivo criado em outro dispositivo.");
                }

                if (checksum(plain) != expectedChk) {
                    Arrays.fill(plain, (byte) 0);
                    throw new WrongPasswordException(
                            "Verificacao falhou. Senha incorreta ou DEVICE KEY diferente.");
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
