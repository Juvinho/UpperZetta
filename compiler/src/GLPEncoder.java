import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Random;

class GLPEncoder {
    static final byte[] KEY = "UVLM_GLP_PALINDROME_KEY_2025".getBytes();

    static byte[] xor(byte[] byArray) {
        byte[] byArray2 = new byte[byArray.length];
        for (int i = 0; i < byArray.length; ++i) {
            byArray2[i] = (byte)(byArray[i] ^ KEY[i % KEY.length]);
        }
        return byArray2;
    }

    static byte[] encode(byte[] blockA, List<String> constants, List<FuncInfo> funcs, String filename) {
        ByteArrayOutputStream blockB = new ByteArrayOutputStream();
        Random rng = new Random(filename.hashCode());
        
        try {
            int instrCount = 0;
            int nextDeadCode = rng.nextInt(3) + 3;

            for (int i = 0; i < blockA.length; i += 1 + Opcodes.getOpLen(blockA[i], blockA, i, false)) {
                byte by = blockA[i];
                int n = Opcodes.getOpLen(by, blockA, i, false);
                
                // Inject Dead Code
                if (instrCount++ >= nextDeadCode) {
                    int deadVar = 80 + rng.nextInt(20);
                    // PUSH_INT 0
                    blockB.write(Opcodes.INT_PUSH); blockB.write(0); blockB.write(0); blockB.write(0); blockB.write(0);
                    // STORE deadVar
                    blockB.write(Opcodes.STROE); blockB.write((deadVar >> 8) & 0xFF); blockB.write(deadVar & 0xFF);
                    // LOAD deadVar
                    blockB.write(Opcodes.LODE); blockB.write((deadVar >> 8) & 0xFF); blockB.write(deadVar & 0xFF);
                    // POP
                    blockB.write(Opcodes.POP_REV);
                    
                    // Circular Jumps
                    blockB.write(Opcodes.FI_PMUJ);
                    int fakeIp = blockB.size();
                    blockB.write((fakeIp >> 24) & 0xFF); blockB.write((fakeIp >> 16) & 0xFF); blockB.write((fakeIp >> 8) & 0xFF); blockB.write(fakeIp & 0xFF);
                    
                    nextDeadCode = instrCount + rng.nextInt(3) + 3;
                }

                blockB.write(Opcodes.getMirror(by));
                for (int j = 1; j <= n; ++j) {
                    blockB.write(blockA[i + j] ^ 0xFF);
                }
            }

            // Encrypt Block B with layered XOR
            byte[] rawB = blockB.toByteArray();
            for (int i = 0; i < rawB.length; i++) {
                byte b = rawB[i];
                b = (byte)(b ^ KEY[i % KEY.length]);
                b = (byte)(b ^ (i & 0xFF));
                b = (byte)(((b & 0xFF) << 3) | ((b & 0xFF) >>> 5)); // ROL 3
                rawB[i] = b;
            }

            // Build final array
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            out.write(blockA);
            out.write(Opcodes.MARKER_BEGIN);
            out.write(rawB);
            out.write(Opcodes.MARKER_END);
            
            // Falso Header
            out.write(new byte[]{(byte)0xFF, (byte)0xFF, (byte)0xFF, (byte)0xFF, 0x55, 0x5A, 0x42, 0x22, 0x00, 0x00, 0x00, 0x00, (byte)0xDE, (byte)0xAD, (byte)0xBE, (byte)0xEF});

            // Constant Pool Inflation
            int origSize = constants.size();
            for (int i = 0; i < origSize; i++) {
                int dupes = rng.nextInt(3) + 3;
                for(int j=0; j<dupes; j++) constants.add(constants.get(i));
            }
            String[] fakeStrings = {"temp", "result", "value", "data", "buffer", "state", "0", "1", "-1", "2", "-2"};
            for (String s : fakeStrings) constants.add(s);

            // Fake Functions
            String[] fakeNames = {"readUserData", "validateSession", "getUserName", "checkPermission", "processRequest", "handleCallback", "initializeContext"};
            for (String fn : fakeNames) {
                FuncInfo f = new FuncInfo(fn, rng.nextInt(5), rng.nextInt(blockA.length), rng.nextInt(50));
                funcs.add(f);
            }

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
