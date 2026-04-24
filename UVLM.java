
/*
 * Decompiled with CFR 0.152.
 */
import java.util.HashMap;
import java.util.Map;
import java.util.Stack;

class UVLM {
    UZBLoader loader;
    int ip = 0;
    Stack<UVValue> stack = new Stack();
    Stack<Frame> callStack = new Stack();
    UVValue[] locals = new UVValue[256];

    UVLM(UZBLoader uZBLoader) {
        this.loader = uZBLoader;
    }

    int readInt() {
        int n = (this.loader.blockA[this.ip] & 0xFF) << 24 | (this.loader.blockA[this.ip + 1] & 0xFF) << 16
                | (this.loader.blockA[this.ip + 2] & 0xFF) << 8 | this.loader.blockA[this.ip + 3] & 0xFF;
        this.ip += 4;
        return n;
    }

    int readShort() {
        int n = (this.loader.blockA[this.ip] & 0xFF) << 8 | this.loader.blockA[this.ip + 1] & 0xFF;
        this.ip += 2;
        return n;
    }

    String readStr() {
        int n = this.readShort();
        byte[] byArray = new byte[n];
        System.arraycopy(this.loader.blockA, this.ip, byArray, 0, n);
        this.ip += n;
        return new String(byArray);
    }

    float getFloat(UVValue v) {
        return v.val instanceof Float ? (Float) v.val : ((Integer) v.val).floatValue();
    }

    boolean isFloat(UVValue v1, UVValue v2) {
        return v1.val instanceof Float || v2.val instanceof Float;
    }

