import java.math.BigInteger;

class Base85Custom {
    private static final String DEFAULT_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:!? ";

    static String encode(byte[] data, String alphabet) {
        if (alphabet == null) alphabet = DEFAULT_ALPHABET;
        BigInteger bigInt = new BigInteger(1, data);
        BigInteger base = BigInteger.valueOf(alphabet.length());
        StringBuilder sb = new StringBuilder();

        while (bigInt.compareTo(BigInteger.ZERO) > 0) {
            BigInteger[] dr = bigInt.divideAndRemainder(base);
            sb.append(alphabet.charAt(dr[1].intValue()));
            bigInt = dr[0];
        }

        // Handle leading zeros
        for (byte b : data) {
            if (b != 0) break;
            sb.append(alphabet.charAt(0));
        }

        return sb.reverse().toString();
    }

    static byte[] decode(String text, String alphabet) {
        if (alphabet == null) alphabet = DEFAULT_ALPHABET;
        BigInteger bigInt = BigInteger.ZERO;
        BigInteger base = BigInteger.valueOf(alphabet.length());

        for (int i = 0; i < text.length(); i++) {
            int digit = alphabet.indexOf(text.charAt(i));
            if (digit == -1) continue; // Skip unknown chars
            bigInt = bigInt.multiply(base).add(BigInteger.valueOf(digit));
        }

        byte[] bytes = bigInt.toByteArray();
        
        // Remove leading byte if it's a sign-extension zero (common in BigInteger.toByteArray)
        if (bytes.length > 1 && bytes[0] == 0) {
            byte[] tmp = new byte[bytes.length - 1];
            System.arraycopy(bytes, 1, tmp, 0, tmp.length);
            bytes = tmp;
        }

        return bytes;
    }
}
