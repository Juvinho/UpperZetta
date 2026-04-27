import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;

/**
 * UZS sealed-file crypto — AES-256-CBC + PBKDF2-SHA512 + embedded master key.
 * Format: magic(4) + salt(16) + iv(16) + ciphertext
 * Plaintext layout (before encryption): checksum(4) + source bytes
 */
public class UZSCrypto {

    private static final byte[] MAGIC = {0x55, 0x5A, 0x53, 0x31}; // UZS1

    // Obfuscated master key — never stored as a String literal.
    // Built from char-array fragments with light arithmetic so it doesn't
    // appear as a plain string in the .class bytecode or a hex dump.
    private static char[] getMasterKey() {
        // Fragment A: 0x55='U' 0x70='p' 0x70='p' 0x65='e'
        char[] a = {(char)(0x55), (char)(0x50 + 0x20), (char)(0x70), (char)(0x60 + 5)};
        // Fragment B: 0x72='r' 0x5A='Z' 0x65='e' 0x74='t'
        char[] b = {(char)(0x72), (char)(0x5A), (char)(0x65), (char)(0x74)};
        // Fragment C: 0x74='t' 0x61='a' 0x5F='_' 0x4D='M'
        char[] c = {(char)(0x73 + 1), (char)(0x60 + 1), (char)(0x60 - 1), (char)(0x40 + 13)};
        // Fragment D: 0x4B='K' 0x45='E' 0x59='Y' 0x5F='_'
        char[] d = {(char)(0x4B), (char)(0x40 + 5), (char)(0x58 + 1), (char)(0x5F)};
        // Fragment E: 0x56='V' 0x31='1' 0x2E='.' 0x30='0'
        char[] e = {(char)(0x56), (char)(0x30 + 1), (char)(0x2E), (char)(0x30)};

        // XOR-based runtime twist tied to this class's identity.
        // Prevents simple static analysis from extracting the exact key.
        int h = UZSCrypto.class.getName().hashCode();
        char twist = (char)(((h ^ (h >>> 16)) & 0x3F) + 0x21); // printable ASCII 0x21-0x60

        int len = a.length + b.length + c.length + d.length + e.length + 1;
        char[] key = new char[len];
        int p = 0;
        for (char x : a) key[p++] = x;
        for (char x : b) key[p++] = x;
        for (char x : c) key[p++] = x;
        for (char x : d) key[p++] = x;
        for (char x : e) key[p++] = x;
        key[p] = twist;

        return key;
    }

    /**
     * Interleave userPass with masterKey char-by-char, then append
     * hex representation of XOR of both arrays' hashCodes.
     * Result is zeroed by the caller after key derivation.
     */
    static char[] combinePasswords(char[] userPass) {
        char[] master = getMasterKey();
        try {
            int uLen = userPass.length;
            int mLen = master.length;
            int combined = uLen + mLen + 8; // +8 for hash hex suffix
            char[] result = new char[combined];

            int ui = 0, mi = 0, ri = 0;
            while (ui < uLen || mi < mLen) {
                if (ui < uLen) result[ri++] = userPass[ui++];
                if (mi < mLen) result[ri++] = master[mi++];
            }

            int hashMix = Arrays.hashCode(userPass) ^ Arrays.hashCode(master);
            String hex = String.format("%08x", hashMix);
            for (char ch : hex.toCharArray()) result[ri++] = ch;

            return result;
        } finally {
            Arrays.fill(master, '\0');
        }
    }