    void run() {
        while (this.ip < this.loader.blockA.length) {
            byte by = this.loader.blockA[this.ip++];
            switch (by) {
                case 1: {
                    this.stack.push(new UVValue(1, this.readInt()));
                    break;
                }
                case 2: {
                    this.stack.push(new UVValue(2, this.loader.strPool[this.readShort()]));
                    break;
                }
                case 3: {
                    this.stack.push(new UVValue(3, this.loader.blockA[this.ip++] == 1));
                    break;
                }
                case 4: {
                    this.stack.pop();
                    break;
                }
                case 5: {
                    this.locals[this.readShort()] = this.stack.pop();
                    break;
                }
                case 6: {
                    this.stack.push(this.locals[this.readShort()]);
                    break;
                }
                case 7: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (l.type == 2 || r.type == 2) {
                        this.stack.push(new UVValue(2, l.val.toString() + r.val.toString()));
                        break;
                    }
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(6, getFloat(l) + getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(1, (Integer) l.val + (Integer) r.val));
                    break;
                }
                case 8: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(6, getFloat(l) - getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(1, (Integer) l.val - (Integer) r.val));
                    break;
                }
                case 9: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(6, getFloat(l) * getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(1, (Integer) l.val * (Integer) r.val));
                    break;
                }
                case 10: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(6, getFloat(l) / getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(1, (Integer) l.val / (Integer) r.val));
                    break;
                }
                case 11: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(3, getFloat(l) == getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(3, l.val.equals(r.val)));
                    break;
                }
                case 12: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(3, getFloat(l) != getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(3, !l.val.equals(r.val)));
                    break;
                }
                case 13: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(3, getFloat(l) < getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(3, (Integer) l.val < (Integer) r.val));
                    break;
                }
                case 14: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(3, getFloat(l) > getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(3, (Integer) l.val > (Integer) r.val));
                    break;
                }
                case 15: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(3, getFloat(l) <= getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(3, (Integer) l.val <= (Integer) r.val));
                    break;
                }
                case 17: {
                    UVValue r = this.stack.pop();
                    UVValue l = this.stack.pop();
                    if (isFloat(l, r)) {
                        this.stack.push(new UVValue(3, getFloat(l) >= getFloat(r)));
                        break;
                    }
                    this.stack.push(new UVValue(3, (Integer) l.val >= (Integer) r.val));
                    break;
                }
                case 18: {
                    UVValue uVValue = this.stack.pop();
                    UVValue uVValue12 = this.stack.pop();
                    this.stack.push(new UVValue(3, (Boolean) uVValue12.val != false && (Boolean) uVValue.val != false));
                    break;
                }
                case 19: {
                    UVValue uVValue = this.stack.pop();
                    UVValue uVValue13 = this.stack.pop();
                    this.stack.push(new UVValue(3, (Boolean) uVValue13.val != false || (Boolean) uVValue.val != false));
                    break;
                }
                case 21: {
                    int n = this.readInt();
                    this.ip += n;
                    break;
                }
                case 22: {
                    int n = this.readInt();
                    if (!((Boolean) this.stack.pop().val).booleanValue())
                        break;
                    this.ip += n;
                    break;
                }
                case 23: {
                    int n = this.readInt();
                    boolean bl = (Boolean) this.stack.pop().val;
                    if (bl)
                        break;
                    this.ip += n;
                    break;
                }
                case 26: {
                    Object object = this.stack.pop().val;
                    if (object instanceof Boolean) {
                        System.out.println((Boolean) object != false ? "true" : "false");
                        break;
                    }
                    System.out.println(object);
                    break;
                }
                case 28: {
                    this.stack.push(new UVValue(4, new UVObject(this.readStr())));
                    break;
                }
                case 29: {
                    String string = this.readStr();
                    UVObject uVObject = (UVObject) this.stack.pop().val;
                    this.stack.push(uVObject.fields.getOrDefault(string, new UVValue(5, null)));
                    break;
                }
                case 30: {
                    String string = this.readStr();
                    UVValue uVValue = this.stack.pop();
                    UVObject uVObject = (UVObject) this.stack.pop().val;
                    uVObject.fields.put(string, uVValue);
                    break;
                }
                case 31: {
                    String string = this.readStr();
                    int n = this.loader.blockA[this.ip++] & 0xFF;
                    UVValue[] uVValueArray = new UVValue[n];
                    for (int i = n - 1; i >= 0; --i) {
                        uVValueArray[i] = this.stack.pop();
                    }
                    Object object = this.stack.pop();
                    String string2 = ((UVObject) ((UVValue) object).val).cls + "." + string;
                    FuncInfo funcInfo = null;
                    for (FuncInfo funcInfo2 : this.loader.funcs) {
                        if (!funcInfo2.name.equals(string2))
                            continue;
                        funcInfo = funcInfo2;
                    }
                    this.callStack.push(new Frame(this.ip, this.locals));
                    this.locals = new UVValue[256];
                    this.locals[0] = (UVValue) object;
                    for (int i = 0; i < n; ++i) {
                        this.locals[i + 1] = uVValueArray[i];
                    }
                    this.ip = funcInfo.offset;
                    break;
                }
                case 24: {
                    String string = this.readStr();
                    int n = this.loader.blockA[this.ip++] & 0xFF;
                    UVValue[] uVValueArray = new UVValue[n];
                    for (int i = n - 1; i >= 0; --i) {
                        uVValueArray[i] = this.stack.pop();
                    }
                    Object object = null;
                    for (FuncInfo funcInfo : this.loader.funcs) {
                        if (!funcInfo.name.equals(string))
                            continue;
                        object = funcInfo;
                    }
                    this.callStack.push(new Frame(this.ip, this.locals));
                    this.locals = new UVValue[256];
                    for (int i = 0; i < n; ++i) {
                        this.locals[i] = uVValueArray[i];
                    }
                    this.ip = ((FuncInfo) object).offset;
                    break;
                }
                case 25: {
                    UVValue uVValue = this.stack.isEmpty() ? new UVValue(5, null) : this.stack.pop();
                    Frame frame = this.callStack.pop();
                    this.ip = frame.ip;
                    this.locals = frame.locals;
                    this.stack.push(uVValue);
                    break;
                }
                case 32: {
                    return;
                }
                case 33: {
                    this.stack.push(new UVValue(6, Float.intBitsToFloat(this.readInt())));
                    break;
                }
                case 34: {
                    int size = (Integer) this.stack.pop().val;
                    UVValue[] arr = new UVValue[size];
                    for (int i = size - 1; i >= 0; --i) {
                        arr[i] = this.stack.pop();
                    }
                    this.stack.push(new UVValue(7, arr));
                    break;
                }
                case 35: {
                    int idx_arr = (Integer) this.stack.pop().val;
                    UVValue[] arr = (UVValue[]) this.stack.pop().val;
                    this.stack.push(arr[idx_arr]);
                    break;
                }
                case 36: {
                    int idx_arr = (Integer) this.stack.pop().val;
                    UVValue[] arr = (UVValue[]) this.stack.pop().val;
                    UVValue v = this.stack.pop();
                    arr[idx_arr] = v;
                    break;
                }
            }
        }
    }

    static class UVValue {
        int type;
        Object val;

        UVValue(int n, Object object) {
            this.type = n;
            this.val = object;
        }
    }

    static class UVObject {
        String cls;
        Map<String, UVValue> fields = new HashMap<String, UVValue>();

        UVObject(String string) {
            this.cls = string;
        }
    }

    static class Frame {
        int ip;
        UVValue[] locals;

        Frame(int n, UVValue[] uVValueArray) {
            this.ip = n;
            this.locals = uVValueArray;
        }
    }
}
