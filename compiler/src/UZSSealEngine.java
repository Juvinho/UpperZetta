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

    public byte[] seal(byte[] uzSource, char[] password, long expiresAt, boolean paranoid) throws Exception {
        try {
            SecureRandom random = new SecureRandom();

            // Generate Salt and IV
            byte[] salt = new byte[16];
            random.nextBytes(salt);

            byte[] iv = new byte[12];
            random.nextBytes(iv);

            // Derive key
            byte[] deviceKey = UZSCrypto.getDeviceKey();
            char[] finalPass = password;
            if (paranoid) {
                // Key fragmentation: Pass = deviceKey XOR password (simplified)
                // In a real implementation, we'd use PBKDF2 with both as inputs.
            }

            PBEKeySpec spec = new PBEKeySpec(password, salt, 600000, 256);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            byte[] keyBytes = factory.generateSecret(spec).getEncoded();
            
            if (paranoid) {
                for(int i=0; i<keyBytes.length; i++) keyBytes[i] ^= deviceKey[i % deviceKey.length];
            }

            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
            spec.clearPassword();

            // Prepare payload with 64 bytes padding
            byte[] padding = new byte[64];
            random.nextBytes(padding);
            
            byte[] plainPayload = new byte[64 + uzSource.length];
            System.arraycopy(padding, 0, plainPayload, 0, 64);
            System.arraycopy(uzSource, 0, plainPayload, 64, uzSource.length);

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
            String metadata = String.format("{\n  \"package\": \"%s\",\n  \"sealed_at\": \"%s\",\n  \"expires_at\": %d,\n  \"paranoid\": %b,\n  \"uz_version\": \"1.1\"\n}", pkg, date, expiresAt, paranoid);
            byte[] metadataBytes = metadata.getBytes(StandardCharsets.UTF_8);

            // Encrypt
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec);

            byte[] header = new byte[44];
            int p = 0;
            header[p++] = 0x55; header[p++] = 0x5A; header[p++] = 0x53; header[p++] = 0x21; // UZS!
            header[p++] = 0x21; header[p++] = 0x53; header[p++] = 0x5A; header[p++] = 0x55; // !SZU
            header[p++] = 0x01; header[p++] = 0x01; // Versao
            System.arraycopy(salt, 0, header, p, 16); p += 16;
            System.arraycopy(iv,   0, header, p, 12); p += 12;
            header[p++] = (byte)5; // Remaining attempts: 5
            header[p++] = (byte)(paranoid ? 1 : 0);
            header[p++] = 0x00;
            header[p++] = 0x00; header[p++] = 0x00; header[p++] = 0x00; // Reserved

            cipher.updateAAD(header);
            cipher.updateAAD(metadataBytes);
            cipher.updateAAD(new byte[]{0x00});

            byte[] cipherPayload = cipher.doFinal(plainPayload);

            // Assemble .uzs
            ByteArrayOutputStream out = new ByteArrayOutputStream();

            // Header (44 bytes)
            out.write(header);

            // Metadata
            out.write(metadataBytes);
            out.write(0x00); // Null terminator

            // Encrypted Payload
            out.write(cipherPayload);
            
            byte[] finalData = out.toByteArray();
            
            // Entropy Masking: Recode to look like prose
            String encoded = Base85Custom.encode(finalData, null);
            byte[] maskedData = encoded.getBytes(StandardCharsets.UTF_8);

            // Assemble with Fake Header (JPEG)
            ByteArrayOutputStream finalOut = new ByteArrayOutputStream();
            finalOut.write(new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF, (byte)0xE0});
            finalOut.write(maskedData);

            // Clean plain payload memory
            Arrays.fill(plainPayload, (byte)0);
            Arrays.fill(keyBytes, (byte)0);

            return finalOut.toByteArray();
        } finally {
            // Guarantee password cleanup
            if (password != null) {
                Arrays.fill(password, '\0');
            }
        }
    }
}
