import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.util.Arrays;

public class UZSUnsealEngine {

    public byte[] unseal(byte[] uzsFile, char[] password) throws Exception {
        try {
            if (uzsFile.length < 44) {
                throw new UZSWrongPasswordException();
            }

            ByteBuffer buffer = ByteBuffer.wrap(uzsFile);
            
            // Check Magic
            byte[] magic = new byte[4];
            buffer.get(magic);
            if (!Arrays.equals(magic, new byte[]{0x55, 0x5A, 0x53, 0x21})) {
                throw new UZSWrongPasswordException();
            }

            // Skip Mirror and Version (8 bytes)
            buffer.position(10);

            // Extract Salt (16 bytes)
            byte[] salt = new byte[16];
            buffer.get(salt);

            // Extract IV (12 bytes)
            byte[] iv = new byte[12];
            buffer.get(iv);

            // Skip Reserved (6 bytes)
            buffer.position(44);

            // Extract Metadata (until 0x00)
            while (buffer.get() != 0x00) {
                // Just moving position to find the end of metadata
            }
            int payloadStart = buffer.position();

            // Derive key
            PBEKeySpec spec = new PBEKeySpec(password, salt, 600000, 256);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            byte[] keyBytes = factory.generateSecret(spec).getEncoded();
            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
            spec.clearPassword();

            // Decrypt Payload
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec);

            byte[] encryptedData = new byte[uzsFile.length - payloadStart];
            System.arraycopy(uzsFile, payloadStart, encryptedData, 0, encryptedData.length);

            byte[] decryptedPayload;
            try {
                decryptedPayload = cipher.doFinal(encryptedData);
            } catch (Exception e) {
                // Any error in GCM (bad tag, etc) is treated as wrong password
                throw new UZSWrongPasswordException();
            } finally {
                Arrays.fill(keyBytes, (byte)0);
            }

            // Discard 64 bytes padding
            if (decryptedPayload.length < 64) {
                throw new UZSWrongPasswordException();
            }

            byte[] uzSource = new byte[decryptedPayload.length - 64];
            System.arraycopy(decryptedPayload, 64, uzSource, 0, uzSource.length);

            // Cleanup decrypted payload
            Arrays.fill(decryptedPayload, (byte)0);

            return uzSource;
        } finally {
            if (password != null) {
                Arrays.fill(password, '\0');
            }
        }
    }
}
