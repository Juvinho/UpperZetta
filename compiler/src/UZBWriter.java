/*
 * Decompiled with CFR 0.152.
 */
import java.io.DataOutputStream;
import java.io.FileOutputStream;
import java.util.List;

class UZBWriter {
    UZBWriter() {
    }

    static void write(String string, List<String> list, List<FuncInfo> list2, byte[] byArray, byte[] opcodeTable, byte checksum) throws Exception {
        byte[] byArray2;
        DataOutputStream dataOutputStream = new DataOutputStream(new FileOutputStream(string));
        dataOutputStream.write(new byte[]{85, 90, 66, 33}); // UZB!
        dataOutputStream.write(new byte[]{33, 66, 90, 85}); // !BZU
        dataOutputStream.write(new byte[]{1, 0});
        dataOutputStream.write(new byte[]{0, 1});
        
        // Write opcode table
        if (opcodeTable != null) {
            dataOutputStream.write(opcodeTable);
        } else {
            byte[] identity = new byte[256];
            for (int i = 0; i < 256; i++) identity[i] = (byte) i;
            dataOutputStream.write(identity);
        }

        dataOutputStream.writeShort(list.size());
        for (String object : list) {
            dataOutputStream.writeByte(2);
            byArray2 = GLPEncoder.xor(object.getBytes());
            dataOutputStream.writeShort(byArray2.length);
            dataOutputStream.write(byArray2);
        }
        dataOutputStream.writeShort(list2.size());
        for (FuncInfo funcInfo : list2) {
            byArray2 = GLPEncoder.xor(funcInfo.name.getBytes());
            dataOutputStream.writeShort(byArray2.length);
            dataOutputStream.write(byArray2);
            dataOutputStream.writeByte(funcInfo.argc);
            dataOutputStream.writeInt(funcInfo.offset);
            dataOutputStream.writeInt(funcInfo.length);
        }
        dataOutputStream.writeInt(byArray.length);
        dataOutputStream.write(byArray);
        dataOutputStream.writeByte(checksum);
        dataOutputStream.close();
    }
}
