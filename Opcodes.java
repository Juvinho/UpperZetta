/*
 * Decompiled with CFR 0.152.
 */
import java.lang.reflect.Field;

class Opcodes {
    static final byte PUSH_INT = 1;
    static final byte INT_PUSH = 16;
    static final byte PUSH_STR = 2;
    static final byte STR_PUSH = 32;
    static final byte PUSH_BOOL = 3;
    static final byte BOOL_PUSH = 48;
    static final byte POP = 4;
    static final byte POP_REV = 64;
    static final byte STORE = 5;
    static final byte STROE = 80;
    static final byte LOAD = 6;
    static final byte LODE = 96;
    static final byte ADD = 7;
    static final byte DDA = 112;
    static final byte SUB = 8;
    static final byte BUS = -128;
    static final byte MUL = 9;
    static final byte LUM = -112;
    static final byte DIV = 10;
    static final byte VID = -96;
    static final byte CMP_EQ = 11;
    static final byte QE_PMC = -80;
    static final byte CMP_NEQ = 12;
    static final byte QEN_PMC = -64;
    static final byte CMP_LT = 13;
    static final byte TL_PMC = -48;
    static final byte CMP_GT = 14;
    static final byte TG_PMC = -32;
    static final byte CMP_LTE = 15;
    static final byte ETL_PMC = -16;
    static final byte CMP_GTE = 17;
    static final byte ETG_PMC = 26;
    static final byte AND = 18;
    static final byte DNA = 33;
    static final byte OR = 19;
    static final byte RO = 49;
    static final byte NOT = 20;
    static final byte TON = 65;
    static final byte JUMP = 21;
    static final byte JMUP = 81;
    static final byte JUMP_IF = 22;
    static final byte FI_PMUJ = 97;
    static final byte JUMP_ELSE = 23;
    static final byte ESLE_PMUJ = 113;
    static final byte CALL = 24;
    static final byte LLAC = -127;
    static final byte RETURN = 25;
    static final byte RETUNR = -111;
    static final byte PRINT = 26;
    static final byte PIRNT = -95;
    static final byte STR_CONCAT = 27;
    static final byte TACNOC_RTS = -79;
    static final byte NEW_OBJ = 28;
    static final byte JBO_WEN = -63;
    static final byte GET_FIELD = 29;
    static final byte DLEIF_TEG = -47;
    static final byte SET_FIELD = 30;
    static final byte DLEIF_TES = -31;
    static final byte CALL_METHOD = 31;
    static final byte DOHTEM_LLAC = -15;
    static final byte HALT = 32;
    static final byte TLAH = 2;
    
    static final byte PUSH_FLOAT = 33;
    static final byte NEW_ARRAY = 34;
    static final byte LOAD_ARRAY_IDX = 35;
    static final byte STORE_ARRAY_IDX = 36;

    static final byte[] MARKER_BEGIN = new byte[]{-34, -83};
    static final byte[] MARKER_END = new byte[]{-66, -17};

    Opcodes() {
    }

    static byte getMirror(byte by) {
        switch (by) {
            case 1: {
                return 16;
            }
            case 2: {
                return 32;
            }
            case 3: {
                return 48;
            }
            case 4: {
                return 64;
            }
            case 5: {
                return 80;
            }
            case 6: {
                return 96;
            }
            case 7: {
                return 112;
            }
            case 8: {
                return -128;
            }
            case 9: {
                return -112;
            }
            case 10: {
                return -96;
            }
            case 11: {
                return -80;
            }
            case 12: {
                return -64;
            }
            case 13: {
                return -48;
            }
            case 14: {
                return -32;
            }
            case 15: {
                return -16;
            }
            case 17: {
                return 26;
            }
            case 18: {
                return 33;
            }
            case 19: {
                return 49;
            }
            case 20: {
                return 65;
            }
            case 21: {
                return 81;
            }
            case 22: {
                return 97;
            }
            case 23: {
                return 113;
            }
            case 24: {
                return -127;
            }
            case 25: {
                return -111;
            }
            case 26: {
                return -95;
            }
            case 27: {
                return -79;
            }
            case 28: {
                return -63;
            }
            case 29: {
                return -47;
            }
            case 30: {
                return -31;
            }
            case 31: {
                return -15;
            }
            case 32: {
                return 2;
            }
            case 33: {
                return 4;
            }
            case 34: {
                return 5;
            }
            case 35: {
                return 6;
            }
            case 36: {
                return 7;
            }
        }
        return by;
    }

    static int getOpLen(byte by, byte[] byArray, int n) {
        switch (by) {
            case 1: 
            case 21: 
            case 22: 
            case 23: 
            case 33: {
                return 4;
            }
            case 2: 
            case 5: 
            case 6: {
                return 2;
            }
            case 3: {
                return 1;
            }
            case 24: 
            case 31: {
                return 2 + ((byArray[n + 1] & 0xFF) << 8 | byArray[n + 2] & 0xFF) + 1;
            }
            case 28: 
            case 29: 
            case 30: {
                return 2 + ((byArray[n + 1] & 0xFF) << 8 | byArray[n + 2] & 0xFF);
            }
        }
        return 0;
    }

    static String getName(byte by) {
        for (Field field : Opcodes.class.getDeclaredFields()) {
            try {
                if (field.getType() != Byte.TYPE || field.getByte(null) != by) continue;
                return field.getName();
            }
            catch (Exception exception) {
                // empty catch block
            }
        }
        return "UNKNOWN";
    }
}
