/*
 * Decompiled with CFR 0.152.
 */
import java.io.DataInputStream;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class UZBLoader {
    String[] strPool;
    List<FuncInfo> funcs = new ArrayList<FuncInfo>();
    byte[] blockA;
    byte[] blockB;

    UZBLoader() {
    }

    void load(String string) throws Exception {
        int n;
        DataInputStream dataInputStream = new DataInputStream(new FileInputStream(string));
        if (dataInputStream.readInt() != 1431978529) {
            throw new Exception("Invalid magic");
        }
        dataInputStream.readInt();
        dataInputStream.readShort();
        dataInputStream.readShort();
        int n2 = dataInputStream.readShort();
        this.strPool = new String[n2];
        for (n = 0; n < n2; ++n) {
            if (dataInputStream.readByte() != 2) continue;
            byte[] byArray = new byte[dataInputStream.readShort()];
            dataInputStream.readFully(byArray);
            this.strPool[n] = new String(GLPEncoder.xor(byArray));
        }
        n = dataInputStream.readShort();
        for (int i = 0; i < n; ++i) {
            byte[] byArray = new byte[dataInputStream.readShort()];
            dataInputStream.readFully(byArray);
            this.funcs.add(new FuncInfo(new String(GLPEncoder.xor(byArray)), dataInputStream.readByte(), dataInputStream.readInt(), dataInputStream.readInt()));
        }
        byte[] byArray = new byte[dataInputStream.readInt()];
        dataInputStream.readFully(byArray);
        int n3 = -1;
        for (int i = 0; i < byArray.length - 1; ++i) {
            if (byArray[i] != -34 || byArray[i + 1] != -83) continue;
            n3 = i;
            break;
        }
        if (n3 != -1) {
            this.blockA = Arrays.copyOfRange(byArray, 0, n3);
            this.blockB = Arrays.copyOfRange(byArray, n3 + 2, byArray.length - 2);
        } else {
            this.blockA = byArray;
        }
    }

    void disasm(boolean bl) {
        System.out.println("=== UVLM Disassembler ===");
        System.out.println("=== CONSTANT POOL (" + this.strPool.length + " entries) ===");
        for (int i = 0; i < this.strPool.length; ++i) {
            System.out.println("  #" + i + "  STR \"" + this.strPool[i] + "\"");
        }
        System.out.println("\n=== FUNCTION TABLE (" + this.funcs.size() + " functions) ===");
        for (FuncInfo funcInfo : this.funcs) {
            System.out.printf("   %-15s argc=%d  offset=0x%04X\n", funcInfo.name, funcInfo.argc, funcInfo.offset);
        }
        Object object = bl ? this.blockB : this.blockA;
        System.out.println("\n=== BYTECODE \u2014 " + (bl ? "BLOCO B (Lixo GLP)" : "BLOCO A") + " ===");
        int n = 0;
        while (n < ((byte[])object).length) {
            System.out.printf("  %04X: ", n);
            byte object2 = ((byte[])object)[n];
            System.out.print(Opcodes.getName((byte)object2) + "   ");
            int n2 = Opcodes.getOpLen((byte)(bl ? (Object)Opcodes.getMirror((byte)object2) : object2), (byte[])object, n);
            n += 1 + n2;
            for (int i = 1; i <= n2; ++i) {
                System.out.printf("%02X ", ((byte[])object)[n + i]);
            }
            System.out.println();
        }
        if (!bl && this.blockB != null) {
            System.out.println("\n=== GLP MIRROR MARKER: DE AD ===");
        }
    }
}
