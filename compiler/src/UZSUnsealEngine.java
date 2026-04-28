import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.util.Arrays;

public class UZSUnsealEngine {

    public byte[] unseal(String filePath, char[] password) throws Exception {
        byte[] rawFile = java.nio.file.Files.readAllBytes(java.nio.file.Paths.get(filePath));
        
        // Skip Fake Header (4 bytes) and decode Entropy Masking
        if (rawFile.length < 4) throw new Exception("✗ Algo não está certo.");
        
        byte[] maskedData = Arrays.copyOfRange(rawFile, 4, rawFile.length);
        String encoded = new String(maskedData, java.nio.charset.StandardCharsets.UTF_8);
        byte[] uzsFile = Base85Custom.decode(encoded, null);

        try {
            if (uzsFile.length < 44) {
                throw new Exception("✗ Algo não está certo.\nDica: algumas coisas não são pra ser abertas.");
            }

            byte[] header = Arrays.copyOfRange(uzsFile, 0, 44);
            ByteBuffer buffer = ByteBuffer.wrap(uzsFile);

            // Check Magic
            byte[] magic = new byte[4];
            buffer.get(magic);
            if (!Arrays.equals(magic, new byte[]{0x55, 0x5A, 0x53, 0x21})) {
                throw new Exception("✗ Algo não está certo.\nDica: algumas coisas não são pra ser abertas.");
            }

            int verMajor = header[8] & 0xFF;
            int verMinor = header[9] & 0xFF;
            boolean useAad = (verMajor > 1) || (verMajor == 1 && verMinor >= 1);

            // Skip Mirror and Version (8 bytes)
            buffer.position(10);

            // Extract Salt (16 bytes)
            byte[] salt = new byte[16];
            buffer.get(salt);

            // Extract IV (12 bytes)
            byte[] iv = new byte[12];
            buffer.get(iv);

            // Extract Attempts (index 38)
            int attempts = header[38] & 0xFF;
            boolean paranoid = (header[39] & 0xFF) == 1;

            if (attempts <= 0) {
                // Already destroyed
                throw new Exception("✗ Arquivo destruído.\nDica: era pra ter pensado antes.");
            }

            // Skip Reserved (6 bytes)
            buffer.position(44);

            // Extract Metadata (until 0x00)
            java.io.ByteArrayOutputStream metaOut = new java.io.ByteArrayOutputStream();
            byte b;
            while ((b = buffer.get()) != 0x00) {
                metaOut.write(b);
            }
            byte[] metadataBytes = metaOut.toByteArray();
            int payloadStart = buffer.position();

            // Derive key
            PBEKeySpec spec = new PBEKeySpec(password, salt, 600000, 256);
            SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
            byte[] keyBytes = factory.generateSecret(spec).getEncoded();
            
            if (paranoid) {
                byte[] deviceKey = UZSCrypto.getDeviceKey();
                for(int i=0; i<keyBytes.length; i++) keyBytes[i] ^= deviceKey[i % deviceKey.length];
            }

            SecretKeySpec secretKey = new SecretKeySpec(keyBytes, "AES");
            spec.clearPassword();

            // Decrypt Payload
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec);

            if (useAad) {
                cipher.updateAAD(header);
                cipher.updateAAD(metadataBytes);
                cipher.updateAAD(new byte[]{0x00});
            }

            byte[] encryptedData = new byte[uzsFile.length - payloadStart];
            System.arraycopy(uzsFile, payloadStart, encryptedData, 0, encryptedData.length);

            byte[] decryptedPayload;
            try {
                decryptedPayload = cipher.doFinal(encryptedData);
            } catch (Exception e) {
                // WRONG PASSWORD - Decrement attempts
                attempts--;
                header[38] = (byte)attempts;
                System.arraycopy(header, 0, uzsFile, 0, 44);
                
                if (attempts <= 0) {
                    java.util.Arrays.fill(uzsFile, (byte)0);
                    // Re-encode to maintain file structure if destroyed?
                    // Actually, just zeroing the whole file is better as requested.
                    java.nio.file.Files.write(java.nio.file.Paths.get(filePath), new byte[rawFile.length]); 
                    throw new Exception("✗ Arquivo destruído.\nDica: era pra ter pensado antes.");
                } else {
                    // Update counter and re-encode/re-wrap
                    System.arraycopy(header, 0, uzsFile, 0, 44);
                    String newEncoded = Base85Custom.encode(uzsFile, null);
                    ByteArrayOutputStream finalOut = new ByteArrayOutputStream();
                    finalOut.write(new byte[]{(byte)0xFF, (byte)0xD8, (byte)0xFF, (byte)0xE0});
                    finalOut.write(newEncoded.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                    java.nio.file.Files.write(java.nio.file.Paths.get(filePath), finalOut.toByteArray());
                    throw new Exception("✗ Senha incorreta. Tentativas restantes: " + attempts + ".\nDica: pense bem.");
                }
            } finally {
                Arrays.fill(keyBytes, (byte)0);
            }

            // Discard 64 bytes padding
            if (decryptedPayload.length < 64) {
                throw new UZSWrongPasswordException();
            }

            byte[] uzSource = new byte[decryptedPayload.length - 64];
            System.arraycopy(decryptedPayload, 64, uzSource, 0, uzSource.length);

            // Check Expiration (from metadata)
            String metaStr = new String(metadataBytes, java.nio.charset.StandardCharsets.UTF_8);
            if (metaStr.contains("\"expires_at\":")) {
                long expiresAt = Long.parseLong(metaStr.split("\"expires_at\":")[1].split(",")[0].trim());
                if (expiresAt > 0 && System.currentTimeMillis() > expiresAt) {
                    java.time.LocalDateTime ldt = java.time.Instant.ofEpochMilli(expiresAt).atZone(java.time.ZoneId.systemDefault()).toLocalDateTime();
                    throw new Exception("✗ Este arquivo expirou em " + ldt.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ".\nDica: algumas coisas não duram para sempre.");
                }
            }

            // Cleanup decrypted payload
            Arrays.fill(decryptedPayload, (byte)0);

            return uzSource;
        } finally {
            if (password != null) {
                Arrays.fill(password, '\0');
            }
        }
    }
    public byte[] unseal(byte[] rawFile, char[] password) throws Exception {
        // Skip Fake Header (4 bytes) and decode Entropy Masking
        if (rawFile.length < 4) throw new Exception("✗ Algo não está certo.");
        
        byte[] maskedData = Arrays.copyOfRange(rawFile, 4, rawFile.length);
        String encoded = new String(maskedData, java.nio.charset.StandardCharsets.UTF_8);
        byte[] uzsFile = Base85Custom.decode(encoded, null);

        if (uzsFile.length < 44) {
            throw new Exception("✗ Algo não está certo.\nDica: algumas coisas não são pra ser abertas.");
        }

        byte[] header = Arrays.copyOfRange(uzsFile, 0, 44);
        ByteBuffer buffer = ByteBuffer.wrap(uzsFile);

        // Check Magic
        byte[] magic = new byte[4];
        buffer.get(magic);
        if (!Arrays.equals(magic, new byte[]{0x55, 0x5A, 0x53, 0x21})) {
            throw new Exception("✗ Algo não está certo.\nDica: algumas coisas não são pra ser abertas.");
        }

        buffer.position(10);
        byte[] salt = new byte[16];
        buffer.get(salt);
        byte[] iv = new byte[12];
        buffer.get(iv);

        int attempts = header[38] & 0xFF;
        boolean paranoid = (header[39] & 0xFF) == 1;
        if (attempts <= 0) throw new Exception("✗ Arquivo destruído.");

        buffer.position(44);
        ByteArrayOutputStream metaOut = new ByteArrayOutputStream();
        byte b;
        while ((b = buffer.get()) != 0x00) metaOut.write(b);
        byte[] metadataBytes = metaOut.toByteArray();
        int payloadStart = buffer.position();

        PBEKeySpec spec = new PBEKeySpec(password, salt, 600000, 256);
        SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA512");
        byte[] keyBytes = factory.generateSecret(spec).getEncoded();
        if (paranoid) {
            byte[] deviceKey = UZSCrypto.getDeviceKey();
            for(int i=0; i<keyBytes.length; i++) keyBytes[i] ^= deviceKey[i % deviceKey.length];
        }

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(keyBytes, "AES"), gcmSpec);
        cipher.updateAAD(header);
        cipher.updateAAD(metadataBytes);
        cipher.updateAAD(new byte[]{0x00});

        byte[] encryptedData = new byte[uzsFile.length - payloadStart];
        System.arraycopy(uzsFile, payloadStart, encryptedData, 0, encryptedData.length);
        byte[] decryptedPayload = cipher.doFinal(encryptedData);
        Arrays.fill(keyBytes, (byte)0);

        byte[] uzSource = new byte[decryptedPayload.length - 64];
        System.arraycopy(decryptedPayload, 64, uzSource, 0, uzSource.length);
        return uzSource;
    }
}