    /** PBKDF2-SHA512, 100 000 iterations, 256-bit output. */
    static byte[] deriveKey(char[] password, byte[] salt) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password, salt, 100_000, 256);
        try {
            return SecretKeyFactory
                    .getInstance("PBKDF2WithHmacSHA512")
                    .generateSecret(spec)
                    .getEncoded();
        } finally {
            spec.clearPassword();
        }
    }

    /** 4-byte checksum: XOR-fold of SHA-256(data). */
    private static byte[] checksum(byte[] data) throws Exception {
        byte[] hash = MessageDigest.getInstance("SHA-256").digest(data);
        byte[] chk = new byte[4];
        for (int i = 0; i < hash.length; i++) chk[i & 3] ^= hash[i];
        return chk;
    }

    /**
     * Seal source bytes with userPass.
     * Output: MAGIC(4) + salt(16) + iv(16) + AES-CBC(checksum + source)
     */
    public static byte[] seal(byte[] source, char[] userPass) throws Exception {
        char[] combined = combinePasswords(userPass);
        try {
            SecureRandom rng = new SecureRandom();
            byte[] salt = new byte[16]; rng.nextBytes(salt);
            byte[] iv   = new byte[16]; rng.nextBytes(iv);

            byte[] key = deriveKey(combined, salt);
            try {
                byte[] chk = checksum(source);
                byte[] plain = new byte[4 + source.length];
                System.arraycopy(chk,    0, plain, 0, 4);
                System.arraycopy(source, 0, plain, 4, source.length);

                Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(Cipher.ENCRYPT_MODE,
                        new SecretKeySpec(key, "AES"),
                        new IvParameterSpec(iv));
                byte[] encrypted = cipher.doFinal(plain);
                Arrays.fill(plain, (byte) 0);

                byte[] out = new byte[4 + 16 + 16 + encrypted.length];
                System.arraycopy(MAGIC,     0, out,  0, 4);
                System.arraycopy(salt,      0, out,  4, 16);
                System.arraycopy(iv,        0, out, 20, 16);
                System.arraycopy(encrypted, 0, out, 36, encrypted.length);
                return out;
            } finally {
                Arrays.fill(key, (byte) 0);
            }
        } finally {
            Arrays.fill(combined, '\0');
        }
    }

    /**
     * Unseal a .uzs file sealed by this class.
     * Throws WrongPasswordException if password is wrong.
     * Throws InvalidFormatException if the file structure is invalid.
     */
    public static byte[] unseal(byte[] uzsData, char[] userPass) throws Exception {
        if (uzsData.length < 36) throw new InvalidFormatException("Arquivo muito curto.");
        for (int i = 0; i < 4; i++) {
            if (uzsData[i] != MAGIC[i]) throw new InvalidFormatException("Magic inválido.");
        }

        byte[] salt      = Arrays.copyOfRange(uzsData,  4, 20);
        byte[] iv        = Arrays.copyOfRange(uzsData, 20, 36);
        byte[] encrypted = Arrays.copyOfRange(uzsData, 36, uzsData.length);

        char[] combined = combinePasswords(userPass);
        try {
            byte[] key = deriveKey(combined, salt);
            try {
                Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
                cipher.init(Cipher.DECRYPT_MODE,
                        new SecretKeySpec(key, "AES"),
                        new IvParameterSpec(iv));

                byte[] plain;
                try {
                    plain = cipher.doFinal(encrypted);
                } catch (Exception e) {
                    throw new WrongPasswordException();
                }

                if (plain.length < 4) {
                    Arrays.fill(plain, (byte) 0);
                    throw new WrongPasswordException();
                }

                byte[] storedChk = Arrays.copyOfRange(plain, 0, 4);
                byte[] source    = Arrays.copyOfRange(plain, 4, plain.length);
                Arrays.fill(plain, (byte) 0);

                if (!Arrays.equals(storedChk, checksum(source))) throw new WrongPasswordException();

                return source;
            } finally {
                Arrays.fill(key, (byte) 0);
            }
        } finally {
            Arrays.fill(combined, '\0');
        }
    }

    // ── Inner exceptions ─────────────────────────────────────────────────────

    public static class WrongPasswordException extends Exception {
        public WrongPasswordException() { super("Senha incorreta."); }
    }

    public static class InvalidFormatException extends Exception {
        public InvalidFormatException(String msg) { super(msg); }
    }
}
