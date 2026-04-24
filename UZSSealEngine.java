import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;

public class UZSSealEngine {

    public byte[] seal(byte[] uzSource, char[] password) throws Exception {
        try {
            SecureRandom random = new SecureRandom();

            // Generate Salt and IV
            byte[] salt = new byte[16];
            random.nextBytes(salt);

            byte[] iv = new byte[12];
            random.nextBytes(iv);

            // Derive key
            PBEKeySpec spec = new PBEKeySpec(password, salt, 600000, 256);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            byte[] keyBytes = factory.generateSecret(spec).getEncoded();
            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
            spec.clearPassword();

            // Prepare payload with 64 bytes padding
            byte[] padding = new byte[64];
            random.nextBytes(padding);
            
            byte[] plainPayload = new byte[64 + uzSource.length];
            System.arraycopy(padding, 0, plainPayload, 0, 64);
            System.arraycopy(uzSource, 0, plainPayload, 64, uzSource.length);

            // Encrypt
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec);
            
            byte[] cipherPayload = cipher.doFinal(plainPayload);

            // Build Metadata
            String pkg = "unknown";
            String sourceStr = new String(uzSource, StandardCharsets.UTF_8);
            int pkgIdx = sourceStr.indexOf("package in ");
            if (pkgIdx != -1) {
                int endIdx = sourceStr.indexOf(";", pkgIdx);
                if (endIdx != -1) {
                    pkg = sourceStr.substring(pkgIdx + 11, endIdx).trim();
                }
            }

            String date = ZonedDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);
            String metadata = String.format("{\n  \"package\": \"%s\",\n  \"sealed_at\": \"%s\",\n  \"uz_version\": \"1.0\"\n}", pkg, date);
            byte[] metadataBytes = metadata.getBytes(StandardCharsets.UTF_8);

            // Assemble .uzs
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            
            // Header (44 bytes)
            out.write(new byte[]{0x55, 0x5A, 0x53, 0x21}); // UZS!
            out.write(new byte[]{0x21, 0x53, 0x5A, 0x55}); // !SZU
            out.write(new byte[]{0x01, 0x00}); // Versao
            out.write(salt);
            out.write(iv);
            out.write(new byte[]{0x00, 0x00, 0x00, 0x00, 0x00, 0x00}); // Reserved
            
            // Metadata
            out.write(metadataBytes);
            out.write(0x00); // Null terminator
            
            // Encrypted Payload
            out.write(cipherPayload);
            
            // Clean plain payload memory
            Arrays.fill(plainPayload, (byte)0);
            Arrays.fill(keyBytes, (byte)0);

            return out.toByteArray();
        } finally {
            // Guarantee password cleanup
            if (password != null) {
                Arrays.fill(password, '\0');
            }
        }
    }
}
