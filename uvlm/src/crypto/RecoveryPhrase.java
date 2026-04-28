package uvlm.crypto;

import java.security.MessageDigest;

/**
 * Encodes/decodes a 32-byte DEVICE KEY as a 34-word recovery phrase.
 *
 * Format: 32 data words (1 word = 1 byte) + 2 checksum words.
 * Checksum = first 2 bytes of SHA-256(key), lets us detect typos.
 *
 * 256-word list → each byte maps to exactly one word.
 * Phrase is typed or written from paper; checksum catches single-word errors.
 */
public class RecoveryPhrase {

    // 256 unique 4-letter English words, one per byte value (0x00–0xFF)
    private static final String[] WORDS = {
        "able","acid","aged","also","arch","army","atom","aunt",  // 000-007
        "away","back","bail","ball","band","barn","bath","bear",  // 008-015
        "beat","been","bell","best","bird","bite","blue","boat",  // 016-023
        "body","bold","bomb","bond","bone","book","born","both",  // 024-031
        "bowl","bulk","burn","buzz","cage","cake","calm","camp",  // 032-039
        "card","care","cart","case","cash","cast","cave","cell",  // 040-047
        "chef","chin","chip","chop","clay","clip","clue","coal",  // 048-055
        "coat","code","coil","cold","comb","cook","cool","cord",  // 056-063
        "core","corn","cost","crab","crew","crop","curl","cute",  // 064-071
        "dark","data","dead","deal","dean","dear","debt","deck",  // 072-079
        "deep","deer","deny","desk","dice","dish","disk","dive",  // 080-087
        "dock","dome","door","dose","drop","drum","dual","dump",  // 088-095
        "dune","dusk","dust","duty","earn","east","edge","emit",  // 096-103
        "epic","even","exam","exit","fail","fair","fall","fame",  // 104-111
        "farm","fast","fate","fear","feel","feet","fell","felt",  // 112-119
        "fern","fill","film","fine","fire","fish","fist","flag",  // 120-127
        "flat","flaw","flip","flow","foam","fold","folk","font",  // 128-135
        "foot","form","fort","four","free","fuel","full","fund",  // 136-143
        "fury","game","gang","gaze","gear","germ","gift","girl",  // 144-151
        "glad","glow","glue","goat","gold","golf","gust","hack",  // 152-159
        "hall","harm","hate","head","heat","heel","help","herb",  // 160-167
        "hero","hide","high","hill","hint","hold","hole","home",  // 168-175
        "hook","hope","horn","huge","hull","hunt","hurt","icon",  // 176-183
        "idle","inch","iron","isle","jade","jail","join","joke",  // 184-191
        "jump","just","keen","kept","kind","king","kiss","kite",  // 192-199
        "knee","knot","lack","lake","land","lane","last","lava",  // 200-207
        "lawn","lead","leaf","lean","leap","lens","life","lift",  // 208-215
        "lime","line","link","lion","list","load","lock","loft",  // 216-223
        "loop","loud","love","luck","lung","lure","maid","main",  // 224-231
        "make","male","mall","mark","mass","mast","meal","mean",  // 232-239
        "melt","memo","mesh","mild","milk","mill","mist","mood",  // 240-247
        "moon","moth","move","much","mute","myth","name","navy",  // 248-255
    };

    static {
        // Sanity check at class load — catches accidental duplicates in WORDS[]
        java.util.HashSet<String> seen = new java.util.HashSet<>();
        for (String w : WORDS) {
            if (!seen.add(w)) throw new ExceptionInInitializerError("Duplicate word in list: " + w);
        }
        if (WORDS.length != 256) throw new ExceptionInInitializerError("WORDS must have exactly 256 entries");
    }

    /**
     * Encodes 32-byte key → 34-word phrase (32 data + 2 checksum words).
     */
    public static String encode(byte[] key) throws Exception {
        if (key.length != 32) throw new IllegalArgumentException("Key must be 32 bytes");

        byte[] chk = MessageDigest.getInstance("SHA-256").digest(key);

        StringBuilder sb = new StringBuilder(34 * 5);
        for (int i = 0; i < 32; i++) {
            if (i > 0) sb.append(' ');
            sb.append(WORDS[key[i] & 0xFF]);
        }
        sb.append(' ').append(WORDS[chk[0] & 0xFF]);
        sb.append(' ').append(WORDS[chk[1] & 0xFF]);
        return sb.toString();
    }

    /**
     * Decodes 34-word phrase → 32-byte key. Throws if checksum fails or unknown word.
     */
    public static byte[] decode(String phrase) throws Exception {
        String[] parts = phrase.trim().toLowerCase().split("\\s+");
        if (parts.length != 34)
            throw new IllegalArgumentException(
                "Frase deve ter 34 palavras, recebeu " + parts.length + ".");

        byte[] key = new byte[32];
        for (int i = 0; i < 32; i++) {
            int idx = indexOf(parts[i]);
            if (idx < 0) throw new IllegalArgumentException("Palavra desconhecida: \"" + parts[i] + "\"");
            key[i] = (byte) idx;
        }

        byte[] chk = MessageDigest.getInstance("SHA-256").digest(key);
        int c0 = indexOf(parts[32]);
        int c1 = indexOf(parts[33]);
        if (c0 < 0) throw new IllegalArgumentException("Palavra de checksum desconhecida: \"" + parts[32] + "\"");
        if (c1 < 0) throw new IllegalArgumentException("Palavra de checksum desconhecida: \"" + parts[33] + "\"");

        if (c0 != (chk[0] & 0xFF) || c1 != (chk[1] & 0xFF))
            throw new IllegalArgumentException(
                "Checksum invalido — frase incorreta ou com erro de digitacao.");

        return key;
    }

    private static int indexOf(String word) {
        for (int i = 0; i < WORDS.length; i++) {
            if (WORDS[i].equals(word)) return i;
        }
        return -1;
    }
}
